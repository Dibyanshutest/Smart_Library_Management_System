const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');

/**
 * Generate a signed QR token for a booking.
 * @param {Object} booking - The booking document
 * @returns {string} Signed JWT token
 */
const generateQRToken = (booking) => {
  const token = jwt.sign(
    {
      bookingId: booking._id.toString(),
      userId: booking.user.toString(),
      seatId: booking.seat.toString()
    },
    process.env.QR_SECRET,
    { expiresIn: '24h' }
  );

  return token;
};

/**
 * Verify a QR token.
 * @param {string} token - The QR JWT token
 * @returns {Object} Decoded payload
 */
const verifyQRToken = (token) => {
  return jwt.verify(token, process.env.QR_SECRET);
};

/**
 * Generate a QR code image as a base64 data URL.
 * @param {string} data - Data to encode
 * @returns {Promise<string>} Base64 data URL
 */
const generateQRImage = async (data) => {
  return QRCode.toDataURL(data, {
    width: 300,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });
};

module.exports = { generateQRToken, verifyQRToken, generateQRImage };
