package com.depa.consent.controller;

import com.depa.consent.dto.*;
import com.depa.consent.security.UserPrincipal;
import com.depa.consent.service.ConsentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/consents")
@PreAuthorize("isAuthenticated()")
public class ConsentController {

    private final ConsentService consentService;

    public ConsentController(ConsentService consentService) {
        this.consentService = consentService;
    }

    /**
     * Data Principal views their pending consent requests.
     */
    @GetMapping("/pending")
    public ResponseEntity<List<ConsentRequestResponse>> getPendingConsentRequests(
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(consentService.getPendingConsentRequestsForPrincipal(actor));
    }

    @GetMapping("/requests/{id}")
    public ResponseEntity<ConsentRequestResponse> getConsentRequestById(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(consentService.getConsentRequestById(id, actor));
    }

    /**
     * Data Principal approves a pending consent request.
     * Generates ACTIVE Consent, ACTIVE Access Grant, and RS256 Data Access JWT.
     */
    @PostMapping("/{id}/approve")
    public ResponseEntity<AccessGrantResponse> approveConsent(
            @PathVariable("id") String id,
            @RequestBody(required = false) ApproveConsentRequest request,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        AccessGrantResponse response = consentService.approveConsent(id, request, actor);
        return ResponseEntity.ok(response);
    }

    /**
     * Data Principal rejects a pending consent request.
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectConsent(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        consentService.rejectConsent(id, actor);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Consent request rejected successfully"
        ));
    }

    /**
     * Data Principal revokes an active consent.
     */
    @PostMapping("/{id}/revoke")
    public ResponseEntity<Map<String, Object>> revokeConsent(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        consentService.revokeConsent(id, actor);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Consent revoked successfully. Associated access grants are now invalid."
        ));
    }

    /**
     * Data Principal views their active/past consents.
     */
    @GetMapping
    public ResponseEntity<List<ConsentResponse>> getConsents(
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(consentService.getConsentsForPrincipal(actor));
    }
}
