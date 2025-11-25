const express = require('express');
const router = express.Router();
const { getMilitaryUnits, getMilitaryUnitById } = require('../controllers/militaryUnitsController');

// Configuration for different unit types
const UNIT_TYPES = {
    brigades: { tableName: 'brigades', assetFolder: 'brigades' },
    detachments: { tableName: 'detachments', assetFolder: 'detachments' },
    divisions: { tableName: 'divisions', assetFolder: 'divisions' },
    corps: { tableName: 'corps', assetFolder: 'corps' }
};

/**
 * Generic route handler factory for military units
 */
function createUnitRoutes(unitType, config) {
    // Get all units
    router.get(`/${unitType}`, async (req, res) => {
        try {
            const units = await getMilitaryUnits(config.tableName, config.assetFolder);
            res.json(units);
        } catch (error) {
            res.status(500).send(`Error fetching ${unitType}`);
        }
    });

    // Get single unit by ID
    router.get(`/${unitType}/:id`, async (req, res) => {
        try {
            const unit = await getMilitaryUnitById(config.tableName, req.params.id);
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

// Register routes for all unit types
Object.entries(UNIT_TYPES).forEach(([unitType, config]) => {
    createUnitRoutes(unitType, config);
});

module.exports = router;
