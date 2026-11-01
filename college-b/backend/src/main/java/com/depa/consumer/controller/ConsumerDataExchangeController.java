package com.depa.consumer.controller;

import com.depa.consumer.client.DiffieHellmanUtil;
import com.depa.consumer.client.ProviderDataClient;
import com.depa.consumer.dto.DataExchangeResponse;
import com.depa.consumer.dto.DirectDataAccessRequest;
import com.depa.consumer.security.InternalApiKeyValidator;
import com.depa.consumer.security.ProviderEndpointSecurityValidator;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.KeyPair;
import java.security.PublicKey;
import java.util.Map;

@RestController
@RequestMapping("/api/consumer")
public class ConsumerDataExchangeController {

    private final ProviderDataClient providerDataClient;
    private final ProviderEndpointSecurityValidator endpointValidator;
    private final InternalApiKeyValidator apiKeyValidator;

    public ConsumerDataExchangeController(
            ProviderDataClient providerDataClient,
            ProviderEndpointSecurityValidator endpointValidator,
            InternalApiKeyValidator apiKeyValidator
    ) {
        this.providerDataClient = providerDataClient;
        this.endpointValidator = endpointValidator;
        this.apiKeyValidator = apiKeyValidator;
    }

    /**
     * Endpoint for College B Consumer system to directly fetch authorized data from Provider.
     * Demonstrates that College B executes direct peer-to-peer data access using the CM-issued Access Token.
     * Strictly validates internal API key and resolves provider endpoint against trusted registered metadata.
     */
    @PostMapping("/fetch-direct-data")
    public ResponseEntity<?> fetchDirectDataFromProvider(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @RequestParam(value = "providerUrl", defaultValue = "http://localhost:8081") String providerUrl,
            @RequestBody DirectDataAccessRequest request) {

        if (!apiKeyValidator.isValid(apiKey)) {
            return ResponseEntity.status(401)
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .body(Map.of("error", "Unauthorized", "message", "Missing or invalid X-API-KEY"));
        }

        if (request.getGrantId() == null || request.getAccessToken() == null) {
            return ResponseEntity.badRequest()
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .body(Map.of("error", "Bad Request", "message", "grantId and accessToken are required"));
        }

        try {
            // Strictly resolve and validate providerUrl against registered metadata (COLLEGE_A)
            // Eliminates DNS rebinding via connection pinning and disables HTTP redirects
            ProviderEndpointSecurityValidator.ValidatedProviderTarget target =
                    endpointValidator.resolveAndValidateProviderTarget("COLLEGE_A", null, providerUrl);

            // Generate Consumer's DH KeyPair
            KeyPair consumerKeyPair = DiffieHellmanUtil.generateKeyPair();
            String consumerPublicKeyBase64 = DiffieHellmanUtil.encodePublicKey(consumerKeyPair.getPublic());

            // Fetch Encrypted Data directly from Provider (e.g. College A)
            ResponseEntity<DataExchangeResponse> responseEntity = providerDataClient.fetchAuthorizedDataFromProvider(
                    target,
                    request.getGrantId(),
                    request.getAccessToken(),
                    consumerPublicKeyBase64
            );

            DataExchangeResponse exchangeResponse = responseEntity.getBody();
            if (exchangeResponse == null || exchangeResponse.getEncryptedData() == null) {
                return ResponseEntity.status(500)
                        .header("Cache-Control", "no-store, no-cache, must-revalidate")
                        .header("Pragma", "no-cache")
                        .header("Expires", "0")
                        .body(Map.of("error", "Data Error", "message", "No encrypted data received"));
            }

            // Decode Provider's Public Key
            PublicKey providerPubKey = DiffieHellmanUtil.decodePublicKey(exchangeResponse.getProviderPublicKey());

            // Generate Shared Secret
            byte[] sharedSecret = DiffieHellmanUtil.generateSharedSecret(consumerKeyPair.getPrivate(), providerPubKey);

            // Decrypt the payload
            String decryptedJson = DiffieHellmanUtil.decrypt(exchangeResponse.getEncryptedData(), sharedSecret);

            // Parse decrypted JSON back to Map
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> clearData = mapper.readValue(decryptedJson, new TypeReference<Map<String, Object>>() {});

            return ResponseEntity.status(responseEntity.getStatusCode())
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .body(clearData);

        } catch (SecurityException se) {
            return ResponseEntity.status(400)
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .body(Map.of("error", "SSRF Blocked", "message", se.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(403)
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .body(Map.of("error", "Direct Access Failed", "message", e.getMessage()));
        }
    }
}
