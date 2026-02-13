/**
 * crimesRoutes.js - This file is part of the NOB web project.
 * 
 * API routes for war crimes. Handles GET requests for crime data.
 * 
 * Created: 02/2026
 * Authors: Pero & Github Copilot
 */

const express = require('express');
const router = express.Router();
const { getCrimes, getCrimeById } = require('../controllers/crimesController');

/**
 * Get all crimes
 * GET /api/crimes
 */
router.get('/crimes', async (req, res) => {
    try {
        const crimes = await getCrimes();
        res.json(crimes);
    } catch (error) {
        console.error('Error fetching crimes:', error);
        res.status(500).json({ error: 'Error fetching crimes' });
    }
});

/**
 * Get a single crime by ID
 * GET /api/crimes/:id
 */
router.get('/crimes/:id', async (req, res) => {
    try {
        const crimeId = parseInt(req.params.id, 10);
        
        if (isNaN(crimeId)) {
            return res.status(400).json({ error: 'Invalid crime ID' });
        }
        
        const crime = await getCrimeById(crimeId);
        
        if (!crime) {
            return res.status(404).json({ error: 'Crime not found' });
        }
        
        res.json(crime);
    } catch (error) {
        console.error('Error fetching crime:', error);
        res.status(500).json({ error: 'Error fetching crime' });
    }
});

module.exports = router;
