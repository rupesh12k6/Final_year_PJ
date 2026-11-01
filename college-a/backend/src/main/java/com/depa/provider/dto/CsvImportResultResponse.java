package com.depa.provider.dto;

import java.time.Instant;
import java.util.List;

public class CsvImportResultResponse {
    private int totalRecords;
    private int importedCount;
    private int skippedCount;
    private String message;
    private List<StudentActivationItem> items;

    public CsvImportResultResponse() {}

    public CsvImportResultResponse(int totalRecords, int importedCount, int skippedCount, String message, List<StudentActivationItem> items) {
        this.totalRecords = totalRecords;
        this.importedCount = importedCount;
        this.skippedCount = skippedCount;
        this.message = message;
        this.items = items;
    }

    public int getTotalRecords() { return totalRecords; }
    public void setTotalRecords(int totalRecords) { this.totalRecords = totalRecords; }
    public int getImportedCount() { return importedCount; }
    public void setImportedCount(int importedCount) { this.importedCount = importedCount; }
    public int getSkippedCount() { return skippedCount; }
    public void setSkippedCount(int skippedCount) { this.skippedCount = skippedCount; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public List<StudentActivationItem> getItems() { return items; }
    public void setItems(List<StudentActivationItem> items) { this.items = items; }

    public static class StudentActivationItem {
        private String studentId;
        private String name;
        private String email;
        private String status;
        private String activationToken;
        private String activationLink;
        private Instant expiresAt;

        public StudentActivationItem() {}

        public StudentActivationItem(String studentId, String name, String email, String status, String activationToken, String activationLink, Instant expiresAt) {
            this.studentId = studentId;
            this.name = name;
            this.email = email;
            this.status = status;
            this.activationToken = activationToken;
            this.activationLink = activationLink;
            this.expiresAt = expiresAt;
        }

        public String getStudentId() { return studentId; }
        public void setStudentId(String studentId) { this.studentId = studentId; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getActivationToken() { return activationToken; }
        public void setActivationToken(String activationToken) { this.activationToken = activationToken; }
        public String getActivationLink() { return activationLink; }
        public void setActivationLink(String activationLink) { this.activationLink = activationLink; }
        public Instant getExpiresAt() { return expiresAt; }
        public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    }
}

