const mysql = require('mysql2/promise');
const config = require('../config/config');

// Create a MySQL connection pool
const pool = mysql.createPool(config.database);

module.exports = pool;
