// Language: JavaScript (Node.js)
// Real driving distance/duration between a reference point (usually a
// campus) and one or more destination points (hostels), using the free
// public OSRM routing engine (https://router.project-osrm.org).
//
// WHY: distanceInKm() in hostels.js is a straight-line ("as the crow
// flies") calculation. That's fine as a rough fallback, but it does not
// match what a real map app (Google Maps, Yandex Maps, etc.) shows,
// because roads bend around buildings, campuses, rivers, etc. This module
// replaces that estimate with an actual road-network distance/time,
// using OSRM's Table API — one HTTP request returns distances+durations
// from one origin to MANY destinations at once, so searching a whole list
// of hostels still costs only a single external call.
//
// NOTE: router.project-osrm.org is a free DEMO server meant for light,
// occasional use — no guaranteed uptime, no API key, and no official SLA.
// If it's ever slow, unreachable, or down, every caller here automatically
// falls back to the old straight-line Haversine estimate, so the app
// keeps working (with a mention this is an estimate) either way.

const OSRM_TABLE_URL = 'https://router.project-osrm.org/table/v1/driving/';
const REQUEST_TIMEOUT_MS = 4000;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Straight-line distance in km — used only as a fallback when the real
// routing service can't be reached or doesn't have a road for a point.
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function straightLineResult(originLat, originLon, lat, lon) {
  const km = haversineKm(originLat, originLon, lat, lon);
  return {
    distanceKm: Math.round(km * 10) / 10,
    drivingMinutes: Math.round((km / 25) * 60), // rough 25 km/h assumption
    source: 'straight', // lets the frontend note "estimated" if it wants to
  };
}

// origin: { latitude, longitude }
// points: array of { latitude, longitude } | null, one per destination
//   (pass null for a hostel that has no coordinates yet — it gets `null`
//   back at the same index, same as before)
//
// Returns: an array, same length/order as `points`, of either:
//   { distanceKm, drivingMinutes, source: 'road' }      — real routed values
//   { distanceKm, drivingMinutes, source: 'straight' }  — Haversine fallback
//   null                                                 — point had no coordinates
async function getRoadDistances(origin, points) {
  const results = new Array(points.length).fill(null);

  const validIndexes = [];
  const coordsList = [`${origin.longitude},${origin.latitude}`];
  points.forEach((p, i) => {
    if (p && p.latitude != null && p.longitude != null) {
      validIndexes.push(i);
      coordsList.push(`${p.longitude},${p.latitude}`);
    }
  });

  if (validIndexes.length === 0) return results;

  function fillStraightLineFallback() {
    validIndexes.forEach((originalIndex) => {
      const p = points[originalIndex];
      results[originalIndex] = straightLineResult(origin.latitude, origin.longitude, p.latitude, p.longitude);
    });
  }

  try {
    // Positions 1..N in coordsList (position 0 is the origin itself).
    const destinations = validIndexes.map((_, i) => i + 1).join(';');
    const url =
      `${OSRM_TABLE_URL}${coordsList.join(';')}` +
      `?sources=0&destinations=${destinations}&annotations=distance,duration`;

    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`OSRM responded with status ${response.status}`);

    const data = await response.json();
    if (data.code !== 'Ok' || !data.distances || !data.durations) {
      throw new Error('OSRM returned an unexpected response.');
    }

    const distancesMeters = data.distances[0]; // one row, since sources=0 (single origin)
    const durationsSeconds = data.durations[0];

    validIndexes.forEach((originalIndex, i) => {
      const meters = distancesMeters[i];
      const seconds = durationsSeconds[i];
      const p = points[originalIndex];

      if (meters == null || seconds == null) {
        // OSRM couldn't find a road route for this specific point (e.g. a
        // pin dropped somewhere with no nearby road) — fall back for just
        // this one point rather than failing the whole batch.
        results[originalIndex] = straightLineResult(origin.latitude, origin.longitude, p.latitude, p.longitude);
        return;
      }

      results[originalIndex] = {
        distanceKm: Math.round((meters / 1000) * 10) / 10,
        drivingMinutes: Math.round(seconds / 60),
        source: 'road',
      };
    });
  } catch (err) {
    console.error('Routing service unavailable, using straight-line distance instead:', err.message);
    fillStraightLineFallback();
  }

  return results;
}

module.exports = { getRoadDistances, haversineKm };
