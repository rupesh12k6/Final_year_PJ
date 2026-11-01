package com.depa.consent.repository;

import com.depa.consent.entity.ConsentRequest;
import com.depa.consent.entity.ConsentRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;

@Repository
public interface ConsentRequestRepository extends JpaRepository<ConsentRequest, String> {
    Page<ConsentRequest> findByDataPrincipalIdAndDataPrincipalOrganizationId(String dataPrincipalId, String dataPrincipalOrganizationId, Pageable pageable);
    Page<ConsentRequest> findByDataPrincipalIdAndDataPrincipalOrganizationIdAndStatus(String dataPrincipalId, String dataPrincipalOrganizationId, ConsentRequestStatus status, Pageable pageable);
    Optional<ConsentRequest> findByDataRequestId(String dataRequestId);
}
