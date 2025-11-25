/**
 * pool.js - This file is part of the NOB web project.
 * 
 * Database connection pool management using MySQL2. Creates and exports a promise-based
 * connection pool configured from centralized settings.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

const mysql = require('mysql2/promise');
const config = require('../config/config');

// Create a MySQL connection pool
const pool = mysql.createPool(config.database);

module.exports = pool;
