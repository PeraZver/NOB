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
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static(config.paths.public));

// Import routes
const militaryUnitsRoutes = require('./routes/militaryUnitsRoutes');
const searchRoutes = require('./routes/searchRoutes');
const battlesRoutes = require('./routes/battlesRoutes');
const campaignsRoutes = require('./routes/campaignsRoutes');

// Register routes
app.use('/api', militaryUnitsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', battlesRoutes);
app.use('/api', campaignsRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
