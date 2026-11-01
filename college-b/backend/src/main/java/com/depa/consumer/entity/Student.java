package com.depa.consumer.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "students", uniqueConstraints = {
        @UniqueConstraint(name = "uk_students_student_id", columnNames = {"student_id"}),
        @UniqueConstraint(name = "uk_students_email", columnNames = {"email"})
})
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", length = 64, nullable = false)
    private String studentId;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "email", length = 255, nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private StudentStatus status;

    @Column(name = "sc", length = 255)
    private String sc;

    @Column(name = "department", length = 128)
    private String department;

    @Column(name = "cgpa", length = 32)
    private String cgpa;

    @Column(name = "degree", length = 255)
    private String degree;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "activation_token_hash", length = 64)
    private String activationTokenHash;

    @Column(name = "activation_token_expires_at")
    private Instant activationTokenExpiresAt;

    @Column(name = "activation_completed_at")
    private Instant activationCompletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Student() {}

    public Student(String studentId, String name, String email, StudentStatus status) {
        this(studentId, name, email, status, "Valid - B.Tech AI & Data Science", "Artificial Intelligence & Data Science", "9.12", "Bachelor of Technology", null);
    }

    public Student(String studentId, String name, String email, StudentStatus status, String sc, String department, String cgpa, String degree) {
        this(studentId, name, email, status, sc, department, cgpa, degree, null);
    }

    public Student(String studentId, String name, String email, StudentStatus status, String sc, String department, String cgpa, String degree, String passwordHash) {
        this.studentId = studentId;
        this.name = name;
        this.email = email;
        this.status = status;
        this.sc = sc;
        this.department = department;
        this.cgpa = cgpa;
        this.degree = degree;
        this.passwordHash = passwordHash;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public StudentStatus getStatus() { return status; }
    public void setStatus(StudentStatus status) { this.status = status; }
    public String getSc() { return sc; }
    public void setSc(String sc) { this.sc = sc; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getCgpa() { return cgpa; }
    public void setCgpa(String cgpa) { this.cgpa = cgpa; }
    public String getDegree() { return degree; }
    public void setDegree(String degree) { this.degree = degree; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getActivationTokenHash() { return activationTokenHash; }
    public void setActivationTokenHash(String activationTokenHash) { this.activationTokenHash = activationTokenHash; }
    public Instant getActivationTokenExpiresAt() { return activationTokenExpiresAt; }
    public void setActivationTokenExpiresAt(Instant activationTokenExpiresAt) { this.activationTokenExpiresAt = activationTokenExpiresAt; }
    public Instant getActivationCompletedAt() { return activationCompletedAt; }
    public void setActivationCompletedAt(Instant activationCompletedAt) { this.activationCompletedAt = activationCompletedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
