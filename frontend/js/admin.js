// Language: JavaScript (runs in the browser)
// Guards this page to admins only, then lists hostels awaiting approval
// with Approve/Reject actions.

if (!isLoggedIn()) {
  window.location.href = 'signin.html';
}
const user = currentUser();
if (user && user.role !== 'admin') {
  document.body.innerHTML = '<div class="section"><p class="empty-state">This page is for admins only. <a href="dashboard.html">Back to dashboard</a></p></div>';
}

async function loadPendingHostels() {
  const list = document.getElementById('pendingList');
  list.innerHTML = '<p class="empty-state">Loading…</p>';

  try {
    const hostels = await apiRequest('/api/hostels/admin/pending', { auth: true });

    if (hostels.length === 0) {
      list.innerHTML = '<p class="empty-state">Nothing pending — all caught up.</p>';
      return;
    }

    list.innerHTML = hostels.map(h => `
      <div class="hostel-card" style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; margin-bottom:10px;">
        <div>
          <strong><a href="hostel.html?id=${h.id}">${h.name}</a></strong>
          <div style="font-size:13px; color:var(--text-muted);">
            ${h.city ? h.city + ', ' : ''}${h.region_name || 'No region set'} &middot; Owner: ${h.owner_name}
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-primary approve-btn" data-id="${h.id}">Approve</button>
          <button type="button" class="btn btn-outline reject-btn" data-id="${h.id}">Reject</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await apiRequest(`/api/hostels/${btn.getAttribute('data-id')}/verify`, { method: 'PUT', auth: true });
          loadPendingHostels();
        } catch (err) {
          alert('Could not approve: ' + err.message);
        }
      });
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Reject and permanently remove this listing?')) return;
        try {
          await apiRequest(`/api/hostels/${btn.getAttribute('data-id')}`, { method: 'DELETE', auth: true });
          loadPendingHostels();
        } catch (err) {
          alert('Could not reject: ' + err.message);
        }
      });
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">Could not load pending hostels: ${err.message}</p>`;
  }
}

loadPendingHostels();
