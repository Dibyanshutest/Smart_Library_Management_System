const nodemailer = require('nodemailer');

let transporter = null;

// Only create transporter if credentials are configured
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('📧 Email transporter configured');
} else {
  console.log('📧 Email not configured (EMAIL_USER/EMAIL_PASS not set). Skipping email features.');
}

/**
 * Send an email. No-ops if email is not configured.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 */
const sendEmail = async (to, subject, html) => {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: `"Smart Library" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
  } catch (err) {
    console.error('⚠️  Email send failed:', err.message);
  }
};

module.exports = { sendEmail };
