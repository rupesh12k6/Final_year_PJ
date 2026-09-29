package com.depa.consent.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class VerifyOtpRequest {

    @JsonAlias({"id", "externalIdentityId"})
    private String userId;

    private String email;

    @NotBlank(message = "OTP is required")
    @Pattern(regexp = "^[0-9]{6}$", message = "OTP must be a 6-digit number")
    private String otp;

    public VerifyOtpRequest() {}

    public VerifyOtpRequest(String userId, String otp) {
        this.userId = userId;
        this.otp = otp;
    }

    public VerifyOtpRequest(String userId, String email, String otp) {
        this.userId = userId;
        this.email = email;
        this.otp = otp;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }
}
