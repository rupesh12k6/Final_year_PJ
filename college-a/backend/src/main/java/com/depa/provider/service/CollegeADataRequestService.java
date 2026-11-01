package com.depa.provider.service;

import com.depa.provider.client.ConsentManagerClient;
import com.depa.provider.dto.ConsumerGrantResponse;
import com.depa.provider.dto.InitiateDataRequest;
import com.depa.provider.security.InternalApiKeyValidator;
import com.depa.provider.security.ProviderEndpointSecurityValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class CollegeADataRequestService {

    private static final Logger log = LoggerFactory.getLogger(CollegeADataRequestService.class);

    private final ConsentManagerClient cmClient;
    private final ProviderEndpointSecurityValidator endpointValidator;
    private final InternalApiKeyValidator apiKeyValidator;

    public CollegeADataRequestService(
            ConsentManagerClient cmClient,
            ProviderEndpointSecurityValidator endpointValidator,
            InternalApiKeyValidator apiKeyValidator
    ) {
        this.cmClient = cmClient;
        this.endpointValidator = endpointValidator;
        this.apiKeyValidator = apiKeyValidator;
    }

    public Map<String, Object> initiateDataRequest(InitiateDataRequest request) {
        try {
            return cmClient.initiateDataRequest(request, apiKeyValidator.getConfiguredKey());
        } catch (Exception e) {
            log.error("Failed to initiate data request with Consent Manager: {}", e.getMessage());
            throw new RuntimeException("Consent Manager communication failed: " + e.getMessage(), e);
        }
    }

    public ConsumerGrantResponse getConsumerGrant(String dataRequestId) {
        try {
            return cmClient.getConsumerGrant(dataRequestId, apiKeyValidator.getConfiguredKey());
        } catch (Exception e) {
            log.error("Failed to retrieve grant from Consent Manager: {}", e.getMessage());
            throw new RuntimeException("Consent Manager communication failed: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> getOutgoingRequests() {
        try {
            return cmClient.getOutgoingDataRequests(apiKeyValidator.getConfiguredKey());
        } catch (Exception e) {
            log.error("Failed to retrieve outgoing data requests from Consent Manager: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    public Map<String, Object> getConsumerGrantStatus(String dataRequestId) {
        ConsumerGrantResponse grant = getConsumerGrant(dataRequestId);
        Map<String, Object> statusMap = new LinkedHashMap<>();
        if (grant != null) {
            statusMap.put("ready", grant.isReady());
            statusMap.put("status", grant.getStatus());
            statusMap.put("grantId", grant.getGrantId());
            statusMap.put("consentId", grant.getConsentId());
            statusMap.put("dataRequestId", grant.getDataRequestId());
            statusMap.put("providerOrganizationCode", grant.getProviderOrganizationCode());
            statusMap.put("approvedFields", grant.getApprovedFields());
            statusMap.put("expiresAt", grant.getExpiresAt());
            statusMap.put("message", grant.getMessage());
        } else {
            statusMap.put("ready", false);
            statusMap.put("status", "NOT_FOUND");
        }
        return statusMap;
    }

    public Map<String, Object> fetchAuthorizedData(String dataRequestId, String clientSuppliedProviderUrl) {
        ConsumerGrantResponse grant = getConsumerGrant(dataRequestId);
        if (grant == null || !grant.isReady() || grant.getAccessToken() == null) {
            String status = grant != null ? grant.getStatus() : "UNKNOWN";
            throw new RuntimeException("Consent not approved or grant not ready. Current status: " + status);
        }

        // Strictly resolve and validate provider endpoint against SSRF and registered metadata
        ProviderEndpointSecurityValidator.ValidatedProviderTarget target = endpointValidator.resolveAndValidateProviderTarget(
                grant.getProviderOrganizationCode(),
                grant.getProviderEndpointUrl(),
                clientSuppliedProviderUrl
        );

        // Configure RestClient with pinned-IP request factory (redirects disabled, DNS rebinding eliminated)
        RestClient providerClient = RestClient.builder()
                .requestFactory(endpointValidator.createSecureRequestFactory(target))
                .baseUrl(target.getBaseUrl())
                .build();

        try {
            Map<String, Object> retrievedData = providerClient.get()
                    .uri("/api/data/access/{grantId}", grant.getGrantId())
                    .header("Authorization", "Bearer " + grant.getAccessToken())
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("dataRequestId", dataRequestId);
            response.put("grantId", grant.getGrantId());
            response.put("status", grant.getStatus());
            response.put("approvedFields", grant.getApprovedFields());
            response.put("retrievedData", retrievedData);
            return response;
        } catch (HttpClientErrorException e) {
            log.error("Provider rejected data access: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Provider rejected data access (" + e.getStatusCode() + "): " + e.getResponseBodyAsString(), e);
        }
    }
}

