// Language: JavaScript (Node.js / Express)
// Handles: creating an account, signing in, and returning the logged-in user.

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password, role, phone } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email and password are required.' });
    }

    const allowedRoles = ['student', 'owner'];
    const finalRole = allowedRoles.includes(role) ? role : 'student';

    // Check for existing account
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, role, created_at`,
      [fullName, email, passwordHash, finalRole, phone || null]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong while creating your account.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong while signing you in.' });
  }
});

// GET /api/auth/me  (protected — used by the dashboard to confirm who's logged in)
router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT id, full_name, email, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json(result.rows[0]);
});

module.exports = router;
