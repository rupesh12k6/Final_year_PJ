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

    @PostMapping(value = "/api/students/import-csv", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<com.depa.provider.dto.CsvImportResultResponse> importStudentsCsv(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "portalBaseUrl", required = false) String portalBaseUrl) {
        com.depa.provider.dto.CsvImportResultResponse response = studentService.importStudentsFromCsv(file, portalBaseUrl);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/students/onboard")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<OnboardResultResponse> onboardStudents() {
        OnboardResultResponse response = collegeAOnboardingService.initiateBulkOnboarding();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/students")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<StudentResponse> addStudent(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.depa.provider.security.CollegeAUserPrincipal principal,
            @jakarta.validation.Valid @RequestBody com.depa.provider.dto.AddStudentRequest request) {
        StudentResponse response = studentService.addStudent(request, principal);
        return new ResponseEntity<>(response, org.springframework.http.HttpStatus.CREATED);
    }

    @PostMapping("/api/students/{studentId}/reissue-activation")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<StudentResponse> reissueActivation(
            @PathVariable("studentId") String studentId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.depa.provider.security.CollegeAUserPrincipal principal) {
        StudentResponse response = studentService.reissueActivationToken(studentId, principal);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/api/students/{studentId}/status")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<StudentResponse> updateStatus(
            @PathVariable("studentId") String studentId,
            @RequestBody java.util.Map<String, String> payload,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.depa.provider.security.CollegeAUserPrincipal principal) {
        String statusStr = payload != null ? payload.get("status") : null;
        if (statusStr == null || statusStr.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        com.depa.provider.entity.StudentStatus newStatus = com.depa.provider.entity.StudentStatus.valueOf(statusStr.trim().toUpperCase());
        StudentResponse response = studentService.updateStudentStatus(studentId, newStatus, principal);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/students")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<List<StudentResponse>> getAllStudents() {
        return ResponseEntity.ok(studentService.getAllStudents());
    }

    @GetMapping({"/api/students/{studentId}", "/api/students/{studentId}/dossier"})
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<StudentResponse> getStudentDossier(@PathVariable("studentId") String studentId) {
        return ResponseEntity.ok(studentService.getStudentByIdForAdmin(studentId));
    }

    @GetMapping("/api/student/profile")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudentResponse> getStudentProfile(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.depa.provider.security.CollegeAUserPrincipal principal) {
        return ResponseEntity.ok(studentService.getStudentProfile(principal));
    }
}
