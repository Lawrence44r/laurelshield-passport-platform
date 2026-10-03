// Cryptographic signing for assurance claims and passports.
// Ed25519 keypair (crypto.sign/verify with algorithm=null is Node's
// one-shot Ed25519 API). A third party holding only the exported public key
// (getPublicKeyPem) can verify a passport's signature without ever being
// given anything that could be used to forge one -- the HMAC scheme this
// replaced could not make that claim, since verifying it required holding
// the same secret used to sign. The migration path to a KMS/HSM-backed key
// is unchanged: swap privateKey()/publicKey() to fetch from the KMS instead
// of an env var; every caller of sign()/verify() stays the same.
const crypto = require('crypto');

function privateKey() {
  const b64 = process.env.PASSPORT_SIGNING_PRIVATE_KEY_B64;
  if (!b64) {
    throw new Error(
      'PASSPORT_SIGNING_PRIVATE_KEY_B64 is not configured. Run ' +
      '`node scripts/generate-signing-key.js` and copy its output into .env.'
    );
  }
  const pem = Buffer.from(b64, 'base64').toString('utf8');
  return crypto.createPrivateKey({ key: pem, format: 'pem' });
}

function publicKey() {
  return crypto.createPublicKey(privateKey());
}

function canonicalize(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function sign(payload) {
  const canonical = canonicalize(payload);
  return crypto.sign(null, Buffer.from(canonical), privateKey()).toString('hex');
}

function verify(payload, signature) {
  if (!signature) return false;
  const canonical = canonicalize(payload);
  try {
    return crypto.verify(null, Buffer.from(canonical), publicKey(), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

function sha256(data) {
  return crypto.createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');
}

// Safe to publish -- this is what an external broker/carrier would hold to
// verify a passport's signature themselves, without trusting Congruentshield's
// servers at verification time.
function getPublicKeyPem() {
  return publicKey().export({ type: 'spki', format: 'pem' }).toString();
}

module.exports = { sign, verify, sha256, canonicalize, getPublicKeyPem };
