package com.depa.consent;

import com.depa.consent.dto.BridgeApproveConsentRequest;
import com.depa.consent.dto.BridgeDataRequest;
import com.depa.consent.dto.TokenValidationRequest;
import com.depa.consent.entity.*;
import com.depa.consent.repository.*;
import com.depa.consent.security.AssertionReplayTracker;
import com.depa.consent.security.DataAccessJwtSigner;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ConsentBridgeIntegrationTest {

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
    private ConsumedAssertionRepository consumedAssertionRepository;

    @Autowired
    private AssertionReplayTracker assertionReplayTracker;

    @Autowired
    private RsaKeyProvider rsaKeyProvider;

    @Autowired
    private DataAccessJwtSigner dataAccessJwtSigner;

    private RSAPrivateKey collegeAPrivateKey;
    private RSAPublicKey collegeAPublicKey;
    private String collegeAPublicKeyPem;

    @BeforeEach
    void setup() throws Exception {
        // Generate test RSA KeyPair for College A
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        KeyPair pair = gen.generateKeyPair();
        this.collegeAPrivateKey = (RSAPrivateKey) pair.getPrivate();
        this.collegeAPublicKey = (RSAPublicKey) pair.getPublic();

        String base64 = Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(collegeAPublicKey.getEncoded());
        this.collegeAPublicKeyPem = "-----BEGIN PUBLIC KEY-----\n" + base64 + "\n-----END PUBLIC KEY-----";

        String kidA = RsaKeyProvider.computeKeyId("COLLEGE_A", this.collegeAPublicKey);

        // Register/update Organization College A
        Organization orgA = organizationRepository.findByOrganizationCode("COLLEGE_A").orElse(null);
        if (orgA == null) {
            orgA = new Organization(
                    "ORG_COLLEGE_A",
                    "COLLEGE_A",
                    "College A University",
                    "contact@collegea.edu",
                    null, null, "http://localhost:8081",
                    collegeAPublicKeyPem,
                    "A-INTERNAL-SECRET-KEY",
                    OrganizationStatus.ACTIVE
            );
        } else {
            orgA.setPublicKey(collegeAPublicKeyPem);
            orgA.setCredentials("A-INTERNAL-SECRET-KEY");
            orgA.setStatus(OrganizationStatus.ACTIVE);
        }
        orgA.setKeyId(kidA);
        organizationRepository.save(orgA);

        // Register/update Organization College B
        Organization orgB = organizationRepository.findByOrganizationCode("COLLEGE_B").orElse(null);
        if (orgB == null) {
            orgB = new Organization(
                    "ORG_COLLEGE_B",
                    "COLLEGE_B",
                    "College B University",
                    "contact@collegeb.edu",
                    null, null, "http://localhost:8082",
                    null,
                    "B-INTERNAL-SECRET-KEY",
                    OrganizationStatus.ACTIVE
            );
        } else {
            orgB.setCredentials("B-INTERNAL-SECRET-KEY");
            orgB.setStatus(OrganizationStatus.ACTIVE);
        }
        organizationRepository.save(orgB);
    }

    private String createAssertion(String studentId, String action, String targetId, String jti, Instant exp) {
        return createAssertion(studentId, action, targetId, jti, exp, RsaKeyProvider.computeKeyId("COLLEGE_A", this.collegeAPublicKey), collegeAPrivateKey);
    }

    private String createAssertion(String studentId, String action, String targetId, String jti, Instant exp, String kid, RSAPrivateKey key) {
        Instant now = Instant.now();
        Instant expiry = exp != null ? exp : now.plusSeconds(300);

        Map<String, Object> claims = new HashMap<>();
        claims.put("orgCode", "COLLEGE_A");
        claims.put("role", "STUDENT");
        claims.put("action", action);
        claims.put("targetId", targetId != null ? targetId : "ALL");

        return Jwts.builder()
                .header()
                .keyId(kid)
                .and()
                .issuer("college-a")
                .audience().add("consent-manager").and()
                .subject(studentId)
                .claims(claims)
                .id(jti != null ? jti : UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key, Jwts.SIG.RS256)
                .compact();
    }

    @Test
    @DisplayName("Demonstration Points 1 to 10: Complete Student Consent Lifecycle via Bridge")
    void testCompleteConsentBridgeLifecycle() throws Exception {
        String studentId = "STU-TEST-001";

        // Step 1: College B initiates data request using backend credentials
        BridgeDataRequest initiateRequest = new BridgeDataRequest(
                studentId,
                "COLLEGE_A",
                "Evaluation for Inter-College Program",
                List.of("CGPA", "TRANSCRIPT")
        );
        initiateRequest.setInitiatorUserId("admin@collegeb.edu");

        String createResp = mockMvc.perform(post("/api/bridge/data-requests")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(initiateRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.requesterOrganizationCode").value("COLLEGE_B"))
                .andExpect(jsonPath("$.providerOrganizationCode").value("COLLEGE_A"))
                .andReturn().getResponse().getContentAsString();

        String dataRequestId = objectMapper.readTree(createResp).get("id").asText();

        // Verify ConsentRequest was generated
        ConsentRequest consentReq = consentRequestRepository.findByDataRequestId(dataRequestId).orElseThrow();
        String consentRequestId = consentReq.getId();
        assertEquals(ConsentRequestStatus.PENDING, consentReq.getStatus());
        assertEquals(studentId, consentReq.getDataPrincipalId());

        // Step 2: College A retrieves pending requests for the authenticated student using assertion
        String readAssertion = createAssertion(studentId, "READ_PENDING", null, UUID.randomUUID().toString(), null);

        mockMvc.perform(get("/api/bridge/consents/pending")
                        .header("X-Student-Assertion", readAssertion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.content[?(@.id == '" + consentRequestId + "')].dataPrincipalId").value(studentId));

        // Step 3: Student approves selected fields (CGPA only, omitting TRANSCRIPT)
        BridgeApproveConsentRequest approveReq = new BridgeApproveConsentRequest(List.of("CGPA"));
        String approveJti = UUID.randomUUID().toString();
        String approveAssertion = createAssertion(studentId, "APPROVE", consentRequestId, approveJti, null);

        String approveResp = mockMvc.perform(post("/api/bridge/consents/" + consentRequestId + "/approve")
                        .header("X-Student-Assertion", approveAssertion)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.approvedFields", hasSize(1)))
                .andExpect(jsonPath("$.approvedFields[0]").value("CGPA"))
                // Step 4 verification: College A receives ZERO Access JWT!
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        String consentId = objectMapper.readTree(approveResp).get("consentId").asText();

        // Step 5: Consumer College B securely retrieves its access token
        String grantResp = mockMvc.perform(get("/api/bridge/consumer/data-requests/" + dataRequestId + "/grant")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ready").value(true))
                .andExpect(jsonPath("$.grantId").exists())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.approvedFields", contains("CGPA")))
                .andReturn().getResponse().getContentAsString();

        String grantId = objectMapper.readTree(grantResp).get("grantId").asText();
        String accessToken = objectMapper.readTree(grantResp).get("accessToken").asText();
        assertNotNull(accessToken);

        // Verify Strict Isolation: College A CANNOT retrieve College B's grant
        mockMvc.perform(get("/api/bridge/consumer/data-requests/" + dataRequestId + "/grant")
                        .header("X-API-KEY", "A-INTERNAL-SECRET-KEY"))
                .andExpect(status().isForbidden());

        // Step 6 & 7: Validate Authoritative Grant Status with CM
        mockMvc.perform(get("/api/access-grants/" + grantId + "/validate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.approvedFields", contains("CGPA")));

        // Step 8: Student revokes consent
        String revokeAssertion = createAssertion(studentId, "REVOKE", consentId, UUID.randomUUID().toString(), null);
        mockMvc.perform(post("/api/bridge/consents/" + consentId + "/revoke")
                        .header("X-Student-Assertion", revokeAssertion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Step 9: Subsequent grant validation returns valid: false (Access Denied)
        mockMvc.perform(get("/api/access-grants/" + grantId + "/validate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.message", containsString("REVOKED")));
    }

    @Test
    @DisplayName("Demonstration Point 10: Rejection semantics guarantee NO grant is created")
    void testRejectionSemanticsPreventGrantCreation() throws Exception {
        String studentId = "STU-REJECT-001";

        // Create data request
        BridgeDataRequest req = new BridgeDataRequest(studentId, "COLLEGE_A", "Test Rejection", List.of("CGPA"));
        String createResp = mockMvc.perform(post("/api/bridge/data-requests")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String dataRequestId = objectMapper.readTree(createResp).get("id").asText();
        ConsentRequest consentReq = consentRequestRepository.findByDataRequestId(dataRequestId).orElseThrow();

        // Student rejects request
        String rejectAssertion = createAssertion(studentId, "REJECT", consentReq.getId(), UUID.randomUUID().toString(), null);
        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/reject")
                        .header("X-Student-Assertion", rejectAssertion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify status is REJECTED
        ConsentRequest updated = consentRequestRepository.findById(consentReq.getId()).orElseThrow();
        assertEquals(ConsentRequestStatus.REJECTED, updated.getStatus());

        DataRequest updatedDr = dataRequestRepository.findById(dataRequestId).orElseThrow();
        assertEquals(DataRequestStatus.REJECTED, updatedDr.getStatus());

        // Verify NO Consent record exists
        assertTrue(consentRepository.findByConsentRequestId(consentReq.getId()).isEmpty());

        // Verify consumer retrieval reports REJECTED and ready: false
        mockMvc.perform(get("/api/bridge/consumer/data-requests/" + dataRequestId + "/grant")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ready").value(false))
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    @DisplayName("Security: Reject assertion replay attack using duplicate jti")
    void testAssertionReplayRejection() throws Exception {
        String studentId = "STU-REPLAY-001";
        BridgeDataRequest req = new BridgeDataRequest(studentId, "COLLEGE_A", "Test Replay", List.of("CGPA"));
        String createResp = mockMvc.perform(post("/api/bridge/data-requests")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();

        String dataRequestId = objectMapper.readTree(createResp).get("id").asText();
        ConsentRequest consentReq = consentRequestRepository.findByDataRequestId(dataRequestId).orElseThrow();

        String reusedJti = "REPLAY-JTI-" + UUID.randomUUID();
        String assertion = createAssertion(studentId, "REJECT", consentReq.getId(), reusedJti, null);

        // First use: succeeds
        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/reject")
                        .header("X-Student-Assertion", assertion))
                .andExpect(status().isOk());

        // Second use of same jti: MUST be rejected with 403 Forbidden
        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/reject")
                        .header("X-Student-Assertion", assertion))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security: Reject field approval not in original requested field list")
    void testSubsetFieldValidationRejection() throws Exception {
        String studentId = "STU-SUBSET-001";
        BridgeDataRequest req = new BridgeDataRequest(studentId, "COLLEGE_A", "Test Subset", List.of("CGPA"));
        String createResp = mockMvc.perform(post("/api/bridge/data-requests")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();

        String dataRequestId = objectMapper.readTree(createResp).get("id").asText();
        ConsentRequest consentReq = consentRequestRepository.findByDataRequestId(dataRequestId).orElseThrow();

        // Student tries to approve CONDUCT_CERTIFICATE which was NOT requested
        BridgeApproveConsentRequest approveReq = new BridgeApproveConsentRequest(List.of("CGPA", "CONDUCT_CERTIFICATE"));
        String assertion = createAssertion(studentId, "APPROVE", consentReq.getId(), UUID.randomUUID().toString(), null);

        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/approve")
                        .header("X-Student-Assertion", assertion)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Security: Reject unauthenticated data request initiation")
    void testUnauthenticatedDataRequestRejected() throws Exception {
        BridgeDataRequest req = new BridgeDataRequest("STU-1", "COLLEGE_A", "Test", List.of("CGPA"));

        mockMvc.perform(post("/api/bridge/data-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/bridge/data-requests")
                        .header("X-API-KEY", "INVALID-KEY-123")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST Migration: Invitation validation via POST with JSON body")
    void testInvitationValidateViaPost() throws Exception {
        TokenValidationRequest request = new TokenValidationRequest("non-existent-token");

        mockMvc.perform(post("/api/registration/invitation/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Idempotency: Repeated approval submissions cannot create duplicate grants")
    void testIdempotentApprovalRetryCannotCreateDuplicateGrants() throws Exception {
        String studentId = "STU-IDEMPOTENT-001";
        BridgeDataRequest req = new BridgeDataRequest(studentId, "COLLEGE_A", "Test Idempotency", List.of("CGPA"));
        String createResp = mockMvc.perform(post("/api/bridge/data-requests")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();

        String dataRequestId = objectMapper.readTree(createResp).get("id").asText();
        ConsentRequest consentReq = consentRequestRepository.findByDataRequestId(dataRequestId).orElseThrow();

        BridgeApproveConsentRequest approveReq = new BridgeApproveConsentRequest(List.of("CGPA"));

        // First approval
        String assertion1 = createAssertion(studentId, "APPROVE", consentReq.getId(), UUID.randomUUID().toString(), null);
        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/approve")
                        .header("X-Student-Assertion", assertion1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // Second approval (retry with fresh JTI)
        String assertion2 = createAssertion(studentId, "APPROVE", consentReq.getId(), UUID.randomUUID().toString(), null);
        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/approve")
                        .header("X-Student-Assertion", assertion2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.message", containsString("idempotent")));

        // Verify that exactly ONE Consent and exactly ONE AccessGrant exist
        List<Consent> consents = consentRepository.findAll().stream()
                .filter(c -> c.getConsentRequestId().equals(consentReq.getId()))
                .toList();
        assertEquals(1, consents.size(), "Exactly 1 Consent record must exist");

        List<AccessGrant> grants = accessGrantRepository.findByConsentId(consents.get(0).getId());
        assertEquals(1, grants.size(), "Exactly 1 AccessGrant record must exist - no duplicate grants");
    }

    @Test
    @DisplayName("Key Lifecycle: Rejection of assertion with unknown or outdated key ID")
    void testUnknownKeyIdRejected() throws Exception {
        String studentId = "STU-UNKNOWN-KID-001";
        BridgeDataRequest req = new BridgeDataRequest(studentId, "COLLEGE_A", "Test Unknown Kid", List.of("CGPA"));
        String createResp = mockMvc.perform(post("/api/bridge/data-requests")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();

        String dataRequestId = objectMapper.readTree(createResp).get("id").asText();
        ConsentRequest consentReq = consentRequestRepository.findByDataRequestId(dataRequestId).orElseThrow();

        // Sign assertion using unregistered/unknown kid
        String assertion = createAssertion(studentId, "REJECT", consentReq.getId(), UUID.randomUUID().toString(), null, "UNKNOWN_KID_999", collegeAPrivateKey);

        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/reject")
                        .header("X-Student-Assertion", assertion))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Key Lifecycle: Key rotation registers new key and safely rejects stale key ID")
    void testKeyRotationAndStaleKeyRejection() throws Exception {
        String studentId = "STU-ROTATION-001";

        // Generate a new RSA KeyPair simulating College A key rotation
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        KeyPair rotatedPair = gen.generateKeyPair();
        RSAPrivateKey rotatedPriv = (RSAPrivateKey) rotatedPair.getPrivate();
        RSAPublicKey rotatedPub = (RSAPublicKey) rotatedPair.getPublic();
        String rotatedBase64 = Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(rotatedPub.getEncoded());
        String rotatedPem = "-----BEGIN PUBLIC KEY-----\n" + rotatedBase64 + "\n-----END PUBLIC KEY-----";
        String rotatedKid = RsaKeyProvider.computeKeyId("COLLEGE_A", rotatedPub);

        // Create data request
        BridgeDataRequest req = new BridgeDataRequest(studentId, "COLLEGE_A", "Test Rotation", List.of("CGPA"));
        String createResp = mockMvc.perform(post("/api/bridge/data-requests")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();

        String dataRequestId = objectMapper.readTree(createResp).get("id").asText();
        ConsentRequest consentReq = consentRequestRepository.findByDataRequestId(dataRequestId).orElseThrow();

        // 1. Assertion with rotated key BEFORE registration must be REJECTED (CM has old key)
        String prematureAssertion = createAssertion(studentId, "REJECT", consentReq.getId(), UUID.randomUUID().toString(), null, rotatedKid, rotatedPriv);
        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/reject")
                        .header("X-Student-Assertion", prematureAssertion))
                .andExpect(status().isForbidden());

        // 2. Register rotated key via authenticated endpoint POST /api/bridge/organizations/public-key
        Map<String, String> regBody = Map.of("publicKey", rotatedPem, "keyId", rotatedKid);
        mockMvc.perform(post("/api/bridge/organizations/public-key")
                        .header("X-API-KEY", "A-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 3. Assertion with new rotated key now SUCCEEDS
        String validRotatedAssertion = createAssertion(studentId, "REJECT", consentReq.getId(), UUID.randomUUID().toString(), null, rotatedKid, rotatedPriv);
        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/reject")
                        .header("X-Student-Assertion", validRotatedAssertion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 4. In-flight assertion using previous key is still accepted during rotation overlap window
        String overlapAssertion = createAssertion(studentId, "REJECT", consentReq.getId(), UUID.randomUUID().toString(), null);
        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/reject")
                        .header("X-Student-Assertion", overlapAssertion))
                .andExpect(status().isOk());

        // 5. Outdated assertion using unknown key ID outside overlap window must be REJECTED
        String outdatedAssertion = createAssertion(studentId, "REJECT", consentReq.getId(), UUID.randomUUID().toString(), null, "COLLEGE_A_KEY_SUPERSEDED_OLD", collegeAPrivateKey);
        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/reject")
                        .header("X-Student-Assertion", outdatedAssertion))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Key Rotation: Previous key is strictly rejected after expiration of the overlap window")
    void testPreviousKeyRejectedAfterExpiration() throws Exception {
        String studentId = "STU-EXPIRED-PREV-KEY-001";

        // 1. Create a data request
        BridgeDataRequest req = new BridgeDataRequest(studentId, "COLLEGE_A", "Test Overlap Expiry", List.of("CGPA"));
        String createResp = mockMvc.perform(post("/api/bridge/data-requests")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();

        String dataRequestId = objectMapper.readTree(createResp).get("id").asText();
        ConsentRequest consentReq = consentRequestRepository.findByDataRequestId(dataRequestId).orElseThrow();

        // 2. Rotate to a new RSA key pair, setting overlapSeconds to -10 (already expired)
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        KeyPair newPair = gen.generateKeyPair();
        RSAPublicKey newPub = (RSAPublicKey) newPair.getPublic();
        String newBase64 = Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(newPub.getEncoded());
        String newPem = "-----BEGIN PUBLIC KEY-----\n" + newBase64 + "\n-----END PUBLIC KEY-----";
        String newKid = RsaKeyProvider.computeKeyId("COLLEGE_A", newPub);

        Map<String, String> regBody = Map.of(
                "publicKey", newPem,
                "keyId", newKid,
                "overlapSeconds", "-10" // Expiration in the past
        );
        mockMvc.perform(post("/api/bridge/organizations/public-key")
                        .header("X-API-KEY", "A-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regBody)))
                .andExpect(status().isOk());

        // 3. Attempt to submit an assertion using previous key (collegeAPrivateKey with old kid)
        // Must be REJECTED with 403 Forbidden because overlap window has expired
        String expiredPrevKeyAssertion = createAssertion(studentId, "REJECT", consentReq.getId(), UUID.randomUUID().toString(), null);
        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/reject")
                        .header("X-Student-Assertion", expiredPrevKeyAssertion))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Replay Protection: Consumed assertion is persisted in database and rejected across simulated restart")
    void testReplayRejectionPersistsInDatabase() throws Exception {
        String studentId = "STU-DB-REPLAY-001";
        BridgeDataRequest req = new BridgeDataRequest(studentId, "COLLEGE_A", "Test DB Replay", List.of("CGPA"));
        String createResp = mockMvc.perform(post("/api/bridge/data-requests")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();

        String dataRequestId = objectMapper.readTree(createResp).get("id").asText();
        ConsentRequest consentReq = consentRequestRepository.findByDataRequestId(dataRequestId).orElseThrow();

        String persistentJti = "PERSISTENT-JTI-" + UUID.randomUUID();
        String assertion = createAssertion(studentId, "REJECT", consentReq.getId(), persistentJti, null);

        // First consume: succeeds
        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/reject")
                        .header("X-Student-Assertion", assertion))
                .andExpect(status().isOk());

        // Verify record is saved in database entity ConsumedAssertion
        assertTrue(consumedAssertionRepository.existsById(persistentJti), "Consumed JTI must be saved in database table");

        // Replay attempt (simulating restart where DB holds the state): MUST be rejected
        mockMvc.perform(post("/api/bridge/consents/" + consentReq.getId() + "/reject")
                        .header("X-Student-Assertion", assertion))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Replay Protection: Concurrent duplicate JTI insertion blocked by database uniqueness")
    void testConcurrentDuplicateJtiBlockedByDatabase() {
        String jti = "CONCURRENT-JTI-" + UUID.randomUUID();

        // First insertion succeeds
        boolean first = assertionReplayTracker.checkAndConsume(jti, "STU-1", "ORG_1", "APPROVE", "CREQ_1", Instant.now().plusSeconds(300));
        assertTrue(first, "First assertion consumption must succeed");

        // Concurrent/second insertion with exact same JTI must fail at database level
        boolean second = assertionReplayTracker.checkAndConsume(jti, "STU-1", "ORG_1", "APPROVE", "CREQ_1", Instant.now().plusSeconds(300));
        assertFalse(second, "Second assertion consumption with same JTI must be rejected by database uniqueness");
    }

    @Test
    @DisplayName("Key Lifecycle: CM restart retains persistent RSA key and validates existing Access JWT")
    void testCmRestartValidatesExistingAccessJwt() {
        // 1. Generate an Access JWT before CM restart
        String grantId = "GRNT_PERSIST_01";
        String studentId = "STU_PERSIST_001";
        List<String> scope = List.of("STUDENT_ID", "NAME", "CGPA");
        String accessJwt = dataAccessJwtSigner.generateDataAccessJwt("COLLEGE_B", "COLLEGE_A", grantId, studentId, "Academic Review", scope, null);
        assertNotNull(accessJwt);

        // 2. Simulate CM restart by instantiating a new RsaKeyProvider from same persistent directory
        RsaKeyProvider reloadedKeyProvider = new RsaKeyProvider("./keys");

        // Key ID and public key bytes must remain identical across restarts
        assertEquals(rsaKeyProvider.getKeyId(), reloadedKeyProvider.getKeyId(), "Key ID must persist across CM restarts");
        assertEquals(rsaKeyProvider.getPublicKeyPem(), reloadedKeyProvider.getPublicKeyPem(), "Public key PEM must persist across CM restarts");

        // 3. Verify existing token validates successfully using the reloaded key provider
        var claims = io.jsonwebtoken.Jwts.parser()
                .verifyWith(reloadedKeyProvider.getPublicKey())
                .requireIssuer("consent-manager")
                .requireAudience("COLLEGE_A")
                .build()
                .parseSignedClaims(accessJwt)
                .getPayload();

        assertEquals("COLLEGE_B", claims.getSubject());
        assertEquals(grantId, claims.get("grant_id"));
        assertEquals(studentId, claims.get("data_principal_id"));
    }
}
