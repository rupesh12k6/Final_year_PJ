package com.depa.consent.service;

import com.depa.consent.dto.*;
import com.depa.consent.entity.*;
import com.depa.consent.exception.ForbiddenOperationException;
import com.depa.consent.exception.InvalidLifecycleTransitionException;
import com.depa.consent.exception.ResourceNotFoundException;
import com.depa.consent.repository.AccessGrantRepository;
import com.depa.consent.repository.ConsentRepository;
import com.depa.consent.repository.ConsentRequestRepository;
import com.depa.consent.repository.DataRequestRepository;
import com.depa.consent.security.DataAccessJwtSigner;
import com.depa.consent.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Service
@Transactional
public class ConsentService {

    private final ConsentRequestRepository consentRequestRepository;
    private final ConsentRepository consentRepository;
    private final AccessGrantRepository accessGrantRepository;
    private final DataRequestRepository dataRequestRepository;
    private final OrganizationService organizationService;
    private final DataAccessJwtSigner dataAccessJwtSigner;
    private final AuditService auditService;

    public ConsentService(ConsentRequestRepository consentRequestRepository,
            ConsentRepository consentRepository,
            AccessGrantRepository accessGrantRepository,
            DataRequestRepository dataRequestRepository,
            OrganizationService organizationService,
            DataAccessJwtSigner dataAccessJwtSigner,
            AuditService auditService) {
        this.consentRequestRepository = consentRequestRepository;
        this.consentRepository = consentRepository;
        this.accessGrantRepository = accessGrantRepository;
        this.dataRequestRepository = dataRequestRepository;
        this.organizationService = organizationService;
        this.dataAccessJwtSigner = dataAccessJwtSigner;
        this.auditService = auditService;
    }

    public ConsentRequest createConsentRequest(DataRequest dataRequest) {
        String consentRequestId = "CREQ_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        ConsentRequest consentRequest = new ConsentRequest(
                consentRequestId,
                dataRequest.getId(),
                dataRequest.getDataPrincipalId(),
                dataRequest.getProviderOrganizationId(),
                dataRequest.getRequesterOrganizationId(),
                dataRequest.getRequesterUserId(),
                dataRequest.getPurpose(),
                dataRequest.getRequestedFields(),
                ConsentRequestStatus.PENDING,
                dataRequest.getExpiresAt());

        ConsentRequest saved = consentRequestRepository.save(consentRequest);

        auditService.logEvent(
                AuditEventType.CONSENT_REQUEST_CREATED,
                dataRequest.getRequesterUserId(),
                "SYSTEM",
                "CONSENT_REQUEST",
                saved.getId(),
                dataRequest.getProviderOrganizationId(),
                String.format("Consent request created for Principal=%s: RequesterOrg=%s, Purpose=%s",
                        dataRequest.getDataPrincipalId(), dataRequest.getRequesterOrganizationId(),
                        dataRequest.getPurpose()));

        return saved;
    }

    @Transactional(readOnly = true)
    public Page<ConsentRequestResponse> getPendingConsentRequestsForPrincipal(UserPrincipal actor, Pageable pageable) {
        validateDataPrincipalActor(actor);

        String principalId = actor.getExternalIdentityId().trim().toUpperCase();
        String orgId = actor.getOrganizationId();

        Page<ConsentRequest> page = consentRequestRepository
                .findByDataPrincipalIdAndDataPrincipalOrganizationIdAndStatus(principalId, orgId,
                        ConsentRequestStatus.PENDING, pageable);

        if (page.isEmpty()) {
            return Page.empty(pageable);
        }

        Set<String> orgIds = new HashSet<>();
        page.forEach(req -> {
            orgIds.add(req.getDataPrincipalOrganizationId());
            orgIds.add(req.getRequesterOrganizationId());
        });

        Map<String, Organization> orgMap = organizationService.getOrganizationsMapByIds(orgIds);

        return page.map(req -> {
            Organization providerOrg = orgMap.get(req.getDataPrincipalOrganizationId());
            Organization requesterOrg = orgMap.get(req.getRequesterOrganizationId());
            return new ConsentRequestResponse(
                    req,
                    providerOrg != null ? providerOrg.getOrganizationCode() : "UNKNOWN",
                    providerOrg != null ? providerOrg.getName() : "Unknown",
                    requesterOrg != null ? requesterOrg.getOrganizationCode() : "UNKNOWN",
                    requesterOrg != null ? requesterOrg.getName() : "Unknown");
        });
    }

    @Transactional(readOnly = true)
    public ConsentRequestResponse getConsentRequestById(String id, UserPrincipal actor) {
        ConsentRequest request = consentRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consent request not found with ID: " + id));

        // Authorization check: Actor must be the Data Principal or an Admin
        if (actor.getRole() != UserRole.SUPER_ADMIN && actor.getRole() != UserRole.ADMIN) {
            if (actor.getExternalIdentityId() == null ||
                    !actor.getExternalIdentityId().equalsIgnoreCase(request.getDataPrincipalId()) ||
                    !actor.getOrganizationId().equals(request.getDataPrincipalOrganizationId())) {
                throw new ForbiddenOperationException(
                        "Access Denied: You are not authorized to view this consent request");
            }
        }

        return mapToConsentRequestResponse(request);
    }

    public AccessGrantResponse approveConsent(String consentRequestId, ApproveConsentRequest approvalRequest,
            UserPrincipal actor) {
        validateDataPrincipalActor(actor);

        ConsentRequest consentRequest = consentRequestRepository.findById(consentRequestId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Consent request not found with ID: " + consentRequestId));

        // Strict Data Principal Verification
        if (!actor.getExternalIdentityId().equalsIgnoreCase(consentRequest.getDataPrincipalId()) ||
                !actor.getOrganizationId().equals(consentRequest.getDataPrincipalOrganizationId())) {
            throw new ForbiddenOperationException(
                    "Access Denied: Only the target Data Principal can approve this consent request");
        }

        if (consentRequest.getStatus() != ConsentRequestStatus.PENDING) {
            throw new InvalidLifecycleTransitionException("Consent request is already " + consentRequest.getStatus());
        }

        if (Instant.now().isAfter(consentRequest.getExpiresAt())) {
            consentRequest.setStatus(ConsentRequestStatus.EXPIRED);
            consentRequestRepository.save(consentRequest);
            throw new InvalidLifecycleTransitionException("Consent request has expired");
        }

        // Determine approved fields (subset or full requested list)
        List<String> approvedFields;
        if (approvalRequest != null && approvalRequest.getApprovedFields() != null) {
            approvedFields = new ArrayList<>(approvalRequest.getApprovedFields());
        } else {
            approvedFields = new ArrayList<>(consentRequest.getRequestedFields());
        }

        // 1. Mark ConsentRequest and DataRequest as APPROVED
        consentRequest.setStatus(ConsentRequestStatus.APPROVED);
        consentRequestRepository.save(consentRequest);

        dataRequestRepository.findById(consentRequest.getDataRequestId()).ifPresent(dr -> {
            dr.setStatus(DataRequestStatus.APPROVED);
            dataRequestRepository.save(dr);
        });

        // 2. Create Consent Record
        String consentId = "CNS_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Consent consent = new Consent(
                consentId,
                consentRequest.getId(),
                consentRequest.getDataPrincipalId(),
                consentRequest.getDataPrincipalOrganizationId(),
                consentRequest.getRequesterOrganizationId(),
                consentRequest.getPurpose(),
                approvedFields,
                ConsentStatus.ACTIVE,
                consentRequest.getExpiresAt());
        Consent savedConsent = consentRepository.save(consent);

        // 3. Create Access Grant
        String grantId = "GRNT_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        AccessGrant accessGrant = new AccessGrant(
                grantId,
                savedConsent.getId(),
                consentRequest.getRequesterOrganizationId(),
                consentRequest.getDataPrincipalOrganizationId(),
                consentRequest.getDataPrincipalId(),
                approvedFields,
                consentRequest.getPurpose(),
                consentRequest.getExpiresAt(),
                AccessGrantStatus.ACTIVE);
        AccessGrant savedGrant = accessGrantRepository.save(accessGrant);

        Organization requesterOrg = organizationService
                .getOrganizationEntityById(consentRequest.getRequesterOrganizationId());
        Organization providerOrg = organizationService
                .getOrganizationEntityById(consentRequest.getDataPrincipalOrganizationId());

        // 4. Issue CM-signed RS256 Data Access JWT
        String accessJwt = dataAccessJwtSigner.generateDataAccessJwt(
                requesterOrg.getOrganizationCode(),
                providerOrg.getOrganizationCode(),
                savedGrant.getId(),
                consentRequest.getDataPrincipalId(),
                consentRequest.getPurpose(),
                approvedFields,
                savedGrant.getExpiresAt());

        savedGrant.setAccessToken(accessJwt);
        savedGrant = accessGrantRepository.save(savedGrant);

        auditService.logEvent(
                AuditEventType.CONSENT_APPROVED,
                actor.getUserId(),
                UserRole.USER.name(),
                "CONSENT",
                savedConsent.getId(),
                providerOrg.getOrganizationId(),
                String.format("Consent approved by Principal=%s for Requester=%s with GrantId=%s",
                        consentRequest.getDataPrincipalId(), requesterOrg.getOrganizationCode(), savedGrant.getId()));

        auditService.logEvent(
                AuditEventType.ACCESS_GRANT_ISSUED,
                actor.getUserId(),
                UserRole.USER.name(),
                "ACCESS_GRANT",
                savedGrant.getId(),
                providerOrg.getOrganizationId(),
                String.format("Access grant issued: GrantId=%s, Scope=%s", savedGrant.getId(), approvedFields));

        return new AccessGrantResponse(
                savedGrant,
                requesterOrg.getOrganizationCode(),
                providerOrg.getOrganizationCode(),
                accessJwt);
    }

    public void rejectConsent(String consentRequestId, UserPrincipal actor) {
        validateDataPrincipalActor(actor);

        ConsentRequest consentRequest = consentRequestRepository.findById(consentRequestId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Consent request not found with ID: " + consentRequestId));

        if (!actor.getExternalIdentityId().equalsIgnoreCase(consentRequest.getDataPrincipalId()) ||
                !actor.getOrganizationId().equals(consentRequest.getDataPrincipalOrganizationId())) {
            throw new ForbiddenOperationException(
                    "Access Denied: Only the target Data Principal can reject this consent request");
        }

        consentRequest.setStatus(ConsentRequestStatus.REJECTED);
        consentRequestRepository.save(consentRequest);

        dataRequestRepository.findById(consentRequest.getDataRequestId()).ifPresent(dr -> {
            dr.setStatus(DataRequestStatus.REJECTED);
            dataRequestRepository.save(dr);
        });

        auditService.logEvent(
                AuditEventType.CONSENT_REJECTED,
                actor.getUserId(),
                UserRole.USER.name(),
                "CONSENT_REQUEST",
                consentRequest.getId(),
                consentRequest.getDataPrincipalOrganizationId(),
                "Consent request rejected by Data Principal: " + consentRequest.getDataPrincipalId());
    }

    public void revokeConsent(String consentId, UserPrincipal actor) {
        validateDataPrincipalActor(actor);

        Consent consent = consentRepository.findById(consentId)
                .or(() -> consentRepository.findByConsentRequestId(consentId))
                .orElseThrow(() -> new ResourceNotFoundException("Consent record not found with ID: " + consentId));

        if (!actor.getExternalIdentityId().equalsIgnoreCase(consent.getDataPrincipalId()) ||
                !actor.getOrganizationId().equals(consent.getProviderOrganizationId())) {
            throw new ForbiddenOperationException(
                    "Access Denied: Only the target Data Principal can revoke this consent");
        }

        consent.setStatus(ConsentStatus.REVOKED);
        consent.setRevokedAt(Instant.now());
        consentRepository.save(consent);

        // Revoke all corresponding access grants
        List<AccessGrant> grants = accessGrantRepository.findByConsentId(consent.getId());
        for (AccessGrant grant : grants) {
            grant.setStatus(AccessGrantStatus.REVOKED);
            grant.setRevokedAt(Instant.now());
            accessGrantRepository.save(grant);
        }

        updateDataRequestStatusOnConsentRevocation(consent.getConsentRequestId());

        auditService.logEvent(
                AuditEventType.CONSENT_REVOKED,
                actor.getUserId(),
                UserRole.USER.name(),
                "CONSENT",
                consent.getId(),
                consent.getProviderOrganizationId(),
                "Consent revoked by Principal=" + consent.getDataPrincipalId() + ". Associated grants revoked.");
    }

    @Transactional(readOnly = true)
    public Page<ConsentResponse> getConsentsForPrincipal(UserPrincipal actor, Pageable pageable) {
        validateDataPrincipalActor(actor);

        Page<Consent> consents = consentRepository.findByDataPrincipalIdAndProviderOrganizationId(
                actor.getExternalIdentityId().trim().toUpperCase(),
                actor.getOrganizationId(),
                pageable);

        if (consents.isEmpty()) {
            return Page.empty(pageable);
        }

        Set<String> orgIds = new HashSet<>();
        consents.forEach(c -> {
            orgIds.add(c.getProviderOrganizationId());
            orgIds.add(c.getRequesterOrganizationId());
        });

        Map<String, Organization> orgMap = organizationService.getOrganizationsMapByIds(orgIds);

        return consents.map(c -> {
            Organization providerOrg = orgMap.get(c.getProviderOrganizationId());
            Organization requesterOrg = orgMap.get(c.getRequesterOrganizationId());
            return new ConsentResponse(
                    c,
                    providerOrg != null ? providerOrg.getOrganizationCode() : "UNKNOWN",
                    requesterOrg != null ? requesterOrg.getOrganizationCode() : "UNKNOWN");
        });
    }

    @Transactional(readOnly = true)
    public List<ConsentResponse> getConsentsForOrganization(String organizationId) {
        List<Consent> consents;
        if (organizationId == null || organizationId.isBlank() || "ALL".equalsIgnoreCase(organizationId)) {
            consents = consentRepository.findAll();
        } else {
            consents = consentRepository.findByProviderOrganizationIdOrRequesterOrganizationIdOrderByCreatedAtDesc(
                    organizationId, organizationId);
        }

        if (consents.isEmpty()) {
            return List.of();
        }

        Set<String> orgIds = new HashSet<>();
        consents.forEach(c -> {
            orgIds.add(c.getProviderOrganizationId());
            orgIds.add(c.getRequesterOrganizationId());
        });

        Map<String, Organization> orgMap = organizationService.getOrganizationsMapByIds(orgIds);

        return consents.stream().map(c -> {
            Organization providerOrg = orgMap.get(c.getProviderOrganizationId());
            Organization requesterOrg = orgMap.get(c.getRequesterOrganizationId());
            return new ConsentResponse(
                    c,
                    providerOrg != null ? providerOrg.getOrganizationCode() : "UNKNOWN",
                    requesterOrg != null ? requesterOrg.getOrganizationCode() : "UNKNOWN");
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ConsentRequestResponse> getPendingConsentRequestsForStudent(String studentId, String orgId,
            Pageable pageable) {
        String normalizedId = studentId.trim().toUpperCase();
        Page<ConsentRequest> page = consentRequestRepository
                .findByDataPrincipalIdAndDataPrincipalOrganizationIdAndStatus(normalizedId, orgId,
                        ConsentRequestStatus.PENDING, pageable);

        if (page.isEmpty()) {
            return Page.empty(pageable);
        }

        Set<String> orgIds = new HashSet<>();
        page.forEach(req -> {
            orgIds.add(req.getDataPrincipalOrganizationId());
            orgIds.add(req.getRequesterOrganizationId());
        });

        Map<String, Organization> orgMap = organizationService.getOrganizationsMapByIds(orgIds);

        return page.map(req -> {
            Organization providerOrg = orgMap.get(req.getDataPrincipalOrganizationId());
            Organization requesterOrg = orgMap.get(req.getRequesterOrganizationId());
            return new ConsentRequestResponse(
                    req,
                    providerOrg != null ? providerOrg.getOrganizationCode() : "UNKNOWN",
                    providerOrg != null ? providerOrg.getName() : "Unknown",
                    requesterOrg != null ? requesterOrg.getOrganizationCode() : "UNKNOWN",
                    requesterOrg != null ? requesterOrg.getName() : "Unknown");
        });
    }

    @Transactional(readOnly = true)
    public Page<ConsentResponse> getConsentsForStudent(String studentId, String orgId, Pageable pageable) {
        String normalizedId = studentId.trim().toUpperCase();
        Page<Consent> consents = consentRepository.findByDataPrincipalIdAndProviderOrganizationId(normalizedId, orgId,
                pageable);

        if (consents.isEmpty()) {
            return Page.empty(pageable);
        }

        Set<String> orgIds = new HashSet<>();
        consents.forEach(c -> {
            orgIds.add(c.getProviderOrganizationId());
            orgIds.add(c.getRequesterOrganizationId());
        });

        Map<String, Organization> orgMap = organizationService.getOrganizationsMapByIds(orgIds);

        return consents.map(c -> {
            Organization providerOrg = orgMap.get(c.getProviderOrganizationId());
            Organization requesterOrg = orgMap.get(c.getRequesterOrganizationId());
            return new ConsentResponse(
                    c,
                    providerOrg != null ? providerOrg.getOrganizationCode() : "UNKNOWN",
                    requesterOrg != null ? requesterOrg.getOrganizationCode() : "UNKNOWN");
        });
    }

    public BridgeApproveResponse bridgeApproveConsent(String consentRequestId, List<String> approvedFields,
            String verifiedStudentId, String verifiedOrgId) {
        ConsentRequest consentRequest = consentRequestRepository.findById(consentRequestId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Consent request not found with ID: " + consentRequestId));

        // Strict ownership check
        if (!consentRequest.getDataPrincipalId().equalsIgnoreCase(verifiedStudentId) ||
                !consentRequest.getDataPrincipalOrganizationId().equals(verifiedOrgId)) {
            auditService.logEvent(
                    AuditEventType.CONSENT_AUTHORIZATION_FAILED,
                    verifiedStudentId,
                    "STUDENT",
                    "CONSENT_REQUEST",
                    consentRequestId,
                    verifiedOrgId,
                    "Access Denied: Student does not own this consent request");
            throw new ForbiddenOperationException(
                    "Access Denied: You are not authorized to approve this consent request");
        }

        // Idempotency check: If already approved with the same scope, return existing
        // confirmation
        if (consentRequest.getStatus() == ConsentRequestStatus.APPROVED) {
            Consent existingConsent = consentRepository.findByConsentRequestId(consentRequestId).orElse(null);
            if (existingConsent != null) {
                return new BridgeApproveResponse(
                        true,
                        "Consent request already approved (idempotent)",
                        existingConsent.getId(),
                        "APPROVED",
                        existingConsent.getApprovedFields(),
                        existingConsent.getExpiresAt());
            }
        }

        if (consentRequest.getStatus() == ConsentRequestStatus.REJECTED) {
            throw new InvalidLifecycleTransitionException(
                    "Consent request has already been REJECTED and cannot be approved");
        }

        if (Instant.now().isAfter(consentRequest.getExpiresAt())) {
            consentRequest.setStatus(ConsentRequestStatus.EXPIRED);
            consentRequestRepository.save(consentRequest);
            throw new InvalidLifecycleTransitionException("Consent request has expired");
        }

        // Field-level subset validation
        List<String> finalApprovedFields = (approvedFields != null && !approvedFields.isEmpty())
                ? new ArrayList<>(approvedFields)
                : new ArrayList<>(consentRequest.getRequestedFields());

        Set<String> requestedSet = new HashSet<>(consentRequest.getRequestedFields());
        for (String field : finalApprovedFields) {
            if (!requestedSet.contains(field)) {
                throw new IllegalArgumentException(
                        "Approved field '" + field + "' is not part of original requested fields: " + requestedSet);
            }
        }

        if (finalApprovedFields.isEmpty()) {
            throw new IllegalArgumentException("At least one field must be approved");
        }

        // 1. Mark ConsentRequest and DataRequest as APPROVED
        consentRequest.setStatus(ConsentRequestStatus.APPROVED);
        consentRequestRepository.save(consentRequest);

        dataRequestRepository.findById(consentRequest.getDataRequestId()).ifPresent(dr -> {
            dr.setStatus(DataRequestStatus.APPROVED);
            dataRequestRepository.save(dr);
        });

        // 2. Create Consent Record
        String consentId = "CNS_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Consent consent = new Consent(
                consentId,
                consentRequest.getId(),
                consentRequest.getDataPrincipalId(),
                consentRequest.getDataPrincipalOrganizationId(),
                consentRequest.getRequesterOrganizationId(),
                consentRequest.getPurpose(),
                finalApprovedFields,
                ConsentStatus.ACTIVE,
                consentRequest.getExpiresAt());
        Consent savedConsent = consentRepository.save(consent);

        // 3. Create Access Grant
        String grantId = "GRNT_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        AccessGrant accessGrant = new AccessGrant(
                grantId,
                savedConsent.getId(),
                consentRequest.getRequesterOrganizationId(),
                consentRequest.getDataPrincipalOrganizationId(),
                consentRequest.getDataPrincipalId(),
                finalApprovedFields,
                consentRequest.getPurpose(),
                consentRequest.getExpiresAt(),
                AccessGrantStatus.ACTIVE);
        AccessGrant savedGrant = accessGrantRepository.save(accessGrant);

        Organization requesterOrg = organizationService
                .getOrganizationEntityById(consentRequest.getRequesterOrganizationId());
        Organization providerOrg = organizationService
                .getOrganizationEntityById(consentRequest.getDataPrincipalOrganizationId());

        // 4. Issue CM-signed RS256 Data Access JWT (stored for consumer retrieval)
        String accessJwt = dataAccessJwtSigner.generateDataAccessJwt(
                requesterOrg.getOrganizationCode(),
                providerOrg.getOrganizationCode(),
                savedGrant.getId(),
                consentRequest.getDataPrincipalId(),
                consentRequest.getPurpose(),
                finalApprovedFields,
                savedGrant.getExpiresAt());

        savedGrant.setAccessToken(accessJwt);
        accessGrantRepository.save(savedGrant);

        auditService.logEvent(
                AuditEventType.CONSENT_APPROVED,
                verifiedStudentId,
                "STUDENT",
                "CONSENT",
                savedConsent.getId(),
                providerOrg.getOrganizationId(),
                String.format("Consent approved by Student=%s for Requester=%s with GrantId=%s, fields=%s",
                        consentRequest.getDataPrincipalId(), requesterOrg.getOrganizationCode(), savedGrant.getId(),
                        finalApprovedFields));

        auditService.logEvent(
                AuditEventType.ACCESS_GRANT_ISSUED,
                verifiedStudentId,
                "STUDENT",
                "ACCESS_GRANT",
                savedGrant.getId(),
                providerOrg.getOrganizationId(),
                String.format("Access grant issued: GrantId=%s, Scope=%s", savedGrant.getId(), finalApprovedFields));

        // College A and the student receive ONLY approval confirmation, NEVER the
        // Access JWT!
        return new BridgeApproveResponse(
                true,
                "Consent approved successfully",
                savedConsent.getId(),
                "APPROVED",
                finalApprovedFields,
                savedConsent.getExpiresAt());
    }

    public void bridgeRejectConsent(String consentRequestId, String verifiedStudentId, String verifiedOrgId) {
        ConsentRequest consentRequest = consentRequestRepository.findById(consentRequestId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Consent request not found with ID: " + consentRequestId));

        if (!consentRequest.getDataPrincipalId().equalsIgnoreCase(verifiedStudentId) ||
                !consentRequest.getDataPrincipalOrganizationId().equals(verifiedOrgId)) {
            auditService.logEvent(
                    AuditEventType.CONSENT_AUTHORIZATION_FAILED,
                    verifiedStudentId,
                    "STUDENT",
                    "CONSENT_REQUEST",
                    consentRequestId,
                    verifiedOrgId,
                    "Access Denied: Student does not own this consent request");
            throw new ForbiddenOperationException(
                    "Access Denied: Only the target student can reject this consent request");
        }

        if (consentRequest.getStatus() == ConsentRequestStatus.REJECTED) {
            return; // Idempotent
        }

        consentRequest.setStatus(ConsentRequestStatus.REJECTED);
        consentRequestRepository.save(consentRequest);

        dataRequestRepository.findById(consentRequest.getDataRequestId()).ifPresent(dr -> {
            dr.setStatus(DataRequestStatus.REJECTED);
            dataRequestRepository.save(dr);
        });

        // REJECTED requests NEVER create Consent or AccessGrant
        auditService.logEvent(
                AuditEventType.CONSENT_REJECTED,
                verifiedStudentId,
                "STUDENT",
                "CONSENT_REQUEST",
                consentRequest.getId(),
                consentRequest.getDataPrincipalOrganizationId(),
                "Consent request rejected by student: " + consentRequest.getDataPrincipalId());
    }

    public void bridgeRevokeConsent(String consentId, String verifiedStudentId, String verifiedOrgId) {
        Consent consent = consentRepository.findById(consentId)
                .or(() -> consentRepository.findByConsentRequestId(consentId))
                .orElseThrow(() -> new ResourceNotFoundException("Consent record not found with ID: " + consentId));

        if (!consent.getDataPrincipalId().equalsIgnoreCase(verifiedStudentId) ||
                !consent.getProviderOrganizationId().equals(verifiedOrgId)) {
            auditService.logEvent(
                    AuditEventType.CONSENT_AUTHORIZATION_FAILED,
                    verifiedStudentId,
                    "STUDENT",
                    "CONSENT",
                    consentId,
                    verifiedOrgId,
                    "Access Denied: Student does not own this consent record");
            throw new ForbiddenOperationException("Access Denied: Only the target student can revoke this consent");
        }

        if (consent.getStatus() == ConsentStatus.REVOKED) {
            return; // Idempotent
        }

        consent.setStatus(ConsentStatus.REVOKED);
        consent.setRevokedAt(Instant.now());
        consentRepository.save(consent);

        List<AccessGrant> grants = accessGrantRepository.findByConsentId(consent.getId());
        for (AccessGrant grant : grants) {
            grant.setStatus(AccessGrantStatus.REVOKED);
            grant.setRevokedAt(Instant.now());
            accessGrantRepository.save(grant);
        }

        updateDataRequestStatusOnConsentRevocation(consent.getConsentRequestId());

        auditService.logEvent(
                AuditEventType.CONSENT_REVOKED,
                verifiedStudentId,
                "STUDENT",
                "CONSENT",
                consent.getId(),
                consent.getProviderOrganizationId(),
                "Consent revoked by Student=" + consent.getDataPrincipalId() + ". Associated grants revoked.");
    }

    private void updateDataRequestStatusOnConsentRevocation(String consentRequestId) {
        if (consentRequestId == null)
            return;
        consentRequestRepository.findById(consentRequestId).ifPresent(cr -> {
            if (cr.getDataRequestId() == null)
                return;
            String dataRequestId = cr.getDataRequestId();

            // Check if any other valid active grant remains for this data request
            boolean hasActiveRemainingGrant = false;
            Optional<ConsentRequest> optCr = consentRequestRepository.findByDataRequestId(dataRequestId);
            if (optCr.isPresent()) {
                Optional<Consent> optConsent = consentRepository.findByConsentRequestId(optCr.get().getId());
                if (optConsent.isPresent() && optConsent.get().getStatus() == ConsentStatus.ACTIVE) {
                    List<AccessGrant> remainingGrants = accessGrantRepository.findByConsentId(optConsent.get().getId());
                    hasActiveRemainingGrant = remainingGrants.stream()
                            .anyMatch(g -> g.getStatus() == AccessGrantStatus.ACTIVE
                                    && g.getExpiresAt().isAfter(Instant.now()));
                }
            }

            if (!hasActiveRemainingGrant) {
                dataRequestRepository.findById(dataRequestId).ifPresent(dr -> {
                    dr.setStatus(DataRequestStatus.REVOKED);
                    dataRequestRepository.save(dr);
                });
            }
        });
    }

    private void validateDataPrincipalActor(UserPrincipal actor) {
        if (actor == null || actor.getOrganizationId() == null || actor.getExternalIdentityId() == null
                || actor.getExternalIdentityId().isBlank()) {
            throw new ForbiddenOperationException(
                    "Access Denied: Authenticated user has no valid Data Principal identity");
        }
    }

    private ConsentRequestResponse mapToConsentRequestResponse(ConsentRequest req) {
        Organization providerOrg = organizationService.getOrganizationEntityById(req.getDataPrincipalOrganizationId());
        Organization requesterOrg = organizationService.getOrganizationEntityById(req.getRequesterOrganizationId());
        return new ConsentRequestResponse(
                req,
                providerOrg.getOrganizationCode(),
                providerOrg.getName(),
                requesterOrg.getOrganizationCode(),
                requesterOrg.getName());
    }
}
