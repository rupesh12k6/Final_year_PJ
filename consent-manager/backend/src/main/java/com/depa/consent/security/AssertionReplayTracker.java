package com.depa.consent.security;

import com.depa.consent.entity.ConsumedAssertion;
import com.depa.consent.repository.ConsumedAssertionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Database-backed replay tracker that enforces unique assertion JTIs at the database level.
 * Persists consumed assertion identifiers across application restarts.
 */
@Component
public class AssertionReplayTracker {

    private static final Logger log = LoggerFactory.getLogger(AssertionReplayTracker.class);

    private final ConsumedAssertionRepository repository;

    public AssertionReplayTracker(ConsumedAssertionRepository repository) {
        this.repository = repository;
    }

    /**
     * Checks and consumes the assertion JTI using database-level uniqueness.
     * Uses REQUIRES_NEW propagation to ensure replay tracking records persist
     * even if downstream business logic rolls back or encounters an error.
     *
     * @return true if fresh and recorded, false if already consumed or duplicate (replay)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean checkAndConsume(String jti, String studentId, String organizationId, String action, String targetId, Instant expiresAt) {
        if (jti == null || jti.isBlank()) {
            return false;
        }

        String normalizedJti = jti.trim();

        // 1. Fast read check
        if (repository.existsById(normalizedJti)) {
            log.warn("Assertion replay attempt detected for JTI={}", normalizedJti);
            return false;
        }

        // 2. Database-level uniqueness insertion (handles concurrent race conditions)
        try {
            ConsumedAssertion assertion = new ConsumedAssertion(
                    normalizedJti,
                    studentId != null ? studentId : "UNKNOWN",
                    organizationId != null ? organizationId : "UNKNOWN",
                    action != null ? action : "UNKNOWN",
                    targetId,
                    expiresAt != null ? expiresAt : Instant.now().plusSeconds(300),
                    Instant.now()
            );
            repository.saveAndFlush(assertion);
            return true;
        } catch (DataIntegrityViolationException e) {
            log.warn("Concurrent duplicate assertion insertion detected for JTI={}", normalizedJti);
            return false;
        }
    }

    /**
     * Convenience method for backward compatibility in callers where context is minimal.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean checkAndConsume(String jti, Instant expiresAt) {
        return checkAndConsume(jti, "UNKNOWN", "UNKNOWN", "UNKNOWN", null, expiresAt);
    }

    /**
     * Safe cleanup of expired assertion records past their TTL.
     */
    @Transactional
    public int cleanupExpired() {
        return repository.deleteExpired(Instant.now());
    }
}
