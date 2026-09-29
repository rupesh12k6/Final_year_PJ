package com.depa.consent.repository;

import com.depa.consent.entity.User;
import com.depa.consent.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByRole(UserRole role);
    List<User> findByRole(UserRole role);
    List<User> findByOrganizationId(String organizationId);
    Optional<User> findByOrganizationIdAndExternalIdentityId(String organizationId, String externalIdentityId);
    boolean existsByOrganizationIdAndExternalIdentityId(String organizationId, String externalIdentityId);
}
