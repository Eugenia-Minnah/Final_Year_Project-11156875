// Language: JavaScript (runs in the browser)
// Powers the "Add a hostel" form: owner-only guard, a click-on-map location
// picker (auto-fills latitude/longitude so nobody types coordinates by hand),
// and dynamic room-type rows submitted together with the hostel.

// ---------- Guard: owners (or admins) only ----------
if (!isLoggedIn()) {
  window.location.href = 'signin.html';
}
const user = currentUser();
if (user && user.role !== 'owner' && user.role !== 'admin') {
  document.body.innerHTML = '<div class="section"><p class="empty-state">Only hostel owners can add a listing. <a href="dashboard.html">Back to dashboard</a></p></div>';
}

// ---------- Region picker (standalone — a hostel has its own region, not a fixed campus) ----------
const regionControl = createSearchableSelect({
  inputEl: document.getElementById('hostelRegion'),
  hiddenEl: document.getElementById('hostelRegionValue'),
  dropdownEl: document.getElementById('hostelRegionDropdown'),
});

(async function loadRegions() {
  const regions = await apiRequest('/api/locations/regions');
  regionControl.setOptions(regions.map(r => ({ id: String(r.id), label: r.name })), 'Type or select a region');
})();

// ---------- Click-on-map location picker ----------
const pickerMap = L.map('pickerMap').setView([7.9465, -1.0232], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(pickerMap);

let pickerMarker = null;

pickerMap.on('click', (e) => {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  if (pickerMarker) {
    pickerMarker.setLatLng(e.latlng);
  } else {
    pickerMarker = L.marker(e.latlng).addTo(pickerMap);
  }

  document.getElementById('hostelLat').value = lat.toFixed(6);
  document.getElementById('hostelLng').value = lng.toFixed(6);
  document.getElementById('coordsDisplay').textContent =
    'Selected: ' + lat.toFixed(6) + ', ' + lng.toFixed(6);
});

// Matches things like "5.6494, -0.1870" or "5.6494,-0.1870" — a plain
// latitude,longitude pair someone might paste in from their phone's GPS.
const GPS_COORDINATE_PATTERN = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

function dropPinAt(lat, lng) {
  const latLng = { lat, lng };
  if (pickerMarker) {
    pickerMarker.setLatLng(latLng);
  } else {
    pickerMarker = L.marker(latLng).addTo(pickerMap);
  }
  pickerMap.setView(latLng, 16);
  document.getElementById('hostelLat').value = lat.toFixed(6);
  document.getElementById('hostelLng').value = lng.toFixed(6);
  document.getElementById('coordsDisplay').textContent =
    'Selected: ' + lat.toFixed(6) + ', ' + lng.toFixed(6);
}

document.getElementById('findLocationBtn').addEventListener('click', async () => {
  const query = document.getElementById('locationSearchInput').value.trim();
  const errorBox = document.getElementById('errorMsg');
  if (!query) return;
  errorBox.style.display = 'none';

  // Case 1: the owner pasted GPS coordinates directly — these are already
  // exact, so drop the pin immediately instead of asking for another click.
  const gpsMatch = query.match(GPS_COORDINATE_PATTERN);
  if (gpsMatch) {
    const lat = Number(gpsMatch[1]);
    const lng = Number(gpsMatch[2]);
    const validGhanaRange = lat >= 4 && lat <= 12 && lng >= -4 && lng <= 2;
    if (!validGhanaRange) {
      errorBox.textContent = 'Those coordinates look outside Ghana — double-check them, or try typing a landmark name instead.';
      errorBox.style.display = 'block';
      return;
    }
    dropPinAt(lat, lng);
    return;
  }

  // Case 2: a place name / landmark / address — search for it and just
  // move the map there, since a place name isn't precise enough to trust
  // as the exact hostel location. The owner still clicks to drop the pin.
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gh&q=' + encodeURIComponent(query);
    const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const results = await response.json();

    if (!results.length) {
      errorBox.textContent = 'Could not find that place. Try a nearby landmark, town, or GPS coordinates instead.';
      errorBox.style.display = 'block';
      return;
    }

    const { lat, lon } = results[0];
    pickerMap.setView([Number(lat), Number(lon)], 15);
    document.getElementById('coordsDisplay').textContent =
      'Map moved to that area — click the hostel\'s exact spot to drop a pin.';
  } catch (err) {
    errorBox.textContent = 'Could not search for that location right now. You can still click the map manually, or skip location for now.';
    errorBox.style.display = 'block';
  }
});

// ---------- Dynamic room type rows ----------
const roomRowsContainer = document.getElementById('roomRows');
let roomRowCount = 0;

function addRoomRow() {
  roomRowCount++;
  const rowId = 'room-row-' + roomRowCount;
  const row = document.createElement('div');
  row.id = rowId;
  row.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center; flex-wrap:wrap;';
  row.innerHTML =
    '<select class="room-type-input" style="padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;">' +
    '<option value="1 in a room">1 in a room</option>' +
    '<option value="2 in a room">2 in a room</option>' +
    '<option value="4 in a room">4 in a room</option>' +
    '</select>' +
    '<input type="number" class="room-price-input" placeholder="Price (GHS/year)" style="padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px; width:150px;" />' +
    '<input type="number" class="room-units-input" placeholder="Total units" style="padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px; width:110px;" />' +
    '<input type="number" class="room-available-input" placeholder="Available now" style="padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px; width:120px;" />' +
    '<button type="button" class="btn btn-outline" onclick="document.getElementById(\'' + rowId + '\').remove()">Remove</button>';
  roomRowsContainer.appendChild(row);
}

document.getElementById('addRoomRowBtn').addEventListener('click', addRoomRow);
addRoomRow(); // start with one row so the form isn't empty

function collectRooms() {
  return Array.from(roomRowsContainer.children).map(function (row) {
    var availableInput = row.querySelector('.room-available-input').value;
    return {
      roomType: row.querySelector('.room-type-input').value,
      pricePerYear: Number(row.querySelector('.room-price-input').value) || null,
      totalUnits: Number(row.querySelector('.room-units-input').value) || 1,
      availableUnits: availableInput ? Number(availableInput) : undefined,
    };
  }).filter(function (r) { return r.roomType && r.pricePerYear; });
}

// ---------- Submit ----------
document.getElementById('addHostelForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  var errorBox = document.getElementById('errorMsg');
  var successBox = document.getElementById('successMsg');
  errorBox.style.display = 'none';
  successBox.style.display = 'none';

  try {
    var data = await apiRequest('/api/hostels', {
      method: 'POST',
      auth: true,
      body: {
        name: document.getElementById('hostelName').value,
        regionId: regionControl.getValue(),
        city: document.getElementById('hostelCity').value,
        address: document.getElementById('hostelAddress').value,
        description: document.getElementById('hostelDescription').value,
        latitude: document.getElementById('hostelLat').value || null,
        longitude: document.getElementById('hostelLng').value || null,
        nearbyBusStop: document.getElementById('hostelBusStop').value,
        hasCctv: document.getElementById('amCctv').checked,
        hasSecurityGuard: document.getElementById('amSecurity').checked,
        hasShuttle: document.getElementById('amShuttle').checked,
        hasWaterSupply: document.getElementById('amWater').checked,
        hasElectricityBackup: document.getElementById('amElectricity').checked,
        hasWifi: document.getElementById('amWifi').checked,
        hasParking: document.getElementById('amParking').checked,
        rooms: collectRooms(),
      },
    });

    successBox.textContent = 'Hostel saved! Redirecting to your new listing...';
    successBox.style.display = 'block';
    setTimeout(function () {
      window.location.href = 'hostel.html?id=' + data.id;
    }, 1200);
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  }
});
