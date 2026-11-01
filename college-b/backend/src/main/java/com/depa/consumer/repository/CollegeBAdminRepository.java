package com.depa.consumer.repository;

import com.depa.consumer.entity.CollegeBAdmin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CollegeBAdminRepository extends JpaRepository<CollegeBAdmin, Long> {
    Optional<CollegeBAdmin> findByEmail(String email);
    Optional<CollegeBAdmin> findByAdminId(String adminId);
}
