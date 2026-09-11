# -*- coding: utf-8 -*-
"""Builds Laurelshield_Security_and_Compliance_Procedures.docx"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_helpers import BookBuilder, NAVY, TEAL, STEEL, GREY

bb = BookBuilder()
doc = bb.doc

t = doc.add_paragraph(); t.alignment = 1
bb._run(t, "LAURELSHIELD", bold=True, color=NAVY, size=30)
st = doc.add_paragraph(); st.alignment = 1
bb._run(st, "Security & Compliance Procedures", bold=False, italic=True, color=TEAL, size=15)
sub = doc.add_paragraph(); sub.alignment = 1
bb._run(sub, "Platform security architecture, data handling rules, and control mappings to\nSOC 2, ISO/IEC 27001:2022, NIST CSF 2.0, PIPEDA, and ISO/IEC 17029 & 17065",
         color=STEEL, size=11)
bb.page_break()
bb.add_toc()

bb.chapter("1. Purpose and Scope", number="")
bb.para("This document describes the security architecture actually implemented in the Laurelshield "
        "Cyber Risk Passport reference platform, the data-handling rules that govern the evidence it "
        "collects, and how those controls map to the frameworks a customer, broker, or carrier "
        "counterparty is most likely to ask about. It covers the platform built this session (a "
        "single-tenant SQLite reference implementation) and flags, honestly, which controls are "
        "MVP-adequate versus which require upgrading before a production, multi-tenant, "
        "customer-facing launch. Section 11's Control Gap Register is the authoritative list of what "
        "is not yet production-ready.")
bb.warning("This is a technical control-mapping reference, not a certified audit report and not legal "
           "advice. SOC 2 and ISO 27001 mappings describe intended control coverage; only an accredited "
           "third-party auditor can issue a SOC 2 report or ISO 27001 certificate.", title="SCOPE NOTICE")

bb.chapter("2. Platform Security Architecture Summary", number="")
bb.para("Full technical detail is in the companion Platform Architecture & Build Documentation. The "
        "controls relevant to this document:")
bb.table(
    ["Control Area", "Implementation"],
    [
        ["Authentication", "bcrypt password hashing (cost factor 10); session-based auth via signed, httpOnly, SameSite=Lax cookies; rate-limited login endpoint (20 attempts / 15 min per client)."],
        ["Authorization", "Role-based access control with six roles (ls_admin, ls_assessor, ls_decision_officer, customer_admin, broker, carrier); every route declares its allowed roles; no endpoint relies on UI-level filtering alone."],
        ["Tenant isolation", "Every scope-scoped query is filtered by the authenticated session's org_id at the middleware layer (loadOwnedScope); cross-tenant access attempts return 403 and are not distinguishable from a not-found error to avoid enumeration."],
        ["Transport / headers", "Helmet-applied security headers: Content-Security-Policy (script-src 'self', no inline scripts), Cross-Origin-Opener-Policy, X-Frame-Options equivalent (frame-ancestors 'self'), HSTS-ready via trust proxy configuration."],
        ["Evidence integrity", "Every evidence object is SHA-256 hashed at creation and the hash is stored alongside source, collector, and timestamp metadata (chain of custody)."],
        ["Claim / passport integrity", "Assurance claims and passports are signed (HMAC-SHA256 in the MVP; see Section 11 for the production KMS/HSM upgrade) over a canonical JSON payload; signatures are independently re-verifiable and tamper-evident."],
        ["Audit logging", "Every state-changing action (login, evidence sync, verification decision, remediation closure, passport issuance, sharing grant/revocation, appeal resolution) writes an insert-only row to an access_log table with actor, action, resource, and timestamp."],
        ["Separation of duties", "Verification decisions require a role (ls_decision_officer) distinct from the role that proposes an assessment (ls_assessor); remediation closure requires an Assurance Operations role distinct from the customer_admin role that implements the fix."],
        ["Selective disclosure", "Carriers and brokers only ever receive derived assurance claims (status, ECL, coverage, dates, signature) through an explicit, time-limited, revocable sharing grant — never raw evidence, and never another partner's confidential requirement mapping."],
        ["Confidentiality segregation", "The Carrier Requirements Graph (weights, minimum ECL thresholds, source classification) is readable only by the ls_admin role and is never serialized into any customer-, broker-, or carrier-facing API response."],
    ],
    col_widths=[1.6, 5.0],
)

bb.chapter("3. Data Classification Scheme", number="")
bb.para("Every evidence record carries one of six classification values, enforced at the database schema "
        "level (Section 5.3 of the original research document):")
bb.table(
    ["Classification", "Examples", "Handling Rule"],
    [
        ["Public", "Published control catalogue, ECL definitions", "May appear in marketing and partner-facing materials without restriction."],
        ["Customer Confidential", "Manual evidence uploads, asset inventories", "Visible to the owning customer and authorized Laurelshield staff only."],
        ["Restricted Security Evidence", "Connector-collected technical evidence (MFA config, EDR state, backup posture)", "Never leaves the Evidence Vault; only derived claims are disclosed externally."],
        ["Carrier Confidential Mapping", "Carrier Requirements Graph rows (weights, thresholds)", "ls_admin role only; never returned by any API to a non-admin caller."],
        ["Laurelshield Trade Secret", "Translation/scoring logic, anomaly-detection rules (future)", "Source code access control; not documented at implementation-detail level outside engineering."],
        ["Claims/Outcome Restricted", "Underwriting outcome data (future Outcome Intelligence layer)", "Governed by a data-rights ledger recording source, consent, and permitted use per Section 11.7 of the original research document."],
    ],
    col_widths=[1.7, 2.6, 2.9],
)

bb.chapter("4. SOC 2 Trust Services Criteria Mapping", number="")
bb.para("Mapped against the AICPA 2017 Trust Services Criteria (as revised). “Implemented” means the "
        "control exists in the reference platform today; “Designed, not yet operating” means the "
        "procedure is documented in this suite but requires a live operating history before an auditor "
        "could test it.")
bb.table(
    ["TSC Ref.", "Criterion (summary)", "Laurelshield Control", "Status"],
    [
        ["CC1", "Control environment / integrity & ethics", "Role charter (Section 10.1 of original research), assessor independence policy, IP/confidentiality terms in every contract template", "Designed, not yet operating"],
        ["CC2", "Communication & information", "Role-based portals; customer-visible audit trail; appeals process", "Implemented"],
        ["CC3", "Risk assessment", "Platform threat model (Section 12.9): malicious evidence, compromised connector, insider, cross-tenant access, forged passport, replay, stale evidence, mapping leakage", "Designed, not yet operating"],
        ["CC4", "Monitoring activities", "Immutable access_log; continuous-assurance freshness sweep", "Implemented (freshness); log review cadence documented in Ops Runbook"],
        ["CC5", "Control activities", "RBAC, tenant isolation, decision-separation enforcement", "Implemented"],
        ["CC6", "Logical & physical access controls", "bcrypt auth, session cookies, RBAC, rate limiting; physical access N/A (cloud-hosted, provider-managed in production)", "Implemented (logical); physical deferred to hosting provider"],
        ["CC7", "System operations", "Connector sync logging, error handling, freshness engine", "Implemented"],
        ["CC8", "Change management", "Requirement-graph versioning fields (effective_date, review_date); code change control via git — process to be formalized pre-production", "Partially implemented"],
        ["CC9", "Risk mitigation (vendors, business disruption)", "Vendor Agreement template (Section 11.6 of original research); DR/backup procedure — see Control Gap Register", "Designed, not yet operating"],
        ["A1", "Availability", "Single-instance MVP has no HA/DR; production requires managed Postgres with automated backups and a documented RTO/RPO", "Gap — see Section 11"],
        ["C1", "Confidentiality", "Classification scheme (Section 3), carrier-mapping segregation, encryption in transit (TLS in production)", "Implemented (logical); encryption at rest is a production gap — see Section 11"],
    ],
    col_widths=[0.8, 2.2, 3.0, 1.6],
)

bb.chapter("5. ISO/IEC 27001:2022 Annex A Mapping", number="")
bb.para("Selected Annex A controls most relevant to an evidence-assurance platform, organized by the "
        "2022 revision's four themes.")
bb.h2("5.1 Organizational controls (A.5)")
bb.table(
    ["Annex A", "Control", "Laurelshield Implementation"],
    [
        ["A.5.1", "Policies for information security", "Assurance Method Manual, Evidence Handling Standard, Impartiality & Conflict Policy (Section 10.2 of original research)"],
        ["A.5.3", "Segregation of duties", "Assessor / Decision Officer role separation; enforced in code, not just policy"],
        ["A.5.15", "Access control", "RBAC + tenant isolation middleware"],
        ["A.5.23", "Cloud service security", "Applies at production deployment; MVP runs single-instance, not yet cloud-hardened"],
        ["A.5.34", "Privacy and protection of PII", "Mapped in Section 7 (PIPEDA) below"],
    ], col_widths=[0.9, 2.4, 3.3],
)
bb.h2("5.2 People controls (A.6)")
bb.table(
    ["Annex A", "Control", "Laurelshield Implementation"],
    [
        ["A.6.3", "Security awareness, education, training", "Assessor Competence Standard (Section 10.2 of original research); LS-GOV-1003 canonical control tracks this for customers"],
        ["A.6.6", "Confidentiality / NDA agreements", "Assessor Agreement and Employee/Contractor Agreement templates (Section 11.6)"],
    ], col_widths=[0.9, 2.4, 3.3],
)
bb.h2("5.3 Physical controls (A.7)")
bb.para("Deferred to the production hosting provider's data-center controls (physical access, "
        "environmental protection). Not applicable to the MVP's local development posture.")
bb.h2("5.4 Technological controls (A.8)")
bb.table(
    ["Annex A", "Control", "Laurelshield Implementation"],
    [
        ["A.8.2", "Privileged access rights", "ls_admin is the only role that can manage the Carrier Requirements Graph or view the full audit log"],
        ["A.8.3", "Information access restriction", "Selective disclosure engine; scoped sharing grants with expiry"],
        ["A.8.9", "Configuration management", "Connector posture stored as versioned JSON with sync history"],
        ["A.8.12", "Data leakage prevention", "translateForPartner() never serializes weight/min_ecl/confidential_notes fields (Section 11 of Architecture doc)"],
        ["A.8.15", "Logging", "access_log table; every evidence, verification, remediation, passport, and sharing action logged"],
        ["A.8.16", "Monitoring activities", "Freshness engine; drift simulation tooling for testing degradation response"],
        ["A.8.24", "Use of cryptography", "SHA-256 evidence hashing; HMAC-SHA256 claim/passport signing (production: KMS/HSM asymmetric signing)"],
        ["A.8.25", "Secure development lifecycle", "See Control Gap Register — SAST/SCA/DAST/pen test not yet run against this codebase"],
    ], col_widths=[0.9, 2.4, 3.3],
)

bb.chapter("6. NIST Cybersecurity Framework 2.0 Mapping", number="")
bb.table(
    ["Function", "Laurelshield Implementation"],
    [
        ["Govern (GV)", "Impartiality & Conflict Policy; Certification Scheme Rules; role charter separating Laurelshield Holdings / Technologies / Advisory / Assurance Institute functions (Section 10.1 of original research)"],
        ["Identify (ID)", "Scope Registry (Stage 2) creates an explicit, versioned asset inventory per customer; canonical control catalogue defines the assessed universe"],
        ["Protect (PR)", "RBAC, tenant isolation, encryption in transit, evidence hashing, rate limiting, security headers"],
        ["Detect (DE)", "Continuous-assurance freshness engine; connector sync anomaly surfacing (coverage drops, exposure counts)"],
        ["Respond (RS)", "Remediation backlog with owner/due-date tracking; appeals procedure; incident response runbook (Section 9 below)"],
        ["Recover (RC)", "Passport revocation and re-issuance; independent re-verification restores assurance after a finding closes — production DR/backup remains a gap (Section 11)"],
    ], col_widths=[1.3, 5.3],
)

bb.chapter("7. PIPEDA Mapping (Canadian Privacy Principles)", number="")
bb.para("Laurelshield's Canadian customers and its own Ontario-based operating footprint make PIPEDA's "
        "ten fair information principles the relevant privacy baseline. This maps each principle to a "
        "platform or procedural control; it is not a substitute for a privacy counsel review of the "
        "customer MSA/DPA (Section 11.6 of original research).")
bb.table(
    ["Principle", "Laurelshield Control"],
    [
        ["1. Accountability", "Named Security Officer / DPO role (Section 12.1, Workstream 8 of original research); this document and the Ops Runbook constitute the accountability record"],
        ["2. Identifying purposes", "Customer MSA/DPA states the evidence-verification purpose before any connector is authorized"],
        ["3. Consent", "Explicit consent step in Stage 1 onboarding before evidence collection begins; sharing grants require an additional, separate consent action per recipient"],
        ["4. Limiting collection", "Evidence collectors map to specific canonical controls only (Section 5.2); no open-ended data harvesting"],
        ["5. Limiting use, disclosure, retention", "Selective disclosure returns derived claims, not raw evidence; retention rules pending formalization in production (gap register)"],
        ["6. Accuracy", "Independent verification and re-verification workflow (Stage 5, 8); freshness engine prevents stale data from being presented as current"],
        ["7. Safeguards", "See Section 2 (architecture) and Section 4 (SOC 2 CC6)"],
        ["8. Openness", "This document, the Architecture doc, and the published control catalogue are the openness record"],
        ["9. Individual access", "Customer-visible audit trail (Section 5.8 of original research) — the customer sees every access to their own evidence"],
        ["10. Challenging compliance", "Appeals and complaints procedure (Section 10.2 of original research); implemented in-platform"],
    ], col_widths=[1.9, 4.7],
)

bb.chapter("8. ISO/IEC 17029 & 17065 Conformity Assessment Mapping", number="")
bb.para("If the Cyber Risk Passport is ever positioned as a formal certification credential (Section 10 "
        "of the original research document), these two standards become the relevant conformity-"
        "assessment baseline. They are mapped here now, while the platform is being built, so the "
        "separation-of-duties and appeals mechanisms they require are structural from day one rather "
        "than retrofitted later.")
bb.table(
    ["Requirement", "Laurelshield Control"],
    [
        ["Impartiality", "ls_decision_officer role structurally separate from ls_assessor and from customer_admin; no single account can propose and finalize the same verification"],
        ["Competence", "Assessor Competence Standard (Section 10.2); role assignment in the reference platform models this separation even before formal competence certification exists"],
        ["Evaluation & decision separation", "Verification-queue “assess” action vs. “decide” action are two distinct, separately role-gated API endpoints"],
        ["Surveillance", "Continuous-assurance freshness engine automatically downgrades or expires claims whose evidence has aged past its threshold — this is the mechanized form of ongoing surveillance"],
        ["Complaints & appeals", "Appeals endpoint and Assurance Operations resolution workflow, with an independent reviewer role"],
        ["Certification mark control", "Deferred — Section 11.2 of the original research document correctly recommends designing mark-licensing rules only after the scheme itself is mature"],
    ], col_widths=[1.9, 4.7],
)

bb.chapter("9. Incident Response & Breach Notification Procedure", number="")
bb.para("Summary procedure; full operational detail (roles, escalation paths, communication templates) "
        "is in the companion Operations Runbook, Section 6.")
bb.number("Detect: freshness engine alerts, anomalous access_log patterns, or a direct report trigger "
          "an investigation.")
bb.number("Contain: revoke affected sharing grants and/or the affected passport immediately; rotate the "
          "PASSPORT_SIGNING_SECRET if signature integrity is suspected (invalidates all outstanding "
          "signatures — a deliberate, logged, admin-only action).")
bb.number("Assess: determine which classification tiers (Section 3) were exposed; Restricted Security "
          "Evidence and Carrier Confidential Mapping exposures are treated as reportable by default.")
bb.number("Notify: customer notification per the MSA/DPA breach clause; regulatory notification "
          "assessment (e.g., PIPEDA breach-of-security-safeguards reporting) made with privacy counsel; "
          "affected carriers/brokers notified per their partner agreement.")
bb.number("Recover: re-verify affected controls, re-issue passports with new signatures, document the "
          "root cause and corrective action in the audit record.")

bb.chapter("10. Vendor, Subprocessor & Data Residency Notes", number="")
bb.para("The reference platform has no third-party subprocessors — it is a self-contained Node.js "
        "application with a local SQLite file. A production deployment will introduce at least: a "
        "managed database provider, a cloud hosting/compute provider, and — once live connectors "
        "replace the simulated ones — the customer's own identity, EDR, backup, and cloud platforms as "
        "read-only data sources. Each must be added to the Vendor/Subprocessor register with data-"
        "residency, breach-notification, and subcontractor-control terms per the Technology Vendor "
        "Agreement template (Section 11.6 of the original research document) before production launch.")

bb.chapter("11. Control Gap Register", number="")
bb.para("Honest accounting of what the reference platform does not yet do, so nothing in Sections 4-8 "
        "is mistaken for a completed certification.")
bb.table(
    ["Gap", "Why It's Acceptable for MVP", "Required Before Production"],
    [
        ["HMAC (symmetric) signing instead of asymmetric KMS/HSM keys", "Sufficient to prove tamper-evidence and revocation semantics to a design partner", "Move to an asymmetric keypair (e.g., cloud KMS-backed Ed25519/RSA) so recipients can verify signatures without holding Laurelshield's secret"],
        ["SQLite, unencrypted at rest", "Adequate for a local, single-instance proof of concept", "Managed Postgres with encryption at rest and tenant-aware key management"],
        ["No automated backup / DR for the platform itself", "Demo data is reproducible via the seed script", "Documented RTO/RPO, automated backups, tested restore procedure"],
        ["No SAST/SCA/DAST or penetration test run against this codebase", "Not yet handling real customer evidence", "Full secure-SDLC pass per Section 12.9 of the original research document before onboarding a real design partner"],
        ["Single hosting instance, no horizontal scaling or WAF", "Appropriate for internal/pilot demonstration", "Production architecture per Layer 1 (Identity & Tenant Security) of the original research's reference architecture"],
        ["EDR and backup connectors still simulated, not live APIs", "Matches the original document's own Days 31-90 phasing (one live connector first); the Entra/Microsoft Graph connector is now live (Section 7 of the Architecture doc)", "Replace remaining simulated connector logic with real CrowdStrike/Defender and Veeam/Rubrik integrations, per Section 5.2 priority order"],
        ["Live connector client secret (Entra) stored in plaintext", "Acceptable for a single-operator pilot; the secret authenticates to the customer's own Azure tenant, not a shared system", "Encrypt the stored secret at minimum; prefer certificate-based Azure AD authentication backed by a key vault in production"],
    ], col_widths=[2.1, 2.4, 2.5],
)

bb.add_footer("Laurelshield — Security & Compliance Procedures")
bb.save(os.path.join(os.path.dirname(__file__), "..", "Laurelshield_Security_and_Compliance_Procedures.docx"))
print("saved doc2")
