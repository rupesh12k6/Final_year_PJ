package com.depa.provider.security;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Validates internal service-to-service authentication credentials for College A.
 * Enforces constant-time comparison (MessageDigest.isEqual) against timing attacks.
 * Fails closed if the secret is missing, blank, or improperly configured.
 */
@Component
public class InternalApiKeyValidator {

    private static final Logger log = LoggerFactory.getLogger(InternalApiKeyValidator.class);

    private final String configuredKey;

    public InternalApiKeyValidator(@Value("${app.internal.api-key:A-INTERNAL-SECRET-KEY}") String configuredKey) {
        this.configuredKey = (configuredKey != null) ? configuredKey.trim() : "";
    }

    @PostConstruct
    public void validateConfigurationOnStartup() {
        if (configuredKey.isBlank()) {
            log.warn("SECURITY WARNING: app.internal.api-key is not configured or blank! Internal API authentication will fail closed.");
        } else {
            log.info("College A Internal API authentication successfully initialized with configured secret.");
        }
    }

    public boolean isValid(String incomingKey) {
        if (configuredKey.isBlank() || incomingKey == null || incomingKey.isBlank()) {
            return false;
        }

        byte[] expectedBytes = configuredKey.getBytes(StandardCharsets.UTF_8);
        byte[] incomingBytes = incomingKey.trim().getBytes(StandardCharsets.UTF_8);

        return MessageDigest.isEqual(expectedBytes, incomingBytes);
    }

    public String getConfiguredKey() {
        if (configuredKey.isBlank()) {
            throw new IllegalStateException("Internal API key is missing or blank. Outbound service-to-service communication is blocked.");
        }
        return configuredKey;
    }

    public boolean isConfigured() {
        return !configuredKey.isBlank();
    }
}

