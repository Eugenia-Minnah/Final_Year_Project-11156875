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

const app = express();

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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);

// Simple health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve uploaded hostel photos at /uploads/hostels/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the frontend folder as static files, so the whole site runs
// from ONE server at http://localhost:5000 (simplest setup for beginners).
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Smart Hostel Finder server running at http://localhost:${PORT}`);
});
