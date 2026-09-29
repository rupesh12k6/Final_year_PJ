package com.depa.consent.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "access_grants")
public class AccessGrant {

    @Id
    @Column(name = "grant_id", length = 64, nullable = false, updatable = false)
    private String id;

    @Column(name = "consent_id", length = 64, nullable = false)
    private String consentId;

    @Column(name = "requester_org_id", length = 64, nullable = false)
    private String requesterOrganizationId;

    @Column(name = "provider_org_id", length = 64, nullable = false)
    private String providerOrganizationId;

    @Column(name = "data_principal_id", length = 64, nullable = false)
    private String dataPrincipalId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "access_grant_fields", joinColumns = @JoinColumn(name = "grant_id"))
    @Column(name = "field_name", length = 64, nullable = false)
    private List<String> approvedFields = new ArrayList<>();

    @Column(name = "purpose", length = 255, nullable = false)
    private String purpose;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private AccessGrantStatus status;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public AccessGrant() {}

    public AccessGrant(String id, String consentId, String requesterOrganizationId,
                       String providerOrganizationId, String dataPrincipalId,
                       List<String> approvedFields, String purpose, Instant expiresAt,
                       AccessGrantStatus status) {
        this.id = id;
        this.consentId = consentId;
        this.requesterOrganizationId = requesterOrganizationId;
        this.providerOrganizationId = providerOrganizationId;
        this.dataPrincipalId = dataPrincipalId;
        this.approvedFields = approvedFields != null ? new ArrayList<>(approvedFields) : new ArrayList<>();
        this.purpose = purpose;
        this.issuedAt = Instant.now();
        this.expiresAt = expiresAt;
        this.status = status;
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
        if (issuedAt == null) {
            issuedAt = Instant.now();
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

    public String getConsentId() {
        return consentId;
    }

    public void setConsentId(String consentId) {
        this.consentId = consentId;
    }

    public String getRequesterOrganizationId() {
        return requesterOrganizationId;
    }

    public void setRequesterOrganizationId(String requesterOrganizationId) {
        this.requesterOrganizationId = requesterOrganizationId;
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

    public List<String> getApprovedFields() {
        return approvedFields;
    }

    public void setApprovedFields(List<String> approvedFields) {
        this.approvedFields = approvedFields != null ? new ArrayList<>(approvedFields) : new ArrayList<>();
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(Instant issuedAt) {
        this.issuedAt = issuedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public AccessGrantStatus getStatus() {
        return status;
    }

    public void setStatus(AccessGrantStatus status) {
        this.status = status;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(Instant revokedAt) {
        this.revokedAt = revokedAt;
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
