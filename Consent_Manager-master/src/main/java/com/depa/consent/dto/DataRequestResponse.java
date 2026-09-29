package com.depa.consent.dto;

import com.depa.consent.entity.DataRequest;
import com.depa.consent.entity.DataRequestStatus;

import java.time.Instant;
import java.util.List;

public class DataRequestResponse {

    private String id;
    private String requesterOrganizationId;
    private String requesterOrganizationCode;
    private String requesterUserId;
    private String providerOrganizationId;
    private String providerOrganizationCode;
    private String dataPrincipalId;
    private String purpose;
    private List<String> requestedFields;
    private DataRequestStatus status;
    private Instant requestedAt;
    private Instant expiresAt;

    public DataRequestResponse() {}

    public DataRequestResponse(DataRequest request, String requesterOrgCode, String providerOrgCode) {
        this.id = request.getId();
        this.requesterOrganizationId = request.getRequesterOrganizationId();
        this.requesterOrganizationCode = requesterOrgCode;
        this.requesterUserId = request.getRequesterUserId();
        this.providerOrganizationId = request.getProviderOrganizationId();
        this.providerOrganizationCode = providerOrgCode;
        this.dataPrincipalId = request.getDataPrincipalId();
        this.purpose = request.getPurpose();
        this.requestedFields = request.getRequestedFields();
        this.status = request.getStatus();
        this.requestedAt = request.getRequestedAt();
        this.expiresAt = request.getExpiresAt();
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

    public String getRequesterOrganizationCode() {
        return requesterOrganizationCode;
    }

    public void setRequesterOrganizationCode(String requesterOrganizationCode) {
        this.requesterOrganizationCode = requesterOrganizationCode;
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
        this.requestedFields = requestedFields;
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
}
