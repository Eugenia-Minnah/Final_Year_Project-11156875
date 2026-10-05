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

// For anything an admin needs to act on (a new hostel pending approval, a
// new claim request, a new refund request) — notifies every admin user,
// since there may be more than one.
async function notifyAllAdmins(message, link = null) {
  try {
    const admins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins.rows) {
      await createNotification(admin.id, message, link);
    }
  } catch (err) {
    console.error('Could not notify admins:', err.message);
  }
}

module.exports = { createNotification, notifyAllAdmins };
