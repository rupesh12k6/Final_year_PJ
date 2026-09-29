package com.depa.consumer.dto;

import java.util.List;

public class InitiateDataRequest {

    private String dataPrincipalId;
    private String providerOrganizationId;
    private String purpose;
    private List<String> requestedFields;

    public InitiateDataRequest() {}

    public InitiateDataRequest(String dataPrincipalId, String providerOrganizationId, String purpose, List<String> requestedFields) {
        this.dataPrincipalId = dataPrincipalId;
        this.providerOrganizationId = providerOrganizationId;
        this.purpose = purpose;
        this.requestedFields = requestedFields;
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
}
