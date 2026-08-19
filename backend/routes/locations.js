// Language: JavaScript (Node.js / Express)
// Powers the cascading Region -> University -> Campus dropdowns.
// Fixed design: a university is NOT locked to one region. Instead, each
// CAMPUS has its own region, so "University of Ghana" can correctly show
// up under both Greater Accra (Legon) and Ashanti (Kumasi City Campus).

const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/locations/regions
router.get('/regions', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM regions ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load regions.' });
  }
});

// GET /api/locations/universities?regionId=1
// Only returns universities that actually HAVE a campus in this region —
// never a university's full list regardless of location.
router.get('/universities', async (req, res) => {
  try {
    const { regionId } = req.query;
    if (!regionId) {
      return res.status(400).json({ error: 'regionId is required.' });
    }
    const result = await pool.query(
      `SELECT DISTINCT u.id, u.name, u.abbreviation
       FROM universities u
       JOIN campuses c ON c.university_id = u.id
       WHERE c.region_id = $1
       ORDER BY u.name`,
      [regionId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load universities.' });
  }
});

// GET /api/locations/campuses?universityId=1&regionId=2
// Requires BOTH — a campus dropdown only makes sense once you know which
// university AND which region the visitor is asking about. This is what
// stops Ashanti campuses appearing while Greater Accra is selected.
router.get('/campuses', async (req, res) => {
  try {
    const { universityId, regionId } = req.query;
    if (!universityId || !regionId) {
      return res.status(400).json({ error: 'universityId and regionId are both required.' });
    }
    const result = await pool.query(
      `SELECT id, name, city, latitude, longitude
       FROM campuses
       WHERE university_id = $1 AND region_id = $2
       ORDER BY name`,
      [universityId, regionId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load campuses.' });
  }
});

module.exports = router;
