// Language: JavaScript (Node.js / Express)
// This is the entry point of the backend. Run it with: npm start

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const hostelRoutes = require('./routes/hostels');
const locationRoutes = require('./routes/locations');
const bookingRoutes = require('./routes/bookings');
const notificationRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');

const app = express();

// Railway/Render (and most hosts) terminate HTTPS at a reverse proxy and
// forward plain HTTP to this server, setting an X-Forwarded-Proto header
// to say so. Without this, req.protocol always reports 'http' once
// deployed — even on a real https:// site — which would make password
// reset emails and Paystack payment callback links wrongly use http://.
// Harmless locally: there's no proxy in front of localhost, so this has
// no effect there.
app.set('trust proxy', 1);

app.use(cors());              // allows the frontend to call this API
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

// Make sure the folder for uploaded hostel photos exists before anything
// tries to write to it.
const uploadsDir = path.join(__dirname, 'uploads', 'hostels');
fs.mkdirSync(uploadsDir, { recursive: true });
const claimUploadsDir = path.join(__dirname, 'uploads', 'claims');
fs.mkdirSync(claimUploadsDir, { recursive: true });

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// Simple health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve uploaded hostel photos at /uploads/hostels/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the frontend folder as static files, so the whole site runs
// from ONE server at http://localhost:5000 (simplest setup for beginners).
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`HostelScout server running at http://localhost:${PORT}`);
});
