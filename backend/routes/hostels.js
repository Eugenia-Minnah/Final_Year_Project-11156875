// Language: JavaScript (Node.js / Express)
// Handles: browsing hostels (public), viewing one hostel, and owners adding listings (protected).
//
// KEY DESIGN CHANGE: a hostel is a physical property with its own region,
// city, and coordinates — it is NOT hard-locked to one campus. When a
// campus is selected in search, we calculate real distance (Haversine
// formula) from that campus to every hostel with known coordinates, and
// use that distance to filter/sort/display results — not just region text.

const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ---------- Distance helper ----------
function distanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

function attachDistances(hostels, fromCampus) {
  if (!fromCampus || !fromCampus.latitude) return hostels;
  return hostels.map(h => {
    if (h.latitude && h.longitude) {
      const km = distanceInKm(fromCampus.latitude, fromCampus.longitude, h.latitude, h.longitude);
      return { ...h, distance_km: Math.round(km * 10) / 10 };
    }
    return h;
  });
}

function estimateTravelTimes(distanceKm) {
  if (distanceKm == null) return null;
  const walkingMinutes = Math.round((distanceKm / 5) * 60);
  const drivingMinutes = Math.round((distanceKm / 25) * 60);
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
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      regionId, universityId, campusId,
      roomType, minPrice, maxPrice, availability, maxDistanceKm,
      features, sort,
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

    if (referenceCampus) {
      values.push(referenceCampus.region_name);
      query += ` AND r.name = $${values.length}`;
    } else if (regionId) {
      values.push(regionId);
      query += ` AND h.region_id = $${values.length}`;
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
    let hostels = attachDistances(result.rows, referenceCampus);

    if (referenceCampus && maxDistanceKm) {
      hostels = hostels.filter(h => h.distance_km !== undefined && h.distance_km <= Number(maxDistanceKm));
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

    res.json({
      hostels,
      searchContext: referenceCampus
        ? {
            regionName: referenceCampus.region_name,
            universityName: referenceCampus.university_name,
            campusName: referenceCampus.name,
            latitude: referenceCampus.latitude,
            longitude: referenceCampus.longitude,
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load hostels.' });
  }
});

// GET /api/hostels/:id?campusId=X
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const hostelResult = await pool.query(
      `SELECT h.*, r.name AS region_name
       FROM hostels h
       LEFT JOIN regions r ON r.id = h.region_id
       WHERE h.id = $1`,
      [id]
    );
    if (hostelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hostel not found.' });
    }

    const roomsResult = await pool.query('SELECT * FROM rooms WHERE hostel_id = $1', [id]);
    const reviewsResult = await pool.query(
      `SELECT r.rating, r.comment, r.created_at, u.full_name
       FROM reviews r JOIN users u ON u.id = r.student_id
       WHERE r.hostel_id = $1 ORDER BY r.created_at DESC`,
      [id]
    );

    const referenceCampus = await getCampusById(req.query.campusId);
    const [hostelWithDistance] = attachDistances([hostelResult.rows[0]], referenceCampus);
    const travel = estimateTravelTimes(hostelWithDistance.distance_km);

    let viewRouteUrl = null;
    if (referenceCampus && hostelWithDistance.latitude && hostelWithDistance.longitude) {
      viewRouteUrl = `https://www.google.com/maps/dir/?api=1&origin=${referenceCampus.latitude},${referenceCampus.longitude}&destination=${hostelWithDistance.latitude},${hostelWithDistance.longitude}`;
    }

    res.json({
      ...hostelWithDistance,
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

// POST /api/hostels — protected, owners only
router.post('/', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const {
      name, regionId, city, address, description, latitude, longitude,
      hasCctv, hasSecurityGuard, hasShuttle, hasWaterSupply,
      hasElectricityBackup, hasWifi, hasParking, nearbyBusStop,
    } = req.body;

    if (!name || !regionId) {
      return res.status(400).json({ error: 'Hostel name and region are required.' });
    }

    const result = await pool.query(
      `INSERT INTO hostels (
         owner_id, name, region_id, city, address, description, latitude, longitude,
         has_cctv, has_security_guard, has_shuttle, has_water_supply,
         has_electricity_backup, has_wifi, has_parking, nearby_bus_stop
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        req.user.id, name, regionId, city, address, description, latitude || null, longitude || null,
        !!hasCctv, !!hasSecurityGuard, !!hasShuttle, hasWaterSupply !== false,
        !!hasElectricityBackup, !!hasWifi, !!hasParking, nearbyBusStop,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create hostel listing.' });
  }
});

module.exports = router;
