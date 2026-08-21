// Language: JavaScript (runs in the browser)
// Loads ONE hostel (by ?id= and optional ?campusId= in the URL) and shows
// its full details, distance/travel estimate from the selected campus, and
// a map with a distinct campus pin.

async function loadHostelDetail() {
  const container = document.getElementById('hostelDetail');
  const urlParams = new URLSearchParams(window.location.search);
  const hostelId = urlParams.get('id');
  const campusId = urlParams.get('campusId');

  if (!hostelId) {
    container.innerHTML = '<p class="empty-state">No hostel selected.</p>';
    return;
  }

  try {
    const qs = campusId ? `?campusId=${campusId}` : '';
    const h = await apiRequest(`/api/hostels/${hostelId}${qs}`);

    const locationLine = `${h.city ? h.city + ', ' : ''}${h.region_name || ''}`;

    const distanceBlock = h.distance_km !== undefined
      ? `
        <div class="results-header" style="margin-top:12px;">
          <div class="breadcrumb">
            📍 <strong>${h.distance_km} km</strong> from ${h.referenceCampus.name}, ${h.referenceCampus.universityName}
            ${h.travel ? `&nbsp;·&nbsp; 🚶 ~${h.travel.walkingMinutes} min walk &nbsp;·&nbsp; 🚗 ~${h.travel.drivingMinutes} min drive` : ''}
          </div>
          ${h.viewRouteUrl ? `<a href="${h.viewRouteUrl}" target="_blank" class="btn btn-outline">View Route</a>` : ''}
        </div>
        <p style="font-size:12px; color:var(--text-muted); margin-top:6px;">
          Distance and travel time are straight-line estimates, not live traffic data.
        </p>
      `
      : '';

    const amenities = [
      h.has_security_guard ? '🛡️ 24-hour security guard' : null,
      h.has_cctv ? '📹 CCTV cameras' : null,
      h.has_wifi ? '📶 Wi-Fi' : null,
      h.has_parking ? '🚗 Parking' : null,
      h.has_shuttle ? '🚐 Shuttle service to campus' : null,
      h.has_water_supply ? '🚰 Reliable water supply' : null,
      h.has_electricity_backup ? '🔌 Electricity backup (generator)' : null,
      h.nearby_bus_stop ? `🚏 Near ${h.nearby_bus_stop}` : null,
    ].filter(Boolean);

    const amenitiesHtml = amenities.length
      ? `<ul style="padding-left:20px; margin:10px 0;">${amenities.map(a => `<li>${a}</li>`).join('')}</ul>`
      : '<p class="empty-state">No amenity information listed yet.</p>';

    const viewer = typeof currentUser === 'function' ? currentUser() : null;
    const canBook = viewer && viewer.role === 'student';

    const roomsHtml = (h.rooms || []).map(r => {
      const deposit = r.deposit_amount != null ? Number(r.deposit_amount) : Math.round(Number(r.price_per_year) * 0.1);
      return `
      <tr>
        <td>${r.room_type}</td>
        <td>GH₵${Number(r.price_per_year).toLocaleString()} / year</td>
        <td>GH₵${deposit.toLocaleString()}${r.deposit_amount == null ? ' (default 10%)' : ''}</td>
        <td>${r.available_units > 0 ? `${r.available_units} available` : 'Fully booked'}</td>
        <td>
          ${canBook && r.available_units > 0
            ? `<button type="button" class="btn btn-primary book-room-btn" data-room-id="${r.id}" data-price="${r.price_per_year}" data-deposit="${r.deposit_amount != null ? r.deposit_amount : ''}">Book</button>`
            : (r.available_units > 0 && !viewer ? '<a href="signin.html" class="btn btn-outline">Sign in to book</a>' : '')}
        </td>
      </tr>
    `;
    }).join('') || '<tr><td colspan="5">No room information yet.</td></tr>';

    const reviewsHtml = (h.reviews || []).map(rev => `
      <div style="padding:12px 0; border-bottom:1px solid var(--border);">
        <strong>${rev.full_name}</strong> — ${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}
        <p style="margin:4px 0 0; color:var(--text-muted);">${rev.comment || ''}</p>
      </div>
    `).join('') || '<p class="empty-state">No reviews yet.</p>';

    const editButton = (viewer && (viewer.id === h.owner_id || viewer.role === 'admin'))
      ? `<a href="edit-hostel.html?id=${h.id}" class="btn btn-outline" style="margin-top:12px; display:inline-block;">✏️ Edit this hostel</a>`
      : '';

    const reviewFormHtml = (viewer && viewer.role === 'student')
      ? `
        <div class="auth-card" style="max-width:100%; padding:20px; margin-bottom:20px;">
          <h4 style="margin-top:0;">Leave a review</h4>
          <div class="field">
            <label for="reviewRating">Rating</label>
            <select id="reviewRating" style="padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;">
              <option value="5">★★★★★ — Excellent</option>
              <option value="4">★★★★☆ — Good</option>
              <option value="3">★★★☆☆ — Okay</option>
              <option value="2">★★☆☆☆ — Poor</option>
              <option value="1">★☆☆☆☆ — Bad</option>
            </select>
          </div>
          <div class="field">
            <label for="reviewComment">Comment</label>
            <input type="text" id="reviewComment" placeholder="What was your experience like?" />
          </div>
          <button type="button" class="btn btn-primary" id="submitReviewBtn">Submit review</button>
        </div>
      `
      : (!viewer ? '<p class="empty-state"><a href="signin.html">Sign in</a> to leave a review.</p>' : '');

    container.innerHTML = `
      <a class="back-link" onclick="history.back()">← Back to results</a>
      <h2 style="margin-top:12px;">${h.name} ${h.is_verified ? '<span class="badge-verified">Verified</span>' : ''}</h2>
      <p style="color:var(--green); font-weight:600;">${locationLine}</p>
      ${distanceBlock}
      <p>${h.address || ''}</p>
      <p style="color:var(--text-muted);">${h.description || ''}</p>
      ${editButton}

      <h3 style="margin-top:30px;">Amenities</h3>
      ${amenitiesHtml}

      <h3 style="margin-top:30px;">Room types &amp; pricing</h3>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="text-align:left; border-bottom:2px solid var(--border);">
            <th style="padding:8px 0;">Room type</th>
            <th>Price</th>
            <th>Deposit</th>
            <th>Availability</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${roomsHtml}</tbody>
      </table>

      <h3 style="margin-top:30px;">Location</h3>
      <div id="hostelMap" style="height:360px; border-radius:14px; border:1px solid var(--border);"></div>

      <h3 style="margin-top:30px;">Reviews</h3>
      ${reviewFormHtml}
      <div id="reviewsList">${reviewsHtml}</div>
    `;

    if (h.latitude && h.longitude) {
      initHostelMap('hostelMap');
      if (h.referenceCampus && h.referenceCampus.latitude) {
        renderCampusMarker(h.referenceCampus);
      }
      renderHostelMarkers([h]);
    } else {
      document.getElementById('hostelMap').innerHTML =
        '<p class="empty-state">Exact location not available for this hostel yet.</p>';
    }

    // ---------- Book a room ----------
    document.querySelectorAll('.book-room-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const roomId = btn.getAttribute('data-room-id');
        const price = Number(btn.getAttribute('data-price'));
        const ownerDeposit = btn.getAttribute('data-deposit');
        const deposit = ownerDeposit ? Number(ownerDeposit) : Math.round(price * 0.1);
        const depositNote = ownerDeposit ? '' : ' (default 10% of the yearly price, since the owner hasn\'t set a specific deposit)';

        if (!confirm(`Book this room? A deposit of GH₵${deposit.toLocaleString()} will be recorded for this booking${depositNote}.`)) {
          return;
        }

        try {
          await apiRequest('/api/bookings', { method: 'POST', auth: true, body: { roomId } });
          alert('Booking confirmed! You can see it under "My bookings" on your dashboard.');
          loadHostelDetail(); // refresh to show updated availability
        } catch (err) {
          alert('Could not complete booking: ' + err.message);
        }
      });
    });

    // ---------- Submit a review ----------
    const submitReviewBtn = document.getElementById('submitReviewBtn');
    if (submitReviewBtn) {
      submitReviewBtn.addEventListener('click', async () => {
        try {
          await apiRequest(`/api/hostels/${hostelId}/reviews`, {
            method: 'POST',
            auth: true,
            body: {
              rating: document.getElementById('reviewRating').value,
              comment: document.getElementById('reviewComment').value,
            },
          });
          loadHostelDetail(); // refresh to show the new/updated review
        } catch (err) {
          alert('Could not save your review: ' + err.message);
        }
      });
    }
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Could not load this hostel: ${err.message}</p>`;
  }
}

loadHostelDetail();
