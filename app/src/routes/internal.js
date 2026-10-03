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

router.post('/provision-org', provisionLimiter, requireProvisionSecret, (req, res) => {
  const { companyName, email, password, fullName, jurisdiction, source } = req.body || {};
  if (!companyName || !email || !password) {
    return res.status(400).json({ error: 'company_name_email_and_password_required' });
  }

  let provisioned;
  try {
    provisioned = provisioning.createOrgAndAdmin(db, {
      companyName, email, password, fullName, jurisdiction,
      actorLabel: `system:provision_webhook:${source || 'unknown'}`,
    });
  } catch (err) {
    if (err.code === 'email_already_registered') {
      return res.status(409).json({ error: 'email_already_registered' });
    }
    throw err;
  }

  res.status(201).json({ orgId: provisioned.orgId, scopeId: provisioned.scopeId, userId: provisioned.userId });
});

module.exports = router;
