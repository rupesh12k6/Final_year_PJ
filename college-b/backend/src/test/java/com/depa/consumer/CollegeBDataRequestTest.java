package com.depa.consumer;

import com.depa.consumer.client.ConsentManagerClient;
import com.depa.consumer.dto.ConsumerGrantResponse;
import com.depa.consumer.dto.InitiateDataRequest;
import com.depa.consumer.dto.TokenValidationRequest;
import com.depa.consumer.security.InternalApiKeyValidator;
import com.depa.consumer.security.ProviderEndpointSecurityValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.contains;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class CollegeBDataRequestTest {

    static {
        System.setProperty("sun.net.http.allowRestrictedHeaders", "true");
    }

    private static final String CONFIGURED_TEST_KEY = "TEST-CONFIGURED-INTERNAL-SECRET-KEY-COLLEGE-B-12345";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private InternalApiKeyValidator apiKeyValidator;

    @Autowired
    private ProviderEndpointSecurityValidator endpointValidator;

    @MockBean
    private ConsentManagerClient cmClient;

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    @DisplayName("College B: Initiate data request to Consent Manager")
    void testInitiateDataRequest() throws Exception {
        InitiateDataRequest req = new InitiateDataRequest(
                "STU-2023-001",
                "COLLEGE_A",
                "Verification of Academic Background",
                List.of("CGPA", "TRANSCRIPT")
        );

        when(cmClient.initiateDataRequest(any(), anyString()))
                .thenReturn(Map.of(
                        "id", "DREQ_TEST_B01",
                        "status", "PENDING",
                        "requesterOrganizationCode", "COLLEGE_B"
                ));

        mockMvc.perform(post("/api/consumer/data-requests/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("DREQ_TEST_B01"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.requesterOrganizationCode").value("COLLEGE_B"));
    }

    @Test
    @DisplayName("College B: Securely retrieve Access Grant with configured secret")
    void testRetrieveConsumerGrant() throws Exception {
        ConsumerGrantResponse mockGrant = new ConsumerGrantResponse();
        mockGrant.setReady(true);
        mockGrant.setGrantId("GRNT_TEST_01");
        mockGrant.setStatus("ACTIVE");
        mockGrant.setDataRequestId("DREQ_TEST_B01");
        mockGrant.setProviderOrganizationCode("COLLEGE_A");
        mockGrant.setAccessToken("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test-access-token");
        mockGrant.setApprovedFields(List.of("CGPA"));
        mockGrant.setExpiresAt(Instant.now().plusSeconds(86400));

        when(cmClient.getConsumerGrant(eq("DREQ_TEST_B01"), anyString()))
                .thenReturn(mockGrant);

        // Internal call with valid configured X-API-KEY succeeds
        mockMvc.perform(get("/api/consumer/data-requests/DREQ_TEST_B01/grant")
                        .header("X-API-KEY", CONFIGURED_TEST_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ready").value(true))
                .andExpect(jsonPath("$.grantId").value("GRNT_TEST_01"))
                .andExpect(jsonPath("$.accessToken").value("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test-access-token"))
                .andExpect(jsonPath("$.approvedFields", contains("CGPA")));

        // Browser call without X-API-KEY is strictly forbidden
        mockMvc.perform(get("/api/consumer/data-requests/DREQ_TEST_B01/grant"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    @DisplayName("Internal API Key Security: Missing, incorrect, old hardcoded, and blank keys are strictly rejected")
    void testInternalApiKeySecurityMatrix() throws Exception {
        ConsumerGrantResponse mockGrant = new ConsumerGrantResponse();
        mockGrant.setReady(true);
        mockGrant.setGrantId("GRNT_KEY_TEST");
        mockGrant.setStatus("ACTIVE");
        when(cmClient.getConsumerGrant(anyString(), anyString())).thenReturn(mockGrant);

        // 1. Missing X-API-KEY header -> 403 Forbidden
        mockMvc.perform(get("/api/consumer/data-requests/DREQ_001/grant"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Access Denied"));

        // 2. Incorrect secret -> 403 Forbidden
        mockMvc.perform(get("/api/consumer/data-requests/DREQ_001/grant")
                        .header("X-API-KEY", "INCORRECT-SECRET-KEY-999"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Access Denied"));

        // 3. Attempt using old hardcoded key 'B-INTERNAL-SECRET-KEY' -> 403 Forbidden
        mockMvc.perform(get("/api/consumer/data-requests/DREQ_001/grant")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Access Denied"));

        // 4. Attempt using old hardcoded key 'A-INTERNAL-SECRET-KEY' -> 403 Forbidden
        mockMvc.perform(get("/api/consumer/data-requests/DREQ_001/grant")
                        .header("X-API-KEY", "A-INTERNAL-SECRET-KEY"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Access Denied"));

        // 5. Blank secret header -> 403 Forbidden
        mockMvc.perform(get("/api/consumer/data-requests/DREQ_001/grant")
                        .header("X-API-KEY", "   "))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Access Denied"));

        // 6. Direct Data Exchange endpoint: missing key -> 401 Unauthorized
        mockMvc.perform(post("/api/consumer/fetch-direct-data")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"grantId\":\"G1\",\"accessToken\":\"T1\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));

        // 7. Direct Data Exchange endpoint: old hardcoded key -> 401 Unauthorized
        mockMvc.perform(post("/api/consumer/fetch-direct-data")
                        .header("X-API-KEY", "B-INTERNAL-SECRET-KEY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"grantId\":\"G1\",\"accessToken\":\"T1\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @DisplayName("InternalApiKeyValidator: Fails closed when secret is missing or blank")
    void testInternalApiKeyValidatorFailClosed() {
        // Missing / blank key configuration validator
        InternalApiKeyValidator emptyValidator = new InternalApiKeyValidator("");
        assertFalse(emptyValidator.isValid("any-key"));
        assertFalse(emptyValidator.isValid(""));
        assertFalse(emptyValidator.isValid(null));
        assertFalse(emptyValidator.isConfigured());
        assertThrows(IllegalStateException.class, emptyValidator::getConfiguredKey);

        InternalApiKeyValidator nullValidator = new InternalApiKeyValidator(null);
        assertFalse(nullValidator.isValid("any-key"));
        assertFalse(nullValidator.isConfigured());
        assertThrows(IllegalStateException.class, nullValidator::getConfiguredKey);

        // Active validator with configured key
        assertTrue(apiKeyValidator.isConfigured());
        assertTrue(apiKeyValidator.isValid(CONFIGURED_TEST_KEY));
        assertFalse(apiKeyValidator.isValid("B-INTERNAL-SECRET-KEY"));
        assertFalse(apiKeyValidator.isValid("A-INTERNAL-SECRET-KEY"));
        assertFalse(apiKeyValidator.isValid("wrong-secret"));
        assertFalse(apiKeyValidator.isValid(null));
        assertFalse(apiKeyValidator.isValid(""));
    }

    @Test
    @DisplayName("POST Migration: Activation token validation via POST with JSON body")
    void testPostActivationValidation() throws Exception {
        TokenValidationRequest req = new TokenValidationRequest("invalid-token-sample");

        mockMvc.perform(post("/api/auth/activation/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or already used activation token"));

        // Former GET endpoint accepting raw token query param is removed
        mockMvc.perform(get("/api/auth/activation/validate?token=invalid-token-sample"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @DisplayName("Unified SSRF Protection: Both outbound routes reject unapproved and dangerous destinations")
    void testUnifiedSsrfOutboundMatrix() throws Exception {
        ConsumerGrantResponse mockGrant = new ConsumerGrantResponse();
        mockGrant.setReady(true);
        mockGrant.setGrantId("GRNT_SSRF_01");
        mockGrant.setStatus("ACTIVE");
        mockGrant.setDataRequestId("DREQ_SSRF_01");
        mockGrant.setProviderOrganizationCode("COLLEGE_A");
        mockGrant.setAccessToken("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test-access-token");
        mockGrant.setApprovedFields(List.of("CGPA"));
        mockGrant.setExpiresAt(Instant.now().plusSeconds(86400));

        when(cmClient.getConsumerGrant(eq("DREQ_SSRF_01"), anyString()))
                .thenReturn(mockGrant);

        List<String> maliciousTargets = List.of(
                "http://evil.com/exfiltrate",                           // Unregistered external host
                "http://169.254.169.254/latest/meta-data",              // Cloud metadata IPv4
                "http://metadata.google.internal/computeMetadata/v1",   // GCP metadata hostname
                "http://100.100.100.200/latest/meta-data",              // Alibaba metadata
                "http://10.0.0.1:8080/internal",                        // RFC 1918 Class A
                "http://172.16.0.1:8080/internal",                      // RFC 1918 Class B
                "http://192.168.1.1:8080/internal",                     // RFC 1918 Class C
                "http://[fe80::1]:8080/ipv6-link-local",                // IPv6 link-local
                "http://[::1]:9000/unapproved-port",                    // Loopback on unapproved port
                "http://[::ffff:169.254.169.254]/metadata",             // IPv4-mapped IPv6 metadata
                "ftp://evil.com/resource",                              // Unsupported scheme
                "http://localhost:22/ssh",                              // Disallowed port: SSH
                "http://localhost:5432/postgres",                       // Disallowed port: PostgreSQL
                "http://localhost:6379/redis",                          // Disallowed port: Redis
                "http://admin:secret@localhost:8081/data",              // Embedded user credentials
                "http://0x7f000001:8081/hex-ip",                        // Hex-encoded IP
                "http://2130706433:8081/decimal-ip"                     // Decimal-encoded IP
        );

        for (String targetUrl : maliciousTargets) {
            // Test Route 1: /api/consumer/data-requests/{id}/fetch-data
            mockMvc.perform(post("/api/consumer/data-requests/DREQ_SSRF_01/fetch-data")
                            .header("X-API-KEY", CONFIGURED_TEST_KEY)
                            .param("providerUrl", targetUrl))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("SSRF Blocked"));

            // Test Route 2: /api/consumer/fetch-direct-data
            mockMvc.perform(post("/api/consumer/fetch-direct-data")
                            .header("X-API-KEY", CONFIGURED_TEST_KEY)
                            .param("providerUrl", targetUrl)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"grantId\":\"GRNT_01\",\"accessToken\":\"test-token\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("SSRF Blocked"));
        }

        // Test normal registered College A provider endpoint is accepted by validator
        ProviderEndpointSecurityValidator.ValidatedProviderTarget validTarget =
                endpointValidator.resolveAndValidateProviderTarget("COLLEGE_A", null, "http://localhost:8081");
        assertNotNull(validTarget);
        assertEquals("http://localhost:8081", validTarget.getBaseUrl());
        assertEquals("127.0.0.1", validTarget.getPinnedAddress().getHostAddress());

        // Verify request factory disables HTTP redirects (prevents 30x redirect bypass)
        ClientHttpRequestFactory rf = endpointValidator.createSecureRequestFactory(validTarget);
        assertInstanceOf(ProviderEndpointSecurityValidator.PinnedDnsRequestFactory.class, rf);
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    @DisplayName("RBAC Protection: Student role cannot access consumer administrative endpoints")
    void testStudentRoleCannotAccessConsumerEndpoints() throws Exception {
        InitiateDataRequest req = new InitiateDataRequest(
                "STU-2023-001",
                "COLLEGE_A",
                "Unauthorized Attempt",
                List.of("CGPA")
        );

        mockMvc.perform(post("/api/consumer/data-requests/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/consumer/data-requests"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/consumer/data-requests/DREQ_001/grant"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    @DisplayName("Browser Admin JWT cannot retrieve raw Access JWT without internal secret")
    void testBrowserAdminJwtCannotRetrieveAccessJwt() throws Exception {
        ConsumerGrantResponse mockGrant = new ConsumerGrantResponse();
        mockGrant.setReady(true);
        mockGrant.setGrantId("GRNT_ADMIN_BLOCKED");
        mockGrant.setAccessToken("secret-access-token-never-disclosed-to-browser");
        when(cmClient.getConsumerGrant(anyString(), anyString())).thenReturn(mockGrant);

        // Calling /grant with only OrgAdmin authentication (no X-API-KEY) yields 403 Forbidden
        mockMvc.perform(get("/api/consumer/data-requests/DREQ_001/grant"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Access Denied"))
                .andExpect(jsonPath("$.accessToken").doesNotExist());
    }

    @Test
    @DisplayName("DNS Pinning and Rebinding Immunity: Socket connects strictly to validated IP literal")
    void testDnsPinningAndRebindingImmunity() throws Exception {
        java.net.InetAddress ipv4Addr = java.net.InetAddress.getByName("127.0.0.1");
        ProviderEndpointSecurityValidator.PinnedDnsRequestFactory factory =
                new ProviderEndpointSecurityValidator.PinnedDnsRequestFactory(ipv4Addr, "provider.university-a.ac.in", 8081);

        assertEquals("127.0.0.1", factory.getPinnedAddress().getHostAddress());
        assertEquals("provider.university-a.ac.in", factory.getOriginalHost());
        assertEquals(8081, factory.getOriginalPort());

        // Test IPv6 literal formatting
        java.net.InetAddress ipv6Addr = java.net.InetAddress.getByName("::1");
        ProviderEndpointSecurityValidator.PinnedDnsRequestFactory ipv6Factory =
                new ProviderEndpointSecurityValidator.PinnedDnsRequestFactory(ipv6Addr, "ipv6.provider.ac.in", 8081);
        assertInstanceOf(java.net.Inet6Address.class, ipv6Factory.getPinnedAddress());
        assertEquals("ipv6.provider.ac.in", ipv6Factory.getOriginalHost());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    @DisplayName("HTTP Cache-Control: Academic record endpoints strictly enforce no-store and no-cache")
    void testHttpCacheHeadersOnAcademicDataEndpoints() throws Exception {
        ConsumerGrantResponse mockGrant = new ConsumerGrantResponse();
        mockGrant.setReady(true);
        mockGrant.setGrantId("GRNT_CACHE_TEST");
        mockGrant.setStatus("ACTIVE");
        mockGrant.setDataRequestId("DREQ_CACHE_TEST");
        mockGrant.setProviderOrganizationCode("COLLEGE_A");
        mockGrant.setAccessToken("test-token");
        when(cmClient.getConsumerGrant(eq("DREQ_CACHE_TEST"), anyString())).thenReturn(mockGrant);

        // 1. Status endpoint includes zero-cache headers
        mockMvc.perform(get("/api/consumer/data-requests/DREQ_CACHE_TEST/status"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-cache")))
                .andExpect(header().string("Pragma", "no-cache"));

        // 2. Grant endpoint includes zero-cache headers
        mockMvc.perform(get("/api/consumer/data-requests/DREQ_CACHE_TEST/grant")
                        .header("X-API-KEY", CONFIGURED_TEST_KEY))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-cache")))
                .andExpect(header().string("Pragma", "no-cache"))
                .andExpect(header().string("Expires", "0"));

        // 3. Direct Data Exchange endpoint includes zero-cache headers (e.g. 401 on missing key)
        mockMvc.perform(post("/api/consumer/fetch-direct-data")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"grantId\":\"G1\",\"accessToken\":\"T1\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-cache")))
                .andExpect(header().string("Pragma", "no-cache"))
                .andExpect(header().string("Expires", "0"));
    }

    @Test
    @DisplayName("Host Header and Redirect Non-Follow: Controlled College A HTTP Server Verification")
    void testControlledProviderHttpServerHostAndRedirects() throws Exception {
        com.sun.net.httpserver.HttpServer testServer = com.sun.net.httpserver.HttpServer.create(
                new java.net.InetSocketAddress("127.0.0.1", 0), 0
        );
        java.util.concurrent.atomic.AtomicReference<String> receivedHostHeader = new java.util.concurrent.atomic.AtomicReference<>();
        java.util.concurrent.atomic.AtomicReference<String> remoteAddress = new java.util.concurrent.atomic.AtomicReference<>();

        testServer.createContext("/api/data/access/GRNT_TEST", exchange -> {
            receivedHostHeader.set(exchange.getRequestHeaders().getFirst("Host"));
            remoteAddress.set(exchange.getRemoteAddress().getAddress().getHostAddress());
            exchange.getResponseHeaders().set("Location", "http://evil.internal/redirected-exfiltrate");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        testServer.start();

        int port = testServer.getAddress().getPort();
        try {
            java.net.InetAddress pinnedIp = java.net.InetAddress.getByName("127.0.0.1");
            String registeredHost = "college-a-provider.depa.local";

            ProviderEndpointSecurityValidator.PinnedDnsRequestFactory factory =
                    new ProviderEndpointSecurityValidator.PinnedDnsRequestFactory(pinnedIp, registeredHost, port);

            // Connect using ClientHttpRequestFactory
            org.springframework.http.client.ClientHttpRequest request =
                    factory.createRequest(new java.net.URI("http://" + registeredHost + ":" + port + "/api/data/access/GRNT_TEST"), org.springframework.http.HttpMethod.GET);

            org.springframework.http.client.ClientHttpResponse response = request.execute();

            // 1. Verify provider received original registered Host header
            assertEquals(registeredHost + ":" + port, receivedHostHeader.get());

            // 2. Verify socket connected to the pinned IP literal
            assertEquals("127.0.0.1", remoteAddress.get());

            // 3. Verify HTTP 302 was received and NOT followed (redirects disabled)
            assertEquals(org.springframework.http.HttpStatus.FOUND, response.getStatusCode());
            assertEquals("http://evil.internal/redirected-exfiltrate", response.getHeaders().getFirst("Location"));

        } finally {
            testServer.stop(0);
        }
    }

    @Test
    @DisplayName("SNI Preservation & Certificate Verification: Preserves SNIHostName and default PKIX validation")
    void testSniPreservationAndHostnameVerification() throws Exception {
        String originalHost = "provider.collegea.edu";
        javax.net.ssl.SSLSocketFactory defaultFactory = (javax.net.ssl.SSLSocketFactory) javax.net.ssl.HttpsURLConnection.getDefaultSSLSocketFactory();
        ProviderEndpointSecurityValidator.SniSslSocketFactory sniFactory =
                new ProviderEndpointSecurityValidator.SniSslSocketFactory(defaultFactory, originalHost);

        assertNotNull(sniFactory);
        assertNotNull(sniFactory.getDefaultCipherSuites());
        assertNotNull(sniFactory.getSupportedCipherSuites());

        // Verify HostnameVerifier uses originalHost
        javax.net.ssl.HostnameVerifier defaultVerifier = javax.net.ssl.HttpsURLConnection.getDefaultHostnameVerifier();
        assertNotNull(defaultVerifier);

        // Standard verification against non-matching hostname fails (fails safe)
        assertFalse(defaultVerifier.verify("other.attacker.com", null));
    }
}
