// One-time helper: generates an Ed25519 keypair for passport/claim signing
// and writes the private key directly into .env -- it is never printed to
// the console, since a private signing key has no business appearing in a
// terminal transcript, a log, or a chat history. Only the public key (safe
// to share with anyone verifying a passport) is printed.
//
// Run with `node scripts/generate-signing-key.js`. Re-running this
// invalidates every previously issued signature -- do not run it against a
// database with live, externally-shared passports.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const line = `PASSPORT_SIGNING_PRIVATE_KEY_B64=${Buffer.from(privPem).toString('base64')}`;

const envPath = path.join(__dirname, '..', '.env');
let existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
if (/^PASSPORT_SIGNING_PRIVATE_KEY_B64=/m.test(existing)) {
  existing = existing.replace(/^PASSPORT_SIGNING_PRIVATE_KEY_B64=.*$/m, line);
} else {
  existing = existing.replace(/\n?$/, '\n') + line + '\n';
}
fs.writeFileSync(envPath, existing);

console.log('Private key written directly to .env (not printed here).');
console.log('');
console.log('Public key -- safe to share with any broker/carrier verifying a passport:');
console.log(pubPem);
