package com.depa.consent.controller;

import com.depa.consent.dto.*;
import com.depa.consent.service.RegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/registration")
public class RegistrationController {

    private final RegistrationService registrationService;

    public RegistrationController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @PostMapping("/invitation/validate")
    public ResponseEntity<InvitationValidationResponse> validateInvitationPost(@Valid @RequestBody TokenValidationRequest request) {
        InvitationValidationResponse response = registrationService.validateInvitation(request.getToken());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/invitation/{token}")
    public ResponseEntity<InvitationValidationResponse> validateInvitation(@PathVariable("token") String token) {
        InvitationValidationResponse response = registrationService.validateInvitation(token);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/complete")
    public ResponseEntity<RegistrationInitiatedResponse> completeRegistration(@Valid @RequestBody CompleteRegistrationRequest request) {
        RegistrationInitiatedResponse response = registrationService.completeRegistration(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<OtpVerificationResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        OtpVerificationResponse response = registrationService.verifyOtp(request);
        return ResponseEntity.ok(response);
    }
}
