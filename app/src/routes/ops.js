const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const auditLog = require('../services/auditLog');
const signing = require('../services/signing');
const freshnessEngine = require('../services/freshnessEngine');
const translationEngine = require('../services/translationEngine');
const supplierGraph = require('../services/supplierGraph');
const claimEvidenceEngine = require('../services/claimEvidenceEngine');

const router = express.Router();
const OPS_ROLES = ['ls_admin', 'ls_assessor', 'ls_decision_officer'];
router.use(requireAuth, requireRole(...OPS_ROLES));

router.get('/dashboard', (req, res) => {
  const counts = {
    customers: db.prepare(`SELECT COUNT(*) n FROM organizations WHERE org_type='customer'`).get().n,
    scopes: db.prepare(`SELECT COUNT(*) n FROM scopes`).get().n,
    passports: db.prepare(`SELECT COUNT(*) n FROM passports WHERE revoked=0`).get().n,
    pendingVerifications: db.prepare(`SELECT COUNT(*) n FROM verifications WHERE decision_status='pending'`).get().n,
    reverificationQueue: db.prepare(`SELECT COUNT(*) n FROM remediation_items WHERE status='reverification_pending'`).get().n,
    openAppeals: db.prepare(`SELECT COUNT(*) n FROM appeals WHERE status IN ('open','under_review')`).get().n,
  };
  res.json({ counts });
});

// ---- Verification queue: assess (ls_assessor) then decide (ls_decision_officer) ----
// Section 10.1/4.1: the final decision function is independent from remediation
// delivery. Assessors may propose an ECL and notes; only a decision officer
// (or admin) can move a verification to approved/rejected.

router.get('/verification-queue', (req, res) => {
  const rows = db.prepare(`
    SELECT v.*, c.code as control_code, c.title as control_title, s.scope_code, o.name as org_name
    FROM verifications v
    JOIN controls c ON c.id = v.control_id
    JOIN scopes s ON s.id = v.scope_id
    JOIN organizations o ON o.id = s.org_id
    WHERE v.decision_status = 'pending'
    ORDER BY v.created_at ASC
  `).all();
  res.json({ items: rows });
});

router.post('/verifications/:id/assess', requireRole('ls_assessor', 'ls_admin'), (req, res) => {
  const { ecl, coveragePct, effectiveness, notes } = req.body || {};
  const v = db.prepare('SELECT * FROM verifications WHERE id=?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'not_found' });
  db.prepare(`
    UPDATE verifications SET ecl=COALESCE(?, ecl), coverage_pct=COALESCE(?, coverage_pct),
      effectiveness=COALESCE(?, effectiveness), exceptions_json=COALESCE(?, exceptions_json), verifier_user_id=?
    WHERE id=?
  `).run(ecl ?? null, coveragePct ?? null, effectiveness ?? null, notes ? JSON.stringify([notes]) : null, req.user.id, v.id);
  auditLog.log(db, { actorUserId: req.user.id, action: 'verification_assessed', resourceType: 'verification', resourceId: v.id });
  res.json({ ok: true });
});

router.post('/verifications/:id/decide', requireRole('ls_decision_officer', 'ls_admin'), (req, res) => {
  const { decision } = req.body || {}; // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'invalid_decision' });
  const v = db.prepare('SELECT * FROM verifications WHERE id=?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'not_found' });
  if (v.decision_status !== 'pending') return res.status(409).json({ error: 'already_decided' });

  db.prepare(`UPDATE verifications SET decision_status=?, decision_officer_id=?, decision_date=datetime('now') WHERE id=?`)
    .run(decision, req.user.id, v.id);

  if (decision === 'approved') {
    const control = db.prepare('SELECT * FROM controls WHERE id=?').get(v.control_id);
    const status = v.effectiveness === 'effective' && v.coverage_pct >= 95 ? 'verified' : (v.coverage_pct > 0 ? 'conditional' : 'material_gap');
    const validFrom = new Date().toISOString();
    const validUntil = new Date(Date.now() + control.max_evidence_age_hours * 3600 * 1000).toISOString();
    const signature = signing.sign({ scope_id: v.scope_id, control: control.code, status, ecl: v.ecl, coverage_pct: v.coverage_pct, valid_from: validFrom, valid_until: validUntil });
    db.prepare(`
      INSERT INTO assurance_claims (scope_id, control_id, verification_id, status, ecl, coverage_pct, valid_from, valid_until, signature, revoked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(scope_id, control_id) DO UPDATE SET
        verification_id=excluded.verification_id, status=excluded.status, ecl=excluded.ecl, coverage_pct=excluded.coverage_pct,
        valid_from=excluded.valid_from, valid_until=excluded.valid_until, signature=excluded.signature,
        revoked=0, revoked_at=NULL, revoked_reason=NULL, updated_at=datetime('now')
    `).run(v.scope_id, v.control_id, v.id, status, v.ecl, v.coverage_pct, validFrom, validUntil, signature);
  }

  auditLog.log(db, { actorUserId: req.user.id, action: `verification_${decision}`, resourceType: 'verification', resourceId: v.id });
  res.json({ ok: true, decision });
});

// ---- Independent re-verification of remediation closures (Stage 8) ----

router.get('/reverification-queue', (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, c.code as control_code, c.title as control_title, s.scope_code, o.name as org_name
    FROM remediation_items r
    JOIN controls c ON c.id = r.control_id
    JOIN scopes s ON s.id = r.scope_id
    JOIN organizations o ON o.id = s.org_id
    WHERE r.status = 'reverification_pending'
    ORDER BY r.created_at ASC
  `).all();
  res.json({ items: rows });
});

router.post('/reverification/:id/close', requireRole('ls_assessor', 'ls_decision_officer', 'ls_admin'), (req, res) => {
  const item = db.prepare('SELECT * FROM remediation_items WHERE id=?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not_found' });
  if (item.status !== 'reverification_pending') return res.status(409).json({ error: 'not_pending' });

  const control = db.prepare('SELECT * FROM controls WHERE id=?').get(item.control_id);
  const validFrom = new Date().toISOString();
  const validUntil = new Date(Date.now() + control.max_evidence_age_hours * 3600 * 1000).toISOString();
  const signature = signing.sign({ scope_id: item.scope_id, control: control.code, status: 'verified', ecl: 2, coverage_pct: 100, valid_from: validFrom, valid_until: validUntil });
  const verId = db.prepare(`
    INSERT INTO verifications (scope_id, control_id, verifier_user_id, ecl, coverage_pct, effectiveness, decision_officer_id, decision_status, decision_date)
    VALUES (?, ?, ?, 2, 100, 'effective', ?, 'approved', datetime('now'))
  `).run(item.scope_id, item.control_id, req.user.id, req.user.id).lastInsertRowid;
  db.prepare(`
    INSERT INTO assurance_claims (scope_id, control_id, verification_id, status, ecl, coverage_pct, valid_from, valid_until, signature, revoked)
    VALUES (?, ?, ?, 'verified', 2, 100, ?, ?, ?, 0)
    ON CONFLICT(scope_id, control_id) DO UPDATE SET
      verification_id=excluded.verification_id, status='verified', ecl=2, coverage_pct=100,
      valid_from=excluded.valid_from, valid_until=excluded.valid_until, signature=excluded.signature,
      revoked=0, revoked_at=NULL, revoked_reason=NULL, updated_at=datetime('now')
  `).run(item.scope_id, item.control_id, verId, validFrom, validUntil, signature);
  db.prepare(`UPDATE remediation_items SET status='closed', closed_at=datetime('now'), reverified_by=? WHERE id=?`).run(req.user.id, item.id);

  auditLog.log(db, { actorUserId: req.user.id, action: 'remediation_closed_independent_reverification', resourceType: 'remediation_item', resourceId: item.id });
  res.json({ ok: true });
});

// ---- Appeals (Section 10.2) ----

router.get('/appeals', (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, o.name as org_name FROM appeals a JOIN organizations o ON o.id = a.org_id ORDER BY a.created_at DESC
  `).all();
  res.json({ appeals: rows });
});

router.post('/appeals/:id/resolve', requireRole('ls_decision_officer', 'ls_admin'), (req, res) => {
  const { resolution, upheld } = req.body || {};
  const appeal = db.prepare('SELECT * FROM appeals WHERE id=?').get(req.params.id);
  if (!appeal) return res.status(404).json({ error: 'not_found' });
  db.prepare(`UPDATE appeals SET status=?, reviewer_id=?, resolution=?, resolved_at=datetime('now') WHERE id=?`)
    .run(upheld ? 'upheld' : 'overturned', req.user.id, resolution || null, appeal.id);
  auditLog.log(db, { actorUserId: req.user.id, action: 'appeal_resolved', resourceType: 'appeal', resourceId: appeal.id, details: { upheld } });
  res.json({ ok: true });
});

// ---- Controls catalogue (reference) ----

router.get('/controls', (req, res) => {
  res.json({ controls: db.prepare('SELECT * FROM controls ORDER BY domain, code').all() });
});

// ---- Partners & confidential Carrier Requirements Graph (ls_admin only, Section 12.11) ----

router.get('/partners', (req, res) => {
  const rows = db.prepare(`
    SELECT p.id, p.partner_type, p.maturity_level, o.name, o.id as org_id
    FROM partners p JOIN organizations o ON o.id = p.org_id ORDER BY o.name
  `).all();
  res.json({ partners: rows });
});

router.post('/partners', requireRole('ls_admin'), (req, res) => {
  const { name, partnerType, industry, jurisdiction } = req.body || {};
  if (!name || !['broker', 'carrier'].includes(partnerType)) return res.status(400).json({ error: 'name_and_valid_partnerType_required' });
  const orgInfo = db.prepare(`INSERT INTO organizations (org_type, name, industry, jurisdiction) VALUES (?, ?, ?, ?)`)
    .run(partnerType, name, industry || null, jurisdiction || null);
  const partnerInfo = db.prepare(`INSERT INTO partners (org_id, partner_type) VALUES (?, ?)`).run(orgInfo.lastInsertRowid, partnerType);
  auditLog.log(db, { actorUserId: req.user.id, action: 'partner_created', resourceType: 'partner', resourceId: partnerInfo.lastInsertRowid, details: { partnerType, name } });
  res.status(201).json({ id: partnerInfo.lastInsertRowid, orgId: orgInfo.lastInsertRowid });
});

router.get('/partners/:partnerId/requirements', requireRole('ls_admin'), (req, res) => {
  res.json({ requirements: translationEngine.listRequirementsForPartner(db, req.params.partnerId) });
});

router.post('/partners/:partnerId/requirements', requireRole('ls_admin'), (req, res) => {
  const b = req.body || {};
  const control = db.prepare('SELECT * FROM controls WHERE code=?').get(b.controlCode);
  if (!control) return res.status(400).json({ error: 'invalid_control_code' });
  const info = translationEngine.upsertRequirement(db, {
    partner_id: req.params.partnerId,
    requirement_code: b.requirementCode,
    requirement_label: b.requirementLabel,
    control_id: control.id,
    min_ecl: b.minEcl ?? 3,
    max_evidence_age_hours: b.maxEvidenceAgeHours ?? control.max_evidence_age_hours,
    mandatory: b.mandatory ?? true,
    weight: b.weight ?? 1.0,
    industry_overlay: b.industryOverlay,
    source_classification: b.sourceClassification || 'inferred_unvalidated',
    review_date: b.reviewDate,
    confidential_notes: b.confidentialNotes,
  });
  auditLog.log(db, { actorUserId: req.user.id, action: 'carrier_requirement_added', resourceType: 'partner', resourceId: req.params.partnerId, details: { controlCode: b.controlCode } });
  res.status(201).json({ id: info.lastInsertRowid });
});

// ---- Scope directory (reference, for claim creation) ----

router.get('/scopes', (req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.scope_code, s.name, o.name as org_name FROM scopes s JOIN organizations o ON o.id = s.org_id ORDER BY o.name
  `).all();
  res.json({ scopes: rows });
});

// ---- Supplier dependency graph: portfolio concentration (Ops Guide Section 8) ----

router.get('/suppliers/concentration', (req, res) => {
  res.json({ report: supplierGraph.concentrationReport(db) });
});

// ---- Claim evidence pack workflow (Ops Guide Section 10) ----

router.get('/claims', (req, res) => {
  const rows = db.prepare(`
    SELECT cl.*, s.scope_code, o.name as org_name
    FROM claims cl JOIN scopes s ON s.id = cl.scope_id JOIN organizations o ON o.id = s.org_id
    ORDER BY cl.created_at DESC
  `).all();
  res.json({ claims: rows });
});

router.post('/claims', requireRole('ls_assessor', 'ls_admin'), (req, res) => {
  const b = req.body || {};
  if (!b.scopeId || !b.incidentDate) return res.status(400).json({ error: 'scopeId_and_incidentDate_required' });
  const scope = db.prepare('SELECT * FROM scopes WHERE id=?').get(b.scopeId);
  if (!scope) return res.status(400).json({ error: 'invalid_scope' });
  const id = claimEvidenceEngine.createClaim(db, {
    scopeId: b.scopeId, policyReference: b.policyReference, incidentDate: b.incidentDate,
    affectedBusinessProcess: b.affectedBusinessProcess, affectedSystems: b.affectedSystems,
    knownSuppliers: b.knownSuppliers, createdBy: req.user.id,
  });
  res.status(201).json({ id });
});

router.get('/claims/:id', (req, res) => {
  const claim = db.prepare(`
    SELECT cl.*, s.scope_code, o.name as org_name
    FROM claims cl JOIN scopes s ON s.id = cl.scope_id JOIN organizations o ON o.id = s.org_id
    WHERE cl.id=?
  `).get(req.params.id);
  if (!claim) return res.status(404).json({ error: 'not_found' });
  const packs = db.prepare('SELECT * FROM claim_evidence_packs WHERE claim_id=? ORDER BY id DESC').all(claim.id);
  res.json({ claim, packs });
});

router.post('/claims/:id/generate-pack', requireRole('ls_assessor', 'ls_admin'), (req, res) => {
  try {
    const packId = claimEvidenceEngine.generatePack(db, { claimId: req.params.id, actorUserId: req.user.id, windowStart: req.body?.windowStart, windowEnd: req.body?.windowEnd });
    res.status(201).json({ id: packId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/packs/:id/approve', requireRole('ls_decision_officer', 'ls_admin'), (req, res) => {
  try {
    claimEvidenceEngine.approvePack(db, { packId: req.params.id, actorUserId: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/packs/:id/release', requireRole('ls_decision_officer', 'ls_admin'), (req, res) => {
  const { partnerId, purpose } = req.body || {};
  if (!partnerId) return res.status(400).json({ error: 'partnerId_required' });
  try {
    claimEvidenceEngine.releasePack(db, { packId: req.params.id, partnerId, purpose, actorUserId: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- Continuous assurance demo tools (Section 5.9, 11) ----

router.post('/demo/freshness-sweep', requireRole('ls_admin'), (req, res) => {
  const expired = freshnessEngine.runFreshnessSweep(db, { actorLabel: `user:${req.user.id}` });
  res.json({ expiredControls: expired });
});

router.post('/demo/simulate-drift', requireRole('ls_admin'), (req, res) => {
  const { scopeId, hours } = req.body || {};
  if (!scopeId || !hours) return res.status(400).json({ error: 'scopeId_and_hours_required' });
  freshnessEngine.simulateDrift(db, scopeId, hours);
  const expired = freshnessEngine.runFreshnessSweep(db, { scopeId, actorLabel: `user:${req.user.id}` });
  res.json({ ok: true, expiredControls: expired });
});

// ---- Full audit log (ls_admin only) ----

router.get('/audit', requireRole('ls_admin'), (req, res) => {
  res.json({ entries: db.prepare('SELECT * FROM access_log ORDER BY at DESC LIMIT 300').all() });
});

module.exports = router;
