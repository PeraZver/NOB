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

// Helper function to format dates
function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date)) return null;
    return date.toISOString().split('T')[0];
}

// Function to import data into a table
async function importData(jsonFile, tableName) {
    try {
        const filePath = path.join(__dirname, '../public', 'assets', jsonFile); // Updated assets folder path
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8')).features;

        const query = `
            INSERT INTO ${tableName} (name, formation_date, description, location, wikipedia_url)
            VALUES (?, ?, ?, ST_GeomFromText(?), ?)
        `;

        for (const item of data) {
            const name = item.properties.naziv;
            const formationDate = formatDate(item.properties.datum_formiranja);
            const description = item.properties.opis || '';
            const location = `POINT(${item.geometry.coordinates[0]} ${item.geometry.coordinates[1]})`;
            const wikipediaUrl = item.properties.wikipedia || null;

            await pool.query(query, [name, formationDate, description, location, wikipediaUrl]);
            console.log(`Inserted into ${tableName}: ${name}`);
        }

        console.log(`Data import complete for ${tableName}.`);
    } catch (error) {
        console.error(`Error importing data into ${tableName}:`, error);
    }
}

// Run imports
(async () => {
    await importData('dalmatia-odredi.json', 'detachments');
    await importData('dalmatia-brigades.json', 'brigades');
    await importData('divizije.json', 'divisions');
    await importData('korpusi.json', 'corpuses');
    await pool.end();
})();
