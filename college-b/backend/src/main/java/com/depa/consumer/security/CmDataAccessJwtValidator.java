package com.depa.consumer.security;

import com.depa.consumer.client.ConsentManagerClient;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.interfaces.RSAPublicKey;
import java.util.Date;
import java.util.List;

@Component
public class CmDataAccessJwtValidator {

    private final ConsentManagerClient cmClient;
    private final String collegeCode;

    private static final String EXPECTED_ISSUER = "consent-manager";

    public CmDataAccessJwtValidator(
            ConsentManagerClient cmClient,
            @Value("${app.college.code:COLLEGE_B}") String collegeCode
    ) {
        this.cmClient = cmClient;
        this.collegeCode = collegeCode;
    }

    public Claims validateAndExtractClaims(String token) {
        RSAPublicKey publicKey = cmClient.getCmPublicKey();
        if (publicKey == null) {
            throw new SecurityException("Unable to retrieve Consent Manager public key for verification");
        }

        try {
            return parseAndValidate(token, publicKey);
        } catch (Exception e) {
            // Auto-refresh key from CM on signature failure (handles CM server restart / key rotation)
            RSAPublicKey freshKey = cmClient.refreshCmPublicKey();
            if (freshKey != null && !freshKey.equals(publicKey)) {
                return parseAndValidate(token, freshKey);
            }
            throw e;
        }
    }

    private Claims parseAndValidate(String token, RSAPublicKey publicKey) {
        Claims claims = Jwts.parser()
                .verifyWith(publicKey)
                .requireIssuer(EXPECTED_ISSUER)
                .requireAudience(collegeCode)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        if (claims.getExpiration().before(new Date())) {
            throw new SecurityException("CM Data Access JWT has expired");
        }

        return claims;
    }

    public String extractGrantId(Claims claims) {
        return claims.get("grant_id", String.class);
    }

    public String extractDataPrincipalId(Claims claims) {
        return claims.get("data_principal_id", String.class);
    }

    @SuppressWarnings("unchecked")
    public List<String> extractScope(Claims claims) {
        return claims.get("scope", List.class);
    }
}
