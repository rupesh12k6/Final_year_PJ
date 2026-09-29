package com.depa.consent.dto;

import com.depa.consent.entity.Organization;
import com.depa.consent.entity.OrganizationStatus;

import java.time.Instant;

public class OrganizationResponse {

    private String organizationId;
    private String organizationCode;
    private String name;
    private String email;
    private String loginEndpoint;
    private String onboardingEndpoint;
    private OrganizationStatus status;
    private Instant createdAt;
    private Instant updatedAt;

    public OrganizationResponse() {}

    public OrganizationResponse(Organization org) {
        this.organizationId = org.getOrganizationId();
        this.organizationCode = org.getOrganizationCode();
        this.name = org.getName();
        this.email = org.getEmail();
        this.loginEndpoint = org.getLoginEndpoint();
        this.onboardingEndpoint = org.getOnboardingEndpoint();
        this.status = org.getStatus();
        this.createdAt = org.getCreatedAt();
        this.updatedAt = org.getUpdatedAt();
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
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

    public OrganizationStatus getStatus() {
        return status;
    }

    public void setStatus(OrganizationStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
