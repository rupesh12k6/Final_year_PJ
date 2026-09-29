package com.depa.consent.security;

import com.depa.consent.entity.User;
import com.depa.consent.entity.UserRole;
import com.depa.consent.entity.UserStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

public class UserPrincipal implements UserDetails {

    private final String userId;
    private final String email;
    private final String password;
    private final UserRole role;
    private final String organizationId;
    private final String externalIdentityId;
    private final UserStatus status;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(String userId, String email, String password, UserRole role, String organizationId, UserStatus status) {
        this(userId, email, password, role, organizationId, null, status);
    }

    public UserPrincipal(String userId, String email, String password, UserRole role, String organizationId, String externalIdentityId, UserStatus status) {
        this.userId = userId;
        this.email = email;
        this.password = password;
        this.role = role;
        this.organizationId = organizationId;
        this.externalIdentityId = externalIdentityId;
        this.status = status;
        this.authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    public static UserPrincipal fromUser(User user) {
        return new UserPrincipal(
                user.getUserId(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getRole(),
                user.getOrganizationId(),
                user.getExternalIdentityId(),
                user.getStatus()
        );
    }

    public String getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public UserRole getRole() {
        return role;
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public String getExternalIdentityId() {
        return externalIdentityId;
    }

    public UserStatus getStatus() {
        return status;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return status == UserStatus.ACTIVE;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return status == UserStatus.ACTIVE;
    }
}
