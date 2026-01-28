/*
 * Script: importCampaigns.js
 * Description: Imports campaign/movement data from a JSON file into the campaigns table.
 * Each movement entry in the JSON becomes a row in the campaigns table.
 * Author: PeraZver
 * Date: January 27, 2026
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
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command-line arguments
const argv = yargs(hideBin(process.argv))
    .option('f', {
        alias: 'file',
        describe: 'Path to the JSON file containing campaign data',
        type: 'string',
        demandOption: true
    })
    .option('force', {
        describe: 'Force update all records even if they already exist',
        type: 'boolean',
        default: false
    })
    .help()
    .argv;

const campaignsFilePath = path.resolve(argv.file); // Use the file path provided by the user
const forceUpdate = argv.force;

// Main function to import campaigns
async function importCampaigns() {
    let connection;

    try {
        // Read the JSON file
        const campaignsData = JSON.parse(fs.readFileSync(campaignsFilePath, 'utf8'));

        // Connect to the database
        connection = await mysql.createConnection(dbConfig);

        console.log('Connected to the database.');

        // Verify brigade_id exists in brigades table
        const { brigade_id } = campaignsData;
        const [brigadeCheck] = await connection.execute(
            'SELECT id FROM brigades WHERE id = ?',
            [brigade_id]
        );

        if (brigadeCheck.length === 0) {
            console.error(`Error: Brigade with id ${brigade_id} not found in brigades table. Aborting import.`);
            return;
        }

        console.log(`Found brigade with id ${brigade_id}. Proceeding with import...`);

        // Extract movements array
        const movements = campaignsData.movements || [];
        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const movement of movements) {
            const { date, place, coordinates, operation, division, notes } = movement;

            // Validate required fields
            if (!date || !place) {
                console.warn(`Skipping movement with missing date or place: ${JSON.stringify(movement)}`);
                continue;
            }

            // Convert coordinates to WKT format for ST_GeomFromText()
            let geoLocation = null;
            if (coordinates && coordinates.lat !== undefined && coordinates.lng !== undefined) {
                geoLocation = `POINT(${coordinates.lng} ${coordinates.lat})`;
            }

            // Ensure all parameters are defined, replace undefined with null
            const safeDate = date || null;
            const safePlace = place || null;
            const safeOperation = operation || null;
            const safeDivision = division || null;
            const safeNotes = notes || null;

            try {
                // Check if a record with the same brigade_id, date, and place exists
                const [existingRows] = await connection.execute(
                    `SELECT id, operation, division, note, ST_AsText(geo_location) as geo_text 
                     FROM campaigns 
                     WHERE brigade_id = ? AND date = ? AND place = ?`,
                    [brigade_id, safeDate, safePlace]
                );

                if (existingRows.length > 0) {
                    const existingRecord = existingRows[0];
                    const existingGeoText = existingRecord.geo_text;
                    
                    // Compare existing data with new data
                    const operationDiffers = existingRecord.operation !== safeOperation;
                    const divisionDiffers = existingRecord.division !== safeDivision;
                    const noteDiffers = existingRecord.note !== safeNotes;
                    const geoDiffers = existingGeoText !== geoLocation;

                    const hasChanges = operationDiffers || divisionDiffers || noteDiffers || geoDiffers;

                    if (forceUpdate || hasChanges) {
                        // Update the existing record
                        await connection.execute(
                            `UPDATE campaigns 
                             SET operation = ?, division = ?, note = ?, geo_location = ST_GeomFromText(?, 4326)
                             WHERE id = ?`,
                            [safeOperation, safeDivision, safeNotes, geoLocation, existingRecord.id]
                        );

                        updatedCount++;
                        if (forceUpdate) {
                            console.log(`Campaign record force-updated: ${safePlace} (${safeDate})`);
                        } else {
                            console.log(`Campaign record updated (changes detected): ${safePlace} (${safeDate})`);
                        }
                    } else {
                        skippedCount++;
                        console.log(`Campaign record unchanged, skipping: ${safePlace} (${safeDate})`);
                    }
                } else {
                    // Insert new record
                    await connection.execute(
                        `INSERT INTO campaigns (brigade_id, date, place, geo_location, operation, division, note)
                         VALUES (?, ?, ?, ST_GeomFromText(?, 4326), ?, ?, ?)`,
                        [brigade_id, safeDate, safePlace, geoLocation, safeOperation, safeDivision, safeNotes]
                    );

                    insertedCount++;
                    console.log(`Campaign record inserted: ${safePlace} (${safeDate})`);
                }
            } catch (insertError) {
                console.error(`Error processing campaign record for ${safePlace}: ${insertError.message}`);
            }
        }

        console.log(`\nImport process completed.`);
        console.log(`- Inserted: ${insertedCount} records`);
        console.log(`- Updated: ${updatedCount} records`);
        console.log(`- Skipped (unchanged): ${skippedCount} records`);
    } catch (error) {
        console.error('Error during import:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

// Run the import function
importCampaigns();
