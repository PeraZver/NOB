/**
 * battlesController.js - This file is part of the NOB web project.
 * 
 * Business logic controller for battles. Provides functions to fetch
 * and process battle data from the database with SQL injection protection.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

const path = require('path');
const pool = require('../db/pool');
const { getMarkdownContent } = require('../utils/markdownLoader');

/**
 * Get all battles from database
 * @returns {Promise<Array>} Array of battle objects
 */
async function getBattles() {
    const query = `SELECT id, name, place, ST_AsText(location) AS location, start_date, end_date, description, wikipedia_url FROM battles`;
    
    try {
        const [results] = await pool.query(query);

        // Fetch Markdown content dynamically
        const battles = await Promise.all(
            results.map(async (battle) => {
                if (battle.description && battle.description.endsWith('.md')) {
                    const filePath = path.join(__dirname, '../../public', 'assets', 'battles', battle.description);
                    battle.description = await getMarkdownContent(filePath);
                }
                return battle;
            })
        );

        return battles;
    } catch (error) {
        console.error('Error fetching battles:', error);
        throw error;
    }
}

/**
 * Get a single battle by ID
 * @param {number} battleId - ID of the battle
 * @returns {Promise<Object|null>} Battle object or null
 */
async function getBattleById(battleId) {
    const query = `SELECT id, name, place, ST_AsText(location) AS location, start_date, end_date, description, wikipedia_url FROM battles WHERE id = ?`;
    
    try {
        const [results] = await pool.query(query, [battleId]);
        if (results.length === 0) {
            return null;
        }
        
        const battle = results[0];
        // Fetch Markdown content if description is a .md file
        if (battle.description && battle.description.endsWith('.md')) {
            const filePath = path.join(__dirname, '../../public', 'assets', 'battles', battle.description);
            battle.description = await getMarkdownContent(filePath);
        }
        
        return battle;
    } catch (error) {
        console.error('Error fetching battle:', error);
        throw error;
    }
}

module.exports = {
    getBattles,
    getBattleById
};
