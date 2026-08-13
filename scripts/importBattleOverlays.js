/*
 * Script: importBattleOverlays.js
 * Description: Imports battle overlay metadata from JSON into battle_overlays table.
 * Author: GitHub Copilot
 * Date: August 13, 2026
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nob'
};

const argv = yargs(hideBin(process.argv))
    .option('f', {
        alias: 'file',
        describe: 'Path to JSON overlay manifest',
        type: 'string',
        default: 'public/assets/battles/overlays.json'
    })
    .help()
    .argv;

const overlaysFilePath = path.resolve(argv.file);

function toNumber(value, fallback = null) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeBounds(entry) {
    if (!Array.isArray(entry.imageBounds) || entry.imageBounds.length !== 2) {
        return null;
    }

    const sw = entry.imageBounds[0];
    const ne = entry.imageBounds[1];
    if (!Array.isArray(sw) || !Array.isArray(ne) || sw.length !== 2 || ne.length !== 2) {
        return null;
    }

    const south = toNumber(sw[0]);
    const west = toNumber(sw[1]);
    const north = toNumber(ne[0]);
    const east = toNumber(ne[1]);

    if ([south, west, north, east].some((n) => n === null)) {
        return null;
    }

    return {
        south: Math.min(south, north),
        west: Math.min(west, east),
        north: Math.max(south, north),
        east: Math.max(west, east)
    };
}

async function ensureBattleOverlaysTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS battle_overlays (
            id INT AUTO_INCREMENT PRIMARY KEY,
            battle_id INT NOT NULL,
            overlay_name VARCHAR(255),
            image_url VARCHAR(512) NOT NULL,
            south_lat DOUBLE NOT NULL,
            west_lng DOUBLE NOT NULL,
            north_lat DOUBLE NOT NULL,
            east_lng DOUBLE NOT NULL,
            opacity DECIMAL(5,2) DEFAULT 0.50,
            contrast DECIMAL(5,2) DEFAULT 1.00,
            z_index INT DEFAULT 10,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_battle_overlays_battle_id (battle_id),
            CONSTRAINT fk_battle_overlays_battle FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE CASCADE
        )
    `);
}

async function importBattleOverlays() {
    let connection;

    try {
        const parsed = JSON.parse(fs.readFileSync(overlaysFilePath, 'utf8'));
        const overlays = Array.isArray(parsed) ? parsed : parsed.overlays;

        if (!Array.isArray(overlays) || overlays.length === 0) {
            throw new Error('No overlay entries found. Expected array or { overlays: [] }.');
        }

        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        await ensureBattleOverlaysTable(connection);

        for (const entry of overlays) {
            const battleId = toNumber(entry.battleId);
            const imageUrl = entry.imageUrl ? String(entry.imageUrl).trim() : '';
            const bounds = normalizeBounds(entry);

            if (!battleId || !imageUrl || !bounds) {
                console.warn('Skipping invalid overlay entry:', entry?.name || entry?.battleId || 'unknown');
                continue;
            }

            const [battleRows] = await connection.execute(
                'SELECT id, name FROM battles WHERE id = ? LIMIT 1',
                [battleId]
            );

            if (!Array.isArray(battleRows) || battleRows.length === 0) {
                console.warn(`Skipping overlay for battle ID ${battleId}: battle not found.`);
                continue;
            }

            const overlayName = entry.name ? String(entry.name).trim() : null;
            const opacity = toNumber(entry.opacity, 0.5);
            const contrast = toNumber(entry.contrast, 1);
            const zIndex = toNumber(entry.zIndex, 10);

            await connection.execute(
                `INSERT INTO battle_overlays
                    (battle_id, overlay_name, image_url, south_lat, west_lng, north_lat, east_lng, opacity, contrast, z_index)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    overlay_name = VALUES(overlay_name),
                    image_url = VALUES(image_url),
                    south_lat = VALUES(south_lat),
                    west_lng = VALUES(west_lng),
                    north_lat = VALUES(north_lat),
                    east_lng = VALUES(east_lng),
                    opacity = VALUES(opacity),
                    contrast = VALUES(contrast),
                    z_index = VALUES(z_index)`,
                [
                    battleId,
                    overlayName,
                    imageUrl,
                    bounds.south,
                    bounds.west,
                    bounds.north,
                    bounds.east,
                    opacity,
                    contrast,
                    zIndex
                ]
            );

            console.log(`Upserted overlay for battle ID ${battleId} (${battleRows[0].name}).`);
        }

        console.log('Battle overlays import completed.');
    } catch (error) {
        console.error('Import failed:', error.message);
        process.exitCode = 1;
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

importBattleOverlays();
