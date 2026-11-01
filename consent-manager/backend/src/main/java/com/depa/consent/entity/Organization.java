package com.depa.consent.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "organizations")
public class Organization {

    @Id
    @Column(name = "organization_id", length = 64, nullable = false, updatable = false)
    private String organizationId;

    @Column(name = "organization_code", length = 64, nullable = false, unique = true)
    private String organizationCode;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "email", length = 255, nullable = false)
    private String email;

    @Column(name = "login_endpoint", length = 512)
    private String loginEndpoint;

    @Column(name = "onboarding_endpoint", length = 512)
    private String onboardingEndpoint;

    @Column(name = "data_base_url", length = 512)
    private String dataBaseUrl;

    @Column(name = "public_key", length = 4096)
    private String publicKey;

    @Column(name = "key_id", length = 64)
    private String keyId;

    @Column(name = "previous_public_key", length = 4096)
    private String previousPublicKey;

    @Column(name = "previous_key_id", length = 64)
    private String previousKeyId;

    @Column(name = "previous_key_expires_at")
    private Instant previousKeyExpiresAt;

    @Column(name = "credentials", length = 512)
    private String credentials;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private OrganizationStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Organization() {}

    public Organization(String organizationId, String organizationCode, String name, String email, OrganizationStatus status) {
        this(organizationId, organizationCode, name, email, null, null, null, null, null, status);
    }

    public Organization(String organizationId, String organizationCode, String name, String email,
                        String loginEndpoint, String onboardingEndpoint, OrganizationStatus status) {
        this(organizationId, organizationCode, name, email, loginEndpoint, onboardingEndpoint, null, null, null, status);
    }

    public Organization(String organizationId, String organizationCode, String name, String email,
                        String loginEndpoint, String onboardingEndpoint, String dataBaseUrl,
                        String publicKey, String credentials, OrganizationStatus status) {
        this.organizationId = organizationId;
        this.organizationCode = organizationCode;
        this.name = name;
        this.email = email;
        this.loginEndpoint = loginEndpoint;
        this.onboardingEndpoint = onboardingEndpoint;
        this.dataBaseUrl = dataBaseUrl;
        this.publicKey = publicKey;
        this.credentials = credentials;
        this.status = status;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public String getId() {
        return organizationId;
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public String getOrganizationCode() {
        return organizationCode;
    }

    public void setOrganizationCode(String organizationCode) {
        this.organizationCode = organizationCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getLoginEndpoint() {
        return loginEndpoint;
    }

    public void setLoginEndpoint(String loginEndpoint) {
        this.loginEndpoint = loginEndpoint;
    }

    public String getOnboardingEndpoint() {
        return onboardingEndpoint;
    }

    public void setOnboardingEndpoint(String onboardingEndpoint) {
        this.onboardingEndpoint = onboardingEndpoint;
    }

    public String getDataBaseUrl() {
        return dataBaseUrl;
    }

    public void setDataBaseUrl(String dataBaseUrl) {
        this.dataBaseUrl = dataBaseUrl;
    }

    public String getPublicKey() {
        return publicKey;
    }

    public void setPublicKey(String publicKey) {
        this.publicKey = publicKey;
    }

    public String getKeyId() {
        return keyId;
    }

    public void setKeyId(String keyId) {
        this.keyId = keyId;
    }

    public String getPreviousPublicKey() {
        return previousPublicKey;
    }

    public void setPreviousPublicKey(String previousPublicKey) {
        this.previousPublicKey = previousPublicKey;
    }

    public String getPreviousKeyId() {
        return previousKeyId;
    }

    public void setPreviousKeyId(String previousKeyId) {
        this.previousKeyId = previousKeyId;
    }

    public Instant getPreviousKeyExpiresAt() {
        return previousKeyExpiresAt;
    }

    public void setPreviousKeyExpiresAt(Instant previousKeyExpiresAt) {
        this.previousKeyExpiresAt = previousKeyExpiresAt;
    }

    public String getCredentials() {
        return credentials;
    }

    public void setCredentials(String credentials) {
        this.credentials = credentials;
    }

    public OrganizationStatus getStatus() {
        return status;
    }

    public void setStatus(OrganizationStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
