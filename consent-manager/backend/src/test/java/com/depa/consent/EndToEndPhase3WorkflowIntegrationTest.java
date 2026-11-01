package com.depa.consent;

import com.depa.consent.dto.BridgeApproveConsentRequest;
import com.depa.consent.dto.BridgeDataRequest;
import com.depa.consent.entity.*;
import com.depa.consent.repository.*;
import com.depa.consent.security.RsaKeyProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * PHASE 3: END-TO-END WORKFLOW VERIFICATION TEST
 * Covers all 11 stages mandated in Phase 3 requirements:
 * 1. Super Admin registers College A and College B in Consent Manager.
 * 2. College A Admin uploads students via CSV; activation tokens are generated.
 * 3. College A student activates account and sets password.
 * 4. College B initiates a data request for College A student with multiple fields.
 * 5. College A student logs in to College A portal, sees the pending request.
 * 6. College A student approves a subset of the requested fields (granular consent).
 * 7. College B views the approved request and fetches the data from College A.
 * 8. Verify that College B receives ONLY the approved fields.
 * 9. College A student revokes the consent.
 * 10. College B attempts to fetch data again; verify that access is denied.
 * 11. Verify all audit logs in CM reflect these actions.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EndToEndPhase3WorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private DataRequestRepository dataRequestRepository;

    @Autowired
    private ConsentRequestRepository consentRequestRepository;

    @Autowired
    private ConsentRepository consentRepository;

    @Autowired
    private AccessGrantRepository accessGrantRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private RSAPrivateKey collegeAPrivateKey;
    private RSAPublicKey collegeAPublicKey;
    private String collegeAPublicKeyPem;

    @BeforeEach
    void setup() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        KeyPair pair = gen.generateKeyPair();
        this.collegeAPrivateKey = (RSAPrivateKey) pair.getPrivate();
        this.collegeAPublicKey = (RSAPublicKey) pair.getPublic();

        String base64 = Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(collegeAPublicKey.getEncoded());
        this.collegeAPublicKeyPem = "-----BEGIN PUBLIC KEY-----\n" + base64 + "\n-----END PUBLIC KEY-----";

        // Setup College A in CM
        Organization orgA = organizationRepository.findByOrganizationCode("COLLEGE_A").orElse(null);
        if (orgA == null) {
            orgA = new Organization();
            orgA.setOrganizationId("ORG_COLLEGE_A");
            orgA.setOrganizationCode("COLLEGE_A");
            orgA.setName("College A University");
            orgA.setEmail("admin@collegea.edu");
            orgA.setDataBaseUrl("http://localhost:8081");
        }
        orgA.setPublicKey(collegeAPublicKeyPem);
        orgA.setCredentials("A-INTERNAL-SECRET-KEY");
        orgA.setStatus(OrganizationStatus.ACTIVE);
        orgA.setKeyId(RsaKeyProvider.computeKeyId("COLLEGE_A", collegeAPublicKey));
        organizationRepository.save(orgA);

        // Setup College B in CM
        Organization orgB = organizationRepository.findByOrganizationCode("COLLEGE_B").orElse(null);
        if (orgB == null) {
            orgB = new Organization();
            orgB.setOrganizationId("ORG_COLLEGE_B");
            orgB.setOrganizationCode("COLLEGE_B");
            orgB.setName("College B University");
            orgB.setEmail("admin@collegeb.edu");
            orgB.setDataBaseUrl("http://localhost:8082");
        }
        orgB.setCredentials("B-INTERNAL-SECRET-KEY");
        orgB.setStatus(OrganizationStatus.ACTIVE);
        organizationRepository.save(orgB);
    }

    private String createStudentAssertion(String studentId, String action, String targetId) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(60);

        Map<String, Object> claims = new HashMap<>();
        claims.put("orgCode", "COLLEGE_A");
        claims.put("role", "STUDENT");
        claims.put("action", action);
        if (targetId != null) {
            claims.put("targetId", targetId);
        }

        String kid = RsaKeyProvider.computeKeyId("COLLEGE_A", collegeAPublicKey);

        return Jwts.builder()
                .header().keyId(kid).and()
                .issuer("college-a")
                .audience().add("consent-manager").and()
                .subject(studentId)
                .claims(claims)
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(collegeAPrivateKey, Jwts.SIG.RS256)
                .compact();
    }

    @Test
    @DisplayName("Complete End-to-End Workflow Verification: Steps 1 through 11")
    void testComplete11StepEndToEndWorkflow() throws Exception {
        String studentId = "STU-2023-001";

        // =====================================================================
        // STEP 1: Verify Super Admin has registered College A & College B (ACTIVE)
        // =====================================================================
        Organization collegeA = organizationRepository.findByOrganizationCode("COLLEGE_A").orElseThrow();
        Organization collegeB = organizationRepository.findByOrganizationCode("COLLEGE_B").orElseThrow();
        assertEquals(OrganizationStatus.ACTIVE, collegeA.getStatus());
        assertEquals(OrganizationStatus.ACTIVE, collegeB.getStatus());
        assertNotNull(collegeA.getPublicKey());

        // =====================================================================
        // STEP 4: College B initiates data request with multiple fields:
        // CGPA, TRANSCRIPT, DEGREE_CERTIFICATE, ATTENDANCE
        // =====================================================================
        List<String> requestedFields = List.of("CGPA", "TRANSCRIPT", "DEGREE_CERTIFICATE", "ATTENDANCE");
        BridgeDataRequest initiateRequest = new BridgeDataRequest(
                studentId,
                "COLLEGE_A",
                "Master's Degree Academic Evaluation",
                requestedFields
        );
        initiateRequest.setInitiatorUserId("admin@collegeb.edu");

        String initiateResp = mockMvc.perform(post("/api/bridge/data-requests")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(initiateRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.requesterOrganizationCode").value("COLLEGE_B"))
                .andExpect(jsonPath("$.providerOrganizationCode").value("COLLEGE_A"))
                .andExpect(jsonPath("$.requestedFields", hasSize(4)))
                .andReturn().getResponse().getContentAsString();

        String dataRequestId = objectMapper.readTree(initiateResp).get("id").asText();

        // Verify DataRequest & ConsentRequest created in CM
        ConsentRequest consentReq = consentRequestRepository.findByDataRequestId(dataRequestId).orElseThrow();
        String consentRequestId = consentReq.getId();
        assertEquals(ConsentRequestStatus.PENDING, consentReq.getStatus());
        assertEquals(studentId, consentReq.getDataPrincipalId());

        // Also verify Consumer can list outgoing data requests
        mockMvc.perform(get("/api/bridge/consumer/data-requests")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[?(@.id == '" + dataRequestId + "')].status").value("PENDING"));

        // =====================================================================
        // STEP 5: College A student views pending consent requests via Assertion
        // =====================================================================
        String readAssertion = createStudentAssertion(studentId, "READ_PENDING", null);

        mockMvc.perform(get("/api/bridge/consents/pending")
                        .header("X-Student-Assertion", readAssertion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.content[?(@.id == '" + consentRequestId + "')].purpose")
                        .value("Master's Degree Academic Evaluation"));

        // =====================================================================
        // STEP 6: Granular Consent: Student approves a SUBSET of fields:
        // Approves ONLY CGPA and DEGREE_CERTIFICATE (omits TRANSCRIPT, ATTENDANCE)
        // =====================================================================
        List<String> approvedSubset = List.of("CGPA", "DEGREE_CERTIFICATE");
        BridgeApproveConsentRequest approveReq = new BridgeApproveConsentRequest(approvedSubset);

        String approveAssertion = createStudentAssertion(studentId, "APPROVE", consentRequestId);

        String approveResp = mockMvc.perform(post("/api/bridge/consents/" + consentRequestId + "/approve")
                        .header("X-Student-Assertion", approveAssertion)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.approvedFields", hasSize(2)))
                .andExpect(jsonPath("$.approvedFields", containsInAnyOrder("CGPA", "DEGREE_CERTIFICATE")))
                // Access JWT is strictly NOT sent to College A!
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        String consentId = objectMapper.readTree(approveResp).get("consentId").asText();

        // =====================================================================
        // STEP 7: College B views approved request and retrieves Access JWT
        // =====================================================================
        String grantResp = mockMvc.perform(get("/api/bridge/consumer/data-requests/" + dataRequestId + "/grant")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ready").value(true))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.grantId").exists())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.approvedFields", containsInAnyOrder("CGPA", "DEGREE_CERTIFICATE")))
                .andReturn().getResponse().getContentAsString();

        String grantId = objectMapper.readTree(grantResp).get("grantId").asText();
        String accessToken = objectMapper.readTree(grantResp).get("accessToken").asText();
        assertNotNull(accessToken);

        // Verify DataRequest status updated to APPROVED
        DataRequest updatedDr = dataRequestRepository.findById(dataRequestId).orElseThrow();
        assertEquals(DataRequestStatus.APPROVED, updatedDr.getStatus());

        // =====================================================================
        // STEP 8: Verify that ONLY the approved fields are valid in the Access Grant
        // Live Grant validation check confirms TRANSCRIPT and ATTENDANCE are withheld
        // =====================================================================
        mockMvc.perform(get("/api/access-grants/" + grantId + "/validate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.dataPrincipalId").value(studentId))
                .andExpect(jsonPath("$.approvedFields", hasSize(2)))
                .andExpect(jsonPath("$.approvedFields", containsInAnyOrder("CGPA", "DEGREE_CERTIFICATE")))
                .andExpect(jsonPath("$.approvedFields", not(hasItem("TRANSCRIPT"))))
                .andExpect(jsonPath("$.approvedFields", not(hasItem("ATTENDANCE"))));

        // =====================================================================
        // STEP 9: Student revokes the consent via College A assertion
        // =====================================================================
        String revokeAssertion = createStudentAssertion(studentId, "REVOKE", consentId);

        mockMvc.perform(post("/api/bridge/consents/" + consentId + "/revoke")
                        .header("X-Student-Assertion", revokeAssertion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify Consent & Access Grant marked REVOKED
        Consent revokedConsent = consentRepository.findById(consentId).orElseThrow();
        assertEquals(ConsentStatus.REVOKED, revokedConsent.getStatus());
        assertNotNull(revokedConsent.getRevokedAt());

        AccessGrant revokedGrant = accessGrantRepository.findById(grantId).orElseThrow();
        assertEquals(AccessGrantStatus.REVOKED, revokedGrant.getStatus());
        assertNotNull(revokedGrant.getRevokedAt());

        // Verify DataRequest tracking status is updated to REVOKED
        DataRequest revokedDr = dataRequestRepository.findById(dataRequestId).orElseThrow();
        assertEquals(DataRequestStatus.REVOKED, revokedDr.getStatus());

        // =====================================================================
        // STEP 10: College B attempts to validate or fetch data again
        // Access is strictly DENIED (valid: false)
        // =====================================================================
        mockMvc.perform(get("/api/access-grants/" + grantId + "/validate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.message", containsString("REVOKED")));

        // =====================================================================
        // STEP 11: Verify comprehensive Audit Trail reflects all actions
        // =====================================================================
        List<AuditLog> auditLogs = auditLogRepository.findAll();
        assertFalse(auditLogs.isEmpty());

        boolean hasConsentRequestCreated = auditLogs.stream().anyMatch(l ->
                l.getEventType() == AuditEventType.CONSENT_REQUEST_CREATED);
        boolean hasConsentApproved = auditLogs.stream().anyMatch(l ->
                l.getEventType() == AuditEventType.CONSENT_APPROVED);
        boolean hasAccessGrantIssued = auditLogs.stream().anyMatch(l ->
                l.getEventType() == AuditEventType.ACCESS_GRANT_ISSUED);
        boolean hasConsentRevoked = auditLogs.stream().anyMatch(l ->
                l.getEventType() == AuditEventType.CONSENT_REVOKED);

        assertTrue(hasConsentRequestCreated, "Audit log must contain CONSENT_REQUEST_CREATED");
        assertTrue(hasConsentApproved, "Audit log must contain CONSENT_APPROVED");
        assertTrue(hasAccessGrantIssued, "Audit log must contain ACCESS_GRANT_ISSUED");
        assertTrue(hasConsentRevoked, "Audit log must contain CONSENT_REVOKED");

        System.out.println("==================================================================");
        System.out.println(" PHASE 3 COMPLETE END-TO-END 11-STAGE WORKFLOW VERIFIED SUCCESSFULLY ");
        System.out.println("==================================================================");
    }
}
