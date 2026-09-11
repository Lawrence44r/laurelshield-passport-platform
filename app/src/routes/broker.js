const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const auditLog = require('../services/auditLog');

const router = express.Router();
router.use(requireAuth, requireRole('broker'));

// Section 8.2 referral triggers - generic readiness signals a broker cares
// about pre-placement/renewal. This is NOT the confidential carrier
// requirements graph; it's a fixed, publishable set of high-value controls.
const TRIGGER_CONTROLS = {
  unverified_mfa: ['LS-ID-101', 'LS-ID-102'],
  backup_concern: ['LS-BCP-301', 'LS-BCP-303', 'LS-BCP-304'],
  edr_gap: ['LS-EDR-201'],
  external_exposure: ['LS-VULN-503'],
};

function loadPartner(req, res, next) {
  const partner = db.prepare(`SELECT * FROM partners WHERE org_id = ? AND partner_type = 'broker'`).get(req.user.org_id);
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
    const claims = db.prepare(`
      SELECT c.code, c.max_evidence_age_hours, ac.status, ac.valid_until
      FROM assurance_claims ac JOIN controls c ON c.id = ac.control_id WHERE ac.scope_id = ?
    `).all(g.scope_id);
    const byCode = new Map(claims.map(c => [c.code, c]));
    const triggers = [];
    for (const [trigger, codes] of Object.entries(TRIGGER_CONTROLS)) {
      const failing = codes.some(code => {
        const c = byCode.get(code);
        return !c || c.status !== 'verified';
      });
      if (failing) triggers.push(trigger);
    }
    // Only flag "renewal readiness" for slow-cycle evidence (>=14 day freshness
    // window, e.g. restore tests, tabletop exercises, governance reviews) aging
    // toward expiry within the next 3 days. Fast-cycling continuous/near-continuous
    // controls (24h-168h windows) are always within a few days of their own
    // window length right after a sync and would otherwise make this trigger
    // fire on every passport regardless of actual renewal timing.
    const expiringSoon = claims.filter(c =>
      c.status === 'verified' && c.max_evidence_age_hours >= 336 &&
      c.valid_until && new Date(c.valid_until) - Date.now() < 3 * 24 * 3600 * 1000
    ).length;
    if (expiringSoon > 0 || claims.some(c => c.status === 'expired')) triggers.push('renewal_readiness');
    return { passportId: g.passport_id, passportCode: g.passport_code, orgName: g.org_name, status: g.passport_status, purpose: g.purpose, expiresAt: g.expires_at, triggers };
  });
  res.json({ portfolio });
});

router.get('/passports/:id', (req, res) => {
  const passport = db.prepare('SELECT * FROM passports WHERE id=?').get(req.params.id);
  if (!passport) return res.status(404).json({ error: 'not_found' });
  const grant = activeGrant(passport.id, req.partner.id);
  if (!grant) return res.status(403).json({ error: 'not_shared_with_you' });

  const claims = db.prepare(`
    SELECT c.code, c.domain, c.title, c.severity, ac.status, ac.ecl, ac.coverage_pct, ac.valid_from, ac.valid_until
    FROM assurance_claims ac JOIN controls c ON c.id = ac.control_id
    WHERE ac.scope_id = ? ORDER BY c.domain, c.code
  `).all(passport.scope_id);
  const org = db.prepare('SELECT name, industry FROM organizations WHERE id=?').get(passport.org_id);

  auditLog.log(db, { actorUserId: req.user.id, action: 'broker_viewed_passport', resourceType: 'passport', resourceId: passport.id });
  res.json({ passport: { code: passport.passport_code, status: passport.status, issuedAt: passport.issued_at }, org, claims });
});

module.exports = router;
