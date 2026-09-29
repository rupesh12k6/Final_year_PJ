package com.depa.consent.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "consents")
public class Consent {

    @Id
    @Column(name = "consent_id", length = 64, nullable = false, updatable = false)
    private String id;

    @Column(name = "consent_request_id", length = 64, nullable = false)
    private String consentRequestId;

    @Column(name = "data_principal_id", length = 64, nullable = false)
    private String dataPrincipalId;

    @Column(name = "provider_organization_id", length = 64, nullable = false)
    private String providerOrganizationId;

    @Column(name = "requester_organization_id", length = 64, nullable = false)
    private String requesterOrganizationId;

    @Column(name = "purpose", length = 255, nullable = false)
    private String purpose;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "consent_approved_fields", joinColumns = @JoinColumn(name = "consent_id"))
    @Column(name = "field_name", length = 64, nullable = false)
    private List<String> approvedFields = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private ConsentStatus status;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Consent() {}

    public Consent(String id, String consentRequestId, String dataPrincipalId,
                   String providerOrganizationId, String requesterOrganizationId,
                   String purpose, List<String> approvedFields, ConsentStatus status,
                   Instant expiresAt) {
        this.id = id;
        this.consentRequestId = consentRequestId;
        this.dataPrincipalId = dataPrincipalId;
        this.providerOrganizationId = providerOrganizationId;
        this.requesterOrganizationId = requesterOrganizationId;
        this.purpose = purpose;
        this.approvedFields = approvedFields != null ? new ArrayList<>(approvedFields) : new ArrayList<>();
        this.status = status;
        this.grantedAt = Instant.now();
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
        if (grantedAt == null) {
            grantedAt = Instant.now();
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

    public String getConsentRequestId() {
        return consentRequestId;
    }

    public void setConsentRequestId(String consentRequestId) {
        this.consentRequestId = consentRequestId;
    }

    public String getDataPrincipalId() {
        return dataPrincipalId;
    }

    public void setDataPrincipalId(String dataPrincipalId) {
        this.dataPrincipalId = dataPrincipalId;
    }

    public String getProviderOrganizationId() {
        return providerOrganizationId;
    }

    public void setProviderOrganizationId(String providerOrganizationId) {
        this.providerOrganizationId = providerOrganizationId;
    }

    public String getRequesterOrganizationId() {
        return requesterOrganizationId;
    }

    public void setRequesterOrganizationId(String requesterOrganizationId) {
        this.requesterOrganizationId = requesterOrganizationId;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public List<String> getApprovedFields() {
        return approvedFields;
    }

    public void setApprovedFields(List<String> approvedFields) {
        this.approvedFields = approvedFields != null ? new ArrayList<>(approvedFields) : new ArrayList<>();
    }

    public ConsentStatus getStatus() {
        return status;
    }

    public void setStatus(ConsentStatus status) {
        this.status = status;
    }

    public Instant getGrantedAt() {
        return grantedAt;
    }

    public void setGrantedAt(Instant grantedAt) {
        this.grantedAt = grantedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
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
