package com.depa.consumer;

import com.depa.consumer.dto.LoginRequest;
import com.depa.consumer.dto.PasswordSetupRequest;
import com.depa.consumer.entity.CollegeBAdmin;
import com.depa.consumer.entity.Student;
import com.depa.consumer.entity.StudentStatus;
import com.depa.consumer.repository.CollegeBAdminRepository;
import com.depa.consumer.repository.StudentRepository;
import com.depa.consumer.security.CollegeBJwtUtil;
import com.depa.consumer.security.CollegeBUserPrincipal;
import com.depa.consumer.service.StudentService;
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
public class CollegeBStudentAuthSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CollegeBAdminRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CollegeBJwtUtil jwtUtil;

    @Autowired
    private StudentService studentService;

    private String studentToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        studentRepository.deleteAll();
        adminRepository.deleteAll();

        // 1. Seed Student Alice in College B
        Student alice = new Student(
                "STU-2023-001",
                "Alice Johnson",
                "alice.johnson@collegeb.edu",
                StudentStatus.ACTIVE,
                "Valid - B.Tech AI & Data Science",
                "Artificial Intelligence & Data Science",
                "9.20",
                "Bachelor of Technology (Honors)",
                passwordEncoder.encode("StudentPassword123")
        );
        studentRepository.save(alice);

        // 2. Seed Admin Dean in College B
        CollegeBAdmin admin = new CollegeBAdmin(
                "COLLEGE_B_ADM_001",
                "Dean College B",
                "dean@collegeb.edu",
                passwordEncoder.encode("OrgAdmin@123"),
                "COLLEGE_B",
                "ORG_ADMIN",
                "onboarding:read",
                "ACTIVE"
        );
        adminRepository.save(admin);

        studentToken = jwtUtil.generateStudentToken("STU-2023-001", "alice.johnson@collegeb.edu", "COLLEGE_B", "Alice Johnson");
        adminToken = jwtUtil.generateToken("COLLEGE_B_ADM_001", "dean@collegeb.edu", "ORG_ADMIN", "onboarding:read", "COLLEGE_B");
    }

    @Test
    @DisplayName("Test: Student login with valid credentials in College B returns 200 OK and student JWT")
    void testStudentLoginSuccess() throws Exception {
        LoginRequest loginRequest = new LoginRequest("alice.johnson@collegeb.edu", "StudentPassword123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.studentId").value("STU-2023-001"))
                .andExpect(jsonPath("$.email").value("alice.johnson@collegeb.edu"))
                .andExpect(jsonPath("$.name").value("Alice Johnson"));
    }

    @Test
    @DisplayName("Test: Student login with invalid password in College B returns 401 Unauthorized")
    void testStudentLoginInvalidPassword() throws Exception {
        LoginRequest loginRequest = new LoginRequest("alice.johnson@collegeb.edu", "WrongPassword999");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Requirement 1: Student with PENDING_ACTIVATION in College B cannot log in until password setup is completed")
    void testPendingActivationStudentBlocked() throws Exception {
        Student pendingStudent = new Student(
                "STU-B-PENDING-001",
                "Pending Student B",
                "pending.b@collegeb.edu",
                StudentStatus.PENDING_ACTIVATION,
                "Enrolled",
                "Cyber Security",
                "8.70",
                "Bachelor of Technology",
                null
        );
        studentRepository.save(pendingStudent);

        LoginRequest loginRequest = new LoginRequest("pending.b@collegeb.edu", "StudentPassword123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Requirement 1: Admin CSV import in College B provisions students in PENDING_ACTIVATION without default passwords")
    void testCsvImportGeneratesTokens() throws Exception {
        String csvContent = "studentId,name,email,department,cgpa\n" +
                "STU-BCSV-001,Bob Roberts,bob.roberts@collegeb.edu,Robotics & Automation,9.15\n" +
                "STU-BCSV-002,Carol White,carol.white@collegeb.edu,Cyber Security,8.80\n";

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
                .andExpect(jsonPath("$.items[0].studentId").value("STU-BCSV-001"))
                .andExpect(jsonPath("$.items[0].status").value("PENDING_ACTIVATION"))
                .andExpect(jsonPath("$.items[0].activationToken").isString())
                .andExpect(jsonPath("$.items[0].activationLink").isString());

        Student importedStudent = studentRepository.findByStudentId("STU-BCSV-001").orElseThrow();
        assertEquals(StudentStatus.PENDING_ACTIVATION, importedStudent.getStatus());
        assertNull(importedStudent.getPasswordHash(), "Imported student must not have a default password");
        assertNotNull(importedStudent.getActivationTokenHash(), "Imported student must have an activation token hash");
    }

    @Test
    @DisplayName("Requirement 1: Full Activation Flow in College B - Token Validation & Self-Password Setup")
    void testActivationAndCompletePasswordSetup() throws Exception {
        String rawToken = studentService.generateSecureToken();
        String tokenHash = studentService.sha256Hex(rawToken);

        Student student = new Student(
                "STU-BACT-001",
                "David Miller",
                "david.miller@collegeb.edu",
                StudentStatus.PENDING_ACTIVATION,
                "Enrolled",
                "Cloud Computing",
                "8.95",
                "Bachelor of Technology",
                null
        );
        student.setActivationTokenHash(tokenHash);
        student.setActivationTokenExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        studentRepository.save(student);

        // 1. Validate token via public endpoint POST /api/auth/activation/validate
        mockMvc.perform(post("/api/auth/activation/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new com.depa.consumer.dto.TokenValidationRequest(rawToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.studentId").value("STU-BACT-001"))
                .andExpect(jsonPath("$.maskedEmail").isString());

        // 2. Complete password setup via POST /api/auth/activation/setup-password
        PasswordSetupRequest setupRequest = new PasswordSetupRequest(rawToken, "CollegeBSecurePassword@2026");

        mockMvc.perform(post("/api/auth/activation/setup-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(setupRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        // 3. Verify student is now ACTIVE and can log in with new password
        Student activated = studentRepository.findByStudentId("STU-BACT-001").orElseThrow();
        assertEquals(StudentStatus.ACTIVE, activated.getStatus());
        assertNotNull(activated.getPasswordHash());
        assertNull(activated.getActivationTokenHash());

        LoginRequest loginRequest = new LoginRequest("david.miller@collegeb.edu", "CollegeBSecurePassword@2026");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("STU-BACT-001"))
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    @DisplayName("Requirement 6: Service-layer ownership check in College B blocks mismatched student ID")
    void testServiceLayerOwnershipCheck() {
        CollegeBUserPrincipal alicePrincipal = CollegeBUserPrincipal.createForStudent(
                "STU-2023-001", "alice.johnson@collegeb.edu", "COLLEGE_B"
        );

        Student ownRecord = studentService.getStudentByStudentId("STU-2023-001", alicePrincipal);
        assertNotNull(ownRecord);
        assertEquals("STU-2023-001", ownRecord.getStudentId());

        assertThrows(AccessDeniedException.class, () -> {
            studentService.getStudentByStudentId("STU-ANOTHER-999", alicePrincipal);
        });

        CollegeBUserPrincipal foreignPrincipal = CollegeBUserPrincipal.createForStudent(
                "STU-2023-001", "alice.johnson@collegeb.edu", "COLLEGE_OTHER"
        );
        assertThrows(AccessDeniedException.class, () -> {
            studentService.getStudentByStudentId("STU-2023-001", foreignPrincipal);
        });
    }

    @Test
    @DisplayName("Test: Student can access GET /api/student/profile and receive own details in College B")
    void testStudentCanAccessOwnProfile() throws Exception {
        mockMvc.perform(get("/api/student/profile")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("STU-2023-001"))
                .andExpect(jsonPath("$.name").value("Alice Johnson"))
                .andExpect(jsonPath("$.cgpa").value("9.20"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    @DisplayName("Test: Student is forbidden from accessing admin student directory GET /api/students in College B")
    void testStudentCannotAccessAdminStudentDirectory() throws Exception {
        mockMvc.perform(get("/api/students")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Requirement 5: Anonymous user is blocked from accessing GET /api/students in College B (Verifying permitAll fix)")
    void testUnauthenticatedCannotAccessStudentDirectory() throws Exception {
        mockMvc.perform(get("/api/students"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Test: Admin can access GET /api/students in College B")
    void testAdminCanAccessStudentDirectory() throws Exception {
        mockMvc.perform(get("/api/students")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].studentId").value("STU-2023-001"));
    }

    @Test
    @DisplayName("Test: Admin is forbidden from accessing student-only profile GET /api/student/profile in College B")
    void testAdminCannotAccessStudentProfile() throws Exception {
        mockMvc.perform(get("/api/student/profile")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }
}
