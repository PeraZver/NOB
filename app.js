const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000, // 10 seconds timeout
    debug: false           // Set to true for detailed logs
});

// Middleware to parse JSON
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
    res.send('Hello, Node.js with MySQL!');
});

// Route to fetch all brigades
app.get('/brigades', (req, res) => {
    const query = 'SELECT * FROM brigades';
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching brigades:', err);
            res.status(500).send('Error fetching brigades');
            return;
        }
        res.json(results);
    });
});

// Route to fetch a brigade by ID
app.get('/brigades/:id', (req, res) => {
    const query = 'SELECT * FROM brigades WHERE id = ?';
    const brigadeId = req.params.id;
    pool.query(query, [brigadeId], (err, results) => {
        if (err) {
            console.error('Error fetching brigade:', err);
            res.status(500).send('Error fetching brigade');
            return;
        }
        if (results.length === 0) {
            res.status(404).send('Brigade not found');
            return;
        }
        res.json(results[0]);
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
