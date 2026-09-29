package com.depa.provider.dto;

import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;

import java.time.Instant;

public class StudentResponse {

    private Long id;
    private String studentId;
    private String name;
    private String email;
    private StudentStatus status;
    private Instant createdAt;

    public StudentResponse() {}

    public StudentResponse(Student student) {
        this.id = student.getId();
        this.studentId = student.getStudentId();
        this.name = student.getName();
        this.email = student.getEmail();
        this.status = student.getStatus();
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

    public Instant getCreatedAt() {
        return createdAt;
    }
}
