CREATE DATABASE nob;
USE nob;

CREATE TABLE brigades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    formation_date DATE,
    description TEXT,
    location POINT,
    wikipedia_url VARCHAR(500),
    description_file VARCHAR(255)
);

CREATE TABLE detachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    formation_date DATE,
    description TEXT,
    location POINT,
    wikipedia_url VARCHAR(500),
    description_file VARCHAR(255)
);

CREATE TABLE divisions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    formation_date DATE,
    description TEXT,
    location POINT,
    wikipedia_url VARCHAR(500),
    description_file VARCHAR(255)
);

CREATE TABLE corps ( 
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    formation_date DATE,
    description TEXT,
    location POINT,
    wikipedia_url VARCHAR(500),
    description_file VARCHAR(255)
);