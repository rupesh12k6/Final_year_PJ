package com.depa.consent.dto;

import com.depa.consent.entity.AccessGrant;
import com.depa.consent.entity.AccessGrantStatus;

import java.time.Instant;
import java.util.List;

public class AccessGrantResponse {

    private String grantId;
    private String consentId;
    private String requesterOrganizationId;
    private String requesterOrganizationCode;
    private String providerOrganizationId;
    private String providerOrganizationCode;
    private String dataPrincipalId;
    private List<String> approvedFields;
    private String purpose;
    private Instant issuedAt;
    private Instant expiresAt;
    private AccessGrantStatus status;
    private String accessToken;

    public AccessGrantResponse() {}

    public AccessGrantResponse(AccessGrant grant, String requesterOrgCode, String providerOrgCode, String accessToken) {
        this.grantId = grant.getId();
        this.consentId = grant.getConsentId();
        this.requesterOrganizationId = grant.getRequesterOrganizationId();
        this.requesterOrganizationCode = requesterOrgCode;
        this.providerOrganizationId = grant.getProviderOrganizationId();
        this.providerOrganizationCode = providerOrgCode;
        this.dataPrincipalId = grant.getDataPrincipalId();
        this.approvedFields = grant.getApprovedFields();
        this.purpose = grant.getPurpose();
        this.issuedAt = grant.getIssuedAt();
        this.expiresAt = grant.getExpiresAt();
        this.status = grant.getStatus();
        this.accessToken = accessToken;
    }

    public String getGrantId() {
        return grantId;
    }

    public void setGrantId(String grantId) {
        this.grantId = grantId;
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

    public String getRequesterOrganizationCode() {
        return requesterOrganizationCode;
    }

    public void setRequesterOrganizationCode(String requesterOrganizationCode) {
        this.requesterOrganizationCode = requesterOrganizationCode;
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
        this.approvedFields = approvedFields;
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

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }
}
