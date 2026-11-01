package com.depa.consent.controller;

import com.depa.consent.dto.BulkOnboardRequest;
import com.depa.consent.dto.BulkOnboardingResponse;
import com.depa.consent.service.OnboardingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/onboarding")
public class OnboardingController {

    private final OnboardingService onboardingService;

    public OnboardingController(OnboardingService onboardingService) {
        this.onboardingService = onboardingService;
    }

    @PostMapping("/bulk")
    public ResponseEntity<BulkOnboardingResponse> bulkOnboard(@Valid @RequestBody BulkOnboardRequest request) {
        BulkOnboardingResponse response = onboardingService.bulkOnboard(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/student-direct")
    public ResponseEntity<?> directOnboard(@RequestBody java.util.Map<String, String> payload) {
        String orgCode = payload.get("organizationCode");
        String studentId = payload.get("studentId");
        String name = payload.get("name");
        String email = payload.get("email");
        String password = payload.get("password");

        if (orgCode == null || studentId == null || email == null) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "organizationCode, studentId, and email are required"));
        }

        com.depa.consent.entity.User user = onboardingService.directOnboardStudent(orgCode, studentId, name, email, password);
        return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "userId", user.getUserId(),
                "email", user.getEmail(),
                "studentId", user.getExternalIdentityId(),
                "role", user.getRole().name()
        ));
    }
}
