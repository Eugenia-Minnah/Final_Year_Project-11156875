// Language: JavaScript (runs in the browser)
// This file "guards" the dashboard page: if there is no valid login token,
// the visitor is bounced back to the sign-in page. This is what makes
// dashboard.html the protected "web app" area, versus index.html which
// is the public website.

if (!isLoggedIn()) {
  window.location.href = 'signin.html';
}

const user = currentUser();
if (user) {
  document.getElementById('userName').textContent = user.fullName || user.email;
}

document.getElementById('logoutBtn').addEventListener('click', logout);

function renderHostelCards(hostels, container) {
  if (hostels.length === 0) {
    container.innerHTML = '<p class="empty-state">No hostels match your filters.</p>';
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
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);

  try {
    // auth: true attaches the login token, since this is a page inside the web app
    const hostels = await apiRequest('/api/hostels?' + params.toString(), { auth: true });
    renderHostelCards(hostels, grid);
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">Could not load hostels: ${err.message}</p>`;
  }
}

document.getElementById('filterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  loadHostels({
    region: document.getElementById('regionInput').value,
    roomType: document.getElementById('roomTypeInput').value,
    maxPrice: document.getElementById('maxPriceInput').value,
  });
});

loadHostels();
