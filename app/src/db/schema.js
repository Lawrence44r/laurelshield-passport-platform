// SQLite schema for the Congruentshield Cyber Risk Passport Platform.
// Applied idempotently on boot via CREATE TABLE IF NOT EXISTS.

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- Organizations: customers, brokers, and carriers are all "organizations"
-- distinguished by org_type. Congruentshield staff are not tied to an org.
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_type TEXT NOT NULL CHECK (org_type IN ('customer','broker','carrier')),
  name TEXT NOT NULL,
  industry TEXT,
  jurisdiction TEXT,
  relationship_level INTEGER DEFAULT 0, -- carrier/broker maturity 0-5 (section 9.1)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER REFERENCES organizations(id),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'ls_admin','ls_assessor','ls_decision_officer',
    'customer_admin','broker','carrier'
  )),
  active INTEGER NOT NULL DEFAULT 1,
  mfa_secret TEXT,
  mfa_enabled INTEGER NOT NULL DEFAULT 0,
  mfa_recovery_codes TEXT, -- JSON array of bcrypt hashes; each consumed (removed) on use
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Assurance boundary: legal entity / technology footprint under verification (Stage 2)
CREATE TABLE IF NOT EXISTS scopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  scope_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','retired')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_id INTEGER NOT NULL REFERENCES scopes(id),
  asset_type TEXT NOT NULL, -- network, endpoint, cloud_subscription, application, data_store, ot
  name TEXT NOT NULL,
  criticality TEXT NOT NULL DEFAULT 'standard' CHECK (criticality IN ('standard','high','critical')),
  environment TEXT DEFAULT 'production',
  data_classification TEXT DEFAULT 'internal'
);

-- Simulated evidence connectors (Section 5.2). In production these would be
-- read-only API integrations; here they generate realistic evidence objects
-- on demand so the full assurance lifecycle can be demonstrated end to end.
CREATE TABLE IF NOT EXISTS connectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_id INTEGER NOT NULL REFERENCES scopes(id),
  connector_type TEXT NOT NULL, -- entra, edr, backup, extscan, emaildns, cloud, siem
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected','connected','error')),
  config_json TEXT NOT NULL DEFAULT '{}', -- simulated posture dials the demo operator can adjust
  last_sync_at TEXT
);

-- Canonical control catalogue (Section 5.5, 6.1) - vendor-neutral, stable identifiers.
CREATE TABLE IF NOT EXISTS controls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE, -- e.g. LS-ID-101
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  test_procedure TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('low','medium','high','critical')),
  default_min_ecl INTEGER NOT NULL DEFAULT 3,
  max_evidence_age_hours INTEGER NOT NULL DEFAULT 720 -- freshness default (Section 5.9)
);

-- Evidence objects (Stage 3) with chain-of-custody metadata.
CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_id INTEGER NOT NULL REFERENCES scopes(id),
  connector_id INTEGER REFERENCES connectors(id),
  source TEXT NOT NULL, -- system/connector name or "manual upload" / "interview"
  collector TEXT NOT NULL, -- user or system that gathered it
  evidence_type TEXT NOT NULL, -- api_export, document, screenshot, interview_note, test_result
  summary_json TEXT NOT NULL, -- structured evidence payload
  sha256_hash TEXT NOT NULL,
  collected_at TEXT NOT NULL DEFAULT (datetime('now')),
  classification TEXT NOT NULL DEFAULT 'restricted_security_evidence'
    CHECK (classification IN (
      'public','customer_confidential','restricted_security_evidence',
      'carrier_confidential_mapping','congruentshield_trade_secret','claims_outcome_restricted'
    ))
);

CREATE TABLE IF NOT EXISTS evidence_control_map (
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  control_id INTEGER NOT NULL REFERENCES controls(id),
  PRIMARY KEY (evidence_id, control_id)
);

-- Verification decisions (Stage 5) - ECL, effectiveness, exceptions.
CREATE TABLE IF NOT EXISTS verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_id INTEGER NOT NULL REFERENCES scopes(id),
  control_id INTEGER NOT NULL REFERENCES controls(id),
  verifier_user_id INTEGER REFERENCES users(id),
  ecl INTEGER NOT NULL CHECK (ecl BETWEEN 0 AND 5),
  coverage_pct REAL NOT NULL DEFAULT 100,
  effectiveness TEXT NOT NULL DEFAULT 'effective' CHECK (effectiveness IN ('effective','partial','ineffective')),
  exceptions_json TEXT NOT NULL DEFAULT '[]',
  compensating_controls TEXT,
  procedure_version TEXT NOT NULL DEFAULT '1.0',
  decision_officer_id INTEGER REFERENCES users(id),
  decision_status TEXT NOT NULL DEFAULT 'pending' CHECK (decision_status IN ('pending','approved','rejected')),
  decision_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Current assurance claim per (scope, control) - what the passport actually asserts.
CREATE TABLE IF NOT EXISTS assurance_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_id INTEGER NOT NULL REFERENCES scopes(id),
  control_id INTEGER NOT NULL REFERENCES controls(id),
  verification_id INTEGER REFERENCES verifications(id),
  status TEXT NOT NULL DEFAULT 'not_assessed'
    CHECK (status IN ('verified','conditional','expired','revoked','material_gap','not_assessed')),
  ecl INTEGER NOT NULL DEFAULT 0,
  coverage_pct REAL NOT NULL DEFAULT 0,
  valid_from TEXT,
  valid_until TEXT,
  signature TEXT,
  revoked INTEGER NOT NULL DEFAULT 0,
  revoked_at TEXT,
  revoked_reason TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(scope_id, control_id)
);

-- Remediation backlog (Stage 7) and independent re-verification (Stage 8).
CREATE TABLE IF NOT EXISTS remediation_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_id INTEGER NOT NULL REFERENCES scopes(id),
  control_id INTEGER NOT NULL REFERENCES controls(id),
  finding TEXT NOT NULL,
  owner TEXT NOT NULL DEFAULT 'customer',
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','remediated','reverification_pending','closed','overdue')),
  closure_evidence_id INTEGER REFERENCES evidence(id),
  reverified_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);

-- Passport issuance (Stage 9).
CREATE TABLE IF NOT EXISTS passports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  passport_code TEXT NOT NULL UNIQUE,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  scope_id INTEGER NOT NULL REFERENCES scopes(id),
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('verified','conditional','expired','revoked')),
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  signature TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  revoked_at TEXT
);

-- Broker / carrier partner records and their confidential requirement graph (Section 5.6, 9).
CREATE TABLE IF NOT EXISTS partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id), -- the broker/carrier organization
  partner_type TEXT NOT NULL CHECK (partner_type IN ('broker','carrier')),
  maturity_level INTEGER NOT NULL DEFAULT 2 CHECK (maturity_level BETWEEN 0 AND 5)
);

-- CONFIDENTIAL: underwriting requirements graph. Readable only by ls_admin.
-- Never returned directly via any partner- or customer-facing API; only the
-- translation engine output (status, not weighting) is ever exposed externally.
CREATE TABLE IF NOT EXISTS carrier_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL REFERENCES partners(id),
  requirement_code TEXT NOT NULL,
  requirement_label TEXT NOT NULL, -- the partner's own wording, e.g. "Question 18" or "Identity Control P1"
  control_id INTEGER NOT NULL REFERENCES controls(id),
  min_ecl INTEGER NOT NULL DEFAULT 3,
  max_evidence_age_hours INTEGER NOT NULL DEFAULT 720,
  mandatory INTEGER NOT NULL DEFAULT 1,
  weight REAL NOT NULL DEFAULT 1.0,
  industry_overlay TEXT,
  source_classification TEXT NOT NULL DEFAULT 'inferred_unvalidated'
    CHECK (source_classification IN ('public','customer_provided','broker_provided_confidential','carrier_provided_confidential','inferred_unvalidated')),
  effective_date TEXT NOT NULL DEFAULT (datetime('now')),
  review_date TEXT,
  confidential_notes TEXT
);

-- Customer-controlled selective disclosure (Stage 10).
CREATE TABLE IF NOT EXISTS sharing_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  passport_id INTEGER NOT NULL REFERENCES passports(id),
  recipient_partner_id INTEGER NOT NULL REFERENCES partners(id),
  purpose TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  granted_by INTEGER NOT NULL REFERENCES users(id),
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  revoked_at TEXT
);

-- Immutable audit log (Layer 12 / Section 5.3).
CREATE TABLE IF NOT EXISTS access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER REFERENCES users(id),
  actor_label TEXT, -- for non-user actors e.g. "system:freshness_engine"
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details_json TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Supplier dependency graph (Congruentshield Suite Ops Guide Section 8). One row
-- per third party an insured depends on; linked to the controls/clauses it
-- affects so a supplier incident can be traced to every downstream insured.
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_id INTEGER NOT NULL REFERENCES scopes(id),
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  business_process TEXT,
  data_touched TEXT,
  region TEXT,
  contract_owner TEXT,
  recovery_dependency TEXT,
  alternative_provider TEXT,
  criticality TEXT NOT NULL DEFAULT 'medium' CHECK (criticality IN ('critical','high','medium','low')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_control_links (
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  control_id INTEGER NOT NULL REFERENCES controls(id),
  PRIMARY KEY (supplier_id, control_id)
);

-- Claim evidence pack workflow (Ops Guide Section 10). A claim freezes an
-- evidence window around an incident; the pack is a sealed, hash-chained
-- snapshot that must be reviewer-approved before release to a carrier.
CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_id INTEGER NOT NULL REFERENCES scopes(id),
  policy_reference TEXT,
  incident_date TEXT NOT NULL,
  affected_business_process TEXT,
  affected_systems TEXT,
  known_suppliers_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','evidence_frozen','pack_generated','approved','released','closed')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS claim_evidence_packs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL REFERENCES claims(id),
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  manifest_json TEXT NOT NULL, -- evidence ids/hashes, control snapshot, supplier graph snapshot, previous manifest hash
  manifest_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','released')),
  approved_by INTEGER REFERENCES users(id),
  approved_at TEXT,
  released_to_partner_id INTEGER REFERENCES partners(id),
  release_purpose TEXT,
  released_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appeals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  related_verification_id INTEGER REFERENCES verifications(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','upheld','overturned','closed')),
  reviewer_id INTEGER REFERENCES users(id),
  resolution TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- Enterprise SSO: one identity provider per organization ("bring your own
-- IdP"). OIDC via Authorization Code + PKCE works with any spec-compliant
-- provider - Okta, Microsoft Entra ID, Google Workspace, Ping, Auth0, ADFS,
-- etc. email_domain drives discovery at login ("you@acme.example" ->
-- look up the org whose domain is acme.example -> if SSO is enabled there,
-- redirect to their IdP instead of asking for a local password).
CREATE TABLE IF NOT EXISTS sso_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL UNIQUE REFERENCES organizations(id),
  protocol TEXT NOT NULL DEFAULT 'oidc' CHECK (protocol IN ('oidc')),
  email_domain TEXT NOT NULL,
  issuer_url TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// ALTER TABLE ... ADD COLUMN for databases created before a column existed.
// CREATE TABLE IF NOT EXISTS above only helps on a fresh database; existing
// ones need this. SQLite has no "ADD COLUMN IF NOT EXISTS", so each attempt
// is wrapped and duplicate-column errors are swallowed.
const MIGRATIONS = [
  `ALTER TABLE users ADD COLUMN mfa_secret TEXT`,
  `ALTER TABLE users ADD COLUMN mfa_enabled INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN mfa_recovery_codes TEXT`,
  // Claim/passport provenance -- who or what actually asserted a claim, and
  // whether a brand-new organization's first passport has been looked at by
  // a human yet. See services/eclEngine.js, routes/ops.js, routes/customer.js.
  `ALTER TABLE assurance_claims ADD COLUMN provenance TEXT NOT NULL DEFAULT 'human_verified' CHECK (provenance IN ('human_verified','connector_live','connector_simulated'))`,
  `ALTER TABLE passports ADD COLUMN pending_human_verification INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE passports ADD COLUMN verified_at TEXT`,
  `ALTER TABLE passports ADD COLUMN verified_by INTEGER REFERENCES users(id)`,
];

function applySchema(db) {
  db.exec(SCHEMA_SQL);
  for (const sql of MIGRATIONS) {
    try { db.exec(sql); } catch (err) {
      if (!/duplicate column name/i.test(err.message)) throw err;
    }
  }
}

module.exports = { applySchema };
