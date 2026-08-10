// Language: JavaScript (Node.js / Express)
// Handles: browsing hostels (public), viewing one hostel, and owners adding listings (protected).

const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/hostels?region=Legon&roomType=2 in a room&maxPrice=4000
// Public — anyone can browse without signing in (matches your landing page requirement).
router.get('/', async (req, res) => {
  try {
    const { region, roomType, maxPrice } = req.query;

    let query = `
      SELECT h.id, h.name, h.region, h.address, h.description, h.has_cctv,
             h.has_shuttle, h.nearby_bus_stop, h.is_verified, h.cover_image_url,
             MIN(r.price_per_year) AS from_price
      FROM hostels h
      LEFT JOIN rooms r ON r.hostel_id = h.id
      WHERE 1 = 1
    `;
    const values = [];

    if (region) {
      values.push(region);
      query += ` AND h.region ILIKE $${values.length}`;
    }
    if (roomType) {
      values.push(roomType);
      query += ` AND r.room_type = $${values.length}`;
    }
    if (maxPrice) {
      values.push(maxPrice);
      query += ` AND r.price_per_year <= $${values.length}`;
    }

    query += ' GROUP BY h.id ORDER BY h.is_verified DESC, h.created_at DESC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load hostels.' });
  }
});

// GET /api/hostels/:id  — full detail including rooms and reviews. Public.
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const hostelResult = await pool.query('SELECT * FROM hostels WHERE id = $1', [id]);
    if (hostelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hostel not found.' });
    }

    const roomsResult = await pool.query('SELECT * FROM rooms WHERE hostel_id = $1', [id]);
    const reviewsResult = await pool.query(
      `SELECT r.rating, r.comment, r.created_at, u.full_name
       FROM reviews r JOIN users u ON u.id = r.student_id
       WHERE r.hostel_id = $1 ORDER BY r.created_at DESC`,
      [id]
    );

    res.json({
      ...hostelResult.rows[0],
      rooms: roomsResult.rows,
      reviews: reviewsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load this hostel.' });
  }
});

// POST /api/hostels — protected, only logged-in hostel owners can create a listing.
router.post('/', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { name, region, address, description, hasCctv, hasShuttle, nearbyBusStop } = req.body;

    if (!name || !region) {
      return res.status(400).json({ error: 'Hostel name and region are required.' });
    }

    const result = await pool.query(
      `INSERT INTO hostels (owner_id, name, region, address, description, has_cctv, has_shuttle, nearby_bus_stop)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, name, region, address, description, !!hasCctv, !!hasShuttle, nearbyBusStop]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create hostel listing.' });
  }
});

module.exports = router;
