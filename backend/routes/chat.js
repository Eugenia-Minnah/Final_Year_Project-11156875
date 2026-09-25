const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');

const router = express.Router();

async function getConversationIfAuthorized(conversationId, userId) {
  const result = await pool.query(
    `SELECT c.*, h.name AS hostel_name, h.owner_id AS hostel_owner_id, h.id AS hostel_id,
            u.full_name AS student_name
     FROM conversations c
     JOIN hostels h ON h.id = c.hostel_id
     JOIN users u ON u.id = c.student_id
     WHERE c.id = $1`,
    [conversationId]
  );
  if (result.rows.length === 0) return null;
  const convo = result.rows[0];
  if (convo.student_id !== userId && convo.hostel_owner_id !== userId) return null;
  return convo;
}

router.post('/start', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const { hostelId, message } = req.body;
    if (!hostelId || !message || !message.trim()) {
      return res.status(400).json({ error: 'hostelId and a message are required.' });
    }
    const hostelResult = await pool.query('SELECT id, owner_id, name FROM hostels WHERE id = $1', [hostelId]);
    if (hostelResult.rows.length === 0) return res.status(404).json({ error: 'Hostel not found.' });
    const hostel = hostelResult.rows[0];

    let convoResult = await pool.query(
      'SELECT id FROM conversations WHERE hostel_id = $1 AND student_id = $2',
      [hostelId, req.user.id]
    );
    let conversationId;
    if (convoResult.rows.length > 0) {
      conversationId = convoResult.rows[0].id;
    } else {
      const inserted = await pool.query(
        'INSERT INTO conversations (hostel_id, student_id) VALUES ($1, $2) RETURNING id',
        [hostelId, req.user.id]
      );
      conversationId = inserted.rows[0].id;
    }

    await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3)',
      [conversationId, req.user.id, message.trim()]
    );

    await createNotification(
      hostel.owner_id,
      `New message about "${hostel.name}" from a prospective student.`,
      `owner-inbox.html?conversationId=${conversationId}`
    );

    res.status(201).json({ conversationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not start conversation.' });
  }
});

router.post('/:conversationId/reply', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'A message is required.' });

    const convo = await getConversationIfAuthorized(conversationId, req.user.id);
    if (!convo) return res.status(404).json({ error: 'Conversation not found.' });

    await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3)',
      [conversationId, req.user.id, message.trim()]
    );

    const isStudentSender = req.user.id === convo.student_id;
    const recipientId = isStudentSender ? convo.hostel_owner_id : convo.student_id;
    const recipientLink = isStudentSender
      ? `owner-inbox.html?conversationId=${conversationId}`
      : `student-inbox.html?conversationId=${conversationId}`;

    await createNotification(recipientId, `New message about "${convo.hostel_name}".`, recipientLink);
    res.status(201).json({ message: 'Sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not send message.' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.hostel_id, h.name AS hostel_name,
              c.student_id, u.full_name AS student_name,
              h.owner_id AS hostel_owner_id,
              (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.is_read = FALSE AND m.sender_id != $1) AS unread_count
       FROM conversations c
       JOIN hostels h ON h.id = c.hostel_id
       JOIN users u ON u.id = c.student_id
       WHERE c.student_id = $1 OR h.owner_id = $1
       ORDER BY last_message_at DESC NULLS LAST`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load conversations.' });
  }
});

router.get('/:conversationId/messages', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const convo = await getConversationIfAuthorized(conversationId, req.user.id);
    if (!convo) return res.status(404).json({ error: 'Conversation not found.' });

    const messages = await pool.query(
      `SELECT m.id, m.body, m.sender_id, m.created_at, u.full_name AS sender_name
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1 ORDER BY m.created_at ASC`,
      [conversationId]
    );

    await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND sender_id != $2',
      [conversationId, req.user.id]
    );

    res.json({
      hostelName: convo.hostel_name,
      hostelId: convo.hostel_id,
      studentName: convo.student_name,
      messages: messages.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load messages.' });
  }
});

module.exports = router;
