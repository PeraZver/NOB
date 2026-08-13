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
    const query = `
        SELECT
            b.id,
            b.name,
            b.place,
            ST_AsText(b.location) AS location,
            b.start_date,
            b.end_date,
            b.description,
            b.wikipedia_url,
            bo.overlay_name,
            bo.image_url,
            bo.south_lat,
            bo.west_lng,
            bo.north_lat,
            bo.east_lng,
            bo.opacity,
            bo.contrast,
            bo.z_index
        FROM battles b
        LEFT JOIN battle_overlays bo ON bo.battle_id = b.id
    `;
    
    try {
        const [results] = await pool.query(query);

        // Fetch Markdown content dynamically
        const battles = await Promise.all(
            results.map(async (battle) => {
                if (battle.description && battle.description.endsWith('.md')) {
                    const filePath = path.join(__dirname, '../../public', 'assets', 'battles', battle.description);
                    battle.description = await getMarkdownContent(filePath);
                }

                battle.overlay = battle.image_url ? {
                    name: battle.overlay_name || battle.name,
                    imageUrl: battle.image_url,
                    imageBounds: [
                        [Number(battle.south_lat), Number(battle.west_lng)],
                        [Number(battle.north_lat), Number(battle.east_lng)]
                    ],
                    opacity: battle.opacity != null ? Number(battle.opacity) : 0.5,
                    contrast: battle.contrast != null ? Number(battle.contrast) : 1,
                    zIndex: battle.z_index != null ? Number(battle.z_index) : 10
                } : null;

                delete battle.overlay_name;
                delete battle.image_url;
                delete battle.south_lat;
                delete battle.west_lng;
                delete battle.north_lat;
                delete battle.east_lng;
                delete battle.opacity;
                delete battle.contrast;
                delete battle.z_index;
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
    const query = `
        SELECT
            b.id,
            b.name,
            b.place,
            ST_AsText(b.location) AS location,
            b.start_date,
            b.end_date,
            b.description,
            b.wikipedia_url,
            bo.overlay_name,
            bo.image_url,
            bo.south_lat,
            bo.west_lng,
            bo.north_lat,
            bo.east_lng,
            bo.opacity,
            bo.contrast,
            bo.z_index
        FROM battles b
        LEFT JOIN battle_overlays bo ON bo.battle_id = b.id
        WHERE b.id = ?
    `;
    
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

        battle.overlay = battle.image_url ? {
            name: battle.overlay_name || battle.name,
            imageUrl: battle.image_url,
            imageBounds: [
                [Number(battle.south_lat), Number(battle.west_lng)],
                [Number(battle.north_lat), Number(battle.east_lng)]
            ],
            opacity: battle.opacity != null ? Number(battle.opacity) : 0.5,
            contrast: battle.contrast != null ? Number(battle.contrast) : 1,
            zIndex: battle.z_index != null ? Number(battle.z_index) : 10
        } : null;

        delete battle.overlay_name;
        delete battle.image_url;
        delete battle.south_lat;
        delete battle.west_lng;
        delete battle.north_lat;
        delete battle.east_lng;
        delete battle.opacity;
        delete battle.contrast;
        delete battle.z_index;
        
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
