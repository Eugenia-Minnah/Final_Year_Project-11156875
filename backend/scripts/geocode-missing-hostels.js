// Language: JavaScript (Node.js)
// One-time backfill: finds every hostel with an address/city but no
// coordinates, and geocodes it using the same reusable utility the app
// uses everywhere else (backend/utils/geocode.js).
//
// Run it from the backend folder with:
//   node scripts/geocode-missing-hostels.js
//
// Respects Nominatim's usage policy (max ~1 request/second) with a small
// delay between calls, since this may process several hostels in a row.

require('dotenv').config();
const pool = require('../db');
const { geocodeAddress } = require('../utils/geocode');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const result = await pool.query(`
    SELECT h.id, h.name, h.address, h.city, r.name AS region_name
    FROM hostels h
    LEFT JOIN regions r ON r.id = h.region_id
    WHERE h.latitude IS NULL AND (h.address IS NOT NULL OR h.city IS NOT NULL)
    ORDER BY h.id
  `);

  console.log(`Found ${result.rows.length} hostel(s) missing coordinates.\n`);

  let succeeded = 0;
  let failed = 0;

  for (const hostel of result.rows) {
    const addressQuery = [hostel.address, hostel.city, hostel.region_name, 'Ghana'].filter(Boolean).join(', ');
    process.stdout.write(`Geocoding "${hostel.name}" (${addressQuery})... `);

    const geocoded = await geocodeAddress(addressQuery);

    if (geocoded) {
      await pool.query('UPDATE hostels SET latitude = $1, longitude = $2 WHERE id = $3', [
        geocoded.latitude, geocoded.longitude, hostel.id,
      ]);
      console.log(`OK -> ${geocoded.latitude}, ${geocoded.longitude}`);
      succeeded++;
    } else {
      console.log('NOT FOUND — left unset, needs manual location on the map.');
      failed++;
    }

    // Be polite to the free public geocoding service — no more than
    // roughly one request per second.
    await sleep(1100);
  }

  console.log(`\nDone. ${succeeded} geocoded successfully, ${failed} need manual location.`);
  await pool.end();
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
