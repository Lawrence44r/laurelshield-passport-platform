// Shared organization/scope/customer_admin creation logic, used by both the
// self-serve signup route (routes/auth.js, browser-facing, public) and the
// internal provisioning endpoint (routes/internal.js, called by the
// marketing site's Stripe webhook after a successful Continuous Assurance
// subscription payment). Keeping this in one place means both paths create
// an identically-shaped organization -- there is exactly one way a new
// customer organization comes into existence in this system, regardless of
// which door it came in through.
const bcrypt = require('bcryptjs');
const auditLog = require('./auditLog');

function emailTaken(db, email) {
  return !!db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
}

function createOrgAndAdmin(db, { companyName, email, password, fullName, jurisdiction, actorLabel }) {
  if (!companyName || !email || !password) {
    throw Object.assign(new Error('company_name_email_and_password_required'), { code: 'invalid_input' });
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  if (emailTaken(db, normalizedEmail)) {
    throw Object.assign(new Error('email_already_registered'), { code: 'email_already_registered' });
  }

  const orgInfo = db.prepare(
    `INSERT INTO organizations (org_type, name, jurisdiction) VALUES ('customer', ?, ?)`
  ).run(companyName, jurisdiction || 'CA');
  const orgId = orgInfo.lastInsertRowid;

  // Same scope_code convention as the existing authenticated POST /scopes
  // route (routes/customer.js) -- one scope-creation convention, not two.
  const scopeCode = `LS-SCOPE-${String(Math.floor(100000 + Math.random() * 899999))}`;
  const scopeInfo = db.prepare(
    `INSERT INTO scopes (org_id, scope_code, name, description, status) VALUES (?, ?, ?, ?, 'draft')`
  ).run(orgId, scopeCode, `${companyName} - Primary Scope`, 'Created automatically at signup.');
  const scopeId = scopeInfo.lastInsertRowid;

  const passwordHash = bcrypt.hashSync(password, 10);
  const userInfo = db.prepare(
    `INSERT INTO users (org_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'customer_admin')`
  ).run(orgId, normalizedEmail, passwordHash, fullName || companyName);
  const userId = userInfo.lastInsertRowid;

  auditLog.log(db, {
    actorLabel: actorLabel || 'system:self_serve_signup',
    action: 'org_provisioned',
    resourceType: 'organization',
    resourceId: orgId,
    details: { companyName, scopeId, userId },
  });

  return { orgId, scopeId, userId, email: normalizedEmail };
}

module.exports = { createOrgAndAdmin, emailTaken };
