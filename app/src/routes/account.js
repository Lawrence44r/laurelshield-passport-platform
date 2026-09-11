const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const auditLog = require('../services/auditLog');
const mfa = require('../services/mfa');

// Account settings (MFA enrollment, theme is client-side only) - available
// to every authenticated role, not scoped to one portal.
const router = express.Router();
router.use(requireAuth);

router.get('/me', (req, res) => {
  const codes = req.user.mfa_recovery_codes ? JSON.parse(req.user.mfa_recovery_codes) : [];
  res.json({ mfaEnabled: !!req.user.mfa_enabled, recoveryCodesRemaining: codes.length });
});

// Generates a new TOTP secret and returns a QR code to scan with any
// authenticator app. Not enabled yet - enabling requires proving possession
// of the secret via /mfa/verify first, so a lost/abandoned setup can't lock
// an account into a half-configured state.
router.post('/mfa/setup', async (req, res) => {
  const secret = mfa.generateSecret();
  db.prepare('UPDATE users SET mfa_secret = ?, mfa_enabled = 0 WHERE id = ?').run(secret, req.user.id);
  const { otpauthUrl, qrCodeDataUrl } = await mfa.buildEnrollment(req.user.email, secret);
  auditLog.log(db, { actorUserId: req.user.id, action: 'mfa_setup_started' });
  res.json({ secret, otpauthUrl, qrCodeDataUrl });
});

router.post('/mfa/verify', (req, res) => {
  const { token } = req.body || {};
  const row = db.prepare('SELECT mfa_secret FROM users WHERE id = ?').get(req.user.id);
  if (!row || !row.mfa_secret) return res.status(400).json({ error: 'no_pending_mfa_setup' });
  if (!mfa.verifyToken(row.mfa_secret, token)) {
    auditLog.log(db, { actorUserId: req.user.id, action: 'mfa_verify_failed' });
    return res.status(400).json({ error: 'invalid_code' });
  }
  const { plain, hashed } = mfa.generateRecoveryCodes();
  db.prepare('UPDATE users SET mfa_enabled = 1, mfa_recovery_codes = ? WHERE id = ?').run(JSON.stringify(hashed), req.user.id);
  auditLog.log(db, { actorUserId: req.user.id, action: 'mfa_enabled' });
  res.json({ ok: true, recoveryCodes: plain });
});

router.post('/mfa/disable', (req, res) => {
  const { password } = req.body || {};
  if (!password || !bcrypt.compareSync(password, req.user.password_hash)) {
    return res.status(401).json({ error: 'invalid_password' });
  }
  db.prepare('UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, mfa_recovery_codes = NULL WHERE id = ?').run(req.user.id);
  auditLog.log(db, { actorUserId: req.user.id, action: 'mfa_disabled' });
  res.json({ ok: true });
});

// Invalidates any unused codes and issues a fresh set of 10. Requires the
// account password, same bar as disabling MFA, since a leaked recovery code
// is as good as the second factor itself.
router.post('/mfa/recovery-codes/regenerate', (req, res) => {
  const { password } = req.body || {};
  if (!password || !bcrypt.compareSync(password, req.user.password_hash)) {
    return res.status(401).json({ error: 'invalid_password' });
  }
  if (!req.user.mfa_enabled) return res.status(400).json({ error: 'mfa_not_enabled' });
  const { plain, hashed } = mfa.generateRecoveryCodes();
  db.prepare('UPDATE users SET mfa_recovery_codes = ? WHERE id = ?').run(JSON.stringify(hashed), req.user.id);
  auditLog.log(db, { actorUserId: req.user.id, action: 'mfa_recovery_codes_regenerated' });
  res.json({ ok: true, recoveryCodes: plain });
});

module.exports = router;
