// Supplier dependency graph (Congruentshield Suite build guide Sections 10-11;
// Ops Guide Section 8). Suppliers are scoped to an insured's assurance
// boundary and linked to the canonical controls/clauses they affect, so a
// supplier incident can be traced to every downstream insured and control.
// Unlike the carrier requirements graph, supplier records are not a trade
// secret - they are the insured's own third-party inventory - so this
// service has no translation/redaction boundary.

const CRITICALITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

function createSupplier(db, scopeId, s) {
  const info = db.prepare(`
    INSERT INTO suppliers (scope_id, name, service, business_process, data_touched, region, contract_owner, recovery_dependency, alternative_provider, criticality)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(scopeId, s.name, s.service, s.businessProcess || null, s.dataTouched || null, s.region || null,
    s.contractOwner || null, s.recoveryDependency || null, s.alternativeProvider || null, s.criticality || 'medium');
  return info.lastInsertRowid;
}

function linkControl(db, supplierId, controlId) {
  db.prepare(`INSERT OR IGNORE INTO supplier_control_links (supplier_id, control_id) VALUES (?, ?)`).run(supplierId, controlId);
}

function listSuppliersForScope(db, scopeId) {
  const suppliers = db.prepare('SELECT * FROM suppliers WHERE scope_id = ? ORDER BY criticality, name').all(scopeId);
  const linkStmt = db.prepare(`
    SELECT c.code, c.title FROM supplier_control_links scl JOIN controls c ON c.id = scl.control_id
    WHERE scl.supplier_id = ? ORDER BY c.code
  `);
  return suppliers.map(sup => ({ ...sup, linkedControls: linkStmt.all(sup.id) }));
}

// Portfolio-wide concentration analysis: which suppliers serve more than one
// insured, and how critical is that dependency (Ops Guide Section 8: "Flag
// concentration risk when multiple insureds depend on the same supplier").
// `scopeIds`, if provided, restricts the analysis to a specific set of scopes
// - used by the carrier-facing route to enforce the same sharing-grant
// boundary as passport access (never show a carrier suppliers tied to an
// insured that hasn't shared a passport with them).
function concentrationReport(db, { scopeIds } = {}) {
  let rows;
  if (scopeIds) {
    if (!scopeIds.length) return [];
    const placeholders = scopeIds.map(() => '?').join(',');
    rows = db.prepare(`
      SELECT s.*, o.name as org_name, sc.scope_code
      FROM suppliers s JOIN scopes sc ON sc.id = s.scope_id JOIN organizations o ON o.id = sc.org_id
      WHERE s.scope_id IN (${placeholders})
    `).all(...scopeIds);
  } else {
    rows = db.prepare(`
      SELECT s.*, o.name as org_name, sc.scope_code
      FROM suppliers s JOIN scopes sc ON sc.id = s.scope_id JOIN organizations o ON o.id = sc.org_id
    `).all();
  }

  const byName = new Map();
  for (const r of rows) {
    const key = r.name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, { supplierName: r.name, insureds: [], highestCriticality: r.criticality });
    const group = byName.get(key);
    group.insureds.push({ orgName: r.org_name, scopeCode: r.scope_code, service: r.service, criticality: r.criticality });
    if (CRITICALITY_RANK[r.criticality] > CRITICALITY_RANK[group.highestCriticality]) group.highestCriticality = r.criticality;
  }

  return [...byName.values()]
    .map(g => ({ ...g, insuredCount: new Set(g.insureds.map(i => i.orgName)).size, concentrationFlag: new Set(g.insureds.map(i => i.orgName)).size > 1 }))
    .sort((a, b) => b.insuredCount - a.insuredCount || CRITICALITY_RANK[b.highestCriticality] - CRITICALITY_RANK[a.highestCriticality]);
}

module.exports = { createSupplier, linkControl, listSuppliersForScope, concentrationReport };
