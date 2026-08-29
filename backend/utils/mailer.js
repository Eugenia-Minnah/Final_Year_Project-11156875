// Language: JavaScript (Node.js)
// Sends real password-reset emails using Gmail's free SMTP service via
// Nodemailer. Requires EMAIL_USER and EMAIL_APP_PASSWORD in .env — see
// .env.example for how to generate a Gmail "App Password" (this is NOT
// your normal Gmail password; Gmail blocks that for programmatic use).
//
// If those env vars aren't set, sendPasswordResetEmail() returns false
// instead of throwing — callers should fall back to logging the link to
// the console, exactly like before this feature existed, so a missing
// email config never breaks password reset entirely.

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) return null;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  const t = getTransporter();
  if (!t) return false; // not configured — caller falls back to console logging

  await t.sendMail({
    from: `"Smart Hostel Finder" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset your Smart Hostel Finder password',
    html: `
      <p>Hi,</p>
      <p>Someone requested a password reset for this Smart Hostel Finder account.</p>
      <p><a href="${resetLink}">Click here to set a new password</a></p>
      <p>Or copy this link into your browser:<br>${resetLink}</p>
      <p style="color:#666; font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
    `,
  });

  return true;
}

module.exports = { sendPasswordResetEmail };
