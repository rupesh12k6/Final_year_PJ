package com.depa.consent.dto;

import com.depa.consent.entity.Organization;
import com.depa.consent.entity.OrganizationStatus;

import java.time.Instant;

/**
 * Dedicated Public Organization Registry DTO.
 * Exposes ONLY verified public trust metadata required for peer discovery,
 * peer-to-peer data client communication, and student assertion signature verification.
 * 
 * Strict Exclusions:
 * - NO credentials, secret API keys, or private signing keys.
 * - NO administrative email addresses or personal identifiers.
 * - NO internal registration or onboarding endpoints.
 */
public class PublicOrganizationResponse {

    private String organizationId;
    private String organizationCode;
    private String name;
    private String dataBaseUrl;
    private String publicKey;
    private OrganizationStatus status;
    private Instant createdAt;

    public PublicOrganizationResponse() {}

    public PublicOrganizationResponse(Organization org) {
        this.organizationId = org.getOrganizationId();
        this.organizationCode = org.getOrganizationCode();
        this.name = org.getName();
        this.dataBaseUrl = org.getDataBaseUrl();
        this.publicKey = org.getPublicKey();
        this.status = org.getStatus();
        this.createdAt = org.getCreatedAt();
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
}

