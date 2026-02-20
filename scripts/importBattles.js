/*
 * Script: importBattles.js
 * Description: Imports battle data from a JSON file into the battles table in the database.
 * Author: PeraZver
 * Date: February 20, 2026
 */

require('dotenv').config();

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

const argv = yargs(hideBin(process.argv))
    .option('f', {
        alias: 'file',
        describe: 'Path to the JSON file containing battles data',
        type: 'string',
        demandOption: true
    })
    .help()
    .argv;

const battlesFilePath = path.resolve(argv.file);

const normalizeDate = (value) => {
    if (!value) {
        return null;
    }

    const text = String(value).trim();
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString().slice(0, 10);
};

const extractCoordinates = (battle) => {
    const location = battle.location || battle.coordinates || battle.geo || null;

    const lat = location?.lat ?? location?.latitude ?? battle.lat ?? battle.latitude ?? null;
    const lon = location?.lng ?? location?.lon ?? location?.longitude ?? battle.lng ?? battle.lon ?? battle.longitude ?? null;

    if (lat === null || lon === null) {
        return { lat: null, lon: null };
    }

    const latNumber = Number(lat);
    const lonNumber = Number(lon);
    if (Number.isNaN(latNumber) || Number.isNaN(lonNumber)) {
        return { lat: null, lon: null };
    }

    return { lat: latNumber, lon: lonNumber };
};

const areRecordsDifferent = (existing, incoming) => {
    return (
        existing.name !== incoming.name ||
        existing.place !== incoming.place ||
        existing.start_date !== incoming.start_date ||
        existing.end_date !== incoming.end_date ||
        existing.description !== incoming.description ||
        existing.wikipedia_url !== incoming.wikipedia_url ||
        Number(existing.lat) !== Number(incoming.lat) ||
        Number(existing.lon) !== Number(incoming.lon)
    );
};

async function importBattles() {
    let connection;

    try {
        const parsed = JSON.parse(fs.readFileSync(battlesFilePath, 'utf8'));
        const battlesData = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.battles) ? parsed.battles : []);

        if (!Array.isArray(battlesData) || battlesData.length === 0) {
            throw new Error('No battles found in JSON. Expected an array or an object with a "battles" array.');
        }

        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to the database.');

        for (const battle of battlesData) {
            const id = battle.id ?? null;
            const name = battle.name ? String(battle.name).trim() : null;
            const place = battle.place ? String(battle.place).trim() : null;
            const start_date = normalizeDate(battle.start_date || battle.startDate);
            const end_date = normalizeDate(battle.end_date || battle.endDate);
            const description = battle.description ? String(battle.description).trim() : null;
            const wikipedia_url = battle.wikipedia_url || battle.wikipediaUrl || null;
            const { lat, lon } = extractCoordinates(battle);

            if (!name) {
                console.log('Skipping battle with missing name.');
                continue;
            }

            const point = lat !== null && lon !== null ? `POINT(${lon} ${lat})` : null;

            let existingRows = [];

            if (id !== null && id !== undefined) {
                [existingRows] = await connection.execute(
                    `SELECT id, name, place, start_date, end_date, description, wikipedia_url,
                            ST_Y(location) AS lat, ST_X(location) AS lon
                     FROM battles
                     WHERE id = ?`,
                    [id]
                );
            }

            if (existingRows.length === 0) {
                [existingRows] = await connection.execute(
                    `SELECT id, name, place, start_date, end_date, description, wikipedia_url,
                            ST_Y(location) AS lat, ST_X(location) AS lon
                     FROM battles
                     WHERE name = ?
                       AND (place <=> ?)
                       AND (start_date <=> ?)
                       AND (end_date <=> ?)
                     LIMIT 1`,
                    [name, place, start_date, end_date]
                );
            }

            const incomingData = {
                name,
                place,
                start_date,
                end_date,
                description,
                wikipedia_url,
                lat,
                lon
            };

            if (existingRows.length > 0) {
                const existing = existingRows[0];

                if (areRecordsDifferent(existing, incomingData)) {
                    await connection.execute(
                        `UPDATE battles
                         SET name = ?, place = ?, location = ST_GeomFromText(?),
                             start_date = ?, end_date = ?, description = ?, wikipedia_url = ?
                         WHERE id = ?`,
                        [name, place, point, start_date, end_date, description, wikipedia_url, existing.id]
                    );

                    console.log(`Battle ID ${existing.id} ("${name}") has been updated.`);
                } else {
                    console.log(`Battle ID ${existing.id} ("${name}") already exists with identical data. Skipping...`);
                }

                continue;
            }

            if (id !== null && id !== undefined) {
                await connection.execute(
                    `INSERT INTO battles (id, name, place, location, start_date, end_date, description, wikipedia_url)
                     VALUES (?, ?, ?, ST_GeomFromText(?), ?, ?, ?, ?)`,
                    [id, name, place, point, start_date, end_date, description, wikipedia_url]
                );

                console.log(`Battle ID ${id} ("${name}") has been inserted.`);
            } else {
                await connection.execute(
                    `INSERT INTO battles (name, place, location, start_date, end_date, description, wikipedia_url)
                     VALUES (?, ?, ST_GeomFromText(?), ?, ?, ?, ?)`,
                    [name, place, point, start_date, end_date, description, wikipedia_url]
                );

                console.log(`Battle "${name}" has been inserted.`);
            }
        }

        console.log('Import process completed.');
    } catch (error) {
        console.error('Error during import:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

importBattles();
