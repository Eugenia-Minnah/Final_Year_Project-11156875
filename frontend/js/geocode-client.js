// Language: JavaScript (runs in the browser)
// Geocodes an address into coordinates by calling OpenStreetMap's free
// Nominatim service DIRECTLY FROM THE BROWSER. This must run client-side,
// not from a backend script — Nominatim's usage policy blocks automated
// server-to-server requests, and only allows light, human-triggered
// browser requests like this one. This is the same pattern already used
// by the "Find" location search on the Add/Edit Hostel map picker.

async function geocodeAddressClientSide(query) {
  if (!query || !query.trim()) return null;

  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gh&q=' + encodeURIComponent(query);
  const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const results = await response.json();

  if (!results.length) return null;

  return {
    latitude: Number(results[0].lat),
    longitude: Number(results[0].lon),
    matchedLabel: results[0].display_name,
  };
}
