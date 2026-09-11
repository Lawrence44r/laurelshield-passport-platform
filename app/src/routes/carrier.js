const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const auditLog = require('../services/auditLog');
const translationEngine = require('../services/translationEngine');
const supplierGraph = require('../services/supplierGraph');

const router = express.Router();
router.use(requireAuth, requireRole('carrier'));

function loadPartner(req, res, next) {
  const partner = db.prepare(`SELECT * FROM partners WHERE org_id = ? AND partner_type = 'carrier'`).get(req.user.org_id);
  if (!partner) return res.status(403).json({ error: 'no_partner_profile' });
  req.partner = partner;
  next();
}
router.use(loadPartner);

function activeGrant(passportId, partnerId) {
  return db.prepare(`
    SELECT * FROM sharing_grants
    WHERE passport_id = ? AND recipient_partner_id = ? AND revoked = 0 AND datetime(expires_at) > datetime('now')
  `).get(passportId, partnerId);
}

// Portfolio view returns only the translated readiness bucket per passport -
// never the underlying requirement weights (Section 5.6, 5.8).
router.get('/portfolio', (req, res) => {
  const grants = db.prepare(`
    SELECT sg.*, p.passport_code, p.status as passport_status, p.scope_id, o.name as org_name
    FROM sharing_grants sg
    JOIN passports p ON p.id = sg.passport_id
    JOIN organizations o ON o.id = p.org_id
    WHERE sg.recipient_partner_id = ? AND sg.revoked = 0 AND datetime(sg.expires_at) > datetime('now')
    ORDER BY sg.granted_at DESC
  `).all(req.partner.id);

  const portfolio = grants.map(g => {
    const t = translationEngine.translateForPartner(db, { partnerId: req.partner.id, scopeId: g.scope_id });
    return { passportId: g.passport_id, passportCode: g.passport_code, orgName: g.org_name, status: g.passport_status, overallStatus: t.overallStatus, readinessScore: t.readinessScore };
  });
  res.json({ portfolio });
});

router.get('/passports/:id', (req, res) => {
  const passport = db.prepare('SELECT * FROM passports WHERE id=?').get(req.params.id);
  if (!passport) return res.status(404).json({ error: 'not_found' });
  const grant = activeGrant(passport.id, req.partner.id);
  if (!grant) return res.status(403).json({ error: 'not_shared_with_you' });

  const org = db.prepare('SELECT name, industry FROM organizations WHERE id=?').get(passport.org_id);
  const translation = translationEngine.translateForPartner(db, { partnerId: req.partner.id, scopeId: passport.scope_id });

  auditLog.log(db, { actorUserId: req.user.id, action: 'carrier_viewed_passport', resourceType: 'passport', resourceId: passport.id });
  res.json({ passport: { code: passport.passport_code, status: passport.status, issuedAt: passport.issued_at }, org, translation });
});

// Every scope this carrier currently has an active sharing grant for - the
// same boundary the portfolio/passport routes use. Supplier graph and
// concentration views must never include an insured that hasn't shared a
// passport with this carrier (Section 5.8 selective disclosure).
function grantedScopeIds(partnerId) {
  return db.prepare(`
    SELECT DISTINCT p.scope_id FROM sharing_grants sg JOIN passports p ON p.id = sg.passport_id
    WHERE sg.recipient_partner_id = ? AND sg.revoked = 0 AND datetime(sg.expires_at) > datetime('now')
  `).all(partnerId).map(r => r.scope_id);
}

// ---- Supplier dependency graph (Suite build guide Sections 10-11) ----

router.get('/passports/:id/suppliers', (req, res) => {
  const passport = db.prepare('SELECT * FROM passports WHERE id=?').get(req.params.id);
  if (!passport) return res.status(404).json({ error: 'not_found' });
  const grant = activeGrant(passport.id, req.partner.id);
  if (!grant) return res.status(403).json({ error: 'not_shared_with_you' });

  auditLog.log(db, { actorUserId: req.user.id, action: 'carrier_viewed_supplier_graph', resourceType: 'passport', resourceId: passport.id });
  res.json({ suppliers: supplierGraph.listSuppliersForScope(db, passport.scope_id) });
});

router.get('/portfolio/supplier-concentration', (req, res) => {
  res.json({ report: supplierGraph.concentrationReport(db, { scopeIds: grantedScopeIds(req.partner.id) }) });
});

// ---- Claim evidence packs released to this carrier (Ops Guide Section 10) ----

router.get('/claims', (req, res) => {
  const rows = db.prepare(`
    SELECT cep.id, cep.claim_id, cep.window_start, cep.window_end, cep.manifest_hash, cep.released_at, cep.release_purpose,
           cl.incident_date, cl.affected_business_process, o.name as org_name
    FROM claim_evidence_packs cep
    JOIN claims cl ON cl.id = cep.claim_id
    JOIN scopes s ON s.id = cl.scope_id
    JOIN organizations o ON o.id = s.org_id
    WHERE cep.released_to_partner_id = ? AND cep.status = 'released'
    ORDER BY cep.released_at DESC
  `).all(req.partner.id);
  res.json({ packs: rows });
});

router.get('/claims/:packId', (req, res) => {
  const pack = db.prepare(`
    SELECT cep.*, cl.incident_date, cl.affected_business_process, cl.affected_systems, cl.policy_reference, o.name as org_name
    FROM claim_evidence_packs cep
    JOIN claims cl ON cl.id = cep.claim_id
    JOIN scopes s ON s.id = cl.scope_id
    JOIN organizations o ON o.id = s.org_id
    WHERE cep.id = ?
  `).get(req.params.packId);
  if (!pack || pack.released_to_partner_id !== req.partner.id || pack.status !== 'released') return res.status(403).json({ error: 'not_released_to_you' });

  auditLog.log(db, { actorUserId: req.user.id, action: 'carrier_viewed_claim_pack', resourceType: 'claim_evidence_pack', resourceId: pack.id });
  res.json({ pack: { ...pack, manifest: JSON.parse(pack.manifest_json) } });
});

module.exports = router;
