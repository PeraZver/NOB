-- battles.sql - SQL script to create and seed the battles table
-- Part of the NOB web project
-- Created: 11/2025

USE nob;

-- Create the 'battles' table only if it does not already exist
CREATE TABLE IF NOT EXISTS battles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    place VARCHAR(255) NOT NULL,
    location POINT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    wikipedia_url VARCHAR(2083)
);

-- Insert data for 'Kninska operacija'
INSERT INTO battles (name, place, location, start_date, end_date, description, wikipedia_url)
VALUES (
    'Knin operation',
    'Knin, Croatia',
    ST_GeomFromText('POINT(16.1973 44.0411)'), -- Note: Longitude comes first in MySQL
    '1944-11-25', -- Start date of the battle
    '1944-12-05', -- End date of the battle
    'knin-1944.md',
    'https://en.wikipedia.org/wiki/Battle_of_Knin'
);
