package com.depa.consent.dto;

import java.util.List;

public class BridgeApproveConsentRequest {

    private List<String> approvedFields;

    public BridgeApproveConsentRequest() {}

    public BridgeApproveConsentRequest(List<String> approvedFields) {
        this.approvedFields = approvedFields;
    }

    public List<String> getApprovedFields() {
        return approvedFields;
    }

    public void setApprovedFields(List<String> approvedFields) {
        this.approvedFields = approvedFields;
    }
}

