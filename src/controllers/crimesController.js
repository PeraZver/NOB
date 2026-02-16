/**
 * crimesController.js - This file is part of the NOB web project.
 * 
 * Business logic controller for war crimes. Provides functions to fetch
 * and process crime data from the database with SQL injection protection.
 * 
 * Created: 02/2026
 * Authors: Pero & Github Copilot
 */

const path = require('path');
const pool = require('../db/pool');
const { getMarkdownContent } = require('../utils/markdownLoader');

/**
 * Get all crimes from database
 * @returns {Promise<Array>} Array of crime objects
 */
async function getCrimes() {
    const query = `SELECT id, name, ST_AsText(location) AS location, start_date, end_date, note, deaths, wikipedia_url, description FROM crimes`;
    
    try {
        const [results] = await pool.query(query);

        // Fetch Markdown content dynamically
        const crimes = await Promise.all(
            results.map(async (crime) => {
                if (crime.description && crime.description.endsWith('.md')) {
                    const filePath = path.join(__dirname, '../../public', 'assets', 'crimes', crime.description);
                    crime.description = await getMarkdownContent(filePath);
                }
                return crime;
            })
        );

        return crimes;
    } catch (error) {
        console.error('Error fetching crimes:', error);
        throw error;
    }
}

/**
 * Get a single crime by ID
 * @param {number} crimeId - ID of the crime
 * @returns {Promise<Object|null>} Crime object or null
 */
async function getCrimeById(crimeId) {
    const query = `SELECT id, name, ST_AsText(location) AS location, start_date, end_date, note, deaths, wikipedia_url, description FROM crimes WHERE id = ?`;
    
    try {
        const [results] = await pool.query(query, [crimeId]);
        if (results.length === 0) {
            return null;
        }
        
        const crime = results[0];
        // Fetch Markdown content if description is a .md file
        if (crime.description && crime.description.endsWith('.md')) {
            const filePath = path.join(__dirname, '../../public', 'assets', 'crimes', crime.description);
            crime.description = await getMarkdownContent(filePath);
        }
        
        return crime;
    } catch (error) {
        console.error('Error fetching crime:', error);
        throw error;
    }
}

module.exports = {
    getCrimes,
    getCrimeById
};
