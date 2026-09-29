package com.depa.consent.controller;

import com.depa.consent.dto.CreateAdminRequest;
import com.depa.consent.dto.UserResponse;
import com.depa.consent.security.UserPrincipal;
import com.depa.consent.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/super-admin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperAdminController {

    private final UserService userService;

    public SuperAdminController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/admins")
    public ResponseEntity<UserResponse> createAdmin(
            @Valid @RequestBody CreateAdminRequest request,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        UserResponse response = userService.createAdmin(request, actor);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/admins")
    public ResponseEntity<List<UserResponse>> getAllAdmins() {
        return ResponseEntity.ok(userService.getAllAdmins());
    }

    @PatchMapping("/admins/{adminId}/suspend")
    public ResponseEntity<UserResponse> suspendAdmin(
            @PathVariable("adminId") String adminId,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(userService.suspendAdmin(adminId, actor));
    }

    @PatchMapping("/admins/{adminId}/activate")
    public ResponseEntity<UserResponse> activateAdmin(
            @PathVariable("adminId") String adminId,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(userService.activateAdmin(adminId, actor));
    }
}
