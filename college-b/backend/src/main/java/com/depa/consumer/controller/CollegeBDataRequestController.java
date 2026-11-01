package com.depa.consumer.controller;

import com.depa.consumer.dto.ConsumerGrantResponse;
import com.depa.consumer.dto.InitiateDataRequest;
import com.depa.consumer.service.CollegeBDataRequestService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/consumer/data-requests")
public class CollegeBDataRequestController {

    private final CollegeBDataRequestService dataRequestService;
    private final com.depa.consumer.security.InternalApiKeyValidator apiKeyValidator;

    public CollegeBDataRequestController(
            CollegeBDataRequestService dataRequestService,
            com.depa.consumer.security.InternalApiKeyValidator apiKeyValidator
    ) {
        this.dataRequestService = dataRequestService;
        this.apiKeyValidator = apiKeyValidator;
    }

    /**
     * Endpoint for College B Consumer system to initiate data requests at Consent Manager.
     */
    @PostMapping({"", "/", "/initiate"})
    public ResponseEntity<Map<String, Object>> initiateDataRequest(@RequestBody InitiateDataRequest request) {
        Map<String, Object> response = dataRequestService.initiateDataRequest(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Endpoint for College B Consumer system to retrieve the Access Grant and RS256 token once approved.
     * Strictly restricted to internal backend-to-backend calls using X-API-KEY.
     * Normal ORG_ADMIN or browser sessions CANNOT retrieve the raw Access JWT.
     */
    @GetMapping("/{id}/grant")
    public ResponseEntity<?> getConsumerGrant(
            @PathVariable("id") String dataRequestId,
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey
    ) {
        if (!apiKeyValidator.isValid(apiKey)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .body(Map.of(
                            "error", "Access Denied",
                            "message", "Internal backend authentication required. Raw Access JWT is sealed in backend memory and cannot be retrieved via browser sessions."
                    ));
        }
        ConsumerGrantResponse response = dataRequestService.getConsumerGrant(dataRequestId);
        return ResponseEntity.ok()
                .header("Cache-Control", "no-store, no-cache, must-revalidate")
                .header("Pragma", "no-cache")
                .header("Expires", "0")
                .body(response);
    }

    /**
     * Sanitized endpoint for College B Consumer browser UI to check grant status without receiving Access JWT.
     */
    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> getConsumerGrantStatus(@PathVariable("id") String dataRequestId) {
        Map<String, Object> response = dataRequestService.getConsumerGrantStatus(dataRequestId);
        return ResponseEntity.ok()
                .header("Cache-Control", "no-store, no-cache, must-revalidate")
                .header("Pragma", "no-cache")
                .header("Expires", "0")
                .body(response);
    }

    /**
     * Secure Direct Data Fetch: College B backend retrieves data from Provider using internal Access JWT.
     * The raw token is NEVER exposed to browser JavaScript.
     */
    @PostMapping("/{id}/fetch-data")
    public ResponseEntity<?> fetchAuthorizedData(
            @PathVariable("id") String dataRequestId,
            @RequestParam(value = "providerUrl", required = false) String providerUrl
    ) {
        try {
            Map<String, Object> data = dataRequestService.fetchAuthorizedData(dataRequestId, providerUrl);
            return ResponseEntity.ok()
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .body(data);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .body(Map.of("error", "SSRF Blocked", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .body(Map.of("error", "Access Denied", "message", e.getMessage()));
        }
    }

    /**
     * Endpoint for College B Consumer dashboard to list all outgoing data requests.
     */
    @GetMapping
    public ResponseEntity<java.util.List<Map<String, Object>>> getOutgoingDataRequests() {
        return ResponseEntity.ok(dataRequestService.getOutgoingRequests());
    }
}
