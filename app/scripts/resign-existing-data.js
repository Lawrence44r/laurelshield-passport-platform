// One-time migration: re-signs every existing assurance_claims, passports,
// and claim_evidence_packs row with the new Ed25519 scheme (signing.js),
// replacing their old HMAC signatures. Run this exactly once, immediately
// after switching PASSPORT_SIGNING_PRIVATE_KEY_B64 to a freshly generated
// key -- any row this script does not touch will fail signing.verify()
// forever, since the old HMAC secret and the new keypair are unrelated.
//
// This recomputes each row's canonical payload from its own stored columns,
// using the exact same shapes signing.sign() is called with at creation
// time (see eclEngine.js, ops.js, customer.js, claimEvidenceEngine.js) --
// it does not change any data other than the `signature` column.
require('dotenv').config();
const db = require('../src/db');
const signing = require('../src/services/signing');

let claimsUpdated = 0;
let passportsUpdated = 0;
let packsUpdated = 0;

const claims = db.prepare(`
  SELECT ac.id, ac.scope_id, ac.status, ac.ecl, ac.coverage_pct, ac.valid_from, ac.valid_until, c.code
  FROM assurance_claims ac JOIN controls c ON c.id = ac.control_id
`).all();
const updateClaim = db.prepare('UPDATE assurance_claims SET signature=? WHERE id=?');
for (const row of claims) {
  const payload = {
    scope_id: row.scope_id, control: row.code, status: row.status, ecl: row.ecl,
    coverage_pct: row.coverage_pct, valid_from: row.valid_from, valid_until: row.valid_until,
  };
  updateClaim.run(signing.sign(payload), row.id);
  claimsUpdated++;
}

const passports = db.prepare('SELECT id, passport_code, org_id, scope_id, status, issued_at FROM passports').all();
const updatePassport = db.prepare('UPDATE passports SET signature=? WHERE id=?');
for (const row of passports) {
  const payload = {
    passportCode: row.passport_code, orgId: row.org_id, scopeId: row.scope_id,
    status: row.status, issuedAt: row.issued_at,
  };
  updatePassport.run(signing.sign(payload), row.id);
  passportsUpdated++;
}

const packs = db.prepare('SELECT id, claim_id, manifest_hash, manifest_json FROM claim_evidence_packs').all();
const updatePack = db.prepare('UPDATE claim_evidence_packs SET signature=? WHERE id=?');
for (const row of packs) {
  const manifest = JSON.parse(row.manifest_json);
  const payload = { claimId: row.claim_id, manifestHash: row.manifest_hash, sealedAt: manifest.sealedAt };
  updatePack.run(signing.sign(payload), row.id);
  packsUpdated++;
}

console.log(`Re-signed ${claimsUpdated} assurance_claims, ${passportsUpdated} passports, ${packsUpdated} claim_evidence_packs.`);
