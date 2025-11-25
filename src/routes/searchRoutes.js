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
const pool = require('../db/pool'); // Database connection pool

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
            LIMIT 10
        `;
        const [results] = await pool.query(sql, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);
        res.json(results);
    } catch (error) {
        console.error('Error fetching search results:', error);
        res.status(500).send('Error fetching search results');
    }
});

// Fetch details of a specific item
router.get('/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const validTypes = ['brigades', 'detachments', 'divisions', 'corps'];

    if (!validTypes.includes(type)) {
        return res.status(400).send('Invalid type');
    }

    try {
        const query = `
            SELECT id, name, formation_date, description, ST_AsText(location) AS location, wikipedia_url
            FROM ${type}
            WHERE id = ?
        `;
        const [results] = await pool.query(query, [id]);

        if (results.length === 0) {
            return res.status(404).send('Item not found');
        }

        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching item details:', error);
        res.status(500).send('Error fetching item details');
    }
});

module.exports = router;
