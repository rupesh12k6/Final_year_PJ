package com.depa.consent.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.attribute.AclEntry;
import java.nio.file.attribute.AclFileAttributeView;
import java.nio.file.attribute.PosixFilePermissions;
import java.nio.file.attribute.UserPrincipal;
import java.security.*;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * Manages persistent RSA key pairs and key identifiers for Consent Manager Access JWT signing.
 * Keys are persisted locally to prevent invalidating issued tokens across application restarts.
 */
@Component
public class RsaKeyProvider {

    private static final Logger log = LoggerFactory.getLogger(RsaKeyProvider.class);

    private RSAPrivateKey privateKey;
    private RSAPublicKey publicKey;
    private String keyId;
    private RSAPublicKey previousPublicKey;
    private String previousKeyId;
    private Instant previousKeyExpiresAt;
    private final File keysDirectory;

    public RsaKeyProvider(
            @Value("${app.rsa.keys-dir:./keys}") String keysDirPath
    ) {
        File dir = new File(keysDirPath);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        this.keysDirectory = dir;

        File privFile = new File(dir, "cm_access_rsa.key");
        File pubFile = new File(dir, "cm_access_rsa.pub");

        if (privFile.exists() && pubFile.exists()) {
            try {
                log.info("Loading existing Consent Manager RSA key pair from: {}", dir.getAbsolutePath());
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
                log.info("Generating new 2048-bit RSA key pair and saving to: {}", dir.getAbsolutePath());
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

        this.keyId = computeKeyId("CM", this.publicKey);
        log.info("Consent Manager RSA Key initialized with kid={}", keyId);

        // Load previously archived rotation key if present
        File prevPubFile = new File(dir, "cm_access_rsa_prev.pub");
        File prevMetaFile = new File(dir, "cm_access_rsa_prev.meta");
        if (prevPubFile.exists() && prevMetaFile.exists()) {
            try {
                byte[] prevPubBytes = Files.readAllBytes(prevPubFile.toPath());
                KeyFactory kf = KeyFactory.getInstance("RSA");
                this.previousPublicKey = (RSAPublicKey) kf.generatePublic(new X509EncodedKeySpec(prevPubBytes));
                List<String> metaLines = Files.readAllLines(prevMetaFile.toPath());
                if (!metaLines.isEmpty()) {
                    this.previousKeyId = metaLines.get(0).trim();
                }
                if (metaLines.size() > 1) {
                    this.previousKeyExpiresAt = Instant.parse(metaLines.get(1).trim());
                }
                log.info("Loaded previous Consent Manager RSA public key (kid={}, expiresAt={})", previousKeyId, previousKeyExpiresAt);
            } catch (Exception e) {
                log.warn("Could not load previous CM RSA public key: {}", e.getMessage());
            }
        }
    }

    public synchronized void rotateKey(long overlapSeconds) {
        log.info("Rotating Consent Manager RSA Access JWT signing key (overlapSeconds={})", overlapSeconds);
        try {
            // 1. Archive current key as previous key
            this.previousPublicKey = this.publicKey;
            this.previousKeyId = this.keyId;
            this.previousKeyExpiresAt = Instant.now().plusSeconds(overlapSeconds);

            File prevPubFile = new File(keysDirectory, "cm_access_rsa_prev.pub");
            File prevMetaFile = new File(keysDirectory, "cm_access_rsa_prev.meta");
            Files.write(prevPubFile.toPath(), previousPublicKey.getEncoded());
            Files.write(prevMetaFile.toPath(), (previousKeyId + "\n" + previousKeyExpiresAt.toString()).getBytes());

            // 2. Generate new 2048-bit RSA key pair
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KeyPair newPair = generator.generateKeyPair();
            this.privateKey = (RSAPrivateKey) newPair.getPrivate();
            this.publicKey = (RSAPublicKey) newPair.getPublic();
            this.keyId = computeKeyId("CM", this.publicKey);

            File privFile = new File(keysDirectory, "cm_access_rsa.key");
            File pubFile = new File(keysDirectory, "cm_access_rsa.pub");
            Files.write(privFile.toPath(), privateKey.getEncoded());
            Files.write(pubFile.toPath(), publicKey.getEncoded());
            applyStrictFilePermissions(privFile);

            log.info("Consent Manager RSA Key successfully rotated. New kid={}, previous kid={} expires at {}",
                    keyId, previousKeyId, previousKeyExpiresAt);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to rotate CM RSA key pair", e);
        }
    }

    public RSAPrivateKey getPrivateKey() {
        return privateKey;
    }

    public RSAPublicKey getPublicKey() {
        return publicKey;
    }

    public RSAPublicKey getPublicKey(String kid) {
        if (kid == null || kid.isBlank() || kid.equalsIgnoreCase(this.keyId)) {
            return this.publicKey;
        }
        if (this.previousKeyId != null && kid.equalsIgnoreCase(this.previousKeyId)) {
            if (this.previousKeyExpiresAt != null && Instant.now().isAfter(this.previousKeyExpiresAt)) {
                log.warn("Consent Manager previous key kid={} expired at {}", kid, this.previousKeyExpiresAt);
                return null;
            }
            return this.previousPublicKey;
        }
        return null;
    }

    public String getKeyId() {
        return keyId;
    }

    public String getPreviousKeyId() {
        return previousKeyId;
    }

    public Instant getPreviousKeyExpiresAt() {
        return previousKeyExpiresAt;
    }

    public String getPublicKeyPem() {
        return getPublicKeyPem(this.keyId);
    }

    public String getPublicKeyPem(String kid) {
        RSAPublicKey key = getPublicKey(kid);
        if (key == null) return null;
        String base64 = Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(key.getEncoded());
        return "-----BEGIN PUBLIC KEY-----\n" + base64 + "\n-----END PUBLIC KEY-----";
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
                AclFileAttributeView aclView = Files.getFileAttributeView(file.toPath(), AclFileAttributeView.class);
                if (aclView != null) {
                    UserPrincipal owner = aclView.getOwner();
                    List<AclEntry> cleanAcl = new ArrayList<>();
                    for (AclEntry entry : aclView.getAcl()) {
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
