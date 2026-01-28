/**
 * campaignsRoutes.js - This file is part of the NOB web project.
 * 
 * API routes for campaigns. Handles GET requests for brigade campaigns.
 * 
 * Created: 01/2026
 * Authors: Pero & Github Copilot
 */

const express = require('express');
const router = express.Router();
const { getCampaignsByBrigade } = require('../controllers/campaignsController');

/**
 * Get all campaigns for a specific brigade
 * GET /api/campaigns/brigade/:brigadeId
 */
router.get('/campaigns/brigade/:brigadeId', async (req, res) => {
    try {
        const brigadeId = parseInt(req.params.brigadeId, 10);
        
        if (isNaN(brigadeId)) {
            return res.status(400).json({ error: 'Invalid brigade ID' });
        }
        
        const campaigns = await getCampaignsByBrigade(brigadeId);
        res.json(campaigns);
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ error: 'Error fetching campaigns' });
    }
});

module.exports = router;
