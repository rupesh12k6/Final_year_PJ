package com.depa.consent.service;

import com.depa.consent.dto.CreateAdminRequest;
import com.depa.consent.dto.CreateOrgAdminRequest;
import com.depa.consent.dto.CreateUserRequest;
import com.depa.consent.dto.UserResponse;
import com.depa.consent.entity.AuditEventType;
import com.depa.consent.entity.Organization;
import com.depa.consent.entity.OrganizationStatus;
import com.depa.consent.entity.User;
import com.depa.consent.entity.UserRole;
import com.depa.consent.entity.UserStatus;
import com.depa.consent.exception.DuplicateResourceException;
import com.depa.consent.exception.ForbiddenOperationException;
import com.depa.consent.exception.InvalidLifecycleTransitionException;
import com.depa.consent.exception.ResourceNotFoundException;
import com.depa.consent.repository.UserRepository;
import com.depa.consent.security.UserPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final OrganizationService organizationService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(UserRepository userRepository,
                       OrganizationService organizationService,
                       PasswordEncoder passwordEncoder,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.organizationService = organizationService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    // ==========================================
    // SUPER_ADMIN OPERATIONS -> CREATE / MANAGE ADMIN
    // ==========================================
    public UserResponse createAdmin(CreateAdminRequest request, UserPrincipal actor) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("User with email '" + normalizedEmail + "' already exists");
        }

        String userId = "ADM_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        User admin = new User(
                userId,
                request.getName().trim(),
                normalizedEmail,
                passwordEncoder.encode(request.getPassword()),
                null, // CM-level account has no organizationId
                UserRole.ADMIN,
                UserStatus.ACTIVE
        );

        User saved = userRepository.save(admin);

        auditService.logEvent(
                AuditEventType.ADMIN_CREATED,
                actor != null ? actor.getUserId() : "SYSTEM",
                actor != null ? actor.getRole().name() : "SUPER_ADMIN",
                "USER",
                saved.getUserId(),
                null,
                "ADMIN created: " + normalizedEmail
        );

        return new UserResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllAdmins() {
        return userRepository.findByRole(UserRole.ADMIN)
                .stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }

    public UserResponse suspendAdmin(String adminId, UserPrincipal actor) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with ID: " + adminId));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new InvalidLifecycleTransitionException("User is not an ADMIN");
        }

        admin.setStatus(UserStatus.SUSPENDED);
        User updated = userRepository.save(admin);

        auditService.logEvent(
                AuditEventType.ADMIN_SUSPENDED,
                actor != null ? actor.getUserId() : "SYSTEM",
                actor != null ? actor.getRole().name() : "SUPER_ADMIN",
                "USER",
                updated.getUserId(),
                null,
                "ADMIN suspended: " + updated.getEmail()
        );

        return new UserResponse(updated);
    }

    public UserResponse activateAdmin(String adminId, UserPrincipal actor) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with ID: " + adminId));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new InvalidLifecycleTransitionException("User is not an ADMIN");
        }

        admin.setStatus(UserStatus.ACTIVE);
        User updated = userRepository.save(admin);

        auditService.logEvent(
                AuditEventType.ADMIN_ACTIVATED,
                actor != null ? actor.getUserId() : "SYSTEM",
                actor != null ? actor.getRole().name() : "SUPER_ADMIN",
                "USER",
                updated.getUserId(),
                null,
                "ADMIN activated: " + updated.getEmail()
        );

        return new UserResponse(updated);
    }

    // ==========================================
    // ADMIN / SUPER_ADMIN -> CREATE ORG_ADMIN
    // ==========================================
    public UserResponse createOrgAdmin(String orgId, CreateOrgAdminRequest request, UserPrincipal actor) {
        Organization organization = organizationService.getOrganizationEntityById(orgId);

        if (organization.getStatus() != OrganizationStatus.ACTIVE) {
            throw new InvalidLifecycleTransitionException(
                    "Cannot create ORG_ADMIN for organization '" + organization.getOrganizationCode() +
                            "' because its status is " + organization.getStatus() + ". Only ACTIVE organizations can have ORG_ADMINs."
            );
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("User with email '" + normalizedEmail + "' already exists");
        }

        String userId = "ORG_ADM_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        User orgAdmin = new User(
                userId,
                request.getName().trim(),
                normalizedEmail,
                passwordEncoder.encode(request.getPassword()),
                organization.getOrganizationId(),
                UserRole.ORG_ADMIN,
                UserStatus.ACTIVE
        );

        User saved = userRepository.save(orgAdmin);

        auditService.logEvent(
                AuditEventType.ORG_ADMIN_CREATED,
                actor != null ? actor.getUserId() : "SYSTEM",
                actor != null ? actor.getRole().name() : "ADMIN",
                "USER",
                saved.getUserId(),
                organization.getOrganizationId(),
                "ORG_ADMIN created for organization: " + organization.getOrganizationCode()
        );

        return new UserResponse(saved);
    }

    // ==========================================
    // ORG_ADMIN OPERATIONS -> CREATE / MANAGE USER IN OWN ORG
    // ==========================================
    public UserResponse createUserInOrg(CreateUserRequest request, UserPrincipal actor) {
        if (actor == null || actor.getOrganizationId() == null) {
            throw new ForbiddenOperationException("Access Denied: Authenticated user has no organization scope");
        }

        String orgId = actor.getOrganizationId();
        Organization organization = organizationService.getOrganizationEntityById(orgId);

        if (organization.getStatus() != OrganizationStatus.ACTIVE) {
            throw new ForbiddenOperationException(
                    "Cannot create users: Organization '" + organization.getOrganizationCode() + "' is " + organization.getStatus()
            );
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("User with email '" + normalizedEmail + "' already exists");
        }

        String userId = "USR_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        User user = new User(
                userId,
                request.getName().trim(),
                normalizedEmail,
                passwordEncoder.encode(request.getPassword()),
                organization.getOrganizationId(),
                UserRole.USER,
                UserStatus.ACTIVE
        );

        User saved = userRepository.save(user);

        auditService.logEvent(
                AuditEventType.USER_CREATED,
                actor.getUserId(),
                actor.getRole().name(),
                "USER",
                saved.getUserId(),
                organization.getOrganizationId(),
                "USER created for organization: " + organization.getOrganizationCode()
        );

        return new UserResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getUsersForOrg(String orgId, UserPrincipal actor) {
        // Enforce organization ownership check for ORG_ADMIN
        if (actor.getRole() == UserRole.ORG_ADMIN) {
            if (!orgId.equals(actor.getOrganizationId())) {
                throw new ForbiddenOperationException(
                        "Access Denied: You can only view users in your own organization (" + actor.getOrganizationId() + ")"
                );
            }
        }

        return userRepository.findByOrganizationId(orgId)
                .stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }

    public UserResponse suspendUser(String userId, UserPrincipal actor) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        // Enforce organization ownership check
        if (actor.getRole() == UserRole.ORG_ADMIN) {
            if (targetUser.getOrganizationId() == null || !targetUser.getOrganizationId().equals(actor.getOrganizationId())) {
                throw new ForbiddenOperationException("Access Denied: You cannot suspend users from another organization");
            }
            if (targetUser.getRole() == UserRole.SUPER_ADMIN || targetUser.getRole() == UserRole.ADMIN) {
                throw new ForbiddenOperationException("Access Denied: Cannot suspend an administrator");
            }
        }

        targetUser.setStatus(UserStatus.SUSPENDED);
        User updated = userRepository.save(targetUser);

        auditService.logEvent(
                AuditEventType.USER_SUSPENDED,
                actor.getUserId(),
                actor.getRole().name(),
                "USER",
                updated.getUserId(),
                updated.getOrganizationId(),
                "User suspended: " + updated.getEmail()
        );

        return new UserResponse(updated);
    }

    public UserResponse activateUser(String userId, UserPrincipal actor) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        // Enforce organization ownership check
        if (actor.getRole() == UserRole.ORG_ADMIN) {
            if (targetUser.getOrganizationId() == null || !targetUser.getOrganizationId().equals(actor.getOrganizationId())) {
                throw new ForbiddenOperationException("Access Denied: You cannot activate users from another organization");
            }
        }

        targetUser.setStatus(UserStatus.ACTIVE);
        User updated = userRepository.save(targetUser);

        auditService.logEvent(
                AuditEventType.USER_ACTIVATED,
                actor.getUserId(),
                actor.getRole().name(),
                "USER",
                updated.getUserId(),
                updated.getOrganizationId(),
                "User activated: " + updated.getEmail()
        );

        return new UserResponse(updated);
    }

    public UserResponse forceResetUserPassword(String userId, String newPassword, UserPrincipal actor) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        if (actor.getRole() == UserRole.ORG_ADMIN) {
            if (targetUser.getOrganizationId() == null || !targetUser.getOrganizationId().equals(actor.getOrganizationId())) {
                throw new ForbiddenOperationException("Access Denied: You cannot reset password for users from another organization");
            }
        }

        targetUser.setPasswordHash(passwordEncoder.encode(newPassword));
        
        // If they were pending registration, active them now that they have a password
        if (targetUser.getStatus() == UserStatus.PENDING) {
            targetUser.setStatus(UserStatus.ACTIVE);
            targetUser.setEmailVerified(true);
        }

        User updated = userRepository.save(targetUser);

        auditService.logEvent(
                AuditEventType.USER_ACTIVATED, // Reuse event type or create a new one
                actor.getUserId(),
                actor.getRole().name(),
                "USER",
                updated.getUserId(),
                updated.getOrganizationId(),
                "Password forcibly reset by administrator for: " + updated.getEmail()
        );

        return new UserResponse(updated);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserProfile(UserPrincipal actor) {
        User user = userRepository.findById(actor.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + actor.getUserId()));
        return new UserResponse(user);
    }
}
