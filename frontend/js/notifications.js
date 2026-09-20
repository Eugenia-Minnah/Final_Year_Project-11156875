// Language: JavaScript (runs in the browser)
function initNotificationBell() {
  const bellBtn = document.getElementById('notificationBell');
  const badge = document.getElementById('notificationBadge');
  const dropdown = document.getElementById('notificationDropdown');
  if (!bellBtn || !badge || !dropdown) return;

  async function refreshBadge() {
    try {
      const data = await apiRequest('/api/notifications/unread-count', { auth: true });
      if (data.count > 0) {
        badge.textContent = data.count > 9 ? '9+' : String(data.count);
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    } catch (err) { /* silent */ }
  }

  async function loadDropdown() {
    dropdown.innerHTML = '<p class="empty-state" style="padding:16px;">Loading…</p>';
    try {
      const notifications = await apiRequest('/api/notifications/mine', { auth: true });

      if (notifications.length === 0) {
        dropdown.innerHTML = '<p class="empty-state" style="padding:16px;">No notifications yet.</p>';
        return;
      }

      dropdown.innerHTML = notifications.map(n => `
        <div class="notification-item" data-id="${n.id}" data-link="${n.link || ''}" style="padding:12px 16px; border-bottom:1px solid var(--border); cursor:pointer; ${n.is_read ? '' : 'background:#EEF7F4;'}">
          <div style="font-size:14px;">${n.message}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">${new Date(n.created_at).toLocaleString()}</div>
        </div>
      `).join('');

      dropdown.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
          const id = item.getAttribute('data-id');
          const link = item.getAttribute('data-link');
          try { await apiRequest(`/api/notifications/${id}/read`, { method: 'PUT', auth: true }); } catch (err) {}
          if (link) window.location.href = link;
          else { refreshBadge(); loadDropdown(); }
        });
      });
    } catch (err) {
      dropdown.innerHTML = `<p class="empty-state" style="padding:16px;">Could not load notifications: ${err.message}</p>`;
    }
  }

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) loadDropdown();
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== bellBtn) {
      dropdown.style.display = 'none';
    }
  });

  refreshBadge();
  setInterval(refreshBadge, 30000);
}
