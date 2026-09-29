package com.depa.consent.dto;

public class ImportOnboardingResponse {

    private String organizationId;
    private String organizationCode;
    private int total;
    private int newInvitations;
    private int alreadyActive;
    private int alreadyPending;
    private int failed;
    private String message;

    public ImportOnboardingResponse() {}

    public ImportOnboardingResponse(String organizationId, String organizationCode, int total,
                                    int newInvitations, int alreadyActive, int alreadyPending, int failed, String message) {
        this.organizationId = organizationId;
        this.organizationCode = organizationCode;
        this.total = total;
        this.newInvitations = newInvitations;
        this.alreadyActive = alreadyActive;
        this.alreadyPending = alreadyPending;
        this.failed = failed;
        this.message = message;
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public String getOrganizationCode() {
        return organizationCode;
    }

    public void setOrganizationCode(String organizationCode) {
        this.organizationCode = organizationCode;
    }

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public int getNewInvitations() {
        return newInvitations;
    }

    public void setNewInvitations(int newInvitations) {
        this.newInvitations = newInvitations;
    }

    public int getAlreadyActive() {
        return alreadyActive;
    }

    public void setAlreadyActive(int alreadyActive) {
        this.alreadyActive = alreadyActive;
    }

    public int getAlreadyPending() {
        return alreadyPending;
    }

    public void setAlreadyPending(int alreadyPending) {
        this.alreadyPending = alreadyPending;
    }

    public int getFailed() {
        return failed;
    }

    public void setFailed(int failed) {
        this.failed = failed;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
