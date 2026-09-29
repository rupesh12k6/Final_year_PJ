package com.depa.provider.config;

import com.depa.provider.entity.CollegeAAdmin;
import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;
import com.depa.provider.repository.CollegeAAdminRepository;
import com.depa.provider.repository.StudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CollegeADataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CollegeADataSeeder.class);

    private final StudentRepository studentRepository;
    private final CollegeAAdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    public CollegeADataSeeder(StudentRepository studentRepository,
                              CollegeAAdminRepository adminRepository,
                              PasswordEncoder passwordEncoder) {
        this.studentRepository = studentRepository;
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // 1. Seed Sample Students
        if (studentRepository.count() == 0) {
            List<Student> sampleStudents = List.of(
                    new Student("S1001", "Ashok Mugada", "student1001@example.com", StudentStatus.ACTIVE),
                    new Student("S1002", "Rahul Kumar", "student1002@example.com", StudentStatus.ACTIVE),
                    new Student("S1003", "Priya Sharma", "student1003@example.com", StudentStatus.ACTIVE),
                    new Student("S1004", "Sneha Patel", "student1004@example.com", StudentStatus.ACTIVE),
                    new Student("S1005", "Vikram Singh", "student1005@example.com", StudentStatus.ACTIVE)
            );

            studentRepository.saveAll(sampleStudents);
            log.info("Initialized College A student database with {} sample students.", sampleStudents.size());
        }

        // 2. Seed Default College A Org Admin
        if (adminRepository.count() == 0) {
            CollegeAAdmin dean = new CollegeAAdmin(
                    "COLLEGE_A_ADM_001",
                    "Dean College A",
                    "dean@collegea.edu",
                    passwordEncoder.encode("OrgAdmin@123"),
                    "COLLEGE_A",
                    "ORG_ADMIN",
                    "onboarding:read",
                    "ACTIVE"
            );
            adminRepository.save(dean);
            log.info("Initialized College A default admin: dean@collegea.edu");
        }
    }
}
