package com.depa.consumer.security;

import com.depa.consumer.entity.CollegeBAdmin;
import com.depa.consumer.entity.Student;
import com.depa.consumer.entity.StudentStatus;
import com.depa.consumer.repository.CollegeBAdminRepository;
import com.depa.consumer.repository.StudentRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
public class CollegeBJwtFilter extends OncePerRequestFilter {

    private final CollegeBJwtUtil jwtUtil;
    private final CollegeBAdminRepository adminRepository;
    private final StudentRepository studentRepository;
    private final InternalApiKeyValidator apiKeyValidator;

    public CollegeBJwtFilter(CollegeBJwtUtil jwtUtil, CollegeBAdminRepository adminRepository, StudentRepository studentRepository, InternalApiKeyValidator apiKeyValidator) {
        this.jwtUtil = jwtUtil;
        this.adminRepository = adminRepository;
        this.studentRepository = studentRepository;
        this.apiKeyValidator = apiKeyValidator;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        String apiKeyHeader = request.getHeader("X-API-KEY");

        if (apiKeyHeader != null && apiKeyValidator.isValid(apiKeyHeader)) {
            CollegeBUserPrincipal servicePrincipal = CollegeBUserPrincipal.create("internal-service", "service@depa.internal", "COLLEGE_B", "ORG_ADMIN");
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(servicePrincipal, null, servicePrincipal.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } else if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            try {
                if (jwtUtil.isTokenValid(token)) {
                    Claims claims = jwtUtil.validateAndExtractClaims(token);
                    String subject = claims.getSubject();
                    String email = claims.get("email", String.class);
                    String role = claims.get("role", String.class);
                    String orgCode = claims.get("organization_code", String.class);

                    if ("STUDENT".equalsIgnoreCase(role)) {
                        String studentId = claims.get("studentId", String.class);
                        if (studentId == null) {
                            studentId = subject;
                        }
                        Optional<Student> studentOpt = studentRepository.findByStudentId(studentId);
                        if (studentOpt.isEmpty() && email != null) {
                            studentOpt = studentRepository.findByEmail(email);
                        }
                        if (studentOpt.isPresent() && studentOpt.get().getStatus() == StudentStatus.ACTIVE) {
                            Student student = studentOpt.get();
                            CollegeBUserPrincipal principal = CollegeBUserPrincipal.createForStudent(
                                    student.getStudentId(),
                                    student.getEmail(),
                                    orgCode != null ? orgCode : "COLLEGE_B"
                            );
                            UsernamePasswordAuthenticationToken authentication =
                                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                            SecurityContextHolder.getContext().setAuthentication(authentication);
                        }
                    } else {
                        Optional<CollegeBAdmin> adminOpt = adminRepository.findByAdminId(subject);
                        if (adminOpt.isEmpty() && email != null) {
                            adminOpt = adminRepository.findByEmail(email);
                        }
                        if (adminOpt.isPresent() && "ACTIVE".equalsIgnoreCase(adminOpt.get().getStatus())) {
                            CollegeBUserPrincipal principal = CollegeBUserPrincipal.create(subject, email, orgCode, role != null ? role : "ORG_ADMIN");
                            UsernamePasswordAuthenticationToken authentication =
                                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                            SecurityContextHolder.getContext().setAuthentication(authentication);
                        }
                    }
                }
            } catch (Exception e) {
                // Token invalid or expired; proceed unauthenticated
            }
        }

        filterChain.doFilter(request, response);
    }
}
