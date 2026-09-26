// Language: JavaScript (Node.js / Express)
// Handles: browsing hostels (public), viewing one hostel, and owners adding listings (protected).
//
// KEY DESIGN CHANGE: a hostel is a physical property with its own region,
// city, and coordinates — it is NOT hard-locked to one campus. When a
// campus is selected in search, we calculate real distance (Haversine
// formula) from that campus to every hostel with known coordinates, and
// use that distance to filter/sort/display results — not just region text.

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const pool = require('../db');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');
const { getRoadDistances } = require('../utils/routing');

const router = express.Router();

// ---------- Photo upload configuration ----------
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads', 'hostels'),
    filename: (req, file, cb) => {
      const uniqueName = crypto.randomUUID() + path.extname(file.originalname).toLowerCase();
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per photo
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, or WEBP images are allowed.'));
  },
});

// A hostel this far or closer to the selected campus is treated as "nearby"
// by default. This is NOT a hard restriction — it only applies when a
// campus has been selected as a reference point, and "Explore all hostels"
// (no campus selected) bypasses it entirely. An explicit maxDistanceKm
// filter from the user always overrides this default.
const DEFAULT_SEARCH_RADIUS_KM = 15;

// ---------- Distance helper ----------
// (Straight-line fallback math now lives in utils/routing.js, used only
// when the real road-routing service is unreachable.)


async function getCampusById(campusId) {
  if (!campusId) return null;
  const result = await pool.query(
    `SELECT c.id, c.name, c.city, c.latitude, c.longitude, u.name AS university_name, r.name AS region_name
     FROM campuses c
     JOIN universities u ON u.id = c.university_id
     JOIN regions r ON r.id = c.region_id
     WHERE c.id = $1`,
    [campusId]
  );
  return result.rows[0] || null;
}

// Attaches h.distance_km (real road distance, via OSRM) to every hostel
// that has coordinates, relative to `fromCampus`. Falls back to
// straight-line automatically (inside getRoadDistances) if the routing
// service is unreachable. h._drivingMinutes is stashed alongside so
// estimateTravelTimes() below can use the REAL driving time instead of
// guessing one from the distance.
async function attachDistances(hostels, fromCampus) {
  if (!fromCampus || !fromCampus.latitude) return hostels;

  const points = hostels.map(h =>
    h.latitude && h.longitude ? { latitude: h.latitude, longitude: h.longitude } : null
  );
  const routeResults = await getRoadDistances(
    { latitude: fromCampus.latitude, longitude: fromCampus.longitude },
    points
  );

  return hostels.map((h, i) => {
    const route = routeResults[i];
    if (!route) return h;
    return { ...h, distance_km: route.distanceKm, _drivingMinutes: route.drivingMinutes };
  });
}

// hostelWithDistance must already have gone through attachDistances().
// Driving time comes straight from the real route when available;
// walking time is still an estimate (5 km/h), but now based on the real
// road distance rather than a straight line, so it's closer to reality too.
function estimateTravelTimes(hostelWithDistance) {
  if (hostelWithDistance.distance_km == null) return null;
  const walkingMinutes = Math.round((hostelWithDistance.distance_km / 5) * 60);
  const drivingMinutes = hostelWithDistance._drivingMinutes != null
    ? hostelWithDistance._drivingMinutes
    : Math.round((hostelWithDistance.distance_km / 25) * 60);
  return { walkingMinutes, drivingMinutes };
}

const FEATURE_COLUMNS = {
  cctv: 'has_cctv',
  security: 'has_security_guard',
  shuttle: 'has_shuttle',
  water: 'has_water_supply',
  electricity: 'has_electricity_backup',
  wifi: 'has_wifi',
  parking: 'has_parking',
};

// GET /api/hostels
// Query params (all optional):
//   regionId, universityId, campusId  — campusId is a DISTANCE REFERENCE
//                                        POINT, never a hard filter. Plain
//                                        regionId (no campus) is a genuine
//                                        "browse this region" filter.
//   roomType, minPrice, maxPrice, availability, features — normal filters
//   maxDistanceKm — explicit override of the default 15km radius
//   sort — recommended (default) | closest | farthest | price_low | price_high | rating | availability
//   featured — "true" restricts to the small curated landing-page selection
//   limit — caps the number of results (used by the landing page only)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      regionId, universityId, campusId,
      roomType, minPrice, maxPrice, availability, maxDistanceKm,
      features, sort, featured, limit, page, pageSize,
    } = req.query;

    const referenceCampus = await getCampusById(campusId);

    let query = `
      SELECT h.id, h.name, h.address, h.city, h.description,
             h.has_cctv, h.has_security_guard, h.has_shuttle,
             h.has_water_supply, h.has_electricity_backup, h.has_wifi, h.has_parking,
             h.nearby_bus_stop, h.is_verified, h.cover_image_url, h.latitude, h.longitude,
             r.name AS region_name,
             MIN(rm.price_per_year) AS from_price,
             COALESCE(SUM(rm.available_units), 0) AS total_available_units,
             COALESCE(AVG(rv.rating), 0) AS avg_rating
      FROM hostels h
      LEFT JOIN regions r  ON r.id = h.region_id
      LEFT JOIN rooms rm   ON rm.hostel_id = h.id
      LEFT JOIN reviews rv ON rv.hostel_id = h.id
      WHERE 1 = 1
    `;
    const values = [];

    // FIX: when a campus is selected, we deliberately do NOT filter by
    // region here — a hostel's relevance to a campus is decided purely by
    // real distance (calculated below), never by whether its region label
    // happens to match the campus's region. This is what lets one physical
    // hostel correctly appear in searches from multiple different
    // universities/campuses, each with its own recalculated distance.
    // (Previously this filtered by "AND r.name = campus's region", which
    // incorrectly hid hostels close to a campus but labeled a different region.)
    //
    // A plain regionId filter (no campus selected) is a different, genuine
    // "browse this region" action, so that one still filters directly.
    if (!referenceCampus && regionId) {
      values.push(regionId);
      query += ` AND h.region_id = $${values.length}`;
    }

    if (featured === 'true') {
      query += ' AND h.featured = TRUE';
    }

    if (roomType) {
      values.push(roomType);
      query += ` AND EXISTS (SELECT 1 FROM rooms rm2 WHERE rm2.hostel_id = h.id AND rm2.room_type = $${values.length})`;
    }
    if (minPrice) {
      values.push(minPrice);
      query += ` AND EXISTS (SELECT 1 FROM rooms rm3 WHERE rm3.hostel_id = h.id AND rm3.price_per_year >= $${values.length})`;
    }
    if (maxPrice) {
      values.push(maxPrice);
      query += ` AND EXISTS (SELECT 1 FROM rooms rm4 WHERE rm4.hostel_id = h.id AND rm4.price_per_year <= $${values.length})`;
    }
    if (features) {
      const requested = features.split(',').map(f => f.trim()).filter(Boolean);
      requested.forEach(f => {
        const column = FEATURE_COLUMNS[f];
        if (column) query += ` AND h.${column} = TRUE`;
      });
    }

    query += ' GROUP BY h.id, r.name';

    if (availability === 'available') query += ' HAVING COALESCE(SUM(rm.available_units), 0) > 3';
    else if (availability === 'limited') query += ' HAVING COALESCE(SUM(rm.available_units), 0) BETWEEN 1 AND 3';
    else if (availability === 'full') query += ' HAVING COALESCE(SUM(rm.available_units), 0) = 0';

    const result = await pool.query(query, values);
    let hostels = await attachDistances(result.rows, referenceCampus);

    // Radius applies ONLY when a campus was actually selected as a
    // reference point — this is personalization/ranking, not restriction.
    // With no campus selected, every hostel matching the other filters is
    // returned unrestricted ("Explore all hostels").
    if (referenceCampus) {
      const radius = maxDistanceKm ? Number(maxDistanceKm) : DEFAULT_SEARCH_RADIUS_KM;
      hostels = hostels.filter(h => h.distance_km === undefined || h.distance_km <= radius);
    }

    const sortKey = sort || 'recommended';
    hostels.sort((a, b) => {
      switch (sortKey) {
        case 'closest':
          return (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity);
        case 'farthest':
          return (b.distance_km ?? -Infinity) - (a.distance_km ?? -Infinity);
        case 'price_low':
          return (a.from_price ?? Infinity) - (b.from_price ?? Infinity);
        case 'price_high':
          return (b.from_price ?? -Infinity) - (a.from_price ?? -Infinity);
        case 'rating':
          return Number(b.avg_rating) - Number(a.avg_rating);
        case 'availability':
          return Number(b.total_available_units) - Number(a.total_available_units);
        case 'recommended':
        default: {
          if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
          const distDiff = (a.distance_km ?? 999) - (b.distance_km ?? 999);
          if (distDiff !== 0) return distDiff;
          return Number(b.total_available_units) - Number(a.total_available_units);
        }
      }
    });

    // Applied last, after sorting — so a limited landing-page request still
    // gets the BEST N results (verified + closest first), not an arbitrary
    // first N before ranking.
    if (limit) {
      hostels = hostels.slice(0, Number(limit));
    }

    // Pagination — kept entirely separate from `limit` (which the landing
    // page's featured section uses and must keep working unchanged).
    // Slicing the already-sorted array means page 2 still shows the next
    // best results in the same order, not an arbitrary re-ordering.
    let pagination = null;
    if (page || pageSize) {
      const totalCount = hostels.length;
      const size = Math.max(1, Number(pageSize) || 12);
      const totalPages = Math.max(1, Math.ceil(totalCount / size));
      const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
      const start = (currentPage - 1) * size;

      hostels = hostels.slice(start, start + size);
      pagination = { page: currentPage, pageSize: size, totalCount, totalPages };
    }

    res.json({
      hostels,
      pagination,
      searchContext: referenceCampus
        ? {
            regionName: referenceCampus.region_name,
            universityName: referenceCampus.university_name,
            campusName: referenceCampus.name,
            latitude: referenceCampus.latitude,
            longitude: referenceCampus.longitude,
            searchRadiusKm: maxDistanceKm ? Number(maxDistanceKm) : DEFAULT_SEARCH_RADIUS_KM,
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load hostels.' });
  }
});

// GET /api/hostels/mine — protected. Lists the signed-in owner's own hostels,
// so they have something to click "Edit" on. Must be defined BEFORE the
// GET /:id route below, or Express would try to treat "mine" as an id.
router.get('/mine', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.id, h.name, h.city, r.name AS region_name, h.is_verified, h.latitude,
              MIN(rm.price_per_year) AS from_price
       FROM hostels h
       LEFT JOIN regions r ON r.id = h.region_id
       LEFT JOIN rooms rm ON rm.hostel_id = h.id
       WHERE h.owner_id = $1
       GROUP BY h.id, r.name
       ORDER BY h.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load your hostels.' });
  }
});

// GET /api/hostels/:id?campusId=X
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const hostelResult = await pool.query(
      `SELECT h.*, r.name AS region_name, u.email AS owner_email
       FROM hostels h
       LEFT JOIN regions r ON r.id = h.region_id
       JOIN users u ON u.id = h.owner_id
       WHERE h.id = $1`,
      [id]
    );
    if (hostelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hostel not found.' });
    }
    const isUnclaimed = hostelResult.rows[0].owner_email === 'directory@smarthostelfinder.local';

    const roomsResult = await pool.query('SELECT * FROM rooms WHERE hostel_id = $1', [id]);
    const reviewsResult = await pool.query(
      `SELECT r.rating, r.comment, r.created_at, u.full_name
       FROM reviews r JOIN users u ON u.id = r.student_id
       WHERE r.hostel_id = $1 ORDER BY r.created_at DESC`,
      [id]
    );

    const referenceCampus = await getCampusById(req.query.campusId);
    const [hostelWithDistance] = await attachDistances([hostelResult.rows[0]], referenceCampus);
    const travel = estimateTravelTimes(hostelWithDistance);

    let viewRouteUrl = null;
    if (referenceCampus && hostelWithDistance.latitude && hostelWithDistance.longitude) {
      viewRouteUrl = `https://www.google.com/maps/dir/?api=1&origin=${referenceCampus.latitude},${referenceCampus.longitude}&destination=${hostelWithDistance.latitude},${hostelWithDistance.longitude}`;
    }

    const { owner_email, ...hostelWithoutEmail } = hostelWithDistance;

    res.json({
      ...hostelWithoutEmail,
      isUnclaimed,
      rooms: roomsResult.rows,
      reviews: reviewsResult.rows,
      referenceCampus: referenceCampus
        ? {
            name: referenceCampus.name,
            universityName: referenceCampus.university_name,
            regionName: referenceCampus.region_name,
            latitude: referenceCampus.latitude,
            longitude: referenceCampus.longitude,
          }
        : null,
      travel,
      viewRouteUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load this hostel.' });
  }
});

// POST /api/hostels — protected, owners only.
// Creates the hostel AND its room types in one request (wrapped in a
// transaction, so a failure partway through doesn't leave a hostel with
// no rooms, or rooms with no hostel).
router.post('/', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      name, regionId, city, address, description, latitude, longitude,
      hasCctv, hasSecurityGuard, hasShuttle, hasWaterSupply,
      hasElectricityBackup, hasWifi, hasParking, nearbyBusStop,
      rooms, // optional array: [{ roomType, pricePerYear, totalUnits, availableUnits }]
    } = req.body;

    if (!name || !regionId) {
      return res.status(400).json({ error: 'Hostel name and region are required.' });
    }

    // NOTE: geocoding (converting an address into coordinates) happens in
    // the BROWSER before this request is sent, not on the server. OpenStreetMap's
    // free Nominatim service explicitly blocks automated server-to-server
    // calls (see backend/utils/geocode.js for the full explanation) — only
    // light, human-triggered browser requests are allowed. The frontend's
    // "Find" location search already geocodes client-side, so by the time
    // a create/edit request reaches here, latitude/longitude are either
    // already set or the owner chose to leave them blank.
    const finalLatitude = latitude || null;
    const finalLongitude = longitude || null;

    await client.query('BEGIN');

    const hostelResult = await client.query(
      `INSERT INTO hostels (
         owner_id, name, region_id, city, address, description, latitude, longitude,
         has_cctv, has_security_guard, has_shuttle, has_water_supply,
         has_electricity_backup, has_wifi, has_parking, nearby_bus_stop
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        req.user.id, name, regionId, city, address, description, finalLatitude, finalLongitude,
        !!hasCctv, !!hasSecurityGuard, !!hasShuttle, hasWaterSupply !== false,
        !!hasElectricityBackup, !!hasWifi, !!hasParking, nearbyBusStop,
      ]
    );
    const hostel = hostelResult.rows[0];

    const insertedRooms = [];
    if (Array.isArray(rooms)) {
      for (const room of rooms) {
        if (!room.roomType || !room.pricePerYear) continue; // skip incomplete rows
        const roomResult = await client.query(
          `INSERT INTO rooms (hostel_id, room_type, price_per_year, total_units, available_units, deposit_amount)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            hostel.id, room.roomType, room.pricePerYear,
            room.totalUnits || 1, room.availableUnits ?? room.totalUnits ?? 1,
            room.depositAmount || null,
          ]
        );
        insertedRooms.push(roomResult.rows[0]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ ...hostel, rooms: insertedRooms });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not create hostel listing.' });
  } finally {
    client.release();
  }
});

// PUT /api/hostels/:id — protected. Only the hostel's own owner (or an
// admin) can edit it. Safely updates hostel fields and reconciles room types
// (updates existing, inserts new, deletes only unbooked removed rooms) so existing
// student bookings and payment records are preserved.
router.put('/:id', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const ownerCheck = await pool.query('SELECT owner_id FROM hostels WHERE id = $1', [id]);
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Hostel not found.' });
    }
    if (ownerCheck.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit hostels you own.' });
    }

    const {
      name, regionId, city, address, description, latitude, longitude,
      hasCctv, hasSecurityGuard, hasShuttle, hasWaterSupply,
      hasElectricityBackup, hasWifi, hasParking, nearbyBusStop,
      rooms,
    } = req.body;

    if (!name || !regionId) {
      return res.status(400).json({ error: 'Hostel name and region are required.' });
    }

    const finalLatitude = latitude || null;
    const finalLongitude = longitude || null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const hostelResult = await client.query(
        `UPDATE hostels SET
           name = $1, region_id = $2, city = $3, address = $4, description = $5,
           latitude = $6, longitude = $7, has_cctv = $8, has_security_guard = $9,
           has_shuttle = $10, has_water_supply = $11, has_electricity_backup = $12,
           has_wifi = $13, has_parking = $14, nearby_bus_stop = $15
         WHERE id = $16
         RETURNING *`,
        [
          name, regionId, city, address, description, finalLatitude, finalLongitude,
          !!hasCctv, !!hasSecurityGuard, !!hasShuttle, hasWaterSupply !== false,
          !!hasElectricityBackup, !!hasWifi, !!hasParking, nearbyBusStop, id,
        ]
      );

      // Reconcile room types safely
      const currentRoomsRes = await client.query('SELECT * FROM rooms WHERE hostel_id = $1', [id]);
      const currentRoomsMap = new Map(currentRoomsRes.rows.map(r => [r.id, r]));
      const keptRoomIds = new Set();
      const updatedRooms = [];

      if (Array.isArray(rooms)) {
        for (const room of rooms) {
          if (!room.roomType || !room.pricePerYear) continue;

          const roomId = Number(room.id);
          if (roomId && currentRoomsMap.has(roomId)) {
            // Update existing room
            keptRoomIds.add(roomId);
            const updateRes = await client.query(
              `UPDATE rooms SET
                 room_type = $1, price_per_year = $2, total_units = $3,
                 available_units = $4, deposit_amount = $5
               WHERE id = $6 AND hostel_id = $7
               RETURNING *`,
              [
                room.roomType, room.pricePerYear,
                room.totalUnits || 1, room.availableUnits ?? room.totalUnits ?? 1,
                room.depositAmount || null, roomId, id,
              ]
            );
            updatedRooms.push(updateRes.rows[0]);
          } else {
            // Insert new room
            const insertRes = await client.query(
              `INSERT INTO rooms (hostel_id, room_type, price_per_year, total_units, available_units, deposit_amount)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING *`,
              [
                id, room.roomType, room.pricePerYear,
                room.totalUnits || 1, room.availableUnits ?? room.totalUnits ?? 1,
                room.depositAmount || null,
              ]
            );
            updatedRooms.push(insertRes.rows[0]);
          }
        }
      }

      // Check if any removed room has active bookings
      for (const [currId, currRoom] of currentRoomsMap.entries()) {
        if (!keptRoomIds.has(currId)) {
          const bookingCheck = await client.query(
            "SELECT COUNT(*) FROM bookings WHERE room_id = $1 AND status != 'cancelled'",
            [currId]
          );
          if (Number(bookingCheck.rows[0].count) > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              error: `Cannot remove room type "${currRoom.room_type}" because students currently have active bookings for it.`,
            });
          }
          await client.query('DELETE FROM rooms WHERE id = $1 AND hostel_id = $2', [currId, id]);
        }
      }

      await client.query('COMMIT');
      res.json({ ...hostelResult.rows[0], rooms: updatedRooms });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Could not update hostel.' });
  }
});

// POST /api/hostels/:id/reviews — student leaves (or updates) a review.
// One review per student per hostel — resubmitting updates their existing one.
router.post('/:id/reviews', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    const result = await pool.query(
      `INSERT INTO reviews (hostel_id, student_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (hostel_id, student_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING *`,
      [id, req.user.id, ratingNum, comment || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save your review.' });
  }
});

// ---------- Admin verification workflow ----------

// GET /api/hostels/pending — admin only. Lists hostels awaiting approval.
router.get('/admin/pending', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.id, h.name, h.city, h.created_at, r.name AS region_name, u.full_name AS owner_name, h.latitude
       FROM hostels h
       LEFT JOIN regions r ON r.id = h.region_id
       JOIN users u ON u.id = h.owner_id
       WHERE h.is_verified = FALSE
       ORDER BY h.created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load pending hostels.' });
  }
});

// PUT /api/hostels/:id/verify — admin approves a hostel listing.
router.put('/:id/verify', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE hostels SET is_verified = TRUE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hostel not found.' });

    await createNotification(
      result.rows[0].owner_id,
      `Your hostel "${result.rows[0].name}" has been approved and is now verified.`,
      `hostel.html?id=${result.rows[0].id}`
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not verify hostel.' });
  }
});

// DELETE /api/hostels/:id — admin rejects/removes a listing (or the owner
// removes their own). Cascades to its rooms/bookings/reviews automatically.
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const hostelResult = await pool.query('SELECT owner_id, name FROM hostels WHERE id = $1', [req.params.id]);
    if (hostelResult.rows.length === 0) return res.status(404).json({ error: 'Hostel not found.' });

    const isOwner = hostelResult.rows[0].owner_id === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to remove this hostel.' });
    }

    // Only notify when an ADMIN removes someone ELSE's listing (a rejection) —
    // not when an owner deletes their own hostel themselves.
    if (!isOwner && req.user.role === 'admin') {
      await createNotification(
        hostelResult.rows[0].owner_id,
        `Your hostel listing "${hostelResult.rows[0].name}" was reviewed and removed by an admin.`,
        'owner-dashboard.html'
      );
    }

    await pool.query('DELETE FROM hostels WHERE id = $1', [req.params.id]);
    res.json({ message: 'Hostel removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not remove hostel.' });
  }
});

// PATCH /api/hostels/:id/coordinates — owner (of that hostel) or admin only.
// Saves latitude/longitude that the BROWSER already geocoded (via the
// "Auto-locate" button, which calls OpenStreetMap directly from the
// frontend — the same pattern as the "Find" location search). The server
// does not call Nominatim itself: their usage policy blocks automated
// server-to-server geocoding, only allowing light, human-triggered
// browser requests. See backend/utils/geocode.js for the full explanation.
router.patch('/:id/coordinates', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'latitude and longitude are both required.' });
    }

    const hostelResult = await pool.query('SELECT owner_id FROM hostels WHERE id = $1', [id]);
    if (hostelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hostel not found.' });
    }
    if (hostelResult.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to update this hostel.' });
    }

    const updateResult = await pool.query(
      'UPDATE hostels SET latitude = $1, longitude = $2 WHERE id = $3 RETURNING id, name, latitude, longitude',
      [latitude, longitude, id]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save coordinates for this hostel.' });
  }
});

// Wraps multer's upload so file-too-large / wrong-type errors come back
// as clean JSON instead of an unhandled crash.
function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Could not process the uploaded image.' });
    }
    next();
  });
}

// POST /api/hostels/:id/image — owner (of that hostel) or admin only.
// Uploads a cover photo, replacing whatever was there before.
router.post('/:id/image', requireAuth, handleUpload, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file was uploaded.' });
    }

    const hostelResult = await pool.query('SELECT owner_id FROM hostels WHERE id = $1', [id]);
    if (hostelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hostel not found.' });
    }
    if (hostelResult.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to update this hostel.' });
    }

    const imageUrl = '/uploads/hostels/' + req.file.filename;

    const updateResult = await pool.query(
      'UPDATE hostels SET cover_image_url = $1 WHERE id = $2 RETURNING id, name, cover_image_url',
      [imageUrl, id]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not upload image.' });
  }
});

// POST /api/hostels/:id/claim — an owner requests ownership of a
// directory-listed (unclaimed) hostel. Does NOT transfer ownership
// immediately — an admin must approve first.
router.post('/:id/claim', requireAuth, requireRole('owner'), async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const hostelResult = await pool.query(
      `SELECT h.id, u.email AS owner_email FROM hostels h JOIN users u ON u.id = h.owner_id WHERE h.id = $1`,
      [id]
    );
    if (hostelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hostel not found.' });
    }
    if (hostelResult.rows[0].owner_email !== 'directory@smarthostelfinder.local') {
      return res.status(400).json({ error: 'This hostel is already managed by an owner and cannot be claimed.' });
    }

    const existing = await pool.query(
      "SELECT id FROM hostel_claims WHERE hostel_id = $1 AND requested_by = $2 AND status = 'pending'",
      [id, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a pending claim request for this hostel.' });
    }

    const result = await pool.query(
      `INSERT INTO hostel_claims (hostel_id, requested_by, message)
       VALUES ($1, $2, $3) RETURNING *`,
      [id, req.user.id, message || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not submit your claim request.' });
  }
});

// GET /api/hostels/admin/claims — admin only. Lists pending claim requests.
router.get('/admin/claims', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.message, c.created_at,
              h.id AS hostel_id, h.name AS hostel_name,
              u.id AS requester_id, u.full_name AS requester_name, u.email AS requester_email
       FROM hostel_claims c
       JOIN hostels h ON h.id = c.hostel_id
       JOIN users u ON u.id = c.requested_by
       WHERE c.status = 'pending'
       ORDER BY c.created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load claim requests.' });
  }
});

// PUT /api/hostels/claims/:claimId/approve — admin only. Transfers
// ownership of the hostel to the requesting owner.
router.put('/claims/:claimId/approve', requireAuth, requireRole('admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { claimId } = req.params;

    const claimResult = await client.query('SELECT * FROM hostel_claims WHERE id = $1', [claimId]);
    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: 'Claim request not found.' });
    }
    const claim = claimResult.rows[0];

    await client.query('BEGIN');
    await client.query('UPDATE hostels SET owner_id = $1 WHERE id = $2', [claim.requested_by, claim.hostel_id]);
    await client.query(
      "UPDATE hostel_claims SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2",
      [req.user.id, claimId]
    );
    // Any other pending claims on the same hostel are now moot — reject them automatically.
    await client.query(
      "UPDATE hostel_claims SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW() WHERE hostel_id = $2 AND id != $3 AND status = 'pending'",
      [req.user.id, claim.hostel_id, claimId]
    );
    await client.query('COMMIT');

    const hostelRow = await pool.query('SELECT name FROM hostels WHERE id = $1', [claim.hostel_id]);
    await createNotification(
      claim.requested_by,
      `Your claim for "${hostelRow.rows[0]?.name}" was approved — you can now manage this listing.`,
      `hostel.html?id=${claim.hostel_id}`
    );

    res.json({ message: 'Claim approved — ownership transferred.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not approve this claim.' });
  } finally {
    client.release();
  }
});

// PUT /api/hostels/claims/:claimId/reject — admin only.
router.put('/claims/:claimId/reject', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE hostel_claims SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2 AND status = 'pending' RETURNING *",
      [req.user.id, req.params.claimId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim request not found or already reviewed.' });
    }

    const hostelRow = await pool.query('SELECT name FROM hostels WHERE id = $1', [result.rows[0].hostel_id]);
    await createNotification(
      result.rows[0].requested_by,
      `Your claim for "${hostelRow.rows[0]?.name}" was not approved.`,
      `hostel.html?id=${result.rows[0].hostel_id}`
    );

    res.json({ message: 'Claim rejected.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not reject this claim.' });
  }
});

module.exports = router;
