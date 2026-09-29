package com.depa.provider.dto;

public class AuthResponse {

    private String accessToken;
    private String email;
    private String role;
    private String organizationCode;

    public AuthResponse() {}

    public AuthResponse(String accessToken, String email, String role, String organizationCode) {
        this.accessToken = accessToken;
        this.email = email;
        this.role = role;
        this.organizationCode = organizationCode;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getOrganizationCode() {
        return organizationCode;
    }

    public void setOrganizationCode(String organizationCode) {
        this.organizationCode = organizationCode;
    }
}
