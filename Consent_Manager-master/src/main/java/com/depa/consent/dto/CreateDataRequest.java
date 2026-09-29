package com.depa.consent.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class CreateDataRequest {

    @NotBlank(message = "dataPrincipalId is required")
    @JsonAlias({"studentId", "externalIdentityId"})
    private String dataPrincipalId;

    @NotBlank(message = "providerOrganizationId is required")
    @JsonAlias({"providerOrgId", "providerOrganizationCode", "providerCode"})
    private String providerOrganizationId;

    @NotBlank(message = "purpose is required")
    private String purpose;

    @NotEmpty(message = "requestedFields list must not be empty")
    private List<String> requestedFields;

    public CreateDataRequest() {}

    public CreateDataRequest(String dataPrincipalId, String providerOrganizationId, String purpose, List<String> requestedFields) {
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
