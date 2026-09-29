package com.depa.consent.repository;

import com.depa.consent.entity.DataRequest;
import com.depa.consent.entity.DataRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DataRequestRepository extends JpaRepository<DataRequest, String> {
    List<DataRequest> findByRequesterOrganizationId(String requesterOrganizationId);
    List<DataRequest> findByRequesterUserId(String requesterUserId);
    List<DataRequest> findByDataPrincipalIdAndProviderOrganizationId(String dataPrincipalId, String providerOrganizationId);
    List<DataRequest> findByStatus(DataRequestStatus status);
}
