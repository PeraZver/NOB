/**
 * updateDivisionIds.js - Updates the ID of each division in the database based on the number at the start of its name.
 * If the division name starts with a number, that number becomes the new ID.
 * Rows where the ID already matches the number in the name are skipped.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Load .env file

// Database connection configuration from .env
const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function updateDivisionIds() {
    let connection;

    try {
        // Connect to the database
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('Connected to the database.');

        // Fetch all divisions
        const [divisions] = await connection.execute('SELECT id, name FROM divisions');

        for (const division of divisions) {
            const match = division.name.match(/\d+/); // Extract the first number from the name
            if (match) {
                const newId = parseInt(match[0], 10);

                // Update the division ID
                const updateQuery = 'UPDATE divisions SET id = ? WHERE id = ?';
                await connection.execute(updateQuery, [newId, division.id]);

                console.log(`Updated division '${division.name}' with new ID ${newId}`);
            } else {
                console.warn(`No number found in division name '${division.name}'`);
            }
        }
    } catch (error) {
        console.error('Error updating division IDs:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

updateDivisionIds();