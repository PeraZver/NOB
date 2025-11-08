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

CREATE TABLE movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit_id INT NOT NULL, -- Foreign key to the unit (brigade, detachment, etc.)
    unit_type ENUM('brigade', 'detachment', 'division', 'corps') NOT NULL, -- Type of unit
    operation_name VARCHAR(255), -- Name of the operation
    start_time DATETIME NOT NULL, -- Start time of the movement
    end_time DATETIME NOT NULL, -- End time of the movement
    path LINESTRING NOT NULL, -- Path as a LINESTRING (geospatial data)
    FOREIGN KEY (unit_id) REFERENCES brigades(id) -- Example for brigades
);