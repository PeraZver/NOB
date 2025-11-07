const express = require('express');
const mysql = require('mysql2');
const path = require('path');
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
    connectTimeout: 10000
});

// Middleware to parse JSON
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to fetch brigades
app.get('/api/brigades', (req, res) => {
    const query = 'SELECT id, name, formation_date, description, ST_AsText(location) AS location, wikipedia_url FROM brigades';
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching brigades:', err);
            res.status(500).send('Error fetching brigades');
            return;
        }
        res.json(results);
    });
});

// API endpoint to fetch a single brigade by ID
app.get('/api/brigades/:id', (req, res) => {
    const query = 'SELECT id, name, formation_date, description, ST_AsText(location) AS location, wikipedia_url FROM brigades WHERE id = ?';
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

// API endpoint to fetch detachments
app.get('/api/detachments', (req, res) => {
    const query = 'SELECT id, name, formation_date, description, ST_AsText(location) AS location, wikipedia_url FROM detachments';
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching detachments:', err);
            res.status(500).send('Error fetching detachments');
            return;
        }
        res.json(results);
    });
});

// API endpoint to fetch divisions
app.get('/api/divisions', (req, res) => {
    const query = 'SELECT id, name, formation_date, description, ST_AsText(location) AS location, wikipedia_url FROM divisions';
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching divisions:', err);
            res.status(500).send('Error fetching divisions');
            return;
        }
        res.json(results);
    });
});

// API endpoint to fetch corps
app.get('/api/corps', (req, res) => {
    const query = 'SELECT id, name, formation_date, description, ST_AsText(location) AS location, wikipedia_url FROM corps';
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching corps:', err);
            res.status(500).send('Error fetching corps');
            return;
        }
        res.json(results);
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
