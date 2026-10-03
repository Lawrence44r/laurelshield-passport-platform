// TOTP-based multi-factor authentication (RFC 6238), interoperable with any
// standard authenticator app: Google Authenticator, Microsoft Authenticator,
// Authy, 1Password, etc. - anything that scans a standard otpauth:// QR code.
// Recovery codes are the fallback when the authenticator device is lost.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

const ISSUER = 'Congruentshield';
const RECOVERY_CODE_COUNT = 10;

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

// Generates a fresh set of one-time recovery codes. Returns the plaintext
// codes (shown to the user exactly once) alongside their bcrypt hashes
// (the only thing ever persisted). Format XXXX-XXXX, easy to type, hard to
// guess (base32, no ambiguous characters).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode() {
  let s = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

function generateRecoveryCodes() {
  const plain = Array.from({ length: RECOVERY_CODE_COUNT }, randomCode);
  const hashed = plain.map(code => bcrypt.hashSync(code, 10));
  return { plain, hashed };
}

// Checks a candidate code against the stored hash list. Returns the
// remaining hash list with the matched code removed (one-time use) if it
// matched, or null if it didn't match anything.
function consumeRecoveryCode(hashedList, candidate) {
  const normalized = String(candidate || '').trim().toUpperCase();
  const idx = hashedList.findIndex(h => bcrypt.compareSync(normalized, h));
  if (idx === -1) return null;
  return [...hashedList.slice(0, idx), ...hashedList.slice(idx + 1)];
}

module.exports = { generateSecret, buildEnrollment, verifyToken, generateRecoveryCodes, consumeRecoveryCode };
