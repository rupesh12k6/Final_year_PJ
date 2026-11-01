package com.depa.provider.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class CollegeAUserPrincipal implements UserDetails {

    private final String id;
    private final String email;
    private final String organizationCode;
    private final String role;
    private final List<String> scopes;
    private final String studentId;
    private final Collection<? extends GrantedAuthority> authorities;

    public CollegeAUserPrincipal(String id, String email, String organizationCode, String role, List<String> scopes) {
        this(id, email, organizationCode, role, scopes, null);
    }

    public CollegeAUserPrincipal(String id, String email, String organizationCode, String role, List<String> scopes, String studentId) {
        this.id = id;
        this.email = email;
        this.organizationCode = organizationCode;
        this.role = role;
        this.scopes = scopes != null ? scopes : List.of();
        this.studentId = studentId;

        Set<GrantedAuthority> auths = new HashSet<>();
        auths.add(new SimpleGrantedAuthority("ROLE_" + role));
        for (String s : this.scopes) {
            auths.add(new SimpleGrantedAuthority("SCOPE_" + s.trim()));
        }
        this.authorities = auths;
    }

    public String getId() {
        return id;
    }

    public String getStudentId() {
        return studentId;
    }

    public String getEmail() {
        return email;
    }

    public String getOrganizationCode() {
        return organizationCode;
    }

    public String getOrgId() {
        return organizationCode;
    }

    public String getRole() {
        return role;
    }

    public List<String> getScopes() {
        return scopes;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return null;
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
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
