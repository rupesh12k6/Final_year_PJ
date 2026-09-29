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
}
