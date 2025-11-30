-- battles.sql - SQL script to create and seed the battles table
-- Part of the NOB web project
-- Created: 11/2025

USE nob;

CREATE TABLE battles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    place VARCHAR(255),
    location POINT,
    start_date DATE,
    end_date DATE,
    description VARCHAR(255),
    wikipedia_url VARCHAR(500)
);

-- Seed data for Battle of Split 1943
-- Location: Klis village near Split (43.5667, 16.5167)
INSERT INTO battles (id, name, place, location, start_date, end_date, description)
VALUES (
    1,
    'Battle of Split 1943',
    'outskirts of Split',
    ST_GeomFromText('POINT(16.5167 43.5667)'),
    '1943-09-11',
    '1943-10-02',
    '1.md'
);
