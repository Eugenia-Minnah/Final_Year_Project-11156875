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
          ${h.latitude ? '' : '<span style="font-size:12px; color:#B3261E;">No location set</span>'}
          <div style="font-size:13px; color:var(--text-muted);">
            ${h.city ? h.city + ', ' : ''}${h.region_name || 'No region set'} &middot; Owner: ${h.owner_name}
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          ${h.latitude ? '' : `<button type="button" class="btn btn-outline auto-locate-btn" data-id="${h.id}">📍 Auto-locate</button>`}
          <button type="button" class="btn btn-primary approve-btn" data-id="${h.id}">Approve</button>
          <button type="button" class="btn btn-outline reject-btn" data-id="${h.id}">Reject</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.auto-locate-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const hostelId = btn.getAttribute('data-id');
        btn.textContent = 'Locating...';
        btn.disabled = true;
        try {
          const hostel = await apiRequest(`/api/hostels/${hostelId}`);
          const addressQuery = [hostel.address, hostel.city, hostel.region_name, 'Ghana'].filter(Boolean).join(', ');

          if (!addressQuery) {
            alert('This hostel has no address/city/region to locate from.');
            btn.textContent = '📍 Auto-locate';
            btn.disabled = false;
            return;
          }

          const geocoded = await geocodeAddressClientSide(addressQuery);
          if (!geocoded) {
            alert(`Could not find coordinates for "${addressQuery}".`);
            btn.textContent = '📍 Auto-locate';
            btn.disabled = false;
            return;
          }

          await apiRequest(`/api/hostels/${hostelId}/coordinates`, {
            method: 'PATCH',
            auth: true,
            body: { latitude: geocoded.latitude, longitude: geocoded.longitude },
          });
          loadPendingHostels();
        } catch (err) {
          alert('Could not auto-locate: ' + err.message);
          btn.textContent = '📍 Auto-locate';
          btn.disabled = false;
        }
      });
    });

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

// ---------- Hostel claim requests ----------
async function loadClaimRequests() {
  const list = document.getElementById('claimsList');
  if (!list) return; // admin.html not updated with the claims section yet — skip gracefully
  list.innerHTML = '<p class="empty-state">Loading…</p>';

  try {
    const claims = await apiRequest('/api/hostels/admin/claims', { auth: true });

    if (claims.length === 0) {
      list.innerHTML = '<p class="empty-state">No pending claim requests.</p>';
      return;
    }

    list.innerHTML = claims.map(c => `
      <div class="hostel-card" style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; margin-bottom:10px;">
        <div>
          <strong><a href="hostel.html?id=${c.hostel_id}">${c.hostel_name}</a></strong>
          <div style="font-size:13px; color:var(--text-muted);">
            Requested by ${c.requester_name} (${c.requester_email})
            ${c.message ? '<br>"' + c.message + '"' : ''}
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-primary approve-claim-btn" data-id="${c.id}">Approve</button>
          <button type="button" class="btn btn-outline reject-claim-btn" data-id="${c.id}">Reject</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.approve-claim-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Approve this claim and transfer ownership of the hostel?')) return;
        try {
          await apiRequest(`/api/hostels/claims/${btn.getAttribute('data-id')}/approve`, { method: 'PUT', auth: true });
          loadClaimRequests();
        } catch (err) {
          alert('Could not approve claim: ' + err.message);
        }
      });
    });

    document.querySelectorAll('.reject-claim-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await apiRequest(`/api/hostels/claims/${btn.getAttribute('data-id')}/reject`, { method: 'PUT', auth: true });
          loadClaimRequests();
        } catch (err) {
          alert('Could not reject claim: ' + err.message);
        }
      });
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">Could not load claim requests: ${err.message}</p>`;
  }
}

loadClaimRequests();
