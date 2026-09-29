package com.depa.provider.service;

import com.depa.provider.dto.StudentResponse;
import com.depa.provider.entity.Student;
import com.depa.provider.entity.StudentStatus;
import com.depa.provider.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class StudentService {

    private final StudentRepository studentRepository;

    public StudentService(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> getAllStudents() {
        return studentRepository.findAll()
                .stream()
                .map(StudentResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Student> getActiveStudents() {
        return studentRepository.findByStatus(StudentStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public Student getStudentByStudentId(String studentId) {
        return studentRepository.findByStudentId(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found with ID: " + studentId));
    }
}
