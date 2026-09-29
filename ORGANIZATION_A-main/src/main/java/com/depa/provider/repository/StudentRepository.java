package com.depa.provider.repository;

import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByStudentId(String studentId);
    List<Student> findByStatus(StudentStatus status);
    boolean existsByStudentId(String studentId);
}
