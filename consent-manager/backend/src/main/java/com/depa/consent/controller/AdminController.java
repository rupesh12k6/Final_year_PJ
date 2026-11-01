package com.depa.consent.controller;

import com.depa.consent.dto.CreateOrgAdminRequest;
import com.depa.consent.dto.CreateOrganizationRequest;
import com.depa.consent.dto.OrganizationResponse;
import com.depa.consent.dto.UserResponse;
import com.depa.consent.security.UserPrincipal;
import com.depa.consent.service.OrganizationService;
import com.depa.consent.service.UserService;
import com.depa.consent.entity.ConsentStatus;
import com.depa.consent.entity.DataRequestStatus;
import com.depa.consent.entity.OrganizationStatus;
import com.depa.consent.repository.ConsentRepository;
import com.depa.consent.repository.DataRequestRepository;
import com.depa.consent.repository.OrganizationRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminController {

    private final OrganizationService organizationService;
    private final UserService userService;
    private final OrganizationRepository organizationRepository;
    private final ConsentRepository consentRepository;
    private final DataRequestRepository dataRequestRepository;

    public AdminController(OrganizationService organizationService,
                           UserService userService,
                           OrganizationRepository organizationRepository,
                           ConsentRepository consentRepository,
                           DataRequestRepository dataRequestRepository) {
        this.organizationService = organizationService;
        this.userService = userService;
        this.organizationRepository = organizationRepository;
        this.consentRepository = consentRepository;
        this.dataRequestRepository = dataRequestRepository;
    }

    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getSystemMetrics() {
        long totalOrganizations = organizationRepository.count();
        long activeOrganizations = organizationRepository.countByStatus(OrganizationStatus.ACTIVE);
        long totalConsents = consentRepository.count();
        long activeConsents = consentRepository.countByStatus(ConsentStatus.ACTIVE);
        long revokedConsents = consentRepository.countByStatus(ConsentStatus.REVOKED);
        long totalDataRequests = dataRequestRepository.count();
        long pendingDataRequests = dataRequestRepository.countByStatus(DataRequestStatus.PENDING);
        long approvedDataRequests = dataRequestRepository.countByStatus(DataRequestStatus.APPROVED);

        return ResponseEntity.ok(Map.of(
                "totalOrganizations", totalOrganizations,
                "activeOrganizations", activeOrganizations,
                "totalConsents", totalConsents,
                "activeConsents", activeConsents,
                "revokedConsents", revokedConsents,
                "totalDataRequests", totalDataRequests,
                "pendingDataRequests", pendingDataRequests,
                "approvedDataRequests", approvedDataRequests
        ));
    }

    @PostMapping("/organizations")
    public ResponseEntity<OrganizationResponse> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        OrganizationResponse response = organizationService.createOrganization(request, actor);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/organizations")
    public ResponseEntity<List<OrganizationResponse>> getAllOrganizations() {
        return ResponseEntity.ok(organizationService.getAllOrganizations());
    }

    @GetMapping("/organizations/{id}")
    public ResponseEntity<OrganizationResponse> getOrganizationById(@PathVariable("id") String id) {
        return ResponseEntity.ok(organizationService.getOrganizationById(id));
    }

    @PatchMapping("/organizations/{id}/activate")
    public ResponseEntity<OrganizationResponse> activateOrganization(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(organizationService.activateOrganization(id, actor));
    }

    @PatchMapping("/organizations/{id}/suspend")
    public ResponseEntity<OrganizationResponse> suspendOrganization(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(organizationService.suspendOrganization(id, actor));
    }

    @PostMapping("/organizations/{id}/org-admin")
    public ResponseEntity<UserResponse> createOrgAdmin(
            @PathVariable("id") String id,
            @Valid @RequestBody CreateOrgAdminRequest request,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        UserResponse response = userService.createOrgAdmin(id, request, actor);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }
}
