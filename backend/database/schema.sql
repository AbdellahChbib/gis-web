-- Création de l'énumération pour les rôles
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');

-- Table des utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les informations spécifiques aux étudiants
CREATE TABLE student_details (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    student_id VARCHAR(50) UNIQUE NOT NULL,
    promotion VARCHAR(50),
    department VARCHAR(100)
);

-- Table pour les informations spécifiques aux enseignants
CREATE TABLE teacher_details (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    department VARCHAR(100),
    specialization VARCHAR(100)
); 