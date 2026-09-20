// Language: JavaScript (Node.js)
// A tiny reusable helper: any route that causes something notification-
// worthy (payment confirmed, hostel approved, claim decided, etc.) calls
// this instead of writing its own INSERT.

const pool = require('../db');

async function createNotification(userId, message, link = null) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)',
      [userId, message, link]
    );
  } catch (err) {
    console.error('Could not create notification:', err.message);
  }
}

module.exports = { createNotification };
