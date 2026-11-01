package com.depa.provider.entity;

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

    @Column(name = "program", length = 255)
    private String program;

    @Column(name = "cgpa", length = 64)
    private String cgpa;

    @Column(name = "transcript", length = 1024)
    private String transcript;

    @Column(name = "degree_certificate", length = 512)
    private String degreeCertificate;

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
        this(studentId, name, email, status, "Valid - Enrolled in B.Tech Computer Science");
    }

    public Student(String studentId, String name, String email, StudentStatus status, String sc) {
        this(studentId, name, email, status, sc, "B.Tech Computer Science", "8.84 / 10.0", "Sem 1: 8.7 SGPA | Sem 2: 8.9 SGPA | Sem 3: 9.1 SGPA | Sem 4: 8.8 SGPA", "Bachelor of Technology in Computer Science & Engineering (Verified Official)", null);
    }

    public Student(String studentId, String name, String email, StudentStatus status, String sc,
                   String program, String cgpa, String transcript, String degreeCertificate, String passwordHash) {
        this.studentId = studentId;
        this.name = name;
        this.email = email;
        this.status = status;
        this.sc = sc;
        this.program = program;
        this.cgpa = cgpa;
        this.transcript = transcript;
        this.degreeCertificate = degreeCertificate;
        this.passwordHash = passwordHash;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
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

    public StudentStatus getStatus() {
        return status;
    }

    public void setStatus(StudentStatus status) {
        this.status = status;
    }

    public String getSc() {
        return sc;
    }

    public void setSc(String sc) {
        this.sc = sc;
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

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getActivationTokenHash() {
        return activationTokenHash;
    }

    public void setActivationTokenHash(String activationTokenHash) {
        this.activationTokenHash = activationTokenHash;
    }

    public Instant getActivationTokenExpiresAt() {
        return activationTokenExpiresAt;
    }

    public void setActivationTokenExpiresAt(Instant activationTokenExpiresAt) {
        this.activationTokenExpiresAt = activationTokenExpiresAt;
    }

    public Instant getActivationCompletedAt() {
        return activationCompletedAt;
    }

    public void setActivationCompletedAt(Instant activationCompletedAt) {
        this.activationCompletedAt = activationCompletedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
