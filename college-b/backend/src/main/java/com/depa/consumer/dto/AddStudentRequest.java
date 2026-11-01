package com.depa.consumer.dto;

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

    private String department;
    private String cgpa;
    private String degree;
    private String sc;
    private String password;
    private String organizationCode;

    public AddStudentRequest() {}

    public AddStudentRequest(String studentId, String name, String email, String department, String cgpa, String degree, String sc, String password) {
        this.studentId = studentId;
        this.name = name;
        this.email = email;
        this.department = department;
        this.cgpa = cgpa;
        this.degree = degree;
        this.sc = sc;
        this.password = password;
    }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getCgpa() { return cgpa; }
    public void setCgpa(String cgpa) { this.cgpa = cgpa; }
    public String getDegree() { return degree; }
    public void setDegree(String degree) { this.degree = degree; }
    public String getSc() { return sc; }
    public void setSc(String sc) { this.sc = sc; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getOrganizationCode() { return organizationCode; }
    public void setOrganizationCode(String organizationCode) { this.organizationCode = organizationCode; }
}

