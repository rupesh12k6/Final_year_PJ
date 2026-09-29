package com.depa.provider.schema;

import com.depa.provider.entity.Student;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * College A Schema / Field Mapping Registry.
 * Decouples canonical requested field names from College A's internal database column structure.
 *
 * Example:
 * Canonical: STUDY_CERTIFICATE -> Local: sc
 * Canonical: STUDENT_ID -> Local: student_id
 * Canonical: NAME -> Local: name
 */
@Component
public class CollegeAFieldMappingRegistry {

    private final Map<String, Function<Student, Object>> fieldExtractors = new HashMap<>();

    public CollegeAFieldMappingRegistry() {
        fieldExtractors.put("STUDENT_ID", Student::getStudentId);
        fieldExtractors.put("NAME", Student::getName);
        fieldExtractors.put("EMAIL", Student::getEmail);
        fieldExtractors.put("STUDY_CERTIFICATE", Student::getSc);
    }

    public boolean isFieldSupported(String canonicalField) {
        if (canonicalField == null) return false;
        return fieldExtractors.containsKey(canonicalField.trim().toUpperCase());
    }

    public Object extractValue(String canonicalField, Student student) {
        if (canonicalField == null || student == null) return null;
        Function<Student, Object> extractor = fieldExtractors.get(canonicalField.trim().toUpperCase());
        return extractor != null ? extractor.apply(student) : null;
    }

    public Set<String> getSupportedCanonicalFields() {
        return Collections.unmodifiableSet(fieldExtractors.keySet());
    }
}
