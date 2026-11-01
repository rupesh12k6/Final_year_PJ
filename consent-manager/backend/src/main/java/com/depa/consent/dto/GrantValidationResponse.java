package com.depa.consent.dto;

import java.time.Instant;
import java.util.List;

public class GrantValidationResponse {

    private boolean valid;
    private String grantId;
    private String consentId;
    private String dataPrincipalId;
    private String providerOrganizationId;
    private String providerOrganizationCode;
    private String requesterOrganizationId;
    private String requesterOrganizationCode;
    private List<String> approvedFields;
    private String purpose;
    private Instant expiresAt;
    private String message;

    public GrantValidationResponse() {}

    public static GrantValidationResponse invalid(String message) {
        GrantValidationResponse res = new GrantValidationResponse();
        res.setValid(false);
        res.setMessage(message);
        return res;
    }

    public static GrantValidationResponse valid(
            String grantId, String consentId, String dataPrincipalId,
            String providerOrgId, String providerOrgCode,
            String requesterOrgId, String requesterOrgCode,
            List<String> approvedFields, String purpose, Instant expiresAt
    ) {
        GrantValidationResponse res = new GrantValidationResponse();
        res.setValid(true);
        res.setGrantId(grantId);
        res.setConsentId(consentId);
        res.setDataPrincipalId(dataPrincipalId);
        res.setProviderOrganizationId(providerOrgId);
        res.setProviderOrganizationCode(providerOrgCode);
        res.setRequesterOrganizationId(requesterOrgId);
        res.setRequesterOrganizationCode(requesterOrgCode);
        res.setApprovedFields(approvedFields);
        res.setPurpose(purpose);
        res.setExpiresAt(expiresAt);
        res.setMessage("Access grant and associated consent are ACTIVE and valid.");
        return res;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
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

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
