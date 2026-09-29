package com.depa.consent.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "consent_requests")
public class ConsentRequest {

    @Id
    @Column(name = "consent_request_id", length = 64, nullable = false, updatable = false)
    private String id;

    @Column(name = "data_request_id", length = 64, nullable = false)
    private String dataRequestId;

    @Column(name = "data_principal_id", length = 64, nullable = false)
    private String dataPrincipalId;

    @Column(name = "data_principal_org_id", length = 64, nullable = false)
    private String dataPrincipalOrganizationId;

    @Column(name = "requester_org_id", length = 64, nullable = false)
    private String requesterOrganizationId;

    @Column(name = "requester_user_id", length = 64, nullable = false)
    private String requesterUserId;

    @Column(name = "purpose", length = 255, nullable = false)
    private String purpose;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "consent_request_fields", joinColumns = @JoinColumn(name = "consent_request_id"))
    @Column(name = "field_name", length = 64, nullable = false)
    private List<String> requestedFields = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private ConsentRequestStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ConsentRequest() {}

    public ConsentRequest(String id, String dataRequestId, String dataPrincipalId,
                          String dataPrincipalOrganizationId, String requesterOrganizationId,
                          String requesterUserId, String purpose, List<String> requestedFields,
                          ConsentRequestStatus status, Instant expiresAt) {
        this.id = id;
        this.dataRequestId = dataRequestId;
        this.dataPrincipalId = dataPrincipalId;
        this.dataPrincipalOrganizationId = dataPrincipalOrganizationId;
        this.requesterOrganizationId = requesterOrganizationId;
        this.requesterUserId = requesterUserId;
        this.purpose = purpose;
        this.requestedFields = requestedFields != null ? new ArrayList<>(requestedFields) : new ArrayList<>();
        this.status = status;
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

    public String getDataRequestId() {
        return dataRequestId;
    }

    public void setDataRequestId(String dataRequestId) {
        this.dataRequestId = dataRequestId;
    }

    public String getDataPrincipalId() {
        return dataPrincipalId;
    }

    public void setDataPrincipalId(String dataPrincipalId) {
        this.dataPrincipalId = dataPrincipalId;
    }

    public String getDataPrincipalOrganizationId() {
        return dataPrincipalOrganizationId;
    }

    public void setDataPrincipalOrganizationId(String dataPrincipalOrganizationId) {
        this.dataPrincipalOrganizationId = dataPrincipalOrganizationId;
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

    public ConsentRequestStatus getStatus() {
        return status;
    }

    public void setStatus(ConsentRequestStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
