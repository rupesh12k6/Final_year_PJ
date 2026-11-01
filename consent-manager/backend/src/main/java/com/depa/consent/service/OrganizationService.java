package com.depa.consent.service;

import com.depa.consent.dto.CreateOrganizationRequest;
import com.depa.consent.dto.OrganizationResponse;
import com.depa.consent.entity.AuditEventType;
import com.depa.consent.entity.Organization;
import com.depa.consent.entity.OrganizationStatus;
import com.depa.consent.exception.DuplicateResourceException;
import com.depa.consent.exception.ResourceNotFoundException;
import com.depa.consent.entity.User;
import com.depa.consent.entity.UserRole;
import com.depa.consent.entity.UserStatus;
import com.depa.consent.repository.OrganizationRepository;
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
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public OrganizationService(OrganizationRepository organizationRepository,
                               UserRepository userRepository,
                               PasswordEncoder passwordEncoder,
                               AuditService auditService) {
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    public OrganizationResponse createOrganization(CreateOrganizationRequest request, UserPrincipal actor) {
        String normalizedCode = request.getOrganizationCode().trim().toUpperCase();
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (organizationRepository.existsByOrganizationCode(normalizedCode)) {
            throw new DuplicateResourceException("Organization with code '" + normalizedCode + "' already exists");
        }
        if (organizationRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("Organization with email '" + normalizedEmail + "' already exists");
        }

        String loginEndpoint = request.getLoginEndpoint() != null ? request.getLoginEndpoint().trim() : null;
        String onboardingEndpoint = request.getOnboardingEndpoint() != null ? request.getOnboardingEndpoint().trim() : null;
        String dataBaseUrl = request.getDataBaseUrl() != null ? request.getDataBaseUrl().trim() : null;
        String publicKey = request.getPublicKey() != null ? request.getPublicKey().trim() : null;
        String credentials = request.getCredentials() != null ? request.getCredentials().trim() : null;

        validateEndpointUrl(loginEndpoint, "Login endpoint");
        validateEndpointUrl(onboardingEndpoint, "Onboarding endpoint");
        validateEndpointUrl(dataBaseUrl, "Basic data URL");

        String orgId = "ORG_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Organization organization = new Organization(
                orgId,
                normalizedCode,
                request.getName().trim(),
                normalizedEmail,
                loginEndpoint,
                onboardingEndpoint,
                dataBaseUrl,
                publicKey,
                credentials,
                OrganizationStatus.PENDING
        );

        Organization saved = organizationRepository.save(organization);

        // If College Admin credentials were provided, create the College Admin account immediately
        if (request.getAdminEmail() != null && !request.getAdminEmail().isBlank() &&
                request.getAdminPassword() != null && !request.getAdminPassword().isBlank()) {
            String adminEmail = request.getAdminEmail().trim().toLowerCase();
            if (!userRepository.existsByEmail(adminEmail)) {
                String adminName = (request.getAdminName() != null && !request.getAdminName().isBlank())
                        ? request.getAdminName().trim()
                        : request.getName().trim() + " Administrator";

                String userId = "ORG_ADM_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                User orgAdmin = new User(
                        userId,
                        adminName,
                        adminEmail,
                        passwordEncoder.encode(request.getAdminPassword()),
                        saved.getOrganizationId(),
                        null,
                        UserRole.ORG_ADMIN,
                        UserStatus.ACTIVE,
                        true
                );
                userRepository.save(orgAdmin);

                auditService.logEvent(
                        AuditEventType.ORG_ADMIN_CREATED,
                        actor != null ? actor.getUserId() : "SYSTEM",
                        actor != null ? actor.getRole().name() : "ADMIN",
                        "USER",
                        orgAdmin.getUserId(),
                        saved.getOrganizationId(),
                        "College Admin created: " + adminEmail + " for College: " + normalizedCode
                );
            }
        }

        auditService.logEvent(
                AuditEventType.ORGANIZATION_CREATED,
                actor != null ? actor.getUserId() : "SYSTEM",
                actor != null ? actor.getRole().name() : "SYSTEM",
                "ORGANIZATION",
                saved.getOrganizationId(),
                saved.getOrganizationId(),
                "College registered with code: " + normalizedCode + " and Base URL: " + dataBaseUrl
        );

        return new OrganizationResponse(saved);
    }

    private void validateEndpointUrl(String url, String fieldName) {
        if (url == null || url.isBlank()) {
            return;
        }
        try {
            java.net.URI uri = java.net.URI.create(url);
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                throw new IllegalArgumentException(fieldName + " must use HTTP or HTTPS protocol");
            }
            if (uri.getUserInfo() != null && !uri.getUserInfo().isBlank()) {
                throw new IllegalArgumentException(fieldName + " must not contain embedded user credentials");
            }
            if (uri.getHost() == null || uri.getHost().isBlank()) {
                throw new IllegalArgumentException(fieldName + " must contain a valid host");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException(fieldName + " is not a valid URL: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<OrganizationResponse> getAllOrganizations() {
        return organizationRepository.findAll()
                .stream()
                .map(OrganizationResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<com.depa.consent.dto.PublicOrganizationResponse> getPublicOrganizations() {
        return organizationRepository.findAll()
                .stream()
                .map(com.depa.consent.dto.PublicOrganizationResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Organization> getOrganizationsMapByIds(java.util.Set<String> ids) {
        return organizationRepository.findAllById(ids)
                .stream()
                .collect(Collectors.toMap(Organization::getOrganizationId, org -> org));
    }

    @Transactional(readOnly = true)
    public OrganizationResponse getOrganizationById(String id) {
        Organization organization = getOrganizationEntityById(id);
        return new OrganizationResponse(organization);
    }

    @Transactional(readOnly = true)
    public Organization getOrganizationEntityById(String id) {
        return organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with ID: " + id));
    }

    @Transactional(readOnly = true)
    public Organization getOrganizationEntityByCode(String code) {
        return organizationRepository.findByOrganizationCode(code.trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with code: " + code));
    }

    @Transactional(readOnly = true)
    public Organization getOrganizationEntityByIdOrCode(String idOrCode) {
        String trimmed = idOrCode.trim();
        return organizationRepository.findById(trimmed)
                .or(() -> organizationRepository.findByOrganizationCode(trimmed.toUpperCase()))
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with ID or Code: " + idOrCode));
    }

    public OrganizationResponse activateOrganization(String id, UserPrincipal actor) {
        Organization organization = getOrganizationEntityById(id);
        organization.setStatus(OrganizationStatus.ACTIVE);
        Organization updated = organizationRepository.save(organization);

        auditService.logEvent(
                AuditEventType.ORGANIZATION_ACTIVATED,
                actor != null ? actor.getUserId() : "SYSTEM",
                actor != null ? actor.getRole().name() : "SYSTEM",
                "ORGANIZATION",
                updated.getOrganizationId(),
                updated.getOrganizationId(),
                "Organization activated: " + updated.getOrganizationCode()
        );

        return new OrganizationResponse(updated);
    }

    public OrganizationResponse suspendOrganization(String id, UserPrincipal actor) {
        Organization organization = getOrganizationEntityById(id);
        organization.setStatus(OrganizationStatus.SUSPENDED);
        Organization updated = organizationRepository.save(organization);

        auditService.logEvent(
                AuditEventType.ORGANIZATION_SUSPENDED,
                actor != null ? actor.getUserId() : "SYSTEM",
                actor != null ? actor.getRole().name() : "SYSTEM",
                "ORGANIZATION",
                updated.getOrganizationId(),
                updated.getOrganizationId(),
                "Organization suspended: " + updated.getOrganizationCode()
        );

        return new OrganizationResponse(updated);
    }
}
