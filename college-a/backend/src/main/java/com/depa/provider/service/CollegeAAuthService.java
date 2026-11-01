package com.depa.provider.service;

import com.depa.provider.dto.AuthResponse;
import com.depa.provider.dto.LoginRequest;
import com.depa.provider.entity.CollegeAAdmin;
import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;
import com.depa.provider.repository.CollegeAAdminRepository;
import com.depa.provider.repository.StudentRepository;
import com.depa.provider.security.CollegeAJwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class CollegeAAuthService {

    private final CollegeAAdminRepository adminRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final CollegeAJwtUtil jwtUtil;
    private final String collegeCode;

    public CollegeAAuthService(CollegeAAdminRepository adminRepository,
                               StudentRepository studentRepository,
                               PasswordEncoder passwordEncoder,
                               CollegeAJwtUtil jwtUtil,
                               @Value("${app.college.code:COLLEGE_A}") String collegeCode) {
        this.adminRepository = adminRepository;
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.collegeCode = collegeCode;
    }

    public AuthResponse login(LoginRequest request) {
        String identifier = request.getEmail().trim();
        String emailLower = identifier.toLowerCase();

        // 1. Check if identifier is an Admin
        Optional<CollegeAAdmin> adminOpt = adminRepository.findByEmail(emailLower);
        if (adminOpt.isPresent()) {
            CollegeAAdmin admin = adminOpt.get();
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

            return new AuthResponse(token, admin.getEmail(), admin.getRole(), admin.getOrganizationCode(), null, admin.getName());
        }

        // 2. Check if identifier is a Student (by email or studentId)
        Optional<Student> studentOpt = studentRepository.findByEmail(emailLower);
        if (studentOpt.isEmpty()) {
            studentOpt = studentRepository.findByStudentId(identifier);
        }

        if (studentOpt.isPresent()) {
            Student student = studentOpt.get();

            if (student.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), student.getPasswordHash())) {
                throw new BadCredentialsException("Invalid email or password");
            }

            if (student.getStatus() == StudentStatus.PENDING_ACTIVATION) {
                throw new BadCredentialsException("Account is pending activation. Please complete password setup.");
            }
            if (student.getStatus() != StudentStatus.ACTIVE) {
                throw new BadCredentialsException("Account is " + student.getStatus().name().toLowerCase());
            }

            String token = jwtUtil.generateStudentToken(
                    student.getStudentId(),
                    student.getEmail(),
                    collegeCode,
                    student.getName()
            );

            return new AuthResponse(
                    token,
                    student.getEmail(),
                    "STUDENT",
                    collegeCode,
                    student.getStudentId(),
                    student.getName()
            );
        }

        throw new BadCredentialsException("Invalid email or password");
    }
}
