// Language: JavaScript (Node.js / Express)
// Handles: creating an account, signing in, and returning the logged-in user.

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/mailer');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password, role, phone, homeCampusId } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email and password are required.' });
    }

    const allowedRoles = ['student', 'owner'];
    const finalRole = allowedRoles.includes(role) ? role : 'student';
    // Only students have a "home campus" — ignore it if an owner sent one
    const campusToSave = finalRole === 'student' && homeCampusId ? homeCampusId : null;

    // Check for existing account
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone, home_campus_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, role, created_at`,
      [fullName, email, passwordHash, finalRole, phone || null, campusToSave]
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
    `SELECT u.id, u.full_name, u.email, u.role, u.phone, u.created_at, u.home_campus_id,
            c.name AS campus_name, uni.name AS university_name, r.name AS region_name
     FROM users u
     LEFT JOIN campuses c ON c.id = u.home_campus_id
     LEFT JOIN universities uni ON uni.id = c.university_id
     LEFT JOIN regions r ON r.id = c.region_id
     WHERE u.id = $1`,
    [req.user.id]
  );
  res.json(result.rows[0]);
});

// PUT /api/auth/me — self-service profile edit. Email is intentionally
// NOT editable here (changing it would need re-verification, which is
// out of scope) — only name, phone, and (for students) home campus.
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { fullName, phone, homeCampusId } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    // Only students have a home campus — ignore the field entirely for
    // owners/admins, same rule as at signup.
    const campusToSave = req.user.role === 'student' && homeCampusId ? homeCampusId : null;

    const result = await pool.query(
      `UPDATE users SET full_name = $1, phone = $2, home_campus_id = $3
       WHERE id = $4
       RETURNING id, full_name, email, role, phone, home_campus_id`,
      [fullName.trim(), phone || null, campusToSave, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update your profile.' });
  }
});

// PUT /api/auth/change-password — requires knowing the CURRENT password
// (different from the forgot-password flow, which is for when you don't).
router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are both required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const matches = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Your current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: 'Password updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not change your password.' });
  }
});

// POST /api/auth/forgot-password
// Requests a reset link. Sends a real email via Gmail SMTP if EMAIL_USER/
// EMAIL_APP_PASSWORD are set in .env — otherwise falls back to printing
// the link to this terminal, exactly like before, so reset still works
// during local development without needing email configured.
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    // Always respond the same way whether or not the email exists —
    // this prevents strangers from using this form to find out who has an account.
    const genericMessage = 'If an account with that email exists, a reset link has been generated.';

    if (result.rows.length === 0) {
      return res.json({ message: genericMessage });
    }

    const userId = result.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, userId]
    );

    const resetLink = `http://localhost:${process.env.PORT || 5000}/reset-password.html?token=${token}`;

    let emailSent = false;
    try {
      emailSent = await sendPasswordResetEmail(email, resetLink);
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr.message);
    }

    if (!emailSent) {
      console.log('\nPassword reset requested for', email);
      console.log('Email not sent (not configured, or sending failed) — reset link:', resetLink, '\n');
    }

    res.json({ message: genericMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    const result = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    const userId = result.rows[0].id;
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, userId]
    );

    res.json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
