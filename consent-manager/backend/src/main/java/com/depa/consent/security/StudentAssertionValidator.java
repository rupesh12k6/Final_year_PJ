package com.depa.consent.security;

import com.depa.consent.entity.AuditEventType;
import com.depa.consent.entity.Organization;
import com.depa.consent.entity.OrganizationStatus;
import com.depa.consent.exception.ForbiddenOperationException;
import com.depa.consent.repository.OrganizationRepository;
import com.depa.consent.service.AuditService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Validates short-lived, cryptographically signed student identity assertions
 * sent by colleges.
 */
@Component
public class StudentAssertionValidator {

    private static final Logger log = LoggerFactory.getLogger(StudentAssertionValidator.class);
    private static final String EXPECTED_AUDIENCE = "consent-manager";

    private final OrganizationRepository organizationRepository;
    private final AssertionReplayTracker assertionReplayTracker;
    private final AuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Cache of parsed public keys to optimize verification performance
    private final Map<String, RSAPublicKey> parsedPublicKeyCache = new ConcurrentHashMap<>();

    public StudentAssertionValidator(OrganizationRepository organizationRepository,
            AssertionReplayTracker assertionReplayTracker,
            AuditService auditService) {
        this.organizationRepository = organizationRepository;
        this.assertionReplayTracker = assertionReplayTracker;
        this.auditService = auditService;
    }

    public static class VerifiedStudentAssertion {
        private final String studentId;
        private final String organizationId;
        private final String organizationCode;
        private final String action;
        private final String targetId;

        public VerifiedStudentAssertion(String studentId, String organizationId, String organizationCode, String action,
                String targetId) {
            this.studentId = studentId;
            this.organizationId = organizationId;
            this.organizationCode = organizationCode;
            this.action = action;
            this.targetId = targetId;
        }

        public String getStudentId() {
            return studentId;
        }

        public String getOrganizationId() {
            return organizationId;
        }

        public String getOrganizationCode() {
            return organizationCode;
        }

        public String getAction() {
            return action;
        }

        public String getTargetId() {
            return targetId;
        }
    }

    /**
     * Validates student assertion token against registered college keys and
     * expected action/target.
     */
    public VerifiedStudentAssertion validate(String assertionToken, String expectedAction, String expectedTargetId) {
        if (assertionToken == null || assertionToken.isBlank()) {
            throw new ForbiddenOperationException("Missing X-Student-Assertion header");
        }

        String rawToken = assertionToken.startsWith("Bearer ") ? assertionToken.substring(7).trim()
                : assertionToken.trim();

        // 1. Unpack unverified payload to locate issuing organization and key ID
        String[] parts = rawToken.split("\\.");
        if (parts.length != 3) {
            logAuthFailure("UNKNOWN", "Malformed JWT format");
            throw new ForbiddenOperationException("Invalid assertion token format");
        }

        JsonNode headerJson;
        try {
            byte[] headerBytes = Base64.getUrlDecoder().decode(parts[0]);
            headerJson = objectMapper.readTree(headerBytes);
        } catch (Exception e) {
            logAuthFailure("UNKNOWN", "Failed to parse assertion header JSON: " + e.getMessage());
            throw new ForbiddenOperationException("Invalid assertion header");
        }

        String assertionKid = headerJson.has("kid") ? headerJson.get("kid").asText() : null;
        if (assertionKid == null || assertionKid.isBlank()) {
            logAuthFailure("UNKNOWN", "Assertion missing required key ID (kid)");
            throw new ForbiddenOperationException("Assertion must contain a valid key ID (kid)");
        }

        JsonNode payloadJson;
        try {
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            payloadJson = objectMapper.readTree(payloadBytes);
        } catch (Exception e) {
            logAuthFailure("UNKNOWN", "Failed to parse assertion payload JSON: " + e.getMessage());
            throw new ForbiddenOperationException("Invalid assertion payload");
        }

        String orgCode = payloadJson.has("orgCode") ? payloadJson.get("orgCode").asText()
                : (payloadJson.has("iss") ? payloadJson.get("iss").asText() : null);

        if (orgCode == null || orgCode.isBlank()) {
            logAuthFailure("UNKNOWN", "Missing orgCode / issuer in assertion");
            throw new ForbiddenOperationException("Assertion missing organization identifier");
        }

        // 2. Resolve issuing Organization
        Organization organization = organizationRepository.findByOrganizationCode(orgCode.toUpperCase())
                .orElse(null);

        if (organization == null) {
            organization = organizationRepository.findById(orgCode)
                    .orElse(null);
        }

        if (organization == null) {
            logAuthFailure(orgCode, "Organization not found");
            throw new ForbiddenOperationException("Unknown organization: " + orgCode);
        }

        if (organization.getStatus() != OrganizationStatus.ACTIVE) {
            logAuthFailure(organization.getOrganizationCode(), "Organization status is " + organization.getStatus());
            throw new ForbiddenOperationException("Organization is not active: " + organization.getOrganizationCode());
        }

        // 3. Cryptographic Signature Verification (RS256 with fallback to HS256)
        Claims claims;
        try {
            RSAPublicKey rsaPublicKey = resolvePublicKey(organization);
            RSAPublicKey verificationKey = null;

            if (rsaPublicKey != null) {
                // Key ID validation against registered public key fingerprint
                String expectedKid = RsaKeyProvider.computeKeyId(organization.getOrganizationCode(), rsaPublicKey);
                boolean kidMatchesCurrent = assertionKid.equalsIgnoreCase(expectedKid)
                        || (organization.getKeyId() != null && assertionKid.equalsIgnoreCase(organization.getKeyId()));

                if (kidMatchesCurrent) {
                    verificationKey = rsaPublicKey;
                } else {
                    // Safe overlap check: verify if assertion was signed by previous key during grace period
                    RSAPublicKey prevPublicKey = resolvePreviousPublicKey(organization);
                    if (prevPublicKey != null) {
                        String expectedPrevKid = RsaKeyProvider.computeKeyId(organization.getOrganizationCode(), prevPublicKey);
                        boolean kidMatchesPrev = assertionKid.equalsIgnoreCase(expectedPrevKid)
                                || (organization.getPreviousKeyId() != null && assertionKid.equalsIgnoreCase(organization.getPreviousKeyId()));
                        if (kidMatchesPrev) {
                            if (organization.getPreviousKeyExpiresAt() != null && Instant.now().isAfter(organization.getPreviousKeyExpiresAt())) {
                                logAuthFailure(organization.getOrganizationCode(), "Previous key ID " + assertionKid + " expired at " + organization.getPreviousKeyExpiresAt());
                                throw new ForbiddenOperationException("Previous key ID has expired (overlap window elapsed): " + assertionKid);
                            }
                            log.info("Validating assertion using previous public key during rotation overlap for kid={}", assertionKid);
                            verificationKey = prevPublicKey;
                        }
                    }
                }

                if (verificationKey == null) {
                    logAuthFailure(organization.getOrganizationCode(),
                            String.format("Unknown or outdated key ID: %s (registered key ID is %s)", assertionKid,
                                    expectedKid));
                    throw new ForbiddenOperationException("Unknown or outdated key ID in assertion: " + assertionKid);
                }

                claims = Jwts.parser()
                        .verifyWith(verificationKey)
                        .requireAudience(EXPECTED_AUDIENCE)
                        .build()
                        .parseSignedClaims(rawToken)
                        .getPayload();
            } else if (organization.getCredentials() != null && !organization.getCredentials().isBlank()) {
                // Secure fallback for organizations configured with shared secrets
                byte[] secretBytes = organization.getCredentials().getBytes(StandardCharsets.UTF_8);
                claims = Jwts.parser()
                        .verifyWith(Keys.hmacShaKeyFor(secretBytes))
                        .requireAudience(EXPECTED_AUDIENCE)
                        .build()
                        .parseSignedClaims(rawToken)
                        .getPayload();
            } else {
                logAuthFailure(organization.getOrganizationCode(), "No registered public key or credentials");
                throw new ForbiddenOperationException("Organization has no registered verification keys");
            }
        } catch (ForbiddenOperationException e) {
            throw e;
        } catch (Exception e) {
            logAuthFailure(organization.getOrganizationCode(),
                    "Signature or audience verification failed: " + e.getMessage());
            throw new ForbiddenOperationException("Assertion cryptographic verification failed: " + e.getMessage());
        }

        // 4. Expiration check
        if (claims.getExpiration().before(new Date())) {
            logAuthFailure(organization.getOrganizationCode(), "Assertion token expired at " + claims.getExpiration());
            throw new ForbiddenOperationException("Assertion token has expired");
        }

        // 5. Role check
        String role = claims.get("role", String.class);
        if (!"STUDENT".equalsIgnoreCase(role)) {
            logAuthFailure(organization.getOrganizationCode(), "Assertion role is not STUDENT (got " + role + ")");
            throw new ForbiddenOperationException("Assertion role must be STUDENT");
        }

        // 6. Action check
        String action = claims.get("action", String.class);
        if (expectedAction != null && !expectedAction.equalsIgnoreCase(action)) {
            logAuthFailure(organization.getOrganizationCode(),
                    String.format("Action mismatch: expected %s, got %s", expectedAction, action));
            throw new ForbiddenOperationException(
                    String.format("Assertion action mismatch: expected %s but received %s", expectedAction, action));
        }

        // 7. Target ID check
        String targetId = claims.get("targetId", String.class);
        if (expectedTargetId != null && !expectedTargetId.equalsIgnoreCase(targetId)) {
            logAuthFailure(organization.getOrganizationCode(),
                    String.format("Target ID mismatch: expected %s, got %s", expectedTargetId, targetId));
            throw new ForbiddenOperationException(String
                    .format("Assertion target ID mismatch: expected %s but received %s", expectedTargetId, targetId));
        }

        // 8. Replay prevention on state changes (Database-backed)
        String jti = claims.getId();
        if (jti == null || jti.isBlank()) {
            jti = claims.get("jti", String.class);
        }

        String studentId = claims.getSubject();
        if (studentId == null || studentId.isBlank()) {
            logAuthFailure(organization.getOrganizationCode(), "Subject claim (studentId) is missing");
            throw new ForbiddenOperationException("Assertion subject (studentId) cannot be blank");
        }

        if ("APPROVE".equalsIgnoreCase(action) || "REJECT".equalsIgnoreCase(action)
                || "REVOKE".equalsIgnoreCase(action)) {
            boolean fresh = assertionReplayTracker.checkAndConsume(
                    jti,
                    studentId.trim().toUpperCase(),
                    organization.getOrganizationId(),
                    action,
                    targetId,
                    claims.getExpiration().toInstant());
            if (!fresh) {
                logAuthFailure(organization.getOrganizationCode(), "Replay attack detected for jti: " + jti);
                throw new ForbiddenOperationException(
                        "Assertion replay detected: this assertion has already been used");
            }
        }

        return new VerifiedStudentAssertion(
                studentId.trim().toUpperCase(),
                organization.getOrganizationId(),
                organization.getOrganizationCode(),
                action,
                targetId);
    }

    private RSAPublicKey resolvePublicKey(Organization organization) {
        String pem = organization.getPublicKey();
        if (pem == null || pem.isBlank() || pem.contains("0COLLEGE_A_PUBLIC_KEY")
                || pem.contains("0COLLEGE_B_PUBLIC_KEY")) {
            return null;
        }

        return parsedPublicKeyCache.computeIfAbsent(pem, p -> parsePublicKeyFromPem(p));
    }

    private RSAPublicKey resolvePreviousPublicKey(Organization organization) {
        String pem = organization.getPreviousPublicKey();
        if (pem == null || pem.isBlank() || pem.contains("0COLLEGE_A_PUBLIC_KEY") || pem.contains("0COLLEGE_B_PUBLIC_KEY")) {
            return null;
        }

        return parsedPublicKeyCache.computeIfAbsent(pem, p -> parsePublicKeyFromPem(p));
    }

    public void registerPublicKey(String organizationId, String pem) {
        try {
            RSAPublicKey key = parsePublicKeyFromPem(pem);
            parsedPublicKeyCache.put(pem, key);
        } catch (Exception e) {
            log.warn("Failed to register public key for org {}: {}", organizationId, e.getMessage());
        }
    }

    private static RSAPublicKey parsePublicKeyFromPem(String pem) {
        try {
            String clean = pem.replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] keyBytes = Base64.getDecoder().decode(clean);
            X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return (RSAPublicKey) kf.generatePublic(spec);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid RSA public key PEM: " + e.getMessage(), e);
        }
    }

    private void logAuthFailure(String orgCode, String reason) {
        auditService.logEvent(
                AuditEventType.CONSENT_AUTHORIZATION_FAILED,
                "SYSTEM",
                "SECURITY",
                "ASSERTION",
                "UNKNOWN",
                orgCode,
                "Student identity assertion authorization failed: " + reason);
    }
}
