package com.depa.provider.service;

import com.depa.provider.dto.*;
import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;
import com.depa.provider.repository.StudentRepository;
import com.depa.provider.security.CollegeAUserPrincipal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class StudentService {

    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final RestClient restClient;
    private final String collegeCode;
    private final SecureRandom secureRandom = new SecureRandom();

    public StudentService(StudentRepository studentRepository,
                          PasswordEncoder passwordEncoder,
                          @Value("${app.cm.base-url:http://localhost:8095}") String cmBaseUrl,
                          @Value("${app.college.code:COLLEGE_A}") String collegeCode) {
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory())
                .baseUrl(cmBaseUrl)
                .build();
        this.collegeCode = collegeCode;
    }

    public StudentResponse addStudent(AddStudentRequest request) {
        return addStudent(request, null);
    }

    public StudentResponse addStudent(AddStudentRequest request, CollegeAUserPrincipal principal) {
        if (principal != null) {
            if (!"ORG_ADMIN".equalsIgnoreCase(principal.getRole())) {
                throw new AccessDeniedException("Only organization administrators can register students");
            }
            if (principal.getOrgId() != null && !principal.getOrgId().equalsIgnoreCase(collegeCode)) {
                throw new AccessDeniedException("Cross-organization registration denied: Administrator belongs to " + principal.getOrgId());
            }
        }

        if (request == null) {
            throw new IllegalArgumentException("Student registration payload cannot be null");
        }

        if (request.getOrganizationCode() != null && !request.getOrganizationCode().isBlank()
                && !request.getOrganizationCode().trim().equalsIgnoreCase(collegeCode)) {
            throw new AccessDeniedException("Cannot register student under foreign organization code '" + request.getOrganizationCode() + "'");
        }

        String studentId = request.getStudentId() != null ? request.getStudentId().trim() : "";
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";

        if (studentId.isBlank()) {
            throw new IllegalArgumentException("Student ID / Roll No is required");
        }
        if (request.getName() == null || request.getName().trim().isBlank()) {
            throw new IllegalArgumentException("Student Name is required");
        }
        if (email.isBlank() || !email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
            throw new IllegalArgumentException("Valid student email is required");
        }
        if (request.getCgpa() != null && !request.getCgpa().isBlank()) {
            validateCgpa(request.getCgpa().trim());
        }

        if (studentRepository.findByStudentId(studentId).isPresent()) {
            throw new IllegalArgumentException("Student with ID '" + studentId + "' already exists");
        }
        if (studentRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Student with email '" + email + "' already exists");
        }

        // Enforce DEPA architectural mandate: Administrators cannot assign passwords or bypass activation.
        // All newly enrolled students strictly start as PENDING_ACTIVATION with a 192-bit CSPRNG token.
        StudentStatus status = StudentStatus.PENDING_ACTIVATION;
        String passwordHash = null;

        Student student = new Student(
                studentId,
                request.getName().trim(),
                email,
                status,
                "Valid - Enrolled in " + (request.getProgram() != null ? request.getProgram() : "Academic Program"),
                request.getProgram() != null ? request.getProgram() : "B.Tech Computer Science",
                request.getCgpa() != null ? request.getCgpa() : "8.84 / 10.0",
                request.getTranscript() != null ? request.getTranscript() : "Official Academic Transcript - All Semesters Cleared",
                request.getDegreeCertificate() != null ? request.getDegreeCertificate() : "Verified Official Degree Certificate",
                passwordHash
        );

        String rawToken = generateSecureToken();
        student.setActivationTokenHash(sha256Hex(rawToken));
        student.setActivationTokenExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));

        Student saved = studentRepository.save(student);

        StudentResponse response = new StudentResponse(saved);
        response.setActivationToken(rawToken);
        return response;
    }

    /**
     * Requirement: Reissue activation token for students in PENDING_ACTIVATION state.
     * Generates a fresh 192-bit CSPRNG token, stores SHA-256 hash with 7-day expiry.
     * Prevents reissuing tokens to already ACTIVE accounts.
     */
    public StudentResponse reissueActivationToken(String studentId, CollegeAUserPrincipal principal) {
        if (principal != null) {
            if (!"ORG_ADMIN".equalsIgnoreCase(principal.getRole())) {
                throw new AccessDeniedException("Only organization administrators can reissue activation tokens");
            }
            if (principal.getOrgId() != null && !principal.getOrgId().equalsIgnoreCase(collegeCode)) {
                throw new AccessDeniedException("Cross-organization token reissue denied");
            }
        }

        if (studentId == null || studentId.isBlank()) {
            throw new IllegalArgumentException("Student ID is required");
        }

        Student student = studentRepository.findByStudentId(studentId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Student not found with ID: " + studentId));

        if (student.getStatus() == StudentStatus.ACTIVE) {
            throw new IllegalArgumentException("Student account is already ACTIVE. Activation token cannot be reissued.");
        }

        String rawToken = generateSecureToken();
        student.setActivationTokenHash(sha256Hex(rawToken));
        student.setActivationTokenExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        student.setStatus(StudentStatus.PENDING_ACTIVATION);

        Student updated = studentRepository.save(student);
        StudentResponse response = new StudentResponse(updated);
        response.setActivationToken(rawToken);
        return response;
    }

    /**
     * Requirement: Admin account status updates (SUSPEND, INACTIVE, ACTIVATE).
     * Strictly enforces that an unactivated account (PENDING_ACTIVATION) cannot be marked ACTIVE
     * by an admin without completing student self-activation and password setup.
     */
    public StudentResponse updateStudentStatus(String studentId, StudentStatus newStatus, CollegeAUserPrincipal principal) {
        if (principal != null) {
            if (!"ORG_ADMIN".equalsIgnoreCase(principal.getRole())) {
                throw new AccessDeniedException("Only organization administrators can update student status");
            }
            if (principal.getOrgId() != null && !principal.getOrgId().equalsIgnoreCase(collegeCode)) {
                throw new AccessDeniedException("Cross-organization status update denied");
            }
        }

        if (studentId == null || studentId.isBlank()) {
            throw new IllegalArgumentException("Student ID is required");
        }
        if (newStatus == null) {
            throw new IllegalArgumentException("New student status cannot be null");
        }

        Student student = studentRepository.findByStudentId(studentId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Student not found with ID: " + studentId));

        if (student.getStatus() == StudentStatus.PENDING_ACTIVATION && newStatus == StudentStatus.ACTIVE) {
            throw new IllegalArgumentException("Direct activation denied: Student account in PENDING_ACTIVATION must complete self-activation and password setup.");
        }

        student.setStatus(newStatus);
        Student saved = studentRepository.save(student);
        return new StudentResponse(saved);
    }

    /**
     * Requirement 1: Secure password provisioning during CSV import.
     * Does NOT assign a common default password. Implements secure token generation.
     */
    public CsvImportResultResponse importStudentsFromCsv(MultipartFile file, String portalBaseUrl) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("CSV file must not be empty");
        }

        List<CsvImportResultResponse.StudentActivationItem> items = new ArrayList<>();
        int total = 0;
        int imported = 0;
        int skipped = 0;

        String baseUrl = (portalBaseUrl != null && !portalBaseUrl.isBlank()) ? portalBaseUrl : "http://localhost:3002";

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean isFirstLine = true;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) continue;

                if (isFirstLine) {
                    isFirstLine = false;
                    // Check if header line
                    if (line.toLowerCase().contains("studentid") || line.toLowerCase().contains("email")) {
                        continue;
                    }
                }

                total++;
                String[] parts = line.split(",");
                if (parts.length < 3) {
                    skipped++;
                    continue;
                }

                String studentId = parts[0].trim();
                String name = parts[1].trim();
                String email = parts[2].trim().toLowerCase();
                String program = parts.length > 3 && !parts[3].isBlank() ? parts[3].trim() : "B.Tech Computer Science";
                String cgpa = parts.length > 4 && !parts[4].isBlank() ? parts[4].trim() : "8.50 / 10.0";

                // Check duplicates
                if (studentRepository.findByStudentId(studentId).isPresent() || studentRepository.findByEmail(email).isPresent()) {
                    skipped++;
                    continue;
                }

                // Generate secure random activation token - NEVER a common default password
                String rawToken = generateSecureToken();
                String tokenHash = sha256Hex(rawToken);
                Instant expiresAt = Instant.now().plus(7, ChronoUnit.DAYS);

                Student student = new Student(
                        studentId,
                        name,
                        email,
                        StudentStatus.PENDING_ACTIVATION,
                        "Enrolled - Pending Student Password Setup",
                        program,
                        cgpa,
                        "Official Academic Transcript - Enrolled",
                        "Bachelor of Technology (Pending Completion)",
                        null // No default password
                );
                student.setActivationTokenHash(tokenHash);
                student.setActivationTokenExpiresAt(expiresAt);

                studentRepository.save(student);
                imported++;

                // Activation link uses URL fragment (#token=...), never query parameters
                String activationLink = baseUrl + "/index.html#/activate#token=" + rawToken;
                items.add(new CsvImportResultResponse.StudentActivationItem(
                        studentId, name, email, StudentStatus.PENDING_ACTIVATION.name(), rawToken, activationLink, expiresAt
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse CSV file: " + e.getMessage(), e);
        }

        return new CsvImportResultResponse(
                total,
                imported,
                skipped,
                "CSV import completed. Secure activation tokens generated; no default passwords were assigned.",
                items
        );
    }

    /**
     * Requirement 1: Validate account activation token for student password setup.
     */
    @Transactional(readOnly = true)
    public ActivationValidationResponse validateActivationToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("Activation token is required");
        }

        String tokenHash = sha256Hex(rawToken.trim());
        Student student = studentRepository.findByActivationTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or already used activation token"));

        if (student.getStatus() != StudentStatus.PENDING_ACTIVATION) {
            throw new IllegalStateException("Account is already " + student.getStatus().name().toLowerCase());
        }

        if (student.getActivationTokenExpiresAt() != null && Instant.now().isAfter(student.getActivationTokenExpiresAt())) {
            throw new IllegalStateException("Activation token has expired. Please contact your college administrator.");
        }

        return new ActivationValidationResponse(
                true,
                student.getStudentId(),
                student.getName(),
                maskEmail(student.getEmail()),
                student.getActivationTokenExpiresAt()
        );
    }

    /**
     * Requirement 1: Complete student self-activation and password setup.
     */
    public PasswordSetupResponse completePasswordSetup(PasswordSetupRequest request) {
        String tokenHash = sha256Hex(request.getToken().trim());
        Student student = studentRepository.findByActivationTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or already used activation token"));

        if (student.getStatus() != StudentStatus.PENDING_ACTIVATION) {
            throw new IllegalStateException("Account is already " + student.getStatus().name().toLowerCase());
        }

        if (student.getActivationTokenExpiresAt() != null && Instant.now().isAfter(student.getActivationTokenExpiresAt())) {
            throw new IllegalStateException("Activation token has expired");
        }

        String newPassword = request.getPassword().trim();
        if (newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long");
        }

        student.setPasswordHash(passwordEncoder.encode(newPassword));
        student.setStatus(StudentStatus.ACTIVE);
        student.setActivationCompletedAt(Instant.now());
        student.setActivationTokenHash(null);
        student.setActivationTokenExpiresAt(null);

        studentRepository.save(student);

        // Synchronize active credentials with CM
        try {
            Map<String, String> syncPayload = new HashMap<>();
            syncPayload.put("organizationCode", collegeCode);
            syncPayload.put("studentId", student.getStudentId());
            syncPayload.put("name", student.getName());
            syncPayload.put("email", student.getEmail());
            syncPayload.put("password", newPassword);

            restClient.post()
                    .uri("/api/onboarding/student-direct")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(syncPayload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            System.err.println("WARN: Could not immediately sync student credentials with CM: " + e.getMessage());
        }

        return new PasswordSetupResponse(
                true,
                student.getStudentId(),
                StudentStatus.ACTIVE.name(),
                "Account activated successfully. You may now log in to the College Portal and Consent Manager."
        );
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> getAllStudents() {
        return studentRepository.findAll()
                .stream()
                .map(StudentResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudentByIdForAdmin(String studentId) {
        Student student = studentRepository.findByStudentId(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));
        return new StudentResponse(student);
    }

    @Transactional(readOnly = true)
    public List<Student> getActiveStudents() {
        return studentRepository.findByStatus(StudentStatus.ACTIVE);
    }

    /**
     * Requirement 6: Ownership check at the service layer for individual student retrieval.
     */
    @Transactional(readOnly = true)
    public Student getStudentByStudentId(String studentId, CollegeAUserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Unauthenticated request");
        }

        // Verify organization context
        if (principal.getOrgId() != null && !principal.getOrgId().equalsIgnoreCase(collegeCode)) {
            throw new AccessDeniedException("Cross-organization access denied");
        }

        // Service layer ownership validation: ORG_ADMIN or exact student owner
        boolean isOrgAdmin = "ORG_ADMIN".equalsIgnoreCase(principal.getRole());
        boolean isStudentOwner = "STUDENT".equalsIgnoreCase(principal.getRole())
                && studentId != null && studentId.equalsIgnoreCase(principal.getStudentId());

        if (!isOrgAdmin && !isStudentOwner) {
            throw new AccessDeniedException("Service-layer ownership check failed: Access denied to student record " + studentId);
        }

        return studentRepository.findByStudentId(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with ID: " + studentId));
    }

    /**
     * Requirement 6: Ownership check at the service layer for authenticated student's own profile.
     */
    @Transactional(readOnly = true)
    public StudentResponse getStudentProfile(CollegeAUserPrincipal principal) {
        if (principal == null || principal.getStudentId() == null || principal.getStudentId().isBlank()) {
            throw new AccessDeniedException("User is not an authenticated student");
        }

        if (!"STUDENT".equalsIgnoreCase(principal.getRole())) {
            throw new AccessDeniedException("Only students can access their student profile");
        }

        if (principal.getOrgId() != null && !principal.getOrgId().equalsIgnoreCase(collegeCode)) {
            throw new AccessDeniedException("Cross-organization profile access denied");
        }

        Student student = studentRepository.findByStudentId(principal.getStudentId())
                .orElseThrow(() -> new IllegalArgumentException("Student record not found for student ID: " + principal.getStudentId()));

        return new StudentResponse(student);
    }

    public String generateSecureToken() {
        byte[] bytes = new byte[24];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    public String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm unavailable", e);
        }
    }

    private void validateCgpa(String cgpa) {
        if (cgpa == null || cgpa.isBlank()) return;
        String cleaned = cgpa.split("/")[0].trim();
        try {
            double val = Double.parseDouble(cleaned);
            if (val < 0.0 || val > 10.0) {
                throw new IllegalArgumentException("Invalid CGPA: Must be between 0.00 and 10.00");
            }
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid CGPA: Must be a numeric value between 0.00 and 10.00");
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        int atIndex = email.indexOf('@');
        String namePart = email.substring(0, atIndex);
        String domainPart = email.substring(atIndex);
        if (namePart.length() <= 2) {
            return namePart.charAt(0) + "***" + domainPart;
        }
        return namePart.charAt(0) + "***" + namePart.charAt(namePart.length() - 1) + domainPart;
    }
}
