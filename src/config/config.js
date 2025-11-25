/**
 * config.js - This file is part of the NOB web project.
 * 
 * Centralized configuration management for the application. Contains server settings,
 * database connection parameters, path configurations, and military unit type definitions.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
    // Server configuration
    server: {
        port: process.env.PORT || 3000
    },
    
    // Database configuration
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 10000
    },
    
    // Paths configuration
    paths: {
        public: path.join(__dirname, '../../public'),
        assets: path.join(__dirname, '../../public/assets')
    },
    
    // Military unit types configuration
    unitTypes: {
        brigades: { tableName: 'brigades', assetFolder: 'brigades' },
        detachments: { tableName: 'detachments', assetFolder: 'detachments' },
        divisions: { tableName: 'divisions', assetFolder: 'divisions' },
        corps: { tableName: 'corps', assetFolder: 'corps' }
    }
};
