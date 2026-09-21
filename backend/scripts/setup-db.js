// Language: JavaScript (Node.js)
// Automated database initialization script for Smart Hostel Finder.
// Executes canonical database/schema.sql and database/seed.sql.
//
// Run from the backend folder with: npm run db:setup

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function setupDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set in backend/.env.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');

  if (!fs.existsSync(schemaPath) || !fs.existsSync(seedPath)) {
    console.error('ERROR: Could not locate schema.sql or seed.sql in the database folder.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log('Connecting to PostgreSQL database...');
    console.log('1. Applying canonical schema (database/schema.sql)...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('   ✓ Schema applied successfully.');

    console.log('2. Applying canonical seed data (database/seed.sql)...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    console.log('   ✓ Seed data applied successfully.');

    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM regions) AS regions,
        (SELECT COUNT(*) FROM universities) AS universities,
        (SELECT COUNT(*) FROM campuses) AS campuses,
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM hostels) AS hostels,
        (SELECT COUNT(*) FROM rooms) AS rooms;
    `);

    const s = stats.rows[0];
    console.log('\n=============================================');
    console.log('Database setup complete! Verified contents:');
    console.log(` - Regions:       ${s.regions}`);
    console.log(` - Universities:  ${s.universities}`);
    console.log(` - Campuses:      ${s.campuses}`);
    console.log(` - Users:         ${s.users} (Test passwords: "password123")`);
    console.log(` - Real Hostels:  ${s.hostels}`);
    console.log(` - Room Tiers:    ${s.rooms}`);
    console.log('=============================================\n');
  } catch (err) {
    console.error('\nDatabase setup failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
