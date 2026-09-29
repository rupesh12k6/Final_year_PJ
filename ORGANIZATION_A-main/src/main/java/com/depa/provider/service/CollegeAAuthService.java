package com.depa.provider.service;

import com.depa.provider.dto.AuthResponse;
import com.depa.provider.dto.LoginRequest;
import com.depa.provider.entity.CollegeAAdmin;
import com.depa.provider.repository.CollegeAAdminRepository;
import com.depa.provider.security.CollegeAJwtUtil;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CollegeAAuthService {

    private final CollegeAAdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final CollegeAJwtUtil jwtUtil;

    public CollegeAAuthService(CollegeAAdminRepository adminRepository,
                               PasswordEncoder passwordEncoder,
                               CollegeAJwtUtil jwtUtil) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        CollegeAAdmin admin = adminRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        if (!"ACTIVE".equalsIgnoreCase(admin.getStatus())) {
            throw new BadCredentialsException("Account is " + admin.getStatus().toLowerCase());
        }

        String token = jwtUtil.generateToken(
                admin.getId(),
                admin.getEmail(),
                admin.getOrganizationCode(),
                admin.getRole(),
                admin.getScope()
        );

        return new AuthResponse(token, admin.getEmail(), admin.getRole(), admin.getOrganizationCode());
    }
}
