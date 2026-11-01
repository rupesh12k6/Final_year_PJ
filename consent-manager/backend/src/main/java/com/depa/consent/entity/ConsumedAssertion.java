package com.depa.consent.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Database entity to track consumed assertion JTIs across application restarts
 * and enforce uniqueness at the database level against concurrent replay attacks.
 */
@Entity
@Table(name = "consumed_assertions", indexes = {
        @Index(name = "idx_consumed_assertions_expires_at", columnList = "expires_at")
})
public class ConsumedAssertion {

    @Id
    @Column(name = "jti", length = 128, nullable = false, updatable = false)
    private String jti;

    @Column(name = "student_id", length = 64, nullable = false)
    private String studentId;

    @Column(name = "organization_id", length = 64, nullable = false)
    private String organizationId;

    @Column(name = "action", length = 32, nullable = false)
    private String action;

    @Column(name = "target_id", length = 128)
    private String targetId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at", nullable = false)
    private Instant consumedAt;

    public ConsumedAssertion() {}

    public ConsumedAssertion(String jti, String studentId, String organizationId, String action, String targetId, Instant expiresAt, Instant consumedAt) {
        this.jti = jti;
        this.studentId = studentId;
        this.organizationId = organizationId;
        this.action = action;
        this.targetId = targetId;
        this.expiresAt = expiresAt;
        this.consumedAt = consumedAt != null ? consumedAt : Instant.now();
    }

    public String getJti() { return jti; }
    public void setJti(String jti) { this.jti = jti; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getOrganizationId() { return organizationId; }
    public void setOrganizationId(String organizationId) { this.organizationId = organizationId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public Instant getConsumedAt() { return consumedAt; }
    public void setConsumedAt(Instant consumedAt) { this.consumedAt = consumedAt; }
}

