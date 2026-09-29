package com.depa.consent.dto;

import com.depa.consent.entity.Consent;
import com.depa.consent.entity.ConsentStatus;

import java.time.Instant;
import java.util.List;

public class ConsentResponse {

    private String id;
    private String consentRequestId;
    private String dataPrincipalId;
    private String providerOrganizationId;
    private String providerOrganizationCode;
    private String requesterOrganizationId;
    private String requesterOrganizationCode;
    private String purpose;
    private List<String> approvedFields;
    private ConsentStatus status;
    private Instant grantedAt;
    private Instant expiresAt;
    private Instant revokedAt;

    public ConsentResponse() {}

    public ConsentResponse(Consent consent, String providerOrgCode, String requesterOrgCode) {
        this.id = consent.getId();
        this.consentRequestId = consent.getConsentRequestId();
        this.dataPrincipalId = consent.getDataPrincipalId();
        this.providerOrganizationId = consent.getProviderOrganizationId();
        this.providerOrganizationCode = providerOrgCode;
        this.requesterOrganizationId = consent.getRequesterOrganizationId();
        this.requesterOrganizationCode = requesterOrgCode;
        this.purpose = consent.getPurpose();
        this.approvedFields = consent.getApprovedFields();
        this.status = consent.getStatus();
        this.grantedAt = consent.getGrantedAt();
        this.expiresAt = consent.getExpiresAt();
        this.revokedAt = consent.getRevokedAt();
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

    public String getProviderOrganizationCode() {
        return providerOrganizationCode;
    }

    public void setProviderOrganizationCode(String providerOrganizationCode) {
        this.providerOrganizationCode = providerOrganizationCode;
    }

    public String getRequesterOrganizationId() {
        return requesterOrganizationId;
    }

    public void setRequesterOrganizationId(String requesterOrganizationId) {
        this.requesterOrganizationId = requesterOrganizationId;
    }

    public String getRequesterOrganizationCode() {
        return requesterOrganizationCode;
    }

    public void setRequesterOrganizationCode(String requesterOrganizationCode) {
        this.requesterOrganizationCode = requesterOrganizationCode;
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
        this.approvedFields = approvedFields;
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
}
