package com.depa.provider.dto;

import java.time.Instant;

public class ActivationValidationResponse {
    private boolean valid;
    private String studentId;
    private String name;
    private String maskedEmail;
    private Instant expiresAt;

    public ActivationValidationResponse() {}

    public ActivationValidationResponse(boolean valid, String studentId, String name, String maskedEmail, Instant expiresAt) {
        this.valid = valid;
        this.studentId = studentId;
        this.name = name;
        this.maskedEmail = maskedEmail;
        this.expiresAt = expiresAt;
    }

    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }
    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getMaskedEmail() { return maskedEmail; }
    public void setMaskedEmail(String maskedEmail) { this.maskedEmail = maskedEmail; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}

