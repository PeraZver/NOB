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

// Get all crimes
router.get('/crimes', async (req, res) => {
    try {
        const crimes = await getCrimes();
        res.json(crimes);
    } catch (error) {
        res.status(500).send('Error fetching crimes');
    }
});

// Get single crime by ID
router.get('/crimes/:id', async (req, res) => {
    try {
        const crime = await getCrimeById(req.params.id);
        if (!crime) {
            res.status(404).send('Crime not found');
            return;
        }
        res.json(crime);
    } catch (error) {
        res.status(500).send('Error fetching crime');
    }
});

module.exports = router;
