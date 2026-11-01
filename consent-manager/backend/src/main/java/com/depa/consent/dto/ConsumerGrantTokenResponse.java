package com.depa.consent.dto;

import java.time.Instant;
import java.util.List;

public class ConsumerGrantTokenResponse {

    private boolean ready;
    private String message;
    private String grantId;
    private String consentId;
    private String dataRequestId;
    private String status;
    private String providerOrganizationCode;
    private String providerEndpointUrl;
    private String accessToken;
    private List<String> approvedFields;
    private Instant expiresAt;

    public ConsumerGrantTokenResponse() {}

    public static ConsumerGrantTokenResponse pending(String dataRequestId, String status, String message) {
        ConsumerGrantTokenResponse resp = new ConsumerGrantTokenResponse();
        resp.setReady(false);
        resp.setDataRequestId(dataRequestId);
        resp.setStatus(status);
        resp.setMessage(message);
        return resp;
    }

    public static ConsumerGrantTokenResponse active(String grantId, String consentId, String dataRequestId,
                                                    String status, String providerOrgCode, String accessToken,
                                                    List<String> approvedFields, Instant expiresAt) {
        ConsumerGrantTokenResponse resp = new ConsumerGrantTokenResponse();
        resp.setReady(true);
        resp.setMessage("Access token retrieved successfully");
        resp.setGrantId(grantId);
        resp.setConsentId(consentId);
        resp.setDataRequestId(dataRequestId);
        resp.setStatus(status);
        resp.setProviderOrganizationCode(providerOrgCode);
        resp.setAccessToken(accessToken);
        resp.setApprovedFields(approvedFields);
        resp.setExpiresAt(expiresAt);
        return resp;
    }

    public boolean isReady() { return ready; }
    public void setReady(boolean ready) { this.ready = ready; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getGrantId() { return grantId; }
    public void setGrantId(String grantId) { this.grantId = grantId; }

    public String getConsentId() { return consentId; }
    public void setConsentId(String consentId) { this.consentId = consentId; }

    public String getDataRequestId() { return dataRequestId; }
    public void setDataRequestId(String dataRequestId) { this.dataRequestId = dataRequestId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getProviderOrganizationCode() { return providerOrganizationCode; }
    public void setProviderOrganizationCode(String providerOrganizationCode) { this.providerOrganizationCode = providerOrganizationCode; }

    public String getProviderEndpointUrl() { return providerEndpointUrl; }
    public void setProviderEndpointUrl(String providerEndpointUrl) { this.providerEndpointUrl = providerEndpointUrl; }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public List<String> getApprovedFields() { return approvedFields; }
    public void setApprovedFields(List<String> approvedFields) { this.approvedFields = approvedFields; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}

