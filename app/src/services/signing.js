// Cryptographic signing for assurance claims and passports.
// HMAC-SHA256 over a canonical payload string. In a production deployment
// this would be an asymmetric keypair (KMS/HSM-backed) so recipients can
// verify signatures without holding the signing secret; HMAC is sufficient
// to demonstrate tamper-evidence and revocation semantics in this MVP.
const crypto = require('crypto');

function secret() {
  const s = process.env.PASSPORT_SIGNING_SECRET;
  if (!s) throw new Error('PASSPORT_SIGNING_SECRET is not configured');
  return s;
}

function canonicalize(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function sign(payload) {
  const canonical = canonicalize(payload);
  return crypto.createHmac('sha256', secret()).update(canonical).digest('hex');
}

function verify(payload, signature) {
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature || '');
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function sha256(data) {
  return crypto.createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');
}

module.exports = { sign, verify, sha256, canonicalize };
