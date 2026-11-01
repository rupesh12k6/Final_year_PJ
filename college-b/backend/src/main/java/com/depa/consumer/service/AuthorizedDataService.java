package com.depa.consumer.service;

import com.depa.consumer.client.ConsentManagerClient;
import com.depa.consumer.entity.Student;
import com.depa.consumer.repository.StudentRepository;
import com.depa.consumer.schema.CollegeBFieldMappingRegistry;
import com.depa.consumer.security.CmDataAccessJwtValidator;
import io.jsonwebtoken.Claims;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class AuthorizedDataService {

    private final CmDataAccessJwtValidator jwtValidator;
    private final ConsentManagerClient consentManagerClient;
    private final StudentRepository studentRepository;
    private final CollegeBFieldMappingRegistry fieldMappingRegistry;

    public AuthorizedDataService(
            CmDataAccessJwtValidator jwtValidator,
            ConsentManagerClient consentManagerClient,
            StudentRepository studentRepository,
            CollegeBFieldMappingRegistry fieldMappingRegistry
    ) {
        this.jwtValidator = jwtValidator;
        this.consentManagerClient = consentManagerClient;
        this.studentRepository = studentRepository;
        this.fieldMappingRegistry = fieldMappingRegistry;
    }

    public Map<String, Object> fetchAuthorizedData(String grantId, String accessJwt) {
        if (accessJwt == null || accessJwt.isBlank()) {
            throw new SecurityException("Missing Bearer Access JWT");
        }

        // 1. Cryptographic RS256 Signature & Claims Validation
        Claims claims = jwtValidator.validateAndExtractClaims(accessJwt);
        String tokenGrantId = jwtValidator.extractGrantId(claims);
        String dataPrincipalId = jwtValidator.extractDataPrincipalId(claims);

        if (!grantId.equalsIgnoreCase(tokenGrantId)) {
            throw new SecurityException("Grant ID in URL does not match Grant ID in Access Token");
        }

        // 2. Real-Time Revocation & Lifecycle Verification with Consent Manager
        ConsentManagerClient.GrantValidationResult liveCheck = consentManagerClient.validateGrantLive(grantId);
        if (liveCheck == null || !liveCheck.isValid()) {
            String reason = liveCheck != null ? liveCheck.getMessage() : "Unknown revocation error";
            
            if (reason != null && reason.contains("unreachable")) {
                System.err.println("WARN: Consent Manager is unreachable. Falling back to offline JWT validation for Grant ID: " + grantId);
            } else {
                throw new SecurityException("Access Denied: Grant is not currently active. " + reason);
            }
        }

        // 3. Locate Student in College B Database
        Student student = studentRepository.findByStudentId(dataPrincipalId)
                .orElseThrow(() -> new RuntimeException("Data Principal not found in College B student registry: " + dataPrincipalId));

        // 4. Dynamic Field-Level Extraction (Least-Privilege Canonical Transformation)
        List<String> approvedFields = liveCheck != null ? liveCheck.getApprovedFields() : null;
        if (approvedFields == null || approvedFields.isEmpty()) {
            approvedFields = jwtValidator.extractScope(claims);
        }

        Map<String, Object> canonicalPayload = new LinkedHashMap<>();
        for (String canonicalField : approvedFields) {
            String normalizedField = canonicalField.trim().toUpperCase();
            if (fieldMappingRegistry.isFieldSupported(normalizedField)) {
                Object extractedValue = fieldMappingRegistry.extractValue(normalizedField, student);
                canonicalPayload.put(normalizedField, extractedValue != null ? extractedValue : "Not Available");
            }
        }

        return canonicalPayload;
    }
}
