package com.depa.consent.controller;

import com.depa.consent.dto.*;
import com.depa.consent.entity.UserRole;
import com.depa.consent.security.UserPrincipal;
import com.depa.consent.service.ConsentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

@RestController
@RequestMapping("/api/consents")
@PreAuthorize("isAuthenticated()")
public class ConsentController {

    private final ConsentService consentService;
    private final com.depa.consent.service.OrganizationService organizationService;

    public ConsentController(ConsentService consentService, com.depa.consent.service.OrganizationService organizationService) {
        this.consentService = consentService;
        this.organizationService = organizationService;
    }

    /**
     * Public metadata endpoint to get supported canonical academic fields.
     */
    @GetMapping("/fields")
    @PreAuthorize("permitAll()")
    public ResponseEntity<List<Map<String, String>>> getSupportedFields() {
        List<Map<String, String>> fields = List.of(
                Map.of("field", "CGPA", "label", "Cumulative GPA (CGPA)", "description", "Official overall academic performance score"),
                Map.of("field", "TRANSCRIPT", "label", "Academic Transcript", "description", "Course-by-course breakdown and semester grades"),
                Map.of("field", "DEGREE_CERTIFICATE", "label", "Degree Certificate", "description", "Graduation and credential award confirmation"),
                Map.of("field", "ATTENDANCE", "label", "Attendance Record", "description", "Institutional attendance percentage record"),
                Map.of("field", "CONDUCT_CERTIFICATE", "label", "Conduct Certificate", "description", "Character and disciplinary clearance certificate"),
                Map.of("field", "ENROLLMENT_STATUS", "label", "Enrollment Status", "description", "Current academic standing and active registration")
        );
        return ResponseEntity.ok(fields);
    }

    /**
     * Endpoint to list active colleges/organizations for consumer and student use.
     * Exposes strictly public trust metadata via PublicOrganizationResponse.
     */
    @GetMapping("/organizations")
    @PreAuthorize("permitAll()")
    public ResponseEntity<List<com.depa.consent.dto.PublicOrganizationResponse>> getActiveOrganizations() {
        return ResponseEntity.ok(organizationService.getPublicOrganizations());
    }

    /**
     * Data Principal views their pending consent requests.
     */
    @GetMapping("/pending")
    public ResponseEntity<Page<ConsentRequestResponse>> getPendingConsentRequests(
            @AuthenticationPrincipal UserPrincipal actor,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(consentService.getPendingConsentRequestsForPrincipal(actor, pageable));
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
    public ResponseEntity<Page<ConsentResponse>> getConsents(
            @AuthenticationPrincipal UserPrincipal actor,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(consentService.getConsentsForPrincipal(actor, pageable));
    }

    /**
     * College Admin views all consents associated with students of their college.
     */
    @GetMapping("/organization")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<ConsentResponse>> getOrganizationConsents(
            @AuthenticationPrincipal UserPrincipal actor,
            @RequestParam(name = "organizationId", required = false) String organizationId
    ) {
        if (actor != null && actor.getRole() == UserRole.ORG_ADMIN) {
            String orgId = actor.getOrganizationId();
            if (orgId == null || orgId.isBlank()) {
                throw new com.depa.consent.exception.ForbiddenOperationException("Access Denied: Authenticated organization admin has no organization boundary");
            }
            return ResponseEntity.ok(consentService.getConsentsForOrganization(orgId));
        }
        return ResponseEntity.ok(consentService.getConsentsForOrganization(organizationId));
    }
}
