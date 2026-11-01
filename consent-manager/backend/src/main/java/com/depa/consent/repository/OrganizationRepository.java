package com.depa.consent.repository;

import com.depa.consent.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, String> {
    Optional<Organization> findByOrganizationCode(String organizationCode);
    Optional<Organization> findByCredentials(String credentials);
    boolean existsByOrganizationCode(String organizationCode);
    boolean existsByEmail(String email);
    long countByStatus(com.depa.consent.entity.OrganizationStatus status);
}
