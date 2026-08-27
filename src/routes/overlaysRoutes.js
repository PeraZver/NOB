/**
 * overlaysRoutes.js - This file is part of the NOB web project.
 *
 * API routes for persisting calibrated overlay bounds from the Overlay Helper
 * tool back into the battle overlays and free-territories JSON manifests.
 *
 * Created: 08/2026
 * Authors: Pero & Github Copilot
 */

const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const router = express.Router();

const BATTLE_OVERLAYS_FILE = path.join(__dirname, '../../public/assets/battles/overlays.json');
const FREE_TERRITORIES_FILE = path.join(__dirname, '../../public/assets/territory/free-territories.json');

const OVERLAY_FIELDS = ['name', 'imageUrl', 'imageBounds', 'opacity', 'contrast', 'zIndex'];

function isValidBounds(bounds) {
    return Array.isArray(bounds) && bounds.length === 2 &&
        bounds.every((pair) => Array.isArray(pair) && pair.length === 2 && pair.every((n) => Number.isFinite(Number(n))));
}

function pickOverlayFields(body) {
    const fields = {};
    OVERLAY_FIELDS.forEach((key) => {
        if (body[key] !== undefined) {
            fields[key] = body[key];
        }
    });
    return fields;
}

async function readManifest(filePath) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const overlays = Array.isArray(parsed) ? parsed : parsed.overlays;
    if (!Array.isArray(overlays)) {
        throw new Error('Manifest file does not contain an overlays array.');
    }
    return { parsed, overlays };
}

async function writeManifest(filePath, parsed, overlays) {
    const output = Array.isArray(parsed) ? overlays : { ...parsed, overlays };
    await fs.writeFile(filePath, JSON.stringify(output, null, 2) + '\n', 'utf8');
}

// POST /api/overlays/battles - upsert a calibrated overlay for a battle by battleId
router.post('/battles', async (req, res) => {
    const battleId = Number(req.body.battleId);
    const imageBounds = req.body.imageBounds;

    if (!Number.isFinite(battleId)) {
        return res.status(400).json({ error: 'battleId must be a number.' });
    }
    if (!req.body.imageUrl || !isValidBounds(imageBounds)) {
        return res.status(400).json({ error: 'imageUrl and a valid imageBounds are required.' });
    }

    try {
        const { parsed, overlays } = await readManifest(BATTLE_OVERLAYS_FILE);
        const fields = pickOverlayFields(req.body);
        const index = overlays.findIndex((entry) => Number(entry.battleId) === battleId);

        if (index >= 0) {
            overlays[index] = { ...overlays[index], ...fields, battleId };
        } else {
            overlays.push({ battleId, ...fields });
        }

        await writeManifest(BATTLE_OVERLAYS_FILE, parsed, overlays);
        res.json({ success: true, overlay: index >= 0 ? overlays[index] : overlays[overlays.length - 1] });
    } catch (error) {
        console.error('Failed to update battle overlays manifest:', error);
        res.status(500).json({ error: 'Failed to update battle overlays manifest.' });
    }
});

// POST /api/overlays/free-territories - upsert a calibrated overlay by id
router.post('/free-territories', async (req, res) => {
    const id = req.body.id ? String(req.body.id).trim() : '';
    const imageBounds = req.body.imageBounds;

    if (!id) {
        return res.status(400).json({ error: 'id is required.' });
    }
    if (!req.body.imageUrl || !isValidBounds(imageBounds)) {
        return res.status(400).json({ error: 'imageUrl and a valid imageBounds are required.' });
    }

    try {
        const { parsed, overlays } = await readManifest(FREE_TERRITORIES_FILE);
        const fields = pickOverlayFields(req.body);
        const index = overlays.findIndex((entry) => String(entry.id) === id);

        if (index >= 0) {
            overlays[index] = { ...overlays[index], ...fields, id };
        } else {
            overlays.push({ id, ...fields });
        }

        await writeManifest(FREE_TERRITORIES_FILE, parsed, overlays);
        res.json({ success: true, overlay: index >= 0 ? overlays[index] : overlays[overlays.length - 1] });
    } catch (error) {
        console.error('Failed to update free territories manifest:', error);
        res.status(500).json({ error: 'Failed to update free territories manifest.' });
    }
});

module.exports = router;
