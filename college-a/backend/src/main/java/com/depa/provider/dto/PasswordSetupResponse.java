package com.depa.provider.dto;

public class PasswordSetupResponse {
    private boolean success;
    private String studentId;
    private String status;
    private String message;

    public PasswordSetupResponse() {}

    public PasswordSetupResponse(boolean success, String studentId, String status, String message) {
        this.success = success;
        this.studentId = studentId;
        this.status = status;
        this.message = message;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}

