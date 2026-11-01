package com.depa.consent.repository;

import com.depa.consent.entity.DataRequest;
import com.depa.consent.entity.DataRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

@Repository
public interface DataRequestRepository extends JpaRepository<DataRequest, String> {
    Page<DataRequest> findByRequesterOrganizationId(String requesterOrganizationId, Pageable pageable);
    List<DataRequest> findByRequesterUserId(String requesterUserId);
    List<DataRequest> findByDataPrincipalIdAndProviderOrganizationId(String dataPrincipalId, String providerOrganizationId);
    List<DataRequest> findByRequesterOrganizationIdOrderByRequestedAtDesc(String requesterOrganizationId);
    List<DataRequest> findByStatus(DataRequestStatus status);
    long countByStatus(DataRequestStatus status);
}
