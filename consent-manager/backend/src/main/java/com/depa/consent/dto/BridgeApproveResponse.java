package com.depa.consent.dto;

import java.time.Instant;
import java.util.List;

public class BridgeApproveResponse {

    private boolean success;
    private String message;
    private String consentId;
    private String status;
    private List<String> approvedFields;
    private Instant expiresAt;

    public BridgeApproveResponse() {}

    public BridgeApproveResponse(boolean success, String message, String consentId, String status, List<String> approvedFields, Instant expiresAt) {
        this.success = success;
        this.message = message;
        this.consentId = consentId;
        this.status = status;
        this.approvedFields = approvedFields;
        this.expiresAt = expiresAt;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getConsentId() { return consentId; }
    public void setConsentId(String consentId) { this.consentId = consentId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<String> getApprovedFields() { return approvedFields; }
    public void setApprovedFields(List<String> approvedFields) { this.approvedFields = approvedFields; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}

