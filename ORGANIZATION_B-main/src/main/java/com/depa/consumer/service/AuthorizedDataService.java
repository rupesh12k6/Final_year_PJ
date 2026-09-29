package com.depa.consumer.service;

import com.depa.consumer.client.ConsentManagerClient;
import com.depa.consumer.security.CmDataAccessJwtValidator;
import io.jsonwebtoken.Claims;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AuthorizedDataService {

    private final CmDataAccessJwtValidator jwtValidator;
    private final ConsentManagerClient consentManagerClient;

    public AuthorizedDataService(
            CmDataAccessJwtValidator jwtValidator,
            ConsentManagerClient consentManagerClient
    ) {
        this.jwtValidator = jwtValidator;
        this.consentManagerClient = consentManagerClient;
    }

    public Map<String, Object> fetchAuthorizedData(String grantId, String accessJwt) {
        if (accessJwt == null || accessJwt.isBlank()) {
            throw new SecurityException("Missing Bearer Access JWT");
        }

        // 1. Cryptographic RS256 Signature & Claims Validation
        Claims claims = jwtValidator.validateAndExtractClaims(accessJwt);
        String tokenGrantId = jwtValidator.extractGrantId(claims);
        String dataPrincipalId = jwtValidator.extractDataPrincipalId(claims);

        if (!grantId.equalsIgnoreCase(tokenGrantId)) {
            throw new SecurityException("Grant ID in URL does not match Grant ID in Access Token");
        }

        // 2. Real-Time Revocation & Lifecycle Verification with Consent Manager
        ConsentManagerClient.GrantValidationResult liveCheck = consentManagerClient.validateGrantLive(grantId);
        if (liveCheck == null || !liveCheck.isValid()) {
            String reason = liveCheck != null ? liveCheck.getMessage() : "Unknown revocation error";
            
            if (reason.contains("unreachable")) {
                System.err.println("WARN: Consent Manager is unreachable. Falling back to offline JWT validation for Grant ID: " + grantId);
            } else {
                throw new SecurityException("Access Denied: Grant is not currently active. " + reason);
            }
        }

        // 3. Extract Scope
        List<String> approvedFields = liveCheck != null ? liveCheck.getApprovedFields() : null;
        if (approvedFields == null || approvedFields.isEmpty()) {
            approvedFields = jwtValidator.extractScope(claims);
        }

        // 4. Mock Data Generation for College B acting as a Provider
        Map<String, Object> mockData = new LinkedHashMap<>();
        mockData.put("principalId", dataPrincipalId);
        for (String field : approvedFields) {
            mockData.put(field, "MOCK_DATA_FOR_ORG_B_" + field);
        }

        return mockData;
    }
}
