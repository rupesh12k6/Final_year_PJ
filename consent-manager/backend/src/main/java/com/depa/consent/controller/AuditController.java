package com.depa.consent.controller;

import com.depa.consent.entity.AuditLog;
import com.depa.consent.entity.UserRole;
import com.depa.consent.security.UserPrincipal;
import com.depa.consent.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN')")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<AuditLog>> getAuditLogs(
            @AuthenticationPrincipal UserPrincipal actor,
            @RequestParam(name = "organizationId", required = false) String organizationId
    ) {
        if (actor != null && actor.getRole() == UserRole.ORG_ADMIN) {
            String orgId = actor.getOrganizationId();
            if (orgId == null || orgId.isBlank()) {
                throw new com.depa.consent.exception.ForbiddenOperationException("Access Denied: Organization admin must have a valid organization boundary");
            }
            return ResponseEntity.ok(auditService.getAuditLogsForOrganization(orgId, actor.getUserId()));
        }
        // CM Admin can filter by particular college when selected
        if (organizationId != null && !organizationId.isBlank() && !"ALL".equalsIgnoreCase(organizationId)) {
            return ResponseEntity.ok(auditService.getAuditLogsForOrganization(organizationId));
        }
        return ResponseEntity.ok(auditService.getAllAuditLogs());
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<AuditLog>> getAllAuditLogs() {
        return ResponseEntity.ok(auditService.getAllAuditLogs());
    }
}
