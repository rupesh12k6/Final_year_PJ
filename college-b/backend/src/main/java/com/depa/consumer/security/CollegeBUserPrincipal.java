package com.depa.consumer.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class CollegeBUserPrincipal implements UserDetails {

    private final String adminId;
    private final String email;
    private final String organizationCode;
    private final String studentId;
    private final Collection<? extends GrantedAuthority> authorities;

    public CollegeBUserPrincipal(String adminId, String email, String organizationCode, Collection<? extends GrantedAuthority> authorities) {
        this(adminId, email, organizationCode, null, authorities);
    }

    public CollegeBUserPrincipal(String adminId, String email, String organizationCode, String studentId, Collection<? extends GrantedAuthority> authorities) {
        this.adminId = adminId;
        this.email = email;
        this.organizationCode = organizationCode;
        this.studentId = studentId;
        this.authorities = authorities;
    }

    public static CollegeBUserPrincipal create(String adminId, String email, String organizationCode, String role) {
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        return new CollegeBUserPrincipal(adminId, email, organizationCode, authorities);
    }

    public static CollegeBUserPrincipal createForStudent(String studentId, String email, String organizationCode) {
        List<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_STUDENT"),
                new SimpleGrantedAuthority("SCOPE_student:read"),
                new SimpleGrantedAuthority("SCOPE_student:consent")
        );
        return new CollegeBUserPrincipal(studentId, email, organizationCode, studentId, authorities);
    }

    public String getAdminId() { return adminId; }
    public String getEmail() { return email; }
    public String getOrganizationCode() { return organizationCode; }
    public String getOrgId() { return organizationCode; }
    public String getStudentId() { return studentId; }
    public String getRole() {
        if (authorities != null) {
            for (GrantedAuthority ga : authorities) {
                if (ga.getAuthority().startsWith("ROLE_")) {
                    return ga.getAuthority().substring(5);
                }
            }
        }
        return studentId != null ? "STUDENT" : "ORG_ADMIN";
    }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public String getPassword() { return null; }
    @Override public String getUsername() { return email; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}
