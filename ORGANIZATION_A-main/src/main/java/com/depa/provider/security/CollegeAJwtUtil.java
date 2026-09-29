package com.depa.provider.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class CollegeAJwtUtil {

    private final SecretKey secretKey;
    private final long expirationMs;
    private final String issuer;
    private final String audience;

    public CollegeAJwtUtil(
            @Value("${app.jwt.secret:586E3272357538782F413F4428472B4B6250645367566B597033733676397924}") String secret,
            @Value("${app.jwt.expiration-ms:900000}") long expirationMs,
            @Value("${app.jwt.issuer:college-a}") String issuer,
            @Value("${app.jwt.audience:college-a-api}") String audience
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
        this.issuer = issuer;
        this.audience = audience;
    }

    public String generateToken(String adminId, String email, String orgCode, String role, String scope) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", email);
        claims.put("orgId", orgCode);
        claims.put("role", role);
        claims.put("scope", List.of(scope.split(",")));

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .issuer(issuer)
                .audience().add(audience).and()
                .subject(adminId)
                .claims(claims)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .requireIssuer(issuer)
                .requireAudience(audience)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractAdminId(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractEmail(String token) {
        return extractAllClaims(token).get("email", String.class);
    }

    public String extractOrgId(String token) {
        return extractAllClaims(token).get("orgId", String.class);
    }

    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (Exception e) {
            return false;
        }
    }
}
