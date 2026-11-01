package com.depa.consent.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @Column(name = "log_id", length = 64, nullable = false, updatable = false)
    private String logId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", length = 64, nullable = false)
    private AuditEventType eventType;

    @Column(name = "actor_user_id", length = 64)
    private String actorUserId;

    @Column(name = "actor_role", length = 32)
    private String actorRole;

    @Column(name = "target_entity_type", length = 64)
    private String targetEntityType;

    @Column(name = "target_entity_id", length = 64)
    private String targetEntityId;

    @Column(name = "organization_id", length = 64)
    private String organizationId;

    @Column(name = "details", length = 1000)
    private String details;

    @Column(name = "timestamp", nullable = false, updatable = false)
    private Instant timestamp;

    public AuditLog() {}

    public AuditLog(String logId, AuditEventType eventType, String actorUserId, String actorRole,
                    String targetEntityType, String targetEntityId, String organizationId, String details) {
        this.logId = logId;
        this.eventType = eventType;
        this.actorUserId = actorUserId;
        this.actorRole = actorRole;
        this.targetEntityType = targetEntityType;
        this.targetEntityId = targetEntityId;
        this.organizationId = organizationId;
        this.details = details;
        this.timestamp = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = Instant.now();
        }
    }

    public String getLogId() {
        return logId;
    }

    public AuditEventType getEventType() {
        return eventType;
    }

    public String getActorUserId() {
        return actorUserId;
    }

    public String getActorRole() {
        return actorRole;
    }

    public String getTargetEntityType() {
        return targetEntityType;
    }

    public String getTargetEntityId() {
        return targetEntityId;
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public String getDetails() {
        return details;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
