package com.depa.consumer.client;

import com.depa.consumer.dto.DataExchangeRequest;
import com.depa.consumer.dto.DataExchangeResponse;
import com.depa.consumer.security.ProviderEndpointSecurityValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class ProviderDataClient {

    private static final Logger log = LoggerFactory.getLogger(ProviderDataClient.class);

    private final String defaultProviderBaseUrl;
    private final ProviderEndpointSecurityValidator endpointValidator;

    public ProviderDataClient(
            @Value("${app.provider.base-url:http://localhost:8081}") String providerBaseUrl,
            ProviderEndpointSecurityValidator endpointValidator
    ) {
        this.defaultProviderBaseUrl = providerBaseUrl;
        this.endpointValidator = endpointValidator;
    }

    /**
     * Direct Data Access Call: College B connects directly to Provider (e.g. College A).
     * Enforces pinned-IP DNS connection strategy with HTTP redirects disabled.
     */
    public ResponseEntity<DataExchangeResponse> fetchAuthorizedDataFromProvider(
            ProviderEndpointSecurityValidator.ValidatedProviderTarget target,
            String grantId,
            String accessToken,
            String consumerPublicKey) {

        log.info("Consumer directly requesting data from Provider at: {}/api/data/access/{}", target.getBaseUrl(), grantId);

        DataExchangeRequest req = new DataExchangeRequest(consumerPublicKey);
        RestClient client = RestClient.builder()
                .requestFactory(endpointValidator.createSecureRequestFactory(target))
                .baseUrl(target.getBaseUrl())
                .build();

        return client.post()
                .uri("/api/data/access/{grantId}", grantId)
                .header("Authorization", "Bearer " + accessToken.trim())
                .body(req)
                .retrieve()
                .toEntity(DataExchangeResponse.class);
    }

    /**
     * Backward-compatible overload resolving URL through ProviderEndpointSecurityValidator.
     */
    public ResponseEntity<DataExchangeResponse> fetchAuthorizedDataFromProvider(
            String targetProviderUrl, String grantId, String accessToken, String consumerPublicKey) {

        String urlToValidate = (targetProviderUrl != null && !targetProviderUrl.isBlank())
                ? targetProviderUrl : defaultProviderBaseUrl;

        ProviderEndpointSecurityValidator.ValidatedProviderTarget target =
                endpointValidator.resolveAndValidateProviderTarget("COLLEGE_A", null, urlToValidate);

        return fetchAuthorizedDataFromProvider(target, grantId, accessToken, consumerPublicKey);
    }
}
