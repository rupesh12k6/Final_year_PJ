package com.depa.consumer.controller;

import com.depa.consumer.dto.DataExchangeRequest;
import com.depa.consumer.dto.DataExchangeResponse;
import com.depa.consumer.service.AuthorizedDataService;
import com.depa.consumer.client.DiffieHellmanUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.KeyPair;
import java.security.PublicKey;
import java.util.Map;

@RestController
@RequestMapping("/api/data")
public class ProviderDataAccessController {

    private final AuthorizedDataService authorizedDataService;

    public ProviderDataAccessController(AuthorizedDataService authorizedDataService) {
        this.authorizedDataService = authorizedDataService;
    }

    /**
     * Direct Data Access Endpoint: Consumer calls College B Provider directly using CM-signed Access JWT.
     * Supports both encrypted Diffie-Hellman + AES-GCM POST and direct authorized GET.
     */
    @RequestMapping(value = "/access/{grantId}", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<?> getAuthorizedData(
            @PathVariable("grantId") String grantId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) DataExchangeRequest exchangeRequest
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
                KeyPair providerKeyPair = DiffieHellmanUtil.generateKeyPair();
                String providerPublicKeyBase64 = DiffieHellmanUtil.encodePublicKey(providerKeyPair.getPublic());
                
                PublicKey consumerPubKey = DiffieHellmanUtil.decodePublicKey(exchangeRequest.getConsumerPublicKey());
                byte[] sharedSecret = DiffieHellmanUtil.generateSharedSecret(providerKeyPair.getPrivate(), consumerPubKey);
                
                ObjectMapper mapper = new ObjectMapper();
                String plainTextData = mapper.writeValueAsString(data);
                String encryptedData = DiffieHellmanUtil.encrypt(plainTextData, sharedSecret);
                
                DataExchangeResponse response = new DataExchangeResponse();
                response.setProviderPublicKey(providerPublicKeyBase64);
                response.setEncryptedData(encryptedData);
                return ResponseEntity.ok(response);
            }

            // Direct verified payload for GET / inspection requests
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
