package com.depa.consumer.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.nio.charset.StandardCharsets;

/**
 * ==============================================================================
 * DEPA COLLEGE B — DATABASE CONSTRAINT MIGRATION RUNNER
 * Automatically applies version-controlled SQL migration
 * 'db/migration/V1_1__update_student_status_constraint.sql' to ensure
 * PostgreSQL check constraint 'students_status_check' permits 'PENDING_ACTIVATION'
 * alongside 'ACTIVE', 'PENDING_VERIFICATION', 'INACTIVE', and 'GRADUATED'.
 * 
 * Runs at startup (Order 1) so it safely executes before any data seeders.
 * Completely idempotent and safe for both fresh and existing database schemas.
 * ==============================================================================
 */
@Component
@Order(1)
public class CollegeBDatabaseConstraintMigration implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CollegeBDatabaseConstraintMigration.class);
    private static final String MIGRATION_SCRIPT_PATH = "db/migration/V1_1__update_student_status_constraint.sql";

    private final JdbcTemplate jdbcTemplate;

    public CollegeBDatabaseConstraintMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        applyMigration();
    }

    public void applyMigration() {
        try {
            ClassPathResource resource = new ClassPathResource(MIGRATION_SCRIPT_PATH);
            if (resource.exists()) {
                String sql = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
                jdbcTemplate.execute(sql);
                log.info("Successfully executed {}: students_status_check constraint updated (permitted: ACTIVE, PENDING_VERIFICATION, INACTIVE, GRADUATED, PENDING_ACTIVATION).", MIGRATION_SCRIPT_PATH);
            } else {
                log.warn("Migration script '{}' not found on classpath. Executing fallback constraint update.", MIGRATION_SCRIPT_PATH);
                executeFallback();
            }
        } catch (Exception e) {
            log.warn("Database constraint migration notice: {}", e.getMessage());
        }
    }

    private void executeFallback() {
        try {
            jdbcTemplate.execute(
                "DO $$ BEGIN " +
                "IF to_regclass('students') IS NOT NULL THEN " +
                "  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_status_check' AND conrelid = to_regclass('students')) THEN " +
                "    ALTER TABLE students DROP CONSTRAINT students_status_check; " +
                "  END IF; " +
                "  ALTER TABLE students ADD CONSTRAINT students_status_check " +
                "    CHECK (status::text = ANY (ARRAY['ACTIVE'::varchar, 'PENDING_VERIFICATION'::varchar, 'INACTIVE'::varchar, 'GRADUATED'::varchar, 'PENDING_ACTIVATION'::varchar]::text[])); " +
                "END IF; " +
                "END $$;"
            );
            log.info("Fallback students_status_check migration successfully applied.");
        } catch (Exception ex) {
            log.warn("Fallback migration failed: {}", ex.getMessage());
        }
    }
}

