/**
 * crimesController.js - This file is part of the NOB web project.
 * 
 * Business logic controller for war crimes. Provides functions to fetch
 * and process crime data from the database with SQL injection protection.
 * 
 * Created: 02/2026
 * Authors: Pero & Github Copilot
 */

const pool = require('../db/pool');

/**
 * Get all crimes from database
 * @returns {Promise<Array>} Array of crime objects
 */
async function getCrimes() {
    const query = `SELECT id, site, ST_AsText(location) AS location, start_date, end_date, note, deaths, perpetrator, wikipedia_url FROM crimes`;
    
    try {
        const [results] = await pool.query(query);
        return results;
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
    const query = `SELECT id, site, ST_AsText(location) AS location, start_date, end_date, note, deaths, perpetrator, wikipedia_url FROM crimes WHERE id = ?`;
    
    try {
        const [results] = await pool.query(query, [crimeId]);
        if (results.length === 0) {
            return null;
        }
        
        return results[0];
    } catch (error) {
        console.error('Error fetching crime:', error);
        throw error;
    }
}

module.exports = {
    getCrimes,
    getCrimeById
};
