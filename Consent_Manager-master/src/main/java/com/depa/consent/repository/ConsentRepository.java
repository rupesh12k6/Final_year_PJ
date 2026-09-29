package com.depa.consent.repository;

import com.depa.consent.entity.Consent;
import com.depa.consent.entity.ConsentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConsentRepository extends JpaRepository<Consent, String> {
    List<Consent> findByDataPrincipalIdAndProviderOrganizationId(String dataPrincipalId, String providerOrganizationId);
    List<Consent> findByDataPrincipalIdAndProviderOrganizationIdAndStatus(String dataPrincipalId, String providerOrganizationId, ConsentStatus status);
    Optional<Consent> findByConsentRequestId(String consentRequestId);
}
