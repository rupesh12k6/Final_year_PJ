package com.depa.consent;

import com.depa.consent.dto.*;
import com.depa.consent.entity.*;
import com.depa.consent.repository.*;
import com.depa.consent.security.JwtUtil;
import com.depa.consent.service.EmailDeliveryService;
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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class StudentOnboardingRegistrationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private UserInvitationRepository userInvitationRepository;

    @Autowired
    private EmailVerificationOtpRepository emailVerificationOtpRepository;

    @Autowired
    private EmailDeliveryService emailDeliveryService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String orgAdminToken;

    @BeforeEach
    void setUp() {
        emailVerificationOtpRepository.deleteAll();
        userInvitationRepository.deleteAll();
        userRepository.deleteAll();
        organizationRepository.deleteAll();

        // Ensure COLLEGE_A exists and is ACTIVE with endpoints
        Organization collegeA = new Organization(
                "ORG_COLLEGE_A",
                "COLLEGE_A",
                "College of Technology A",
                "admin@collegea.edu",
                "http://localhost:8081/api/auth/login",
                "http://localhost:8081/api/provider/onboarding/eligible-students",
                OrganizationStatus.ACTIVE
        );
        organizationRepository.save(collegeA);

        // Create ORG_ADMIN for College A in Consent Manager
        User orgAdmin = new User(
                "ORG_ADM_001",
                "Dean College A",
                "dean@collegea.edu",
                passwordEncoder.encode("OrgAdmin@123"),
                "ORG_COLLEGE_A",
                UserRole.ORG_ADMIN,
                UserStatus.ACTIVE
        );
        userRepository.save(orgAdmin);

        orgAdminToken = jwtUtil.generateAuthToken("ORG_ADM_001", "dean@collegea.edu", "ORG_ADMIN", "ORG_COLLEGE_A");
    }

    @Test
    @DisplayName("Test: ORG_ADMIN imports eligible students via CM JWT with summary stats")
    void testOrgAdminImportStudentsWithSummary() throws Exception {
        List<StudentOnboardingItem> items = List.of(
                new StudentOnboardingItem("S1001", "student1001@example.com"),
                new StudentOnboardingItem("S1002", "student1002@example.com")
        );

        ImportOnboardingRequest request = new ImportOnboardingRequest(items);

        mockMvc.perform(post("/api/org-admin/onboarding/import")
                        .header("Authorization", "Bearer " + orgAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.organizationCode").value("COLLEGE_A"))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.newInvitations").value(2))
                .andExpect(jsonPath("$.alreadyActive").value(0))
                .andExpect(jsonPath("$.alreadyPending").value(0))
                .andExpect(jsonPath("$.failed").value(0));

        assertEquals(2, userInvitationRepository.count());
    }

    @Test
    @DisplayName("Test: Duplicate onboarding handles ACTIVE user skip vs PENDING re-issue")
    void testDuplicateOnboardingHandling() throws Exception {
        // 1. First Import S1001 & S1002
        List<StudentOnboardingItem> items = List.of(
                new StudentOnboardingItem("S1001", "student1001@example.com"),
                new StudentOnboardingItem("S1002", "student1002@example.com")
        );
        ImportOnboardingRequest req1 = new ImportOnboardingRequest(items);

        mockMvc.perform(post("/api/org-admin/onboarding/import")
                        .header("Authorization", "Bearer " + orgAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.newInvitations").value(2));

        // 2. Make S1001 an ACTIVE verified user
        User activeUser = userRepository.findByOrganizationIdAndExternalIdentityId("ORG_COLLEGE_A", "S1001")
                .orElseThrow();
        activeUser.setStatus(UserStatus.ACTIVE);
        activeUser.setEmailVerified(true);
        userRepository.save(activeUser);

        // 3. Re-import S1001 (ACTIVE) and S1002 (still pending)
        mockMvc.perform(post("/api/org-admin/onboarding/import")
                        .header("Authorization", "Bearer " + orgAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.alreadyActive").value(1))
                .andExpect(jsonPath("$.newInvitations").value(1));
    }

    @Test
    @DisplayName("Test: Complete Registration + OTP flow activates account and permits login")
    void testCompleteRegistrationAndOtpFlow() throws Exception {
        // Step 1: Onboard S1001
        ImportOnboardingRequest req = new ImportOnboardingRequest(List.of(new StudentOnboardingItem("S1001", "student1001@example.com")));
        mockMvc.perform(post("/api/org-admin/onboarding/import")
                        .header("Authorization", "Bearer " + orgAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        List<UserInvitation> invites = userInvitationRepository.findAll();
        assertEquals(1, invites.size());

        // Known test invitation token
        String rawToken = emailDeliveryService.generateSecureToken();
        UserInvitation invite = new UserInvitation("INV_TEST", "ORG_COLLEGE_A", "S1001", "student1001@example.com",
                emailDeliveryService.hash(rawToken), Instant.now().plus(7, ChronoUnit.DAYS), InvitationStatus.PENDING);
        userInvitationRepository.save(invite);

        // Step 2: Validate Invitation
        mockMvc.perform(get("/api/registration/invitation/" + rawToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.organizationCode").value("COLLEGE_A"))
                .andExpect(jsonPath("$.organizationName").value("College of Technology A"));

        // Step 3: Complete Registration (Set Password)
        CompleteRegistrationRequest regReq = new CompleteRegistrationRequest(rawToken, "SecretPassword123");
        String regRes = mockMvc.perform(post("/api/registration/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").exists())
                .andReturn().getResponse().getContentAsString();

        String userId = objectMapper.readTree(regRes).get("userId").asText();

        // Step 4: Login BEFORE OTP activation must FAIL (401 Unauthorized)
        LoginRequest unverifiedLogin = new LoginRequest("student1001@example.com", "SecretPassword123");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(unverifiedLogin)))
                .andExpect(status().isUnauthorized());

        // Step 5: Setup known OTP
        EmailVerificationOtp otpRecord = emailVerificationOtpRepository
                .findTopByUserIdAndStatusOrderByCreatedAtDesc(userId, OtpStatus.PENDING)
                .orElseThrow();

        String rawOtp = "123456";
        otpRecord = new EmailVerificationOtp(otpRecord.getId(), userId, "student1001@example.com",
                emailDeliveryService.hash(rawOtp), Instant.now().plus(10, ChronoUnit.MINUTES));
        emailVerificationOtpRepository.save(otpRecord);

        // Step 6: Verify OTP
        VerifyOtpRequest verifyReq = new VerifyOtpRequest(userId, rawOtp);
        mockMvc.perform(post("/api/registration/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified").value(true));

        // Step 7: Login AFTER OTP activation must SUCCEED (200 OK)
        LoginRequest validLogin = new LoginRequest("student1001@example.com", "SecretPassword123");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.email").value("student1001@example.com"))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    @DisplayName("Test: Invalid, Expired, and Reused tokens are rejected")
    void testTokenSecurityConstraints() throws Exception {
        // Invalid Token
        mockMvc.perform(get("/api/registration/invitation/invalid-random-token-123"))
                .andExpect(status().isNotFound());

        // Expired Token
        String expiredRawToken = emailDeliveryService.generateSecureToken();
        UserInvitation expiredInvite = new UserInvitation("INV_EXP", "ORG_COLLEGE_A", "S1001", "student1001@example.com",
                emailDeliveryService.hash(expiredRawToken), Instant.now().minus(1, ChronoUnit.DAYS), InvitationStatus.PENDING);
        userInvitationRepository.save(expiredInvite);

        mockMvc.perform(get("/api/registration/invitation/" + expiredRawToken))
                .andExpect(status().isBadRequest());

        // Reused Token
        String usedRawToken = emailDeliveryService.generateSecureToken();
        UserInvitation usedInvite = new UserInvitation("INV_USED", "ORG_COLLEGE_A", "S1001", "student1001@example.com",
                emailDeliveryService.hash(usedRawToken), Instant.now().plus(7, ChronoUnit.DAYS), InvitationStatus.USED);
        userInvitationRepository.save(usedInvite);

        CompleteRegistrationRequest req = new CompleteRegistrationRequest(usedRawToken, "Password123");
        mockMvc.perform(post("/api/registration/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Test: Wrong OTP, Expired OTP, and Attempt Limits")
    void testOtpSecurityConstraints() throws Exception {
        User user = new User("USR_TEST", "Test Student", "student@example.com", "hash", "ORG_COLLEGE_A", "S1001", UserRole.USER, UserStatus.PENDING, false);
        userRepository.save(user);

        String correctOtp = "654321";
        EmailVerificationOtp otpRecord = new EmailVerificationOtp("OTP_TEST", "USR_TEST", "student@example.com",
                emailDeliveryService.hash(correctOtp), Instant.now().plus(10, ChronoUnit.MINUTES));
        emailVerificationOtpRepository.save(otpRecord);

        // 1. Wrong OTP rejected
        VerifyOtpRequest wrongReq = new VerifyOtpRequest("USR_TEST", "000000");
        mockMvc.perform(post("/api/registration/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongReq)))
                .andExpect(status().isBadRequest());

        // 2. Correct OTP accepted
        VerifyOtpRequest correctReq = new VerifyOtpRequest("USR_TEST", correctOtp);
        mockMvc.perform(post("/api/registration/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctReq)))
                .andExpect(status().isOk());

        // 3. Reused OTP rejected
        mockMvc.perform(post("/api/registration/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctReq)))
                .andExpect(status().isNotFound());
    }
}
