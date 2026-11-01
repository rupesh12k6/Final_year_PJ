package com.depa.provider.service;

import com.depa.provider.client.ConsentManagerClient;
import com.depa.provider.dto.GrantValidationResult;
import com.depa.provider.entity.Student;
import com.depa.provider.repository.StudentRepository;
import com.depa.provider.schema.CollegeAFieldMappingRegistry;
import com.depa.provider.security.CmDataAccessJwtValidator;
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
    private final CollegeAFieldMappingRegistry fieldMappingRegistry;

    public AuthorizedDataService(
            CmDataAccessJwtValidator jwtValidator,
            ConsentManagerClient consentManagerClient,
            StudentRepository studentRepository,
            CollegeAFieldMappingRegistry fieldMappingRegistry
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

        // 2. Real-Time Revocation & Lifecycle Verification with Consent Manager (Authoritative)
        GrantValidationResult liveCheck = consentManagerClient.validateGrantLive(grantId);
        if (liveCheck == null || !liveCheck.isValid()) {
            String reason = liveCheck != null ? liveCheck.getMessage() : "Validation check failed";
            throw new SecurityException("Access Denied: Grant is not currently active. " + reason);
        }

        // 3. Locate Data Principal in Local Provider DB
        Student student = studentRepository.findByStudentId(dataPrincipalId)
                .orElseThrow(() -> new RuntimeException("Data Principal not found in local provider registry: " + dataPrincipalId));

        // 4. Dynamic Field-Level Extraction strictly from Authoritative CM Approved Fields
        List<String> approvedFields = liveCheck.getApprovedFields();
        if (approvedFields == null || approvedFields.isEmpty()) {
            throw new SecurityException("Access Denied: No fields approved by Data Principal in Consent Manager");
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
