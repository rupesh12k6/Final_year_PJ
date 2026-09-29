package com.depa.provider;

import com.depa.provider.dto.LoginRequest;
import com.depa.provider.entity.CollegeAAdmin;
import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;
import com.depa.provider.repository.CollegeAAdminRepository;
import com.depa.provider.repository.StudentRepository;
import com.depa.provider.security.CollegeAJwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class CollegeAOnboardingSecurityTest {

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

    private String collegeAAdminToken;

    @BeforeEach
    void setUp() {
        studentRepository.deleteAll();
        adminRepository.deleteAll();

        // Seed Sample Students
        List<Student> sampleStudents = List.of(
                new Student("S1001", "Ashok Mugada", "student1001@example.com", StudentStatus.ACTIVE),
                new Student("S1002", "Rahul Kumar", "student1002@example.com", StudentStatus.ACTIVE)
        );
        studentRepository.saveAll(sampleStudents);

        // Seed College A Admin
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

        collegeAAdminToken = jwtUtil.generateToken("ADM_COLLEGE_A_01", "dean@collegea.edu", "COLLEGE_A", "ORG_ADMIN", "onboarding:read");
    }

    @Test
    @DisplayName("Test: College A ORG_ADMIN authenticates and receives College A JWT")
    void testCollegeAAdminLogin() throws Exception {
        LoginRequest loginRequest = new LoginRequest("dean@collegea.edu", "OrgAdmin@123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.email").value("dean@collegea.edu"))
                .andExpect(jsonPath("$.role").value("ORG_ADMIN"))
                .andExpect(jsonPath("$.organizationCode").value("COLLEGE_A"));
    }

    @Test
    @DisplayName("Test: Unauthenticated or invalid token cannot access eligible-students endpoint")
    void testUnauthenticatedAccessRejected() throws Exception {
        mockMvc.perform(get("/api/provider/onboarding/eligible-students"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Test: Valid College A JWT fetches least-privilege eligible students (only studentId and email)")
    void testEligibleStudentsReturnsMinimumDTO() throws Exception {
        mockMvc.perform(get("/api/provider/onboarding/eligible-students")
                        .header("Authorization", "Bearer " + collegeAAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].studentId").value("S1001"))
                .andExpect(jsonPath("$[0].email").value("student1001@example.com"))
                .andExpect(jsonPath("$[0].marks").doesNotExist())
                .andExpect(jsonPath("$[0].phone").doesNotExist())
                .andExpect(jsonPath("$[0].password").doesNotExist());
    }

    @Test
    @DisplayName("Test: Generic alias /api/onboarding/eligible-users also works with College A JWT")
    void testGenericEligibleUsersEndpoint() throws Exception {
        mockMvc.perform(get("/api/onboarding/eligible-users")
                        .header("Authorization", "Bearer " + collegeAAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].studentId").value("S1001"))
                .andExpect(jsonPath("$[0].email").value("student1001@example.com"));
    }
}
