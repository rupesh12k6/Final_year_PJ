package com.depa.provider.controller;

import com.depa.provider.dto.ApproveConsentRequest;
import com.depa.provider.dto.ConsentDecisionResponse;
import com.depa.provider.dto.ConsentHistoryDTO;
import com.depa.provider.dto.ConsentRequestDTO;
import com.depa.provider.security.CollegeAUserPrincipal;
import com.depa.provider.service.CollegeStudentConsentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student/consents")
@PreAuthorize("hasRole('STUDENT')")
public class CollegeStudentConsentController {

    private final CollegeStudentConsentService consentService;

    public CollegeStudentConsentController(CollegeStudentConsentService consentService) {
        this.consentService = consentService;
    }

    /**
     * Authenticated student retrieves their pending consent requests.
     */
    @GetMapping("/pending")
    public ResponseEntity<List<ConsentRequestDTO>> getPendingConsents(
            @AuthenticationPrincipal CollegeAUserPrincipal principal
    ) {
        return ResponseEntity.ok(consentService.getPendingConsents(principal));
    }

    /**
     * Authenticated student retrieves their past/active consent history.
     */
    @GetMapping("/history")
    public ResponseEntity<List<ConsentHistoryDTO>> getConsentHistory(
            @AuthenticationPrincipal CollegeAUserPrincipal principal
    ) {
        return ResponseEntity.ok(consentService.getConsentHistory(principal));
    }

    /**
     * Authenticated student approves a consent request with field-level selection.
     */
    @PostMapping("/{id}/approve")
    public ResponseEntity<ConsentDecisionResponse> approveConsent(
            @PathVariable("id") String consentRequestId,
            @RequestBody(required = false) ApproveConsentRequest request,
            @AuthenticationPrincipal CollegeAUserPrincipal principal
    ) {
        List<String> approvedFields = request != null ? request.getApprovedFields() : null;
        ConsentDecisionResponse response = consentService.approveConsent(consentRequestId, approvedFields, principal);
        return ResponseEntity.ok(response);
    }

    /**
     * Authenticated student rejects a consent request.
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectConsent(
            @PathVariable("id") String consentRequestId,
            @AuthenticationPrincipal CollegeAUserPrincipal principal
    ) {
        return ResponseEntity.ok(consentService.rejectConsent(consentRequestId, principal));
    }

    /**
     * Authenticated student revokes an active consent.
     */
    @PostMapping("/{id}/revoke")
    public ResponseEntity<Map<String, Object>> revokeConsent(
            @PathVariable("id") String consentId,
            @AuthenticationPrincipal CollegeAUserPrincipal principal
    ) {
        return ResponseEntity.ok(consentService.revokeConsent(consentId, principal));
    }
}

