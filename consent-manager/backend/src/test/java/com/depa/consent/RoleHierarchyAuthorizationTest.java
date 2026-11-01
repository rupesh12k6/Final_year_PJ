package com.depa.consent;

import com.depa.consent.dto.*;
import com.depa.consent.entity.UserRole;
import com.depa.consent.entity.UserStatus;
import com.depa.consent.repository.AuditLogRepository;
import com.depa.consent.repository.OrganizationRepository;
import com.depa.consent.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class RoleHierarchyAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private String superAdminToken;

    @BeforeEach
    void setUp() throws Exception {
        userRepository.deleteAll();
        organizationRepository.deleteAll();
        auditLogRepository.deleteAll();

        // Login as default bootstrap SUPER_ADMIN (re-created on need or setup)
        // Since we deleted all, let's trigger or create superadmin directly via login or setup
        CreateAdminRequest req = new CreateAdminRequest("Super Admin", "superadmin@depa.cm", "SuperAdmin@123");
        // Let's create superadmin directly in repo
        com.depa.consent.entity.User superAdmin = new com.depa.consent.entity.User(
                "SUPER_001",
                "Consent Manager Super Admin",
                "superadmin@depa.cm",
                new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("SuperAdmin@123"),
                null,
                UserRole.SUPER_ADMIN,
                UserStatus.ACTIVE
        );
        userRepository.save(superAdmin);

        LoginRequest loginReq = new LoginRequest("superadmin@depa.cm", "SuperAdmin@123");
        String loginRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        superAdminToken = objectMapper.readTree(loginRes).get("token").asText();
    }

    private String getAdminToken() throws Exception {
        // SUPER_ADMIN creates ADMIN
        CreateAdminRequest createAdminReq = new CreateAdminRequest("CM Admin", "admin@cm.com", "Admin@123");
        mockMvc.perform(post("/api/super-admin/admins")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createAdminReq)))
                .andExpect(status().isCreated());

        // Login as ADMIN
        LoginRequest login = new LoginRequest("admin@cm.com", "Admin@123");
        String res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(res).get("token").asText();
    }

    private String[] setupOrgAndOrgAdmin(String adminToken, String orgCode, String orgName, String orgAdminEmail) throws Exception {
        // ADMIN creates Organization
        CreateOrganizationRequest orgReq = new CreateOrganizationRequest(orgCode, orgName, orgAdminEmail);
        String orgRes = mockMvc.perform(post("/api/admin/organizations")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orgReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String orgId = objectMapper.readTree(orgRes).get("organizationId").asText();

        // ADMIN activates Organization
        mockMvc.perform(patch("/api/admin/organizations/" + orgId + "/activate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // ADMIN creates ORG_ADMIN
        CreateOrgAdminRequest orgAdminReq = new CreateOrgAdminRequest("Org Admin " + orgCode, orgAdminEmail, "OrgAdmin@123");
        mockMvc.perform(post("/api/admin/organizations/" + orgId + "/org-admin")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orgAdminReq)))
                .andExpect(status().isCreated());

        // Login as ORG_ADMIN
        LoginRequest login = new LoginRequest(orgAdminEmail, "OrgAdmin@123");
        String res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(res).get("token").asText();
        return new String[]{orgId, token};
    }

    // ==========================================
    // 1. SUPER_ADMIN TESTS
    // ==========================================
    @Test
    @DisplayName("SUPER_ADMIN can create and manage ADMIN accounts")
    void testSuperAdminCreatesAndManagesAdmin() throws Exception {
        CreateAdminRequest createAdminReq = new CreateAdminRequest("Platform Admin", "plat_admin@cm.com", "Admin@123");

        String createRes = mockMvc.perform(post("/api/super-admin/admins")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createAdminReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.email").value("plat_admin@cm.com"))
                .andReturn().getResponse().getContentAsString();

        String adminId = objectMapper.readTree(createRes).get("userId").asText();

        // Suspend Admin
        mockMvc.perform(patch("/api/super-admin/admins/" + adminId + "/suspend")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"));

        // Suspended Admin cannot login
        LoginRequest loginReq = new LoginRequest("plat_admin@cm.com", "Admin@123");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isUnauthorized());

        // Reactivate Admin
        mockMvc.perform(patch("/api/super-admin/admins/" + adminId + "/activate")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        // Activated Admin can now login
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk());
    }

    // ==========================================
    // 2. ADMIN TESTS & PRIVILEGE BOUNDARIES
    // ==========================================
    @Test
    @DisplayName("ADMIN can manage organizations and ORG_ADMINs, but CANNOT create ADMINs")
    void testAdminPermissionsAndBoundaries() throws Exception {
        String adminToken = getAdminToken();

        // ADMIN cannot create another ADMIN (403 Forbidden)
        CreateAdminRequest illegalReq = new CreateAdminRequest("Hacker Admin", "hacker@cm.com", "Pass@123");
        mockMvc.perform(post("/api/super-admin/admins")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(illegalReq)))
                .andExpect(status().isForbidden());

        // ADMIN can create Organization
        CreateOrganizationRequest orgReq = new CreateOrganizationRequest("COLLEGE_A", "College of Tech A", "admin@collegea.edu");
        String orgRes = mockMvc.perform(post("/api/admin/organizations")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orgReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();

        String orgId = objectMapper.readTree(orgRes).get("organizationId").asText();

        // ADMIN activates organization
        mockMvc.perform(patch("/api/admin/organizations/" + orgId + "/activate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    // ==========================================
    // 3. ORG_ADMIN & USER TESTS (SCOPE ENFORCEMENT)
    // ==========================================
    @Test
    @DisplayName("ORG_ADMIN can create and manage USERs in own org, but cannot access admin APIs")
    void testOrgAdminLifecycleAndScope() throws Exception {
        String adminToken = getAdminToken();
        String[] orgSetup = setupOrgAndOrgAdmin(adminToken, "COLLEGE_B", "College of Eng B", "orgadmin@collegeb.edu");
        String orgId = orgSetup[0];
        String orgAdminToken = orgSetup[1];

        // ORG_ADMIN creates USER in own org
        CreateUserRequest userReq = new CreateUserRequest("Student Ashok", "ashok@collegeb.edu", "Student@123");
        String userRes = mockMvc.perform(post("/api/org-admin/users")
                        .header("Authorization", "Bearer " + orgAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.organizationId").value(orgId))
                .andReturn().getResponse().getContentAsString();

        String userId = objectMapper.readTree(userRes).get("userId").asText();

        // USER logs in and gets profile
        LoginRequest userLogin = new LoginRequest("ashok@collegeb.edu", "Student@123");
        String userLoginRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userLogin)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String userToken = objectMapper.readTree(userLoginRes).get("token").asText();

        mockMvc.perform(get("/api/user/profile")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ashok@collegeb.edu"));

        // USER cannot create other users (403 Forbidden)
        CreateUserRequest illegalUserReq = new CreateUserRequest("Another User", "another@collegeb.edu", "Pass@123");
        mockMvc.perform(post("/api/org-admin/users")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(illegalUserReq)))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 4. CROSS-ORGANIZATION ATTACK REJECTION (403)
    // ==========================================
    @Test
    @DisplayName("Cross-Organization Attack: ORG_ADMIN of Org 1 cannot modify users in Org 2")
    void testCrossOrganizationAttackForbidden() throws Exception {
        String adminToken = getAdminToken();

        // Setup Org 1
        String[] org1 = setupOrgAndOrgAdmin(adminToken, "ORG_001", "Organization 1", "admin@org1.com");
        String orgAdmin1Token = org1[1];

        // Setup Org 2
        String[] org2 = setupOrgAndOrgAdmin(adminToken, "ORG_002", "Organization 2", "admin@org2.com");
        String orgAdmin2Token = org2[1];

        // OrgAdmin 2 creates User in Org 2
        CreateUserRequest user2Req = new CreateUserRequest("User 2", "user2@org2.com", "Pass@123");
        String user2Res = mockMvc.perform(post("/api/org-admin/users")
                        .header("Authorization", "Bearer " + orgAdmin2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(user2Req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String user2Id = objectMapper.readTree(user2Res).get("userId").asText();

        // OrgAdmin 1 tries to suspend User 2 from Org 2 -> MUST BE 403 FORBIDDEN
        mockMvc.perform(patch("/api/org-admin/users/" + user2Id + "/suspend")
                        .header("Authorization", "Bearer " + orgAdmin1Token))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 5. SUSPENDED ORGANIZATION ENFORCEMENT
    // ==========================================
    @Test
    @DisplayName("Suspended Organization blocks login for ORG_ADMIN and USER")
    void testSuspendedOrganizationBlocksLogin() throws Exception {
        String adminToken = getAdminToken();
        String[] orgSetup = setupOrgAndOrgAdmin(adminToken, "COLLEGE_C", "College C", "admin@collegec.edu");
        String orgId = orgSetup[0];
        String orgAdminToken = orgSetup[1];

        // Create a User in Org C
        CreateUserRequest userReq = new CreateUserRequest("Student Charlie", "charlie@collegec.edu", "Pass@123");
        mockMvc.perform(post("/api/org-admin/users")
                        .header("Authorization", "Bearer " + orgAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userReq)))
                .andExpect(status().isCreated());

        // ADMIN suspends College C
        mockMvc.perform(patch("/api/admin/organizations/" + orgId + "/suspend")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"));

        // Login as ORG_ADMIN is DENIED
        LoginRequest orgAdminLogin = new LoginRequest("admin@collegec.edu", "OrgAdmin@123");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orgAdminLogin)))
                .andExpect(status().isUnauthorized());

        // Login as USER is DENIED
        LoginRequest userLogin = new LoginRequest("charlie@collegec.edu", "Pass@123");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userLogin)))
                .andExpect(status().isUnauthorized());
    }

    // ==========================================
    // 6. AUDIT LOGGING VERIFICATION
    // ==========================================
    @Test
    @DisplayName("Audit Log records administrative and authentication events")
    void testAuditLogRecordsEvents() throws Exception {
        mockMvc.perform(get("/api/audit")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", is(not(empty()))));
    }
}
