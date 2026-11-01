package com.depa.consumer.service;

import com.depa.consumer.dto.AuthResponse;
import com.depa.consumer.dto.LoginRequest;
import com.depa.consumer.entity.CollegeBAdmin;
import com.depa.consumer.repository.CollegeBAdminRepository;
import com.depa.consumer.security.CollegeBJwtUtil;
import com.depa.consumer.entity.Student;
import com.depa.consumer.entity.StudentStatus;
import com.depa.consumer.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CollegeBAuthService {

    private final CollegeBAdminRepository adminRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final CollegeBJwtUtil jwtUtil;
    private final String collegeCode;

    public CollegeBAuthService(CollegeBAdminRepository adminRepository,
                               StudentRepository studentRepository,
                               PasswordEncoder passwordEncoder,
                               CollegeBJwtUtil jwtUtil,
                               @Value("${app.college.code:COLLEGE_B}") String collegeCode) {
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
        Optional<CollegeBAdmin> adminOpt = adminRepository.findByEmail(emailLower);
        if (adminOpt.isPresent()) {
            CollegeBAdmin admin = adminOpt.get();
            if (!passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
                throw new BadCredentialsException("Invalid credentials");
            }
            if (!"ACTIVE".equalsIgnoreCase(admin.getStatus())) {
                throw new BadCredentialsException("Account is " + admin.getStatus().toLowerCase());
            }

            String token = jwtUtil.generateToken(
                    admin.getAdminId(),
                    admin.getEmail(),
                    admin.getRole(),
                    admin.getScopes(),
                    admin.getOrganizationCode()
            );

            return new AuthResponse(
                    token,
                    admin.getAdminId(),
                    admin.getName(),
                    admin.getEmail(),
                    admin.getRole(),
                    admin.getOrganizationCode(),
                    null
            );
        }

        // 2. Check if identifier is a Student (by email or studentId)
        Optional<Student> studentOpt = studentRepository.findByEmail(emailLower);
        if (studentOpt.isEmpty()) {
            studentOpt = studentRepository.findByStudentId(identifier);
        }

        if (studentOpt.isPresent()) {
            Student student = studentOpt.get();

            if (student.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), student.getPasswordHash())) {
                throw new BadCredentialsException("Invalid credentials");
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
                    student.getStudentId(),
                    student.getName(),
                    student.getEmail(),
                    "STUDENT",
                    collegeCode,
                    student.getStudentId()
            );
        }

        throw new BadCredentialsException("Invalid credentials");
    }
}
