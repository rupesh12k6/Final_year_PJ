package com.depa.consent.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

@Service
public class EmailDeliveryService {

    private static final Logger log = LoggerFactory.getLogger(EmailDeliveryService.class);
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.cm.base-url:http://localhost:8080}")
    private String cmBaseUrl;

    public String generateSecureToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    public String generateNumericOtp() {
        int code = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(code);
    }

    public String hash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    public String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        int atIndex = email.indexOf('@');
        String name = email.substring(0, atIndex);
        String domain = email.substring(atIndex);

        if (name.length() <= 2) {
            return name.charAt(0) + "***" + domain;
        }
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + domain;
    }

    public void sendInvitationEmail(String targetEmail, String rawToken, String orgCode, String studentId) {
        String inviteUrl = cmBaseUrl + "/api/registration/invitation/" + rawToken;
        log.info("==================================================================");
        log.info("[EMAIL SERVICE] INVITATION DISPATCHED");
        log.info("To: {}", maskEmail(targetEmail));
        log.info("Organization: {}", orgCode);
        log.info("Student ID: {}", studentId);
        log.info("Raw Invitation Token: {}", rawToken);
        log.info("Invitation URL: {}", inviteUrl);
        log.info("==================================================================");
    }

    public void sendOtpEmail(String targetEmail, String rawOtp) {
        log.info("==================================================================");
        log.info("[EMAIL SERVICE] OTP DISPATCHED");
        log.info("To: {}", maskEmail(targetEmail));
        log.info("Verification OTP: {}", rawOtp);
        log.info("Expires in: 10 minutes");
        log.info("==================================================================");
    }
}
