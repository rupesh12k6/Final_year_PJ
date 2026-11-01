package com.depa.consumer.dto;

public class DirectDataAccessRequest {

    private String grantId;
    private String accessToken;

    public DirectDataAccessRequest() {}

    public DirectDataAccessRequest(String grantId, String accessToken) {
        this.grantId = grantId;
        this.accessToken = accessToken;
    }

    public String getGrantId() {
        return grantId;
    }

    public void setGrantId(String grantId) {
        this.grantId = grantId;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }
}
