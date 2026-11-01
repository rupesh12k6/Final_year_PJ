package com.depa.consumer.repository;

import com.depa.consumer.entity.Student;
import com.depa.consumer.entity.StudentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByStudentId(String studentId);
    Optional<Student> findByEmail(String email);
    Optional<Student> findByActivationTokenHash(String activationTokenHash);
    List<Student> findByStatus(StudentStatus status);
    boolean existsByStudentId(String studentId);
}
