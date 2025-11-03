const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise'); // Use promise-based mysql2
require('dotenv').config();

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

// Path to the JSON file
const filePath = path.join(__dirname, 'public', 'assets', 'dalmatia-brigades.json');

// Helper function to convert date to 'YYYY-MM-DD' format
function formatDate(dateString) {
    if (!dateString) return null; // Return null for empty dates
    const date = new Date(dateString);
    if (isNaN(date)) {
        console.warn(`Invalid date format: ${dateString}`);
        return null; // Skip invalid dates
    }
    return date.toISOString().split('T')[0]; // Extract 'YYYY-MM-DD'
}

// Function to import data
async function importData() {
    try {
        // Truncate the brigades table
        console.log('Truncating brigades table...');
        await pool.query('TRUNCATE TABLE brigades');
        console.log('Brigades table truncated.');

        // Read and parse the JSON file
        const data = fs.readFileSync(filePath, 'utf8');
        const brigades = JSON.parse(data).features;

        // Prepare the SQL query
        const query = `
            INSERT INTO brigades (name, formation_date, description, location, wikipedia_url)
            VALUES (?, ?, ?, ST_GeomFromText(?), ?)
        `;

        // Insert each brigade into the database
        for (const brigade of brigades) {
            const name = brigade.properties.naziv;
            const formationDate = formatDate(brigade.properties.datum_formiranja); // Format the date
            const description = brigade.properties.opis || '';
            const location = `POINT(${brigade.geometry.coordinates[0]} ${brigade.geometry.coordinates[1]})`;
            const wikipediaUrl = brigade.properties.wikipedia || null;

            await pool.query(query, [name, formationDate, description, location, wikipediaUrl]);
            console.log(`Inserted brigade: ${name}`);
        }

        console.log('Data import complete.');
    } catch (error) {
        console.error('Error importing data:', error);
    } finally {
        // Close the pool
        await pool.end();
    }
}

// Run the import
importData();
