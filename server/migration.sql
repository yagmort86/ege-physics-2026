-- Supabase/PostgreSQL Migration Script
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    surname VARCHAR(50) NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    role VARCHAR(20) DEFAULT 'student',
    is_approved BOOLEAN DEFAULT FALSE
);

CREATE TABLE subjects (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100) NOT NULL
);

CREATE TABLE progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    subject_id VARCHAR(50) REFERENCES subjects(id),
    task_id VARCHAR(50) NOT NULL,
    answer VARCHAR(255),
    is_correct BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO subjects (id, title) VALUES ('physics', 'Физика');
