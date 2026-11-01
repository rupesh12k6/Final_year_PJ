package com.depa.consent.controller;

import com.depa.consent.dto.AccessGrantResponse;
import com.depa.consent.dto.GrantValidationResponse;
import com.depa.consent.security.UserPrincipal;
import com.depa.consent.service.AccessGrantService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/access-grants")
public class AccessGrantController {

    private final AccessGrantService accessGrantService;
    private final com.depa.consent.security.RsaKeyProvider rsaKeyProvider;

    public AccessGrantController(AccessGrantService accessGrantService,
            com.depa.consent.security.RsaKeyProvider rsaKeyProvider) {
        this.accessGrantService = accessGrantService;
        this.rsaKeyProvider = rsaKeyProvider;
    }

    /**
     * Provider verification endpoint: Validate live status of access grant and
     * consent.
     */
    @GetMapping("/{grantId}/validate")
    public ResponseEntity<GrantValidationResponse> validateGrant(@PathVariable("grantId") String grantId) {
        GrantValidationResponse response = accessGrantService.validateGrant(grantId);
        return ResponseEntity.ok(response);
    }

    /**
     * Public endpoint to retrieve CM's RS256 Public Key for JWT signature verification.
     * Supports retrieving previous public key by key ID (kid) during key rotation overlap.
     */
    @GetMapping(value = "/public-key", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getPublicKeyPem(@RequestParam(value = "kid", required = false) String requestedKid) {
        if (requestedKid != null && !requestedKid.isBlank()) {
            String pem = rsaKeyProvider.getPublicKeyPem(requestedKid.trim());
            if (pem == null) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                        .header("X-KEY-STATUS", "UNKNOWN_OR_EXPIRED")
                        .body("Public key for kid " + requestedKid + " not found or expired");
            }
            return ResponseEntity.ok()
                    .header("X-KEY-ID", requestedKid.trim())
                    .body(pem);
        }
        return ResponseEntity.ok()
                .header("X-KEY-ID", rsaKeyProvider.getKeyId())
                .body(rsaKeyProvider.getPublicKeyPem());
    }

    @GetMapping("/{grantId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AccessGrantResponse> getGrantById(
            @PathVariable("grantId") String grantId,
            @AuthenticationPrincipal UserPrincipal actor) {
        return ResponseEntity.ok(accessGrantService.getGrantById(grantId, actor));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AccessGrantResponse>> getGrantsForRequester(
            @AuthenticationPrincipal UserPrincipal actor) {
        return ResponseEntity.ok(accessGrantService.getGrantsForRequester(actor));
    }
}
