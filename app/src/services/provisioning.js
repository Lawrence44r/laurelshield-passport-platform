// Shared organization/scope/customer_admin creation logic, used by both the
// self-serve signup route (routes/auth.js, browser-facing, public) and the
// internal provisioning endpoint (routes/internal.js, called by the
// marketing site's Stripe webhook after a successful Continuous Assurance
// subscription payment). Keeping this in one place means both paths create
// an identically-shaped organization, with identical validation -- there is
// exactly one way a new customer organization comes into existence in this
// system, and exactly one place that decides whether the input is good
// enough, regardless of which door it came in through.
//
// This is now the primary, unguarded entry point for creating accounts on a
// public, internet-reachable instance (demo seed data is deliberately not
// auto-created -- see src/db/seed.js's own guard and server.js's boot
// sequence), so the validation here is deliberately stricter than a typical
// internal admin tool would need.
const bcrypt = require('bcryptjs');
const auditLog = require('./auditLog');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;
const MAX_NAME_LENGTH = 200;

// A handful of passwords that would trivially defeat the length check above
// but are still guessable on sight -- notably including this project's own
// public demo password, since that string is visible in the public GitHub
// repo and would otherwise be a plausible first guess against a real account.
const WEAK_PASSWORDS = new Set([
  'passport#2026', 'passport2026', 'password12345', 'password123456',
  'qwertyuiop123', 'congruentshield123', 'changeme123456',
]);

function emailTaken(db, email) {
  return !!db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
}

// Strips control characters and the two characters ('<', '>') that would
// let a stored value form an HTML tag if it's ever interpolated into the
// frontend without escaping -- which, as of this writing, several of the
// frontend apps' innerHTML-based render functions do for other fields.
// This is a targeted mitigation for this one new input path, not a fix for
// that broader, pre-existing pattern.
function sanitizeName(value, fallback) {
  return String(value || fallback || '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

function validateInput({ companyName, email, password }) {
  if (!companyName || !email || !password) return 'company_name_email_and_password_required';
  if (!EMAIL_RE.test(String(email))) return 'invalid_email';
  if (String(password).length < MIN_PASSWORD_LENGTH) return 'password_too_short';
  if (WEAK_PASSWORDS.has(String(password).toLowerCase())) return 'password_too_common';
  return null;
}

function createOrgAndAdmin(db, { companyName, email, password, fullName, jurisdiction, actorLabel, requestMeta }) {
  const validationError = validateInput({ companyName, email, password });
  if (validationError) {
    throw Object.assign(new Error(validationError), { code: validationError });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  if (emailTaken(db, normalizedEmail)) {
    throw Object.assign(new Error('email_already_registered'), { code: 'email_already_registered' });
  }

  const safeCompanyName = sanitizeName(companyName);
  const safeFullName = sanitizeName(fullName, safeCompanyName);
  if (!safeCompanyName) {
    throw Object.assign(new Error('company_name_email_and_password_required'), { code: 'company_name_email_and_password_required' });
  }

  const orgInfo = db.prepare(
    `INSERT INTO organizations (org_type, name, jurisdiction) VALUES ('customer', ?, ?)`
  ).run(safeCompanyName, jurisdiction || 'CA');
  const orgId = orgInfo.lastInsertRowid;

  // Same scope_code convention as the existing authenticated POST /scopes
  // route (routes/customer.js) -- one scope-creation convention, not two.
  const scopeCode = `LS-SCOPE-${String(Math.floor(100000 + Math.random() * 899999))}`;
  const scopeInfo = db.prepare(
    `INSERT INTO scopes (org_id, scope_code, name, description, status) VALUES (?, ?, ?, ?, 'draft')`
  ).run(orgId, scopeCode, `${safeCompanyName} - Primary Scope`, 'Created automatically at signup.');
  const scopeId = scopeInfo.lastInsertRowid;

  const passwordHash = bcrypt.hashSync(password, 10);
  const userInfo = db.prepare(
    `INSERT INTO users (org_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'customer_admin')`
  ).run(orgId, normalizedEmail, passwordHash, safeFullName);
  const userId = userInfo.lastInsertRowid;

  auditLog.log(db, {
    actorLabel: actorLabel || 'system:self_serve_signup',
    action: 'org_provisioned',
    resourceType: 'organization',
    resourceId: orgId,
    details: { companyName: safeCompanyName, scopeId, userId, ...(requestMeta || {}) },
  });

  return { orgId, scopeId, userId, email: normalizedEmail };
}

module.exports = { createOrgAndAdmin, emailTaken };
