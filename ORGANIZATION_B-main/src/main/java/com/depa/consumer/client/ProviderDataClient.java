package com.depa.consumer.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class ProviderDataClient {

    private static final Logger log = LoggerFactory.getLogger(ProviderDataClient.class);

    private final RestClient restClient;
    private final String providerBaseUrl;

    public ProviderDataClient(
            @Value("${app.provider.base-url:http://localhost:8081}") String providerBaseUrl
    ) {
        this.providerBaseUrl = providerBaseUrl;
        this.restClient = RestClient.builder().baseUrl(providerBaseUrl).build();
    }

    /**
     * Direct Data Access Call: College B connects directly to Provider (College A).
     * The Consent Manager is NOT in this path.
     */
    public ResponseEntity<com.depa.consumer.dto.DataExchangeResponse> fetchAuthorizedDataFromProvider(String grantId, String accessToken, String consumerPublicKey) {
        log.info("Consumer directly requesting data from Provider at: {}/api/data/access/{}", providerBaseUrl, grantId);

        com.depa.consumer.dto.DataExchangeRequest req = new com.depa.consumer.dto.DataExchangeRequest(consumerPublicKey);

        return restClient.post()
                .uri("/api/data/access/{grantId}", grantId)
                .header("Authorization", "Bearer " + accessToken.trim())
                .body(req)
                .retrieve()
                .toEntity(com.depa.consumer.dto.DataExchangeResponse.class);
    }
}
