-- ==============================================================================
-- DEPA COLLEGE B DATABASE MIGRATION
-- Migration Version: V1_1__update_student_status_constraint.sql
-- Description: Updates students_status_check check constraint to include
--              PENDING_ACTIVATION while preserving ACTIVE, PENDING_VERIFICATION, INACTIVE, GRADUATED.
-- Safety: Idempotent; safe for existing databases without deleting/rewriting records.
-- ==============================================================================

DO $$
BEGIN
    -- Only proceed if students table exists
    IF to_regclass('students') IS NOT NULL THEN
        -- Drop the old constraint if it exists
        IF EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'students_status_check' 
              AND conrelid = to_regclass('students')
        ) THEN
            ALTER TABLE students DROP CONSTRAINT students_status_check;
        END IF;

        -- Add updated constraint with PENDING_ACTIVATION permitted
        ALTER TABLE students ADD CONSTRAINT students_status_check 
            CHECK (status::text = ANY (ARRAY[
                'ACTIVE'::varchar, 
                'PENDING_VERIFICATION'::varchar,
                'INACTIVE'::varchar, 
                'GRADUATED'::varchar,
                'PENDING_ACTIVATION'::varchar
            ]::text[]));
    END IF;
END $$;

