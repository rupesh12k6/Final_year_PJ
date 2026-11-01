package com.depa.provider;

import com.depa.provider.dto.LoginRequest;
import com.depa.provider.dto.PasswordSetupRequest;
import com.depa.provider.entity.CollegeAAdmin;
import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;
import com.depa.provider.repository.CollegeAAdminRepository;
import com.depa.provider.repository.StudentRepository;
import com.depa.provider.security.CollegeAUserPrincipal;
import com.depa.provider.security.CollegeAJwtUtil;
import com.depa.provider.service.StudentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class CollegeAStudentAuthSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CollegeAAdminRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CollegeAJwtUtil jwtUtil;

    @Autowired
    private StudentService studentService;

    private String studentToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        studentRepository.deleteAll();
        adminRepository.deleteAll();

        // 1. Seed Student Alice
        Student alice = new Student(
                "STU-2023-001",
                "Alice Johnson",
                "student1@collegea.edu",
                StudentStatus.ACTIVE,
                "Valid - B.Tech CSE",
                "B.Tech Computer Science",
                "8.84 / 10.0",
                "Official Transcript - All Semesters",
                "Bachelor of Technology",
                passwordEncoder.encode("StudentPassword123")
        );
        studentRepository.save(alice);

        // 2. Seed Admin Dean
        CollegeAAdmin admin = new CollegeAAdmin(
                "ADM_COLLEGE_A_01",
                "Dean College A",
                "dean@collegea.edu",
                passwordEncoder.encode("OrgAdmin@123"),
                "COLLEGE_A",
                "ORG_ADMIN",
                "onboarding:read",
                "ACTIVE"
        );
        adminRepository.save(admin);

        studentToken = jwtUtil.generateStudentToken("STU-2023-001", "student1@collegea.edu", "COLLEGE_A", "Alice Johnson");
        adminToken = jwtUtil.generateToken("ADM_COLLEGE_A_01", "dean@collegea.edu", "COLLEGE_A", "ORG_ADMIN", "onboarding:read");
    }

    @Test
    @DisplayName("Test: Student login with valid credentials returns 200 OK and student JWT with ROLE_STUDENT")
    void testStudentLoginSuccess() throws Exception {
        LoginRequest loginRequest = new LoginRequest("student1@collegea.edu", "StudentPassword123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.studentId").value("STU-2023-001"))
                .andExpect(jsonPath("$.email").value("student1@collegea.edu"))
                .andExpect(jsonPath("$.name").value("Alice Johnson"));
    }

    @Test
    @DisplayName("Test: Student login with invalid password returns 401 Unauthorized")
    void testStudentLoginInvalidPassword() throws Exception {
        LoginRequest loginRequest = new LoginRequest("student1@collegea.edu", "WrongPassword999");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Requirement 1: Student with PENDING_ACTIVATION cannot log in until password setup is completed")
    void testPendingActivationStudentBlocked() throws Exception {
        Student pendingStudent = new Student(
                "STU-PENDING-001",
                "Pending Student",
                "pending@collegea.edu",
                StudentStatus.PENDING_ACTIVATION,
                "Enrolled",
                "B.Tech CSE",
                "8.50",
                "Transcript",
                "Degree",
                null // No password set
        );
        studentRepository.save(pendingStudent);

        LoginRequest loginRequest = new LoginRequest("pending@collegea.edu", "StudentPassword123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Requirement 1: Admin CSV import provisions students in PENDING_ACTIVATION without default passwords")
    void testCsvImportGeneratesTokens() throws Exception {
        String csvContent = "studentId,name,email,program,cgpa\n" +
                "STU-CSV-001,John Doe,john.doe@collegea.edu,B.Tech Information Technology,8.95\n" +
                "STU-CSV-002,Jane Roe,jane.roe@collegea.edu,B.Tech Data Science,9.10\n";

        MockMultipartFile csvFile = new MockMultipartFile(
                "file",
                "students.csv",
                "text/csv",
                csvContent.getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/students/import-csv")
                        .file(csvFile)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRecords").value(2))
                .andExpect(jsonPath("$.importedCount").value(2))
                .andExpect(jsonPath("$.skippedCount").value(0))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].studentId").value("STU-CSV-001"))
                .andExpect(jsonPath("$.items[0].status").value("PENDING_ACTIVATION"))
                .andExpect(jsonPath("$.items[0].activationToken").isString())
                .andExpect(jsonPath("$.items[0].activationLink").isString());

        // Verify in DB that no password was assigned
        Student importedStudent = studentRepository.findByStudentId("STU-CSV-001").orElseThrow();
        assertEquals(StudentStatus.PENDING_ACTIVATION, importedStudent.getStatus());
        assertNull(importedStudent.getPasswordHash(), "Imported student must not have a default password");
        assertNotNull(importedStudent.getActivationTokenHash(), "Imported student must have an activation token hash");
    }

    @Test
    @DisplayName("Requirement 1: Full Activation Flow - Token Validation & Self-Password Setup")
    void testActivationAndCompletePasswordSetup() throws Exception {
        // 1. Create a student in PENDING_ACTIVATION
        String rawToken = studentService.generateSecureToken();
        String tokenHash = studentService.sha256Hex(rawToken);

        Student student = new Student(
                "STU-ACT-001",
                "Bob Smith",
                "bob.smith@collegea.edu",
                StudentStatus.PENDING_ACTIVATION,
                "Enrolled",
                "B.Tech CSE",
                "8.70",
                "Transcript",
                "Degree",
                null
        );
        student.setActivationTokenHash(tokenHash);
        student.setActivationTokenExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        studentRepository.save(student);

        // 2. Validate token via public endpoint POST /api/auth/activation/validate
        mockMvc.perform(post("/api/auth/activation/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new com.depa.provider.dto.TokenValidationRequest(rawToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.studentId").value("STU-ACT-001"))
                .andExpect(jsonPath("$.maskedEmail").isString());

        // 3. Complete password setup via POST /api/auth/activation/setup-password
        PasswordSetupRequest setupRequest = new PasswordSetupRequest(rawToken, "MyNewSecurePassword@2026");

        mockMvc.perform(post("/api/auth/activation/setup-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(setupRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        // 4. Verify student is now ACTIVE and can log in with new password
        Student activated = studentRepository.findByStudentId("STU-ACT-001").orElseThrow();
        assertEquals(StudentStatus.ACTIVE, activated.getStatus());
        assertNotNull(activated.getPasswordHash());
        assertNull(activated.getActivationTokenHash(), "Activation token hash must be cleared upon completion");

        LoginRequest loginRequest = new LoginRequest("bob.smith@collegea.edu", "MyNewSecurePassword@2026");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("STU-ACT-001"))
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    @DisplayName("Requirement 6: Service-layer ownership check blocks access when principal does not match student ID")
    void testServiceLayerOwnershipCheck() {
        // Authenticated as Alice (STU-2023-001)
        CollegeAUserPrincipal alicePrincipal = new CollegeAUserPrincipal(
                "1", "student1@collegea.edu", "COLLEGE_A", "STUDENT", List.of("student:read"), "STU-2023-001"
        );

        // Calling service layer to access own record -> OK
        Student ownRecord = studentService.getStudentByStudentId("STU-2023-001", alicePrincipal);
        assertNotNull(ownRecord);
        assertEquals("STU-2023-001", ownRecord.getStudentId());

        // Calling service layer to access another student's record -> AccessDeniedException
        assertThrows(AccessDeniedException.class, () -> {
            studentService.getStudentByStudentId("STU-ANOTHER-999", alicePrincipal);
        });

        // Calling service layer with mismatched organization context -> AccessDeniedException
        CollegeAUserPrincipal foreignPrincipal = new CollegeAUserPrincipal(
                "1", "student1@collegea.edu", "COLLEGE_OTHER", "STUDENT", List.of("student:read"), "STU-2023-001"
        );
        assertThrows(AccessDeniedException.class, () -> {
            studentService.getStudentByStudentId("STU-2023-001", foreignPrincipal);
        });
    }

    @Test
    @DisplayName("Test: Student can access GET /api/student/profile and receive own details with service-layer verification")
    void testStudentCanAccessOwnProfile() throws Exception {
        mockMvc.perform(get("/api/student/profile")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("STU-2023-001"))
                .andExpect(jsonPath("$.name").value("Alice Johnson"))
                .andExpect(jsonPath("$.cgpa").value("8.84 / 10.0"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    @DisplayName("Test: Student is forbidden from accessing admin student directory GET /api/students")
    void testStudentCannotAccessAdminStudentDirectory() throws Exception {
        mockMvc.perform(get("/api/students")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Requirement 5: Anonymous user is blocked from accessing GET /api/students (Verifying permitAll fix)")
    void testUnauthenticatedCannotAccessStudentDirectory() throws Exception {
        mockMvc.perform(get("/api/students"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Test: Admin can access GET /api/students")
    void testAdminCanAccessStudentDirectory() throws Exception {
        mockMvc.perform(get("/api/students")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].studentId").value("STU-2023-001"));
    }

    @Test
    @DisplayName("Test: Admin is forbidden from accessing student-only profile GET /api/student/profile")
    void testAdminCannotAccessStudentProfile() throws Exception {
        mockMvc.perform(get("/api/student/profile")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("RBAC Protection: Student is forbidden from accessing admin dossier endpoint GET /api/students/{id}/dossier")
    void testStudentCannotAccessStudentDossier() throws Exception {
        mockMvc.perform(get("/api/students/STU-2023-001/dossier")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/students/STU-2023-001/dossier")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("STU-2023-001"))
                .andExpect(jsonPath("$.name").value("Alice Johnson"))
                .andExpect(jsonPath("$.cgpa").value("8.84 / 10.0"));
    }

    @Test
    @DisplayName("Stage 7.1: Individual student enrollment generates cryptographically secure activation token and persists SHA-256 hash")
    void testAddStudentSuccessWithActivationToken() throws Exception {
        com.depa.provider.dto.AddStudentRequest req = new com.depa.provider.dto.AddStudentRequest(
                "STU-IND-7001",
                "David Miller",
                "david.miller@collegea.edu",
                "B.Tech Computer Science",
                "9.25 / 10.0",
                "Official Academic Transcript - High Honors",
                "Bachelor of Technology in CS",
                null // no initial password
        );

        String responseBody = mockMvc.perform(post("/api/students")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.studentId").value("STU-IND-7001"))
                .andExpect(jsonPath("$.name").value("David Miller"))
                .andExpect(jsonPath("$.status").value("PENDING_ACTIVATION"))
                .andExpect(jsonPath("$.activationToken").isString())
                .andReturn().getResponse().getContentAsString();

        com.depa.provider.dto.StudentResponse resp = objectMapper.readValue(responseBody, com.depa.provider.dto.StudentResponse.class);
        String rawToken = resp.getActivationToken();
        assertNotNull(rawToken, "Raw activation token must be returned in response for distribution");
        assertTrue(rawToken.length() >= 32, "Raw token must have sufficient entropy (>= 32 chars)");

        Student saved = studentRepository.findByStudentId("STU-IND-7001").orElseThrow();
        assertEquals(StudentStatus.PENDING_ACTIVATION, saved.getStatus());
        assertNull(saved.getPasswordHash(), "No password hash must exist prior to student self-activation");

        String dbHash = saved.getActivationTokenHash();
        assertNotNull(dbHash, "Database must store the activation token hash");
        assertEquals(64, dbHash.length(), "SHA-256 hash must be exactly 64 hex characters");
        assertNotEquals(rawToken, dbHash, "Raw token must NEVER be stored in the database");

        // Verify SHA-256 value is NOT the empty string hash e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
        final String EMPTY_STRING_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        assertNotEquals(EMPTY_STRING_HASH, dbHash, "Hash must NOT be the SHA-256 hash of an empty string");
        assertEquals(studentService.sha256Hex(rawToken), dbHash, "Database hash must match SHA-256 of the generated raw token");

        // Verify 7-day expiration
        assertNotNull(saved.getActivationTokenExpiresAt(), "Expiration timestamp must be populated");
        assertTrue(saved.getActivationTokenExpiresAt().isAfter(Instant.now().plus(6, ChronoUnit.DAYS)), "Expiration must be set ~7 days into the future");
    }

    @Test
    @DisplayName("Stage 7.1: Duplicate Student ID rejection (400 Bad Request)")
    void testAddStudentDuplicateIdRejected() throws Exception {
        com.depa.provider.dto.AddStudentRequest req = new com.depa.provider.dto.AddStudentRequest(
                "STU-2023-001", // Already exists (Alice)
                "Duplicate ID Candidate",
                "duplicate.id@collegea.edu",
                "B.Tech CSE",
                "8.50 / 10.0",
                null, null, null
        );

        mockMvc.perform(post("/api/students")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    @DisplayName("Stage 7.1: Duplicate Email rejection (400 Bad Request)")
    void testAddStudentDuplicateEmailRejected() throws Exception {
        com.depa.provider.dto.AddStudentRequest req = new com.depa.provider.dto.AddStudentRequest(
                "STU-NEW-9999",
                "Duplicate Email Candidate",
                "student1@collegea.edu", // Already belongs to Alice
                "B.Tech CSE",
                "8.50 / 10.0",
                null, null, null
        );

        mockMvc.perform(post("/api/students")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    @DisplayName("Stage 7.1: Invalid CGPA rejection (400 Bad Request)")
    void testAddStudentInvalidCgpaRejected() throws Exception {
        // Test CGPA > 10.0
        com.depa.provider.dto.AddStudentRequest reqHigh = new com.depa.provider.dto.AddStudentRequest(
                "STU-CGPA-01", "Invalid CGPA High", "cgpa.high@collegea.edu", "B.Tech", "14.50 / 10.0", null, null, null
        );
        mockMvc.perform(post("/api/students")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqHigh)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid CGPA")));

        // Test non-numeric CGPA
        com.depa.provider.dto.AddStudentRequest reqAlpha = new com.depa.provider.dto.AddStudentRequest(
                "STU-CGPA-02", "Invalid CGPA Alpha", "cgpa.alpha@collegea.edu", "B.Tech", "EXCELLENT", null, null, null
        );
        mockMvc.perform(post("/api/students")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqAlpha)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid CGPA")));
    }

    @Test
    @DisplayName("Stage 7.1: Missing required fields rejection (400 Bad Request)")
    void testAddStudentMissingFieldsRejected() throws Exception {
        // Missing name and email
        com.depa.provider.dto.AddStudentRequest reqMissing = new com.depa.provider.dto.AddStudentRequest(
                "", "", "", "B.Tech", "8.0", null, null, null
        );
        mockMvc.perform(post("/api/students")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqMissing)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Stage 7.1: Invalid email format rejection (400 Bad Request)")
    void testAddStudentInvalidEmailRejected() throws Exception {
        com.depa.provider.dto.AddStudentRequest reqBadEmail = new com.depa.provider.dto.AddStudentRequest(
                "STU-BAD-MAIL", "Bad Email User", "not-a-valid-email", "B.Tech", "8.0", null, null, null
        );
        mockMvc.perform(post("/api/students")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqBadEmail)))
                .andExpect(status().isBadRequest());
    }
}
