package com.depa.provider.security;

import com.depa.provider.entity.CollegeAAdmin;
import com.depa.provider.repository.CollegeAAdminRepository;
import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;
import com.depa.provider.repository.StudentRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(CollegeAJwtFilter.class);

    private final CollegeAJwtUtil jwtUtil;
    private final CollegeAAdminRepository adminRepository;
    private final StudentRepository studentRepository;

    public CollegeAJwtFilter(CollegeAJwtUtil jwtUtil, CollegeAAdminRepository adminRepository, StudentRepository studentRepository) {
        this.jwtUtil = jwtUtil;
        this.adminRepository = adminRepository;
        this.studentRepository = studentRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = parseBearerToken(request);

        if (StringUtils.hasText(token) && jwtUtil.isTokenValid(token)) {
            try {
                Claims claims = jwtUtil.extractAllClaims(token);
                String subjectId = claims.getSubject();
                String email = claims.get("email", String.class);
                String orgCode = claims.get("orgId", String.class);
                String role = claims.get("role", String.class);
                List<String> scopes = claims.get("scope", List.class);

                if ("STUDENT".equalsIgnoreCase(role)) {
                    String studentId = claims.get("studentId", String.class);
                    if (studentId == null) {
                        studentId = subjectId;
                    }
                    Optional<Student> studentOpt = studentRepository.findByStudentId(studentId);
                    if (studentOpt.isEmpty() && email != null) {
                        studentOpt = studentRepository.findByEmail(email);
                    }
                    if (studentOpt.isPresent() && studentOpt.get().getStatus() == StudentStatus.ACTIVE) {
                        Student student = studentOpt.get();
                        CollegeAUserPrincipal principal = new CollegeAUserPrincipal(
                                student.getId().toString(),
                                student.getEmail(),
                                orgCode != null ? orgCode : "COLLEGE_A",
                                "STUDENT",
                                scopes != null ? scopes : List.of("student:read", "student:consent"),
                                student.getStudentId()
                        );

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                } else {
                    // Verify admin exists and is ACTIVE
                    Optional<CollegeAAdmin> adminOpt = adminRepository.findById(subjectId);
                    if (adminOpt.isEmpty() && email != null) {
                        adminOpt = adminRepository.findByEmail(email);
                    }
                    if (adminOpt.isPresent() && "ACTIVE".equalsIgnoreCase(adminOpt.get().getStatus())) {
                        CollegeAUserPrincipal principal = new CollegeAUserPrincipal(
                                adminOpt.get().getId(),
                                email,
                                orgCode,
                                role != null ? role : "ORG_ADMIN",
                                scopes
                        );

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                }
            } catch (Exception e) {
                log.warn("JWT authentication failed: {}", e.getMessage());
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
