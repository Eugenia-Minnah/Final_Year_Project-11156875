// Language: JavaScript (runs in the browser)
// Guards the dashboard page, then provides the same search/sort/filter/map
// experience as the landing page for logged-in users, using type-to-search
// dropdowns for Region/University/Campus.

if (!isLoggedIn()) {
  window.location.href = 'signin.html';
}

const user = currentUser();
if (user) {
  document.getElementById('userName').textContent = user.fullName || user.email;
  if (user.role === 'owner' || user.role === 'admin') {
    document.getElementById('addHostelBtn').style.display = 'inline-block';
    document.getElementById('myHostelsSection').style.display = 'block';
    loadMyHostels();
  }
  if (user.role === 'admin') {
    document.getElementById('adminLinkBtn').style.display = 'inline-block';
  }
  if (user.role === 'student') {
    document.getElementById('myBookingsSection').style.display = 'block';
    loadMyBookings();
  }
}

async function loadMyBookings() {
  const list = document.getElementById('myBookingsList');
  list.innerHTML = '<p class="empty-state">Loading your bookings…</p>';
  try {
    const bookings = await apiRequest('/api/bookings/mine', { auth: true });
    if (bookings.length === 0) {
      list.innerHTML = '<p class="empty-state">You haven\'t booked a room yet.</p>';
      return;
    }
    list.innerHTML = bookings.map(b => `
      <div class="hostel-card" style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; margin-bottom:10px;">
        <div>
          <strong><a href="hostel.html?id=${b.hostel_id}">${b.hostel_name}</a></strong>
          <div style="font-size:13px; color:var(--text-muted);">
            ${b.room_type} &middot; Deposit GH₵${Number(b.deposit_amount).toLocaleString()}
            &middot; Status: <span style="text-transform:capitalize; font-weight:600; color:${b.status === 'cancelled' ? 'var(--text-muted)' : 'var(--green)'};">${b.status}</span>
          </div>
        </div>
        ${b.status !== 'cancelled'
          ? `<button type="button" class="btn btn-outline cancel-booking-btn" data-booking-id="${b.id}">Cancel</button>`
          : ''}
      </div>
    `).join('');

    document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Cancel this booking?')) return;
        try {
          await apiRequest(`/api/bookings/${btn.getAttribute('data-booking-id')}/cancel`, { method: 'POST', auth: true });
          loadMyBookings();
        } catch (err) {
          alert('Could not cancel booking: ' + err.message);
        }
      });
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">Could not load your bookings: ${err.message}</p>`;
  }
}

async function loadMyHostels() {
  const list = document.getElementById('myHostelsList');
  list.innerHTML = '<p class="empty-state">Loading your hostels…</p>';
  try {
    const hostels = await apiRequest('/api/hostels/mine', { auth: true });
    if (hostels.length === 0) {
      list.innerHTML = '<p class="empty-state">You haven\'t added any hostels yet. Use "+ Add hostel" above to get started.</p>';
      return;
    }
    list.innerHTML = hostels.map(h => `
      <div class="hostel-card" style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; margin-bottom:10px;">
        <div>
          <strong>${h.name}</strong> ${h.is_verified ? '<span class="badge-verified">Verified</span>' : ''}
          <div style="font-size:13px; color:var(--text-muted);">${h.city ? h.city + ', ' : ''}${h.region_name || 'No region set'}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <a href="hostel.html?id=${h.id}" class="btn btn-outline">View</a>
          <a href="edit-hostel.html?id=${h.id}" class="btn btn-primary">Edit</a>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<p class="empty-state">Could not load your hostels: ${err.message}</p>`;
  }
}

document.getElementById('logoutBtn').addEventListener('click', logout);

let selectedCampusId = '';
let selectedCampusName = '';

function renderResultsHeader(searchContext, hostelCount) {
  const box = document.getElementById('resultsHeader');
  if (!searchContext) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = `
    <div class="results-header">
      <div class="breadcrumb">
        Hostels near <strong>${searchContext.campusName}</strong>
        &nbsp;·&nbsp; 📍 ${searchContext.regionName}
        &nbsp;·&nbsp; 🎓 ${searchContext.universityName}
        &nbsp;·&nbsp; ${hostelCount} found
      </div>
    </div>
  `;
}

function renderHostelCards(hostels, container) {
  if (hostels.length === 0) {
    container.innerHTML = '<p class="empty-state">No hostels match your filters.</p>';
    return;
  }

  container.innerHTML = hostels.map(h => `
    <a href="hostel.html?id=${h.id}${selectedCampusId ? '&campusId=' + selectedCampusId : ''}" class="hostel-card" style="display:block;">
      <div class="thumb"></div>
      <div class="body">
        <h3>${h.name} ${h.is_verified ? '<span class="badge-verified">Verified</span>' : ''}</h3>
        <div class="region">${h.city ? `${h.city}, ` : ''}${h.region_name || ''}</div>
        <div>${h.address || ''}</div>
        ${h.distance_km !== undefined ? `<div style="font-size:13px; color:var(--green); font-weight:600;">📍 ${h.distance_km} km from ${selectedCampusName}</div>` : ''}
        <div class="price">${h.from_price ? 'From GH₵' + Number(h.from_price).toLocaleString() + ' / year' : 'Contact for pricing'}</div>
      </div>
    </a>
  `).join('');
}

function buildQueryParams(filters) {
  const params = new URLSearchParams();
  if (filters.campusId) params.set('campusId', filters.campusId);
  else if (filters.universityId) params.set('universityId', filters.universityId);
  else if (filters.regionId) params.set('regionId', filters.regionId);
  if (filters.roomType) params.set('roomType', filters.roomType);
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  if (filters.availability) params.set('availability', filters.availability);
  if (filters.maxDistanceKm) params.set('maxDistanceKm', filters.maxDistanceKm);
  if (filters.features && filters.features.length) params.set('features', filters.features.join(','));
  if (filters.sort) params.set('sort', filters.sort);
  return params;
}

async function loadHostels(filters = {}) {
  const grid = document.getElementById('hostelGrid');
  grid.innerHTML = '<p class="empty-state">Loading hostels…</p>';

  selectedCampusId = filters.campusId || '';
  selectedCampusName = campusControl.getLabel() || '';

  const params = buildQueryParams(filters);

  try {
    const data = await apiRequest('/api/hostels?' + params.toString(), { auth: true });
    renderResultsHeader(data.searchContext, data.hostels.length);
    renderHostelCards(data.hostels, grid);
    renderCampusMarker(data.searchContext ? {
      latitude: data.searchContext.latitude,
      longitude: data.searchContext.longitude,
      name: data.searchContext.campusName,
      universityName: data.searchContext.universityName,
    } : null);
    renderHostelMarkers(data.hostels);
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">Could not load hostels: ${err.message}</p>`;
  }
}

function currentFilters() {
  const featureBoxes = document.querySelectorAll('.feature-checkbox:checked');
  return {
    regionId: regionControl.getValue(),
    universityId: universityControl.getValue(),
    campusId: campusControl.getValue(),
    roomType: document.getElementById('roomTypeInput').value,
    minPrice: document.getElementById('minPriceInput')?.value,
    maxPrice: document.getElementById('maxPriceInput')?.value,
    availability: document.getElementById('availabilityInput')?.value,
    maxDistanceKm: document.getElementById('maxDistanceInput')?.value,
    features: Array.from(featureBoxes).map(b => b.value),
    sort: document.getElementById('sortInput')?.value,
  };
}

initHostelMap('hostelMap');

let locationController = {};

const regionControl = createSearchableSelect({
  inputEl: document.getElementById('regionInput'),
  hiddenEl: document.getElementById('regionInputValue'),
  dropdownEl: document.getElementById('regionInputDropdown'),
  onChange: (regionId) => locationController.loadUniversities && locationController.loadUniversities(regionId),
});

const universityControl = createSearchableSelect({
  inputEl: document.getElementById('universityInput'),
  hiddenEl: document.getElementById('universityInputValue'),
  dropdownEl: document.getElementById('universityInputDropdown'),
  onChange: (universityId) => locationController.loadCampuses && locationController.loadCampuses(universityId, regionControl.getValue()),
});

const campusControl = createSearchableSelect({
  inputEl: document.getElementById('campusInput'),
  hiddenEl: document.getElementById('campusInputValue'),
  dropdownEl: document.getElementById('campusInputDropdown'),
});

locationController = setupLocationDropdowns({ regionControl, universityControl, campusControl });

document.getElementById('filterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  loadHostels(currentFilters());
});

document.getElementById('sortInput')?.addEventListener('change', () => loadHostels(currentFilters()));

const filterToggle = document.getElementById('filterToggle');
const filterPanel = document.getElementById('filterPanel');
if (filterToggle && filterPanel) {
  filterToggle.addEventListener('click', () => {
    filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
  });
}
document.getElementById('applyFiltersBtn')?.addEventListener('click', () => loadHostels(currentFilters()));

loadHostels();
