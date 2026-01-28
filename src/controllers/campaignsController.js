/**
 * campaignsController.js - This file is part of the NOB web project.
 * 
 * Business logic controller for campaigns. Provides functions to fetch
 * campaign data for brigades from the database.
 * 
 * Created: 01/2026
 * Authors: Pero & Github Copilot
 */

const pool = require('../db/pool');

/**
 * Get all campaigns for a specific brigade
 * @param {number} brigadeId - ID of the brigade
 * @returns {Promise<Array>} Array of campaign objects
 */
async function getCampaignsByBrigade(brigadeId) {
    const query = `
        SELECT 
            id, 
            brigade_id, 
            date, 
            place, 
            ST_AsText(geo_location) AS geo_location, 
            operation, 
            division, 
            note 
        FROM campaigns 
        WHERE brigade_id = ?
        ORDER BY date ASC
    `;
    
    try {
        const [results] = await pool.query(query, [brigadeId]);
        return results;
    } catch (error) {
        console.error('Error fetching campaigns for brigade:', error);
        throw error;
    }
}

module.exports = {
    getCampaignsByBrigade
};
