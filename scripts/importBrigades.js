/*
 * Script: importBrigades.js
 * Description: Imports brigade data from a JSON file into the database.
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
const stringSimilarity = require('string-similarity');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command-line arguments
const argv = yargs(hideBin(process.argv))
    .option('f', {
        alias: 'file',
        describe: 'Path to the JSON file containing brigade data',
        type: 'string',
        demandOption: true
    })
    .help()
    .argv;

const brigadesFilePath = path.resolve(argv.file); // Use the file path provided by the user

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

// Main function to import brigades
async function importBrigades() {
    let connection;

    try {
        // Read the JSON file
        const brigadesData = JSON.parse(fs.readFileSync(brigadesFilePath, 'utf8'));

        // Connect to the database
        connection = await mysql.createConnection(dbConfig);

        console.log('Connected to the database.');

        for (const brigade of brigadesData) {
            const { name, formation_date, formation_geo, formation_site, wikipedia_url } = brigade;

            // Fetch all existing brigade names and data from the database
            const [existingRows] = await connection.execute(
                'SELECT * FROM brigades WHERE name = ?',
                [name]
            );

            if (existingRows.length > 0) {
                const existingBrigade = existingRows[0];

                // If the name matches entirely, skip the item
                if (existingBrigade.name === name) {
                    console.log(`Brigade "${name}" already exists with the same name. Skipping...`);
                    continue;
                }

                // Check and update missing data
                const updates = [];
                const updateValues = [];

                if (!existingBrigade.formation_site && formation_site) {
                    updates.push('formation_site = ?');
                    updateValues.push(formation_site);
                }
                if (!existingBrigade.formation_date && formation_date) {
                    updates.push('formation_date = ?');
                    updateValues.push(formation_date);
                }
                if (!existingBrigade.location && formation_geo) {
                    updates.push('location = ST_GeomFromText(?)');
                    updateValues.push(`POINT(${formation_geo.longitude} ${formation_geo.latitude})`);
                }
                if (!existingBrigade.wikipedia_url && wikipedia_url) {
                    updates.push('wikipedia_url = ?');
                    updateValues.push(wikipedia_url);
                }

                if (updates.length > 0) {
                    const updateQuery = `UPDATE brigades SET ${updates.join(', ')} WHERE id = ?`;
                    updateValues.push(existingBrigade.id);

                    await connection.execute(updateQuery, updateValues);
                    console.log(`Brigade "${name}" updated with missing data.`);
                } else {
                    console.log(`Brigade "${name}" already exists with complete data. Skipping...`);
                }

                continue;
            }

            // Fetch all existing brigade names for similarity check
            const [allRows] = await connection.execute('SELECT name FROM brigades');
            const existingNames = allRows.map(row => row.name);

            // Check for similar names
            const bestMatch = stringSimilarity.findBestMatch(name, existingNames);
            if (bestMatch.bestMatch.rating > 0.99) {
                console.log(`Brigade "${name}" is very similar to "${bestMatch.bestMatch.target}". Skipping...`);
                continue;
            } else if (bestMatch.bestMatch.rating > 0.8) {
                const userResponse = await promptUser(
                    `Brigade "${name}" is somewhat similar to "${bestMatch.bestMatch.target}". Do you want to insert it? (yes/no): `
                );

                if (userResponse !== 'yes') {
                    console.log(`Brigade "${name}" was not inserted.`);
                    continue;
                }
            }

            // Get the next available ID
            const [idResult] = await connection.execute(
                'SELECT MAX(id) AS maxId FROM brigades'
            );
            const nextId = (idResult[0].maxId || 0) + 1;

            // Convert formation_geo to WKT format for ST_GeomFromText()
            const location = formation_geo
                ? `POINT(${formation_geo.longitude} ${formation_geo.latitude})`
                : null;

            // Ensure all parameters are defined, replace undefined with null
            const safeFormationDate = formation_date || null;
            const safeFormationSite = formation_site || null;
            const safeWikipediaUrl = wikipedia_url || null;

            // Insert the brigade into the database
            await connection.execute(
                `INSERT INTO brigades (id, name, formation_date, formation_site, location, wikipedia_url)
                 VALUES (?, ?, ?, ?, ST_GeomFromText(?), ?)`,
                [nextId, name, safeFormationDate, safeFormationSite, location, safeWikipediaUrl]
            );

            console.log(`Brigade "${name}" has been inserted into the database.`);
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
importBrigades();
