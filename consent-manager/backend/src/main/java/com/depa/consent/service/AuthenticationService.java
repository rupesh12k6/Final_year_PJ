package com.depa.consent.service;

import com.depa.consent.dto.AuthResponse;
import com.depa.consent.dto.LoginRequest;
import com.depa.consent.entity.*;
import com.depa.consent.exception.AuthenticationFailedException;
import com.depa.consent.repository.UserRepository;
import com.depa.consent.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthenticationService {

    private final UserRepository userRepository;
    private final OrganizationService organizationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuditService auditService;

    public AuthenticationService(UserRepository userRepository,
                                 OrganizationService organizationService,
                                 PasswordEncoder passwordEncoder,
                                 JwtUtil jwtUtil,
                                 AuditService auditService) {
        this.userRepository = userRepository;
        this.organizationService = organizationService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.auditService = auditService;
    }

    @Transactional(noRollbackFor = AuthenticationFailedException.class)
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            auditService.logEvent(
                    AuditEventType.LOGIN_FAILURE,
                    user != null ? user.getUserId() : "UNKNOWN",
                    user != null ? user.getRole().name() : "ANONYMOUS",
                    "USER",
                    user != null ? user.getUserId() : null,
                    user != null ? user.getOrganizationId() : null,
                    "Failed login attempt for email: " + normalizedEmail
            );
            throw new AuthenticationFailedException("Invalid email or password");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            auditService.logEvent(
                    AuditEventType.LOGIN_FAILURE,
                    user.getUserId(),
                    user.getRole().name(),
                    "USER",
                    user.getUserId(),
                    user.getOrganizationId(),
                    "Login denied: User account is " + user.getStatus()
            );
            throw new AuthenticationFailedException("User account is " + user.getStatus() + ". Login not permitted.");
        }

        if (!user.isEmailVerified()) {
            auditService.logEvent(
                    AuditEventType.LOGIN_FAILURE,
                    user.getUserId(),
                    user.getRole().name(),
                    "USER",
                    user.getUserId(),
                    user.getOrganizationId(),
                    "Login denied: Email is unverified"
            );
            throw new AuthenticationFailedException("Email is unverified. Please complete OTP verification.");
        }

        // If collegeId is specified (e.g. Consumer Login or College-scoped login), verify matching college
        if (request.getCollegeId() != null && !request.getCollegeId().isBlank()) {
            String requestedCollege = request.getCollegeId().trim();
            Organization matchedOrg = organizationService.getOrganizationEntityByIdOrCode(requestedCollege);
            if (user.getOrganizationId() == null ||
                    (!user.getOrganizationId().equals(matchedOrg.getOrganizationId()) &&
                     !user.getOrganizationId().equalsIgnoreCase(matchedOrg.getOrganizationCode()))) {
                auditService.logEvent(
                        AuditEventType.LOGIN_FAILURE,
                        user.getUserId(),
                        user.getRole().name(),
                        "USER",
                        user.getUserId(),
                        user.getOrganizationId(),
                        "Login denied: College ID mismatch. User is not affiliated with " + matchedOrg.getName()
                );
                throw new AuthenticationFailedException("Invalid College ID for this user account. User is not affiliated with " + matchedOrg.getName());
            }
        }

        // For organization-scoped roles (ORG_ADMIN, USER, and CONSUMER), verify organization status
        if (user.getRole() == UserRole.ORG_ADMIN || user.getRole() == UserRole.USER || user.getRole() == UserRole.CONSUMER) {
            if (user.getOrganizationId() == null) {
                throw new AuthenticationFailedException("User has no associated organization.");
            }
            Organization organization = organizationService.getOrganizationEntityById(user.getOrganizationId());
            if (organization.getStatus() != OrganizationStatus.ACTIVE) {
                auditService.logEvent(
                        AuditEventType.LOGIN_FAILURE,
                        user.getUserId(),
                        user.getRole().name(),
                        "ORGANIZATION",
                        organization.getOrganizationId(),
                        organization.getOrganizationId(),
                        "Login denied: Organization is " + organization.getStatus()
                );
                throw new AuthenticationFailedException(
                        "Organization '" + organization.getOrganizationCode() +
                                "' is " + organization.getStatus() + ". Login not permitted."
                );
            }
        }

        String token = jwtUtil.generateAuthToken(
                user.getUserId(),
                user.getEmail(),
                user.getRole().name(),
                user.getOrganizationId(),
                user.getExternalIdentityId()
        );

        auditService.logEvent(
                AuditEventType.LOGIN_SUCCESS,
                user.getUserId(),
                user.getRole().name(),
                "USER",
                user.getUserId(),
                user.getOrganizationId(),
                "Successful login for user: " + user.getEmail()
        );

        return new AuthResponse(
                token,
                user.getUserId(),
                user.getName(),
                user.getEmail(),
                user.getOrganizationId(),
                user.getRole()
        );
    }
}
