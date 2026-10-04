const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const auditLog = require('../services/auditLog');
const sso = require('../services/sso');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const ROLE_HOME = {
  customer_admin: '/customer/index.html',
  ls_admin: '/ops/index.html',
  ls_assessor: '/ops/index.html',
  ls_decision_officer: '/ops/index.html',
  broker: '/broker/index.html',
  carrier: '/carrier/index.html',
};

const ssoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'too_many_attempts' },
});

function redirectUriFor(req) {
  return `${req.protocol}://${req.get('host')}/api/sso/callback`;
}

// ---- Public: email-domain discovery, used by the login page before the
// user picks password vs. SSO. Returns only whether SSO is available and
// where to start it - never any config detail. ----
router.get('/check', (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const domain = email.split('@')[1];
  if (!domain) return res.json({ ssoAvailable: false });
  const config = db.prepare(`SELECT org_id FROM sso_configs WHERE email_domain = ? AND enabled = 1`).get(domain);
  if (!config) return res.json({ ssoAvailable: false });
  res.json({ ssoAvailable: true, loginUrl: `/api/sso/login/${config.org_id}` });
});

// ---- Public: starts the Authorization Code + PKCE flow ----
router.get('/login/:orgId', ssoLimiter, async (req, res) => {
  const config = db.prepare(`SELECT * FROM sso_configs WHERE org_id = ? AND enabled = 1`).get(req.params.orgId);
  if (!config) return res.redirect('/index.html?ssoError=not_configured');
  try {
    const redirectUri = redirectUriFor(req);
    const client = await sso.getClient(config, redirectUri);
    const { authorizationUrl, pending } = sso.buildPending(client, redirectUri);
    req.session.ssoPending = { orgId: config.org_id, ...pending };
    auditLog.log(db, { actorLabel: `anon:sso-start:org${config.org_id}`, action: 'sso_login_started' });
    res.redirect(authorizationUrl);
  } catch (err) {
    auditLog.log(db, { actorLabel: `anon:sso-start:org${req.params.orgId}`, action: 'sso_login_start_failed', details: { message: err.message } });
    res.redirect('/index.html?ssoError=idp_unreachable');
  }
});

// ---- Public: the IdP redirects back here ----
router.get('/callback', ssoLimiter, async (req, res) => {
  const pending = req.session.ssoPending;
  if (!pending) return res.redirect('/index.html?ssoError=no_pending_login');
  delete req.session.ssoPending;

  const config = db.prepare(`SELECT * FROM sso_configs WHERE org_id = ? AND enabled = 1`).get(pending.orgId);
  if (!config) return res.redirect('/index.html?ssoError=not_configured');

  try {
    const redirectUri = redirectUriFor(req);
    const client = await sso.getClient(config, redirectUri);
    const params = client.callbackParams(req);
    const { claims } = await sso.handleCallback(client, redirectUri, params, pending);

    const email = String(claims.email || '').toLowerCase().trim();
    if (!email) throw new Error('idp_did_not_return_email_claim');

    // Deliberately conservative: SSO signs in an existing local account
    // matched by email within this organization, it does not auto-create
    // one. Who gets which role in Laurelshield is a decision made when the
    // account is provisioned, not something an IdP claim should grant
    // silently on first login.
    const user = db.prepare(`SELECT * FROM users WHERE org_id = ? AND email = ? AND active = 1`).get(config.org_id, email);
    if (!user) {
      auditLog.log(db, { actorLabel: `anon:sso-callback:${email}`, action: 'sso_login_no_matching_account', details: { orgId: config.org_id } });
      return res.redirect('/index.html?ssoError=no_account');
    }

    req.session.regenerate((err) => {
      if (err) return res.redirect('/index.html?ssoError=session_error');
      req.session.userId = user.id;
      auditLog.log(db, { actorUserId: user.id, action: 'login_succeeded_sso', details: { idpSubject: claims.sub } });
      res.redirect(ROLE_HOME[user.role] || '/index.html');
    });
  } catch (err) {
    auditLog.log(db, { actorLabel: 'anon:sso-callback', action: 'sso_login_failed', details: { message: err.message } });
    res.redirect('/index.html?ssoError=idp_exchange_failed');
  }
});

// ---- Org-scoped self-service configuration (customer_admin/broker/carrier
// for their own organization only - not Laurelshield staff, who have no
// org_id and no SSO surface of their own). ----
router.use('/config', requireAuth);

function requireOrg(req, res, next) {
  if (!req.user.org_id) return res.status(403).json({ error: 'no_organization' });
  next();
}

router.get('/config', requireOrg, (req, res) => {
  const config = db.prepare(`SELECT * FROM sso_configs WHERE org_id = ?`).get(req.user.org_id);
  if (!config) return res.json({ config: null });
  const { client_secret, ...safe } = config;
  res.json({ config: { ...safe, clientSecretConfigured: true } });
});

router.post('/config', requireOrg, (req, res) => {
  const { emailDomain, issuerUrl, clientId, clientSecret, enabled } = req.body || {};
  if (!emailDomain || !issuerUrl || !clientId) return res.status(400).json({ error: 'emailDomain_issuerUrl_clientId_required' });
  const existing = db.prepare(`SELECT * FROM sso_configs WHERE org_id = ?`).get(req.user.org_id);
  const secretToStore = clientSecret || (existing ? existing.client_secret : null);
  if (!secretToStore) return res.status(400).json({ error: 'clientSecret_required' });

  if (existing) {
    db.prepare(`
      UPDATE sso_configs SET email_domain=?, issuer_url=?, client_id=?, client_secret=?, enabled=?, updated_at=datetime('now')
      WHERE org_id=?
    `).run(emailDomain.toLowerCase(), issuerUrl, clientId, secretToStore, enabled ? 1 : 0, req.user.org_id);
  } else {
    db.prepare(`
      INSERT INTO sso_configs (org_id, email_domain, issuer_url, client_id, client_secret, enabled)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.org_id, emailDomain.toLowerCase(), issuerUrl, clientId, secretToStore, enabled ? 1 : 0);
  }
  auditLog.log(db, { actorUserId: req.user.id, action: 'sso_config_saved', details: { emailDomain, issuerUrl, enabled: !!enabled } });
  res.json({ ok: true });
});

router.post('/config/test', requireOrg, async (req, res) => {
  const { issuerUrl } = req.body || {};
  if (!issuerUrl) return res.status(400).json({ error: 'issuerUrl_required' });
  try {
    const result = await sso.testIssuer(issuerUrl);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(502).json({ error: 'discovery_failed', message: err.message });
  }
});

module.exports = router;
