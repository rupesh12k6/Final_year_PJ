package com.depa.consent.service;

import com.depa.consent.dto.*;
import com.depa.consent.entity.*;
import com.depa.consent.exception.ForbiddenOperationException;
import com.depa.consent.exception.InvalidLifecycleTransitionException;
import com.depa.consent.exception.ResourceNotFoundException;
import com.depa.consent.repository.EmailVerificationOtpRepository;
import com.depa.consent.repository.OrganizationRepository;
import com.depa.consent.repository.UserInvitationRepository;
import com.depa.consent.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class RegistrationService {

    private final UserInvitationRepository userInvitationRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final EmailVerificationOtpRepository emailVerificationOtpRepository;
    private final EmailDeliveryService emailDeliveryService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public RegistrationService(UserInvitationRepository userInvitationRepository,
                               UserRepository userRepository,
                               OrganizationRepository organizationRepository,
                               EmailVerificationOtpRepository emailVerificationOtpRepository,
                               EmailDeliveryService emailDeliveryService,
                               PasswordEncoder passwordEncoder,
                               AuditService auditService) {
        this.userInvitationRepository = userInvitationRepository;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.emailVerificationOtpRepository = emailVerificationOtpRepository;
        this.emailDeliveryService = emailDeliveryService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public InvitationValidationResponse validateInvitation(String rawToken) {
        String tokenHash = emailDeliveryService.hash(rawToken.trim());

        UserInvitation invitation = userInvitationRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired invitation token"));

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new InvalidLifecycleTransitionException("This invitation has already been " + invitation.getStatus().name().toLowerCase());
        }

        if (Instant.now().isAfter(invitation.getExpiresAt())) {
            throw new InvalidLifecycleTransitionException("This invitation has expired");
        }

        Organization org = organizationRepository.findById(invitation.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        return new InvitationValidationResponse(
                true,
                org.getOrganizationCode(),
                org.getName(),
                emailDeliveryService.maskEmail(invitation.getTargetEmail()),
                invitation.getExpiresAt()
        );
    }

    public RegistrationInitiatedResponse completeRegistration(CompleteRegistrationRequest request) {
        String tokenHash = emailDeliveryService.hash(request.getToken().trim());

        UserInvitation invitation = userInvitationRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired invitation token"));

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new InvalidLifecycleTransitionException("This invitation has already been " + invitation.getStatus().name().toLowerCase());
        }

        if (Instant.now().isAfter(invitation.getExpiresAt())) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            userInvitationRepository.save(invitation);
            throw new InvalidLifecycleTransitionException("This invitation has expired");
        }

        // Server-side derived identity: Never trust client-supplied org or student ID
        String organizationId = invitation.getOrganizationId();
        String externalIdentityId = invitation.getExternalIdentityId();
        String trustedEmail = invitation.getTargetEmail();

        User user = userRepository.findByOrganizationIdAndExternalIdentityId(organizationId, externalIdentityId)
                .orElseGet(() -> new User(
                        "USR_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                        "Student " + externalIdentityId,
                        trustedEmail,
                        passwordEncoder.encode(request.getPassword()),
                        organizationId,
                        externalIdentityId,
                        UserRole.USER,
                        UserStatus.PENDING,
                        false
                ));

        // If user existed in PENDING status, update password
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(trustedEmail);
        user.setStatus(UserStatus.PENDING);
        user.setEmailVerified(false);
        User savedUser = userRepository.save(user);

        // Mark invitation as USED
        invitation.setStatus(InvitationStatus.USED);
        invitation.setUsedAt(Instant.now());
        userInvitationRepository.save(invitation);

        auditService.logEvent(
                AuditEventType.INVITATION_USED,
                savedUser.getUserId(),
                UserRole.USER.name(),
                "INVITATION",
                invitation.getId(),
                organizationId,
                "Invitation used by " + emailDeliveryService.maskEmail(trustedEmail)
        );

        // Invalidate prior pending OTPs
        List<EmailVerificationOtp> oldOtps = emailVerificationOtpRepository.findByUserIdAndStatus(savedUser.getUserId(), OtpStatus.PENDING);
        for (EmailVerificationOtp old : oldOtps) {
            old.setStatus(OtpStatus.EXPIRED);
            emailVerificationOtpRepository.save(old);
        }

        // Issue 6-digit email OTP
        String rawOtp = emailDeliveryService.generateNumericOtp();
        String otpHash = emailDeliveryService.hash(rawOtp);
        String otpId = "OTP_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Instant otpExpiresAt = Instant.now().plus(10, ChronoUnit.MINUTES);

        EmailVerificationOtp otpRecord = new EmailVerificationOtp(
                otpId,
                savedUser.getUserId(),
                trustedEmail,
                otpHash,
                otpExpiresAt
        );
        emailVerificationOtpRepository.save(otpRecord);

        // Dispatch OTP to trusted email
        emailDeliveryService.sendOtpEmail(trustedEmail, rawOtp);

        auditService.logEvent(
                AuditEventType.OTP_GENERATED,
                savedUser.getUserId(),
                UserRole.USER.name(),
                "USER",
                savedUser.getUserId(),
                organizationId,
                "Verification OTP dispatched to " + emailDeliveryService.maskEmail(trustedEmail)
        );

        return new RegistrationInitiatedResponse(
                savedUser.getUserId(),
                emailDeliveryService.maskEmail(trustedEmail),
                "Password set successfully. Verification OTP dispatched to your registered email."
        );
    }

    public OtpVerificationResponse verifyOtp(VerifyOtpRequest request) {
        String resolvedUserId = request.getUserId();
        if (resolvedUserId == null || resolvedUserId.isBlank()) {
            if (request.getEmail() != null && !request.getEmail().isBlank()) {
                User u = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                        .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + request.getEmail()));
                resolvedUserId = u.getUserId();
            } else {
                throw new IllegalArgumentException("Either userId or email must be provided");
            }
        }

        EmailVerificationOtp otpRecord = emailVerificationOtpRepository
                .findTopByUserIdAndStatusOrderByCreatedAtDesc(resolvedUserId, OtpStatus.PENDING)
                .orElseThrow(() -> new ResourceNotFoundException("No active verification request found for user"));

        if (Instant.now().isAfter(otpRecord.getExpiresAt())) {
            otpRecord.setStatus(OtpStatus.EXPIRED);
            emailVerificationOtpRepository.save(otpRecord);
            throw new InvalidLifecycleTransitionException("Verification OTP has expired. Please request a new one.");
        }

        if (otpRecord.getAttempts() >= 5) {
            otpRecord.setStatus(OtpStatus.MAX_ATTEMPTS_EXCEEDED);
            emailVerificationOtpRepository.save(otpRecord);
            throw new ForbiddenOperationException("Maximum verification attempts exceeded. Please restart registration.");
        }

        otpRecord.incrementAttempts();

        String candidateHash = emailDeliveryService.hash(request.getOtp().trim());
        if (!candidateHash.equals(otpRecord.getOtpHash())) {
            emailVerificationOtpRepository.save(otpRecord);
            auditService.logEvent(
                    AuditEventType.OTP_FAILED,
                    resolvedUserId,
                    UserRole.USER.name(),
                    "USER",
                    resolvedUserId,
                    null,
                    "OTP mismatch attempt " + otpRecord.getAttempts() + "/5"
            );
            throw new IllegalArgumentException("Invalid verification OTP. Attempts remaining: " + (5 - otpRecord.getAttempts()));
        }

        // OTP Verified successfully
        otpRecord.setStatus(OtpStatus.VERIFIED);
        otpRecord.setVerifiedAt(Instant.now());
        emailVerificationOtpRepository.save(otpRecord);

        // Activate User Account
        User user = userRepository.findById(resolvedUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        userRepository.save(user);

        auditService.logEvent(
                AuditEventType.OTP_VERIFIED,
                user.getUserId(),
                UserRole.USER.name(),
                "USER",
                user.getUserId(),
                user.getOrganizationId(),
                "Email verified successfully for " + emailDeliveryService.maskEmail(user.getEmail())
        );

        auditService.logEvent(
                AuditEventType.USER_ACTIVATED,
                user.getUserId(),
                UserRole.USER.name(),
                "USER",
                user.getUserId(),
                user.getOrganizationId(),
                "User activated after OTP verification: " + emailDeliveryService.maskEmail(user.getEmail())
        );

        return new OtpVerificationResponse(
                true,
                "Email verified and account activated successfully. You may now log in.",
                user.getUserId()
        );
    }
}
