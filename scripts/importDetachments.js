/*
 * Script: importDetachments.js
 * Description: Imports detachment data from a JSON file into the database. 
 * Ensures no duplicate entries and prompts the user for confirmation when necessary.
 * Author: PeraZver
 * Date: December 1, 2025
 */

require('dotenv').config(); // Load environment variables from .env file

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nob',
};

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const readline = require('readline');
const stringSimilarity = require('string-similarity'); // Add this at the top to use string similarity
const yargs = require('yargs/yargs'); // Correct the import for yargs
const { hideBin } = require('yargs/helpers');

// Parse command-line arguments
const argv = yargs(hideBin(process.argv))
    .option('f', {
        alias: 'file',
        describe: 'Path to the JSON file containing detachment data',
        type: 'string',
        demandOption: true
    })
    .help()
    .argv;

const detachmentsFilePath = path.resolve(argv.file); // Use the file path provided by the user

// Readline interface for user prompts
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Helper function to prompt the user
const promptUser = (question) => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.toLowerCase());
        });
    });
};

// Main function to import detachments
async function importDetachments() {
    let connection;

    try {
        // Read the JSON file
        const detachmentsData = JSON.parse(fs.readFileSync(detachmentsFilePath, 'utf8'));

        // Connect to the database
        connection = await mysql.createConnection(dbConfig);

        console.log('Connected to the database.');

        for (const detachment of detachmentsData) {
            const { name, formation_date, formation_geo, formation_site, description, wikipedia_url } = detachment;

            // Fetch all existing detachment names and data from the database
            const [existingRows] = await connection.execute(
                'SELECT * FROM detachments WHERE name = ?',
                [name]
            );

            if (existingRows.length > 0) {
                const existingDetachment = existingRows[0];

                // Check and update missing data
                const updates = [];
                const updateValues = [];

                if (!existingDetachment.formation_site && formation_site) {
                    updates.push('formation_site = ?');
                    updateValues.push(formation_site);
                }
                if (!existingDetachment.formation_date && formation_date) {
                    updates.push('formation_date = ?');
                    updateValues.push(formation_date);
                }
                if (!existingDetachment.location && formation_geo) {
                    updates.push('location = ST_GeomFromText(?)');
                    updateValues.push(`POINT(${formation_geo.longitude} ${formation_geo.latitude})`);
                }
                if (!existingDetachment.description && description) {
                    updates.push('description = ?');
                    updateValues.push(description);
                }
                if (!existingDetachment.wikipedia_url && wikipedia_url) {
                    updates.push('wikipedia_url = ?');
                    updateValues.push(wikipedia_url);
                }

                if (updates.length > 0) {
                    const updateQuery = `UPDATE detachments SET ${updates.join(', ')} WHERE id = ?`;
                    updateValues.push(existingDetachment.id);

                    await connection.execute(updateQuery, updateValues);
                    console.log(`Detachment "${name}" updated with missing data.`);
                } else {
                    console.log(`Detachment "${name}" already exists with complete data. Skipping...`);
                }

                continue;
            }

            // Fetch all existing detachment names for similarity check
            const [allRows] = await connection.execute('SELECT name FROM detachments');
            const existingNames = allRows.map(row => row.name);

            // Check for similar names
            const bestMatch = stringSimilarity.findBestMatch(name, existingNames);
            if (bestMatch.bestMatch.rating > 0.95) {
                console.log(`Detachment "${name}" is very similar to "${bestMatch.bestMatch.target}". Skipping...`);
                continue;
            } else if (bestMatch.bestMatch.rating > 0.8) {
                const userResponse = await promptUser(
                    `Detachment "${name}" is somewhat similar to "${bestMatch.bestMatch.target}". Do you want to insert it? (yes/no): `
                );

                if (userResponse !== 'yes') {
                    console.log(`Detachment "${name}" was not inserted.`);
                    continue;
                }
            }

            // Get the next available ID
            const [idResult] = await connection.execute(
                'SELECT MAX(id) AS maxId FROM detachments'
            );
            const nextId = (idResult[0].maxId || 0) + 1;

            // Convert formation_geo to WKT format for ST_GeomFromText()
            const location = formation_geo
                ? `POINT(${formation_geo.longitude} ${formation_geo.latitude})`
                : null;

            // Ensure all parameters are defined, replace undefined with null
            const safeFormationDate = formation_date || null;
            const safeFormationSite = formation_site || null;
            const safeDescription = description || null;
            const safeWikipediaUrl = wikipedia_url || null;

            // Insert the detachment into the database
            await connection.execute(
                `INSERT INTO detachments (id, name, formation_date, formation_site, location, description, wikipedia_url)
                 VALUES (?, ?, ?, ?, ST_GeomFromText(?), ?, ?)`,
                [nextId, name, safeFormationDate, safeFormationSite, location, safeDescription, safeWikipediaUrl]
            );

            console.log(`Detachment "${name}" has been inserted into the database.`);
        }

        console.log('Import process completed.');
    } catch (error) {
        console.error('Error during import:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
        rl.close();
    }
}

// Run the import function
importDetachments();