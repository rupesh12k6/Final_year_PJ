package com.depa.consent.repository;

import com.depa.consent.entity.AccessGrant;
import com.depa.consent.entity.AccessGrantStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccessGrantRepository extends JpaRepository<AccessGrant, String> {
    List<AccessGrant> findByConsentId(String consentId);
    List<AccessGrant> findByRequesterOrganizationId(String requesterOrganizationId);
    List<AccessGrant> findByDataPrincipalId(String dataPrincipalId);
    Optional<AccessGrant> findByIdAndStatus(String id, AccessGrantStatus status);
}
