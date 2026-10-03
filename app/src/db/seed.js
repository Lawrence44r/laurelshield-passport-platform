require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./index');
const signing = require('../services/signing');
const eclEngine = require('../services/eclEngine');
const mappingEngine = require('../services/mappingEngine');
const { defaultConfigFor } = require('../services/connectorProfiles');
const { upsertRequirement } = require('../services/translationEngine');
const supplierGraph = require('../services/supplierGraph');
const claimEvidenceEngine = require('../services/claimEvidenceEngine');

const DEMO_PASSWORD = 'Passport#2026';

function alreadySeeded() {
  return db.prepare('SELECT COUNT(*) n FROM users').get().n > 0;
}

// ---------------------------------------------------------------- controls
const CONTROLS = [
  // Identity & Access
  ['LS-ID-101', 'Identity & Access', 'Privileged Authentication MFA', 'Privileged authentication is protected by approved strong MFA across all in-scope administrative access paths.', 'Review Conditional Access / privileged role policy and authentication telemetry for 100% enforcement.', 'critical', 3, 24],
  ['LS-ID-102', 'Identity & Access', 'Remote-Access MFA', 'Remote access to the corporate network or business applications requires MFA.', 'Review remote-access gateway/VPN/SSO authentication policy and telemetry.', 'critical', 3, 24],
  ['LS-ID-103', 'Identity & Access', 'Privileged Role Separation', 'Legacy authentication protocols are disabled and privileged roles are separated from standard user accounts.', 'Review identity provider legacy-auth and privileged role assignment configuration.', 'high', 3, 720],
  ['LS-ID-104', 'Identity & Access', 'Dormant Account Governance', 'Dormant and orphaned privileged accounts are identified and disabled on a defined cadence.', 'Review privileged account last-activity report.', 'medium', 3, 720],
  // Endpoint
  ['LS-EDR-201', 'Endpoint', 'EDR Coverage', 'Endpoint detection and response is deployed across all in-scope endpoints.', 'Reconcile EDR sensor population against endpoint inventory.', 'critical', 3, 24],
  ['LS-EDR-202', 'Endpoint', 'EDR Tamper Protection', 'Tamper protection is enabled and enforced on all deployed EDR sensors.', 'Review EDR policy configuration for tamper-protection enforcement.', 'high', 3, 24],
  ['LS-EDR-203', 'Endpoint', 'Endpoint Inventory Completeness', 'A complete, reconciled endpoint inventory exists for the assurance boundary.', 'Compare asset management, DHCP/AD, and EDR sensor inventories.', 'medium', 3, 720],
  ['LS-EDR-204', 'Endpoint', 'Unsupported OS Elimination', 'No in-scope endpoint runs an operating system past vendor end-of-support.', 'Review OS version inventory against vendor support lifecycle data.', 'high', 3, 720],
  // Backup & Recovery
  ['LS-BCP-301', 'Backup & Recovery', 'Immutable/Offline Backup Copy', 'At least one backup copy of critical systems is immutable or logically/physically offline.', 'Review backup platform immutability/air-gap configuration.', 'critical', 3, 24],
  ['LS-BCP-302', 'Backup & Recovery', 'Backup Credential Separation', 'Backup infrastructure credentials are separated from production identity and privileged access paths.', 'Review backup platform authentication and privileged access model.', 'high', 3, 24],
  ['LS-BCP-303', 'Backup & Recovery', 'Critical System Backup Coverage', 'All systems classified as critical are included in a backup job with a defined RPO.', 'Reconcile backup job coverage against the critical asset register.', 'critical', 3, 24],
  ['LS-BCP-304', 'Backup & Recovery', 'Restore Test Evidence', 'A full or sample restore test has been performed and evidenced within the required freshness window.', 'Review restore test plan, execution log, and validation evidence.', 'high', 4, 2160],
  // Logging / Detection / Response
  ['LS-IR-401', 'Logging, Detection & Response', 'Incident Response Tabletop Exercise', 'An incident response tabletop or simulation exercise has been conducted within the required freshness window.', 'Review exercise plan, participant list, findings, and after-action report.', 'high', 4, 8760],
  ['LS-IR-402', 'Logging, Detection & Response', 'Critical Log Source Coverage', 'Critical log sources (identity, endpoint, network egress, cloud control plane) are collected and retained.', 'Review SIEM/log platform source coverage against the critical log-source list.', 'high', 3, 720],
  ['LS-IR-403', 'Logging, Detection & Response', 'SOC Escalation Workflow', 'A documented and operating escalation workflow exists from detection to response ownership, with SLA adherence.', 'Review escalation runbook and recent alert-handling SLA metrics.', 'medium', 3, 720],
  ['LS-IR-404', 'Logging, Detection & Response', 'Forensic Readiness', 'The organization can preserve and produce forensic evidence (images, logs, memory) on demand.', 'Review forensic readiness procedure and evidence-preservation test.', 'medium', 4, 8760],
  // Vulnerability & Patch
  ['LS-VULN-501', 'Vulnerability & Patch', 'Authenticated Vulnerability Scanning', 'Authenticated vulnerability scanning is performed across in-scope internal assets on a defined cadence.', 'Review scan schedule, authentication configuration, and most recent scan report.', 'high', 3, 720],
  ['LS-VULN-502', 'Vulnerability & Patch', 'Critical Remediation SLA', 'Critical vulnerabilities are remediated within a defined SLA.', 'Review vulnerability remediation tracking and SLA adherence report.', 'critical', 3, 168],
  ['LS-VULN-503', 'Vulnerability & Patch', 'External Attack Surface Exposure', 'No critical management or remote-access services are exposed to the public internet without compensating controls.', 'Run external attack-surface scan and review exposed-service inventory.', 'critical', 3, 72],
  ['LS-VULN-504', 'Vulnerability & Patch', 'Patch Cadence Governance', 'Operating system and application patches are applied within a defined cadence with documented exception handling.', 'Review patch management policy and median patch-age report.', 'medium', 3, 720],
  // Network & Remote Access
  ['LS-NET-601', 'Network & Remote Access', 'Network Segmentation', 'Critical systems and OT/IT boundaries are segmented to limit lateral movement.', 'Review network architecture diagram and segmentation/firewall rule review.', 'high', 2, 8760],
  ['LS-NET-602', 'Network & Remote Access', 'Secure Remote Access Gateway', 'All remote access traverses an approved, monitored gateway rather than direct exposed services.', 'Review remote-access architecture and gateway configuration.', 'high', 2, 8760],
  ['LS-NET-603', 'Network & Remote Access', 'Firewall Policy Hygiene', 'Firewall rule sets are reviewed on a defined cadence and free of unjustified any-any rules.', 'Review firewall rule-base audit and change-management history.', 'medium', 2, 8760],
  ['LS-NET-604', 'Network & Remote Access', 'Management Plane Isolation', 'Administrative/management interfaces are isolated from general network access.', 'Review network segmentation and external scan results for exposed management interfaces.', 'high', 3, 72],
  // Email & Collaboration
  ['LS-EML-701', 'Email & Collaboration', 'DMARC Enforcement', 'DMARC is published and enforced at reject or quarantine policy for all sending domains.', 'Query DNS DMARC record and review aggregate/forensic report configuration.', 'high', 3, 720],
  ['LS-EML-702', 'Email & Collaboration', 'SPF/DKIM Alignment', 'SPF and DKIM are published and aligned for all sending domains.', 'Query DNS SPF/DKIM records and validate alignment with DMARC.', 'medium', 3, 720],
  ['LS-EML-703', 'Email & Collaboration', 'Anti-Phishing Controls', 'Anti-phishing and malicious-link/attachment controls are deployed on the email platform.', 'Review email security platform configuration and detection statistics.', 'high', 3, 720],
  ['LS-EML-704', 'Email & Collaboration', 'Mail Forwarding Rule Monitoring', 'Automatic external mail-forwarding rules are monitored and require approval.', 'Review mailbox rule audit configuration and recent alerts.', 'medium', 3, 720],
  // Cloud
  ['LS-CLD-801', 'Cloud', 'Cloud IAM Least Privilege', 'Cloud identity and access management follows least-privilege principles with no unused owner/admin roles.', 'Review cloud IAM policy assignments and unused-permission report.', 'high', 3, 720],
  ['LS-CLD-802', 'Cloud', 'Public Exposure Governance', 'Cloud storage and compute resources are not publicly exposed except by documented exception.', 'Review cloud security posture management findings for public exposure.', 'medium', 3, 720],
  ['LS-CLD-803', 'Cloud', 'Cloud Logging Coverage', 'Cloud control-plane and data-plane logging is enabled and centrally retained.', 'Review cloud audit log configuration and retention policy.', 'high', 3, 720],
  ['LS-CLD-804', 'Cloud', 'Encryption/Key Management Controls', 'Data at rest is encrypted using managed keys with documented rotation and access control.', 'Review key-management service configuration and access policy.', 'high', 3, 720],
  // Data Security
  ['LS-DATA-901', 'Data Security', 'Data Inventory & Classification', 'A data inventory exists identifying sensitive/regulated data classes and their storage locations.', 'Review data inventory/classification register.', 'medium', 1, 8760],
  ['LS-DATA-902', 'Data Security', 'Encryption at Rest/Transit', 'Sensitive data is encrypted at rest and in transit using approved algorithms.', 'Review encryption standard and sample configuration evidence.', 'high', 1, 8760],
  ['LS-DATA-903', 'Data Security', 'Privileged Data Access Governance', 'Access to sensitive data repositories is restricted and periodically reviewed.', 'Review access review records for sensitive data repositories.', 'high', 2, 8760],
  ['LS-DATA-904', 'Data Security', 'Egress/DLP Controls', 'Data loss prevention or egress monitoring controls are deployed for sensitive data classes.', 'Review DLP policy configuration and recent alert handling.', 'medium', 2, 8760],
  // Governance
  ['LS-GOV-1001', 'Governance', 'Security Ownership & Accountability', 'A named individual or function holds accountable ownership for the security program.', 'Review organization chart and security governance charter.', 'medium', 1, 8760],
  ['LS-GOV-1002', 'Governance', 'Policy Approval & Review', 'Core security policies are approved by management and reviewed on a defined cadence.', 'Review policy register with approval dates and review cycle.', 'medium', 1, 8760],
  ['LS-GOV-1003', 'Governance', 'Security Awareness Training', 'All personnel complete security awareness training on a defined cadence, including phishing simulation.', 'Review training completion records and phishing simulation results.', 'medium', 2, 8760],
  ['LS-GOV-1004', 'Governance', 'Vendor/Third-Party Risk Management', 'Third parties with access to in-scope systems or data are assessed and monitored for security risk.', 'Review vendor risk register and assessment records for critical vendors.', 'medium', 1, 8760],
];

function seedControls() {
  const insert = db.prepare(`
    INSERT INTO controls (code, domain, title, objective, test_procedure, severity, default_min_ecl, max_evidence_age_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((rows) => { for (const r of rows) insert.run(...r); });
  tx(CONTROLS);
}

// -------------------------------------------------------------- org/users
function seedOrgsAndUsers() {
  const insertOrg = db.prepare(`INSERT INTO organizations (org_type, name, industry, jurisdiction, relationship_level) VALUES (?, ?, ?, ?, ?)`);
  const abc = insertOrg.run('customer', 'ABC Manufacturing Ltd.', 'Manufacturing', 'CA-ON', 0).lastInsertRowid;
  const meridian = insertOrg.run('customer', 'Meridian Health Clinics Inc.', 'Healthcare', 'CA-BC', 0).lastInsertRowid;
  const granitePeak = insertOrg.run('broker', 'Granite Peak Insurance Brokers', 'Insurance Brokerage', 'CA-ON', 2).lastInsertRowid;
  const northstar = insertOrg.run('carrier', 'Northstar Assurance Co.', 'Cyber Insurance Carrier', 'CA-ON', 3).lastInsertRowid;
  const continental = insertOrg.run('carrier', 'Continental Underwriters Ltd.', 'Cyber Insurance Carrier / MGA', 'US-NY', 2).lastInsertRowid;

  const insertPartner = db.prepare(`INSERT INTO partners (org_id, partner_type, maturity_level) VALUES (?, ?, ?)`);
  const brokerPartnerId = insertPartner.run(granitePeak, 'broker', 2).lastInsertRowid;
  const northstarPartnerId = insertPartner.run(northstar, 'carrier', 3).lastInsertRowid;
  const continentalPartnerId = insertPartner.run(continental, 'carrier', 2).lastInsertRowid;

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const insertUser = db.prepare(`INSERT INTO users (org_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`);
  insertUser.run(null, 'admin@congruentshield.internal', hash, 'Priya Nandakumar (Scheme Manager / Admin)', 'ls_admin');
  insertUser.run(null, 'assessor@congruentshield.internal', hash, 'Marcus Alonzo (Technical Assessor)', 'ls_assessor');
  insertUser.run(null, 'decisions@congruentshield.internal', hash, 'Dr. Elena Vasquez (Assurance Decision Officer)', 'ls_decision_officer');
  insertUser.run(abc, 'admin@abcmanufacturing.example', hash, 'Grace Thompson (CISO)', 'customer_admin');
  insertUser.run(meridian, 'admin@meridianhealth.example', hash, 'Daniel Osei (IT Director)', 'customer_admin');
  insertUser.run(granitePeak, 'broker@granitepeak.example', hash, 'Sofia Marchetti (Cyber Broker)', 'broker');
  insertUser.run(northstar, 'underwriter@northstar.example', hash, 'James Whitfield (Cyber Underwriter)', 'carrier');
  insertUser.run(continental, 'underwriter@continental.example', hash, 'Aisha Rahman (Underwriting Manager)', 'carrier');

  return { abc, meridian, brokerPartnerId, northstarPartnerId, continentalPartnerId };
}

// ---------------------------------------------------------------- scopes
function seedScopes(abcOrgId, meridianOrgId) {
  const insertScope = db.prepare(`INSERT INTO scopes (org_id, scope_code, name, description, status) VALUES (?, ?, ?, ?, ?)`);
  const abcScopeId = insertScope.run(abcOrgId, 'LS-SCOPE-000184', 'ABC Manufacturing (Canadian Operating Entity)', 'Corporate network, ERP application, 3 manufacturing sites, Azure tenant.', 'approved').lastInsertRowid;
  const meridianScopeId = insertScope.run(meridianOrgId, 'LS-SCOPE-000209', 'Meridian Health Clinics (BC Operating Entity)', 'Clinical network, EHR application, 6 clinic locations, AWS tenant.', 'draft').lastInsertRowid;

  db.prepare(`INSERT INTO assets (scope_id, asset_type, name, criticality, environment, data_classification) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(abcScopeId, 'application', 'ERP - Manufacturing Operations', 'critical', 'production', 'confidential');
  db.prepare(`INSERT INTO assets (scope_id, asset_type, name, criticality, environment, data_classification) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(abcScopeId, 'cloud_subscription', 'Azure Production Tenant', 'critical', 'production', 'confidential');
  db.prepare(`INSERT INTO assets (scope_id, asset_type, name, criticality, environment, data_classification) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(meridianScopeId, 'application', 'Electronic Health Record System', 'critical', 'production', 'restricted');

  return { abcScopeId, meridianScopeId };
}

// ----------------------------------------------------------- ABC evidence
function seedAbcEvidence(abcScopeId) {
  const connectorTypes = ['entra', 'edr', 'backup', 'extscan', 'emaildns', 'cloud', 'siem'];
  const insertConnector = db.prepare(`INSERT INTO connectors (scope_id, connector_type, display_name, status, config_json) VALUES (?, ?, ?, 'disconnected', ?)`);
  const labels = { entra: 'Identity Provider (Microsoft Entra / Graph)', edr: 'Endpoint Detection & Response', backup: 'Backup & Recovery Platform', extscan: 'External Attack Surface Scanner', emaildns: 'Email Security & DNS', cloud: 'Cloud Platform (AWS/Azure/GCP)', siem: 'SIEM / Log Management' };

  const connectors = {};
  for (const type of connectorTypes) {
    const config = defaultConfigFor(type);
    // Two intentional, accepted compensating-control exceptions (Appendix A: "2 accepted compensating-control cases")
    if (type === 'entra') config.dormant_accounts = 1;
    if (type === 'cloud') config.public_exposure_count = 1;
    const id = insertConnector.run(abcScopeId, type, labels[type], JSON.stringify(config)).lastInsertRowid;
    connectors[type] = db.prepare('SELECT * FROM connectors WHERE id=?').get(id);
  }

  // Sync each connector 3x so continuous controls reach ECL-5 (Section 5.4).
  for (const type of connectorTypes) {
    const codes = mappingEngine.controlsForConnector(type);
    const controls = codes.map(c => db.prepare('SELECT * FROM controls WHERE code=?').get(c)).filter(Boolean);
    for (let i = 0; i < 3; i++) {
      eclEngine.syncConnector(db, { connector: db.prepare('SELECT * FROM connectors WHERE id=?').get(connectors[type].id), controls, actorUserId: null });
    }
  }

  // Operational tests (ECL-4).
  const bcpControls = mappingEngine.controlsForOperationalTest('restore_test').map(c => db.prepare('SELECT * FROM controls WHERE code=?').get(c));
  eclEngine.recordOperationalTest(db, { scopeId: abcScopeId, controls: bcpControls, actorUserId: null, testType: 'restore_test', passed: true, notes: 'Full restore of ERP database validated in isolated recovery environment.' });
  const irControls = mappingEngine.controlsForOperationalTest('tabletop_exercise').map(c => db.prepare('SELECT * FROM controls WHERE code=?').get(c));
  eclEngine.recordOperationalTest(db, { scopeId: abcScopeId, controls: irControls, actorUserId: null, testType: 'tabletop_exercise', passed: true, notes: 'Ransomware tabletop exercise completed with executive and IT participation.' });

  // Governance / Data Security controls: manual evidence, submitted and approved (ECL-2 observed).
  const manualCodes = ['LS-NET-601', 'LS-NET-602', 'LS-NET-603', 'LS-DATA-901', 'LS-DATA-902', 'LS-DATA-903', 'LS-DATA-904', 'LS-GOV-1001', 'LS-GOV-1002', 'LS-GOV-1003', 'LS-GOV-1004'];
  for (const code of manualCodes) {
    const control = db.prepare('SELECT * FROM controls WHERE code=?').get(code);
    const hash = signing.sha256({ control: code, note: 'Documented policy and assessor observation on file.' });
    const evId = db.prepare(`
      INSERT INTO evidence (scope_id, source, collector, evidence_type, summary_json, sha256_hash, classification)
      VALUES (?, 'manual_upload', 'user:seed', 'document', ?, ?, 'customer_confidential')
    `).run(abcScopeId, JSON.stringify({ control: code, note: 'Policy document and assessor interview.' }), hash).lastInsertRowid;
    db.prepare('INSERT INTO evidence_control_map (evidence_id, control_id) VALUES (?, ?)').run(evId, control.id);
    const validFrom = new Date().toISOString();
    const validUntil = new Date(Date.now() + control.max_evidence_age_hours * 3600 * 1000).toISOString();
    const signature = signing.sign({ scope_id: abcScopeId, control: code, status: 'verified', ecl: 2, coverage_pct: 100, valid_from: validFrom, valid_until: validUntil });
    const verId = db.prepare(`
      INSERT INTO verifications (scope_id, control_id, ecl, coverage_pct, effectiveness, decision_status, decision_date)
      VALUES (?, ?, 2, 100, 'effective', 'approved', datetime('now'))
    `).run(abcScopeId, control.id).lastInsertRowid;
    db.prepare(`
      INSERT INTO assurance_claims (scope_id, control_id, verification_id, status, ecl, coverage_pct, valid_from, valid_until, signature, revoked)
      VALUES (?, ?, ?, 'verified', 2, 100, ?, ?, ?, 0)
    `).run(abcScopeId, control.id, verId, validFrom, validUntil, signature);
  }
}

// -------------------------------------------------------------- passport
function seedAbcPassport(abcOrgId, abcScopeId) {
  const claims = db.prepare('SELECT * FROM assurance_claims WHERE scope_id=?').all(abcScopeId);
  const materialGaps = claims.filter(c => c.status === 'material_gap').length;
  const status = materialGaps > 0 ? 'conditional' : 'verified';
  const passportCode = 'LS-CRP-CA-000184';
  const issuedAt = new Date().toISOString();
  const payload = { passportCode, orgId: abcOrgId, scopeId: abcScopeId, status, issuedAt };
  const signature = signing.sign(payload);
  const id = db.prepare(`INSERT INTO passports (passport_code, org_id, scope_id, status, issued_at, signature) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(passportCode, abcOrgId, abcScopeId, status, issuedAt, signature).lastInsertRowid;
  return id;
}

function seedSharing(passportId, brokerPartnerId, northstarPartnerId, adminUserId) {
  const { nanoid } = require('nanoid');
  const insertGrant = db.prepare(`
    INSERT INTO sharing_grants (passport_id, recipient_partner_id, purpose, access_token, granted_by, expires_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', '+180 days'))
  `);
  insertGrant.run(passportId, brokerPartnerId, 'renewal placement support', nanoid(32), adminUserId);
  insertGrant.run(passportId, northstarPartnerId, 'pre-bind underwriting review', nanoid(32), adminUserId);
}

// ------------------------------------------------ confidential carrier graph
function seedCarrierRequirements(northstarPartnerId, continentalPartnerId) {
  const c = (code) => db.prepare('SELECT * FROM controls WHERE code=?').get(code).id;

  const northstarReqs = [
    ['NS-Q18', 'Question 18: Privileged Access Control', 'LS-ID-101', 3, 24, true, 2.0, 'carrier_provided_confidential'],
    ['NS-Q19', 'Question 19: Remote Access Authentication', 'LS-ID-102', 3, 24, true, 1.5, 'carrier_provided_confidential'],
    ['NS-Q22', 'Question 22: Endpoint Protection Deployment', 'LS-EDR-201', 3, 24, true, 1.5, 'carrier_provided_confidential'],
    ['NS-Q25', 'Question 25: Backup Immutability', 'LS-BCP-301', 3, 24, true, 2.0, 'carrier_provided_confidential'],
    ['NS-Q26', 'Question 26: Backup Restore Testing', 'LS-BCP-304', 4, 2160, true, 1.5, 'carrier_provided_confidential'],
    ['NS-Q31', 'Question 31: Incident Response Testing', 'LS-IR-401', 4, 8760, false, 1.0, 'carrier_provided_confidential'],
    ['NS-Q33', 'Question 33: External Exposure', 'LS-VULN-503', 3, 72, true, 1.5, 'carrier_provided_confidential'],
    ['NS-Q35', 'Question 35: Critical Patch SLA', 'LS-VULN-502', 3, 168, true, 1.0, 'broker_provided_confidential'],
    ['NS-Q41', 'Question 41: Email Domain Protection', 'LS-EML-701', 3, 720, false, 0.75, 'public'],
    ['NS-Q44', 'Question 44: Cloud Logging', 'LS-CLD-803', 3, 720, false, 0.75, 'inferred_unvalidated'],
    ['NS-Q50', 'Question 50: Security Awareness Training', 'LS-GOV-1003', 2, 8760, false, 0.5, 'public'],
  ];

  const continentalReqs = [
    ['CU-ID-P1', 'Identity Control P1', 'LS-ID-101', 3, 48, true, 1.5, 'carrier_provided_confidential'],
    ['CU-ID-P2', 'Identity Control P2', 'LS-ID-103', 3, 720, false, 1.0, 'inferred_unvalidated'],
    ['CU-EP-C1', 'Endpoint Deployment Verification', 'LS-EDR-201', 3, 24, true, 1.5, 'carrier_provided_confidential'],
    ['CU-RW-01', 'Ransomware Resilience Control', 'LS-BCP-301', 3, 24, true, 2.0, 'carrier_provided_confidential'],
    ['CU-RW-02', 'Backup Immutability Verification', 'LS-BCP-303', 3, 24, true, 1.0, 'carrier_provided_confidential'],
    ['CU-IR-01', 'Incident Response Evidence', 'LS-IR-401', 4, 8760, true, 1.5, 'carrier_provided_confidential'],
    ['CU-VU-01', 'External Attack Surface', 'LS-VULN-503', 3, 72, true, 1.5, 'broker_provided_confidential'],
    ['CU-CL-01', 'Cloud Public Exposure', 'LS-CLD-802', 3, 720, false, 0.75, 'inferred_unvalidated'],
    ['CU-GV-01', 'Vendor Risk Program', 'LS-GOV-1004', 1, 8760, false, 0.5, 'public'],
  ];

  for (const [code, label, ctrl, minEcl, maxAge, mandatory, weight, srcClass] of northstarReqs) {
    upsertRequirement(db, { partner_id: northstarPartnerId, requirement_code: code, requirement_label: label, control_id: c(ctrl), min_ecl: minEcl, max_evidence_age_hours: maxAge, mandatory, weight, source_classification: srcClass });
  }
  for (const [code, label, ctrl, minEcl, maxAge, mandatory, weight, srcClass] of continentalReqs) {
    upsertRequirement(db, { partner_id: continentalPartnerId, requirement_code: code, requirement_label: label, control_id: c(ctrl), min_ecl: minEcl, max_evidence_age_hours: maxAge, mandatory, weight, source_classification: srcClass });
  }
}

// -------------------------------------------------------- supplier graph
// ABC and Meridian intentionally share "CloudCore Managed Hosting" so the
// portfolio concentration report (Ops Guide Section 8) has something real to
// flag out of the box, rather than requiring manual data entry to demo.
function seedSuppliers(abcScopeId, meridianScopeId) {
  const link = (supplierId, codes) => {
    for (const code of codes) {
      const control = db.prepare('SELECT id FROM controls WHERE code=?').get(code);
      if (control) supplierGraph.linkControl(db, supplierId, control.id);
    }
  };

  const cloudCoreAbc = supplierGraph.createSupplier(db, abcScopeId, {
    name: 'CloudCore Managed Hosting', service: 'Cloud infrastructure hosting & managed operations',
    businessProcess: 'ERP & production hosting', dataTouched: 'Manufacturing operations data',
    region: 'CA-ON', contractOwner: 'Grace Thompson (CISO)', recoveryDependency: 'Primary hosting for ERP; contracted RTO 4 hours',
    alternativeProvider: 'None qualified', criticality: 'critical',
  });
  link(cloudCoreAbc, ['LS-CLD-801', 'LS-CLD-802', 'LS-CLD-803', 'LS-CLD-804', 'LS-BCP-301']);

  const northMail = supplierGraph.createSupplier(db, abcScopeId, {
    name: 'NorthMail Security Gateway', service: 'Email security gateway (DMARC/SPF/DKIM, anti-phishing)',
    businessProcess: 'Corporate email', region: 'CA-ON', contractOwner: 'Grace Thompson (CISO)',
    alternativeProvider: 'Native Microsoft 365 Defender (untested)', criticality: 'high',
  });
  link(northMail, ['LS-EML-701', 'LS-EML-702', 'LS-EML-703', 'LS-EML-704']);

  const swiftPay = supplierGraph.createSupplier(db, abcScopeId, {
    name: 'SwiftPay Payment Processor', service: 'B2B payment processing', businessProcess: 'Accounts receivable / customer billing',
    dataTouched: 'Payment card tokens', region: 'CA-ON', contractOwner: 'Grace Thompson (CISO)',
    alternativeProvider: 'None qualified', criticality: 'critical',
  });
  link(swiftPay, ['LS-DATA-902', 'LS-NET-601']);

  const vantage = supplierGraph.createSupplier(db, abcScopeId, {
    name: 'Vantage ERP Support', service: 'Outsourced ERP application support & patching', businessProcess: 'Manufacturing operations',
    region: 'CA-ON', contractOwner: 'Grace Thompson (CISO)', recoveryDependency: 'Sole vendor with ERP admin access',
    alternativeProvider: 'None qualified', criticality: 'critical',
  });
  link(vantage, ['LS-ID-101', 'LS-GOV-1004', 'LS-VULN-504']);

  const cloudCoreMeridian = supplierGraph.createSupplier(db, meridianScopeId, {
    name: 'CloudCore Managed Hosting', service: 'Cloud infrastructure hosting for EHR', businessProcess: 'EHR hosting',
    dataTouched: 'Protected health information', region: 'CA-BC', contractOwner: 'Daniel Osei (IT Director)',
    alternativeProvider: 'None qualified', criticality: 'critical',
  });
  link(cloudCoreMeridian, ['LS-CLD-801', 'LS-CLD-803']);

  supplierGraph.createSupplier(db, meridianScopeId, {
    name: 'Harbor Backup Solutions', service: 'Offsite immutable backup', businessProcess: 'Clinical data recovery',
    region: 'CA-BC', contractOwner: 'Daniel Osei (IT Director)', criticality: 'high',
  });

  return { cloudCoreAbc, vantage };
}

// --------------------------------------------------- claim evidence pack
// Seeds one claim through the full lifecycle (freeze -> seal -> approve ->
// release) so the ops, customer, and carrier portals all have something to
// show out of the box rather than requiring a live walkthrough to populate.
function seedClaim(abcScopeId, northstarPartnerId, adminUserId) {
  const claimId = claimEvidenceEngine.createClaim(db, {
    scopeId: abcScopeId,
    policyReference: 'NS-POL-48210',
    incidentDate: new Date().toISOString(),
    affectedBusinessProcess: 'ERP & Manufacturing Operations',
    affectedSystems: 'ERP - Manufacturing Operations; Azure Production Tenant',
    knownSuppliers: ['CloudCore Managed Hosting', 'Vantage ERP Support'],
    createdBy: adminUserId,
  });
  const packId = claimEvidenceEngine.generatePack(db, { claimId, actorUserId: adminUserId });
  claimEvidenceEngine.approvePack(db, { packId, actorUserId: adminUserId });
  claimEvidenceEngine.releasePack(db, { packId, partnerId: northstarPartnerId, purpose: 'claim review - suspected third-party intrusion via managed hosting provider', actorUserId: adminUserId });
}

function run() {
  if (alreadySeeded()) {
    console.log('Database already seeded - skipping. Delete data/laurelshield.db to reseed.');
    return;
  }
  const tx = db.transaction(() => {
    seedControls();
    const { abc, meridian, brokerPartnerId, northstarPartnerId, continentalPartnerId } = seedOrgsAndUsers();
    const { abcScopeId, meridianScopeId } = seedScopes(abc, meridian);
    seedAbcEvidence(abcScopeId);
    const passportId = seedAbcPassport(abc, abcScopeId);
    const adminUserId = db.prepare(`SELECT id FROM users WHERE email='admin@congruentshield.internal'`).get().id;
    seedSharing(passportId, brokerPartnerId, northstarPartnerId, adminUserId);
    seedCarrierRequirements(northstarPartnerId, continentalPartnerId);
    seedSuppliers(abcScopeId, meridianScopeId);
    seedClaim(abcScopeId, northstarPartnerId, adminUserId);
  });
  tx();
  console.log('Seed complete.');
  console.log(`Demo password for all accounts: ${DEMO_PASSWORD}`);
}

run();
