package com.depa.consumer.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "college_b_admins", uniqueConstraints = {
        @UniqueConstraint(name = "uk_admins_admin_id", columnNames = {"admin_id"}),
        @UniqueConstraint(name = "uk_admins_email", columnNames = {"email"})
})
public class CollegeBAdmin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_id", length = 64, nullable = false)
    private String adminId;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "email", length = 255, nullable = false)
    private String email;

    @Column(name = "password_hash", length = 255, nullable = false)
    private String passwordHash;

    @Column(name = "organization_code", length = 64, nullable = false)
    private String organizationCode;

    @Column(name = "role", length = 32, nullable = false)
    private String role;

    @Column(name = "scopes", length = 255, nullable = false)
    private String scopes;

    @Column(name = "status", length = 32, nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public CollegeBAdmin() {}

    public CollegeBAdmin(String adminId, String name, String email, String passwordHash,
                         String organizationCode, String role, String scopes, String status) {
        this.adminId = adminId;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.organizationCode = organizationCode;
        this.role = role;
        this.scopes = scopes;
        this.status = status;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getAdminId() { return adminId; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getOrganizationCode() { return organizationCode; }
    public String getRole() { return role; }
    public String getScopes() { return scopes; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
