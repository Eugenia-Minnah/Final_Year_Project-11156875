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

    const roomsHtml = (h.rooms || []).map(r => `
      <tr>
        <td>${r.room_type}</td>
        <td>GH₵${Number(r.price_per_year).toLocaleString()} / year</td>
        <td>${r.available_units > 0 ? `${r.available_units} available` : 'Fully booked'}</td>
      </tr>
    `).join('') || '<tr><td colspan="3">No room information yet.</td></tr>';

    const reviewsHtml = (h.reviews || []).map(rev => `
      <div style="padding:12px 0; border-bottom:1px solid var(--border);">
        <strong>${rev.full_name}</strong> — ${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}
        <p style="margin:4px 0 0; color:var(--text-muted);">${rev.comment || ''}</p>
      </div>
    `).join('') || '<p class="empty-state">No reviews yet.</p>';

    container.innerHTML = `
      <a class="back-link" onclick="history.back()">← Back to results</a>
      <h2 style="margin-top:12px;">${h.name} ${h.is_verified ? '<span class="badge-verified">Verified</span>' : ''}</h2>
      <p style="color:var(--green); font-weight:600;">${locationLine}</p>
      ${distanceBlock}
      <p>${h.address || ''}</p>
      <p style="color:var(--text-muted);">${h.description || ''}</p>

      <h3 style="margin-top:30px;">Amenities</h3>
      ${amenitiesHtml}

      <h3 style="margin-top:30px;">Room types &amp; pricing</h3>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="text-align:left; border-bottom:2px solid var(--border);">
            <th style="padding:8px 0;">Room type</th>
            <th>Price</th>
            <th>Availability</th>
          </tr>
        </thead>
        <tbody>${roomsHtml}</tbody>
      </table>

      <h3 style="margin-top:30px;">Location</h3>
      <div id="hostelMap" style="height:360px; border-radius:14px; border:1px solid var(--border);"></div>

      <h3 style="margin-top:30px;">Reviews</h3>
      ${reviewsHtml}
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
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Could not load this hostel: ${err.message}</p>`;
  }
}

loadHostelDetail();
