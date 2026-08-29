// Language: JavaScript (runs in the browser)
// Loads only a small, curated selection of hostels for the landing page —
// deliberately never the full database. See explore.js for the full,
// unrestricted search experience.

async function loadFeaturedHostels() {
  const grid = document.getElementById('featuredGrid');
  grid.innerHTML = '<p class="empty-state">Loading featured hostels…</p>';

  try {
    const data = await apiRequest('/api/hostels?featured=true&limit=8');

    if (data.hostels.length === 0) {
      grid.innerHTML = '<p class="empty-state">No featured hostels yet — check back soon, or explore the full list.</p>';
      return;
    }

    grid.innerHTML = data.hostels.map(h => `
      <a href="hostel.html?id=${h.id}" class="hostel-card" style="display:block;">
        <div class="thumb" ${h.cover_image_url ? `style="background-image:url('${h.cover_image_url}'); background-size:cover; background-position:center;"` : ''}></div>
        <div class="body">
          <h3>${h.name} ${h.is_verified ? '<span class="badge-verified">Verified</span>' : ''}</h3>
          <div class="region">${h.city ? `${h.city}, ` : ''}${h.region_name || ''}</div>
          <div>${h.address || ''}</div>
          <div class="price">${h.from_price ? 'From GH₵' + Number(h.from_price).toLocaleString() + ' / year' : 'Contact for pricing'}</div>
        </div>
      </a>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">Could not load featured hostels: ${err.message}</p>`;
  }
}

loadFeaturedHostels();
