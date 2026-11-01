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
    private String cachedCmKeyId;
    private final java.util.Map<String, RSAPublicKey> keyCache = new java.util.concurrent.ConcurrentHashMap<>();

    public ConsentManagerClient(
            @Value("${app.cm.base-url:http://localhost:8080}") String cmBaseUrl
    ) {
        this.cmBaseUrl = cmBaseUrl;
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory())
                .baseUrl(cmBaseUrl)
                .build();
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
                this.cachedCmKeyId = response.getHeaders().getFirst("X-KEY-ID");
                if (this.cachedCmKeyId != null) {
                    this.keyCache.put(this.cachedCmKeyId, this.cachedCmPublicKey);
                }
                log.info("Successfully fetched and parsed Consent Manager RS256 Public Key (kid={}).", cachedCmKeyId);
                return this.cachedCmPublicKey;
            }
        } catch (Exception e) {
            log.error("Failed to fetch Consent Manager public key: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Retrieve CM public key by key ID (kid), supporting previous keys during rotation overlap.
     */
    public RSAPublicKey getCmPublicKey(String kid) {
        if (kid == null || kid.isBlank()) {
            return getCmPublicKey();
        }

        if (cachedCmKeyId != null && kid.equalsIgnoreCase(cachedCmKeyId) && cachedCmPublicKey != null) {
            return cachedCmPublicKey;
        }

        if (keyCache.containsKey(kid)) {
            return keyCache.get(kid);
        }

        try {
            ResponseEntity<String> response = restClient.get()
                    .uri("/api/access-grants/public-key?kid={kid}", kid)
                    .retrieve()
                    .toEntity(String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                RSAPublicKey key = parsePublicKeyFromPem(response.getBody());
                keyCache.put(kid, key);
                log.info("Successfully fetched and cached CM public key for kid={}", kid);
                return key;
            }
        } catch (Exception e) {
            log.warn("Could not fetch CM public key for kid={}: {}", kid, e.getMessage());
        }
        return null;
    }

    public RSAPublicKey refreshCmPublicKey() {
        this.cachedCmPublicKey = null;
        this.cachedCmKeyId = null;
        this.keyCache.clear();
        return getCmPublicKey();
    }

    public String getCachedCmKeyId() {
        return cachedCmKeyId;
    }

    public void setCachedCmPublicKey(RSAPublicKey key) {
        this.cachedCmPublicKey = key;
    }

    public void setCachedCmKeyId(String keyId) {
        this.cachedCmKeyId = keyId;
    }

    public boolean syncAssertionPublicKey(String publicKeyPem, String internalApiKey) {
        return syncAssertionPublicKey(publicKeyPem, null, internalApiKey);
    }

    public boolean syncAssertionPublicKey(String publicKeyPem, String keyId, String internalApiKey) {
        try {
            java.util.Map<String, String> payload = new java.util.HashMap<>();
            payload.put("publicKey", publicKeyPem);
            if (keyId != null) {
                payload.put("keyId", keyId);
            }

            ResponseEntity<String> response = restClient.post()
                    .uri("/api/bridge/organizations/public-key")
                    .header("X-API-KEY", internalApiKey)
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toEntity(String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.warn("Could not sync assertion public key with Consent Manager: {}", e.getMessage());
            return false;
        }
    }

    public String getPendingConsentRequestsRaw(String assertionToken) {
        return restClient.get()
                .uri("/api/bridge/consents/pending")
                .header("X-Student-Assertion", assertionToken)
                .retrieve()
                .body(String.class);
    }

    public String getConsentHistoryRaw(String assertionToken) {
        return restClient.get()
                .uri("/api/bridge/consents/history")
                .header("X-Student-Assertion", assertionToken)
                .retrieve()
                .body(String.class);
    }

    public com.depa.provider.dto.ConsentDecisionResponse approveConsent(String consentRequestId, java.util.List<String> approvedFields, String assertionToken) {
        return restClient.post()
                .uri("/api/bridge/consents/{id}/approve", consentRequestId)
                .header("X-Student-Assertion", assertionToken)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(new com.depa.provider.dto.ApproveConsentRequest(approvedFields))
                .retrieve()
                .body(com.depa.provider.dto.ConsentDecisionResponse.class);
    }

    public java.util.Map<String, Object> rejectConsent(String consentRequestId, String assertionToken) {
        return restClient.post()
                .uri("/api/bridge/consents/{id}/reject", consentRequestId)
                .header("X-Student-Assertion", assertionToken)
                .retrieve()
                .body(new org.springframework.core.ParameterizedTypeReference<java.util.Map<String, Object>>() {});
    }

    public java.util.Map<String, Object> revokeConsent(String consentId, String assertionToken) {
        return restClient.post()
                .uri("/api/bridge/consents/{id}/revoke", consentId)
                .header("X-Student-Assertion", assertionToken)
                .retrieve()
                .body(new org.springframework.core.ParameterizedTypeReference<java.util.Map<String, Object>>() {});
    }

    public java.util.Map<String, Object> initiateDataRequest(com.depa.provider.dto.InitiateDataRequest request, String internalApiKey) {
        return restClient.post()
                .uri("/api/bridge/data-requests")
                .header("X-API-KEY", internalApiKey)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(new org.springframework.core.ParameterizedTypeReference<java.util.Map<String, Object>>() {});
    }

    public com.depa.provider.dto.ConsumerGrantResponse getConsumerGrant(String dataRequestId, String internalApiKey) {
        return restClient.get()
                .uri("/api/bridge/consumer/data-requests/{id}/grant", dataRequestId)
                .header("X-API-KEY", internalApiKey)
                .retrieve()
                .body(com.depa.provider.dto.ConsumerGrantResponse.class);
    }

    public java.util.List<java.util.Map<String, Object>> getOutgoingDataRequests(String internalApiKey) {
        return restClient.get()
                .uri("/api/bridge/consumer/data-requests")
                .header("X-API-KEY", internalApiKey)
                .retrieve()
                .body(new org.springframework.core.ParameterizedTypeReference<java.util.List<java.util.Map<String, Object>>>() {});
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
