package com.depa.consent.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class ImportOnboardingRequest {

    @NotEmpty(message = "Students list must not be empty")
    @Valid
    @JsonAlias({"items", "users"})
    private List<StudentOnboardingItem> students;

    public ImportOnboardingRequest() {}

    public ImportOnboardingRequest(List<StudentOnboardingItem> students) {
        this.students = students;
    }

    public List<StudentOnboardingItem> getStudents() {
        return students;
    }

    public void setStudents(List<StudentOnboardingItem> students) {
        this.students = students;
    }
}
