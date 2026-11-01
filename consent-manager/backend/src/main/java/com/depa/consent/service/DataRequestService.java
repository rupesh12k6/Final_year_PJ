package com.depa.consent.service;

import com.depa.consent.dto.BridgeDataRequest;
import com.depa.consent.dto.ConsumerGrantTokenResponse;
import com.depa.consent.dto.CreateDataRequest;
import com.depa.consent.dto.DataRequestResponse;
import com.depa.consent.entity.*;
import com.depa.consent.exception.ForbiddenOperationException;
import com.depa.consent.exception.InvalidLifecycleTransitionException;
import com.depa.consent.exception.ResourceNotFoundException;
import com.depa.consent.repository.AccessGrantRepository;
import com.depa.consent.repository.ConsentRepository;
import com.depa.consent.repository.ConsentRequestRepository;
import com.depa.consent.repository.DataRequestRepository;
import com.depa.consent.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Service
@Transactional
public class DataRequestService {

    private final DataRequestRepository dataRequestRepository;
    private final OrganizationService organizationService;
    private final ConsentService consentService;
    private final AuditService auditService;
    private final ConsentRequestRepository consentRequestRepository;
    private final ConsentRepository consentRepository;
    private final AccessGrantRepository accessGrantRepository;

    public DataRequestService(DataRequestRepository dataRequestRepository,
            OrganizationService organizationService,
            ConsentService consentService,
            AuditService auditService,
            ConsentRequestRepository consentRequestRepository,
            ConsentRepository consentRepository,
            AccessGrantRepository accessGrantRepository) {
        this.dataRequestRepository = dataRequestRepository;
        this.organizationService = organizationService;
        this.consentService = consentService;
        this.auditService = auditService;
        this.consentRequestRepository = consentRequestRepository;
        this.consentRepository = consentRepository;
        this.accessGrantRepository = accessGrantRepository;
    }

    public DataRequestResponse createDataRequest(CreateDataRequest request, UserPrincipal actor) {
        if (actor == null || actor.getOrganizationId() == null || actor.getOrganizationId().isBlank()) {
            throw new ForbiddenOperationException("Access Denied: Authenticated user has no organization scope");
        }

        // 1. Resolve & Validate Requester Organization from CM JWT (never trusted from
        // request body)
        Organization requesterOrg = organizationService.getOrganizationEntityById(actor.getOrganizationId());
        if (requesterOrg.getStatus() != OrganizationStatus.ACTIVE) {
            throw new InvalidLifecycleTransitionException(
                    "Requester organization '" + requesterOrg.getOrganizationCode() + "' is " +
                            requesterOrg.getStatus() + ". Only ACTIVE organizations can initiate data requests.");
        }

        // 2. Resolve & Validate Provider Organization (by ID or Code)
        Organization providerOrg = organizationService
                .getOrganizationEntityByIdOrCode(request.getProviderOrganizationId());

        if (providerOrg.getStatus() != OrganizationStatus.ACTIVE) {
            throw new InvalidLifecycleTransitionException(
                    "Provider organization '" + providerOrg.getOrganizationCode() + "' is " +
                            providerOrg.getStatus() + ". Data cannot be requested from inactive organizations.");
        }

        if (requesterOrg.getOrganizationId().equals(providerOrg.getOrganizationId())) {
            throw new IllegalArgumentException(
                    "Requester organization and provider organization cannot be the same entity.");
        }

        String dataPrincipalId = request.getDataPrincipalId().trim().toUpperCase();
        String requestId = "DREQ_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Instant expiresAt = Instant.now().plus(7, ChronoUnit.DAYS);

        DataRequest dataRequest = new DataRequest(
                requestId,
                requesterOrg.getOrganizationId(),
                actor.getUserId(),
                providerOrg.getOrganizationId(),
                dataPrincipalId,
                request.getPurpose().trim(),
                request.getRequestedFields(),
                DataRequestStatus.PENDING,
                expiresAt);

        DataRequest saved = dataRequestRepository.save(dataRequest);

        // 3. Automatically generate ConsentRequest for Data Principal
        consentService.createConsentRequest(saved);

        auditService.logEvent(
                AuditEventType.DATA_REQUEST_CREATED,
                actor.getUserId(),
                actor.getRole().name(),
                "DATA_REQUEST",
                saved.getId(),
                requesterOrg.getOrganizationId(),
                String.format("Data request created: Principal=%s, Provider=%s, Requester=%s, Fields=%s",
                        dataPrincipalId, providerOrg.getOrganizationCode(), requesterOrg.getOrganizationCode(),
                        request.getRequestedFields()));

        return new DataRequestResponse(saved, requesterOrg.getOrganizationCode(), providerOrg.getOrganizationCode());
    }

    @Transactional(readOnly = true)
    public DataRequestResponse getDataRequestById(String id, UserPrincipal actor) {
        DataRequest request = dataRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Data request not found with ID: " + id));

        // Enforce boundary: Super admin / Admin or users from requester / provider orgs
        // can view
        if (actor.getRole() != UserRole.SUPER_ADMIN && actor.getRole() != UserRole.ADMIN) {
            if (!actor.getOrganizationId().equals(request.getRequesterOrganizationId()) &&
                    !actor.getOrganizationId().equals(request.getProviderOrganizationId())) {
                throw new ForbiddenOperationException(
                        "Access Denied: You do not have permission to view this data request");
            }
        }

        Organization requesterOrg = organizationService.getOrganizationEntityById(request.getRequesterOrganizationId());
        Organization providerOrg = organizationService.getOrganizationEntityById(request.getProviderOrganizationId());

        return new DataRequestResponse(request, requesterOrg.getOrganizationCode(), providerOrg.getOrganizationCode());
    }

    @Transactional(readOnly = true)
    public Page<DataRequestResponse> getOutgoingDataRequests(UserPrincipal actor, Pageable pageable) {
        if (actor == null || actor.getOrganizationId() == null) {
            throw new ForbiddenOperationException("Access Denied: No organization scope");
        }

        Organization requesterOrg = organizationService.getOrganizationEntityById(actor.getOrganizationId());
        Page<DataRequest> requests = dataRequestRepository.findByRequesterOrganizationId(actor.getOrganizationId(),
                pageable);

        if (requests.isEmpty()) {
            return Page.empty(pageable);
        }

        Set<String> providerOrgIds = new HashSet<>();
        requests.forEach(req -> providerOrgIds.add(req.getProviderOrganizationId()));

        Map<String, Organization> orgMap = organizationService.getOrganizationsMapByIds(providerOrgIds);

        return requests.map(req -> {
            Organization prov = orgMap.get(req.getProviderOrganizationId());
            return new DataRequestResponse(req, requesterOrg.getOrganizationCode(),
                    prov != null ? prov.getOrganizationCode() : "UNKNOWN");
        });
    }

    public DataRequestResponse bridgeCreateDataRequest(BridgeDataRequest request, Organization callerOrg) {
        if (callerOrg == null || callerOrg.getStatus() != OrganizationStatus.ACTIVE) {
            throw new ForbiddenOperationException("Access Denied: Inactive or unauthenticated consumer organization");
        }

        Organization providerOrg = organizationService
                .getOrganizationEntityByIdOrCode(request.getProviderOrganizationId());
        if (providerOrg.getStatus() != OrganizationStatus.ACTIVE) {
            throw new InvalidLifecycleTransitionException(
                    "Provider organization '" + providerOrg.getOrganizationCode() + "' is " +
                            providerOrg.getStatus() + ". Data cannot be requested from inactive organizations.");
        }

        if (callerOrg.getOrganizationId().equals(providerOrg.getOrganizationId())) {
            throw new IllegalArgumentException(
                    "Requester organization and provider organization cannot be the same entity.");
        }

        String dataPrincipalId = request.getDataPrincipalId().trim().toUpperCase();
        String requestId = "DREQ_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Instant expiresAt = Instant.now().plus(7, ChronoUnit.DAYS);

        String initiator = (request.getInitiatorUserId() != null && !request.getInitiatorUserId().isBlank())
                ? request.getInitiatorUserId().trim()
                : callerOrg.getOrganizationCode() + "_SERVICE";

        DataRequest dataRequest = new DataRequest(
                requestId,
                callerOrg.getOrganizationId(),
                initiator,
                providerOrg.getOrganizationId(),
                dataPrincipalId,
                request.getPurpose().trim(),
                request.getRequestedFields(),
                DataRequestStatus.PENDING,
                expiresAt);

        DataRequest saved = dataRequestRepository.save(dataRequest);

        // Automatically generate ConsentRequest for Data Principal
        consentService.createConsentRequest(saved);

        auditService.logEvent(
                AuditEventType.DATA_REQUEST_CREATED,
                initiator,
                "CONSUMER_SERVICE",
                "DATA_REQUEST",
                saved.getId(),
                callerOrg.getOrganizationId(),
                String.format("Bridge data request created: Principal=%s, Provider=%s, Requester=%s, Fields=%s",
                        dataPrincipalId, providerOrg.getOrganizationCode(), callerOrg.getOrganizationCode(),
                        request.getRequestedFields()));

        return new DataRequestResponse(saved, callerOrg.getOrganizationCode(), providerOrg.getOrganizationCode());
    }

    @Transactional(readOnly = true)
    public ConsumerGrantTokenResponse getConsumerGrantForDataRequest(String dataRequestId, Organization callerOrg) {
        DataRequest request = dataRequestRepository.findById(dataRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Data request not found with ID: " + dataRequestId));

        // Strict organization boundary: only the initiating consumer organization can
        // retrieve the grant/token!
        if (!callerOrg.getOrganizationId().equals(request.getRequesterOrganizationId())) {
            auditService.logEvent(
                    AuditEventType.CONSENT_AUTHORIZATION_FAILED,
                    callerOrg.getOrganizationCode(),
                    "CONSUMER_SERVICE",
                    "DATA_REQUEST",
                    dataRequestId,
                    callerOrg.getOrganizationId(),
                    "Attempt to retrieve access grant belonging to another organization");
            throw new ForbiddenOperationException(
                    "Access Denied: You cannot retrieve grants belonging to another organization");
        }

        if (request.getStatus() == DataRequestStatus.PENDING) {
            return ConsumerGrantTokenResponse.pending(request.getId(), "PENDING",
                    "Consent request is still pending student decision");
        }

        if (request.getStatus() == DataRequestStatus.REJECTED) {
            return ConsumerGrantTokenResponse.pending(request.getId(), "REJECTED",
                    "Consent request was rejected by student");
        }

        // Must be APPROVED
        ConsentRequest consentRequest = consentRequestRepository.findByDataRequestId(request.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Consent request not found for data request: " + dataRequestId));

        Consent consent = consentRepository.findByConsentRequestId(consentRequest.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Consent not found for consent request: " + consentRequest.getId()));

        List<AccessGrant> grants = accessGrantRepository.findByConsentId(consent.getId());
        if (grants.isEmpty()) {
            throw new ResourceNotFoundException("Access grant not found for consent: " + consent.getId());
        }

        AccessGrant grant = grants.get(0);
        Organization providerOrg = organizationService.getOrganizationEntityById(request.getProviderOrganizationId());

        ConsumerGrantTokenResponse tokenResponse = ConsumerGrantTokenResponse.active(
                grant.getId(),
                consent.getId(),
                request.getId(),
                grant.getStatus().name(),
                providerOrg.getOrganizationCode(),
                grant.getAccessToken(),
                grant.getApprovedFields(),
                grant.getExpiresAt());
        tokenResponse.setProviderEndpointUrl(providerOrg.getDataBaseUrl());
        return tokenResponse;
    }

    @Transactional(readOnly = true)
    public DataRequest getEntityById(String id) {
        return dataRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Data request not found with ID: " + id));
    }

    @Transactional(readOnly = true)
    public List<DataRequestResponse> getOutgoingDataRequestsForOrganization(String organizationId) {
        Organization requesterOrg = organizationService.getOrganizationEntityById(organizationId);
        List<DataRequest> requests = dataRequestRepository.findByRequesterOrganizationIdOrderByRequestedAtDesc(organizationId);
        if (requests.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        Set<String> providerOrgIds = requests.stream()
                .map(DataRequest::getProviderOrganizationId)
                .collect(Collectors.toSet());

        Map<String, Organization> orgMap = organizationService.getOrganizationsMapByIds(providerOrgIds);

        return requests.stream().map(req -> {
            Organization prov = orgMap.get(req.getProviderOrganizationId());
            return new DataRequestResponse(req, requesterOrg.getOrganizationCode(),
                    prov != null ? prov.getOrganizationCode() : "UNKNOWN");
        }).collect(Collectors.toList());
    }
}
