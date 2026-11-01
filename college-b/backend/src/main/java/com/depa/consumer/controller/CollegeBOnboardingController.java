package com.depa.consumer.controller;

import com.depa.consumer.dto.AddStudentRequest;
import com.depa.consumer.dto.CsvImportResultResponse;
import com.depa.consumer.dto.StudentResponse;
import com.depa.consumer.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
public class CollegeBOnboardingController {

    private final StudentService studentService;

    public CollegeBOnboardingController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping("/api/students")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<List<StudentResponse>> getAllStudents() {
        return ResponseEntity.ok(studentService.getAllStudents());
    }

    @PostMapping("/api/students")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<StudentResponse> addStudent(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.depa.consumer.security.CollegeBUserPrincipal principal,
            @Valid @RequestBody AddStudentRequest request) {
        StudentResponse response = studentService.addStudent(request, principal);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/api/students/{studentId}/reissue-activation")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<StudentResponse> reissueActivation(
            @PathVariable("studentId") String studentId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.depa.consumer.security.CollegeBUserPrincipal principal) {
        StudentResponse response = studentService.reissueActivationToken(studentId, principal);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/api/students/{studentId}/status")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<StudentResponse> updateStatus(
            @PathVariable("studentId") String studentId,
            @RequestBody Map<String, String> payload,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.depa.consumer.security.CollegeBUserPrincipal principal) {
        String statusStr = payload != null ? payload.get("status") : null;
        if (statusStr == null || statusStr.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        com.depa.consumer.entity.StudentStatus newStatus = com.depa.consumer.entity.StudentStatus.valueOf(statusStr.trim().toUpperCase());
        StudentResponse response = studentService.updateStudentStatus(studentId, newStatus, principal);
        return ResponseEntity.ok(response);
    }

    @GetMapping({"/api/students/{studentId}", "/api/students/{studentId}/dossier"})
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<StudentResponse> getStudentDossier(@PathVariable("studentId") String studentId) {
        return ResponseEntity.ok(studentService.getStudentByIdForAdmin(studentId));
    }

    @PostMapping(value = "/api/students/import-csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<CsvImportResultResponse> importStudentsCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "portalBaseUrl", required = false) String portalBaseUrl) {
        CsvImportResultResponse response = studentService.importStudentsFromCsv(file, portalBaseUrl);
        return ResponseEntity.ok(response);
    }

    @GetMapping({"/api/provider/onboarding/eligible-students", "/api/onboarding/eligible-users"})
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<List<Map<String, String>>> getEligibleOnboardingStudents() {
        List<Map<String, String>> dtoList = studentService.getActiveStudents().stream()
                .map(s -> Map.of("studentId", s.getStudentId(), "email", s.getEmail()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtoList);
    }

    @GetMapping("/api/student/profile")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudentResponse> getStudentProfile(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.depa.consumer.security.CollegeBUserPrincipal principal) {
        return ResponseEntity.ok(studentService.getStudentProfile(principal));
    }
}
