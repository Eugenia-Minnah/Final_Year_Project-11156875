// Language: JavaScript (runs in the browser)
// Powers the "Edit hostel" form. Same location picker and room-row pattern
// as add-hostel.js, but pre-fills everything from the existing hostel and
// submits via PUT instead of POST.

// ---------- Guard: owners (or admins) only ----------
if (!isLoggedIn()) {
  window.location.href = 'signin.html';
}
const user = currentUser();
if (user && user.role !== 'owner' && user.role !== 'admin') {
  document.body.innerHTML = '<div class="section"><p class="empty-state">Only hostel owners can edit a listing. <a href="dashboard.html">Back to dashboard</a></p></div>';
}

const hostelId = new URLSearchParams(window.location.search).get('id');
if (!hostelId) {
  document.body.innerHTML = '<div class="section"><p class="empty-state">No hostel selected to edit. <a href="dashboard.html">Back to dashboard</a></p></div>';
}

// ---------- Region picker ----------
const regionControl = createSearchableSelect({
  inputEl: document.getElementById('hostelRegion'),
  hiddenEl: document.getElementById('hostelRegionValue'),
  dropdownEl: document.getElementById('hostelRegionDropdown'),
});

let regionsLoaded = null;
(async function loadRegions() {
  const regions = await apiRequest('/api/locations/regions');
  regionsLoaded = regions;
  regionControl.setOptions(regions.map(r => ({ id: String(r.id), label: r.name })), 'Type or select a region');
})();

// ---------- Map ----------
const pickerMap = L.map('pickerMap').setView([7.9465, -1.0232], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(pickerMap);

let pickerMarker = null;

function dropPinAt(lat, lng) {
  const latLng = { lat, lng };
  if (pickerMarker) {
    pickerMarker.setLatLng(latLng);
  } else {
    pickerMarker = L.marker(latLng).addTo(pickerMap);
  }
  document.getElementById('hostelLat').value = lat.toFixed(6);
  document.getElementById('hostelLng').value = lng.toFixed(6);
  document.getElementById('coordsDisplay').textContent =
    'Selected: ' + lat.toFixed(6) + ', ' + lng.toFixed(6);
}

pickerMap.on('click', (e) => dropPinAt(e.latlng.lat, e.latlng.lng));

const GPS_COORDINATE_PATTERN = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

document.getElementById('findLocationBtn').addEventListener('click', async () => {
  const query = document.getElementById('locationSearchInput').value.trim();
  const errorBox = document.getElementById('errorMsg');
  if (!query) return;
  errorBox.style.display = 'none';

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
    pickerMap.setView([lat, lng], 16);
    dropPinAt(lat, lng);
    return;
  }

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
    errorBox.textContent = 'Could not search for that location right now.';
    errorBox.style.display = 'block';
  }
});

// ---------- Room rows ----------
const roomRowsContainer = document.getElementById('roomRows');
let roomRowCount = 0;

function addRoomRow(existingRoom) {
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
    '<input type="number" class="room-deposit-input" placeholder="Deposit GH₵ (optional)" title="Leave blank to default to 10% of the yearly price" style="padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px; width:170px;" />' +
    '<button type="button" class="btn btn-outline" onclick="document.getElementById(\'' + rowId + '\').remove()">Remove</button>';
  roomRowsContainer.appendChild(row);

  if (existingRoom) {
    row.querySelector('.room-type-input').value = existingRoom.room_type;
    row.querySelector('.room-price-input').value = existingRoom.price_per_year;
    row.querySelector('.room-units-input').value = existingRoom.total_units;
    row.querySelector('.room-available-input').value = existingRoom.available_units;
    if (existingRoom.deposit_amount != null) {
      row.querySelector('.room-deposit-input').value = existingRoom.deposit_amount;
    }
  }
}

document.getElementById('addRoomRowBtn').addEventListener('click', () => addRoomRow());

function collectRooms() {
  return Array.from(roomRowsContainer.children).map(function (row) {
    var availableInput = row.querySelector('.room-available-input').value;
    var depositInput = row.querySelector('.room-deposit-input').value;
    return {
      roomType: row.querySelector('.room-type-input').value,
      pricePerYear: Number(row.querySelector('.room-price-input').value) || null,
      totalUnits: Number(row.querySelector('.room-units-input').value) || 1,
      availableUnits: availableInput ? Number(availableInput) : undefined,
      depositAmount: depositInput ? Number(depositInput) : undefined,
    };
  }).filter(function (r) { return r.roomType && r.pricePerYear; });
}

// ---------- Load existing hostel and pre-fill everything ----------
async function loadExistingHostel() {
  try {
    const h = await apiRequest('/api/hostels/' + hostelId, { auth: true });

    const loadingNote = document.getElementById('loadingNote');
    if (loadingNote) loadingNote.style.display = 'none';

    // Ownership check happens here, BEFORE the form renders — the backend
    // still enforces this independently on save (never trust the frontend
    // alone), but this avoids the abrupt experience of filling out a form
    // only to get blocked at the very end.
    if (user && h.owner_id !== user.id && user.role !== 'admin') {
      document.body.innerHTML =
        '<div class="section"><p class="empty-state">You don\'t own this hostel, so you can\'t edit it. ' +
        '<a href="dashboard.html">Back to dashboard</a></p></div>';
      return;
    }

    document.getElementById('hostelName').value = h.name || '';
    document.getElementById('hostelCity').value = h.city || '';
    document.getElementById('hostelAddress').value = h.address || '';
    document.getElementById('hostelDescription').value = h.description || '';
    document.getElementById('hostelBusStop').value = h.nearby_bus_stop || '';

    document.getElementById('amCctv').checked = h.has_cctv;
    document.getElementById('amSecurity').checked = h.has_security_guard;
    document.getElementById('amShuttle').checked = h.has_shuttle;
    document.getElementById('amWater').checked = h.has_water_supply;
    document.getElementById('amElectricity').checked = h.has_electricity_backup;
    document.getElementById('amWifi').checked = h.has_wifi;
    document.getElementById('amParking').checked = h.has_parking;

    // Region needs the region list to already be loaded so we can find the matching option
    if (!regionsLoaded) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    if (h.region_name && regionsLoaded) {
      const match = regionsLoaded.find(r => r.name === h.region_name);
      if (match) {
        document.getElementById('hostelRegion').value = match.name;
        document.getElementById('hostelRegionValue').value = String(match.id);
      }
    }

    if (h.latitude && h.longitude) {
      pickerMap.setView([Number(h.latitude), Number(h.longitude)], 15);
      dropPinAt(Number(h.latitude), Number(h.longitude));
    } else {
      document.getElementById('coordsDisplay').textContent = 'No location set yet — search or click the map to add one.';
    }

    if (h.rooms && h.rooms.length) {
      h.rooms.forEach(r => addRoomRow(r));
    } else {
      addRoomRow();
    }
  } catch (err) {
    const loadingNote = document.getElementById('loadingNote');
    if (loadingNote) loadingNote.style.display = 'none';
    document.getElementById('errorMsg').textContent = 'Could not load this hostel: ' + err.message;
    document.getElementById('errorMsg').style.display = 'block';
  }
}
loadExistingHostel();

// ---------- Submit ----------
document.getElementById('editHostelForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  var errorBox = document.getElementById('errorMsg');
  var successBox = document.getElementById('successMsg');
  errorBox.style.display = 'none';
  successBox.style.display = 'none';

  try {
    await apiRequest('/api/hostels/' + hostelId, {
      method: 'PUT',
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

    successBox.textContent = 'Changes saved! Redirecting...';
    successBox.style.display = 'block';
    setTimeout(function () {
      window.location.href = 'hostel.html?id=' + hostelId;
    }, 1000);
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  }
});
