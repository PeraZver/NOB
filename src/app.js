/**
 * app.js - This file is part of the NOB web project.
 * 
 * Main application entry point for the Express server. Handles server setup,
 * middleware configuration, route registration, and server initialization.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

const express = require('express');
const config = require('./config/config');

const app = express();
const port = config.server.port;

// Middleware to parse JSON
// Review saves can include large movement arrays, so allow larger payloads.
app.use(express.json({ limit: '10mb' }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(config.paths.public));

// Import routes
const militaryUnitsRoutes = require('./routes/militaryUnitsRoutes');
const searchRoutes = require('./routes/searchRoutes');
const battlesRoutes = require('./routes/battlesRoutes');
const campaignsRoutes = require('./routes/campaignsRoutes');
const crimesRoutes = require('./routes/crimesRoutes');
const extractorRoutes = require('./routes/extractorRoutes');

// Register routes
app.use('/api', militaryUnitsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', battlesRoutes);
app.use('/api', campaignsRoutes);
app.use('/api', crimesRoutes);
app.use('/api', extractorRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
