const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Updated .env path

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
app.use(express.static(path.join(__dirname, '../public'))); // Updated public folder path

// Helper function to fetch Markdown content
async function getMarkdownContent(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return null; // Return null if the file cannot be read
    }
}

// API endpoint to fetch brigades
app.get('/api/brigades', async (req, res) => {
    const query = 'SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM brigades';
    pool.query(query, async (err, results) => {
        if (err) {
            console.error('Error fetching brigades:', err);
            res.status(500).send('Error fetching brigades');
            return;
        }

        // Fetch Markdown content dynamically
        const brigades = await Promise.all(
            results.map(async (brigade) => {
                if (brigade.description && brigade.description.endsWith('.md')) {
                    const filePath = path.join(__dirname, '../public', 'assets', 'brigades', brigade.description);
                    brigade.description = await getMarkdownContent(filePath);
                }
                return brigade;
            })
        );

        res.json(brigades);
    });
});

// API endpoint to fetch a single brigade by ID
app.get('/api/brigades/:id', (req, res) => {
    const query = 'SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM brigades WHERE id = ?';
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
app.get('/api/detachments', async (req, res) => {
    const query = 'SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM detachments';
    pool.query(query, async (err, results) => {
        if (err) {
            console.error('Error fetching detachments:', err);
            res.status(500).send('Error fetching detachments');
            return;
        }

        // Fetch Markdown content dynamically
        const detachments = await Promise.all(
            results.map(async (detachment) => {
                if (detachment.description && detachment.description.endsWith('.md')) {
                    const filePath = path.join(__dirname, '../public', 'assets', 'detachments', detachment.description);
                    detachment.description = await getMarkdownContent(filePath);
                }
                return detachment;
            })
        );

        res.json(detachments);
    });
});

// API endpoint to fetch divisions
app.get('/api/divisions', async (req, res) => {
    const query = 'SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM divisions';
    pool.query(query, async (err, results) => {
        if (err) {
            console.error('Error fetching divisions:', err);
            res.status(500).send('Error fetching divisions');
            return;
        }

        // Fetch Markdown content dynamically
        const divisions = await Promise.all(
            results.map(async (division) => {
                if (division.description && division.description.endsWith('.md')) {
                    const filePath = path.join(__dirname, '../public', 'assets', 'divisions', division.description);
                    division.description = await getMarkdownContent(filePath);
                }
                return division;
            })
        );

        res.json(divisions);
    });
});

// API endpoint to fetch corps
app.get('/api/corps', async (req, res) => {
    const query = 'SELECT id, name, formation_date, formation_site, description, ST_AsText(location) AS location, wikipedia_url FROM corps';
    pool.query(query, async (err, results) => {
        if (err) {
            console.error('Error fetching corps:', err);
            res.status(500).send('Error fetching corps');
            return;
        }

        // Fetch Markdown content dynamically
        const corps = await Promise.all(
            results.map(async (corpus) => {
                if (corpus.description && corpus.description.endsWith('.md')) {
                    const filePath = path.join(__dirname, '../public', 'assets', 'corps', corpus.description);
                    corpus.description = await getMarkdownContent(filePath);
                }
                return corpus;
            })
        );

        res.json(corps);
    });
});

// Search routes
const searchRoutes = require('./routes/searchRoutes');

// Register routes
app.use('/api/search', searchRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
