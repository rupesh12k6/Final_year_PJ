package com.depa.consent.repository;

import com.depa.consent.entity.ConsentRequest;
import com.depa.consent.entity.ConsentRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConsentRequestRepository extends JpaRepository<ConsentRequest, String> {
    List<ConsentRequest> findByDataPrincipalIdAndDataPrincipalOrganizationId(String dataPrincipalId, String dataPrincipalOrganizationId);
    List<ConsentRequest> findByDataPrincipalIdAndDataPrincipalOrganizationIdAndStatus(String dataPrincipalId, String dataPrincipalOrganizationId, ConsentRequestStatus status);
    Optional<ConsentRequest> findByDataRequestId(String dataRequestId);
}
