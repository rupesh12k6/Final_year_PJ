package com.depa.consumer.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Component
public class CollegeBJwtUtil {

    private final SecretKey key;
    private final long expirationMs;
    private final String issuer;

    public CollegeBJwtUtil(
            @Value("${app.jwt.secret:586E3272357538782F413F4428472B4B6250645367566B597033733676397924}") String secret,
            @Value("${app.jwt.expiration-ms:900000}") long expirationMs,
            @Value("${app.jwt.issuer:college-b}") String issuer
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
        this.issuer = issuer;
    }

    public String generateToken(String adminId, String email, String role, String scopes, String orgCode) {
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(expirationMs);

        return Jwts.builder()
                .subject(adminId)
                .issuer(issuer)
                .claim("email", email)
                .claim("role", role)
                .claim("scopes", scopes)
                .claim("organization_code", orgCode)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    public String generateStudentToken(String studentId, String email, String orgCode, String name) {
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(expirationMs);

        return Jwts.builder()
                .subject(studentId)
                .issuer(issuer)
                .claim("email", email)
                .claim("role", "STUDENT")
                .claim("scopes", "student:read,student:consent")
                .claim("studentId", studentId)
                .claim("name", name)
                .claim("organization_code", orgCode)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    public Claims validateAndExtractClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = validateAndExtractClaims(token);
            return claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }
}
