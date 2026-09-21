// Language: JavaScript (runs in the browser)
// One place that knows how to talk to the backend API.

const API_BASE = ''; // same-origin, since Express serves the frontend too

async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = localStorage.getItem('shf_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

// ---- File upload helper (separate from apiRequest, which only sends JSON) ----
// Used for hostel photo uploads. Kept as its own function so the existing
// apiRequest() — used everywhere else in the app — is never touched.
async function apiUpload(path, file) {
  const token = localStorage.getItem('shf_token');
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(API_BASE + path, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    // Deliberately no Content-Type header — the browser sets the correct
    // multipart/form-data boundary automatically when body is FormData.
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Could not upload the image.');
  }
  return data;
}

// ---- Auth helpers shared by every page ----
function isLoggedIn() {
  return !!localStorage.getItem('shf_token');
}

function currentUser() {
  const raw = localStorage.getItem('shf_user');
  return raw ? JSON.parse(raw) : null;
}

function logout() {
  localStorage.removeItem('shf_token');
  localStorage.removeItem('shf_user');
  window.location.href = 'index.html';
}

// ---- HTML escaping helper to prevent Cross-Site Scripting (XSS) ----
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));
}
