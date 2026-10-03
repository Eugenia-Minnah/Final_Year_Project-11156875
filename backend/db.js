// Language: JavaScript (Node.js)
// Sets up a reusable connection pool to the PostgreSQL database.

require('dotenv').config();
const { Pool } = require('pg');

// Hosted Postgres providers (Render, Railway, etc.) require SSL on external
// connections; your local Postgres on localhost does not use SSL at all.
// This switches automatically based on the host in DATABASE_URL, so the
// exact same code works unchanged in both places.
const isLocal = (process.env.DATABASE_URL || '').includes('localhost')
  || (process.env.DATABASE_URL || '').includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
  process.exit(1);
});

module.exports = pool;
