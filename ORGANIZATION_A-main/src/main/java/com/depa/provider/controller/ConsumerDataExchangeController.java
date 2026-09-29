package com.depa.provider.controller;

import com.depa.provider.client.ProviderDataClient;
import com.depa.provider.dto.DirectDataAccessRequest;
import com.depa.provider.dto.DataExchangeResponse;
import com.depa.provider.security.DiffieHellmanUtil;
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

    public ConsumerDataExchangeController(ProviderDataClient providerDataClient) {
        this.providerDataClient = providerDataClient;
    }

    @PostMapping("/fetch-direct-data")
    public ResponseEntity<?> fetchDirectDataFromProvider(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @RequestParam(value = "providerUrl", defaultValue = "http://localhost:8081") String providerUrl,
            @RequestBody DirectDataAccessRequest request) {
            
        if (apiKey == null || !apiKey.equals("A-INTERNAL-SECRET-KEY")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized", "message", "Invalid or missing X-API-KEY"));
        }
            
        if (request.getGrantId() == null || request.getAccessToken() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bad Request", "message", "grantId and accessToken are required"));
        }

        try {
            // Generate Consumer's DH KeyPair
            KeyPair consumerKeyPair = DiffieHellmanUtil.generateKeyPair();
            String consumerPublicKeyBase64 = DiffieHellmanUtil.encodePublicKey(consumerKeyPair.getPublic());
        
            // Fetch Encrypted Data
            ResponseEntity<DataExchangeResponse> responseEntity = providerDataClient.fetchAuthorizedDataFromProvider(
                    providerUrl,
                    request.getGrantId(),
                    request.getAccessToken(),
                    consumerPublicKeyBase64
            );
            
            DataExchangeResponse exchangeResponse = responseEntity.getBody();
            if (exchangeResponse == null || exchangeResponse.getEncryptedData() == null) {
                return ResponseEntity.status(500).body(Map.of("error", "Data Error", "message", "No encrypted data received"));
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
            
            return ResponseEntity.status(responseEntity.getStatusCode()).body(clearData);
            
        } catch (Exception e) {
            return ResponseEntity.status(403).body(Map.of("error", "Direct Access Failed", "message", e.getMessage()));
        }
    }
}
