/*
 * Script: importCrimes.js
 * Description: Imports crime data from a JSON file into the crimes table in the database.
 * Author: PeraZver
 * Date: February 14, 2026
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
        describe: 'Path to the JSON file containing crimes data',
        type: 'string',
        demandOption: true
    })
    .help()
    .argv;

const crimesFilePath = path.resolve(argv.file); // Use the file path provided by the user

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

// Main function to import crimes
async function importCrimes() {
    let connection;

    try {
        // Read the JSON file
        const crimesData = JSON.parse(fs.readFileSync(crimesFilePath, 'utf8'));

        // Connect to the database
        connection = await mysql.createConnection(dbConfig);

        console.log('Connected to the database.');

        for (const crime of crimesData) {
            const { name, place, date, location, description, wikipedia_url } = crime;

            // Fetch all existing crime names and data from the database
            const [existingRows] = await connection.execute(
                'SELECT * FROM crimes WHERE name = ? AND place = ?',
                [name, place]
            );

            if (existingRows.length > 0) {
                const existingCrime = existingRows[0];
                console.log(`Crime "${name}" at "${place}" already exists. Skipping...`);
                continue;
            }

            // Fetch all existing crime names for similarity check
            const [allRows] = await connection.execute('SELECT name FROM crimes');
            const existingNames = allRows.map(row => row.name);

            // Check for similar names
            const bestMatch = stringSimilarity.findBestMatch(name, existingNames);
            if (bestMatch.bestMatch.rating > 0.99) {
                console.log(`Crime "${name}" is very similar to "${bestMatch.bestMatch.target}". Skipping...`);
                continue;
            } else if (bestMatch.bestMatch.rating > 0.8) {
                const userResponse = await promptUser(
                    `Crime "${name}" is somewhat similar to "${bestMatch.bestMatch.target}". Do you want to insert it? (yes/no): `
                );
                if (userResponse !== 'yes') {
                    console.log(`Crime "${name}" was not inserted.`);
                    continue;
                }
            }

            // Get the next available ID
            const [idResult] = await connection.execute(
                'SELECT MAX(id) AS maxId FROM crimes'
            );
            const nextId = (idResult[0].maxId || 0) + 1;

            // Convert location to WKT format for ST_GeomFromText()
            const point = location
                ? `POINT(${location.longitude} ${location.latitude})`
                : null;

            // Insert the crime into the database
            await connection.execute(
                `INSERT INTO crimes (id, name, place, date, location, description, wikipedia_url)
                 VALUES (?, ?, ?, ?, ST_GeomFromText(?), ?, ?)`,
                [nextId, name, place, date || null, point, description || null, wikipedia_url || null]
            );

            console.log(`Crime "${name}" at "${place}" has been inserted into the database.`);
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
importCrimes();
