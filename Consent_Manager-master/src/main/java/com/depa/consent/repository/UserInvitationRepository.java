package com.depa.consent.repository;

import com.depa.consent.entity.InvitationStatus;
import com.depa.consent.entity.UserInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserInvitationRepository extends JpaRepository<UserInvitation, String> {
    Optional<UserInvitation> findByTokenHash(String tokenHash);
    List<UserInvitation> findByOrganizationIdAndExternalIdentityIdAndStatus(String organizationId, String externalIdentityId, InvitationStatus status);
}
