const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const auditLog = require('../services/auditLog');
const mfa = require('../services/mfa');
const provisioning = require('../services/provisioning');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_attempts' },
});

// Deliberately separate from, and stricter than, loginLimiter -- signup
// creates a brand-new organization every time it succeeds, which is a much
// more expensive action to allow at login-attempt volume (mass spam orgs
// filling a free-tier instance, or automated abuse of a public endpoint
// with no human review gate in front of it).
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_signup_attempts' },
});

function publicUser(user) {
  return { id: user.id, email: user.email, fullName: user.full_name, role: user.role, orgId: user.org_id };
}

router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(String(email).toLowerCase().trim());
  const ok = user && bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    auditLog.log(db, { actorLabel: `anon:${email}`, action: 'login_failed' });
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'session_error' });
    if (user.mfa_enabled) {
      req.session.pendingMfaUserId = user.id;
      auditLog.log(db, { actorUserId: user.id, action: 'login_password_ok_mfa_pending' });
      return res.json({ mfaRequired: true });
    }
    req.session.userId = user.id;
    auditLog.log(db, { actorUserId: user.id, action: 'login_succeeded' });
    res.json({ user: publicUser(user) });
  });
});

// Second factor. Only usable after a successful password check left
// req.session.pendingMfaUserId set (never session.userId, so requireAuth
// continues to reject this session until this step also succeeds). Accepts
// either a live TOTP code or a one-time recovery code (for a lost device);
// a recovery code is consumed (removed from the list) the moment it's used.
router.post('/verify-mfa', loginLimiter, (req, res) => {
  const pendingId = req.session.pendingMfaUserId;
  if (!pendingId) return res.status(400).json({ error: 'no_pending_login' });
  const { token } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(pendingId);
  if (!user) return res.status(401).json({ error: 'invalid_code' });

  let usedRecoveryCode = false;
  if (mfa.verifyToken(user.mfa_secret, token)) {
    // TOTP matched, proceed.
  } else {
    const hashedList = user.mfa_recovery_codes ? JSON.parse(user.mfa_recovery_codes) : [];
    const remaining = mfa.consumeRecoveryCode(hashedList, token);
    if (remaining === null) {
      auditLog.log(db, { actorUserId: pendingId, action: 'mfa_login_failed' });
      return res.status(401).json({ error: 'invalid_code' });
    }
    db.prepare('UPDATE users SET mfa_recovery_codes = ? WHERE id = ?').run(JSON.stringify(remaining), user.id);
    usedRecoveryCode = true;
  }

  delete req.session.pendingMfaUserId;
  req.session.userId = user.id;
  auditLog.log(db, { actorUserId: user.id, action: usedRecoveryCode ? 'login_succeeded_mfa_recovery_code' : 'login_succeeded_mfa' });
  res.json({ user: publicUser(user), usedRecoveryCode });
});

// Self-serve signup -- deliberately separate from the SSO flow (services/sso.js),
// which by design never auto-provisions an account on first login. This is
// the one path that actually creates a brand-new organization from a public
// request with no prior session, matching the Agentic Automation
// Architecture's self-serve funnel (Part V). All validation (email format,
// password strength, name sanitization) lives in services/provisioning.js,
// shared with the internal, server-to-server provisioning endpoint
// (routes/internal.js) -- one place decides what counts as good input,
// regardless of which door it came in through.
const SIGNUP_ERROR_STATUS = {
  company_name_email_and_password_required: 400,
  invalid_email: 400,
  password_too_short: 400,
  password_too_common: 400,
  email_already_registered: 409,
};

router.post('/signup', signupLimiter, (req, res) => {
  const { companyName, email, password, fullName } = req.body || {};

  let provisioned;
  try {
    provisioned = provisioning.createOrgAndAdmin(db, {
      companyName, email, password, fullName,
      actorLabel: 'system:self_serve_signup',
      requestMeta: { ip: req.ip },
    });
  } catch (err) {
    const status = SIGNUP_ERROR_STATUS[err.code];
    if (status) return res.status(status).json({ error: err.code });
    throw err;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(provisioned.userId);
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'session_error' });
    req.session.userId = user.id;
    auditLog.log(db, { actorUserId: user.id, action: 'signup_succeeded', details: { ip: req.ip } });
    res.status(201).json({ user: publicUser(user), orgId: provisioned.orgId, scopeId: provisioned.scopeId });
  });
});

router.post('/logout', requireAuth, (req, res) => {
  auditLog.log(db, { actorUserId: req.user.id, action: 'logout' });
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
