// One-time bootstrap for the three roles self-serve signup cannot create
// (ls_admin, broker, carrier -- signup only ever creates customer_admin).
// Called once via the shared-secret-protected POST /internal/bootstrap-
// demo-accounts route, so the live Render instance has a working login for
// all four role types without seeding the project's public demo password
// (Passport#2026) onto a real internet-facing service. Each password here
// is freshly randomly generated and returned exactly once in the response
// -- never stored anywhere in plaintext, never the same value twice.
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const MARKER_EMAIL = 'ops@laurelshield.internal';

function randomPassword() {
  return crypto.randomBytes(12).toString('base64url'); // 16 chars, well above the 12-char minimum
}

function alreadyBootstrapped(db) {
  return !!db.prepare('SELECT id FROM users WHERE email = ?').get(MARKER_EMAIL);
}

function bootstrap(db) {
  if (alreadyBootstrapped(db)) {
    return { alreadyDone: true };
  }

  const insertOrg = db.prepare(
    `INSERT INTO organizations (org_type, name, industry, jurisdiction, relationship_level) VALUES (?, ?, ?, ?, ?)`
  );
  const insertPartner = db.prepare(
    `INSERT INTO partners (org_id, partner_type, maturity_level) VALUES (?, ?, ?)`
  );
  const insertUser = db.prepare(
    `INSERT INTO users (org_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`
  );

  const accounts = [];

  // Ops (ls_admin -- the fullest operations view: verification queue,
  // reverification queue, appeals, carrier-requirements governance).
  {
    const password = randomPassword();
    const hash = bcrypt.hashSync(password, 10);
    insertUser.run(null, MARKER_EMAIL, hash, 'Demo Operations Admin', 'ls_admin');
    accounts.push({ role: 'ops (ls_admin)', email: MARKER_EMAIL, password });
  }

  // Broker
  {
    const orgId = insertOrg.run('broker', 'Demo Brokerage Partners', 'Insurance Brokerage', 'CA-ON', 2).lastInsertRowid;
    insertPartner.run(orgId, 'broker', 2);
    const password = randomPassword();
    const hash = bcrypt.hashSync(password, 10);
    const email = 'broker@demo-brokerage.internal';
    insertUser.run(orgId, email, hash, 'Demo Broker User', 'broker');
    accounts.push({ role: 'broker', email, password });
  }

  // Carrier
  {
    const orgId = insertOrg.run('carrier', 'Demo Carrier Underwriting', 'Cyber Insurance Carrier', 'CA-ON', 3).lastInsertRowid;
    insertPartner.run(orgId, 'carrier', 3);
    const password = randomPassword();
    const hash = bcrypt.hashSync(password, 10);
    const email = 'underwriter@demo-carrier.internal';
    insertUser.run(orgId, email, hash, 'Demo Carrier Underwriter', 'carrier');
    accounts.push({ role: 'carrier', email, password });
  }

  return { alreadyDone: false, accounts };
}

module.exports = { bootstrap };
