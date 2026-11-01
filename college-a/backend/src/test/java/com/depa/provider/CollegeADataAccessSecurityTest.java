package com.depa.provider;

import com.depa.provider.client.ConsentManagerClient;
import com.depa.provider.dto.GrantValidationResult;
import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;
import com.depa.provider.repository.StudentRepository;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CollegeADataAccessSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StudentRepository studentRepository;

    @MockBean
    private ConsentManagerClient consentManagerClient;

    private RSAPrivateKey privateKey;
    private RSAPublicKey publicKey;
    private final String cmKid = "CM_KEY_VALID_01";

    @BeforeEach
    void setUp() throws Exception {
        // Generate ephemeral RSA keypair simulating Consent Manager
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        KeyPair pair = gen.generateKeyPair();
        this.privateKey = (RSAPrivateKey) pair.getPrivate();
        this.publicKey = (RSAPublicKey) pair.getPublic();

        when(consentManagerClient.getCmPublicKey()).thenReturn(publicKey);
        when(consentManagerClient.getCachedCmKeyId()).thenReturn(cmKid);

        // Ensure Student S1001 exists in DB
        studentRepository.deleteAll();
        Student s1001 = new Student("S1001", "Ashok Mugada", "student1001@example.com", StudentStatus.ACTIVE, "Certified B.Tech Degree");
        studentRepository.save(s1001);
    }

    private String createTestAccessJwt(String grantId, String studentId, List<String> scope, boolean expired) {
        return createTestAccessJwt(grantId, studentId, scope, expired, cmKid, privateKey);
    }

    private String createTestAccessJwt(String grantId, String studentId, List<String> scope, boolean expired, String kid, RSAPrivateKey signingKey) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("grant_id", grantId);
        claims.put("data_principal_id", studentId);
        claims.put("purpose", "Academic verification");
        claims.put("scope", scope);

        Date now = new Date();
        Date expiry = expired
                ? new Date(now.getTime() - 10000)
                : new Date(now.getTime() + 3600000);

        return Jwts.builder()
                .header()
                .keyId(kid)
                .and()
                .issuer("consent-manager")
                .subject("COLLEGE_B")
                .audience().add("COLLEGE_A").and()
                .claims(claims)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey, Jwts.SIG.RS256)
                .compact();
    }

    @Test
    @DisplayName("Valid RS256 JWT + Active Live Grant -> Returns Only Authorized Canonical Fields")
    void testAuthorizedDirectDataAccess() throws Exception {
        String grantId = "GRNT_1001";
        String accessJwt = createTestAccessJwt(grantId, "S1001", List.of("STUDENT_ID", "NAME", "STUDY_CERTIFICATE"), false);

        GrantValidationResult liveResult = new GrantValidationResult();
        liveResult.setValid(true);
        liveResult.setGrantId(grantId);
        liveResult.setDataPrincipalId("S1001");
        liveResult.setApprovedFields(List.of("STUDENT_ID", "NAME", "STUDY_CERTIFICATE"));
        liveResult.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));

        when(consentManagerClient.validateGrantLive(grantId)).thenReturn(liveResult);

        mockMvc.perform(get("/api/data/access/" + grantId)
                        .header("Authorization", "Bearer " + accessJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.STUDENT_ID", is("S1001")))
                .andExpect(jsonPath("$.NAME", is("Ashok Mugada")))
                .andExpect(jsonPath("$.STUDY_CERTIFICATE", is("Certified B.Tech Degree")))
                // Verify email is NOT returned because it was not in approved scope
                .andExpect(jsonPath("$.EMAIL").doesNotExist());
    }

    @Test
    @DisplayName("Revoked Live Grant -> Returns 403 Forbidden even with valid JWT")
    void testRevokedGrantReturnsForbidden() throws Exception {
        String grantId = "GRNT_REVOKED_01";
        String accessJwt = createTestAccessJwt(grantId, "S1001", List.of("STUDENT_ID", "NAME"), false);

        GrantValidationResult revokedResult = new GrantValidationResult();
        revokedResult.setValid(false);
        revokedResult.setMessage("Associated consent has been REVOKED");

        when(consentManagerClient.validateGrantLive(grantId)).thenReturn(revokedResult);

        mockMvc.perform(get("/api/data/access/" + grantId)
                        .header("Authorization", "Bearer " + accessJwt))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", containsString("Associated consent has been REVOKED")));
    }

    @Test
    @DisplayName("Expired Access JWT -> Returns 403 Forbidden")
    void testExpiredJwtReturnsForbidden() throws Exception {
        String grantId = "GRNT_EXPIRED_01";
        String expiredJwt = createTestAccessJwt(grantId, "S1001", List.of("STUDENT_ID"), true);

        mockMvc.perform(get("/api/data/access/" + grantId)
                        .header("Authorization", "Bearer " + expiredJwt))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Key Lifecycle: Unknown or untrusted CM key ID in token is safely rejected")
    void testUnknownKeyIdAccessJwtRejected() throws Exception {
        String grantId = "GRNT_UNKNOWN_KEY_01";
        String accessJwt = createTestAccessJwt(grantId, "S1001", List.of("STUDENT_ID"), false, "CM_KEY_UNTRUSTED_999", privateKey);

        when(consentManagerClient.refreshCmPublicKey()).thenReturn(publicKey);

        mockMvc.perform(get("/api/data/access/" + grantId)
                        .header("Authorization", "Bearer " + accessJwt))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Key Lifecycle: CM key persistence allows validating Access JWTs across CM restarts")
    void testAccessJwtValidatedAcrossCmRestart() throws Exception {
        String grantId = "GRNT_RESTART_01";
        // Access JWT created before restart
        String accessJwt = createTestAccessJwt(grantId, "S1001", List.of("STUDENT_ID", "NAME"), false);

        GrantValidationResult liveResult = new GrantValidationResult();
        liveResult.setValid(true);
        liveResult.setGrantId(grantId);
        liveResult.setDataPrincipalId("S1001");
        liveResult.setApprovedFields(List.of("STUDENT_ID", "NAME"));
        liveResult.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));

        when(consentManagerClient.validateGrantLive(grantId)).thenReturn(liveResult);

        // First verification succeeds
        mockMvc.perform(get("/api/data/access/" + grantId)
                        .header("Authorization", "Bearer " + accessJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.STUDENT_ID", is("S1001")));

        // Simulate CM restart: College A client refreshes CM public key (which reloads the same persistent key)
        when(consentManagerClient.refreshCmPublicKey()).thenReturn(publicKey);

        // Verification after restart still succeeds seamlessly
        mockMvc.perform(get("/api/data/access/" + grantId)
                        .header("Authorization", "Bearer " + accessJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.STUDENT_ID", is("S1001")));
    }

    @Test
    @DisplayName("Key Rotation: College A validates older unexpired Access JWT during CM key rotation overlap")
    void testCmKeyRotationValidatesOlderUnexpiredAccessJwt() throws Exception {
        // Generate older RSA KeyPair simulating previous CM key
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        KeyPair olderPair = gen.generateKeyPair();
        RSAPrivateKey olderPriv = (RSAPrivateKey) olderPair.getPrivate();
        RSAPublicKey olderPub = (RSAPublicKey) olderPair.getPublic();
        String olderKid = "CM_KEY_OLDER_ROTATION_01";

        String grantId = "GRNT_OLDER_01";
        String olderJwt = createTestAccessJwt(grantId, "S1001", List.of("STUDENT_ID", "NAME"), false, olderKid, olderPriv);

        GrantValidationResult liveResult = new GrantValidationResult();
        liveResult.setValid(true);
        liveResult.setGrantId(grantId);
        liveResult.setDataPrincipalId("S1001");
        liveResult.setApprovedFields(List.of("STUDENT_ID", "NAME"));
        liveResult.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));

        // When validating older JWT, CM returns the archived previous public key for olderKid
        when(consentManagerClient.getCmPublicKey(eq(olderKid))).thenReturn(olderPub);
        when(consentManagerClient.validateGrantLive(grantId)).thenReturn(liveResult);

        // Verification of unexpired token with previous key succeeds
        mockMvc.perform(get("/api/data/access/" + grantId)
                        .header("Authorization", "Bearer " + olderJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.STUDENT_ID", is("S1001")))
                .andExpect(jsonPath("$.NAME", is("Ashok Mugada")));
    }

    @Test
    @DisplayName("Key Rotation: Rejects Access JWT with expired or unknown CM key ID after overlap window")
    void testCmKeyRotationRejectsExpiredOrUnknownKeyId() throws Exception {
        String grantId = "GRNT_EXPIRED_KEY_01";
        String expiredKid = "CM_KEY_EXPIRED_PAST_OVERLAP";
        String accessJwt = createTestAccessJwt(grantId, "S1001", List.of("STUDENT_ID"), false, expiredKid, privateKey);

        // CM indicates key is unknown or expired past overlap window
        when(consentManagerClient.getCmPublicKey(eq(expiredKid))).thenReturn(null);

        mockMvc.perform(get("/api/data/access/" + grantId)
                        .header("Authorization", "Bearer " + accessJwt))
                .andExpect(status().isForbidden());
    }
}
