package com.depa.provider.security;

import io.jsonwebtoken.Jwts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.*;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Manages persistent asymmetric RSA key pairs and signs short-lived student assertions for the Consent Manager bridge.
 * Keys are persisted locally to prevent generating new keys under an existing key ID across restarts.
 */
@Component
public class CollegeAssertionKeyPairProvider {

    private static final Logger log = LoggerFactory.getLogger(CollegeAssertionKeyPairProvider.class);

    private final RSAPrivateKey privateKey;
    private final RSAPublicKey publicKey;
    private final String keyId;
    private final String collegeCode;
    private final String issuer;

    public CollegeAssertionKeyPairProvider(
            @Value("${app.college.code:COLLEGE_A}") String collegeCode,
            @Value("${app.jwt.issuer:college-a}") String issuer,
            @Value("${app.rsa.keys-dir:./keys}") String keysDirPath
    ) {
        this.collegeCode = collegeCode;
        this.issuer = issuer;

        File dir = new File(keysDirPath);
        if (!dir.exists()) {
            dir.mkdirs();
        }

        File privFile = new File(dir, "college_a_rsa.key");
        File pubFile = new File(dir, "college_a_rsa.pub");

        if (privFile.exists() && pubFile.exists()) {
            try {
                log.info("Loading existing College A RSA key pair from: {}", dir.getAbsolutePath());
                byte[] privBytes = Files.readAllBytes(privFile.toPath());
                byte[] pubBytes = Files.readAllBytes(pubFile.toPath());

                KeyFactory kf = KeyFactory.getInstance("RSA");
                this.privateKey = (RSAPrivateKey) kf.generatePrivate(new PKCS8EncodedKeySpec(privBytes));
                this.publicKey = (RSAPublicKey) kf.generatePublic(new X509EncodedKeySpec(pubBytes));
                applyStrictFilePermissions(privFile);
            } catch (Exception e) {
                throw new IllegalStateException("Failed to load existing RSA key pair from " + dir.getAbsolutePath(), e);
            }
        } else {
            try {
                log.info("Generating new 2048-bit RSA key pair for College A and saving to: {}", dir.getAbsolutePath());
                KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
                generator.initialize(2048);
                KeyPair keyPair = generator.generateKeyPair();
                this.privateKey = (RSAPrivateKey) keyPair.getPrivate();
                this.publicKey = (RSAPublicKey) keyPair.getPublic();

                Files.write(privFile.toPath(), privateKey.getEncoded());
                Files.write(pubFile.toPath(), publicKey.getEncoded());
                applyStrictFilePermissions(privFile);
            } catch (Exception e) {
                throw new IllegalStateException("Failed to generate and persist RSA key pair in " + dir.getAbsolutePath(), e);
            }
        }

        this.keyId = computeKeyId(this.collegeCode, this.publicKey);
        log.info("Initialized College A RSA KeyPair for student assertions (kid={})", keyId);
    }

    public RSAPrivateKey getPrivateKey() {
        return privateKey;
    }

    public RSAPublicKey getPublicKey() {
        return publicKey;
    }

    public String getKeyId() {
        return keyId;
    }

    public String getPublicKeyPem() {
        String base64 = Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(publicKey.getEncoded());
        return "-----BEGIN PUBLIC KEY-----\n" + base64 + "\n-----END PUBLIC KEY-----";
    }

    /**
     * Signs a short-lived student identity assertion using RS256 with key ID.
     * Valid for 5 minutes (300 seconds), bound to a specific action and target ID.
     */
    public String signStudentAssertion(String studentId, String action, String targetId) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(300); // 5 minutes TTL

        Map<String, Object> claims = new HashMap<>();
        claims.put("orgCode", collegeCode);
        claims.put("role", "STUDENT");
        claims.put("action", action);
        claims.put("targetId", targetId != null ? targetId : "ALL");

        return Jwts.builder()
                .header()
                .keyId(keyId)
                .and()
                .issuer(issuer)
                .audience().add("consent-manager").and()
                .subject(studentId)
                .claims(claims)
                .id(UUID.randomUUID().toString()) // jti
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(privateKey, Jwts.SIG.RS256)
                .compact();
    }

    public static String computeKeyId(String orgPrefix, RSAPublicKey key) {
        if (key == null) return orgPrefix + "_KEY_UNKNOWN";
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(key.getEncoded());
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 5; i++) { // 10 hex characters
                sb.append(String.format("%02X", digest[i]));
            }
            return orgPrefix.toUpperCase() + "_KEY_" + sb.toString();
        } catch (NoSuchAlgorithmException e) {
            return orgPrefix.toUpperCase() + "_KEY_1";
        }
    }

    private void applyStrictFilePermissions(File file) {
        try {
            file.setReadable(false, false);
            file.setReadable(true, true); // Owner only
            file.setWritable(false, false);
            file.setWritable(true, true); // Owner only
            file.setExecutable(false, false);

            if (FileSystems.getDefault().supportedFileAttributeViews().contains("posix")) {
                Files.setPosixFilePermissions(file.toPath(), PosixFilePermissions.fromString("rw-------"));
            }

            if (FileSystems.getDefault().supportedFileAttributeViews().contains("acl")) {
                java.nio.file.attribute.AclFileAttributeView aclView =
                        Files.getFileAttributeView(file.toPath(), java.nio.file.attribute.AclFileAttributeView.class);
                if (aclView != null) {
                    java.nio.file.attribute.UserPrincipal owner = aclView.getOwner();
                    java.util.List<java.nio.file.attribute.AclEntry> cleanAcl = new java.util.ArrayList<>();
                    for (java.nio.file.attribute.AclEntry entry : aclView.getAcl()) {
                        String name = entry.principal().getName();
                        if (name.equalsIgnoreCase(owner.getName())
                                || name.contains("SYSTEM")
                                || name.contains("Administrators")) {
                            cleanAcl.add(entry);
                        }
                    }
                    aclView.setAcl(cleanAcl);
                }
            }
        } catch (Exception e) {
            log.warn("Could not set strict file permissions on {}: {}", file.getAbsolutePath(), e.getMessage());
        }
    }
}
