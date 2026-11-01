import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class IntegrationTest {
    
    private static final HttpClient client = HttpClient.newHttpClient();
    private static final String BASE_URL = "http://localhost:8095/api";
    
    public static void main(String[] args) throws Exception {
        System.out.println("===============================================");
        System.out.println(" CONSENT MANAGER - FULL API INTEGRATION TEST ");
        System.out.println("===============================================\n");
        
        // 1. Super Admin Login
        System.out.println("1. SUPER ADMIN LOGIN");
        String superAdminToken = executePost("/auth/login", null, 
                "{\"email\": \"superadmin@depa.cm\", \"password\": \"SuperAdmin@123\"}");
        superAdminToken = extractValue(superAdminToken, "token");
        
        // 2. Create CM Admin
        System.out.println("\n2. CREATE CM ADMIN (Global Manager)");
        executePost("/super-admin/admins", superAdminToken, 
                "{\"name\": \"Global Manager\", \"email\": \"admin@depa.cm\", \"password\": \"SecurePassword123\"}");
                
        // 3. CM Admin Login
        System.out.println("\n3. CM ADMIN LOGIN");
        String cmAdminToken = executePost("/auth/login", null, 
                "{\"email\": \"admin@depa.cm\", \"password\": \"SecurePassword123\"}");
        cmAdminToken = extractValue(cmAdminToken, "token");
        
        // 4. Register Organization A
        System.out.println("\n4. REGISTER ORGANIZATION A");
        String orgAResponse = executePost("/admin/organizations", cmAdminToken, 
                "{\"organizationCode\": \"COLLEGE_A\", \"name\": \"College A University\", \"email\": \"contact@collegeA.edu\"}");
        String orgAId = extractValue(orgAResponse, "organizationId");
        
        // 5. Activate Organization A
        System.out.println("\n5. ACTIVATE ORGANIZATION A");
        executePatch("/admin/organizations/" + orgAId + "/activate", cmAdminToken, "");
        
        // 6. Create Org Admin A
        System.out.println("\n6. CREATE ORG ADMIN FOR COLLEGE A");
        executePost("/admin/organizations/" + orgAId + "/org-admin", cmAdminToken, 
                "{\"name\": \"College A IT Admin\", \"email\": \"admin@collegeA.edu\", \"password\": \"CollegeAdmin123\"}");
                
        // 7. Org Admin A Login
        System.out.println("\n7. ORG ADMIN A LOGIN");
        String orgAAdminToken = executePost("/auth/login", null, 
                "{\"email\": \"admin@collegeA.edu\", \"password\": \"CollegeAdmin123\"}");
        orgAAdminToken = extractValue(orgAAdminToken, "token");
        
        // 8. Org Admin A Imports Students
        System.out.println("\n8. IMPORT STUDENT INTO COLLEGE A");
        executePost("/org-admin/onboarding/import", orgAAdminToken, 
                "{\"students\": [{\"studentId\": \"STU-2023-001\", \"email\": \"student1@collegeA.edu\", \"name\": \"Alice Johnson\"}]}");
                
        // 9. Get Student's DB ID
        System.out.println("\n9. FETCH USERS IN COLLEGE A");
        String usersResponse = executeGet("/org-admin/users", orgAAdminToken);
        String studentUserId = extractValue(usersResponse, "userId"); // gets the first id in the array
        
        // 10. Force Reset Password
        System.out.println("\n10. FORCE RESET STUDENT PASSWORD");
        executePatch("/org-admin/users/" + studentUserId + "/reset-password", orgAAdminToken, 
                "{\"newPassword\": \"StudentPassword123\"}");
                
        // 11. Student Login
        System.out.println("\n11. STUDENT LOGIN (Alice)");
        String studentToken = executePost("/auth/login", null, 
                "{\"email\": \"student1@collegeA.edu\", \"password\": \"StudentPassword123\"}");
        studentToken = extractValue(studentToken, "token");
        
        // ==== CONSUMER SIDE (College B) ====
        
        // Register College B
        System.out.println("\n--- SETUP COLLEGE B (Consumer) ---");
        String orgBResponse = executePost("/admin/organizations", cmAdminToken, 
                "{\"organizationCode\": \"COLLEGE_B\", \"name\": \"College B University\", \"email\": \"contact@collegeB.edu\"}");
        String orgBId = extractValue(orgBResponse, "organizationId");
        executePatch("/admin/organizations/" + orgBId + "/activate", cmAdminToken, "");
        executePost("/admin/organizations/" + orgBId + "/org-admin", cmAdminToken, 
                "{\"name\": \"College B IT Admin\", \"email\": \"admin@collegeB.edu\", \"password\": \"CollegeAdmin123\"}");
                
        // 12. College B Admin Login
        System.out.println("\n12. ORG ADMIN B LOGIN");
        String orgBAdminToken = executePost("/auth/login", null, 
                "{\"email\": \"admin@collegeB.edu\", \"password\": \"CollegeAdmin123\"}");
        orgBAdminToken = extractValue(orgBAdminToken, "token");
        
        // 13. College B Requests Data from College A (for Alice)
        System.out.println("\n13. COLLEGE B REQUESTS DATA FROM COLLEGE A");
        executePost("/data-requests", orgBAdminToken, 
                "{\"dataPrincipalId\": \"STU-2023-001\", \"providerOrganizationId\": \"COLLEGE_A\", \"purpose\": \"Admission to Master's Program\", \"requestedFields\": [\"transcript\", \"degree_certificate\"]}");
                
        // 14. Student Checks Pending Consent Requests
        System.out.println("\n14. STUDENT FETCHES PENDING CONSENT REQUESTS");
        String pendingConsentResponse = executeGet("/consents/pending", studentToken);
        String consentRequestId = extractValue(pendingConsentResponse, "id");
        
        // 15. Student Approves Consent Request
        System.out.println("\n15. STUDENT APPROVES CONSENT REQUEST");
        executePost("/consents/" + consentRequestId + "/approve", studentToken, 
                "{\"approvedFields\": [\"transcript\", \"degree_certificate\"]}");
                
        // 16. Student Views Active Consents
        System.out.println("\n16. STUDENT VIEWS ACTIVE CONSENTS");
        executeGet("/consents", studentToken);
        
        System.out.println("\n===============================================");
        System.out.println(" END-TO-END TEST COMPLETED SUCCESSFULLY! ");
        System.out.println("===============================================");
    }
    
    private static String executeGet(String endpoint, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + endpoint))
                .GET()
                .header("Accept", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        
        return sendRequest(builder.build());
    }
    
    private static String executePost(String endpoint, String token, String jsonBody) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + endpoint))
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        
        return sendRequest(builder.build());
    }
    
    private static String executePatch(String endpoint, String token, String jsonBody) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + endpoint))
                .method("PATCH", HttpRequest.BodyPublishers.ofString(jsonBody))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        
        return sendRequest(builder.build());
    }
    
    private static String sendRequest(HttpRequest request) throws Exception {
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("-> STATUS: " + response.statusCode());
        System.out.println("-> RESPONSE: " + response.body());
        if (response.statusCode() >= 400) {
            throw new RuntimeException("API Call Failed with status " + response.statusCode());
        }
        return response.body();
    }
    
    private static String extractValue(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + key + "\"\\s*:\\s*\"([^\"]+)\"");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }
}
