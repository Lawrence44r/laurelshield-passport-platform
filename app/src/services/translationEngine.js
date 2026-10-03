// Underwriting Requirements Graph + Market Readiness Translation
// (Section 5.6, 6.3, Stage 6, 12.11). This is Congruentshield's highest-value
// trade secret: cross-carrier mappings, minimum ECL thresholds, evidence
// freshness windows, and weighting.
//
// HARD RULE: translateForPartner() is the ONLY function that may be called
// from a customer-, broker-, or carrier-facing route. Its return value never
// includes weight, min_ecl, max_evidence_age_hours, source_classification,
// or confidential_notes - only the resulting classification the doc's
// Section 5.8 selective-disclosure principle calls for. Raw carrier_requirements
// rows must only ever be read by ls_admin-scoped routes (the graph-governance
// screens), never serialized into a partner- or customer-visible response.

function translateForPartner(db, { partnerId, scopeId }) {
  const requirements = db.prepare(`
    SELECT cr.*, c.code as control_code, c.title as control_title
    FROM carrier_requirements cr JOIN controls c ON c.id = cr.control_id
    WHERE cr.partner_id = ?
  `).all(partnerId);

  const claims = db.prepare(`SELECT * FROM assurance_claims WHERE scope_id = ?`).all(scopeId);
  const claimByControl = new Map(claims.map(c => [c.control_id, c]));
  const now = Date.now();

  let weightedEarned = 0, weightedTotal = 0;
  let materialGaps = 0, conditionalCount = 0, expiringSoonCount = 0;
  // Disclosure, not just an internal log (Agentic Automation Architecture,
  // Part VI item 2): a broker/carrier relying on a result has a legitimate
  // interest in knowing whether it came from a human assessor, a live
  // connector, or a simulated one -- never from carrier_requirements itself.
  const provenanceSummary = { human_verified: 0, connector_live: 0, connector_simulated: 0, no_evidence: 0 };

  const items = requirements.map(req => {
    const claim = claimByControl.get(req.control_id);
    const isFresh = !!(claim && claim.valid_until && new Date(claim.valid_until).getTime() > now);
    const meetsEcl = !!(claim && claim.ecl >= req.min_ecl);
    const isVerified = !!(claim && claim.status === 'verified' && !claim.revoked);

    let result;
    if (isVerified && meetsEcl && isFresh) result = 'Pass';
    else if (claim && claim.status === 'conditional' && meetsEcl) result = 'Conditional';
    else if (claim && !isFresh && ['verified', 'conditional'].includes(claim.status)) result = 'Evidence Expiring';
    else result = req.mandatory ? 'Material Gap' : 'Not Applicable';

    if (result === 'Pass') weightedEarned += req.weight;
    else if (result === 'Conditional') weightedEarned += req.weight * 0.5;
    if (result === 'Material Gap') materialGaps++;
    if (result === 'Conditional') conditionalCount++;
    if (result === 'Evidence Expiring') expiringSoonCount++;
    weightedTotal += req.weight;
    provenanceSummary[claim ? claim.provenance : 'no_evidence']++;

    return {
      requirement_label: req.requirement_label,
      control_code: req.control_code,
      control_title: req.control_title,
      result,
      evidence_note: claim ? `ECL-${claim.ecl}, ${Math.round(claim.coverage_pct)}% coverage` : 'No evidence on file',
      provenance: claim ? claim.provenance : 'no_evidence',
    };
  });

  const readinessScore = weightedTotal > 0 ? Math.round((weightedEarned / weightedTotal) * 100) : null;
  let overallStatus;
  if (materialGaps > 0) overallStatus = 'Material Gap';
  else if (expiringSoonCount > 0) overallStatus = 'Evidence Expiring';
  else if (conditionalCount > 0) overallStatus = 'Conditional';
  else overallStatus = 'Ready';

  return { overallStatus, readinessScore, items, materialGaps, conditionalCount, expiringSoonCount, provenanceSummary };
}

// ---- Carrier Requirements Graph governance (ls_admin only, Section 12.11) ----

function listRequirementsForPartner(db, partnerId) {
  return db.prepare(`
    SELECT cr.*, c.code as control_code, c.title as control_title
    FROM carrier_requirements cr JOIN controls c ON c.id = cr.control_id
    WHERE cr.partner_id = ? ORDER BY c.code
  `).all(partnerId);
}

function upsertRequirement(db, req) {
  const { partner_id, requirement_code, requirement_label, control_id, min_ecl, max_evidence_age_hours,
    mandatory, weight, industry_overlay, source_classification, review_date, confidential_notes } = req;
  return db.prepare(`
    INSERT INTO carrier_requirements
      (partner_id, requirement_code, requirement_label, control_id, min_ecl, max_evidence_age_hours,
       mandatory, weight, industry_overlay, source_classification, review_date, confidential_notes)
    VALUES (@partner_id, @requirement_code, @requirement_label, @control_id, @min_ecl, @max_evidence_age_hours,
       @mandatory, @weight, @industry_overlay, @source_classification, @review_date, @confidential_notes)
  `).run({ partner_id, requirement_code, requirement_label, control_id, min_ecl, max_evidence_age_hours,
    mandatory: mandatory ? 1 : 0, weight, industry_overlay: industry_overlay || null,
    source_classification, review_date: review_date || null, confidential_notes: confidential_notes || null });
}

module.exports = { translateForPartner, listRequirementsForPartner, upsertRequirement };
