package com.depa.provider.client;

import com.depa.provider.dto.GrantValidationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Component
public class ConsentManagerClient {

    private static final Logger log = LoggerFactory.getLogger(ConsentManagerClient.class);

    private final RestClient restClient;
    private final String cmBaseUrl;
    private RSAPublicKey cachedCmPublicKey;

    public ConsentManagerClient(
            @Value("${app.cm.base-url:http://localhost:8080}") String cmBaseUrl
    ) {
        this.cmBaseUrl = cmBaseUrl;
        this.restClient = RestClient.builder().baseUrl(cmBaseUrl).build();
    }

    /**
     * Live query to Consent Manager: Validates that grant is ACTIVE, consent is ACTIVE, and neither is revoked/expired.
     */
    public GrantValidationResult validateGrantLive(String grantId) {
        try {
            return restClient.get()
                    .uri("/api/access-grants/{grantId}/validate", grantId)
                    .retrieve()
                    .body(GrantValidationResult.class);
        } catch (Exception e) {
            log.error("Failed to validate grant '{}' with Consent Manager: {}", grantId, e.getMessage());
            GrantValidationResult res = new GrantValidationResult();
            res.setValid(false);
            res.setMessage("Consent Manager live validation unreachable: " + e.getMessage());
            return res;
        }
    }

    /**
     * Retrieve Consent Manager's RS256 Public Key for signature verification.
     */
    public RSAPublicKey getCmPublicKey() {
        if (cachedCmPublicKey != null) {
            return cachedCmPublicKey;
        }

        try {
            ResponseEntity<String> response = restClient.get()
                    .uri("/api/access-grants/public-key")
                    .retrieve()
                    .toEntity(String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                this.cachedCmPublicKey = parsePublicKeyFromPem(response.getBody());
                log.info("Successfully fetched and parsed Consent Manager RS256 Public Key.");
                return this.cachedCmPublicKey;
            }
        } catch (Exception e) {
            log.error("Failed to fetch Consent Manager public key: {}", e.getMessage());
        }
        return null;
    }

    public void setCachedCmPublicKey(RSAPublicKey key) {
        this.cachedCmPublicKey = key;
    }

    public static RSAPublicKey parsePublicKeyFromPem(String pem) {
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
}
