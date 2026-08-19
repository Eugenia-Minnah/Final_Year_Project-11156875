// Language: JavaScript (runs in the browser)
// Renders an interactive map: hostel pins (blue) plus, when a campus is
// selected, a distinct campus pin (green graduation cap) so it's obvious
// which point everything else is measured from. Uses Leaflet.js — free,
// no API key needed — with OpenStreetMap tiles.

let hostelMap = null;
let hostelMarkers = [];
let campusMarker = null;

const campusIcon = L.divIcon({
  html: '🎓',
  className: 'campus-marker-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function initHostelMap(containerId) {
  if (hostelMap) return hostelMap;

  hostelMap = L.map(containerId).setView([7.9465, -1.0232], 7);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(hostelMap);

  return hostelMap;
}

// Puts (or moves) the distinct campus pin. Pass null to remove it.
function renderCampusMarker(campus) {
  if (!hostelMap) return;
  if (campusMarker) {
    hostelMap.removeLayer(campusMarker);
    campusMarker = null;
  }
  if (campus && campus.latitude && campus.longitude) {
    campusMarker = L.marker([campus.latitude, campus.longitude], { icon: campusIcon }).addTo(hostelMap);
    campusMarker.bindPopup(`<strong>${campus.name}</strong><br>${campus.universityName || ''}`);
  }
}

function renderHostelMarkers(hostels) {
  if (!hostelMap) return;

  hostelMarkers.forEach(marker => hostelMap.removeLayer(marker));
  hostelMarkers = [];

  const withCoords = hostels.filter(h => h.latitude && h.longitude);

  withCoords.forEach(h => {
    const marker = L.marker([h.latitude, h.longitude]).addTo(hostelMap);
    const price = h.from_price ? `From GH₵${Number(h.from_price).toLocaleString()} / year` : 'Contact for pricing';
    const distanceLine = h.distance_km !== undefined ? `${h.distance_km} km away<br>` : '';
    marker.bindPopup(`
      <strong>${h.name}</strong><br>
      ${distanceLine}
      ${price}<br>
      <a href="hostel.html?id=${h.id}">View hostel</a>
    `);
    hostelMarkers.push(marker);
  });

  // Fit the view to whatever is showing — including the campus pin if present
  const allPoints = [...withCoords.map(h => [h.latitude, h.longitude])];
  if (campusMarker) allPoints.push(campusMarker.getLatLng());

  if (allPoints.length === 1) {
    hostelMap.setView(allPoints[0], 15);
  } else if (allPoints.length > 1) {
    hostelMap.fitBounds(L.latLngBounds(allPoints).pad(0.2));
  }
}
