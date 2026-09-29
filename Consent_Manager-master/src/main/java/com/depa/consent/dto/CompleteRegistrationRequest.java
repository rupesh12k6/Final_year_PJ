package com.depa.consent.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CompleteRegistrationRequest {

    @NotBlank(message = "Invitation token is required")
    private String token;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 64, message = "Password must be at least 6 characters long")
    private String password;

    public CompleteRegistrationRequest() {}

    public CompleteRegistrationRequest(String token, String password) {
        this.token = token;
        this.password = password;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
