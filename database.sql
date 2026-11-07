CREATE DATABASE IF NOT EXISTS school_fee_db;
USE school_fee_db;

CREATE TABLE IF NOT EXISTS Students (
  student_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  class VARCHAR(30) NOT NULL,
  roll_no VARCHAR(30) NOT NULL,
  phone VARCHAR(15),
  email VARCHAR(100),
  UNIQUE KEY unique_roll_class (class, roll_no)
);

CREATE TABLE IF NOT EXISTS Fee_Details (
  fee_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  fee_type VARCHAR(50) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  CONSTRAINT fk_fee_student FOREIGN KEY (student_id)
    REFERENCES Students(student_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  fee_id INT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  receipt_no VARCHAR(50) NOT NULL UNIQUE,
  payment_status VARCHAR(20) DEFAULT 'Paid',
  CONSTRAINT fk_payment_fee FOREIGN KEY (fee_id)
    REFERENCES Fee_Details(fee_id) ON DELETE CASCADE
);

-- Optional sample student:
-- INSERT INTO Students(name, class, roll_no, phone, email)
-- VALUES ('Aarav Kumar', '10-A', '101', '9876543210', 'aarav@example.com');
