const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'authentication_required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'authentication_required' });
  }
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

// Tenant isolation: for customer_admin, resolves and enforces that the
// requested scope belongs to the caller's own organization. Never trust a
// client-supplied org_id for authorization decisions - always derive it
// from the authenticated session (Section 12.9: "never rely only on
// UI-level filtering").
function loadOwnedScope(paramName = 'scopeId') {
  return (req, res, next) => {
    const scopeId = Number(req.params[paramName]);
    if (!scopeId) return res.status(400).json({ error: 'invalid_scope_id' });
    const scope = db.prepare('SELECT * FROM scopes WHERE id = ?').get(scopeId);
    if (!scope) return res.status(404).json({ error: 'scope_not_found' });

    if (req.user.role === 'customer_admin' && scope.org_id !== req.user.org_id) {
      return res.status(403).json({ error: 'forbidden' });
    }
    req.scope = scope;
    next();
  };
}

module.exports = { requireAuth, requireRole, loadOwnedScope };
