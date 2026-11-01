package com.depa.consumer.dto;

public class AuthResponse {
    private String token;
    private String adminId;
    private String name;
    private String email;
    private String role;
    private String organizationCode;
    private String studentId;

    public AuthResponse() {}

    public AuthResponse(String token, String adminId, String name, String email, String role, String organizationCode) {
        this(token, adminId, name, email, role, organizationCode, null);
    }

    public AuthResponse(String token, String adminId, String name, String email, String role, String organizationCode, String studentId) {
        this.token = token;
        this.adminId = adminId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.organizationCode = organizationCode;
        this.studentId = studentId;
    }

    public String getToken() { return token; }
    public String getAccessToken() { return token; }
    public String getAdminId() { return adminId; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getOrganizationCode() { return organizationCode; }
    public String getStudentId() { return studentId; }
}
