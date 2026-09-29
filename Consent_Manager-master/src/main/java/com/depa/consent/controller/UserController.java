package com.depa.consent.controller;

import com.depa.consent.dto.UserResponse;
import com.depa.consent.security.UserPrincipal;
import com.depa.consent.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
@PreAuthorize("hasAnyRole('USER', 'ORG_ADMIN', 'ADMIN', 'SUPER_ADMIN')")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserResponse> getProfile(@AuthenticationPrincipal UserPrincipal actor) {
        return ResponseEntity.ok(userService.getUserProfile(actor));
    }
}
