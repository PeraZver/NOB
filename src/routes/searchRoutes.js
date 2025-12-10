/**
 * searchRoutes.js - This file is part of the NOB web project.
 * 
 * API routes for search functionality. Handles searching across all military unit types
 * and retrieving detailed information for specific items.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const pool = require('../db/pool'); // Database connection pool
const { getMarkdownContent } = require('../utils/markdownLoader');

// Search endpoint
router.get('/', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.json([]);
    }

    try {
        const sql = `
            SELECT name, 'brigades' AS type, id FROM brigades WHERE name LIKE ?
            UNION
            SELECT name, 'detachments' AS type, id FROM detachments WHERE name LIKE ?
            UNION
            SELECT name, 'divisions' AS type, id FROM divisions WHERE name LIKE ?
            UNION
            SELECT name, 'corps' AS type, id FROM corps WHERE name LIKE ?
            UNION
            SELECT name, 'battles' AS type, id FROM battles WHERE name LIKE ?
            LIMIT 10
        `;
        const [results] = await pool.query(sql, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);
        res.json(results);
    } catch (error) {
        console.error('Error fetching search results:', error);
        res.status(500).send('Error fetching search results');
    }
});

// Fetch details of a specific item
router.get('/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    
    // Define queries for each type to avoid SQL injection
    const typeQueries = {
        brigades: `SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM brigades WHERE id = ?`,
        detachments: `SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM detachments WHERE id = ?`,
        divisions: `SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM divisions WHERE id = ?`,
        corps: `SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM corps WHERE id = ?`,
        battles: `SELECT id, name, place, start_date, end_date, description, ST_AsText(location) AS location, wikipedia_url FROM battles WHERE id = ?`
    };

    // Map type to asset folder
    const assetFolders = {
        brigades: 'brigades',
        detachments: 'detachments',
        divisions: 'divisions',
        corps: 'corps',
        battles: 'battles'
    };

    const query = typeQueries[type];
    if (!query) {
        return res.status(400).send('Invalid type');
    }

    try {
        const [results] = await pool.query(query, [id]);

        if (results.length === 0) {
            return res.status(404).send('Item not found');
        }

        const item = results[0];

        // Load markdown content if description is a filename
        if (item.description && item.description.endsWith('.md')) {
            const filePath = path.join(__dirname, '../../public', 'assets', assetFolders[type], item.description);
            item.description = await getMarkdownContent(filePath);
        }

        res.json(item);
    } catch (error) {
        console.error('Error fetching item details:', error);
        res.status(500).send('Error fetching item details');
    }
});

module.exports = router;
