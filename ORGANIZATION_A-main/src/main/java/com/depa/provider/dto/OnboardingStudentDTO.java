package com.depa.provider.dto;

public class OnboardingStudentDTO {

    private String studentId;
    private String email;

    public OnboardingStudentDTO() {}

    public OnboardingStudentDTO(String studentId, String email) {
        this.studentId = studentId;
        this.email = email;
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
}
