package com.depa.consent.security;

import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class DataAccessJwtSigner {

    private final RsaKeyProvider rsaKeyProvider;
    private final long accessExpirationMs;

    private static final String ISSUER = "consent-manager";

    public DataAccessJwtSigner(
            RsaKeyProvider rsaKeyProvider,
            @Value("${app.access-jwt.expiration-ms:86400000}") long accessExpirationMs
    ) {
        this.rsaKeyProvider = rsaKeyProvider;
        this.accessExpirationMs = accessExpirationMs;
    }

    public String generateDataAccessJwt(
            String requesterOrgCode,
            String providerOrgCode,
            String grantId,
            String dataPrincipalId,
            String purpose,
            List<String> approvedFields,
            Instant expiresAt
    ) {
        Date now = new Date();
        Date expiryDate = expiresAt != null ? Date.from(expiresAt) : new Date(now.getTime() + accessExpirationMs);

        Map<String, Object> claims = new HashMap<>();
        claims.put("grant_id", grantId);
        claims.put("data_principal_id", dataPrincipalId);
        claims.put("purpose", purpose);
        claims.put("scope", approvedFields);

        return Jwts.builder()
                .issuer(ISSUER)
                .subject(requesterOrgCode)
                .audience().add(providerOrgCode).and()
                .claims(claims)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(rsaKeyProvider.getPrivateKey(), Jwts.SIG.RS256)
                .compact();
    }
}
