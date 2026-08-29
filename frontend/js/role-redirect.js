// Language: JavaScript (runs in the browser)
// Single source of truth for "which dashboard does this role belong to".
// Used by the login pages, the generic dashboard.html redirector, and the
// role guards on each dashboard page — so there's only one place that
// defines the student/owner/admin split.

function dashboardUrlForRole(role) {
  if (role === 'admin') return 'admin.html';
  if (role === 'owner') return 'owner-dashboard.html';
  return 'student-dashboard.html';
}

function redirectToRoleDashboard(role) {
  window.location.href = dashboardUrlForRole(role);
}
