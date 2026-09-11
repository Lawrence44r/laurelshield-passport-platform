// TOTP-based multi-factor authentication (RFC 6238), interoperable with any
// standard authenticator app: Google Authenticator, Microsoft Authenticator,
// Authy, 1Password, etc. - anything that scans a standard otpauth:// QR code.
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

const ISSUER = 'Laurelshield';

function generateSecret() {
  return authenticator.generateSecret();
}

async function buildEnrollment(email, secret) {
  const otpauthUrl = authenticator.keyuri(email, ISSUER, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { otpauthUrl, qrCodeDataUrl };
}

function verifyToken(secret, token) {
  if (!secret || !token) return false;
  try {
    return authenticator.verify({ token: String(token).trim(), secret });
  } catch {
    return false;
  }
}

module.exports = { generateSecret, buildEnrollment, verifyToken };
