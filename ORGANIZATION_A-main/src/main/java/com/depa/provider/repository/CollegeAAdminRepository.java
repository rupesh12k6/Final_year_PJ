package com.depa.provider.repository;

import com.depa.provider.entity.CollegeAAdmin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CollegeAAdminRepository extends JpaRepository<CollegeAAdmin, String> {
    Optional<CollegeAAdmin> findByEmail(String email);
    boolean existsByEmail(String email);
}
