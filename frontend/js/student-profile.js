// Language: JavaScript (runs in the browser)
// Powers the student profile page: load current details, edit name/phone/
// home campus, and change password (requires the current password).

if (!isLoggedIn()) {
  window.location.href = 'student-login.html';
}
const user = currentUser();
if (user && user.role !== 'student') {
  redirectToRoleDashboard(user.role);
}

const errorBox = document.getElementById('errorMsg');
const successBox = document.getElementById('successMsg');

function showError(msg) {
  successBox.style.display = 'none';
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}
function showSuccess(msg) {
  errorBox.style.display = 'none';
  successBox.textContent = msg;
  successBox.style.display = 'block';
}

// ---------- Cascading campus picker (same pattern as signup) ----------
const regionControl = createSearchableSelect({
  inputEl: document.getElementById('profileRegion'),
  hiddenEl: document.getElementById('profileRegionValue'),
  dropdownEl: document.getElementById('profileRegionDropdown'),
  onChange: (regionId) => locationController.loadUniversities && locationController.loadUniversities(regionId),
});
const universityControl = createSearchableSelect({
  inputEl: document.getElementById('profileUniversity'),
  hiddenEl: document.getElementById('profileUniversityValue'),
  dropdownEl: document.getElementById('profileUniversityDropdown'),
  onChange: (universityId) => locationController.loadCampuses && locationController.loadCampuses(universityId, regionControl.getValue()),
});
const campusControl = createSearchableSelect({
  inputEl: document.getElementById('profileCampus'),
  hiddenEl: document.getElementById('profileCampusValue'),
  dropdownEl: document.getElementById('profileCampusDropdown'),
});
let locationController = setupLocationDropdowns({ regionControl, universityControl, campusControl });

// ---------- Load current profile ----------
// The /me endpoint gives us the campus's NAME, not the region/university
// IDs needed to drive the cascading dropdowns' internal state — so on
// load, we just display the current selection as text. If the student
// wants to change it, picking a new region naturally repopulates
// everything correctly from that point on.
async function loadProfile() {
  try {
    const me = await apiRequest('/api/auth/me', { auth: true });

    document.getElementById('fullName').value = me.full_name || '';
    document.getElementById('email').value = me.email || '';
    document.getElementById('phone').value = me.phone || '';

    if (me.home_campus_id && me.region_name) {
      document.getElementById('profileRegion').value = me.region_name;
      document.getElementById('profileUniversity').value = me.university_name;
      document.getElementById('profileCampus').value = me.campus_name;
      document.getElementById('profileCampusValue').value = me.home_campus_id;
    }
  } catch (err) {
    showError('Could not load your profile: ' + err.message);
  }
}
loadProfile();

// ---------- Save profile ----------
document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const updated = await apiRequest('/api/auth/me', {
      method: 'PUT',
      auth: true,
      body: {
        fullName: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        homeCampusId: campusControl.getValue() || document.getElementById('profileCampusValue').value || null,
      },
    });

    // Keep localStorage's cached user in sync so the dashboard greeting etc. stay correct
    const stored = currentUser();
    if (stored) {
      stored.fullName = updated.full_name;
      localStorage.setItem('shf_user', JSON.stringify(stored));
    }

    showSuccess('Profile updated.');
  } catch (err) {
    showError(err.message);
  }
});

// ---------- Change password ----------
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await apiRequest('/api/auth/change-password', {
      method: 'PUT',
      auth: true,
      body: {
        currentPassword: document.getElementById('currentPassword').value,
        newPassword: document.getElementById('newPassword').value,
      },
    });
    showSuccess('Password updated.');
    document.getElementById('passwordForm').reset();
  } catch (err) {
    showError(err.message);
  }
});
