package com.depa.provider.controller;

import com.depa.provider.service.AuthorizedDataService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/data")
public class CollegeADataAccessController {

    private final AuthorizedDataService authorizedDataService;

    public CollegeADataAccessController(AuthorizedDataService authorizedDataService) {
        this.authorizedDataService = authorizedDataService;
    }

    /**
     * Direct Data Access Endpoint: Consumer calls Provider directly using CM-signed Access JWT.
     * The Consent Manager is NOT in the data transfer path.
     */
    @PostMapping("/access/{grantId}")
    public ResponseEntity<?> getAuthorizedData(
            @PathVariable("grantId") String grantId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody com.depa.provider.dto.DataExchangeRequest exchangeRequest
    ) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized", "message", "Missing or invalid Bearer Authorization header"));
        }

        String accessJwt = authHeader.substring(7).trim();

        try {
            Map<String, Object> data = authorizedDataService.fetchAuthorizedData(grantId, accessJwt);
            
            // Generate Provider's DH KeyPair
            java.security.KeyPair providerKeyPair = com.depa.provider.security.DiffieHellmanUtil.generateKeyPair();
            String providerPublicKeyBase64 = com.depa.provider.security.DiffieHellmanUtil.encodePublicKey(providerKeyPair.getPublic());
            
            // Decode Consumer's Public Key
            java.security.PublicKey consumerPubKey = com.depa.provider.security.DiffieHellmanUtil.decodePublicKey(exchangeRequest.getConsumerPublicKey());
            
            // Generate Shared Secret
            byte[] sharedSecret = com.depa.provider.security.DiffieHellmanUtil.generateSharedSecret(providerKeyPair.getPrivate(), consumerPubKey);
            
            // Serialize data to JSON (using simple string representation for demo, or Jackson ObjectMapper ideally)
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            String plainTextData = mapper.writeValueAsString(data);
            
            // Encrypt data
            String encryptedData = com.depa.provider.security.DiffieHellmanUtil.encrypt(plainTextData, sharedSecret);
            
            com.depa.provider.dto.DataExchangeResponse response = new com.depa.provider.dto.DataExchangeResponse(providerPublicKeyBase64, encryptedData);
            return ResponseEntity.ok(response);
            
        } catch (io.jsonwebtoken.JwtException | SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Error", "message", e.getMessage()));
        }
    }
}
