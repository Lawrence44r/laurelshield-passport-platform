// Claim Evidence Pack Workflow (Ops Guide Section 10). A claim event freezes
// an evidence window around an incident and seals a hash-chained, signed
// manifest of everything relevant - evidence objects, control state, and the
// supplier graph - so it can survive external scrutiny during a dispute.
// Reviewer approval is required before any release (Ops Guide: "Require
// reviewer approval before external release. Record recipient, purpose,
// time, file hash, and release channel").
const signing = require('./signing');
const auditLog = require('./auditLog');
const supplierGraph = require('./supplierGraph');

const DEFAULT_WINDOW_BEFORE_DAYS = 30;
const DEFAULT_WINDOW_AFTER_DAYS = 14;

function createClaim(db, { scopeId, policyReference, incidentDate, affectedBusinessProcess, affectedSystems, knownSuppliers, createdBy }) {
  const info = db.prepare(`
    INSERT INTO claims (scope_id, policy_reference, incident_date, affected_business_process, affected_systems, known_suppliers_json, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(scopeId, policyReference || null, incidentDate, affectedBusinessProcess || null, affectedSystems || null,
    JSON.stringify(knownSuppliers || []), createdBy || null);
  auditLog.log(db, { actorUserId: createdBy, action: 'claim_created', resourceType: 'claim', resourceId: info.lastInsertRowid, details: { scopeId, incidentDate } });
  return info.lastInsertRowid;
}

function generatePack(db, { claimId, actorUserId, windowStart, windowEnd }) {
  const claim = db.prepare('SELECT * FROM claims WHERE id=?').get(claimId);
  if (!claim) throw new Error('claim_not_found');

  const incident = new Date(claim.incident_date);
  const start = windowStart || new Date(incident.getTime() - DEFAULT_WINDOW_BEFORE_DAYS * 86400000).toISOString();
  const end = windowEnd || new Date(incident.getTime() + DEFAULT_WINDOW_AFTER_DAYS * 86400000).toISOString();

  const evidenceObjects = db.prepare(`
    SELECT id, source, connector_id, evidence_type, sha256_hash, collected_at FROM evidence
    WHERE scope_id = ? AND datetime(collected_at) BETWEEN datetime(?) AND datetime(?)
    ORDER BY collected_at
  `).all(claim.scope_id, start, end);

  const controlSnapshot = db.prepare(`
    SELECT c.code, c.title, ac.status, ac.ecl, ac.coverage_pct, ac.valid_from, ac.valid_until
    FROM assurance_claims ac JOIN controls c ON c.id = ac.control_id
    WHERE ac.scope_id = ? ORDER BY c.code
  `).all(claim.scope_id);

  const supplierSnapshot = supplierGraph.listSuppliersForScope(db, claim.scope_id)
    .map(s => ({ name: s.name, service: s.service, criticality: s.criticality, linkedControls: s.linkedControls.map(c => c.code) }));

  const previousPack = db.prepare('SELECT manifest_hash FROM claim_evidence_packs WHERE claim_id=? ORDER BY id DESC LIMIT 1').get(claimId);

  const manifest = {
    claimId,
    scopeId: claim.scope_id,
    incidentDate: claim.incident_date,
    windowStart: start,
    windowEnd: end,
    evidenceObjects,
    controlSnapshot,
    supplierSnapshot,
    previousManifestHash: previousPack ? previousPack.manifest_hash : null,
    sealedAt: new Date().toISOString(),
  };
  const manifestHash = signing.sha256(manifest);
  const signature = signing.sign({ claimId, manifestHash, sealedAt: manifest.sealedAt });

  const info = db.prepare(`
    INSERT INTO claim_evidence_packs (claim_id, window_start, window_end, manifest_json, manifest_hash, signature, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending_approval')
  `).run(claimId, start, end, JSON.stringify(manifest), manifestHash, signature);

  db.prepare(`UPDATE claims SET status='pack_generated' WHERE id=?`).run(claimId);
  auditLog.log(db, { actorUserId, action: 'claim_evidence_pack_sealed', resourceType: 'claim_evidence_pack', resourceId: info.lastInsertRowid, details: { manifestHash, evidenceCount: evidenceObjects.length } });
  return info.lastInsertRowid;
}

function approvePack(db, { packId, actorUserId }) {
  const pack = db.prepare('SELECT * FROM claim_evidence_packs WHERE id=?').get(packId);
  if (!pack) throw new Error('pack_not_found');
  if (pack.status !== 'pending_approval') throw new Error('pack_not_pending_approval');
  db.prepare(`UPDATE claim_evidence_packs SET status='approved', approved_by=?, approved_at=datetime('now') WHERE id=?`).run(actorUserId, packId);
  db.prepare(`UPDATE claims SET status='approved' WHERE id=?`).run(pack.claim_id);
  auditLog.log(db, { actorUserId, action: 'claim_evidence_pack_approved', resourceType: 'claim_evidence_pack', resourceId: packId });
}

function releasePack(db, { packId, partnerId, purpose, actorUserId }) {
  const pack = db.prepare('SELECT * FROM claim_evidence_packs WHERE id=?').get(packId);
  if (!pack) throw new Error('pack_not_found');
  if (pack.status !== 'approved') throw new Error('pack_not_approved');
  db.prepare(`
    UPDATE claim_evidence_packs SET status='released', released_to_partner_id=?, release_purpose=?, released_at=datetime('now') WHERE id=?
  `).run(partnerId, purpose || 'claim review', packId);
  db.prepare(`UPDATE claims SET status='released' WHERE id=?`).run(pack.claim_id);
  auditLog.log(db, { actorUserId, action: 'claim_evidence_pack_released', resourceType: 'claim_evidence_pack', resourceId: packId, details: { partnerId, purpose, manifestHash: pack.manifest_hash, channel: 'carrier_console' } });
}

module.exports = { createClaim, generatePack, approvePack, releasePack };
