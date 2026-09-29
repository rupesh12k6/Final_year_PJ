package com.depa.provider.controller;

import com.depa.provider.dto.AuthResponse;
import com.depa.provider.dto.LoginRequest;
import com.depa.provider.service.CollegeAAuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class CollegeAAuthController {

    private final CollegeAAuthService authService;

    public CollegeAAuthController(CollegeAAuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }
}
