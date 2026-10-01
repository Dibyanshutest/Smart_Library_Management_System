const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Generate a random QR token for a booking.
 * @param {Object} booking - The booking document
 * @returns {string} Random hex token
 */
const generateQRToken = (booking) => {
  // 16 chars (8 bytes) is plenty of entropy for a short-lived token
  return crypto.randomBytes(8).toString('hex');
};

/**
 * Note: Verification is now done via database lookup (Booking.findOne({ qrToken }))
 * so this function is deprecated, but kept as a passthrough for compatibility.
 */
const verifyQRToken = (token) => {
  return { token };
};

/**
 * Generate a QR code image as a base64 data URL.
 * @param {string} data - Data to encode
 * @returns {Promise<string>} Base64 data URL
 */
const generateQRImage = async (data) => {
  return QRCode.toDataURL(data, {
    width: 400,
    margin: 4,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
};

module.exports = { generateQRToken, verifyQRToken, generateQRImage };
