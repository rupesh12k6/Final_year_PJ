package com.depa.consumer.controller;

import com.depa.consumer.client.ProviderDataClient;
import com.depa.consumer.dto.DirectDataAccessRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/consumer")
public class ConsumerDataExchangeController {

    private final ProviderDataClient providerDataClient;

    public ConsumerDataExchangeController(ProviderDataClient providerDataClient) {
        this.providerDataClient = providerDataClient;
    }

    /**
     * Endpoint for College B Consumer system to directly fetch authorized data from Provider.
     * Demonstrates that College B executes direct peer-to-peer data access using the CM-issued Access Token.
     */
    @PostMapping("/fetch-direct-data")
    public ResponseEntity<?> fetchDirectDataFromProvider(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @RequestBody DirectDataAccessRequest request) {
            
        // Basic Security: Protect Open Proxy Endpoint (Mistake #3)
        if (apiKey == null || !apiKey.equals("B-INTERNAL-SECRET-KEY")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized", "message", "Invalid or missing X-API-KEY"));
        }
            
        if (request.getGrantId() == null || request.getAccessToken() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bad Request", "message", "grantId and accessToken are required"));
        }

        try {
            // Generate Consumer's DH KeyPair
            java.security.KeyPair consumerKeyPair = com.depa.consumer.client.DiffieHellmanUtil.generateKeyPair();
            String consumerPublicKeyBase64 = com.depa.consumer.client.DiffieHellmanUtil.encodePublicKey(consumerKeyPair.getPublic());
        
            // Fetch Encrypted Data
            ResponseEntity<com.depa.consumer.dto.DataExchangeResponse> responseEntity = providerDataClient.fetchAuthorizedDataFromProvider(
                    request.getGrantId(),
                    request.getAccessToken(),
                    consumerPublicKeyBase64
            );
            
            com.depa.consumer.dto.DataExchangeResponse exchangeResponse = responseEntity.getBody();
            if (exchangeResponse == null || exchangeResponse.getEncryptedData() == null) {
                return ResponseEntity.status(500).body(Map.of("error", "Data Error", "message", "No encrypted data received"));
            }
            
            // Decode Provider's Public Key
            java.security.PublicKey providerPubKey = com.depa.consumer.client.DiffieHellmanUtil.decodePublicKey(exchangeResponse.getProviderPublicKey());
            
            // Generate Shared Secret
            byte[] sharedSecret = com.depa.consumer.client.DiffieHellmanUtil.generateSharedSecret(consumerKeyPair.getPrivate(), providerPubKey);
            
            // Decrypt the payload
            String decryptedJson = com.depa.consumer.client.DiffieHellmanUtil.decrypt(exchangeResponse.getEncryptedData(), sharedSecret);
            
            // Parse decrypted JSON back to Map
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, Object> clearData = mapper.readValue(decryptedJson, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
            
            return ResponseEntity.status(responseEntity.getStatusCode()).body(clearData);
            
        } catch (Exception e) {
            return ResponseEntity.status(403).body(Map.of("error", "Direct Access Failed", "message", e.getMessage()));
        }
    }
}
