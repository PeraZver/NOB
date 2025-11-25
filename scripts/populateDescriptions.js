/**
 * populateDescriptions.js - This file is part of the NOB web project.
 * 
 * Database population script. Updates military unit description fields
 * with references to markdown files for detailed information.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Updated .env path

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Base directory for Markdown files
const baseDir = path.join(__dirname, '../public', 'assets'); // Updated assets folder path

// Map of directories to database tables
const tableMap = {
    brigades: 'brigades',
    detachments: 'detachments',
    divisions: 'divisions',
    corps: 'corps'
};

// Function to populate the database
async function populateDescriptions() {
    try {
        for (const [folder, table] of Object.entries(tableMap)) {
            const folderPath = path.join(baseDir, folder);

            // Check if the folder exists
            if (!fs.existsSync(folderPath)) {
                console.warn(`Folder not found: ${folderPath}`);
                continue;
            }

            // Read all Markdown files in the folder
            const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.md'));

            for (const file of files) {
                const id = path.basename(file, '.md'); // Extract the ID from the filename
                const filePath = `${file}`; // Relative file path

                // Update the database
                const query = `UPDATE ${table} SET description = ? WHERE id = ?`;
                const [result] = await pool.query(query, [filePath, id]);

                if (result.affectedRows > 0) {
                    console.log(`Updated ${table} (ID: ${id}) with file: ${filePath}`);
                } else {
                    console.warn(`No entry found in ${table} for ID: ${id}`);
                }
            }
        }
    } catch (error) {
        console.error('Error populating descriptions:', error);
    } finally {
        await pool.end();
    }
}

// Run the script
populateDescriptions();
