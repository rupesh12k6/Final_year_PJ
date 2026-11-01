package com.depa.consent.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "data_requests")
public class DataRequest {

    @Id
    @Column(name = "request_id", length = 64, nullable = false, updatable = false)
    private String id;

    @Column(name = "requester_organization_id", length = 64, nullable = false)
    private String requesterOrganizationId;

    @Column(name = "requester_user_id", length = 64, nullable = false)
    private String requesterUserId;

    @Column(name = "provider_organization_id", length = 64, nullable = false)
    private String providerOrganizationId;

    @Column(name = "data_principal_id", length = 64, nullable = false)
    private String dataPrincipalId;

    @Column(name = "purpose", length = 255, nullable = false)
    private String purpose;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "data_request_fields", joinColumns = @JoinColumn(name = "request_id"))
    @Column(name = "field_name", length = 64, nullable = false)
    private List<String> requestedFields = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private DataRequestStatus status;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public DataRequest() {}

    public DataRequest(String id, String requesterOrganizationId, String requesterUserId,
                       String providerOrganizationId, String dataPrincipalId, String purpose,
                       List<String> requestedFields, DataRequestStatus status, Instant expiresAt) {
        this.id = id;
        this.requesterOrganizationId = requesterOrganizationId;
        this.requesterUserId = requesterUserId;
        this.providerOrganizationId = providerOrganizationId;
        this.dataPrincipalId = dataPrincipalId;
        this.purpose = purpose;
        this.requestedFields = requestedFields != null ? new ArrayList<>(requestedFields) : new ArrayList<>();
        this.status = status;
        this.requestedAt = Instant.now();
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
        if (requestedAt == null) {
            requestedAt = Instant.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRequesterOrganizationId() {
        return requesterOrganizationId;
    }

    public void setRequesterOrganizationId(String requesterOrganizationId) {
        this.requesterOrganizationId = requesterOrganizationId;
    }

    public String getRequesterUserId() {
        return requesterUserId;
    }

    public void setRequesterUserId(String requesterUserId) {
        this.requesterUserId = requesterUserId;
    }

    public String getProviderOrganizationId() {
        return providerOrganizationId;
    }

    public void setProviderOrganizationId(String providerOrganizationId) {
        this.providerOrganizationId = providerOrganizationId;
    }

    public String getDataPrincipalId() {
        return dataPrincipalId;
    }

    public void setDataPrincipalId(String dataPrincipalId) {
        this.dataPrincipalId = dataPrincipalId;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public List<String> getRequestedFields() {
        return requestedFields;
    }

    public void setRequestedFields(List<String> requestedFields) {
        this.requestedFields = requestedFields != null ? new ArrayList<>(requestedFields) : new ArrayList<>();
    }

    public DataRequestStatus getStatus() {
        return status;
    }

    public void setStatus(DataRequestStatus status) {
        this.status = status;
    }

    public Instant getRequestedAt() {
        return requestedAt;
    }

    public void setRequestedAt(Instant requestedAt) {
        this.requestedAt = requestedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
