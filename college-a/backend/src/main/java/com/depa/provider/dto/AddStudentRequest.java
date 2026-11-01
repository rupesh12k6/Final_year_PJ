package com.depa.provider.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class AddStudentRequest {

    @NotBlank(message = "Student ID / Roll No is required")
    private String studentId;

    @NotBlank(message = "Student Name is required")
    private String name;

    @NotBlank(message = "Student Email is required")
    @Email(message = "Valid email is required")
    private String email;

    private String program;
    private String cgpa;
    private String transcript;
    private String degreeCertificate;
    private String password;
    private String organizationCode;

    public AddStudentRequest() {}

    public AddStudentRequest(String studentId, String name, String email, String program,
                             String cgpa, String transcript, String degreeCertificate, String password) {
        this.studentId = studentId;
        this.name = name;
        this.email = email;
        this.program = program;
        this.cgpa = cgpa;
        this.transcript = transcript;
        this.degreeCertificate = degreeCertificate;
        this.password = password;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getProgram() {
        return program;
    }

    public void setProgram(String program) {
        this.program = program;
    }

    public String getCgpa() {
        return cgpa;
    }

    public void setCgpa(String cgpa) {
        this.cgpa = cgpa;
    }

    public String getTranscript() {
        return transcript;
    }

    public void setTranscript(String transcript) {
        this.transcript = transcript;
    }

    public String getDegreeCertificate() {
        return degreeCertificate;
    }

    public void setDegreeCertificate(String degreeCertificate) {
        this.degreeCertificate = degreeCertificate;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getOrganizationCode() {
        return organizationCode;
    }

    public void setOrganizationCode(String organizationCode) {
        this.organizationCode = organizationCode;
    }
}
