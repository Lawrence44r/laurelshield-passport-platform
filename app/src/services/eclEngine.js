// Evidence Confidence Level engine (Section 5.4). ECL-0..5 is part of the
// published assurance standard, not a trade secret - the standard's value
// comes from disciplined, independent application, not from secrecy.
const signing = require('./signing');
const { evaluate } = require('./connectorProfiles');

const BASE_ECL_BY_EVIDENCE_TYPE = {
  self_attestation: 0,
  document: 1,
  interview_note: 2,
  api_export: 3,
  test_result: 4,
};

function baseEclForEvidenceType(evidenceType) {
  return BASE_ECL_BY_EVIDENCE_TYPE[evidenceType] ?? 0;
}

// Continuous verification (ECL-5) requires a dynamic control with a
// track record of repeated automated validation, not a single snapshot.
function eclForEvidence(evidenceType, syncCount) {
  const base = baseEclForEvidenceType(evidenceType);
  if (evidenceType === 'api_export' && syncCount >= 3) return 5;
  return base;
}

function statusFromResult({ effective, coverage_pct, severity }) {
  if (effective && coverage_pct >= 95) return 'verified';
  if (coverage_pct > 0) {
    const isHighRisk = severity === 'high' || severity === 'critical';
    return isHighRisk && coverage_pct < 80 ? 'material_gap' : 'conditional';
  }
  return 'material_gap';
}

/**
 * Run (or re-run) a connector sync: evaluates every control mapped to this
 * connector, records evidence with chain-of-custody metadata, and upserts
 * the resulting assurance claim. By default evaluates the simulated posture
 * in connector.config_json; if `liveEvaluations` is supplied (control code ->
 * {coverage_pct, effective, note}, e.g. from a real Microsoft Graph fetch),
 * those results are used instead - the rest of the pipeline (hashing,
 * ECL/status computation, claim signing, remediation triggers) is identical
 * regardless of whether the evidence came from a live API or the simulator.
 */
function syncConnector(db, { connector, controls, actorUserId, liveEvaluations = null }) {
  const config = JSON.parse(connector.config_json);
  const syncCount = (config._sync_count || 0) + 1;
  config._sync_count = syncCount;

  const now = new Date();
  const results = [];

  const insertEvidence = db.prepare(`
    INSERT INTO evidence (scope_id, connector_id, source, collector, evidence_type, summary_json, sha256_hash, classification)
    VALUES (?, ?, ?, ?, 'api_export', ?, ?, 'restricted_security_evidence')
  `);
  const mapEvidence = db.prepare(`INSERT INTO evidence_control_map (evidence_id, control_id) VALUES (?, ?)`);
  const insertVerification = db.prepare(`
    INSERT INTO verifications (scope_id, control_id, verifier_user_id, ecl, coverage_pct, effectiveness, exceptions_json, procedure_version, decision_officer_id, decision_status, decision_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, '1.0', NULL, 'approved', datetime('now'))
  `);
  const upsertClaim = db.prepare(`
    INSERT INTO assurance_claims (scope_id, control_id, verification_id, status, ecl, coverage_pct, valid_from, valid_until, signature, provenance, revoked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(scope_id, control_id) DO UPDATE SET
      verification_id=excluded.verification_id, status=excluded.status, ecl=excluded.ecl,
      coverage_pct=excluded.coverage_pct, valid_from=excluded.valid_from, valid_until=excluded.valid_until,
      signature=excluded.signature, provenance=excluded.provenance, revoked=0, revoked_at=NULL, revoked_reason=NULL, updated_at=datetime('now')
  `);
  const findOpenRemediation = db.prepare(`SELECT id FROM remediation_items WHERE scope_id=? AND control_id=? AND status='open'`);
  const insertRemediation = db.prepare(`
    INSERT INTO remediation_items (scope_id, control_id, finding, owner, due_date, status)
    VALUES (?, ?, ?, 'customer', ?, 'open')
  `);
  const closeRemediationIfResolved = db.prepare(`
    UPDATE remediation_items SET status='closed', closed_at=datetime('now') WHERE scope_id=? AND control_id=? AND status='open'
  `);
  const logAccess = db.prepare(`
    INSERT INTO access_log (actor_user_id, actor_label, action, resource_type, resource_id, details_json)
    VALUES (?, ?, 'connector_sync', 'control', ?, ?)
  `);

  const evidenceSource = liveEvaluations ? `${connector.connector_type}:live_microsoft_graph` : connector.connector_type;
  const provenance = liveEvaluations ? 'connector_live' : 'connector_simulated';

  for (const control of controls) {
    const evalResult = liveEvaluations ? liveEvaluations[control.code] : evaluate(control.code, config);
    if (!evalResult) continue;
    const { coverage_pct, effective, note } = evalResult;
    const ecl = eclForEvidence('api_export', syncCount);
    const hash = signing.sha256({ control: control.code, coverage_pct, effective, syncCount, at: now.toISOString() });

    const evId = insertEvidence.run(
      connector.scope_id, connector.id, evidenceSource, actorUserId ? `user:${actorUserId}` : 'system:connector_sync',
      JSON.stringify({ control: control.code, coverage_pct, effective, note, sync_count: syncCount }), hash
    ).lastInsertRowid;
    mapEvidence.run(evId, control.id);

    const status = statusFromResult({ effective, coverage_pct, severity: control.severity });
    const verId = insertVerification.run(
      connector.scope_id, control.id, actorUserId || null, ecl, coverage_pct,
      effective ? 'effective' : (coverage_pct > 0 ? 'partial' : 'ineffective'),
      JSON.stringify(effective ? [] : [note])
    ).lastInsertRowid;

    const validFrom = now.toISOString();
    const validUntil = new Date(now.getTime() + control.max_evidence_age_hours * 3600 * 1000).toISOString();
    const claimPayload = { scope_id: connector.scope_id, control: control.code, status, ecl, coverage_pct, valid_from: validFrom, valid_until: validUntil };
    const signature = signing.sign(claimPayload);

    upsertClaim.run(connector.scope_id, control.id, verId, status, ecl, coverage_pct, validFrom, validUntil, signature, provenance);

    if (status === 'verified') {
      closeRemediationIfResolved.run(connector.scope_id, control.id);
    } else if (!findOpenRemediation.get(connector.scope_id, control.id)) {
      const due = new Date(now.getTime() + 14 * 24 * 3600 * 1000).toISOString();
      insertRemediation.run(connector.scope_id, control.id, note, due);
    }

    logAccess.run(actorUserId || null, actorUserId ? null : 'system:connector_sync', control.code, JSON.stringify({ status, ecl, coverage_pct }));
    results.push({ control: control.code, status, ecl, coverage_pct });
  }

  db.prepare(`UPDATE connectors SET status='connected', config_json=?, last_sync_at=datetime('now') WHERE id=?`)
    .run(JSON.stringify(config), connector.id);

  return results;
}

/**
 * Records an operational-test result (restore test, tabletop exercise) as
 * ECL-4 evidence - Section 5.4's "operationally tested" tier.
 */
function recordOperationalTest(db, { scopeId, controls, actorUserId, testType, passed, notes }) {
  const now = new Date();
  const insertEvidence = db.prepare(`
    INSERT INTO evidence (scope_id, connector_id, source, collector, evidence_type, summary_json, sha256_hash, classification)
    VALUES (?, NULL, ?, ?, 'test_result', ?, ?, 'restricted_security_evidence')
  `);
  const mapEvidence = db.prepare(`INSERT INTO evidence_control_map (evidence_id, control_id) VALUES (?, ?)`);
  const insertVerification = db.prepare(`
    INSERT INTO verifications (scope_id, control_id, verifier_user_id, ecl, coverage_pct, effectiveness, exceptions_json, procedure_version, decision_status, decision_date)
    VALUES (?, ?, ?, 4, ?, ?, ?, '1.0', 'approved', datetime('now'))
  `);
  const upsertClaim = db.prepare(`
    INSERT INTO assurance_claims (scope_id, control_id, verification_id, status, ecl, coverage_pct, valid_from, valid_until, signature, provenance, revoked)
    VALUES (?, ?, ?, ?, 4, ?, ?, ?, ?, 'human_verified', 0)
    ON CONFLICT(scope_id, control_id) DO UPDATE SET
      verification_id=excluded.verification_id, status=excluded.status, ecl=4,
      coverage_pct=excluded.coverage_pct, valid_from=excluded.valid_from, valid_until=excluded.valid_until,
      signature=excluded.signature, provenance='human_verified', revoked=0, revoked_at=NULL, revoked_reason=NULL, updated_at=datetime('now')
  `);

  const results = [];
  for (const control of controls) {
    const coverage = passed ? 100 : 40;
    const hash = signing.sha256({ control: control.code, testType, passed, at: now.toISOString() });
    const evId = insertEvidence.run(scopeId, testType, actorUserId ? `user:${actorUserId}` : 'system',
      JSON.stringify({ control: control.code, testType, passed, notes }), hash).lastInsertRowid;
    mapEvidence.run(evId, control.id);
    const status = passed ? 'verified' : 'material_gap';
    const verId = insertVerification.run(scopeId, control.id, actorUserId || null, coverage,
      passed ? 'effective' : 'ineffective', JSON.stringify(passed ? [] : [notes || 'operational test failed'])).lastInsertRowid;
    const validFrom = now.toISOString();
    const validUntil = new Date(now.getTime() + control.max_evidence_age_hours * 3600 * 1000).toISOString();
    const signature = signing.sign({ scope_id: scopeId, control: control.code, status, ecl: 4, coverage_pct: coverage, valid_from: validFrom, valid_until: validUntil });
    upsertClaim.run(scopeId, control.id, verId, status, coverage, validFrom, validUntil, signature);
    results.push({ control: control.code, status, ecl: 4, coverage_pct: coverage });
  }
  return results;
}

module.exports = { baseEclForEvidenceType, eclForEvidence, statusFromResult, syncConnector, recordOperationalTest };
