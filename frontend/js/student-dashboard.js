// Language: JavaScript (runs in the browser)
// This is the STUDENT dashboard's script — it never references hostel
// management (My Hostels, Add/Edit hostel). If a non-student ends up here
// (e.g. by typing the URL directly), the guard below sends them to their
// own correct dashboard instead. This is a frontend convenience only —
// every actual data-changing action is independently re-checked by the
// backend's role middleware, which is the real security boundary.

if (!isLoggedIn()) {
  window.location.href = 'signin.html';
}

const user = currentUser();
if (user && user.role !== 'student') {
  redirectToRoleDashboard(user.role);
}
if (user) {
  document.getElementById('userName').textContent = user.fullName || user.email;
}

document.getElementById('logoutBtn').addEventListener('click', logout);

async function loadMyBookings() {
  const list = document.getElementById('myBookingsList');
  list.innerHTML = '<p class="empty-state">Loading your bookings...</p>';
  try {
    const bookings = await apiRequest('/api/bookings/mine', { auth: true });
    if (bookings.length === 0) {
      list.innerHTML = '<p class="empty-state">You have not booked a room yet.</p>';
      return;
    }
    list.innerHTML = bookings.map(function (b) {
      return '<div class="hostel-card" style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; margin-bottom:10px;">' +
        '<div>' +
        '<strong><a href="hostel.html?id=' + b.hostel_id + '">' + b.hostel_name + '</a></strong>' +
        '<div style="font-size:13px; color:var(--text-muted);">' +
        b.room_type + ' &middot; Deposit GH\u20B5' + Number(b.deposit_amount).toLocaleString() +
        ' &middot; Status: <span style="text-transform:capitalize; font-weight:600; color:' + (b.status === 'cancelled' ? 'var(--text-muted)' : 'var(--green)') + ';">' + b.status + '</span>' +
        '</div></div>' +
        (b.status !== 'cancelled'
          ? '<button type="button" class="btn btn-outline cancel-booking-btn" data-booking-id="' + b.id + '">Cancel</button>'
          : '') +
        '</div>';
    }).join('');

    document.querySelectorAll('.cancel-booking-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!confirm('Cancel this booking?')) return;
        try {
          await apiRequest('/api/bookings/' + btn.getAttribute('data-booking-id') + '/cancel', { method: 'POST', auth: true });
          loadMyBookings();
        } catch (err) {
          alert('Could not cancel booking: ' + err.message);
        }
      });
    });
  } catch (err) {
    list.innerHTML = '<p class="empty-state">Could not load your bookings: ' + err.message + '</p>';
  }
}
loadMyBookings();

let selectedCampusId = '';
let selectedCampusName = '';

function renderResultsHeader(searchContext, hostelCount) {
  const box = document.getElementById('resultsHeader');
  if (!searchContext) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML =
    '<div class="results-header"><div class="breadcrumb">' +
    'Hostels near <strong>' + searchContext.campusName + '</strong>' +
    ' &nbsp;\u00B7&nbsp; \uD83D\uDCCD ' + searchContext.regionName +
    ' &nbsp;\u00B7&nbsp; \uD83C\uDF93 ' + searchContext.universityName +
    ' &nbsp;\u00B7&nbsp; ' + hostelCount + ' found' +
    '</div></div>';
}

function renderHostelCards(hostels, container) {
  if (hostels.length === 0) {
    container.innerHTML = '<p class="empty-state">No hostels match your filters.</p>';
    return;
  }

  container.innerHTML = hostels.map(function (h) {
    return '<a href="hostel.html?id=' + h.id + (selectedCampusId ? '&campusId=' + selectedCampusId : '') + '" class="hostel-card" style="display:block;">' +
      '<div class="thumb"' + (h.cover_image_url ? ' style="background-image:url(\'' + h.cover_image_url + '\'); background-size:cover; background-position:center;"' : '') + '></div><div class="body">' +
      '<h3>' + h.name + ' ' + (h.is_verified ? '<span class="badge-verified">Verified</span>' : '') + '</h3>' +
      '<div class="region">' + (h.city ? h.city + ', ' : '') + (h.region_name || '') + '</div>' +
      '<div>' + (h.address || '') + '</div>' +
      (h.distance_km !== undefined ? '<div style="font-size:13px; color:var(--green); font-weight:600;">\uD83D\uDCCD ' + h.distance_km + ' km from ' + selectedCampusName + '</div>' : '') +
      '<div class="price">' + (h.from_price ? 'From GH\u20B5' + Number(h.from_price).toLocaleString() + ' / year' : 'Contact for pricing') + '</div>' +
      '</div></a>';
  }).join('');
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

async function loadHostels(filters) {
  filters = filters || {};
  const grid = document.getElementById('hostelGrid');
  grid.innerHTML = '<p class="empty-state">Loading hostels...</p>';

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
    grid.innerHTML = '<p class="empty-state">Could not load hostels: ' + err.message + '</p>';
  }
}

function currentFilters() {
  const featureBoxes = document.querySelectorAll('.feature-checkbox:checked');
  return {
    regionId: regionControl.getValue(),
    universityId: universityControl.getValue(),
    campusId: campusControl.getValue(),
    roomType: document.getElementById('roomTypeInput').value,
    minPrice: document.getElementById('minPriceInput') ? document.getElementById('minPriceInput').value : undefined,
    maxPrice: document.getElementById('maxPriceInput') ? document.getElementById('maxPriceInput').value : undefined,
    availability: document.getElementById('availabilityInput') ? document.getElementById('availabilityInput').value : undefined,
    maxDistanceKm: document.getElementById('maxDistanceInput') ? document.getElementById('maxDistanceInput').value : undefined,
    features: Array.from(featureBoxes).map(function (b) { return b.value; }),
    sort: document.getElementById('sortInput') ? document.getElementById('sortInput').value : undefined,
  };
}

initHostelMap('hostelMap');

let locationController = {};

const regionControl = createSearchableSelect({
  inputEl: document.getElementById('regionInput'),
  hiddenEl: document.getElementById('regionInputValue'),
  dropdownEl: document.getElementById('regionInputDropdown'),
  onChange: function (regionId) { if (locationController.loadUniversities) locationController.loadUniversities(regionId); },
});

const universityControl = createSearchableSelect({
  inputEl: document.getElementById('universityInput'),
  hiddenEl: document.getElementById('universityInputValue'),
  dropdownEl: document.getElementById('universityInputDropdown'),
  onChange: function (universityId) { if (locationController.loadCampuses) locationController.loadCampuses(universityId, regionControl.getValue()); },
});

const campusControl = createSearchableSelect({
  inputEl: document.getElementById('campusInput'),
  hiddenEl: document.getElementById('campusInputValue'),
  dropdownEl: document.getElementById('campusInputDropdown'),
});

locationController = setupLocationDropdowns({ regionControl: regionControl, universityControl: universityControl, campusControl: campusControl });

document.getElementById('filterForm').addEventListener('submit', function (e) {
  e.preventDefault();
  loadHostels(currentFilters());
});

const sortInputEl = document.getElementById('sortInput');
if (sortInputEl) sortInputEl.addEventListener('change', function () { loadHostels(currentFilters()); });

const filterToggle = document.getElementById('filterToggle');
const filterPanel = document.getElementById('filterPanel');
if (filterToggle && filterPanel) {
  filterToggle.addEventListener('click', function () {
    filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
  });
}
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', function () { loadHostels(currentFilters()); });

loadHostels();
