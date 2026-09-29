package com.depa.provider.dto;

public class OnboardResultResponse {

    private boolean success;
    private String organizationCode;
    private int totalStudentsInDb;
    private int invitationsDispatched;
    private int alreadyActiveSkipped;
    private String message;

    public OnboardResultResponse() {}

    public OnboardResultResponse(boolean success, String organizationCode, int totalStudentsInDb,
                                 int invitationsDispatched, int alreadyActiveSkipped, String message) {
        this.success = success;
        this.organizationCode = organizationCode;
        this.totalStudentsInDb = totalStudentsInDb;
        this.invitationsDispatched = invitationsDispatched;
        this.alreadyActiveSkipped = alreadyActiveSkipped;
        this.message = message;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getOrganizationCode() {
        return organizationCode;
    }

    public int getTotalStudentsInDb() {
        return totalStudentsInDb;
    }

    public int getInvitationsDispatched() {
        return invitationsDispatched;
    }

    public int getAlreadyActiveSkipped() {
        return alreadyActiveSkipped;
    }

    public String getMessage() {
        return message;
    }
}
