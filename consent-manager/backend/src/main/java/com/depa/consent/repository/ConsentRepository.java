package com.depa.consent.repository;

import com.depa.consent.entity.Consent;
import com.depa.consent.entity.ConsentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;

@Repository
public interface ConsentRepository extends JpaRepository<Consent, String> {
    Page<Consent> findByDataPrincipalIdAndProviderOrganizationId(String dataPrincipalId, String providerOrganizationId, Pageable pageable);
    Page<Consent> findByDataPrincipalIdAndProviderOrganizationIdAndStatus(String dataPrincipalId, String providerOrganizationId, ConsentStatus status, Pageable pageable);
    Optional<Consent> findByConsentRequestId(String consentRequestId);
    List<Consent> findByProviderOrganizationIdOrRequesterOrganizationIdOrderByCreatedAtDesc(String providerOrganizationId, String requesterOrganizationId);
    List<Consent> findByProviderOrganizationIdOrderByCreatedAtDesc(String providerOrganizationId);
    long countByStatus(ConsentStatus status);
}
