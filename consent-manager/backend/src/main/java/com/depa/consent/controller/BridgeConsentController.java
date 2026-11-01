package com.depa.consent.controller;

import com.depa.consent.dto.*;
import com.depa.consent.entity.Organization;
import com.depa.consent.entity.OrganizationStatus;
import com.depa.consent.exception.AuthenticationFailedException;
import com.depa.consent.exception.ForbiddenOperationException;
import com.depa.consent.repository.OrganizationRepository;
import com.depa.consent.security.StudentAssertionValidator;
import com.depa.consent.service.ConsentService;
import com.depa.consent.service.DataRequestService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/bridge")
public class BridgeConsentController {

    private final StudentAssertionValidator assertionValidator;
    private final ConsentService consentService;
    private final DataRequestService dataRequestService;
    private final OrganizationRepository organizationRepository;

    public BridgeConsentController(StudentAssertionValidator assertionValidator,
                                   ConsentService consentService,
                                   DataRequestService dataRequestService,
                                   OrganizationRepository organizationRepository) {
        this.assertionValidator = assertionValidator;
        this.consentService = consentService;
        this.dataRequestService = dataRequestService;
        this.organizationRepository = organizationRepository;
    }

    /**
     * Authenticated backend-to-backend endpoint for consumer colleges (College B) to initiate data requests.
     * Authenticated strictly via pre-registered organization credentials (X-API-KEY).
     */
    @PostMapping("/data-requests")
    public ResponseEntity<DataRequestResponse> createBridgeDataRequest(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody BridgeDataRequest request
    ) {
        Organization consumerOrg = authenticateOrganization(apiKey, authHeader);
        DataRequestResponse response = dataRequestService.bridgeCreateDataRequest(request, consumerOrg);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Authenticated consumer endpoint to retrieve the resulting Access Grant and RS256 token.
     * Only the requesting consumer organization can retrieve this token.
     */
    @GetMapping("/consumer/data-requests/{id}/grant")
    public ResponseEntity<ConsumerGrantTokenResponse> getConsumerGrant(
            @PathVariable("id") String dataRequestId,
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        Organization consumerOrg = authenticateOrganization(apiKey, authHeader);
        ConsumerGrantTokenResponse response = dataRequestService.getConsumerGrantForDataRequest(dataRequestId, consumerOrg);
        return ResponseEntity.ok(response);
    }

    /**
     * Authenticated consumer endpoint to retrieve all data requests submitted by this consumer organization.
     */
    @GetMapping("/consumer/data-requests")
    public ResponseEntity<java.util.List<DataRequestResponse>> getConsumerDataRequests(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        Organization consumerOrg = authenticateOrganization(apiKey, authHeader);
        java.util.List<DataRequestResponse> responses = dataRequestService.getOutgoingDataRequestsForOrganization(consumerOrg.getOrganizationId());
        return ResponseEntity.ok(responses);
    }

    /**
     * Provider college retrieves pending consent requests for an authenticated student using their assertion.
     */
    @GetMapping("/consents/pending")
    public ResponseEntity<Page<ConsentRequestResponse>> getPendingConsentRequests(
            @RequestHeader("X-Student-Assertion") String assertionToken,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        StudentAssertionValidator.VerifiedStudentAssertion assertion =
                assertionValidator.validate(assertionToken, "READ_PENDING", null);

        Page<ConsentRequestResponse> response =
                consentService.getPendingConsentRequestsForStudent(assertion.getStudentId(), assertion.getOrganizationId(), pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Provider college retrieves historical consents for an authenticated student using their assertion.
     */
    @GetMapping("/consents/history")
    public ResponseEntity<Page<ConsentResponse>> getConsentHistory(
            @RequestHeader("X-Student-Assertion") String assertionToken,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        StudentAssertionValidator.VerifiedStudentAssertion assertion =
                assertionValidator.validate(assertionToken, "READ_HISTORY", null);

        Page<ConsentResponse> response =
                consentService.getConsentsForStudent(assertion.getStudentId(), assertion.getOrganizationId(), pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Provider college submits student approval with field-level selection.
     * Returns ONLY approval confirmation; the Access JWT is NEVER returned here!
     */
    @PostMapping("/consents/{id}/approve")
    public ResponseEntity<BridgeApproveResponse> approveConsent(
            @PathVariable("id") String consentRequestId,
            @RequestHeader("X-Student-Assertion") String assertionToken,
            @RequestBody(required = false) BridgeApproveConsentRequest request
    ) {
        StudentAssertionValidator.VerifiedStudentAssertion assertion =
                assertionValidator.validate(assertionToken, "APPROVE", consentRequestId);

        BridgeApproveResponse response = consentService.bridgeApproveConsent(
                consentRequestId,
                request != null ? request.getApprovedFields() : null,
                assertion.getStudentId(),
                assertion.getOrganizationId()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Provider college submits student rejection.
     * Transitions status to REJECTED and guarantees no AccessGrant is created.
     */
    @PostMapping("/consents/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectConsent(
            @PathVariable("id") String consentRequestId,
            @RequestHeader("X-Student-Assertion") String assertionToken
    ) {
        StudentAssertionValidator.VerifiedStudentAssertion assertion =
                assertionValidator.validate(assertionToken, "REJECT", consentRequestId);

        consentService.bridgeRejectConsent(consentRequestId, assertion.getStudentId(), assertion.getOrganizationId());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Consent request rejected successfully"
        ));
    }

    /**
     * Provider college submits student consent revocation.
     * Marks consent and all linked access grants as REVOKED.
     */
    @PostMapping("/consents/{id}/revoke")
    public ResponseEntity<Map<String, Object>> revokeConsent(
            @PathVariable("id") String consentId,
            @RequestHeader("X-Student-Assertion") String assertionToken
    ) {
        StudentAssertionValidator.VerifiedStudentAssertion assertion =
                assertionValidator.validate(assertionToken, "REVOKE", consentId);

        consentService.bridgeRevokeConsent(consentId, assertion.getStudentId(), assertion.getOrganizationId());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Consent revoked successfully. Associated access grants are now invalid."
        ));
    }

    /**
     * Key rotation endpoint: Allows authenticated college to register or rotate its assertion public key.
     * Retains previous public key and key ID to support in-flight unexpired tokens during rotation overlap.
     */
    @PostMapping("/organizations/public-key")
    public ResponseEntity<Map<String, Object>> registerPublicKey(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, String> payload
    ) {
        Organization org = authenticateOrganization(apiKey, authHeader);
        String publicKeyPem = payload.get("publicKey");
        if (publicKeyPem == null || publicKeyPem.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "publicKey PEM is required"));
        }

        String keyId = payload.get("keyId");
        String trimmedNewKey = publicKeyPem.trim();
        String currentKey = org.getPublicKey();

        // Safe overlap support: archive previous key when rotating to a new key
        if (currentKey != null && !currentKey.isBlank() && !currentKey.equals(trimmedNewKey)) {
            org.setPreviousPublicKey(currentKey);
            org.setPreviousKeyId(org.getKeyId());
            long overlapSec = payload.containsKey("overlapSeconds")
                    ? Long.parseLong(payload.get("overlapSeconds"))
                    : 300L; // Default 5 minutes overlap window (5x the 60-second student assertion TTL)
            org.setPreviousKeyExpiresAt(java.time.Instant.now().plusSeconds(overlapSec));
        }

        org.setPublicKey(trimmedNewKey);
        if (keyId != null && !keyId.isBlank()) {
            org.setKeyId(keyId.trim());
        }
        organizationRepository.save(org);
        assertionValidator.registerPublicKey(org.getOrganizationId(), trimmedNewKey);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Public key updated successfully for organization: " + org.getOrganizationCode(),
                "keyId", org.getKeyId() != null ? org.getKeyId() : "N/A"
        ));
    }

    private Organization authenticateOrganization(String apiKey, String authHeader) {
        String credential = null;
        if (apiKey != null && !apiKey.isBlank()) {
            credential = apiKey.trim();
        } else if (authHeader != null && authHeader.startsWith("Bearer ")) {
            credential = authHeader.substring(7).trim();
        }

        if (credential == null || credential.isBlank()) {
            throw new AuthenticationFailedException("Missing backend service credentials (X-API-KEY or Bearer token)");
        }

        Organization org = organizationRepository.findByCredentials(credential)
                .orElseThrow(() -> new AuthenticationFailedException("Invalid service credentials"));

        if (org.getStatus() != OrganizationStatus.ACTIVE) {
            throw new ForbiddenOperationException("Organization is not active: " + org.getOrganizationCode());
        }

        return org;
    }
}

