// Language: JavaScript (Node.js)
// Sets up a reusable connection pool to the PostgreSQL database.

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
  process.exit(1);
});

module.exports = pool;
