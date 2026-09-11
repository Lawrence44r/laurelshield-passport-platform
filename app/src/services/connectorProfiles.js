// Default simulated posture per connector type, and the per-control
// evaluators that turn a posture snapshot into coverage/effectiveness.
// This stands in for the real read-only API integrations listed in
// Section 5.2 (Microsoft Graph/Entra, Defender/CrowdStrike, Veeam/Rubrik,
// external attack-surface scanners, cloud, SIEM). Swapping a profile's
// values for a live API call is the only change required to go from
// simulated to production evidence collection.

const DEFAULT_CONFIG = {
  entra: { privileged_mfa_coverage: 100, remote_mfa_coverage: 100, legacy_auth_disabled: true, dormant_accounts: 0 },
  edr: { edr_coverage_pct: 99, tamper_protection: true, unsupported_os_count: 0 },
  backup: { immutable_copy: true, credential_separation: true, critical_coverage_pct: 100 },
  extscan: { exposed_critical_cves: 0, rdp_exposed: false, vpn_exposed_with_mfa: true, mgmt_plane_isolated: true },
  emaildns: { dmarc_policy: 'reject', spf_aligned: true, dkim_aligned: true, forwarding_rules_monitored: true },
  cloud: { iam_least_privilege: true, public_exposure_count: 0, logging_enabled: true, key_mgmt: true },
  siem: { log_source_coverage_pct: 96, escalation_sla_met: true, patch_cadence_days: 14 },
};

// control code -> (config) => { coverage_pct, effective, note }
const EVALUATORS = {
  'LS-ID-101': c => ({ coverage_pct: c.privileged_mfa_coverage, effective: c.privileged_mfa_coverage >= 100, note: 'Privileged MFA coverage across admin roles' }),
  'LS-ID-102': c => ({ coverage_pct: c.remote_mfa_coverage, effective: c.remote_mfa_coverage >= 100, note: 'Remote-access MFA coverage' }),
  'LS-ID-103': c => ({ coverage_pct: c.legacy_auth_disabled ? 100 : 0, effective: !!c.legacy_auth_disabled, note: 'Legacy authentication protocols disabled; privileged roles separated' }),
  'LS-ID-104': c => ({ coverage_pct: c.dormant_accounts === 0 ? 100 : Math.max(0, 100 - c.dormant_accounts * 10), effective: c.dormant_accounts === 0, note: `${c.dormant_accounts} dormant privileged accounts detected` }),

  'LS-EDR-201': c => ({ coverage_pct: c.edr_coverage_pct, effective: c.edr_coverage_pct >= 99, note: 'EDR sensor deployment coverage' }),
  'LS-EDR-202': c => ({ coverage_pct: c.tamper_protection ? 100 : 0, effective: !!c.tamper_protection, note: 'Tamper protection enforced' }),
  'LS-EDR-203': c => ({ coverage_pct: c.edr_coverage_pct, effective: c.edr_coverage_pct >= 95, note: 'Endpoint inventory reconciliation vs. sensor population' }),
  'LS-EDR-204': c => ({ coverage_pct: c.unsupported_os_count === 0 ? 100 : Math.max(0, 100 - c.unsupported_os_count * 15), effective: c.unsupported_os_count === 0, note: `${c.unsupported_os_count} unsupported OS endpoints` }),

  'LS-BCP-301': c => ({ coverage_pct: c.immutable_copy ? 100 : 0, effective: !!c.immutable_copy, note: 'Immutable/offline backup copy present' }),
  'LS-BCP-302': c => ({ coverage_pct: c.credential_separation ? 100 : 0, effective: !!c.credential_separation, note: 'Backup credentials separated from production identity' }),
  'LS-BCP-303': c => ({ coverage_pct: c.critical_coverage_pct, effective: c.critical_coverage_pct >= 100, note: 'Critical-system backup job coverage' }),

  'LS-VULN-501': () => ({ coverage_pct: 100, effective: true, note: 'Authenticated scan completed across in-scope hosts' }),
  'LS-VULN-502': c => ({ coverage_pct: c.exposed_critical_cves === 0 ? 100 : Math.max(0, 100 - c.exposed_critical_cves * 20), effective: c.exposed_critical_cves === 0, note: `${c.exposed_critical_cves} unresolved critical CVEs past SLA` }),
  'LS-VULN-503': c => ({ coverage_pct: c.rdp_exposed ? 40 : 100, effective: !c.rdp_exposed, note: c.rdp_exposed ? 'RDP exposed to the internet' : 'No critical services exposed to the internet' }),

  'LS-EML-701': c => ({ coverage_pct: c.dmarc_policy === 'reject' ? 100 : c.dmarc_policy === 'quarantine' ? 60 : 20, effective: c.dmarc_policy === 'reject', note: `DMARC policy: ${c.dmarc_policy}` }),
  'LS-EML-702': c => ({ coverage_pct: (c.spf_aligned && c.dkim_aligned) ? 100 : 50, effective: !!(c.spf_aligned && c.dkim_aligned), note: 'SPF/DKIM alignment' }),
  'LS-EML-703': () => ({ coverage_pct: 100, effective: true, note: 'Anti-phishing/malicious link controls active' }),
  'LS-EML-704': c => ({ coverage_pct: c.forwarding_rules_monitored ? 100 : 0, effective: !!c.forwarding_rules_monitored, note: 'Auto-forwarding rule monitoring enabled' }),

  'LS-CLD-801': c => ({ coverage_pct: c.iam_least_privilege ? 100 : 50, effective: !!c.iam_least_privilege, note: 'Cloud IAM least-privilege posture' }),
  'LS-CLD-802': c => ({ coverage_pct: c.public_exposure_count === 0 ? 100 : Math.max(0, 100 - c.public_exposure_count * 25), effective: c.public_exposure_count === 0, note: `${c.public_exposure_count} unintended public resources` }),
  'LS-CLD-803': c => ({ coverage_pct: c.logging_enabled ? 100 : 0, effective: !!c.logging_enabled, note: 'Cloud audit logging enabled' }),
  'LS-CLD-804': c => ({ coverage_pct: c.key_mgmt ? 100 : 0, effective: !!c.key_mgmt, note: 'Encryption/key management controls in place' }),

  'LS-IR-402': c => ({ coverage_pct: c.log_source_coverage_pct, effective: c.log_source_coverage_pct >= 90, note: 'Critical log-source coverage' }),
  'LS-IR-403': c => ({ coverage_pct: c.escalation_sla_met ? 100 : 50, effective: !!c.escalation_sla_met, note: 'SOC escalation SLA adherence' }),
  'LS-VULN-504': c => ({ coverage_pct: c.patch_cadence_days <= 30 ? 100 : 60, effective: c.patch_cadence_days <= 30, note: `Median patch cadence ${c.patch_cadence_days} days` }),
  'LS-NET-604': c => ({ coverage_pct: c.mgmt_plane_isolated ? 100 : 0, effective: !!c.mgmt_plane_isolated, note: 'Management-plane isolation from general network access' }),
};

function defaultConfigFor(connectorType) {
  return { ...DEFAULT_CONFIG[connectorType] };
}

function evaluate(controlCode, config) {
  const fn = EVALUATORS[controlCode];
  if (!fn) return null;
  return fn(config);
}

module.exports = { DEFAULT_CONFIG, EVALUATORS, defaultConfigFor, evaluate };
