// Language: JavaScript (runs in the browser)
// Powers the owner profile page: load current details, edit name/phone,
// and change password (requires the current password).

if (!isLoggedIn()) {
  window.location.href = 'owner-login.html';
}
const user = currentUser();
if (user && user.role !== 'owner' && user.role !== 'admin') {
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

async function loadProfile() {
  try {
    const me = await apiRequest('/api/auth/me', { auth: true });
    document.getElementById('fullName').value = me.full_name || '';
    document.getElementById('email').value = me.email || '';
    document.getElementById('phone').value = me.phone || '';
  } catch (err) {
    showError('Could not load your profile: ' + err.message);
  }
}
loadProfile();

document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const updated = await apiRequest('/api/auth/me', {
      method: 'PUT',
      auth: true,
      body: {
        fullName: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
      },
    });

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
