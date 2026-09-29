package com.depa.provider.dto;

public class DataExchangeResponse {
    private String providerPublicKey;
    private String encryptedData;

    public DataExchangeResponse() {}

    public DataExchangeResponse(String providerPublicKey, String encryptedData) {
        this.providerPublicKey = providerPublicKey;
        this.encryptedData = encryptedData;
    }

    public String getProviderPublicKey() { return providerPublicKey; }
    public void setProviderPublicKey(String providerPublicKey) { this.providerPublicKey = providerPublicKey; }
    public String getEncryptedData() { return encryptedData; }
    public void setEncryptedData(String encryptedData) { this.encryptedData = encryptedData; }
}
