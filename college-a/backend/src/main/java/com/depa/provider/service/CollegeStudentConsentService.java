package com.depa.provider.service;

import com.depa.provider.client.ConsentManagerClient;
import com.depa.provider.dto.ConsentDecisionResponse;
import com.depa.provider.dto.ConsentHistoryDTO;
import com.depa.provider.dto.ConsentRequestDTO;
import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;
import com.depa.provider.repository.StudentRepository;
import com.depa.provider.security.CollegeAUserPrincipal;
import com.depa.provider.security.CollegeAssertionKeyPairProvider;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class CollegeStudentConsentService {

    private static final Logger log = LoggerFactory.getLogger(CollegeStudentConsentService.class);

    private final CollegeAssertionKeyPairProvider keyPairProvider;
    private final ConsentManagerClient cmClient;
    private final StudentRepository studentRepository;
    private final String internalApiKey;
    private final ObjectMapper objectMapper;

    public CollegeStudentConsentService(
            CollegeAssertionKeyPairProvider keyPairProvider,
            ConsentManagerClient cmClient,
            StudentRepository studentRepository,
            @Value("${app.internal.api-key:A-INTERNAL-SECRET-KEY}") String internalApiKey,
            ObjectMapper objectMapper
    ) {
        this.keyPairProvider = keyPairProvider;
        this.cmClient = cmClient;
        this.studentRepository = studentRepository;
        this.internalApiKey = internalApiKey;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        // Automatically sync College A's RSA public key with Consent Manager on startup
        try {
            boolean synced = cmClient.syncAssertionPublicKey(keyPairProvider.getPublicKeyPem(), keyPairProvider.getKeyId(), internalApiKey);
            if (synced) {
                log.info("Successfully registered College A assertion RSA public key with Consent Manager (kid={})", keyPairProvider.getKeyId());
            } else {
                log.warn("Consent Manager not currently reachable for initial key sync. Will retry on demand.");
            }
        } catch (Exception e) {
            log.warn("Key sync deferred: {}", e.getMessage());
        }
    }

    public List<ConsentRequestDTO> getPendingConsents(CollegeAUserPrincipal principal) {
        Student student = validateAndGetStudent(principal);
        String assertion = keyPairProvider.signStudentAssertion(student.getStudentId(), "READ_PENDING", null);

        try {
            String rawJson = cmClient.getPendingConsentRequestsRaw(assertion);
            return extractPageOrList(rawJson, new TypeReference<List<ConsentRequestDTO>>() {});
        } catch (Exception e) {
            log.error("Failed to fetch pending consents from Consent Manager: {}", e.getMessage());
            throw new RuntimeException("Consent Manager communication failed: " + e.getMessage(), e);
        }
    }

    public List<ConsentHistoryDTO> getConsentHistory(CollegeAUserPrincipal principal) {
        Student student = validateAndGetStudent(principal);
        String assertion = keyPairProvider.signStudentAssertion(student.getStudentId(), "READ_HISTORY", null);

        try {
            String rawJson = cmClient.getConsentHistoryRaw(assertion);
            return extractPageOrList(rawJson, new TypeReference<List<ConsentHistoryDTO>>() {});
        } catch (Exception e) {
            log.error("Failed to fetch consent history from Consent Manager: {}", e.getMessage());
            throw new RuntimeException("Consent Manager communication failed: " + e.getMessage(), e);
        }
    }

    public ConsentDecisionResponse approveConsent(String consentRequestId, List<String> approvedFields, CollegeAUserPrincipal principal) {
        Student student = validateAndGetStudent(principal);
        String assertion = keyPairProvider.signStudentAssertion(student.getStudentId(), "APPROVE", consentRequestId);

        try {
            return cmClient.approveConsent(consentRequestId, approvedFields, assertion);
        } catch (Exception e) {
            log.error("Failed to submit consent approval to Consent Manager: {}", e.getMessage());
            throw new RuntimeException("Consent Manager approval failed: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> rejectConsent(String consentRequestId, CollegeAUserPrincipal principal) {
        Student student = validateAndGetStudent(principal);
        String assertion = keyPairProvider.signStudentAssertion(student.getStudentId(), "REJECT", consentRequestId);

        try {
            return cmClient.rejectConsent(consentRequestId, assertion);
        } catch (Exception e) {
            log.error("Failed to submit consent rejection to Consent Manager: {}", e.getMessage());
            throw new RuntimeException("Consent Manager rejection failed: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> revokeConsent(String consentId, CollegeAUserPrincipal principal) {
        Student student = validateAndGetStudent(principal);
        String assertion = keyPairProvider.signStudentAssertion(student.getStudentId(), "REVOKE", consentId);

        try {
            return cmClient.revokeConsent(consentId, assertion);
        } catch (Exception e) {
            log.error("Failed to submit consent revocation to Consent Manager: {}", e.getMessage());
            throw new RuntimeException("Consent Manager revocation failed: " + e.getMessage(), e);
        }
    }

    private Student validateAndGetStudent(CollegeAUserPrincipal principal) {
        if (principal == null || principal.getStudentId() == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated or non-student user");
        }

        Student student = studentRepository.findByStudentId(principal.getStudentId())
                .orElseThrow(() -> new AccessDeniedException("Student profile not found in local college registry: " + principal.getStudentId()));

        if (student.getStatus() != StudentStatus.ACTIVE) {
            throw new AccessDeniedException("Student account is not active (status: " + student.getStatus() + ")");
        }

        return student;
    }

    private <T> List<T> extractPageOrList(String rawJson, TypeReference<List<T>> typeRef) {
        if (rawJson == null || rawJson.isBlank()) {
            return Collections.emptyList();
        }

        try {
            JsonNode root = objectMapper.readTree(rawJson);
            if (root.isArray()) {
                return objectMapper.readValue(rawJson, typeRef);
            } else if (root.has("content") && root.get("content").isArray()) {
                return objectMapper.readValue(root.get("content").toString(), typeRef);
            }
            return Collections.emptyList();
        } catch (Exception e) {
            log.warn("Failed to parse list/page JSON: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}

