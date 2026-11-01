package com.depa.provider;

import com.depa.provider.client.ConsentManagerClient;
import com.depa.provider.dto.ApproveConsentRequest;
import com.depa.provider.dto.ConsentDecisionResponse;
import com.depa.provider.dto.GrantValidationResult;
import com.depa.provider.dto.TokenValidationRequest;
import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;
import com.depa.provider.repository.StudentRepository;
import com.depa.provider.security.CollegeAJwtUtil;
import com.depa.provider.security.CollegeAUserPrincipal;
import com.depa.provider.security.CollegeAssertionKeyPairProvider;
import com.depa.provider.service.AuthorizedDataService;
import com.depa.provider.service.CollegeStudentConsentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CollegeAConsentBridgeTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CollegeAJwtUtil jwtUtil;

    @Autowired
    private CollegeStudentConsentService studentConsentService;

    @Autowired
    private AuthorizedDataService authorizedDataService;

    @Autowired
    private com.depa.provider.security.CollegeAssertionKeyPairProvider keyPairProvider;

    @MockBean
    private ConsentManagerClient consentManagerClient;

    private Student activeStudent;
    private String studentToken;

    @BeforeEach
    void setup() {
        studentRepository.deleteAll();

        activeStudent = new Student(
                "STU-BRIDGE-001",
                "Alice In Wonderland",
                "alice@collegea.edu",
                StudentStatus.ACTIVE,
                "Enrolled",
                "Computer Science",
                "3.95",
                "Sem 1: 3.9 GPA",
                "Bachelor of Technology in CS",
                passwordEncoder.encode("Password@123")
        );
        studentRepository.save(activeStudent);

        studentToken = jwtUtil.generateStudentToken(
                activeStudent.getStudentId(),
                activeStudent.getEmail(),
                "COLLEGE_A",
                activeStudent.getName()
        );
    }

    @Test
    @DisplayName("College A: Student retrieves pending consent requests via bridge")
    void testGetPendingConsents() throws Exception {
        String mockCmResponse = """
                [
                  {
                    "id": "CREQ_TEST_01",
                    "dataRequestId": "DREQ_TEST_01",
                    "requesterOrganizationCode": "COLLEGE_B",
                    "requesterOrganizationName": "College B University",
                    "purpose": "Academic Exchange",
                    "requestedFields": ["CGPA", "TRANSCRIPT"],
                    "status": "PENDING",
                    "createdAt": "2026-10-30T10:00:00Z",
                    "expiresAt": "2026-11-06T10:00:00Z"
                  }
                ]
                """;

        when(consentManagerClient.getPendingConsentRequestsRaw(anyString())).thenReturn(mockCmResponse);

        mockMvc.perform(get("/api/student/consents/pending")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value("CREQ_TEST_01"))
                .andExpect(jsonPath("$[0].requesterOrganizationCode").value("COLLEGE_B"))
                .andExpect(jsonPath("$[0].requestedFields", contains("CGPA", "TRANSCRIPT")));
    }

    @Test
    @DisplayName("College A: Student approves consent with field selection (Zero Token Leakage)")
    void testApproveConsentZeroTokenLeakage() throws Exception {
        ConsentDecisionResponse mockDecision = new ConsentDecisionResponse(
                true,
                "Consent approved successfully",
                "CNS_TEST_01",
                "APPROVED",
                List.of("CGPA"),
                Instant.now().plusSeconds(86400)
        );

        when(consentManagerClient.approveConsent(eq("CREQ_TEST_01"), eq(List.of("CGPA")), anyString()))
                .thenReturn(mockDecision);

        ApproveConsentRequest approveReq = new ApproveConsentRequest(List.of("CGPA"));

        mockMvc.perform(post("/api/student/consents/CREQ_TEST_01/approve")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.approvedFields", contains("CGPA")))
                // Strict requirement: College A & Student NEVER receive the Access Token!
                .andExpect(jsonPath("$.accessToken").doesNotExist());
    }

    @Test
    @DisplayName("College A: Student rejects consent request")
    void testRejectConsent() throws Exception {
        when(consentManagerClient.rejectConsent(eq("CREQ_TEST_01"), anyString()))
                .thenReturn(Map.of("success", true, "message", "Consent request rejected successfully"));

        mockMvc.perform(post("/api/student/consents/CREQ_TEST_01/reject")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("College A: Student revokes active consent")
    void testRevokeConsent() throws Exception {
        when(consentManagerClient.revokeConsent(eq("CNS_TEST_01"), anyString()))
                .thenReturn(Map.of("success", true, "message", "Consent revoked successfully"));

        mockMvc.perform(post("/api/student/consents/CNS_TEST_01/revoke")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("College A: Service layer ownership enforcement prevents unauthenticated or cross-student access")
    void testServiceLayerOwnershipEnforcement() {
        CollegeAUserPrincipal spoofedPrincipal = new CollegeAUserPrincipal(
                "NON_EXISTENT",
                "attacker@collegea.edu",
                "COLLEGE_A",
                "STUDENT",
                List.of("student:read"),
                "STU-NON-EXISTENT"
        );

        assertThrows(AccessDeniedException.class, () ->
                studentConsentService.getPendingConsents(spoofedPrincipal)
        );

        assertThrows(AccessDeniedException.class, () ->
                studentConsentService.approveConsent("CREQ_1", List.of("CGPA"), spoofedPrincipal)
        );
    }

    @Test
    @DisplayName("Authoritative CM Check: Denies access when grant is revoked in CM")
    void testAuthoritativeGrantDenialOnRevocation() {
        GrantValidationResult invalidResult = new GrantValidationResult();
        invalidResult.setValid(false);
        invalidResult.setMessage("Consent has been REVOKED");
        when(consentManagerClient.validateGrantLive(eq("GRNT_REVOKED"))).thenReturn(invalidResult);

        // When College A receives a request for a revoked grant, it must throw SecurityException
        assertThrows(SecurityException.class, () ->
                authorizedDataService.fetchAuthorizedData("GRNT_REVOKED", "mock.jwt.token")
        );
    }

    @Test
    @DisplayName("POST Migration: Activation token validation via POST with JSON body")
    void testPostActivationValidation() throws Exception {
        TokenValidationRequest req = new TokenValidationRequest("non-existent-hash");

        mockMvc.perform(post("/api/auth/activation/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or already used activation token"));

        // Former GET endpoint accepting raw token query param is removed
        mockMvc.perform(get("/api/auth/activation/validate?token=non-existent-hash"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @DisplayName("Key Lifecycle: College A restart syncs current public key and keyId to Consent Manager")
    void testCollegeARestartRegistersCurrentPublicKey() {
        when(consentManagerClient.syncAssertionPublicKey(anyString(), anyString(), anyString())).thenReturn(true);

        studentConsentService.init();

        verify(consentManagerClient, atLeastOnce()).syncAssertionPublicKey(
                eq(keyPairProvider.getPublicKeyPem()),
                eq(keyPairProvider.getKeyId()),
                anyString()
        );
    }

    @Test
    @DisplayName("Key Lifecycle: College A restart reloads persistent RSA keys and generates valid signed assertions")
    void testCollegeARestartAssertionSigning() {
        // 1. Simulate restart by reloading KeyPairProvider from same keys directory
        CollegeAssertionKeyPairProvider reloadedProvider = new CollegeAssertionKeyPairProvider("COLLEGE_A", "college-a", "./keys");

        assertEquals(keyPairProvider.getKeyId(), reloadedProvider.getKeyId(), "Key ID must persist across College A restarts");
        assertEquals(keyPairProvider.getPublicKeyPem(), reloadedProvider.getPublicKeyPem(), "Public key PEM must persist across College A restarts");

        // 2. Sign assertion with reloaded provider
        String token = reloadedProvider.signStudentAssertion("STU-BRIDGE-001", "APPROVE", "CREQ_TEST_01");
        assertNotNull(token);

        // 3. Cryptographically verify signature and claims
        Claims claims = io.jsonwebtoken.Jwts.parser()
                .verifyWith(reloadedProvider.getPublicKey())
                .requireIssuer("college-a")
                .requireAudience("consent-manager")
                .build()
                .parseSignedClaims(token)
                .getPayload();

        assertEquals("COLLEGE_A", claims.get("orgCode"));
        assertEquals("STUDENT", claims.get("role"));
        assertEquals("APPROVE", claims.get("action"));
        assertEquals("CREQ_TEST_01", claims.get("targetId"));
        assertEquals("STU-BRIDGE-001", claims.getSubject());
    }
}
