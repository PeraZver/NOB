/**
 * exportDivisions.js - Export division data from database to JSON
 * 
 * This script exports all division data from the database including
 * wikipedia_url to a JSON file for processing.
 * 
 * Usage: node scripts/exportDivisions.js
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

async function exportDivisions() {
    let connection;
    
    try {
        // Connect to database
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database');
        
        // Query all divisions with wikipedia URLs
        const [divisions] = await connection.execute(
            'SELECT id, name, formation_date, formation_site, description, wikipedia_url FROM divisions WHERE wikipedia_url IS NOT NULL'
        );
        
        console.log(`Found ${divisions.length} divisions with Wikipedia URLs`);
        
        // Save to JSON file
        const outputPath = path.join(__dirname, '../divisions_data.json');
        fs.writeFileSync(outputPath, JSON.stringify(divisions, null, 2));
        
        console.log(`Exported division data to: ${outputPath}`);
        
    } catch (error) {
        console.error('Error exporting divisions:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

exportDivisions();
