/**
 * militaryUnitsController.js - This file is part of the NOB web project.
 * 
 * Business logic controller for military units. Provides generic functions to fetch
 * and process military unit data from the database with SQL injection protection.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

const path = require('path');
const pool = require('../db/pool');
const { getMarkdownContent } = require('../utils/markdownLoader');

// Whitelist of valid table names to prevent SQL injection
const VALID_TABLES = ['brigades', 'detachments', 'divisions', 'corps'];

/**
 * Validate table name against whitelist
 * @param {string} tableName - Name to validate
 * @returns {boolean} True if valid
 */
function isValidTableName(tableName) {
    return VALID_TABLES.includes(tableName);
}

/**
 * Generic controller to fetch military units from database
 * @param {string} tableName - Name of the database table
 * @param {string} assetFolder - Folder name in public/assets
 */
async function getMilitaryUnits(tableName, assetFolder) {
    if (!isValidTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
    }

    const query = `SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM ${tableName}`;
    
    try {
        const [results] = await pool.query(query);

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

        return units;
    } catch (error) {
        console.error(`Error fetching ${tableName}:`, error);
        throw error;
    }
}

/**
 * Get a single military unit by ID
 * @param {string} tableName - Name of the database table
 * @param {number} unitId - ID of the unit
 */
async function getMilitaryUnitById(tableName, unitId) {
    if (!isValidTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
    }

    const query = `SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM ${tableName} WHERE id = ?`;
    
    try {
        const [results] = await pool.query(query, [unitId]);
        return results.length > 0 ? results[0] : null;
    } catch (error) {
        console.error(`Error fetching unit from ${tableName}:`, error);
        throw error;
    }
}

module.exports = {
    getMilitaryUnits,
    getMilitaryUnitById
};
