package com.depa.provider.controller;

import com.depa.provider.dto.*;
import com.depa.provider.service.CollegeAAuthService;
import com.depa.provider.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class CollegeAAuthController {

    private final CollegeAAuthService authService;
    private final StudentService studentService;

    public CollegeAAuthController(CollegeAAuthService authService, StudentService studentService) {
        this.authService = authService;
        this.studentService = studentService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/activation/validate")
    public ResponseEntity<ActivationValidationResponse> validateActivationToken(@Valid @RequestBody TokenValidationRequest request) {
        ActivationValidationResponse response = studentService.validateActivationToken(request.getToken());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/activation/setup-password")
    public ResponseEntity<PasswordSetupResponse> setupPassword(@Valid @RequestBody PasswordSetupRequest request) {
        PasswordSetupResponse response = studentService.completePasswordSetup(request);
        return ResponseEntity.ok(response);
    }
}
