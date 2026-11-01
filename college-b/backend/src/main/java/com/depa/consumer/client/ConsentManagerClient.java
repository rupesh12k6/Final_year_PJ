package com.depa.consumer.client;

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
import java.util.List;

@Component
public class ConsentManagerClient {

    private static final Logger log = LoggerFactory.getLogger(ConsentManagerClient.class);

    private final RestClient restClient;
    private final String cmBaseUrl;
    private RSAPublicKey cachedCmPublicKey;

    public static class GrantValidationResult {
        private boolean valid;
        private String message;
        private List<String> approvedFields;
        public boolean isValid() { return valid; }
        public void setValid(boolean valid) { this.valid = valid; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public List<String> getApprovedFields() { return approvedFields; }
        public void setApprovedFields(List<String> approvedFields) { this.approvedFields = approvedFields; }
    }

    public ConsentManagerClient(
            @Value("${app.cm.base-url:http://localhost:8080}") String cmBaseUrl
    ) {
        this.cmBaseUrl = cmBaseUrl;
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory())
                .baseUrl(cmBaseUrl)
                .build();
    }

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

    public RSAPublicKey refreshCmPublicKey() {
        this.cachedCmPublicKey = null;
        return getCmPublicKey();
    }

    public void setCachedCmPublicKey(RSAPublicKey key) {
        this.cachedCmPublicKey = key;
    }

    public java.util.Map<String, Object> initiateDataRequest(com.depa.consumer.dto.InitiateDataRequest request, String internalApiKey) {
        return restClient.post()
                .uri("/api/bridge/data-requests")
                .header("X-API-KEY", internalApiKey)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(new org.springframework.core.ParameterizedTypeReference<java.util.Map<String, Object>>() {});
    }

    public com.depa.consumer.dto.ConsumerGrantResponse getConsumerGrant(String dataRequestId, String internalApiKey) {
        return restClient.get()
                .uri("/api/bridge/consumer/data-requests/{id}/grant", dataRequestId)
                .header("X-API-KEY", internalApiKey)
                .retrieve()
                .body(com.depa.consumer.dto.ConsumerGrantResponse.class);
    }

    public List<java.util.Map<String, Object>> getOutgoingDataRequests(String internalApiKey) {
        return restClient.get()
                .uri("/api/bridge/consumer/data-requests")
                .header("X-API-KEY", internalApiKey)
                .retrieve()
                .body(new org.springframework.core.ParameterizedTypeReference<List<java.util.Map<String, Object>>>() {});
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
