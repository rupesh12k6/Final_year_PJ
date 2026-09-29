package com.depa.provider.security;

import com.depa.provider.entity.CollegeAAdmin;
import com.depa.provider.repository.CollegeAAdminRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
public class CollegeAJwtFilter extends OncePerRequestFilter {

    private final CollegeAJwtUtil jwtUtil;
    private final CollegeAAdminRepository adminRepository;

    public CollegeAJwtFilter(CollegeAJwtUtil jwtUtil, CollegeAAdminRepository adminRepository) {
        this.jwtUtil = jwtUtil;
        this.adminRepository = adminRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = parseBearerToken(request);

        if (StringUtils.hasText(token) && jwtUtil.isTokenValid(token)) {
            try {
                Claims claims = jwtUtil.extractAllClaims(token);
                String adminId = claims.getSubject();
                String email = claims.get("email", String.class);
                String orgCode = claims.get("orgId", String.class);
                String role = claims.get("role", String.class);
                List<String> scopes = claims.get("scope", List.class);

                // Verify admin exists and is ACTIVE
                Optional<CollegeAAdmin> adminOpt = adminRepository.findById(adminId);
                if (adminOpt.isPresent() && "ACTIVE".equalsIgnoreCase(adminOpt.get().getStatus())) {
                    CollegeAUserPrincipal principal = new CollegeAUserPrincipal(
                            adminId,
                            email,
                            orgCode,
                            role,
                            scopes
                    );

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (Exception ignored) {
                // If token fails parsing/validation, security context remains unauthenticated
            }
        }

        filterChain.doFilter(request, response);
    }

    private String parseBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7).trim();
        }
        return null;
    }
}
