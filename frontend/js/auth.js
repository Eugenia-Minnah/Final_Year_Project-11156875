// Language: JavaScript (runs in the browser)
// Handles submitting the sign-in and sign-up forms, and redirecting into
// the web app (dashboard.html) once login succeeds.

function showError(message) {
  const box = document.getElementById('errorMsg');
  box.textContent = message;
  box.style.display = 'block';
}

function saveSession(data) {
  localStorage.setItem('shf_token', data.token);
  localStorage.setItem('shf_user', JSON.stringify(data.user));
}

// ----- Sign in -----
const signinForm = document.getElementById('signinForm');
if (signinForm) {
  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: document.getElementById('email').value,
          password: document.getElementById('password').value,
        },
      });
      saveSession(data);
      window.location.href = 'dashboard.html'; // <-- this is the "web app"
    } catch (err) {
      showError(err.message);
    }
  });
}

// ----- Sign up -----
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  // Pre-select "owner" if the visitor clicked "For owners" on the landing page
  const params = new URLSearchParams(window.location.search);
  if (params.get('role') === 'owner') {
    document.getElementById('role').value = 'owner';
  }

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: {
          fullName: document.getElementById('fullName').value,
          email: document.getElementById('email').value,
          password: document.getElementById('password').value,
          role: document.getElementById('role').value,
        },
      });
      saveSession(data);
      window.location.href = 'dashboard.html'; // straight into the web app after signup
    } catch (err) {
      showError(err.message);
    }
  });
}
