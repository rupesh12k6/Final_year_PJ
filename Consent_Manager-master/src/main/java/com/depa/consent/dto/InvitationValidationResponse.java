package com.depa.consent.dto;

import java.time.Instant;

public class InvitationValidationResponse {

    private boolean valid;
    private String organizationCode;
    private String organizationName;
    private String maskedEmail;
    private Instant expiresAt;

    public InvitationValidationResponse() {}

    public InvitationValidationResponse(boolean valid, String organizationCode, String organizationName, String maskedEmail, Instant expiresAt) {
        this.valid = valid;
        this.organizationCode = organizationCode;
        this.organizationName = organizationName;
        this.maskedEmail = maskedEmail;
        this.expiresAt = expiresAt;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getOrganizationCode() {
        return organizationCode;
    }

    public void setOrganizationCode(String organizationCode) {
        this.organizationCode = organizationCode;
    }

    public String getOrganizationName() {
        return organizationName;
    }

    public void setOrganizationName(String organizationName) {
        this.organizationName = organizationName;
    }

    public String getMaskedEmail() {
        return maskedEmail;
    }

    public void setMaskedEmail(String maskedEmail) {
        this.maskedEmail = maskedEmail;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
}
