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

// Helper function to check if two objects are different
const areRecordsDifferent = (existing, newData) => {
    return (
        existing.site !== newData.site ||
        existing.start_date !== newData.start_date ||
        existing.end_date !== newData.end_date ||
        existing.deaths !== newData.deaths ||
        existing.perpetrator !== newData.perpetrator ||
        existing.description !== newData.description ||
        existing.wikipedia_url !== newData.wikipedia_url ||
        existing.lat !== newData.lat ||
        existing.lon !== newData.lon
    );
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
            const {
                id,
                site,
                start_date,
                end_date,
                location,
                deaths,
                perpetrator,
                description,
                wikipedia_url
            } = crime;

            const lat = location?.lat || null;
            const lon = location?.lon || null;

            // Check if crime with this ID already exists
            const [existingRows] = await connection.execute(
                'SELECT * FROM crimes WHERE id = ?',
                [id]
            );

            if (existingRows.length > 0) {
                const existingCrime = existingRows[0];
                const newCrimeData = {
                    site,
                    start_date,
                    end_date,
                    deaths,
                    perpetrator,
                    description,
                    wikipedia_url,
                    lat,
                    lon
                };

                // Check if the record is different
                if (areRecordsDifferent(existingCrime, newCrimeData)) {
                    console.log(`Crime ID ${id} ("${site}") exists but has different data. Updating...`);

                    // Update the existing record
                    const point = lat && lon ? `POINT(${lon} ${lat})` : null;
                    await connection.execute(
                        `UPDATE crimes 
                         SET site = ?, start_date = ?, end_date = ?, deaths = ?, perpetrator = ?, description = ?, wikipedia_url = ?, location = ST_GeomFromText(?)
                         WHERE id = ?`,
                        [site, start_date, end_date, deaths, perpetrator, description, wikipedia_url, point, id]
                    );
                    console.log(`Crime ID ${id} ("${site}") has been updated.`);
                } else {
                    console.log(`Crime ID ${id} ("${site}") already exists with identical data. Skipping...`);
                }
                continue;
            }

            // Insert new crime
            const point = lat && lon ? `POINT(${lon} ${lat})` : null;

            await connection.execute(
                `INSERT INTO crimes (id, site, start_date, end_date, location, deaths, perpetrator, description, wikipedia_url)
                 VALUES (?, ?, ?, ?, ST_GeomFromText(?), ?, ?, ?, ?)`,
                [id, site, start_date, end_date, point, deaths, perpetrator, description, wikipedia_url]
            );

            console.log(`Crime ID ${id} ("${site}") has been inserted into the database.`);
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
