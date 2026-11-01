package com.depa.consumer.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentResponse {
    private Long id;
    private String studentId;
    private String name;
    private String email;
    private String status;
    private String department;
    private String cgpa;
    private String degree;
    private String activationToken;

    public StudentResponse() {}

    public StudentResponse(Long id, String studentId, String name, String email, String status) {
        this(id, studentId, name, email, status, null, null, null);
    }

    public StudentResponse(Long id, String studentId, String name, String email, String status, String department, String cgpa, String degree) {
        this.id = id;
        this.studentId = studentId;
        this.name = name;
        this.email = email;
        this.status = status;
        this.department = department;
        this.cgpa = cgpa;
        this.degree = degree;
    }

    public StudentResponse(com.depa.consumer.entity.Student s) {
        this(s.getId(), s.getStudentId(), s.getName(), s.getEmail(), s.getStatus().name(), s.getDepartment(), s.getCgpa(), s.getDegree());
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getCgpa() { return cgpa; }
    public void setCgpa(String cgpa) { this.cgpa = cgpa; }
    public String getDegree() { return degree; }
    public void setDegree(String degree) { this.degree = degree; }
    public String getActivationToken() { return activationToken; }
    public void setActivationToken(String activationToken) { this.activationToken = activationToken; }
}
