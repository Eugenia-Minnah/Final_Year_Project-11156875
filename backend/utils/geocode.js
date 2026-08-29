// Language: JavaScript (Node.js)
// A reusable geocoding function: converts a text address/location into
// latitude/longitude using OpenStreetMap's free Nominatim service — the
// same free, no-API-key service already used elsewhere in this project
// (the "Find" location search on the Add Hostel map picker).
//
// Nominatim's usage policy requires no more than ~1 request per second and
// a descriptive User-Agent, so callers that geocode many hostels in a row
// (see scripts/geocode-missing-hostels.js) must space out their calls.

async function geocodeAddress(query) {
  if (!query || !query.trim()) return null;

  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gh&q=' + encodeURIComponent(query);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        // Nominatim's usage policy requires a descriptive User-Agent identifying the app.
        'User-Agent': 'SmartHostelFinder-StudentProject/1.0 (contact: owner@example.com)',
      },
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error(`Geocoding request failed: HTTP ${response.status} ${response.statusText}. Response: ${rawText.slice(0, 200)}`);
      return null;
    }

    let results;
    try {
      results = JSON.parse(rawText);
    } catch (parseErr) {
      console.error(`Geocoding response was not valid JSON (likely blocked by a firewall/antivirus/network filter before reaching OpenStreetMap). Raw response: ${rawText.slice(0, 200)}`);
      return null;
    }

    if (!results.length) return null;

    return {
      latitude: Number(results[0].lat),
      longitude: Number(results[0].lon),
      matchedLabel: results[0].display_name,
    };
  } catch (err) {
    console.error('Geocoding request failed:', err.message);
    return null;
  }
}

module.exports = { geocodeAddress };
