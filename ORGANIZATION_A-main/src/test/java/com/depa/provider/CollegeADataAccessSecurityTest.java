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

    @BeforeEach
    void setUp() throws Exception {
        // Generate ephemeral RSA keypair simulating Consent Manager
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        KeyPair pair = gen.generateKeyPair();
        this.privateKey = (RSAPrivateKey) pair.getPrivate();
        this.publicKey = (RSAPublicKey) pair.getPublic();

        when(consentManagerClient.getCmPublicKey()).thenReturn(publicKey);

        // Ensure Student S1001 exists in DB
        studentRepository.deleteAll();
        Student s1001 = new Student("S1001", "Ashok Mugada", "student1001@example.com", StudentStatus.ACTIVE, "Certified B.Tech Degree");
        studentRepository.save(s1001);
    }

    private String createTestAccessJwt(String grantId, String studentId, List<String> scope, boolean expired) {
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
                .issuer("consent-manager")
                .subject("COLLEGE_B")
                .audience().add("COLLEGE_A").and()
                .claims(claims)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(privateKey, Jwts.SIG.RS256)
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
}
