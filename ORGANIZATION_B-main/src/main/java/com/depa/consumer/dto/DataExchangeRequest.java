package com.depa.consumer.dto;

public class DataExchangeRequest {
    private String consumerPublicKey;

    public DataExchangeRequest() {}

    public DataExchangeRequest(String consumerPublicKey) {
        this.consumerPublicKey = consumerPublicKey;
    }

    public String getConsumerPublicKey() { return consumerPublicKey; }
    public void setConsumerPublicKey(String consumerPublicKey) { this.consumerPublicKey = consumerPublicKey; }
}
