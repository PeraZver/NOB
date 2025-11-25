const path = require('path');
const pool = require('../db/pool');
const { getMarkdownContent } = require('../utils/markdownLoader');

/**
 * Generic controller to fetch military units from database
 * @param {string} tableName - Name of the database table
 * @param {string} assetFolder - Folder name in public/assets
 */
async function getMilitaryUnits(tableName, assetFolder) {
    const query = `SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM ${tableName}`;
    
    return new Promise((resolve, reject) => {
        pool.query(query, async (err, results) => {
            if (err) {
                console.error(`Error fetching ${tableName}:`, err);
                reject(err);
                return;
            }

            // Fetch Markdown content dynamically
            const units = await Promise.all(
                results.map(async (unit) => {
                    if (unit.description && unit.description.endsWith('.md')) {
                        const filePath = path.join(__dirname, '../../public', 'assets', assetFolder, unit.description);
                        unit.description = await getMarkdownContent(filePath);
                    }
                    return unit;
                })
            );

            resolve(units);
        });
    });
}

/**
 * Get a single military unit by ID
 * @param {string} tableName - Name of the database table
 * @param {number} unitId - ID of the unit
 */
async function getMilitaryUnitById(tableName, unitId) {
    const query = `SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM ${tableName} WHERE id = ?`;
    
    return new Promise((resolve, reject) => {
        pool.query(query, [unitId], (err, results) => {
            if (err) {
                console.error(`Error fetching unit from ${tableName}:`, err);
                reject(err);
                return;
            }
            resolve(results.length > 0 ? results[0] : null);
        });
    });
}

module.exports = {
    getMilitaryUnits,
    getMilitaryUnitById
};
