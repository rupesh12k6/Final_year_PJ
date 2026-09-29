package com.depa.consent.config;

import com.depa.consent.entity.*;
import com.depa.consent.repository.OrganizationRepository;
import com.depa.consent.repository.UserRepository;
import com.depa.consent.service.AuditService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(2)
public class BootstrapSuperAdminRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapSuperAdminRunner.class);

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @Value("${app.bootstrap.super-admin.email:superadmin@depa.cm}")
    private String superAdminEmail;

    @Value("${app.bootstrap.super-admin.password:SuperAdmin@123}")
    private String superAdminPassword;

    public BootstrapSuperAdminRunner(UserRepository userRepository,
                                     OrganizationRepository organizationRepository,
                                     PasswordEncoder passwordEncoder,
                                     AuditService auditService) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Override
    public void run(String... args) {
        // 1. Bootstrap SUPER_ADMIN
        if (!userRepository.existsByRole(UserRole.SUPER_ADMIN)) {
            String normalizedEmail = superAdminEmail.trim().toLowerCase();
            User superAdmin = new User(
                    "SUPER_ADMIN_001",
                    "Consent Manager Super Admin",
                    normalizedEmail,
                    passwordEncoder.encode(superAdminPassword),
                    null,
                    null,
                    UserRole.SUPER_ADMIN,
                    UserStatus.ACTIVE,
                    true
            );

            userRepository.save(superAdmin);
            auditService.logEvent(
                    AuditEventType.SUPER_ADMIN_BOOTSTRAPPED,
                    superAdmin.getUserId(),
                    UserRole.SUPER_ADMIN.name(),
                    "USER",
                    superAdmin.getUserId(),
                    null,
                    "Initial SUPER_ADMIN account bootstrapped securely"
            );

            log.info("Initialized default SUPER_ADMIN account: {}", normalizedEmail);
        }
    }
}
