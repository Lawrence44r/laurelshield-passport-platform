// Continuous assurance / evidence freshness (Stage 11, Section 5.9).
// Controls whose evidence has aged past its max_evidence_age_hours are
// automatically downgraded and flagged for re-verification - a passport
// must never present stale evidence as current.

function runFreshnessSweep(db, { actorLabel = 'system:freshness_engine', scopeId = null } = {}) {
  const stale = scopeId
    ? db.prepare(`
        SELECT ac.id as claim_id, ac.scope_id, ac.control_id, c.code, c.title
        FROM assurance_claims ac
        JOIN controls c ON c.id = ac.control_id
        WHERE ac.status IN ('verified','conditional') AND ac.revoked = 0
          AND ac.valid_until IS NOT NULL AND datetime(ac.valid_until) < datetime('now')
          AND ac.scope_id = ?
      `).all(scopeId)
    : db.prepare(`
        SELECT ac.id as claim_id, ac.scope_id, ac.control_id, c.code, c.title
        FROM assurance_claims ac
        JOIN controls c ON c.id = ac.control_id
        WHERE ac.status IN ('verified','conditional') AND ac.revoked = 0
          AND ac.valid_until IS NOT NULL AND datetime(ac.valid_until) < datetime('now')
      `).all();

  const expireClaim = db.prepare(`UPDATE assurance_claims SET status='expired', updated_at=datetime('now') WHERE id=?`);
  const findOpenRemediation = db.prepare(`SELECT id FROM remediation_items WHERE scope_id=? AND control_id=? AND status='open'`);
  const insertRemediation = db.prepare(`
    INSERT INTO remediation_items (scope_id, control_id, finding, owner, due_date, status)
    VALUES (?, ?, ?, 'customer', datetime('now','+7 days'), 'open')
  `);
  const logAccess = db.prepare(`
    INSERT INTO access_log (actor_label, action, resource_type, resource_id, details_json)
    VALUES (?, 'evidence_expired', 'control', ?, ?)
  `);

  const affected = [];
  for (const row of stale) {
    expireClaim.run(row.claim_id);
    if (!findOpenRemediation.get(row.scope_id, row.control_id)) {
      insertRemediation.run(row.scope_id, row.control_id, `Evidence for ${row.code} (${row.title}) has aged past its freshness threshold. Re-sync or re-verify required.`);
    }
    logAccess.run(actorLabel, row.code, JSON.stringify({ scope_id: row.scope_id, control_id: row.control_id }));
    affected.push(row.code);
  }
  return affected;
}

// Demo/testing helper only: backdates a scope's evidence and claims so the
// freshness sweep has something to act on without waiting in real time.
function simulateDrift(db, scopeId, hours) {
  db.prepare(`UPDATE evidence SET collected_at = datetime(collected_at, ?) WHERE scope_id = ?`)
    .run(`-${hours} hours`, scopeId);
  db.prepare(`UPDATE assurance_claims SET valid_from = datetime(valid_from, ?), valid_until = datetime(valid_until, ?) WHERE scope_id = ?`)
    .run(`-${hours} hours`, `-${hours} hours`, scopeId);
  db.prepare(`
    INSERT INTO access_log (actor_label, action, resource_type, resource_id, details_json)
    VALUES ('system:demo_drift_simulation', 'simulate_drift', 'scope', ?, ?)
  `).run(String(scopeId), JSON.stringify({ hours }));
}

module.exports = { runFreshnessSweep, simulateDrift };
