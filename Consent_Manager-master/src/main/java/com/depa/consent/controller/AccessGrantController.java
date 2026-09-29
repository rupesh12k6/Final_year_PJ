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

    public AccessGrantController(AccessGrantService accessGrantService) {
        this.accessGrantService = accessGrantService;
    }

    /**
     * Provider verification endpoint: Validate live status of access grant and consent.
     */
    @GetMapping("/{grantId}/validate")
    public ResponseEntity<GrantValidationResponse> validateGrant(@PathVariable("grantId") String grantId) {
        GrantValidationResponse response = accessGrantService.validateGrant(grantId);
        return ResponseEntity.ok(response);
    }

    /**
     * Public endpoint to retrieve CM's RS256 Public Key for JWT signature verification.
     */
    @GetMapping(value = "/public-key", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getPublicKeyPem() {
        return ResponseEntity.ok(accessGrantService.getPublicKeyPem());
    }

    @GetMapping("/{grantId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AccessGrantResponse> getGrantById(
            @PathVariable("grantId") String grantId,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(accessGrantService.getGrantById(grantId, actor));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AccessGrantResponse>> getGrantsForRequester(
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(accessGrantService.getGrantsForRequester(actor));
    }
}
