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
     * Supports both encrypted DH+GCM POST and direct authorized GET for inspection/tests.
     */
    @RequestMapping(value = "/access/{grantId}", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<?> getAuthorizedData(
            @PathVariable("grantId") String grantId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) com.depa.provider.dto.DataExchangeRequest exchangeRequest
    ) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized", "message", "Missing or invalid Bearer Authorization header"));
        }

        String accessJwt = authHeader.substring(7).trim();

        try {
            Map<String, Object> data = authorizedDataService.fetchAuthorizedData(grantId, accessJwt);
            
            // If consumer requested DH encryption (POST with Consumer Public Key)
            if (exchangeRequest != null && exchangeRequest.getConsumerPublicKey() != null && !exchangeRequest.getConsumerPublicKey().isBlank()) {
                java.security.KeyPair providerKeyPair = com.depa.provider.security.DiffieHellmanUtil.generateKeyPair();
                String providerPublicKeyBase64 = com.depa.provider.security.DiffieHellmanUtil.encodePublicKey(providerKeyPair.getPublic());
                
                java.security.PublicKey consumerPubKey = com.depa.provider.security.DiffieHellmanUtil.decodePublicKey(exchangeRequest.getConsumerPublicKey());
                byte[] sharedSecret = com.depa.provider.security.DiffieHellmanUtil.generateSharedSecret(providerKeyPair.getPrivate(), consumerPubKey);
                
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                String plainTextData = mapper.writeValueAsString(data);
                String encryptedData = com.depa.provider.security.DiffieHellmanUtil.encrypt(plainTextData, sharedSecret);
                
                com.depa.provider.dto.DataExchangeResponse response = new com.depa.provider.dto.DataExchangeResponse(providerPublicKeyBase64, encryptedData);
                return ResponseEntity.ok(response);
            }

            // Direct verified payload for GET / test requests
            return ResponseEntity.ok(data);
            
        } catch (io.jsonwebtoken.JwtException | SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Error", "message", e.getMessage()));
        }
    }
}
