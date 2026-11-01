package com.depa.consent.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class BridgeDataRequest {

    @NotBlank(message = "Data Principal ID is required")
    private String dataPrincipalId;

    @NotBlank(message = "Provider Organization ID or Code is required")
    private String providerOrganizationId;

    @NotBlank(message = "Purpose is required")
    private String purpose;

    @NotEmpty(message = "Requested fields must not be empty")
    private List<String> requestedFields;

    private String initiatorUserId;

    public BridgeDataRequest() {}

    public BridgeDataRequest(String dataPrincipalId, String providerOrganizationId, String purpose, List<String> requestedFields) {
        this.dataPrincipalId = dataPrincipalId;
        this.providerOrganizationId = providerOrganizationId;
        this.purpose = purpose;
        this.requestedFields = requestedFields;
    }

    public String getDataPrincipalId() { return dataPrincipalId; }
    public void setDataPrincipalId(String dataPrincipalId) { this.dataPrincipalId = dataPrincipalId; }

    public String getProviderOrganizationId() { return providerOrganizationId; }
    public void setProviderOrganizationId(String providerOrganizationId) { this.providerOrganizationId = providerOrganizationId; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public List<String> getRequestedFields() { return requestedFields; }
    public void setRequestedFields(List<String> requestedFields) { this.requestedFields = requestedFields; }

    public String getInitiatorUserId() { return initiatorUserId; }
    public void setInitiatorUserId(String initiatorUserId) { this.initiatorUserId = initiatorUserId; }
}

