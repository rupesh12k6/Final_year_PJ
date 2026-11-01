package com.depa.consent.repository;

import com.depa.consent.entity.ConsumedAssertion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Repository
public interface ConsumedAssertionRepository extends JpaRepository<ConsumedAssertion, String> {

    @Modifying
    @Transactional
    @Query("DELETE FROM ConsumedAssertion c WHERE c.expiresAt < :now")
    int deleteExpired(@Param("now") Instant now);
}

