const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { requireAuth, requireRole, loadOwnedScope } = require('../middleware/auth');
const auditLog = require('../services/auditLog');
const signing = require('../services/signing');
const mappingEngine = require('../services/mappingEngine');
const eclEngine = require('../services/eclEngine');
const freshnessEngine = require('../services/freshnessEngine');
const { defaultConfigFor } = require('../services/connectorProfiles');
const graphConnector = require('../services/graphConnector');
const supplierGraph = require('../services/supplierGraph');

// Connector types that have a live (non-simulated) evidence source wired up.
// Everything else only ever runs in simulated mode.
const LIVE_CAPABLE_CONNECTORS = { entra: graphConnector };

// Never let a client secret leave the server once stored - the browser only
// ever needs to know that one is configured, not its value.
function redactConnector(connector) {
  const config = JSON.parse(connector.config_json);
  if (!config.clientSecret) return connector;
  const safeConfig = { ...config, clientSecretConfigured: true };
  delete safeConfig.clientSecret;
  return { ...connector, config_json: JSON.stringify(safeConfig) };
}

const router = express.Router();
router.use(requireAuth, requireRole('customer_admin'));

// ---- Org & scope registry (Stage 1-2) ----

router.get('/org', (req, res) => {
  const org = db.prepare('SELECT id, org_type, name, industry, jurisdiction FROM organizations WHERE id = ?').get(req.user.org_id);
  const scopes = db.prepare('SELECT * FROM scopes WHERE org_id = ? ORDER BY id').all(req.user.org_id);
  res.json({ org, scopes });
});

router.post('/scopes', (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name_required' });
  const scopeCode = `LS-SCOPE-${String(Math.floor(100000 + Math.random() * 899999))}`;
  const info = db.prepare(`INSERT INTO scopes (org_id, scope_code, name, description, status) VALUES (?, ?, ?, ?, 'draft')`)
    .run(req.user.org_id, scopeCode, name, description || null);
  auditLog.log(db, { actorUserId: req.user.id, action: 'scope_created', resourceType: 'scope', resourceId: info.lastInsertRowid });
  res.status(201).json({ id: info.lastInsertRowid, scopeCode });
});

router.get('/scopes/:scopeId', loadOwnedScope(), (req, res) => {
  const assets = db.prepare('SELECT * FROM assets WHERE scope_id = ?').all(req.scope.id);
  const connectors = db.prepare('SELECT * FROM connectors WHERE scope_id = ?').all(req.scope.id).map(redactConnector);
  res.json({ scope: req.scope, assets, connectors });
});

router.post('/scopes/:scopeId/approve', loadOwnedScope(), (req, res) => {
  db.prepare(`UPDATE scopes SET status='approved' WHERE id=?`).run(req.scope.id);
  auditLog.log(db, { actorUserId: req.user.id, action: 'scope_approved', resourceType: 'scope', resourceId: req.scope.id });
  res.json({ ok: true });
});

router.post('/scopes/:scopeId/assets', loadOwnedScope(), (req, res) => {
  const { assetType, name, criticality, environment, dataClassification } = req.body || {};
  if (!assetType || !name) return res.status(400).json({ error: 'assetType_and_name_required' });
  const info = db.prepare(`
    INSERT INTO assets (scope_id, asset_type, name, criticality, environment, data_classification)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.scope.id, assetType, name, criticality || 'standard', environment || 'production', dataClassification || 'internal');
  res.status(201).json({ id: info.lastInsertRowid });
});

// ---- Evidence connectors (Stage 3) ----

const CONNECTOR_LABELS = {
  entra: 'Identity Provider (Microsoft Entra / Graph)',
  edr: 'Endpoint Detection & Response',
  backup: 'Backup & Recovery Platform',
  extscan: 'External Attack Surface Scanner',
  emaildns: 'Email Security & DNS',
  cloud: 'Cloud Platform (AWS/Azure/GCP)',
  siem: 'SIEM / Log Management',
};

// Canonical control catalogue is part of the published assurance standard
// (Section 11.3 - copyright candidate, not a trade secret), so it is safe
// to expose in full to any authenticated customer.
router.get('/controls', (req, res) => {
  res.json({ controls: db.prepare('SELECT * FROM controls ORDER BY domain, code').all() });
});

router.get('/connector-types', (req, res) => {
  res.json({ types: Object.entries(CONNECTOR_LABELS).map(([id, label]) => ({ id, label, liveCapable: !!LIVE_CAPABLE_CONNECTORS[id] })) });
});

router.post('/scopes/:scopeId/connectors', loadOwnedScope(), (req, res) => {
  const { connectorType, mode, liveCredentials } = req.body || {};
  if (!CONNECTOR_LABELS[connectorType]) return res.status(400).json({ error: 'invalid_connector_type' });
  const existing = db.prepare('SELECT id FROM connectors WHERE scope_id=? AND connector_type=?').get(req.scope.id, connectorType);
  if (existing) return res.status(409).json({ error: 'connector_already_exists' });

  let config;
  if (mode === 'live') {
    if (!LIVE_CAPABLE_CONNECTORS[connectorType]) return res.status(400).json({ error: 'live_mode_not_available_for_connector_type' });
    const { tenantId, clientId, clientSecret } = liveCredentials || {};
    if (!tenantId || !clientId || !clientSecret) return res.status(400).json({ error: 'tenantId_clientId_clientSecret_required_for_live_mode' });
    config = { mode: 'live', tenantId, clientId, clientSecret };
  } else {
    config = { mode: 'simulated', ...defaultConfigFor(connectorType) };
  }

  const info = db.prepare(`
    INSERT INTO connectors (scope_id, connector_type, display_name, status, config_json)
    VALUES (?, ?, ?, 'disconnected', ?)
  `).run(req.scope.id, connectorType, CONNECTOR_LABELS[connectorType], JSON.stringify(config));
  auditLog.log(db, { actorUserId: req.user.id, action: 'connector_added', resourceType: 'connector', resourceId: info.lastInsertRowid, details: { connectorType, mode: config.mode } });
  res.status(201).json({ id: info.lastInsertRowid });
});

// Live mode only: verify credentials work before committing to a full sync.
router.post('/scopes/:scopeId/connectors/:connectorId/test-connection', loadOwnedScope(), async (req, res) => {
  const connector = db.prepare('SELECT * FROM connectors WHERE id=? AND scope_id=?').get(req.params.connectorId, req.scope.id);
  if (!connector) return res.status(404).json({ error: 'connector_not_found' });
  const liveModule = LIVE_CAPABLE_CONNECTORS[connector.connector_type];
  const config = JSON.parse(connector.config_json);
  if (!liveModule || config.mode !== 'live') return res.status(400).json({ error: 'connector_not_in_live_mode' });
  try {
    const result = await liveModule.testConnection(config);
    auditLog.log(db, { actorUserId: req.user.id, action: 'connector_test_connection_ok', resourceType: 'connector', resourceId: connector.id });
    res.json(result);
  } catch (err) {
    auditLog.log(db, { actorUserId: req.user.id, action: 'connector_test_connection_failed', resourceType: 'connector', resourceId: connector.id, details: { message: err.message } });
    res.status(502).json({ error: 'connection_test_failed', message: err.message });
  }
});

router.post('/scopes/:scopeId/connectors/:connectorId/sync', loadOwnedScope(), async (req, res) => {
  const connector = db.prepare('SELECT * FROM connectors WHERE id=? AND scope_id=?').get(req.params.connectorId, req.scope.id);
  if (!connector) return res.status(404).json({ error: 'connector_not_found' });
  const codes = mappingEngine.controlsForConnector(connector.connector_type);
  const controls = codes.map(c => db.prepare('SELECT * FROM controls WHERE code=?').get(c)).filter(Boolean);
  const config = JSON.parse(connector.config_json);
  const liveModule = LIVE_CAPABLE_CONNECTORS[connector.connector_type];

  if (config.mode === 'live' && liveModule) {
    try {
      const liveEvaluations = await liveModule.fetchGraphEvidence(config);
      const results = eclEngine.syncConnector(db, { connector, controls, actorUserId: req.user.id, liveEvaluations });
      auditLog.log(db, { actorUserId: req.user.id, action: 'connector_synced_live', resourceType: 'connector', resourceId: connector.id, details: { count: results.length } });
      return res.json({ results, source: 'live_microsoft_graph' });
    } catch (err) {
      db.prepare(`UPDATE connectors SET status='error' WHERE id=?`).run(connector.id);
      auditLog.log(db, { actorUserId: req.user.id, action: 'connector_sync_failed', resourceType: 'connector', resourceId: connector.id, details: { message: err.message, code: err.code } });
      return res.status(502).json({ error: 'live_sync_failed', message: err.message });
    }
  }

  const results = eclEngine.syncConnector(db, { connector, controls, actorUserId: req.user.id });
  auditLog.log(db, { actorUserId: req.user.id, action: 'connector_synced', resourceType: 'connector', resourceId: connector.id, details: { count: results.length } });
  res.json({ results, source: 'simulated' });
});

// Adjust the connector's simulated posture (stand-in for a real remediation
// changing the underlying system state). A re-sync afterwards is required
// for the change to be reflected in evidence - nothing updates silently.
router.post('/scopes/:scopeId/connectors/:connectorId/posture', loadOwnedScope(), (req, res) => {
  const connector = db.prepare('SELECT * FROM connectors WHERE id=? AND scope_id=?').get(req.params.connectorId, req.scope.id);
  if (!connector) return res.status(404).json({ error: 'connector_not_found' });
  const config = JSON.parse(connector.config_json);
  if (config.mode === 'live') return res.status(400).json({ error: 'cannot_patch_posture_on_a_live_connector' });
  const patch = req.body && req.body.patch;
  if (!patch || typeof patch !== 'object') return res.status(400).json({ error: 'patch_object_required' });
  Object.assign(config, patch);
  db.prepare('UPDATE connectors SET config_json=? WHERE id=?').run(JSON.stringify(config), connector.id);
  auditLog.log(db, { actorUserId: req.user.id, action: 'connector_posture_changed', resourceType: 'connector', resourceId: connector.id, details: patch });
  res.json({ ok: true, config });
});

router.post('/scopes/:scopeId/operational-tests', loadOwnedScope(), (req, res) => {
  const { testType, passed, notes } = req.body || {};
  const codes = mappingEngine.controlsForOperationalTest(testType);
  if (!codes.length) return res.status(400).json({ error: 'invalid_test_type' });
  const controls = codes.map(c => db.prepare('SELECT * FROM controls WHERE code=?').get(c)).filter(Boolean);
  const results = eclEngine.recordOperationalTest(db, { scopeId: req.scope.id, controls, actorUserId: req.user.id, testType, passed: !!passed, notes });
  auditLog.log(db, { actorUserId: req.user.id, action: 'operational_test_recorded', resourceType: 'scope', resourceId: req.scope.id, details: { testType, passed } });
  res.json({ results });
});

// Manual/document evidence for controls with no live connector (governance,
// data security). Creates ECL-1 evidence and a *pending* verification -
// it does not become an assurance claim until an assessor reviews it
// (Stage 5), keeping self-attestation distinguishable from verified fact.
router.post('/scopes/:scopeId/evidence/manual', loadOwnedScope(), (req, res) => {
  const { controlCode, note } = req.body || {};
  const control = db.prepare('SELECT * FROM controls WHERE code=?').get(controlCode);
  if (!control) return res.status(400).json({ error: 'invalid_control_code' });
  const hash = signing.sha256({ control: controlCode, note, at: new Date().toISOString() });
  const evId = db.prepare(`
    INSERT INTO evidence (scope_id, source, collector, evidence_type, summary_json, sha256_hash, classification)
    VALUES (?, 'manual_upload', ?, 'document', ?, ?, 'customer_confidential')
  `).run(req.scope.id, `user:${req.user.id}`, JSON.stringify({ control: controlCode, note }), hash).lastInsertRowid;
  db.prepare('INSERT INTO evidence_control_map (evidence_id, control_id) VALUES (?, ?)').run(evId, control.id);
  const verId = db.prepare(`
    INSERT INTO verifications (scope_id, control_id, ecl, coverage_pct, effectiveness, exceptions_json, decision_status)
    VALUES (?, ?, 1, 100, 'effective', '[]', 'pending')
  `).run(req.scope.id, control.id).lastInsertRowid;
  auditLog.log(db, { actorUserId: req.user.id, action: 'manual_evidence_submitted', resourceType: 'control', resourceId: control.code, details: { verificationId: verId } });
  res.status(201).json({ evidenceId: evId, verificationId: verId, status: 'pending_assessor_review' });
});

// ---- Control results dashboard (Stage 4-5) ----

router.get('/scopes/:scopeId/controls', loadOwnedScope(), (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.code, c.domain, c.title, c.severity, c.default_min_ecl, c.max_evidence_age_hours,
           ac.status, ac.ecl, ac.coverage_pct, ac.valid_from, ac.valid_until, ac.revoked
    FROM controls c
    LEFT JOIN assurance_claims ac ON ac.control_id = c.id AND ac.scope_id = ?
    ORDER BY c.domain, c.code
  `).all(req.scope.id);
  const normalized = rows.map(r => ({ ...r, status: r.status || 'not_assessed', ecl: r.ecl ?? 0 }));
  res.json({ controls: normalized });
});

router.post('/scopes/:scopeId/freshness-check', loadOwnedScope(), (req, res) => {
  const expired = freshnessEngine.runFreshnessSweep(db, { scopeId: req.scope.id, actorLabel: `user:${req.user.id}` });
  res.json({ expiredControls: expired });
});

// ---- Remediation (Stage 7-8) ----

router.get('/scopes/:scopeId/remediation', loadOwnedScope(), (req, res) => {
  const items = db.prepare(`
    SELECT r.*, c.code as control_code, c.title as control_title
    FROM remediation_items r JOIN controls c ON c.id = r.control_id
    WHERE r.scope_id = ? ORDER BY r.created_at DESC
  `).all(req.scope.id);
  res.json({ items });
});

router.post('/scopes/:scopeId/remediation/:id/mark-remediated', loadOwnedScope(), (req, res) => {
  const item = db.prepare('SELECT * FROM remediation_items WHERE id=? AND scope_id=?').get(req.params.id, req.scope.id);
  if (!item) return res.status(404).json({ error: 'not_found' });
  if (item.status !== 'open') return res.status(409).json({ error: 'not_open' });
  db.prepare(`UPDATE remediation_items SET status='reverification_pending' WHERE id=?`).run(item.id);
  auditLog.log(db, { actorUserId: req.user.id, action: 'remediation_marked_fixed', resourceType: 'remediation_item', resourceId: item.id });
  res.json({ ok: true, status: 'reverification_pending' });
});

// ---- Supplier dependency graph (Suite build guide Section 10-11) ----

router.get('/scopes/:scopeId/suppliers', loadOwnedScope(), (req, res) => {
  res.json({ suppliers: supplierGraph.listSuppliersForScope(db, req.scope.id) });
});

router.post('/scopes/:scopeId/suppliers', loadOwnedScope(), (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.service) return res.status(400).json({ error: 'name_and_service_required' });
  const id = supplierGraph.createSupplier(db, req.scope.id, {
    name: b.name, service: b.service, businessProcess: b.businessProcess, dataTouched: b.dataTouched,
    region: b.region, contractOwner: b.contractOwner, recoveryDependency: b.recoveryDependency,
    alternativeProvider: b.alternativeProvider, criticality: b.criticality,
  });
  if (Array.isArray(b.controlCodes)) {
    for (const code of b.controlCodes) {
      const control = db.prepare('SELECT id FROM controls WHERE code=?').get(code);
      if (control) supplierGraph.linkControl(db, id, control.id);
    }
  }
  auditLog.log(db, { actorUserId: req.user.id, action: 'supplier_added', resourceType: 'supplier', resourceId: id, details: { name: b.name, criticality: b.criticality } });
  res.status(201).json({ id });
});

// ---- Appeals & complaints (Section 10.2) ----

router.post('/appeals', (req, res) => {
  const { relatedVerificationId, reason } = req.body || {};
  if (!reason) return res.status(400).json({ error: 'reason_required' });
  const info = db.prepare(`INSERT INTO appeals (org_id, related_verification_id, reason) VALUES (?, ?, ?)`)
    .run(req.user.org_id, relatedVerificationId || null, reason);
  auditLog.log(db, { actorUserId: req.user.id, action: 'appeal_filed', resourceType: 'appeal', resourceId: info.lastInsertRowid });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.get('/appeals', (req, res) => {
  const rows = db.prepare('SELECT * FROM appeals WHERE org_id=? ORDER BY created_at DESC').all(req.user.org_id);
  res.json({ appeals: rows });
});

// ---- Passport issuance (Stage 9) ----

router.post('/scopes/:scopeId/passports', loadOwnedScope(), (req, res) => {
  const claims = db.prepare('SELECT * FROM assurance_claims WHERE scope_id=?').all(req.scope.id);
  const materialGaps = claims.filter(c => c.status === 'material_gap').length;
  const status = materialGaps > 0 ? 'conditional' : 'verified';
  const passportCode = `LS-CRP-${(req.body && req.body.jurisdiction) || 'CA'}-${String(100000 + Math.floor(Math.random() * 899999))}`;
  const issuedAt = new Date().toISOString();
  const payload = { passportCode, orgId: req.user.org_id, scopeId: req.scope.id, status, issuedAt };
  const signature = signing.sign(payload);
  // Agentic Automation Architecture, Part 0: every org's FIRST issued
  // passport is flagged pending human verification, regardless of whether
  // the org signed up self-serve or was manually recruited. Once this org
  // has ever had a passport a human actually verified, later passports are
  // not re-flagged.
  const alreadyEstablished = db.prepare(
    'SELECT COUNT(*) n FROM passports WHERE org_id=? AND verified_at IS NOT NULL'
  ).get(req.user.org_id).n > 0;
  const pendingHumanVerification = alreadyEstablished ? 0 : 1;
  const info = db.prepare(`
    INSERT INTO passports (passport_code, org_id, scope_id, status, issued_at, signature, pending_human_verification)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(passportCode, req.user.org_id, req.scope.id, status, issuedAt, signature, pendingHumanVerification);
  auditLog.log(db, { actorUserId: req.user.id, action: 'passport_issued', resourceType: 'passport', resourceId: info.lastInsertRowid, details: { status, pendingHumanVerification: !!pendingHumanVerification } });
  res.status(201).json({ id: info.lastInsertRowid, passportCode, status, pendingHumanVerification: !!pendingHumanVerification });
});

router.get('/passports', (req, res) => {
  const rows = db.prepare('SELECT * FROM passports WHERE org_id=? ORDER BY issued_at DESC').all(req.user.org_id);
  res.json({ passports: rows });
});

router.get('/passports/:id', (req, res) => {
  const passport = db.prepare('SELECT * FROM passports WHERE id=? AND org_id=?').get(req.params.id, req.user.org_id);
  if (!passport) return res.status(404).json({ error: 'not_found' });
  const claims = db.prepare(`
    SELECT c.code, c.domain, c.title, c.severity, ac.status, ac.ecl, ac.coverage_pct, ac.valid_from, ac.valid_until, ac.provenance
    FROM assurance_claims ac JOIN controls c ON c.id = ac.control_id
    WHERE ac.scope_id = ? ORDER BY c.domain, c.code
  `).all(passport.scope_id);
  const verifiedCount = claims.filter(c => c.status === 'verified').length;
  const validSig = signing.verify({ passportCode: passport.passport_code, orgId: passport.org_id, scopeId: passport.scope_id, status: passport.status, issuedAt: passport.issued_at }, passport.signature);
  res.json({ passport, claims, verifiedCount, totalControls: claims.length, integrityValid: validSig });
});

router.post('/passports/:id/revoke', (req, res) => {
  const passport = db.prepare('SELECT * FROM passports WHERE id=? AND org_id=?').get(req.params.id, req.user.org_id);
  if (!passport) return res.status(404).json({ error: 'not_found' });
  db.prepare(`UPDATE passports SET status='revoked', revoked=1, revoked_at=datetime('now') WHERE id=?`).run(passport.id);
  auditLog.log(db, { actorUserId: req.user.id, action: 'passport_revoked', resourceType: 'passport', resourceId: passport.id });
  res.json({ ok: true });
});

// ---- Selective disclosure / sharing (Stage 10) ----

router.get('/partners', (req, res) => {
  const rows = db.prepare(`
    SELECT p.id as partnerId, p.partner_type, o.name
    FROM partners p JOIN organizations o ON o.id = p.org_id
    ORDER BY o.name
  `).all();
  res.json({ partners: rows });
});

router.post('/passports/:id/share', (req, res) => {
  const passport = db.prepare('SELECT * FROM passports WHERE id=? AND org_id=?').get(req.params.id, req.user.org_id);
  if (!passport) return res.status(404).json({ error: 'not_found' });
  const { recipientPartnerId, purpose, expiresInHours } = req.body || {};
  const partner = db.prepare('SELECT * FROM partners WHERE id=?').get(recipientPartnerId);
  if (!partner) return res.status(400).json({ error: 'invalid_partner' });
  const hours = Number(expiresInHours) || 720;
  const token = nanoid(32);
  const info = db.prepare(`
    INSERT INTO sharing_grants (passport_id, recipient_partner_id, purpose, access_token, granted_by, expires_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `).run(passport.id, partner.id, purpose || 'insurance placement', token, req.user.id, `+${hours} hours`);
  auditLog.log(db, { actorUserId: req.user.id, action: 'sharing_granted', resourceType: 'passport', resourceId: passport.id, details: { recipientPartnerId, purpose, hours } });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.get('/passports/:id/sharing', (req, res) => {
  const passport = db.prepare('SELECT * FROM passports WHERE id=? AND org_id=?').get(req.params.id, req.user.org_id);
  if (!passport) return res.status(404).json({ error: 'not_found' });
  const grants = db.prepare(`
    SELECT sg.*, o.name as recipientName, p.partner_type
    FROM sharing_grants sg JOIN partners p ON p.id = sg.recipient_partner_id JOIN organizations o ON o.id = p.org_id
    WHERE sg.passport_id = ? ORDER BY sg.granted_at DESC
  `).all(passport.id);
  res.json({ grants });
});

router.post('/sharing/:grantId/revoke', (req, res) => {
  const grant = db.prepare(`
    SELECT sg.* FROM sharing_grants sg JOIN passports p ON p.id = sg.passport_id WHERE sg.id=? AND p.org_id=?
  `).get(req.params.grantId, req.user.org_id);
  if (!grant) return res.status(404).json({ error: 'not_found' });
  db.prepare(`UPDATE sharing_grants SET revoked=1, revoked_at=datetime('now') WHERE id=?`).run(grant.id);
  auditLog.log(db, { actorUserId: req.user.id, action: 'sharing_revoked', resourceType: 'sharing_grant', resourceId: grant.id });
  res.json({ ok: true });
});

// ---- Customer-visible audit trail (Section 5.8: "every counterparty access should be logged and visible to the customer") ----

router.get('/audit', (req, res) => {
  const userIds = db.prepare('SELECT id FROM users WHERE org_id=?').all(req.user.org_id).map(r => r.id);
  const scopeIds = db.prepare('SELECT id FROM scopes WHERE org_id=?').all(req.user.org_id).map(r => r.id);
  const passportIds = db.prepare('SELECT id FROM passports WHERE org_id=?').all(req.user.org_id).map(r => r.id);
  const grantIds = passportIds.length
    ? db.prepare(`SELECT id FROM sharing_grants WHERE passport_id IN (${passportIds.map(() => '?').join(',')})`).all(...passportIds).map(r => r.id)
    : [];

  const clauses = [];
  const params = [];
  if (userIds.length) { clauses.push(`actor_user_id IN (${userIds.map(() => '?').join(',')})`); params.push(...userIds); }
  if (scopeIds.length) { clauses.push(`(resource_type='scope' AND resource_id IN (${scopeIds.map(() => '?').join(',')}))`); params.push(...scopeIds); }
  if (passportIds.length) { clauses.push(`(resource_type='passport' AND resource_id IN (${passportIds.map(() => '?').join(',')}))`); params.push(...passportIds); }
  if (grantIds.length) { clauses.push(`(resource_type='sharing_grant' AND resource_id IN (${grantIds.map(() => '?').join(',')}))`); params.push(...grantIds); }
  if (!clauses.length) return res.json({ entries: [] });

  const entries = db.prepare(`SELECT * FROM access_log WHERE ${clauses.join(' OR ')} ORDER BY at DESC LIMIT 200`).all(...params);
  res.json({ entries });
});

module.exports = router;
