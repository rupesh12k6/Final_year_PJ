package com.depa.consent.dto;

public class OtpVerificationResponse {

    private boolean success;
    private String message;
    private String userId;

    public OtpVerificationResponse() {}

    public OtpVerificationResponse(boolean success, String message, String userId) {
        this.success = success;
        this.message = message;
        this.userId = userId;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public boolean isVerified() {
        return success;
    }

    public void setVerified(boolean verified) {
        this.success = verified;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}
