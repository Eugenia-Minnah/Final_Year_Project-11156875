// Language: JavaScript (Node.js / Express)
// Handles: a student booking a room (with a deposit), viewing their own
// bookings, and cancelling one.

const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { initializePayment, verifyPayment } = require('../utils/paystack');

const router = express.Router();

// POST /api/bookings — student books a room. Deposit is 10% of the room's
// yearly price, rounded to the nearest cedi — a simple, transparent rule.
router.post('/', requireAuth, requireRole('student'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { roomId } = req.body;
    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required.' });
    }

    await client.query('BEGIN');

    const roomResult = await client.query('SELECT * FROM rooms WHERE id = $1 FOR UPDATE', [roomId]);
    if (roomResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Room not found.' });
    }
    const room = roomResult.rows[0];

    if (room.available_units <= 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This room type is fully booked.' });
    }

    // Use the owner's own deposit amount if they set one for this room type;
    // otherwise fall back to a simple 10% default so bookings always have
    // a sensible deposit figure even for older listings.
    const depositAmount = room.deposit_amount != null
      ? Number(room.deposit_amount)
      : Math.round(Number(room.price_per_year) * 0.1);

    const bookingResult = await client.query(
      `INSERT INTO bookings (student_id, room_id, status, deposit_amount)
       VALUES ($1, $2, 'pending', $3)
       RETURNING *`,
      [req.user.id, roomId, depositAmount]
    );

    await client.query('UPDATE rooms SET available_units = available_units - 1 WHERE id = $1', [roomId]);

    await client.query('COMMIT');
    res.status(201).json(bookingResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not create booking.' });
  } finally {
    client.release();
  }
});

// GET /api/bookings/mine — the signed-in student's own bookings
router.get('/mine', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.status, b.deposit_amount, b.created_at, b.payment_status, b.payment_reference,
              r.room_type, r.price_per_year,
              h.id AS hostel_id, h.name AS hostel_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN hostels h ON h.id = r.hostel_id
       WHERE b.student_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load your bookings.' });
  }
});

// POST /api/bookings/:id/cancel — a student cancels their own booking,
// freeing up the room unit again.
router.post('/:id/cancel', requireAuth, requireRole('student'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const bookingResult = await client.query('SELECT * FROM bookings WHERE id = $1 AND student_id = $2 FOR UPDATE', [id, req.user.id]);
    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found.' });
    }
    const booking = bookingResult.rows[0];

    if (booking.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This booking is already cancelled.' });
    }

    await client.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [id]);
    await client.query('UPDATE rooms SET available_units = available_units + 1 WHERE id = $1', [booking.room_id]);

    await client.query('COMMIT');
    res.json({ message: 'Booking cancelled.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not cancel booking.' });
  } finally {
    client.release();
  }
});

// POST /api/bookings/:id/pay — starts a real Paystack payment for this
// booking's deposit (card or Mobile Money — Paystack's hosted checkout
// offers both automatically for GHS). Returns a URL to redirect the
// student to.
router.post('/:id/pay', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const { id } = req.params;

    const bookingResult = await pool.query(
      `SELECT b.*, u.email FROM bookings b JOIN users u ON u.id = b.student_id
       WHERE b.id = $1 AND b.student_id = $2`,
      [id, req.user.id]
    );
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    const booking = bookingResult.rows[0];

    if (booking.payment_status === 'paid') {
      return res.status(400).json({ error: 'This booking has already been paid for.' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'This booking has been cancelled — you cannot pay for it.' });
    }

    // A fresh reference each time, so retrying payment after a failed
    // attempt doesn't collide with the earlier one.
    const reference = 'shf_' + crypto.randomBytes(10).toString('hex');
    const amountInPesewas = Math.round(Number(booking.deposit_amount) * 100);
    const callbackUrl = `http://localhost:${process.env.PORT || 5000}/payment-callback.html`;

    const payment = await initializePayment({
      email: booking.email,
      amountInPesewas,
      reference,
      callbackUrl,
    });

    await pool.query('UPDATE bookings SET payment_reference = $1 WHERE id = $2', [reference, id]);

    res.json({ authorizationUrl: payment.authorization_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Could not start payment.' });
  }
});

// GET /api/bookings/verify/:reference — confirms a payment with Paystack
// directly (never trusts the frontend redirect alone) and marks the
// booking as paid/confirmed if it genuinely succeeded.
router.get('/verify/:reference', requireAuth, async (req, res) => {
  try {
    const { reference } = req.params;

    const bookingResult = await pool.query(
      `SELECT b.*, r.room_type, h.name AS hostel_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN hostels h ON h.id = r.hostel_id
       WHERE b.payment_reference = $1 AND b.student_id = $2`,
      [reference, req.user.id]
    );
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'No booking found for this payment reference.' });
    }
    const booking = bookingResult.rows[0];

    const verification = await verifyPayment(reference);

    if (verification.status === 'success') {
      await pool.query(
        "UPDATE bookings SET payment_status = 'paid', paid_at = NOW(), status = 'confirmed' WHERE id = $1",
        [booking.id]
      );
      return res.json({ success: true, hostelName: booking.hostel_name, roomType: booking.room_type });
    }

    await pool.query("UPDATE bookings SET payment_status = 'failed' WHERE id = $1", [booking.id]);
    res.json({ success: false, message: 'Payment was not successful.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Could not verify payment.' });
  }
});

module.exports = router;
