package com.depa.consent.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "user_invitations", indexes = {
        @Index(name = "idx_invitation_token_hash", columnList = "token_hash"),
        @Index(name = "idx_invitation_org_ext_id", columnList = "organization_id, external_identity_id")
})
public class UserInvitation {

    @Id
    @Column(name = "id", length = 64, nullable = false, updatable = false)
    private String id;

    @Column(name = "organization_id", length = 64, nullable = false)
    private String organizationId;

    @Column(name = "external_identity_id", length = 64, nullable = false)
    private String externalIdentityId;

    @Column(name = "target_email", length = 255, nullable = false)
    private String targetEmail;

    @Column(name = "token_hash", length = 64, nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private InvitationStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UserInvitation() {}

    public UserInvitation(String id, String organizationId, String externalIdentityId, String targetEmail,
                          String tokenHash, Instant expiresAt, InvitationStatus status) {
        this.id = id;
        this.organizationId = organizationId;
        this.externalIdentityId = externalIdentityId;
        this.targetEmail = targetEmail;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.status = status;
        this.createdAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public String getId() {
        return id;
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public String getExternalIdentityId() {
        return externalIdentityId;
    }

    public String getTargetEmail() {
        return targetEmail;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(Instant usedAt) {
        this.usedAt = usedAt;
    }

    public InvitationStatus getStatus() {
        return status;
    }

    public void setStatus(InvitationStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
