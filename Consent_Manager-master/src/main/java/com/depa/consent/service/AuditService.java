package com.depa.consent.service;

import com.depa.consent.entity.AuditEventType;
import com.depa.consent.entity.AuditLog;
import com.depa.consent.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void logEvent(AuditEventType eventType, String actorUserId, String actorRole,
                         String targetEntityType, String targetEntityId, String organizationId, String details) {
        String logId = "AUD_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        AuditLog auditLog = new AuditLog(
                logId,
                eventType,
                actorUserId,
                actorRole,
                targetEntityType,
                targetEntityId,
                organizationId,
                details
        );
        auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsForOrganization(String organizationId) {
        return auditLogRepository.findByOrganizationIdOrderByTimestampDesc(organizationId);
    }
}
