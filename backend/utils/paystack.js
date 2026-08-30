// Language: JavaScript (Node.js)
// Thin wrapper around Paystack's REST API. Unlike the OpenStreetMap
// geocoding case, Paystack's API is DESIGNED for server-to-server calls
// using a secret key — this is the correct, standard way to integrate it,
// no browser-side workaround needed.
//
// Requires PAYSTACK_SECRET_KEY in .env (a free Paystack account's TEST
// secret key works for development — no real money moves in test mode).
// Paystack's hosted checkout page automatically offers Mobile Money as a
// payment option for Ghanaian cedi transactions, alongside card payment —
// so this one integration covers both without a separate MoMo API.

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error('PAYSTACK_SECRET_KEY is not set in .env — payments cannot be processed until it is.');
  }
  return key;
}

// Starts a payment — returns a hosted checkout URL to redirect the student to.
async function initializePayment({ email, amountInPesewas, reference, callbackUrl }) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amountInPesewas, // Paystack expects the smallest currency unit (pesewas for GHS)
      currency: 'GHS',
      reference,
      callback_url: callbackUrl,
    }),
  });

  const data = await response.json();
  if (!data.status) {
    throw new Error(data.message || 'Could not start payment with Paystack.');
  }
  return data.data; // { authorization_url, access_code, reference }
}

// Confirms whether a payment actually succeeded — NEVER trust the
// frontend redirect alone; always verify server-side with Paystack.
async function verifyPayment(reference) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  });

  const data = await response.json();
  if (!data.status) {
    throw new Error(data.message || 'Could not verify payment with Paystack.');
  }
  return data.data; // { status: 'success'|'failed'|..., amount, reference, ... }
}

module.exports = { initializePayment, verifyPayment };
