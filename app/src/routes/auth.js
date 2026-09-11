const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const auditLog = require('../services/auditLog');
const mfa = require('../services/mfa');
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
// continues to reject this session until this step also succeeds).
router.post('/verify-mfa', loginLimiter, (req, res) => {
  const pendingId = req.session.pendingMfaUserId;
  if (!pendingId) return res.status(400).json({ error: 'no_pending_login' });
  const { token } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(pendingId);
  if (!user || !mfa.verifyToken(user.mfa_secret, token)) {
    auditLog.log(db, { actorUserId: pendingId, action: 'mfa_login_failed' });
    return res.status(401).json({ error: 'invalid_code' });
  }
  delete req.session.pendingMfaUserId;
  req.session.userId = user.id;
  auditLog.log(db, { actorUserId: user.id, action: 'login_succeeded_mfa' });
  res.json({ user: publicUser(user) });
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
