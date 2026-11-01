package com.depa.provider.dto;

import java.time.Instant;
import java.util.List;

public class ConsentRequestDTO {

    private String id;
    private String dataRequestId;
    private String requesterOrganizationCode;
    private String requesterOrganizationName;
    private String purpose;
    private List<String> requestedFields;
    private String status;
    private Instant createdAt;
    private Instant expiresAt;

    public ConsentRequestDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDataRequestId() { return dataRequestId; }
    public void setDataRequestId(String dataRequestId) { this.dataRequestId = dataRequestId; }

    public String getRequesterOrganizationCode() { return requesterOrganizationCode; }
    public void setRequesterOrganizationCode(String requesterOrganizationCode) { this.requesterOrganizationCode = requesterOrganizationCode; }

    public String getRequesterOrganizationName() { return requesterOrganizationName; }
    public void setRequesterOrganizationName(String requesterOrganizationName) { this.requesterOrganizationName = requesterOrganizationName; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public List<String> getRequestedFields() { return requestedFields; }
    public void setRequestedFields(List<String> requestedFields) { this.requestedFields = requestedFields; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}

