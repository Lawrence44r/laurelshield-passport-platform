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
// Architecture's self-serve funnel (Part V). Shares creation logic with the
// internal, server-to-server provisioning endpoint (routes/internal.js) via
// services/provisioning.js so there is exactly one way a new org is created.
router.post('/signup', loginLimiter, (req, res) => {
  const { companyName, email, password, fullName } = req.body || {};
  if (!companyName || !email || !password) {
    return res.status(400).json({ error: 'company_name_email_and_password_required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (String(password).length < 10) {
    return res.status(400).json({ error: 'password_too_short', minLength: 10 });
  }

  let provisioned;
  try {
    provisioned = provisioning.createOrgAndAdmin(db, { companyName, email, password, fullName });
  } catch (err) {
    if (err.code === 'email_already_registered') {
      return res.status(409).json({ error: 'email_already_registered' });
    }
    throw err;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(provisioned.userId);
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'session_error' });
    req.session.userId = user.id;
    auditLog.log(db, { actorUserId: user.id, action: 'signup_succeeded' });
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
