const express = require('express');
const router = express.Router();
const config = require('../config/config');
const { getMilitaryUnits, getMilitaryUnitById } = require('../controllers/militaryUnitsController');

/**
 * Generic route handler factory for military units
 */
function createUnitRoutes(unitType, unitConfig) {
    // Get all units
    router.get(`/${unitType}`, async (req, res) => {
        try {
            const units = await getMilitaryUnits(unitConfig.tableName, unitConfig.assetFolder);
            res.json(units);
        } catch (error) {
            res.status(500).send(`Error fetching ${unitType}`);
        }
    });

    // Get single unit by ID
    router.get(`/${unitType}/:id`, async (req, res) => {
        try {
            const unit = await getMilitaryUnitById(unitConfig.tableName, req.params.id);
            if (!unit) {
                res.status(404).send(`${unitType} not found`);
                return;
            }
            res.json(unit);
        } catch (error) {
            res.status(500).send(`Error fetching ${unitType}`);
        }
    });
}

// Register routes for all unit types from config
Object.entries(config.unitTypes).forEach(([unitType, unitConfig]) => {
    createUnitRoutes(unitType, unitConfig);
});

module.exports = router;
