package com.depa.consent.dto;

public class BulkOnboardingResponse {

    private String organizationCode;
    private int totalReceived;
    private int invitationsCreated;
    private int skippedCount;

    public BulkOnboardingResponse() {}

    public BulkOnboardingResponse(String organizationCode, int totalReceived, int invitationsCreated, int skippedCount) {
        this.organizationCode = organizationCode;
        this.totalReceived = totalReceived;
        this.invitationsCreated = invitationsCreated;
        this.skippedCount = skippedCount;
    }

    public String getOrganizationCode() {
        return organizationCode;
    }

    public void setOrganizationCode(String organizationCode) {
        this.organizationCode = organizationCode;
    }

    public int getTotalReceived() {
        return totalReceived;
    }

    public void setTotalReceived(int totalReceived) {
        this.totalReceived = totalReceived;
    }

    public int getInvitationsCreated() {
        return invitationsCreated;
    }

    public void setInvitationsCreated(int invitationsCreated) {
        this.invitationsCreated = invitationsCreated;
    }

    public int getSkippedCount() {
        return skippedCount;
    }

    public void setSkippedCount(int skippedCount) {
        this.skippedCount = skippedCount;
    }
}
