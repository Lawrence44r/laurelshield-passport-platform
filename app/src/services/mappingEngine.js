// Canonical evidence-to-control mapping (Stage 4 / Section 5.5).
// Each simulated connector deterministically maps to the canonical controls
// it can produce technical evidence for. Governance and data-security domains
// are intentionally left out of the technical connector map: in the real
// business these rely on document review / interview evidence (ECL-1/ECL-2),
// which is exactly the distinction the Evidence Confidence Level model exists
// to preserve (Section 5.4 - "a self-attestation must never be indistinguishable
// from machine-verified evidence").
const CONNECTOR_CONTROL_MAP = {
  entra: ['LS-ID-101', 'LS-ID-102', 'LS-ID-103', 'LS-ID-104'],
  edr: ['LS-EDR-201', 'LS-EDR-202', 'LS-EDR-203', 'LS-EDR-204'],
  backup: ['LS-BCP-301', 'LS-BCP-302', 'LS-BCP-303'], // LS-BCP-304 requires an operational restore test
  extscan: ['LS-VULN-501', 'LS-VULN-502', 'LS-VULN-503', 'LS-NET-604'],
  emaildns: ['LS-EML-701', 'LS-EML-702', 'LS-EML-703', 'LS-EML-704'],
  cloud: ['LS-CLD-801', 'LS-CLD-802', 'LS-CLD-803', 'LS-CLD-804'],
  siem: ['LS-IR-402', 'LS-IR-403', 'LS-VULN-504'],
};

// Operational-test and manual-evidence actions that are not tied to a
// connector sync (Section 5.4 ECL-4 and ECL-1/ECL-2 evidence types).
const OPERATIONAL_TEST_CONTROLS = {
  restore_test: ['LS-BCP-304'],
  tabletop_exercise: ['LS-IR-401', 'LS-IR-404'],
};

function controlsForConnector(connectorType) {
  return CONNECTOR_CONTROL_MAP[connectorType] || [];
}

function controlsForOperationalTest(testType) {
  return OPERATIONAL_TEST_CONTROLS[testType] || [];
}

module.exports = { CONNECTOR_CONTROL_MAP, controlsForConnector, controlsForOperationalTest };
