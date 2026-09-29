package com.depa.consent.repository;

import com.depa.consent.entity.EmailVerificationOtp;
import com.depa.consent.entity.OtpStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailVerificationOtpRepository extends JpaRepository<EmailVerificationOtp, String> {
    Optional<EmailVerificationOtp> findTopByUserIdAndStatusOrderByCreatedAtDesc(String userId, OtpStatus status);
    List<EmailVerificationOtp> findByUserIdAndStatus(String userId, OtpStatus status);
}
