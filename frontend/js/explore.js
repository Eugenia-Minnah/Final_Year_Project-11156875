// Language: JavaScript (runs in the browser)
// Powers the full "Explore all hostels" page — the complete, unrestricted
// database, with search/sort/filter/map. This is deliberately separate
// from the landing page's small "Featured Hostels" preview: this page
// never caps the number of results.

let selectedCampusId = '';
let selectedCampusName = '';
let currentPage = 1;
const PAGE_SIZE = 12;

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
    container.innerHTML = '<p class="empty-state">No hostels match your search yet.</p>';
    return;
  }

  container.innerHTML = hostels.map(h => `
    <a href="hostel.html?id=${h.id}${selectedCampusId ? '&campusId=' + selectedCampusId : ''}" class="hostel-card" style="display:block;">
      <div class="thumb" ${h.cover_image_url ? `style="background-image:url('${h.cover_image_url}'); background-size:cover; background-position:center;"` : ''}></div>
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

function renderPagination(pagination) {
  const box = document.getElementById('paginationControls');
  if (!pagination || pagination.totalPages <= 1) {
    box.innerHTML = '';
    return;
  }

  box.innerHTML = `
    <button type="button" class="btn btn-outline" id="prevPageBtn" ${pagination.page <= 1 ? 'disabled' : ''}>← Previous</button>
    <span style="font-size:14px; color:var(--text-muted);">Page ${pagination.page} of ${pagination.totalPages} &middot; ${pagination.totalCount} hostels</span>
    <button type="button" class="btn btn-outline" id="nextPageBtn" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>Next →</button>
  `;

  document.getElementById('prevPageBtn')?.addEventListener('click', () => {
    currentPage = Math.max(1, currentPage - 1);
    loadHostels({ ...currentFilters(), page: currentPage });
    window.scrollTo({ top: document.getElementById('hostelGrid').offsetTop - 20, behavior: 'smooth' });
  });
  document.getElementById('nextPageBtn')?.addEventListener('click', () => {
    currentPage = currentPage + 1;
    loadHostels({ ...currentFilters(), page: currentPage });
    window.scrollTo({ top: document.getElementById('hostelGrid').offsetTop - 20, behavior: 'smooth' });
  });
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
  params.set('page', filters.page || 1);
  params.set('pageSize', PAGE_SIZE);
  // Deliberately never sets `featured` — this page shows the full database, paginated.
  return params;
}

async function loadHostels(filters = {}) {
  const grid = document.getElementById('hostelGrid');
  grid.innerHTML = '<p class="empty-state">Loading hostels…</p>';

  selectedCampusId = filters.campusId || '';
  selectedCampusName = document.getElementById('campusInput').value || '';

  const params = buildQueryParams(filters);

  try {
    const data = await apiRequest('/api/hostels?' + params.toString(), { auth: true });
    renderResultsHeader(data.searchContext, data.pagination ? data.pagination.totalCount : data.hostels.length);
    renderHostelCards(data.hostels, grid);
    renderPagination(data.pagination);
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

document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  currentPage = 1;
  loadHostels(currentFilters());
});

document.getElementById('sortInput')?.addEventListener('change', () => {
  currentPage = 1;
  loadHostels(currentFilters());
});

const filterToggle = document.getElementById('filterToggle');
const filterPanel = document.getElementById('filterPanel');
if (filterToggle && filterPanel) {
  filterToggle.addEventListener('click', () => {
    filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
  });
}
document.getElementById('applyFiltersBtn')?.addEventListener('click', () => {
  currentPage = 1;
  loadHostels(currentFilters());
});

// If arriving from the landing page's hero search (or any link) with a
// region/university/campus already chosen, restore that selection and run
// the search immediately — so the very first thing the student sees is
// real, calculated distances, not an empty form to fill in again.
(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialRegionId = urlParams.get('regionId');

  if (initialRegionId) {
    await locationController.restoreSelection({
      regionId: initialRegionId,
      universityId: urlParams.get('universityId'),
      campusId: urlParams.get('campusId'),
    });
  }

  loadHostels(currentFilters());
})();
