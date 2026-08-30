// Language: JavaScript (runs in the browser)
// Paystack redirects here after the student completes (or abandons)
// payment on their hosted checkout page. This page never trusts the
// redirect alone — it asks the backend to verify with Paystack directly.

if (!isLoggedIn()) {
  window.location.href = 'student-login.html';
}

async function verifyPayment() {
  var heading = document.getElementById('statusHeading');
  var message = document.getElementById('statusMessage');
  var dashboardLink = document.getElementById('dashboardLink');

  var params = new URLSearchParams(window.location.search);
  var reference = params.get('reference') || params.get('trxref');

  if (!reference) {
    heading.textContent = 'Something went wrong';
    message.textContent = 'No payment reference was found in the link. If you completed payment, check "My bookings" — it may already be confirmed.';
    dashboardLink.style.display = 'block';
    return;
  }

  try {
    var result = await apiRequest('/api/bookings/verify/' + reference, { auth: true });

    if (result.success) {
      heading.textContent = 'Payment successful!';
      message.textContent = 'Your deposit for ' + result.roomType + ' at ' + result.hostelName + ' has been confirmed.';
    } else {
      heading.textContent = 'Payment not completed';
      message.textContent = result.message || 'It looks like the payment did not go through. You can try again from "My bookings".';
    }
  } catch (err) {
    heading.textContent = 'Could not confirm payment';
    message.textContent = err.message;
  }

  dashboardLink.style.display = 'block';
}

verifyPayment();
