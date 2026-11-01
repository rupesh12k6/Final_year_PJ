package com.depa.provider.dto;

public class AuthResponse {

    private String accessToken;
    private String email;
    private String role;
    private String organizationCode;
    private String studentId;
    private String name;

    public AuthResponse() {}

    public AuthResponse(String accessToken, String email, String role, String organizationCode) {
        this(accessToken, email, role, organizationCode, null, null);
    }

    public AuthResponse(String accessToken, String email, String role, String organizationCode, String studentId, String name) {
        this.accessToken = accessToken;
        this.email = email;
        this.role = role;
        this.organizationCode = organizationCode;
        this.studentId = studentId;
        this.name = name;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getToken() {
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

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
