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

// Path to the JSON file
const JSON_FILE_PATH = path.join(__dirname, '../public/assets/dalmatia-odredi.json');

async function updateDetachmentsTable() {
    let connection;

    try {
        // Connect to the database
        connection = await mysql.createConnection(DB_CONFIG);

        // Load JSON data
        const jsonData = fs.readFileSync(JSON_FILE_PATH, 'utf8');
        const data = JSON.parse(jsonData);

        // Iterate through the features in the JSON file
        for (const feature of data.features) {
            const properties = feature.properties;
            const detachmentName = properties.naziv;
            const formationSite = properties.mesto_formiranja;

            // Update the formation_site column in the detachments table
            const updateQuery = `
                UPDATE detachments
                SET formation_site = ?
                WHERE name = ?
            `;
            const [result] = await connection.execute(updateQuery, [formationSite, detachmentName]);

            if (result.affectedRows > 0) {
                console.log(`Updated detachment '${detachmentName}' with formation site '${formationSite}'`);
            } else {
                console.warn(`No detachment found with name '${detachmentName}'`);
            }
        }
    } catch (error) {
        console.error('Error updating detachments table:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

updateDetachmentsTable();
