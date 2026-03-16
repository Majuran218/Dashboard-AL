
-- database/schema.sql

CREATE DATABASE IF NOT EXISTS advanced_education_db;

-- Switch to the database (run this separately or ensure you're using the correct database)
-- USE advanced_education_db;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    stream_id INT,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active TINYINT(1) DEFAULT 1,
    profile_picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Streams table
CREATE TABLE streams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stream_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects table
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_name VARCHAR(100) NOT NULL,
    stream_id INT,
    subject_code VARCHAR(20) UNIQUE,
    description TEXT,
    FOREIGN KEY (stream_id) REFERENCES streams(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Past papers table
CREATE TABLE past_papers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT,
    year INT NOT NULL,
    paper_type ENUM('Theory', 'Practical', 'MCQ') DEFAULT 'Theory',
    file_path VARCHAR(255),
    file_size INT,
    downloads_count INT DEFAULT 0,
    uploaded_by INT,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MCQ questions table
CREATE TABLE mcq_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT,
    topic VARCHAR(100),
    question_text TEXT NOT NULL,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_option CHAR(1),
    explanation TEXT,
    difficulty_level ENUM('Easy', 'Medium', 'Hard') DEFAULT 'Medium',
    year INT,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Videos table
CREATE TABLE videos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    video_url VARCHAR(255),
    duration INT,
    thumbnail_url VARCHAR(255),
    views_count INT DEFAULT 0,
    uploaded_by INT,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notes table
CREATE TABLE notes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_path VARCHAR(255),
    file_size INT,
    downloads_count INT DEFAULT 0,
    important_points TEXT,
    uploaded_by INT,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Study planner table
CREATE TABLE study_planner (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    subject_id INT,
    study_date DATE,
    start_time TIME,
    end_time TIME,
    topic VARCHAR(200),
    completed TINYINT(1) DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User progress table
CREATE TABLE user_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    subject_id INT,
    mcq_id INT,
    is_correct TINYINT(1),
    time_taken INT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (mcq_id) REFERENCES mcq_questions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert streams
INSERT INTO streams (stream_name, description) VALUES
('Mathematics', 'Pure Mathematics, Applied Mathematics, Statistics'),
('BIO', 'Biology, Chemistry, Physics'),
('Arts', 'History, Geography, Political Science, Arts'),
('Commerce', 'Accounting, Economics, Business Studies'),
('BIO technology', 'Biotechnology, Biochemistry, Microbiology'),
('Engineering Technology', 'Engineering Technology, Science for Technology');

-- Indexes for performance
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_papers_subject_year ON past_papers(subject_id, year);
CREATE INDEX idx_mcq_subject ON mcq_questions(subject_id);
CREATE INDEX idx_videos_subject ON videos(subject_id);
CREATE INDEX idx_notes_subject ON notes(subject_id);