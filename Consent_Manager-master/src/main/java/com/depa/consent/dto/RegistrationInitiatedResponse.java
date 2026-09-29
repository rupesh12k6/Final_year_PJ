package com.depa.consent.dto;

public class RegistrationInitiatedResponse {

    private String userId;
    private String maskedEmail;
    private String message;

    public RegistrationInitiatedResponse() {}

    public RegistrationInitiatedResponse(String userId, String maskedEmail, String message) {
        this.userId = userId;
        this.maskedEmail = maskedEmail;
        this.message = message;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getMaskedEmail() {
        return maskedEmail;
    }

    public void setMaskedEmail(String maskedEmail) {
        this.maskedEmail = maskedEmail;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
