package com.depa.consent.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class CreateOrganizationRequest {

    @NotBlank(message = "Organization code is required")
    @Pattern(regexp = "^[A-Z0-9_]+$", message = "Organization code must contain only uppercase letters, numbers, and underscores (e.g. COLLEGE_A)")
    @Size(min = 2, max = 64, message = "Organization code must be between 2 and 64 characters")
    private String organizationCode;

    @NotBlank(message = "Organization name is required")
    @Size(min = 2, max = 255, message = "Name must be between 2 and 255 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    @Size(min = 3, max = 255, message = "Email must be between 3 and 255 characters")
    private String email;

    @Size(max = 512, message = "Login endpoint must be at most 512 characters")
    private String loginEndpoint;

    @Size(max = 512, message = "Onboarding endpoint must be at most 512 characters")
    private String onboardingEndpoint;

    public CreateOrganizationRequest() {}

    public CreateOrganizationRequest(String organizationCode, String name, String email) {
        this(organizationCode, name, email, null, null);
    }

    public CreateOrganizationRequest(String organizationCode, String name, String email, String loginEndpoint, String onboardingEndpoint) {
        this.organizationCode = organizationCode;
        this.name = name;
        this.email = email;
        this.loginEndpoint = loginEndpoint;
        this.onboardingEndpoint = onboardingEndpoint;
    }

    public String getOrganizationCode() {
        return organizationCode;
    }

    public void setOrganizationCode(String organizationCode) {
        this.organizationCode = organizationCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getLoginEndpoint() {
        return loginEndpoint;
    }

    public void setLoginEndpoint(String loginEndpoint) {
        this.loginEndpoint = loginEndpoint;
    }

    public String getOnboardingEndpoint() {
        return onboardingEndpoint;
    }

    public void setOnboardingEndpoint(String onboardingEndpoint) {
        this.onboardingEndpoint = onboardingEndpoint;
    }
}
