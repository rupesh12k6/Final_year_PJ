package com.depa.consent.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class BulkOnboardRequest {

    @NotBlank(message = "Organization code is required")
    private String organizationCode;

    @NotEmpty(message = "Student onboarding items list cannot be empty")
    @Valid
    private List<StudentOnboardingItem> items;

    public BulkOnboardRequest() {}

    public BulkOnboardRequest(String organizationCode, List<StudentOnboardingItem> items) {
        this.organizationCode = organizationCode;
        this.items = items;
    }

    public String getOrganizationCode() {
        return organizationCode;
    }

    public void setOrganizationCode(String organizationCode) {
        this.organizationCode = organizationCode;
    }

    public List<StudentOnboardingItem> getItems() {
        return items;
    }

    public void setItems(List<StudentOnboardingItem> items) {
        this.items = items;
    }
}
