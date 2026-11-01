package com.depa.consumer.config;

import com.depa.consumer.entity.CollegeBAdmin;
import com.depa.consumer.entity.Student;
import com.depa.consumer.entity.StudentStatus;
import com.depa.consumer.repository.CollegeBAdminRepository;
import com.depa.consumer.repository.StudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CollegeBDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CollegeBDataSeeder.class);

    private final StudentRepository studentRepository;
    private final CollegeBAdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    public CollegeBDataSeeder(StudentRepository studentRepository,
                              CollegeBAdminRepository adminRepository,
                              PasswordEncoder passwordEncoder) {
        this.studentRepository = studentRepository;
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // 1. Seed Sample College B Students
        if (studentRepository.count() == 0) {
            List<Student> sampleStudents = List.of(
                    new Student("S2001", "Bob Roberts", "bob.roberts@collegeb.edu", StudentStatus.ACTIVE,
                            "Valid - B.Tech AI & Data Science", "Artificial Intelligence & Data Science", "9.12",
                            "Bachelor of Technology in Artificial Intelligence & Data Science"),
                    new Student("S2002", "Carol White", "carol.white@collegeb.edu", StudentStatus.ACTIVE,
                            "Valid - B.Tech Cyber Security", "Cyber Security", "8.75",
                            "Bachelor of Technology in Cyber Security"),
                    new Student("S2003", "David Miller", "david.miller@collegeb.edu", StudentStatus.ACTIVE,
                            "Valid - B.Tech Robotics", "Robotics & Automation", "9.40",
                            "Bachelor of Technology in Robotics"),
                    new Student("S2004", "Emma Davis", "emma.davis@collegeb.edu", StudentStatus.ACTIVE,
                            "Valid - B.Tech Cloud Computing", "Cloud Computing", "8.90",
                            "Bachelor of Technology in Cloud Computing"),
                    new Student("S2005", "Frank Wilson", "frank.wilson@collegeb.edu", StudentStatus.ACTIVE,
                            "Valid - B.Tech Information Science", "Information Science", "9.30",
                            "Bachelor of Technology in Information Science")
            );

            studentRepository.saveAll(sampleStudents);
            log.info("Initialized College B student database with {} students.", sampleStudents.size());
        }

        // Cross-institutional Student Alice Johnson registered in College B
        studentRepository.findByStudentId("STU-2023-001").ifPresentOrElse(
                stu -> {
                    if (stu.getPasswordHash() == null) {
                        stu.setPasswordHash(passwordEncoder.encode("StudentPassword123"));
                        studentRepository.save(stu);
                        log.info("Updated password hash for principal student Alice Johnson in College B.");
                    }
                },
                () -> {
                    Student alice = new Student("STU-2023-001", "Alice Johnson", "alice.johnson@collegeb.edu", StudentStatus.ACTIVE,
                            "Cross-Institutional Exchange Program", "Computer Science & Engineering", "9.20",
                            "Bachelor of Technology (Honors)", passwordEncoder.encode("StudentPassword123"));
                    studentRepository.save(alice);
                    log.info("Initialized cross-institutional student Alice Johnson (STU-2023-001) in College B.");
                }
        );

        // 2. Seed Default College B Org Admin
        if (adminRepository.count() == 0) {
            CollegeBAdmin dean = new CollegeBAdmin(
                    "COLLEGE_B_ADM_001",
                    "Dean College B",
                    "dean@collegeb.edu",
                    passwordEncoder.encode("OrgAdmin@123"),
                    "COLLEGE_B",
                    "ORG_ADMIN",
                    "onboarding:read",
                    "ACTIVE"
            );
            adminRepository.save(dean);
            log.info("Initialized College B default administrator: dean@collegeb.edu");
        }
    }
}
