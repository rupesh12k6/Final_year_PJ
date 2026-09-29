package com.depa.provider.controller;

import com.depa.provider.dto.OnboardResultResponse;
import com.depa.provider.dto.OnboardingStudentDTO;
import com.depa.provider.dto.StudentResponse;
import com.depa.provider.service.CollegeAOnboardingService;
import com.depa.provider.service.StudentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
public class CollegeAOnboardingController {

    private final CollegeAOnboardingService collegeAOnboardingService;
    private final StudentService studentService;

    public CollegeAOnboardingController(CollegeAOnboardingService collegeAOnboardingService, StudentService studentService) {
        this.collegeAOnboardingService = collegeAOnboardingService;
        this.studentService = studentService;
    }

    /**
     * Least-privilege endpoint for ORG_ADMIN to fetch eligible students for Consent Manager onboarding.
     * Requires College A JWT with role ORG_ADMIN and scope onboarding:read.
     * Returns ONLY studentId and trusted email (no marks, phone, address, etc.).
     */
    @GetMapping({"/api/provider/onboarding/eligible-students", "/api/onboarding/eligible-users"})
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<List<OnboardingStudentDTO>> getEligibleOnboardingStudents() {
        List<OnboardingStudentDTO> dtoList = studentService.getActiveStudents().stream()
                .map(s -> new OnboardingStudentDTO(s.getStudentId(), s.getEmail()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtoList);
    }

    @PostMapping("/api/students/onboard")
    public ResponseEntity<OnboardResultResponse> onboardStudents() {
        OnboardResultResponse response = collegeAOnboardingService.initiateBulkOnboarding();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/students")
    public ResponseEntity<List<StudentResponse>> getAllStudents() {
        return ResponseEntity.ok(studentService.getAllStudents());
    }
}
