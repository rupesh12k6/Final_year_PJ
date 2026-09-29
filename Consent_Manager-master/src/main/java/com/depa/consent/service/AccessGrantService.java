package com.depa.consent.service;

import com.depa.consent.dto.AccessGrantResponse;
import com.depa.consent.dto.GrantValidationResponse;
import com.depa.consent.entity.*;
import com.depa.consent.exception.ForbiddenOperationException;
import com.depa.consent.exception.ResourceNotFoundException;
import com.depa.consent.repository.AccessGrantRepository;
import com.depa.consent.repository.ConsentRepository;
import com.depa.consent.security.RsaKeyProvider;
import com.depa.consent.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class AccessGrantService {

    private final AccessGrantRepository accessGrantRepository;
    private final ConsentRepository consentRepository;
    private final OrganizationService organizationService;
    private final RsaKeyProvider rsaKeyProvider;
    private final AuditService auditService;

    public AccessGrantService(AccessGrantRepository accessGrantRepository,
                              ConsentRepository consentRepository,
                              OrganizationService organizationService,
                              RsaKeyProvider rsaKeyProvider,
                              AuditService auditService) {
        this.accessGrantRepository = accessGrantRepository;
        this.consentRepository = consentRepository;
        this.organizationService = organizationService;
        this.rsaKeyProvider = rsaKeyProvider;
        this.auditService = auditService;
    }

    /**
     * Provider verification endpoint: Checks live state of Access Grant and associated Consent.
     * Guaranteed real-time revocation and expiration check.
     */
    @Transactional(readOnly = true)
    public GrantValidationResponse validateGrant(String grantId) {
        if (grantId == null || grantId.isBlank()) {
            return GrantValidationResponse.invalid("Grant ID is missing");
        }

        AccessGrant grant = accessGrantRepository.findById(grantId.trim()).orElse(null);
        if (grant == null) {
            return GrantValidationResponse.invalid("Access grant not found");
        }

        if (grant.getStatus() != AccessGrantStatus.ACTIVE) {
            return GrantValidationResponse.invalid("Access grant is " + grant.getStatus().name());
        }

        if (Instant.now().isAfter(grant.getExpiresAt())) {
            return GrantValidationResponse.invalid("Access grant has expired");
        }

        Consent consent = consentRepository.findById(grant.getConsentId()).orElse(null);
        if (consent == null) {
            return GrantValidationResponse.invalid("Associated consent record not found");
        }

        if (consent.getStatus() != ConsentStatus.ACTIVE) {
            return GrantValidationResponse.invalid("Associated consent has been " + consent.getStatus().name());
        }

        if (Instant.now().isAfter(consent.getExpiresAt())) {
            return GrantValidationResponse.invalid("Associated consent has expired");
        }

        Organization requesterOrg = organizationService.getOrganizationEntityById(grant.getRequesterOrganizationId());
        Organization providerOrg = organizationService.getOrganizationEntityById(grant.getProviderOrganizationId());

        auditService.logEvent(
                AuditEventType.ACCESS_GRANT_VALIDATED,
                "PROVIDER_CLIENT",
                "SYSTEM",
                "ACCESS_GRANT",
                grant.getId(),
                grant.getProviderOrganizationId(),
                "Access grant live validation succeeded for GrantId=" + grant.getId()
        );

        return GrantValidationResponse.valid(
                grant.getId(),
                consent.getId(),
                grant.getDataPrincipalId(),
                providerOrg.getOrganizationId(),
                providerOrg.getOrganizationCode(),
                requesterOrg.getOrganizationId(),
                requesterOrg.getOrganizationCode(),
                grant.getApprovedFields(),
                grant.getPurpose(),
                grant.getExpiresAt()
        );
    }

    @Transactional(readOnly = true)
    public AccessGrantResponse getGrantById(String grantId, UserPrincipal actor) {
        AccessGrant grant = accessGrantRepository.findById(grantId)
                .orElseThrow(() -> new ResourceNotFoundException("Access grant not found with ID: " + grantId));

        if (actor.getRole() != UserRole.SUPER_ADMIN && actor.getRole() != UserRole.ADMIN) {
            if (!actor.getOrganizationId().equals(grant.getRequesterOrganizationId()) &&
                !actor.getOrganizationId().equals(grant.getProviderOrganizationId()) &&
                (actor.getExternalIdentityId() == null || !actor.getExternalIdentityId().equalsIgnoreCase(grant.getDataPrincipalId()))) {
                throw new ForbiddenOperationException("Access Denied: You do not have permission to view this access grant");
            }
        }

        Organization requesterOrg = organizationService.getOrganizationEntityById(grant.getRequesterOrganizationId());
        Organization providerOrg = organizationService.getOrganizationEntityById(grant.getProviderOrganizationId());

        return new AccessGrantResponse(grant, requesterOrg.getOrganizationCode(), providerOrg.getOrganizationCode(), null);
    }

    @Transactional(readOnly = true)
    public List<AccessGrantResponse> getGrantsForRequester(UserPrincipal actor) {
        if (actor == null || actor.getOrganizationId() == null) {
            throw new ForbiddenOperationException("Access Denied: No organization scope");
        }

        Organization requesterOrg = organizationService.getOrganizationEntityById(actor.getOrganizationId());
        List<AccessGrant> grants = accessGrantRepository.findByRequesterOrganizationId(actor.getOrganizationId());

        return grants.stream()
                .map(g -> {
                    Organization prov = organizationService.getOrganizationEntityById(g.getProviderOrganizationId());
                    return new AccessGrantResponse(g, requesterOrg.getOrganizationCode(), prov.getOrganizationCode(), null);
                })
                .collect(Collectors.toList());
    }

    public String getPublicKeyPem() {
        return rsaKeyProvider.getPublicKeyPem();
    }
}
