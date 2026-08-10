// Language: JavaScript (runs in the browser)
// Loads hostels from the API and renders them as cards on the landing page.
// No login required — this matches the requirement that the website is browsable
// without signing in.

function renderHostelCards(hostels, container) {
  if (hostels.length === 0) {
    container.innerHTML = '<p class="empty-state">No hostels match your search yet.</p>';
    return;
  }

  container.innerHTML = hostels.map(h => `
    <div class="hostel-card">
      <div class="thumb"></div>
      <div class="body">
        <h3>${h.name} ${h.is_verified ? '<span class="badge-verified">Verified</span>' : ''}</h3>
        <div class="region">${h.region}</div>
        <div>${h.address || ''}</div>
        <div class="price">${h.from_price ? 'From GH₵' + Number(h.from_price).toLocaleString() + ' / year' : 'Contact for pricing'}</div>
      </div>
    </div>
  `).join('');
}

async function loadHostels(filters = {}) {
  const grid = document.getElementById('hostelGrid');
  grid.innerHTML = '<p class="empty-state">Loading hostels…</p>';

  const params = new URLSearchParams();
  if (filters.region) params.set('region', filters.region);
  if (filters.roomType) params.set('roomType', filters.roomType);

  try {
    const hostels = await apiRequest('/api/hostels?' + params.toString());
    renderHostelCards(hostels, grid);
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">Could not load hostels: ${err.message}</p>`;
  }
}

document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  loadHostels({
    region: document.getElementById('regionInput').value,
    roomType: document.getElementById('roomTypeInput').value,
  });
});

loadHostels();
