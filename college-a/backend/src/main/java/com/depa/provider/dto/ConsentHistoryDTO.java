package com.depa.provider.dto;

import java.time.Instant;
import java.util.List;

public class ConsentHistoryDTO {

    private String id;
    private String consentRequestId;
    private String requesterOrganizationCode;
    private String purpose;
    private List<String> approvedFields;
    private String status;
    private Instant grantedAt;
    private Instant expiresAt;
    private Instant revokedAt;

    public ConsentHistoryDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getConsentRequestId() { return consentRequestId; }
    public void setConsentRequestId(String consentRequestId) { this.consentRequestId = consentRequestId; }

    public String getRequesterOrganizationCode() { return requesterOrganizationCode; }
    public void setRequesterOrganizationCode(String requesterOrganizationCode) { this.requesterOrganizationCode = requesterOrganizationCode; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public List<String> getApprovedFields() { return approvedFields; }
    public void setApprovedFields(List<String> approvedFields) { this.approvedFields = approvedFields; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getGrantedAt() { return grantedAt; }
    public void setGrantedAt(Instant grantedAt) { this.grantedAt = grantedAt; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }
}

