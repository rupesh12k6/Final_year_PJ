package com.depa.consent.dto;

import com.depa.consent.entity.ConsentRequest;
import com.depa.consent.entity.ConsentRequestStatus;

import java.time.Instant;
import java.util.List;

public class ConsentRequestResponse {

    private String id;
    private String dataRequestId;
    private String dataPrincipalId;
    private String dataPrincipalOrganizationId;
    private String dataPrincipalOrganizationCode;
    private String dataPrincipalOrganizationName;
    private String requesterOrganizationId;
    private String requesterOrganizationCode;
    private String requesterOrganizationName;
    private String purpose;
    private List<String> requestedFields;
    private ConsentRequestStatus status;
    private Instant createdAt;
    private Instant expiresAt;

    public ConsentRequestResponse() {}

    public ConsentRequestResponse(ConsentRequest request,
                                  String principalOrgCode, String principalOrgName,
                                  String requesterOrgCode, String requesterOrgName) {
        this.id = request.getId();
        this.dataRequestId = request.getDataRequestId();
        this.dataPrincipalId = request.getDataPrincipalId();
        this.dataPrincipalOrganizationId = request.getDataPrincipalOrganizationId();
        this.dataPrincipalOrganizationCode = principalOrgCode;
        this.dataPrincipalOrganizationName = principalOrgName;
        this.requesterOrganizationId = request.getRequesterOrganizationId();
        this.requesterOrganizationCode = requesterOrgCode;
        this.requesterOrganizationName = requesterOrgName;
        this.purpose = request.getPurpose();
        this.requestedFields = request.getRequestedFields();
        this.status = request.getStatus();
        this.createdAt = request.getCreatedAt();
        this.expiresAt = request.getExpiresAt();
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

    public String getDataPrincipalOrganizationCode() {
        return dataPrincipalOrganizationCode;
    }

    public void setDataPrincipalOrganizationCode(String dataPrincipalOrganizationCode) {
        this.dataPrincipalOrganizationCode = dataPrincipalOrganizationCode;
    }

    public String getDataPrincipalOrganizationName() {
        return dataPrincipalOrganizationName;
    }

    public void setDataPrincipalOrganizationName(String dataPrincipalOrganizationName) {
        this.dataPrincipalOrganizationName = dataPrincipalOrganizationName;
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

    public String getRequesterOrganizationName() {
        return requesterOrganizationName;
    }

    public void setRequesterOrganizationName(String requesterOrganizationName) {
        this.requesterOrganizationName = requesterOrganizationName;
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
}
