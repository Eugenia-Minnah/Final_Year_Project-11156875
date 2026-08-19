// Language: JavaScript (Node.js / Express)
// This is the entry point of the backend. Run it with: npm start

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const hostelRoutes = require('./routes/hostels');
const locationRoutes = require('./routes/locations');

const app = express();

app.use(cors());              // allows the frontend to call this API
app.use(express.json());      // lets us read JSON from request bodies

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/locations', locationRoutes);

// Simple health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve the frontend folder as static files, so the whole site runs
// from ONE server at http://localhost:5000 (simplest setup for beginners).
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Smart Hostel Finder server running at http://localhost:${PORT}`);
});
