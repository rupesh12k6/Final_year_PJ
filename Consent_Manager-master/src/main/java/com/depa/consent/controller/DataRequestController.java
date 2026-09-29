package com.depa.consent.controller;

import com.depa.consent.dto.CreateDataRequest;
import com.depa.consent.dto.DataRequestResponse;
import com.depa.consent.security.UserPrincipal;
import com.depa.consent.service.DataRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/data-requests")
@PreAuthorize("isAuthenticated()")
public class DataRequestController {

    private final DataRequestService dataRequestService;

    public DataRequestController(DataRequestService dataRequestService) {
        this.dataRequestService = dataRequestService;
    }

    @PostMapping
    public ResponseEntity<DataRequestResponse> createDataRequest(
            @Valid @RequestBody CreateDataRequest request,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        DataRequestResponse response = dataRequestService.createDataRequest(request, actor);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DataRequestResponse> getDataRequestById(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(dataRequestService.getDataRequestById(id, actor));
    }

    @GetMapping
    public ResponseEntity<List<DataRequestResponse>> getOutgoingDataRequests(
            @AuthenticationPrincipal UserPrincipal actor
    ) {
        return ResponseEntity.ok(dataRequestService.getOutgoingDataRequests(actor));
    }
}
