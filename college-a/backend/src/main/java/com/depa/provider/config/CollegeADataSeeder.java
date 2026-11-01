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

    @org.springframework.beans.factory.annotation.Value("${app.college.code:COLLEGE_A}")
    private String collegeCode;

    @org.springframework.beans.factory.annotation.Value("${app.college.name:College University}")
    private String collegeName;

    public CollegeADataSeeder(StudentRepository studentRepository,
                              CollegeAAdminRepository adminRepository,
                              PasswordEncoder passwordEncoder) {
        this.studentRepository = studentRepository;
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        boolean isCollegeB = "COLLEGE_B".equalsIgnoreCase(collegeCode);

        // 1. Seed Sample Students
        if (studentRepository.count() == 0) {
            List<Student> sampleStudents;
            if (isCollegeB) {
                sampleStudents = List.of(
                        new Student("S2001", "Bob Roberts", "student2001@collegeb.edu", StudentStatus.ACTIVE, "Certified B.Tech Degree"),
                        new Student("S2002", "Carol White", "student2002@collegeb.edu", StudentStatus.ACTIVE, "Certified Transcript"),
                        new Student("S2003", "David Miller", "student2003@collegeb.edu", StudentStatus.ACTIVE, "Course Completion Cert"),
                        new Student("S2004", "Emma Davis", "student2004@collegeb.edu", StudentStatus.ACTIVE, "Dean Honors List"),
                        new Student("S2005", "Frank Wilson", "student2005@collegeb.edu", StudentStatus.ACTIVE, "Merit Scholar")
                );
            } else {
                sampleStudents = List.of(
                        new Student("S1001", "Ashok Mugada", "student1001@example.com", StudentStatus.ACTIVE, "Certified B.Tech Degree"),
                        new Student("S1002", "Rahul Kumar", "student1002@example.com", StudentStatus.ACTIVE, "Certified Transcript"),
                        new Student("S1003", "Priya Sharma", "student1003@example.com", StudentStatus.ACTIVE, "Merit Scholar"),
                        new Student("S1004", "Sneha Patel", "student1004@example.com", StudentStatus.ACTIVE, "Course Completion Cert"),
                        new Student("S1005", "Vikram Singh", "student1005@example.com", StudentStatus.ACTIVE, "Dean Honors List")
                );
            }

            studentRepository.saveAll(sampleStudents);
            log.info("Initialized {} student database with {} sample students.", collegeName, sampleStudents.size());
        }

        studentRepository.findByStudentId("STU-2023-001").ifPresentOrElse(
                stu -> {
                    if (stu.getPasswordHash() == null) {
                        stu.setPasswordHash(passwordEncoder.encode("StudentPassword123"));
                        studentRepository.save(stu);
                        log.info("Updated password hash for principal student Alice Johnson (STU-2023-001).");
                    }
                },
                () -> {
                    Student alice = new Student(
                            "STU-2023-001",
                            "Alice Johnson",
                            isCollegeB ? "alice@collegeb.edu" : "student1@collegea.edu",
                            StudentStatus.ACTIVE,
                            "Valid - B.Tech CSE (CGPA 9.2)",
                            "B.Tech Computer Science",
                            "8.84 / 10.0",
                            "Sem 1: 8.7 SGPA | Sem 2: 8.9 SGPA | Sem 3: 9.1 SGPA | Sem 4: 8.8 SGPA",
                            "Bachelor of Technology in Computer Science & Engineering (Verified Official)",
                            passwordEncoder.encode("StudentPassword123")
                    );
                    studentRepository.save(alice);
                    log.info("Initialized principal student Alice Johnson (STU-2023-001) in {}.", collegeName);
                }
        );

        // 2. Seed Default Org Admin
        if (adminRepository.count() == 0) {
            String adminId = isCollegeB ? "COLLEGE_B_ADM_001" : "COLLEGE_A_ADM_001";
            String adminName = isCollegeB ? "Dean College B" : "Dean College A";
            String adminEmail = isCollegeB ? "dean@collegeb.edu" : "dean@collegea.edu";

            CollegeAAdmin dean = new CollegeAAdmin(
                    adminId,
                    adminName,
                    adminEmail,
                    passwordEncoder.encode("OrgAdmin@123"),
                    collegeCode.toUpperCase(),
                    "ORG_ADMIN",
                    "onboarding:read",
                    "ACTIVE"
            );
            adminRepository.save(dean);
            log.info("Initialized {} default admin: {}", collegeName, adminEmail);
        }
    }
}
