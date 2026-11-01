package com.depa.consent.controller;

import com.depa.consent.dto.CreateUserRequest;
import com.depa.consent.dto.ImportOnboardingRequest;
import com.depa.consent.dto.ImportOnboardingResponse;
import com.depa.consent.dto.OrganizationResponse;
import com.depa.consent.dto.ResetPasswordRequest;
import com.depa.consent.dto.UserResponse;
import com.depa.consent.exception.ForbiddenOperationException;
import com.depa.consent.security.UserPrincipal;
import com.depa.consent.service.OnboardingService;
import com.depa.consent.service.OrganizationService;
import com.depa.consent.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/org-admin")
@PreAuthorize("hasRole('ORG_ADMIN')")
public class OrgAdminController {

    private final UserService userService;
    private final OnboardingService onboardingService;
    private final OrganizationService organizationService;

    public OrgAdminController(UserService userService, OnboardingService onboardingService, OrganizationService organizationService) {
        this.userService = userService;
        this.onboardingService = onboardingService;
        this.organizationService = organizationService;
    }

    /**
     * Retrieve authenticated organization's own institutional profile.
     * Organization boundary is derived strictly from the authenticated principal.
     */
    @GetMapping({"/organization", "/profile"})
    public ResponseEntity<OrganizationResponse> getOwnOrganization(
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        if (actor == null || actor.getOrganizationId() == null || actor.getOrganizationId().isBlank()) {
            throw new ForbiddenOperationException("Access Denied: Authenticated user has no organization scope");
        }
        return ResponseEntity.ok(organizationService.getOrganizationById(actor.getOrganizationId()));
    }

    /**
     * Import eligible students into Consent Manager using ORG_ADMIN's CM JWT.
     * Organization boundary is derived strictly from the authenticated principal.
     */
    @PostMapping({"/onboarding/import", "/onboarding/start"})
    public ResponseEntity<ImportOnboardingResponse> importStudents(
            @Valid @RequestBody ImportOnboardingRequest request,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        ImportOnboardingResponse response = onboardingService.importStudents(request, actor);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/users")
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        UserResponse response = userService.createUserInOrg(request, actor);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> getUsersInOwnOrganization(
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(userService.getUsersForOrg(actor.getOrganizationId(), actor));
    }

    @PatchMapping("/users/{userId}/suspend")
    public ResponseEntity<UserResponse> suspendUser(
            @PathVariable("userId") String userId,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(userService.suspendUser(userId, actor));
    }

    @PatchMapping("/users/{userId}/activate")
    public ResponseEntity<UserResponse> activateUser(
            @PathVariable("userId") String userId,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(userService.activateUser(userId, actor));
    }

    @PatchMapping("/users/{userId}/reset-password")
    public ResponseEntity<UserResponse> forceResetPassword(
            @PathVariable("userId") String userId,
            @Valid @RequestBody ResetPasswordRequest request,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(userService.forceResetUserPassword(userId, request.getNewPassword(), actor));
    }
}
