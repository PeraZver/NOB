/**
 * battlesRoutes.js - This file is part of the NOB web project.
 * 
 * API routes for battles. Handles GET requests for battle data.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

const express = require('express');
const router = express.Router();
const { getBattles, getBattleById } = require('../controllers/battlesController');

// Get all battles
router.get('/battles', async (req, res) => {
    try {
        const battles = await getBattles();
        res.json(battles);
    } catch (error) {
        res.status(500).send('Error fetching battles');
    }
});

// Get single battle by ID
router.get('/battles/:id', async (req, res) => {
    try {
        const battle = await getBattleById(req.params.id);
        if (!battle) {
            res.status(404).send('Battle not found');
            return;
        }
        res.json(battle);
    } catch (error) {
        res.status(500).send('Error fetching battle');
    }
});

module.exports = router;
