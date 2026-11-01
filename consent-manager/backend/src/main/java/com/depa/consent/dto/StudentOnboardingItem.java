package com.depa.consent.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class StudentOnboardingItem {

    @NotBlank(message = "External identity / Student ID is required")
    @JsonAlias({"externalIdentityId", "id"})
    private String studentId;

    @NotBlank(message = "Trusted email is required")
    @Email(message = "Email must be valid")
    private String email;

    private String name;

    public StudentOnboardingItem() {}

    public StudentOnboardingItem(String studentId, String email) {
        this(studentId, email, null);
    }

    public StudentOnboardingItem(String studentId, String email, String name) {
        this.studentId = studentId;
        this.email = email;
        this.name = name;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getExternalIdentityId() {
        return studentId;
    }

    public void setExternalIdentityId(String externalIdentityId) {
        this.studentId = externalIdentityId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
