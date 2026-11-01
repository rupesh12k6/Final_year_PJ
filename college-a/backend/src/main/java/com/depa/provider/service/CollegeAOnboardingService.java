package com.depa.provider.service;

import com.depa.provider.dto.OnboardResultResponse;
import com.depa.provider.entity.Student;
import com.depa.provider.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CollegeAOnboardingService {

    private final StudentService studentService;
    private final RestClient restClient;
    private final String organizationCode;

    public CollegeAOnboardingService(
            StudentService studentService,
            @Value("${app.cm.base-url:http://localhost:8080}") String cmBaseUrl,
            @Value("${app.college.code:COLLEGE_A}") String organizationCode
    ) {
        this.studentService = studentService;
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory())
                .baseUrl(cmBaseUrl)
                .build();
        this.organizationCode = organizationCode;
    }

    @Transactional(readOnly = true)
    public OnboardResultResponse initiateBulkOnboarding() {
        List<Student> activeStudents = studentService.getActiveStudents();

        List<Map<String, String>> items = activeStudents.stream()
                .map(s -> {
                    Map<String, String> item = new HashMap<>();
                    item.put("studentId", s.getStudentId());
                    item.put("email", s.getEmail());
                    item.put("name", s.getName());
                    return item;
                })
                .collect(Collectors.toList());

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("organizationCode", organizationCode);
        requestBody.put("items", items);

        try {
            Map cmResponse = restClient.post()
                    .uri("/api/onboarding/bulk")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            int invitationsCreated = cmResponse != null && cmResponse.get("invitationsCreated") != null
                    ? ((Number) cmResponse.get("invitationsCreated")).intValue() : 0;
            int skippedCount = cmResponse != null && cmResponse.get("skippedCount") != null
                    ? ((Number) cmResponse.get("skippedCount")).intValue() : 0;

            return new OnboardResultResponse(
                    true,
                    organizationCode,
                    activeStudents.size(),
                    invitationsCreated,
                    skippedCount,
                    "Bulk onboarding completed successfully. Invitations dispatched to student trusted emails."
            );
        } catch (Exception e) {
            return new OnboardResultResponse(
                    false,
                    organizationCode,
                    activeStudents.size(),
                    0,
                    0,
                    "Failed to communicate with Consent Manager: " + e.getMessage()
            );
        }
    }
}
