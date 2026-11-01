package com.depa.provider.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class HealthController {

    @Value("${server.port:8081}")
    private int port;

    @Value("${app.college.code:COLLEGE_A}")
    private String collegeCode;

    @Value("${app.college.name:College A University}")
    private String collegeName;

    @GetMapping({"/health", "/api/health"})
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "service", collegeCode.toLowerCase() + "-provider",
                "collegeCode", collegeCode,
                "collegeName", collegeName,
                "status", "UP",
                "port", port,
                "timestamp", Instant.now().toString()
        ));
    }
}

