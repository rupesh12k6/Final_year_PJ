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

        // 2. Bootstrap College A (Data Provider)
        Organization orgA = organizationRepository.findByOrganizationCode("COLLEGE_A").orElse(null);
        if (orgA == null) {
            orgA = new Organization(
                    "ORG_COLLEGE_A",
                    "COLLEGE_A",
                    "College A University",
                    "contact@collegea.edu",
                    "http://localhost:8081/api/auth/login",
                    "http://localhost:8081/api/provider/onboarding/eligible-students",
                    "http://localhost:8081",
                    "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0COLLEGE_A_PUBLIC_KEY\n-----END PUBLIC KEY-----",
                    "A-INTERNAL-SECRET-KEY",
                    OrganizationStatus.ACTIVE
            );
            orgA = organizationRepository.save(orgA);
            log.info("Initialized default Organization College A with Base URL: {}", orgA.getDataBaseUrl());
        } else if (orgA.getDataBaseUrl() == null) {
            orgA.setDataBaseUrl("http://localhost:8081");
            orgA.setCredentials("A-INTERNAL-SECRET-KEY");
            orgA.setPublicKey("-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0COLLEGE_A_PUBLIC_KEY\n-----END PUBLIC KEY-----");
            orgA.setStatus(OrganizationStatus.ACTIVE);
            organizationRepository.save(orgA);
        }

        // Bootstrap College A Admin
        if (userRepository.findByEmail("admin@collegea.edu").isEmpty()) {
            User adminA = new User(
                    "ORG_ADM_COLLEGE_A",
                    "College A Administrator",
                    "admin@collegea.edu",
                    passwordEncoder.encode("CollegeAdmin123"),
                    orgA.getOrganizationId(),
                    null,
                    UserRole.ORG_ADMIN,
                    UserStatus.ACTIVE,
                    true
            );
            userRepository.save(adminA);
            log.info("Initialized College A Admin: admin@collegea.edu");
        }

        // Bootstrap College A Student (Alice Johnson)
        if (userRepository.findByEmail("student1@collegea.edu").isEmpty() &&
                !userRepository.existsByOrganizationIdAndExternalIdentityId(orgA.getOrganizationId(), "STU-2023-001")) {
            User studentAlice = new User(
                    "USER_STU_001",
                    "Alice Johnson",
                    "student1@collegea.edu",
                    passwordEncoder.encode("StudentPassword123"),
                    orgA.getOrganizationId(),
                    "STU-2023-001",
                    UserRole.USER,
                    UserStatus.ACTIVE,
                    true
            );
            userRepository.save(studentAlice);
            log.info("Initialized College A Student: student1@collegea.edu (STU-2023-001)");
        }

        // 3. Bootstrap College B (Data Consumer)
        Organization orgB = organizationRepository.findByOrganizationCode("COLLEGE_B").orElse(null);
        if (orgB == null) {
            orgB = new Organization(
                    "ORG_COLLEGE_B",
                    "COLLEGE_B",
                    "College B University",
                    "contact@collegeb.edu",
                    "http://localhost:8082/api/auth/login",
                    "http://localhost:8082/api/onboarding/eligible-students",
                    "http://localhost:8082",
                    "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0COLLEGE_B_PUBLIC_KEY\n-----END PUBLIC KEY-----",
                    "B-INTERNAL-SECRET-KEY",
                    OrganizationStatus.ACTIVE
            );
            orgB = organizationRepository.save(orgB);
            log.info("Initialized default Organization College B with Base URL: {}", orgB.getDataBaseUrl());
        } else if (orgB.getDataBaseUrl() == null) {
            orgB.setDataBaseUrl("http://localhost:8082");
            orgB.setCredentials("B-INTERNAL-SECRET-KEY");
            orgB.setPublicKey("-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0COLLEGE_B_PUBLIC_KEY\n-----END PUBLIC KEY-----");
            orgB.setStatus(OrganizationStatus.ACTIVE);
            organizationRepository.save(orgB);
        }

        // Bootstrap College B Admin
        if (userRepository.findByEmail("admin@collegeb.edu").isEmpty()) {
            User adminB = new User(
                    "ORG_ADM_COLLEGE_B",
                    "College B Administrator",
                    "admin@collegeb.edu",
                    passwordEncoder.encode("CollegeAdmin123"),
                    orgB.getOrganizationId(),
                    null,
                    UserRole.ORG_ADMIN,
                    UserStatus.ACTIVE,
                    true
            );
            userRepository.save(adminB);
            log.info("Initialized College B Admin: admin@collegeb.edu");
        }

        // Bootstrap College B Consumer User
        if (userRepository.findByEmail("consumer@collegeb.edu").isEmpty()) {
            User consumerB = new User(
                    "CONSUMER_COLLEGE_B",
                    "College B Consumer / Verifier",
                    "consumer@collegeb.edu",
                    passwordEncoder.encode("Consumer@123"),
                    orgB.getOrganizationId(),
                    null,
                    UserRole.CONSUMER,
                    UserStatus.ACTIVE,
                    true
            );
            userRepository.save(consumerB);
            log.info("Initialized College B Consumer: consumer@collegeb.edu");
        }

        // Bootstrap College B Student Bob
        if (userRepository.findByEmail("student2001@collegeb.edu").isEmpty() &&
                !userRepository.existsByOrganizationIdAndExternalIdentityId(orgB.getOrganizationId(), "S2001")) {
            User studentBob = new User(
                    "USER_STU_BOB",
                    "Bob Roberts",
                    "student2001@collegeb.edu",
                    passwordEncoder.encode("StudentPassword123"),
                    orgB.getOrganizationId(),
                    "S2001",
                    UserRole.USER,
                    UserStatus.ACTIVE,
                    true
            );
            userRepository.save(studentBob);
            log.info("Initialized College B Student: student2001@collegeb.edu (S2001)");
        }
    }
}
