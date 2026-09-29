package com.depa.consent;

import com.depa.consent.dto.*;
import com.depa.consent.entity.*;
import com.depa.consent.repository.*;
import com.depa.consent.security.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ConsentAndAccessGrantIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DataRequestRepository dataRequestRepository;

    @Autowired
    private ConsentRequestRepository consentRequestRepository;

    @Autowired
    private ConsentRepository consentRepository;

    @Autowired
    private AccessGrantRepository accessGrantRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    private String collegeAOrgId = "ORG_COLLEGE_A";
    private String collegeBOrgId = "ORG_COLLEGE_B";

    private String collegeBUserToken;
    private String studentS1001Token;

    @BeforeEach
    void setUp() {
        accessGrantRepository.deleteAll();
        consentRepository.deleteAll();
        consentRequestRepository.deleteAll();
        dataRequestRepository.deleteAll();
        userRepository.deleteAll();
        organizationRepository.deleteAll();

        // 1. Setup College A & College B Organizations
        Organization collegeA = new Organization(
                collegeAOrgId, "COLLEGE_A", "College of Technology A", "admin@collegea.edu",
                "http://localhost:8081/api/auth/login", "http://localhost:8081/api/provider/onboarding/eligible-students",
                OrganizationStatus.ACTIVE
        );
        organizationRepository.save(collegeA);

        Organization collegeB = new Organization(
                collegeBOrgId, "COLLEGE_B", "Institute of Science B", "admin@collegeb.edu",
                "http://localhost:8082/api/auth/login", "http://localhost:8082/api/provider/onboarding/eligible-students",
                OrganizationStatus.ACTIVE
        );
        organizationRepository.save(collegeB);

        // 2. Setup College B User (Requester)
        User collegeBUser = new User(
                "USR_COLLEGE_B_01", "Officer Bob", "bob@collegeb.edu",
                passwordEncoder.encode("Pass@123"), collegeBOrgId, null,
                UserRole.USER, UserStatus.ACTIVE, true
        );
        userRepository.save(collegeBUser);
        collegeBUserToken = jwtUtil.generateAuthToken(
                collegeBUser.getUserId(), collegeBUser.getEmail(), collegeBUser.getRole().name(), collegeBOrgId
        );

        // 3. Setup Student S1001 at College A (Data Principal)
        User studentS1001 = new User(
                "USR_STUDENT_1001", "Student S1001", "student1001@example.com",
                passwordEncoder.encode("StudentPass@123"), collegeAOrgId, "S1001",
                UserRole.USER, UserStatus.ACTIVE, true
        );
        userRepository.save(studentS1001);
        studentS1001Token = jwtUtil.generateAuthToken(
                studentS1001.getUserId(), studentS1001.getEmail(), studentS1001.getRole().name(), collegeAOrgId, "S1001"
        );
    }

    @Test
    @DisplayName("Complete End-to-End Flow: DataRequest -> ConsentRequest -> Approval -> AccessGrant + Live Validation & Revocation")
    void testCompleteConsentAndAccessGrantFlow() throws Exception {
        // Step 1: College B User creates a Data Request for Student S1001 at College A
        CreateDataRequest dataReqDto = new CreateDataRequest(
                "S1001", "COLLEGE_A", "Academic verification for admission",
                List.of("STUDENT_ID", "NAME", "STUDY_CERTIFICATE")
        );

        String createDataReqJson = mockMvc.perform(post("/api/data-requests")
                        .header("Authorization", "Bearer " + collegeBUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dataReqDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.requesterOrganizationCode", is("COLLEGE_B")))
                .andExpect(jsonPath("$.providerOrganizationCode", is("COLLEGE_A")))
                .andExpect(jsonPath("$.dataPrincipalId", is("S1001")))
                .andExpect(jsonPath("$.status", is("PENDING")))
                .andReturn().getResponse().getContentAsString();

        DataRequestResponse dataReqResponse = objectMapper.readValue(createDataReqJson, DataRequestResponse.class);

        // Step 2: Student S1001 checks pending consent requests in CM
        String pendingRequestsJson = mockMvc.perform(get("/api/consents/pending")
                        .header("Authorization", "Bearer " + studentS1001Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].dataPrincipalId", is("S1001")))
                .andExpect(jsonPath("$[0].requesterOrganizationCode", is("COLLEGE_B")))
                .andExpect(jsonPath("$[0].requestedFields", hasItems("STUDENT_ID", "NAME", "STUDY_CERTIFICATE")))
                .andReturn().getResponse().getContentAsString();

        List<ConsentRequestResponse> pendingList = objectMapper.readValue(
                pendingRequestsJson,
                objectMapper.getTypeFactory().constructCollectionType(List.class, ConsentRequestResponse.class)
        );
        String consentRequestId = pendingList.get(0).getId();

        // Step 3: Student S1001 approves the consent request
        String approvalJson = mockMvc.perform(post("/api/consents/" + consentRequestId + "/approve")
                        .header("Authorization", "Bearer " + studentS1001Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.grantId").exists())
                .andExpect(jsonPath("$.status", is("ACTIVE")))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.approvedFields", hasItems("STUDENT_ID", "NAME", "STUDY_CERTIFICATE")))
                .andReturn().getResponse().getContentAsString();

        AccessGrantResponse grantResponse = objectMapper.readValue(approvalJson, AccessGrantResponse.class);
        String grantId = grantResponse.getGrantId();
        String consentId = grantResponse.getConsentId();

        // Step 4: Provider verifies live grant status via CM
        mockMvc.perform(get("/api/access-grants/" + grantId + "/validate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(true)))
                .andExpect(jsonPath("$.grantId", is(grantId)))
                .andExpect(jsonPath("$.dataPrincipalId", is("S1001")))
                .andExpect(jsonPath("$.approvedFields", hasItems("STUDENT_ID", "NAME", "STUDY_CERTIFICATE")));

        // Step 5: Student S1001 revokes the consent
        mockMvc.perform(post("/api/consents/" + consentId + "/revoke")
                        .header("Authorization", "Bearer " + studentS1001Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        // Step 6: Provider re-verifies live status after revocation -> Must return valid: false
        mockMvc.perform(get("/api/access-grants/" + grantId + "/validate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(false)));
    }
}
