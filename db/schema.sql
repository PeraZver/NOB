CREATE DATABASE nob;
USE nob;

CREATE TABLE brigades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    formation_date DATE,
    description TEXT,
    location POINT,
    wikipedia_url VARCHAR(500) -- Increased length to 500
);

CREATE TABLE detachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    formation_date DATE,
    description TEXT,
    location POINT,
    wikipedia_url VARCHAR(500)
);

CREATE TABLE divisions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    formation_date DATE,
    description TEXT,
    location POINT,
    wikipedia_url VARCHAR(500)
);

CREATE TABLE corpuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    formation_date DATE,
    description TEXT,
    location POINT,
    wikipedia_url VARCHAR(500)
);