// Language: JavaScript (runs in the browser)
// This is the OWNER PORTAL's script. It contains hostel-management and booking-management
// logic ONLY — no student search or student booking creation. If a student
// ends up here (e.g. by typing the URL directly), the guard below
// sends them to their own correct dashboard instead.

if (!isLoggedIn()) {
  window.location.href = 'owner-login.html';
}

const user = currentUser();
if (user && user.role !== 'owner' && user.role !== 'admin') {
  redirectToRoleDashboard(user.role);
}
if (user) {
  document.getElementById('userName').textContent = user.fullName || user.email;
}

document.getElementById('logoutBtn').addEventListener('click', logout);

// ---------- Account menu (hamburger) dropdown ----------
const accountMenuBtn = document.getElementById('accountMenuBtn');
const accountDropdown = document.getElementById('accountDropdown');
accountMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = accountDropdown.style.display === 'block';
  accountDropdown.style.display = isOpen ? 'none' : 'block';
  accountMenuBtn.setAttribute('aria-expanded', String(!isOpen));
});
document.addEventListener('click', (e) => {
  if (!accountDropdown.contains(e.target) && e.target !== accountMenuBtn) {
    accountDropdown.style.display = 'none';
    accountMenuBtn.setAttribute('aria-expanded', 'false');
  }
});

async function loadMyHostels() {
  const list = document.getElementById('myHostelsList');
  list.innerHTML = '<p class="empty-state">Loading your hostels...</p>';
  try {
    const hostels = await apiRequest('/api/hostels/mine', { auth: true });
    if (hostels.length === 0) {
      list.innerHTML = '<p class="empty-state">You have not added any hostels yet. Use "+ Add hostel" above to list a new one, or <a href="explore.html">browse existing hostels</a> if you\'d like to claim one that\'s already listed.</p>';
      return;
    }
    list.innerHTML = hostels.map((h) => {
      const locationText = `${h.city ? escapeHtml(h.city) + ', ' : ''}${escapeHtml(h.region_name || 'No region set')}`;
      return `
        <div class="hostel-card" style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; margin-bottom:10px;">
          <div>
            <strong>${escapeHtml(h.name)}</strong> ${h.is_verified ? '<span class="badge-verified">Verified</span>' : '<span style="font-size:12px; color:var(--text-muted);">Pending approval</span>'}
            ${h.latitude ? '' : ' <span style="font-size:12px; color:#B3261E;">No location set</span>'}
            <div style="font-size:13px; color:var(--text-muted);">${locationText}</div>
          </div>
          <div style="display:flex; gap:8px;">
            ${h.latitude ? '' : `<button type="button" class="btn btn-outline auto-locate-btn" data-id="${h.id}">📍 Auto-locate</button>`}
            <a href="hostel.html?id=${h.id}" class="btn btn-outline">View</a>
            <a href="edit-hostel.html?id=${h.id}" class="btn btn-primary">Edit</a>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.auto-locate-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const hostelId = btn.getAttribute('data-id');
        btn.textContent = 'Locating...';
        btn.disabled = true;
        try {
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
    list.innerHTML = `<p class="empty-state">Could not load your hostels: ${escapeHtml(err.message)}</p>`;
  }
}

async function loadIncomingBookings() {
  const container = document.getElementById('ownerBookingsList');
  if (!container) return;
  container.innerHTML = '<p class="empty-state">Loading bookings...</p>';

  try {
    const bookings = await apiRequest('/api/bookings/owner', { auth: true });
    if (bookings.length === 0) {
      container.innerHTML = '<p class="empty-state">No student bookings yet. When students book rooms in your hostels, their details will appear here.</p>';
      return;
    }

    container.innerHTML = bookings.map((b) => {
      const isPaid = b.payment_status === 'paid';
      const statusColor = b.status === 'cancelled' ? 'var(--text-muted)' : (isPaid ? 'var(--green)' : '#B86200');
      const depositDisplay = Number(b.deposit_amount).toLocaleString();
      const bookedDate = new Date(b.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      return `
        <div class="hostel-card" style="padding:16px 20px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
            <div>
              <strong style="font-size:16px;">${escapeHtml(b.hostel_name)}</strong> — <span style="color:var(--green); font-weight:600;">${escapeHtml(b.room_type)}</span>
              <div style="margin-top:6px; font-size:14px;">
                <strong>Student:</strong> ${escapeHtml(b.student_name)} &middot;
                <strong>Email:</strong> <a href="mailto:${escapeHtml(b.student_email)}">${escapeHtml(b.student_email)}</a>
                ${b.student_phone ? `&middot; <strong>Phone:</strong> <a href="tel:${escapeHtml(b.student_phone)}">${escapeHtml(b.student_phone)}</a>` : ''}
              </div>
              <div style="margin-top:4px; font-size:13px; color:var(--text-muted);">
                Booked on ${bookedDate} &middot; Room rate: GH₵${Number(b.price_per_year).toLocaleString()} / year
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:15px; font-weight:700;">Deposit: GH₵${depositDisplay}</div>
              <div style="margin-top:4px;">
                <span style="display:inline-block; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:600; text-transform:capitalize; background:${isPaid ? '#E4F3EF' : '#FFF4E5'}; color:${statusColor};">
                  ${isPaid ? '✓ Deposit Paid' : 'Payment Pending'}
                </span>
                ${b.status === 'cancelled' ? '<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:12px; background:#F0F0F0; color:var(--text-muted); margin-left:4px;">Cancelled</span>' : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Could not load bookings: ${escapeHtml(err.message)}</p>`;
  }
}

loadMyHostels();
loadIncomingBookings();
