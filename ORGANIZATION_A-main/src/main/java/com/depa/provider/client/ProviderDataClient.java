package com.depa.provider.client;

import com.depa.provider.dto.DataExchangeRequest;
import com.depa.provider.dto.DataExchangeResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class ProviderDataClient {

    private static final Logger log = LoggerFactory.getLogger(ProviderDataClient.class);

    private final RestClient restClient;

    public ProviderDataClient() {
        this.restClient = RestClient.builder().build();
    }

    public ResponseEntity<DataExchangeResponse> fetchAuthorizedDataFromProvider(
            String providerBaseUrl, String grantId, String accessToken, String consumerPublicKey) {
        log.info("Consumer directly requesting data from Provider at: {}/api/data/access/{}", providerBaseUrl, grantId);

        DataExchangeRequest req = new DataExchangeRequest();
        req.setConsumerPublicKey(consumerPublicKey);

        return restClient.post()
                .uri(providerBaseUrl + "/api/data/access/{grantId}", grantId)
                .header("Authorization", "Bearer " + accessToken.trim())
                .body(req)
                .retrieve()
                .toEntity(DataExchangeResponse.class);
    }
}
