package com.depa.consent.service;

import com.depa.consent.dto.*;
import com.depa.consent.entity.*;
import com.depa.consent.exception.ForbiddenOperationException;
import com.depa.consent.exception.InvalidLifecycleTransitionException;
import com.depa.consent.repository.UserInvitationRepository;
import com.depa.consent.repository.UserRepository;
import com.depa.consent.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class OnboardingService {

    private final OrganizationService organizationService;
    private final UserRepository userRepository;
    private final UserInvitationRepository userInvitationRepository;
    private final EmailDeliveryService emailDeliveryService;
    private final AuditService auditService;

    public OnboardingService(OrganizationService organizationService,
                             UserRepository userRepository,
                             UserInvitationRepository userInvitationRepository,
                             EmailDeliveryService emailDeliveryService,
                             AuditService auditService) {
        this.organizationService = organizationService;
        this.userRepository = userRepository;
        this.userInvitationRepository = userInvitationRepository;
        this.emailDeliveryService = emailDeliveryService;
        this.auditService = auditService;
    }

    /**
     * Human/Client driven onboarding import for ORG_ADMIN.
     * The organization is strictly derived from the authenticated CM JWT (actor).
     */
    public ImportOnboardingResponse importStudents(ImportOnboardingRequest request, UserPrincipal actor) {
        if (actor == null || actor.getOrganizationId() == null || actor.getOrganizationId().isBlank()) {
            throw new ForbiddenOperationException("Access Denied: Authenticated user has no organization scope");
        }

        Organization organization = organizationService.getOrganizationEntityById(actor.getOrganizationId());
        if (organization.getStatus() != OrganizationStatus.ACTIVE) {
            throw new InvalidLifecycleTransitionException(
                    "Organization '" + organization.getOrganizationCode() + "' is " + organization.getStatus() +
                            ". Only ACTIVE organizations can onboard students."
            );
        }

        List<StudentOnboardingItem> items = request.getStudents();
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("Students list must not be empty");
        }

        int total = items.size();
        int newInvitations = 0;
        int alreadyActive = 0;
        int alreadyPending = 0;
        int failed = 0;

        for (StudentOnboardingItem item : items) {
            if (item.getStudentId() == null || item.getStudentId().isBlank() ||
                    item.getEmail() == null || item.getEmail().isBlank()) {
                failed++;
                continue;
            }

            String studentId = item.getStudentId().trim().toUpperCase();
            String trustedEmail = item.getEmail().trim().toLowerCase();

            // 1. Check if user already exists
            Optional<User> existingUser = userRepository.findByOrganizationIdAndExternalIdentityId(
                    organization.getOrganizationId(),
                    studentId
            );

            if (existingUser.isPresent() && existingUser.get().getStatus() == UserStatus.ACTIVE && existingUser.get().isEmailVerified()) {
                alreadyActive++;
                continue;
            }

            if (existingUser.isPresent() && existingUser.get().getStatus() == UserStatus.PENDING) {
                alreadyPending++;
            }

            // 2. Persist student in users table with PENDING status
            if (existingUser.isEmpty()) {
                String userName = item.getName() != null && !item.getName().isBlank() ? item.getName().trim() : "Student " + studentId;
                User pendingUser = new User(
                        "USR_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                        userName,
                        trustedEmail,
                        "PENDING_REGISTRATION",
                        organization.getOrganizationId(),
                        studentId,
                        UserRole.USER,
                        UserStatus.PENDING,
                        false
                );
                userRepository.save(pendingUser);
            }

            // 3. Invalidate previous pending invitations
            List<UserInvitation> previousInvitations = userInvitationRepository
                    .findByOrganizationIdAndExternalIdentityIdAndStatus(
                            organization.getOrganizationId(),
                            studentId,
                            InvitationStatus.PENDING
                    );
            for (UserInvitation oldInvite : previousInvitations) {
                oldInvite.setStatus(InvitationStatus.REVOKED);
                userInvitationRepository.save(oldInvite);
            }

            // 4. Generate single-use invitation token
            String rawToken = emailDeliveryService.generateSecureToken();
            String tokenHash = emailDeliveryService.hash(rawToken);

            String inviteId = "INV_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            Instant expiresAt = Instant.now().plus(7, ChronoUnit.DAYS);

            UserInvitation invitation = new UserInvitation(
                    inviteId,
                    organization.getOrganizationId(),
                    studentId,
                    trustedEmail,
                    tokenHash,
                    expiresAt,
                    InvitationStatus.PENDING
            );

            userInvitationRepository.save(invitation);
            emailDeliveryService.sendInvitationEmail(trustedEmail, rawToken, organization.getOrganizationCode(), studentId);
            newInvitations++;
        }

        auditService.logEvent(
                AuditEventType.ONBOARDING_IMPORT,
                actor.getUserId(),
                actor.getRole().name(),
                "ORGANIZATION",
                organization.getOrganizationId(),
                organization.getOrganizationId(),
                String.format("Onboarding import for %s: Total=%d, New=%d, Active=%d, Pending=%d, Failed=%d",
                        organization.getOrganizationCode(), total, newInvitations, alreadyActive, alreadyPending, failed)
        );

        return new ImportOnboardingResponse(
                organization.getOrganizationId(),
                organization.getOrganizationCode(),
                total,
                newInvitations,
                alreadyActive,
                alreadyPending,
                failed,
                "Onboarding import completed successfully. Invitations dispatched to student trusted emails."
        );
    }

    /**
     * Direct bulk onboarding API (backwards compatible).
     */
    public BulkOnboardingResponse bulkOnboard(BulkOnboardRequest request) {
        Organization organization = organizationService.getOrganizationEntityByCode(request.getOrganizationCode());

        if (organization.getStatus() != OrganizationStatus.ACTIVE) {
            throw new InvalidLifecycleTransitionException(
                    "Organization '" + organization.getOrganizationCode() + "' is " + organization.getStatus() +
                            ". Only ACTIVE organizations can onboard students."
            );
        }

        int invitationsCreated = 0;
        int skippedCount = 0;

        for (StudentOnboardingItem item : request.getItems()) {
            String studentId = item.getStudentId().trim().toUpperCase();
            String trustedEmail = item.getEmail().trim().toLowerCase();

            Optional<User> existingUser = userRepository.findByOrganizationIdAndExternalIdentityId(
                    organization.getOrganizationId(),
                    studentId
            );

            if (existingUser.isPresent() && existingUser.get().getStatus() == UserStatus.ACTIVE && existingUser.get().isEmailVerified()) {
                skippedCount++;
                continue;
            }

            if (existingUser.isEmpty()) {
                String userName = item.getName() != null && !item.getName().isBlank() ? item.getName().trim() : "Student " + studentId;
                User pendingUser = new User(
                        "USR_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                        userName,
                        trustedEmail,
                        "PENDING_REGISTRATION",
                        organization.getOrganizationId(),
                        studentId,
                        UserRole.USER,
                        UserStatus.PENDING,
                        false
                );
                userRepository.save(pendingUser);
            }

            List<UserInvitation> previousInvitations = userInvitationRepository
                    .findByOrganizationIdAndExternalIdentityIdAndStatus(
                            organization.getOrganizationId(),
                            studentId,
                            InvitationStatus.PENDING
                    );
            for (UserInvitation oldInvite : previousInvitations) {
                oldInvite.setStatus(InvitationStatus.REVOKED);
                userInvitationRepository.save(oldInvite);
            }

            String rawToken = emailDeliveryService.generateSecureToken();
            String tokenHash = emailDeliveryService.hash(rawToken);

            String inviteId = "INV_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            Instant expiresAt = Instant.now().plus(7, ChronoUnit.DAYS);

            UserInvitation invitation = new UserInvitation(
                    inviteId,
                    organization.getOrganizationId(),
                    studentId,
                    trustedEmail,
                    tokenHash,
                    expiresAt,
                    InvitationStatus.PENDING
            );

            userInvitationRepository.save(invitation);
            emailDeliveryService.sendInvitationEmail(trustedEmail, rawToken, organization.getOrganizationCode(), studentId);
            invitationsCreated++;
        }

        return new BulkOnboardingResponse(
                organization.getOrganizationCode(),
                request.getItems().size(),
                invitationsCreated,
                skippedCount
        );
    }
}
