// Server-to-server provisioning -- NOT a browser-facing route, and
// deliberately not behind the session-cookie middleware (there is no
// browser session at webhook-call time). Called by the marketing site's
// Stripe webhook after a successful Continuous Assurance subscription
// payment (Agentic Automation Architecture, Part V). Protected by a shared
// secret compared with crypto.timingSafeEqual, the same pattern already
// used for signature verification in services/signing.js.
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const provisioning = require('../services/provisioning');
const bootstrapDemoAccounts = require('../services/bootstrapDemoAccounts');

const router = express.Router();

const provisionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

function requireProvisionSecret(req, res, next) {
  const expected = process.env.PROVISION_WEBHOOK_SECRET;
  if (!expected) {
    console.error('PROVISION_WEBHOOK_SECRET is not configured -- /internal routes are disabled.');
    return res.status(503).json({ error: 'provisioning_not_configured' });
  }
  const presented = req.get('x-provision-secret') || '';
  const expectedBuf = Buffer.from(expected);
  const presentedBuf = Buffer.from(presented);
  const ok = expectedBuf.length === presentedBuf.length && crypto.timingSafeEqual(expectedBuf, presentedBuf);
  if (!ok) return res.status(401).json({ error: 'invalid_provision_secret' });
  next();
}

// Same centralized validation as the self-serve signup route (routes/auth.js)
// -- a Stripe-originated company name is still attacker-influenced data (a
// customer typed it into a Checkout custom field) and gets the same
// sanitization; the generated password is random and will trivially clear
// the strength checks.
const PROVISION_ERROR_STATUS = {
  company_name_email_and_password_required: 400,
  invalid_email: 400,
  password_too_short: 400,
  password_too_common: 400,
  email_already_registered: 409,
};

router.post('/provision-org', provisionLimiter, requireProvisionSecret, (req, res) => {
  const { companyName, email, password, fullName, jurisdiction, source } = req.body || {};

  let provisioned;
  try {
    provisioned = provisioning.createOrgAndAdmin(db, {
      companyName, email, password, fullName, jurisdiction,
      actorLabel: `system:provision_webhook:${source || 'unknown'}`,
      requestMeta: { source: source || 'unknown' },
    });
  } catch (err) {
    const status = PROVISION_ERROR_STATUS[err.code];
    if (status) return res.status(status).json({ error: err.code });
    throw err;
  }

  res.status(201).json({ orgId: provisioned.orgId, scopeId: provisioned.scopeId, userId: provisioned.userId });
});

// One-time: creates the one role self-serve signup never can (ls_admin), plus
// one broker and one carrier account, each with a freshly random password
// returned exactly once in this response -- never the project's own public
// demo password, never stored in plaintext anywhere. Safe to call repeatedly:
// a no-op (alreadyDone: true) once it's run successfully once.
router.post('/bootstrap-demo-accounts', provisionLimiter, requireProvisionSecret, (req, res) => {
  const result = bootstrapDemoAccounts.bootstrap(db);
  res.status(result.alreadyDone ? 200 : 201).json(result);
});

module.exports = router;
