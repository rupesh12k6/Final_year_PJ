package com.depa.consent.dto;

import java.util.List;

public class ApproveConsentRequest {

    private List<String> approvedFields;

    public ApproveConsentRequest() {}

    public ApproveConsentRequest(List<String> approvedFields) {
        this.approvedFields = approvedFields;
    }

    public List<String> getApprovedFields() {
        return approvedFields;
    }

    public void setApprovedFields(List<String> approvedFields) {
        this.approvedFields = approvedFields;
    }
}
