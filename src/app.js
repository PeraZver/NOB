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

// Register routes
app.use('/api', militaryUnitsRoutes);
app.use('/api/search', searchRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
