package com.depa.provider.dto;

import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentResponse {

    private Long id;
    private String studentId;
    private String name;
    private String email;
    private StudentStatus status;
    private String program;
    private String cgpa;
    private String transcript;
    private String degreeCertificate;
    private Instant createdAt;
    private String activationToken;

    public StudentResponse() {}

    public StudentResponse(Student student) {
        this.id = student.getId();
        this.studentId = student.getStudentId();
        this.name = student.getName();
        this.email = student.getEmail();
        this.status = student.getStatus();
        this.program = student.getProgram();
        this.cgpa = student.getCgpa();
        this.transcript = student.getTranscript();
        this.degreeCertificate = student.getDegreeCertificate();
        this.createdAt = student.getCreatedAt();
    }

    public Long getId() {
        return id;
    }

    public String getStudentId() {
        return studentId;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public StudentStatus getStatus() {
        return status;
    }

    public String getProgram() {
        return program;
    }

    public String getCgpa() {
        return cgpa;
    }

    public String getTranscript() {
        return transcript;
    }

    public String getDegreeCertificate() {
        return degreeCertificate;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getActivationToken() {
        return activationToken;
    }

    public void setActivationToken(String activationToken) {
        this.activationToken = activationToken;
    }
}
