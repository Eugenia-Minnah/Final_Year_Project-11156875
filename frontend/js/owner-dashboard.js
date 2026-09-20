// Language: JavaScript (runs in the browser)
// This is the OWNER PORTAL's script. It contains hostel-management logic
// ONLY — no student search, no bookings, no browsing. If a student or
// admin ends up here (e.g. by typing the URL directly), the guard below
// sends them to their own correct dashboard instead. As always, this is
// a frontend convenience only: the backend's role middleware independently
// re-checks every actual create/edit/delete request, so a student could
// never actually manage a hostel even if they bypassed this page.

if (!isLoggedIn()) {
  window.location.href = 'signin.html';
}

const user = currentUser();
if (user && user.role !== 'owner' && user.role !== 'admin') {
  redirectToRoleDashboard(user.role);
}
if (user) {
  document.getElementById('userName').textContent = user.fullName || user.email;
}

document.getElementById('logoutBtn').addEventListener('click', logout);

async function loadMyHostels() {
  const list = document.getElementById('myHostelsList');
  list.innerHTML = '<p class="empty-state">Loading your hostels...</p>';
  try {
    const hostels = await apiRequest('/api/hostels/mine', { auth: true });
    if (hostels.length === 0) {
      list.innerHTML = '<p class="empty-state">You have not added any hostels yet. Use "+ Add hostel" above to list a new one, or <a href="explore.html">browse existing hostels</a> if you\'d like to claim one that\'s already listed.</p>';
      return;
    }
    list.innerHTML = hostels.map(function (h) {
      return '<div class="hostel-card" style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; margin-bottom:10px;">' +
        '<div>' +
        '<strong>' + h.name + '</strong> ' + (h.is_verified ? '<span class="badge-verified">Verified</span>' : '<span style="font-size:12px; color:var(--text-muted);">Pending approval</span>') +
        (h.latitude ? '' : ' <span style="font-size:12px; color:#B3261E;">No location set</span>') +
        '<div style="font-size:13px; color:var(--text-muted);">' + (h.city ? h.city + ', ' : '') + (h.region_name || 'No region set') + '</div>' +
        '</div>' +
        '<div style="display:flex; gap:8px;">' +
        (h.latitude ? '' : '<button type="button" class="btn btn-outline auto-locate-btn" data-id="' + h.id + '">📍 Auto-locate</button>') +
        '<a href="hostel.html?id=' + h.id + '" class="btn btn-outline">View</a>' +
        '<a href="edit-hostel.html?id=' + h.id + '" class="btn btn-primary">Edit</a>' +
        '</div></div>';
    }).join('');

    document.querySelectorAll('.auto-locate-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const hostelId = btn.getAttribute('data-id');
        btn.textContent = 'Locating...';
        btn.disabled = true;
        try {
          // Fetch this hostel's own address/city/region to build a query,
          // then geocode it right here in the browser (see note in
          // geocode-client.js for why this can't be a backend call).
          const hostel = await apiRequest('/api/hostels/' + hostelId);
          const addressQuery = [hostel.address, hostel.city, hostel.region_name, 'Ghana'].filter(Boolean).join(', ');

          if (!addressQuery) {
            alert('This hostel has no address/city/region to locate from. Edit it to add one, or set the location manually on the map.');
            btn.textContent = '📍 Auto-locate';
            btn.disabled = false;
            return;
          }

          const geocoded = await geocodeAddressClientSide(addressQuery);
          if (!geocoded) {
            alert('Could not find coordinates for "' + addressQuery + '". Try editing the hostel and setting the location manually on the map.');
            btn.textContent = '📍 Auto-locate';
            btn.disabled = false;
            return;
          }

          await apiRequest('/api/hostels/' + hostelId + '/coordinates', {
            method: 'PATCH',
            auth: true,
            body: { latitude: geocoded.latitude, longitude: geocoded.longitude },
          });
          loadMyHostels();
        } catch (err) {
          alert('Could not auto-locate: ' + err.message);
          btn.textContent = '📍 Auto-locate';
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    list.innerHTML = '<p class="empty-state">Could not load your hostels: ' + err.message + '</p>';
  }
}
loadMyHostels();
