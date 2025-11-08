const express = require('express');
const router = express.Router();
const pool = require('../db/pool'); // Database connection pool

// Search endpoint
router.get('/', async (req, res) => {
	const query = req.query.q;
	if (!query) {
		return res.json([]);
	}

	try {
		const sql = `
			SELECT name
			FROM (
				SELECT name FROM brigades
				UNION
				SELECT name FROM detachments
				UNION
				SELECT name FROM divisions
				UNION
				SELECT name FROM corps
			) AS units
			WHERE name LIKE ?
			LIMIT 10
		`;
		const [results] = await pool.query(sql, [`%${query}%`]);
		res.json(results);
	} catch (error) {
		console.error('Error fetching search results:', error);
		res.status(500).send('Error fetching search results');
	}
});

module.exports = router;
