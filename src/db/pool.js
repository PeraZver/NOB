/**
 * pool.js - This file is part of the NOB web project.
 * 
 * Database connection pool configuration using mysql2/promise.
 * Provides a shared connection pool for all database operations.
 * 
 * Created: 02/2026
 * Authors: Pero & Github Copilot
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nob',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
