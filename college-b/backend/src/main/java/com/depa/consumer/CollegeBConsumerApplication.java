package com.depa.consumer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CollegeBConsumerApplication {
    static {
        System.setProperty("sun.net.http.allowRestrictedHeaders", "true");
    }

    public static void main(String[] args) {
        SpringApplication.run(CollegeBConsumerApplication.class, args);
    }
}
