/**
 * exportBrigades.js - Export brigade data from database to JSON
 * 
 * This script exports all brigade data from the database including
 * wikipedia_url to a JSON file for processing.
 * 
 * Usage: node scripts/exportBrigades.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nob',
};

async function exportBrigades() {
    let connection;
    
    try {
        // Connect to database
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database');
        
        // Query all brigades with wikipedia URLs
        const [brigades] = await connection.execute(
            'SELECT id, name, formation_date, formation_site, description, wikipedia_url FROM brigades WHERE wikipedia_url IS NOT NULL'
        );
        
        console.log(`Found ${brigades.length} brigades with Wikipedia URLs`);
        
        // Save to JSON file
        const outputPath = path.join(__dirname, '../brigades_data.json');
        fs.writeFileSync(outputPath, JSON.stringify(brigades, null, 2));
        
        console.log(`Exported brigade data to: ${outputPath}`);
        
    } catch (error) {
        console.error('Error exporting brigades:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

exportBrigades();
