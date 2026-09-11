# -*- coding: utf-8 -*-
"""Builds Laurelshield_Platform_Architecture_and_Build_Documentation.docx"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_helpers import BookBuilder, NAVY, TEAL, STEEL, GREY

bb = BookBuilder()
doc = bb.doc

t = doc.add_paragraph(); t.alignment = 1
bb._run(t, "LAURELSHIELD", bold=True, color=NAVY, size=30)
st = doc.add_paragraph(); st.alignment = 1
bb._run(st, "Platform Architecture & Build Documentation", bold=False, italic=True, color=TEAL, size=15)
sub = doc.add_paragraph(); sub.alignment = 1
bb._run(sub, "Reference implementation of the Cyber Risk Passport platform:\nsystem design, data model, API surface, and how to run it",
         color=STEEL, size=11)
bb.page_break()
bb.add_toc()

bb.chapter("1. System Overview", number="")
bb.para("The reference platform is a single Node.js/Express application backed by SQLite, serving a "
        "JSON API under /api/* and four static, vanilla-JavaScript web portals — one per counterparty "
        "role. There is no build step and no frontend framework: each portal is a set of plain HTML/CSS/"
        "JS files that call the API directly with fetch(). This keeps the trade-secret logic (evidence "
        "scoring, carrier translation) entirely server-side; the browser never receives anything beyond "
        "the derived, role-appropriate view.")
bb.diagram(
"""+---------------------------------------------------------------------+
|                        BROWSER (4 portals)                          |
|  /customer   /ops   /broker   /carrier      (vanilla HTML/CSS/JS)   |
+-------------------------------+---------------------------------------+
                                | fetch() JSON over HTTPS, session cookie
+-------------------------------v---------------------------------------+
|                       EXPRESS API  (src/server.js)                   |
|  helmet | express-session | rate limiting | RBAC | tenant isolation  |
|  routes: /api/auth  /api/customer  /api/ops  /api/broker  /api/carrier|
+---+-----------+------------+-------------+------------+--------------+
    |           |            |             |            |
    v           v            v             v            v
 signing.js  eclEngine.js mappingEngine.js freshnessEngine.js translationEngine.js
 (HMAC sign/  (evidence->  (connector ->   (expiry/downgrade  (CONFIDENTIAL:
  verify,      ECL 0-5,     control map)    of stale claims)   carrier graph +
  sha256)      claim calc)                                     partner scoring)
    |           |            |             |            |
    +-----------+------------+-------------+------------+
                                |
                                v
                    +---------------------------+
                    |   SQLite (better-sqlite3) |
                    |  orgs/users/scopes/assets |
                    |  evidence/verifications   |
                    |  assurance_claims         |
                    |  carrier_requirements(*)  |
                    |  passports/sharing_grants |
                    |  access_log (audit)       |
                    +---------------------------+
                    (*) confidential - ls_admin only""",
    caption="Figure 1: Reference platform component diagram")

bb.chapter("2. Technology Stack", number="")
bb.table(
    ["Layer", "Choice", "Why"],
    [
        ["Runtime", "Node.js 24, CommonJS", "Matches the team's existing stack; no build tooling required"],
        ["Web framework", "Express 4", "Minimal, well-understood, easy to harden with Helmet/rate-limit middleware"],
        ["Database", "SQLite via better-sqlite3 (synchronous)", "Zero-setup for a demo/pilot; swap for managed Postgres at production scale (Section 8)"],
        ["Auth", "express-session + bcryptjs", "Cookie-based session auth is sufficient for a role-separated portal; no need for OAuth complexity in the MVP"],
        ["Frontend", "Vanilla HTML/CSS/JS, no framework", "No build step; keeps all scoring/translation logic server-side by construction"],
        ["Security headers", "helmet", "Content-Security-Policy, COOP, and related headers with sane defaults"],
        ["Signing", "Node crypto (HMAC-SHA256, SHA-256)", "Sufficient to demonstrate tamper-evidence; production upgrade path in Section 8"],
        ["Live evidence integration", "@azure/msal-node (Microsoft's official MSAL library)", "App-only (client credentials) OAuth2 flow against Microsoft Graph for the Entra identity connector — the first of the P0 live connectors from Section 5.2 of the original research document"],
    ], col_widths=[1.3, 2.6, 3.1],
)

bb.chapter("3. Folder Structure", number="")
bb.diagram(
"""Laurelshield-Passport-Platform/
├── app/
│   ├── src/
│   │   ├── server.js              Express app, middleware wiring, static serving
│   │   ├── db/
│   │   │   ├── schema.js          SQLite DDL (idempotent CREATE TABLE IF NOT EXISTS)
│   │   │   ├── index.js           DB connection + WAL mode
│   │   │   └── seed.js            Demo data: controls, orgs, users, evidence, passport
│   │   ├── services/
│   │   │   ├── signing.js         HMAC sign/verify, SHA-256 hashing
│   │   │   ├── mappingEngine.js   connector-type -> canonical control codes
│   │   │   ├── connectorProfiles.js  simulated posture + per-control evaluators
│   │   │   ├── graphConnector.js  LIVE Microsoft Graph integration (MSAL client-credentials flow)
│   │   │   ├── eclEngine.js       evidence -> ECL, claim status, remediation triggers
│   │   │   ├── freshnessEngine.js continuous assurance sweep + drift simulation
│   │   │   ├── translationEngine.js  CONFIDENTIAL: carrier graph + partner translation
│   │   │   └── auditLog.js        access_log write helper
│   │   ├── middleware/
│   │   │   └── auth.js            requireAuth, requireRole, loadOwnedScope (tenant isolation)
│   │   └── routes/
│   │       ├── auth.js  customer.js  ops.js  broker.js  carrier.js
│   ├── public/                    customer/ ops/ broker/ carrier/ portals + shared css/js
│   ├── data/laurelshield.db       SQLite file (git-ignored)
│   ├── .env                       secrets (git-ignored)
│   └── package.json
└── docs/                          this documentation suite + build/ (docx generator scripts)""",
    caption="Figure 2: Repository layout")

bb.chapter("4. Data Model", number="")
bb.para("15 tables, all defined in src/db/schema.js. Grouped by function:")
bb.table(
    ["Group", "Tables", "Purpose"],
    [
        ["Identity & tenancy", "organizations, users, partners", "Customers, brokers, and carriers are all organizations; partners links a broker/carrier org to its role-specific record"],
        ["Assurance boundary", "scopes, assets", "Stage 1-2: the legal entity / technology footprint under verification"],
        ["Evidence", "connectors, evidence, evidence_control_map", "Stage 3-4: connectors (simulated by default; the Entra identity connector also supports a live Microsoft Graph mode), evidence objects with chain-of-custody metadata, and their mapping to canonical controls"],
        ["Control catalogue", "controls", "Stage 4: 40 vendor-neutral canonical controls across 10 domains (Section 5 of Security & Compliance doc)"],
        ["Decisions", "verifications, assurance_claims, remediation_items", "Stage 5-8: ECL/effectiveness decisions, the resulting signed claim per (scope, control), and the remediation backlog"],
        ["Passport & sharing", "passports, sharing_grants", "Stage 9-10: signed passport issuance and customer-controlled, time-limited, revocable disclosure"],
        ["Confidential graph", "carrier_requirements", "Section 5.6: partner-specific control mappings, minimum ECL, freshness windows, and weights — ls_admin only"],
        ["Governance", "appeals, access_log", "Section 10.2: contested-decision review, and the immutable audit trail"],
    ], col_widths=[1.3, 2.2, 3.4],
)
bb.para("Every assurance_claims row is unique per (scope_id, control_id) and carries: status "
        "(verified/conditional/expired/revoked/material_gap/not_assessed), ecl (0-5), coverage_pct, "
        "valid_from/valid_until, a signature, and a revoked flag — this single row is what a passport "
        "and every partner translation ultimately read from.")

bb.chapter("5. The 12-Stage Business Process, Mapped to the API", number="")
bb.table(
    ["Stage", "Endpoint(s)", "Role"],
    [
        ["1-2. Onboarding & scope", "POST /api/customer/scopes, POST /scopes/:id/assets, POST /scopes/:id/approve", "customer_admin"],
        ["3. Evidence collection", "POST /scopes/:id/connectors, POST /connectors/:id/sync, POST /operational-tests, POST /evidence/manual", "customer_admin"],
        ["4. Canonical mapping", "Automatic — mappingEngine.controlsForConnector() at sync time", "system"],
        ["5. Confidence & effectiveness", "GET /scopes/:id/controls; verification queue: GET/POST /api/ops/verification-queue, /verifications/:id/assess, /decide", "customer_admin (view), ls_assessor, ls_decision_officer"],
        ["6. Market readiness translation", "GET /api/carrier/passports/:id (translation), GET /api/broker/passports/:id (raw claims + triggers)", "broker, carrier"],
        ["7. Remediation planning", "GET /scopes/:id/remediation, POST /remediation/:id/mark-remediated", "customer_admin"],
        ["8. Independent re-verification", "GET /api/ops/reverification-queue, POST /reverification/:id/close", "ls_assessor, ls_decision_officer, ls_admin"],
        ["9. Passport issuance", "POST /scopes/:id/passports, GET /passports/:id, POST /passports/:id/revoke", "customer_admin"],
        ["10. Authorized demonstration", "POST /passports/:id/share, GET/POST /sharing/*", "customer_admin; consumed via /api/broker, /api/carrier"],
        ["11. Continuous assurance", "POST /scopes/:id/freshness-check, POST /api/ops/demo/freshness-sweep, /demo/simulate-drift", "customer_admin, ls_admin"],
        ["12. Outcome learning", "Not yet implemented — see Roadmap (Section 9)", "future: ls_admin / Data Lead"],
    ], col_widths=[1.9, 3.7, 1.5],
)

bb.chapter("6. Trade-Secret Boundary: What Is Deliberately Not Documented Here", number="")
bb.para("Per Section 11.5 and 5.6 of the original research document, the Carrier Requirements Graph and "
        "the partner-translation scoring logic are Laurelshield's highest-value trade secrets. This "
        "documentation set describes them at the black-box level only — inputs and outputs, not the "
        "internal formula.")
bb.table(
    ["Component", "What This Document Says", "What It Deliberately Omits"],
    [
        ["translationEngine.translateForPartner()", "Takes a partner ID and scope ID; returns an overall readiness status, a 0-100 readiness score, and a per-requirement Pass/Conditional/Evidence Expiring/Material Gap result with a plain-language evidence note", "The exact weighting formula, which controls a given carrier treats as mandatory versus advisory, and the minimum-ECL/freshness thresholds behind each requirement"],
        ["eclEngine / connectorProfiles evaluators", "Evidence Confidence Levels 0-5 are a published standard (Section 5.4 of original research); the mapping from a raw connector reading to a specific coverage percentage is implementation detail", "The exact per-control evaluator thresholds are visible in source code to engineering staff but are not reproduced in customer- or partner-facing materials"],
        ["carrier_requirements table", "Structure only (Section 4 of this document): partner, control, min ECL, freshness window, weight, mandatory flag, source classification", "Actual row contents for any real carrier relationship — always ls_admin-only, never included in a document, export, or API response outside that role"],
    ], col_widths=[2.0, 2.9, 2.2],
)
bb.goodpractice(
    "This is a design property, not a documentation gap: the hard rule enforced in translationEngine.js "
    "is that translateForPartner() is the only function any customer-, broker-, or carrier-facing route "
    "may call, and its return value never includes weight, min_ecl, max_evidence_age_hours, "
    "source_classification, or confidential_notes. Verify this by inspecting the function directly — "
    "the constraint is in the code, not just in this paragraph.",
    title="ENFORCEMENT, NOT JUST POLICY")

bb.chapter("7. Live Microsoft Graph Connector Setup", number="")
bb.para("The Entra identity connector (src/services/graphConnector.js) can run in two modes, selected "
        "per connector when the customer adds it: Simulated (the zero-setup default used throughout "
        "this document and the seeded demo data) or Live, which authenticates to a real Azure AD tenant "
        "via Microsoft's official MSAL Node library and pulls real Conditional Access, directory-role, "
        "and sign-in-activity data for controls LS-ID-101 through LS-ID-104.")
bb.h2("7.1 Why app-only (client credentials), not delegated auth")
bb.para("Laurelshield reads tenant-wide directory and policy state on a schedule, not on behalf of an "
        "interactively signed-in end user, so the connector uses the OAuth2 client credentials grant: "
        "an Azure AD app registration with Application (not Delegated) permissions, authenticating with "
        "its own client ID and secret rather than a user's credentials.")
bb.h2("7.2 Azure Portal setup steps (performed by the customer's own Azure AD administrator)")
bb.number("In the Azure Portal, go to Microsoft Entra ID > App registrations > New registration. Any "
          "name is fine (e.g. “Laurelshield Evidence Connector”); no redirect URI is needed.")
bb.number("Under Certificates & secrets, create a new client secret (or, for production, prefer a "
          "certificate — see the security note below) and copy its value immediately; Azure will not "
          "show it again.")
bb.number("Under API permissions, add Microsoft Graph > Application permissions and select: "
          "Policy.Read.All, Directory.Read.All, RoleManagement.Read.Directory, and AuditLog.Read.All.")
bb.number("Click Grant admin consent for the tenant — application permissions do not take effect until "
          "a tenant administrator explicitly consents.")
bb.number("Copy the Tenant ID and Application (client) ID from the app registration's Overview page.")
bb.para("These four values — Tenant ID, Client ID, Client Secret, and the admin-consented permissions — "
        "are everything the customer enters when adding the connector in Live mode; nothing else is "
        "required on the Azure side.")
bb.h2("7.3 What the connector actually reads")
bb.table(
    ["Canonical Control", "Graph Endpoint", "Evaluation Logic"],
    [
        ["LS-ID-101 Privileged MFA", "GET /identity/conditionalAccess/policies", "An enabled policy with grantControls.builtInControls including \"mfa\", targeting either all users or specific privileged roles"],
        ["LS-ID-102 Remote-Access MFA", "GET /identity/conditionalAccess/policies", "An enabled policy requiring MFA for all users (broader than the privileged-only check above)"],
        ["LS-ID-103 Privileged Role Separation", "GET /identity/conditionalAccess/policies", "An enabled policy that blocks legacy authentication client app types (exchangeActiveSync, other)"],
        ["LS-ID-104 Dormant Account Governance", "GET /directoryRoles, /directoryRoles/{id}/members, /users/{id}?$select=signInActivity", "Counts privileged-role members who are disabled or have no sign-in within 90 days"],
    ], col_widths=[2.2, 2.5, 2.4],
)
bb.warning(
    "signInActivity requires an Entra ID P1 or P2 license on the tenant; without it, Graph returns the "
    "field as null rather than an error, and the connector treats that conservatively as \"cannot prove "
    "the account is active\" — the same outcome as a genuinely dormant account. This is a real Microsoft "
    "licensing dependency, not a Laurelshield limitation, and should be confirmed with the customer "
    "during onboarding.", title="LICENSING DEPENDENCY: SIGN-IN ACTIVITY")
bb.h2("7.4 Error handling and secret hygiene")
bb.para("A Test Connection action (one lightweight GET /organization call) lets the customer validate "
        "credentials before a full sync. If authentication or a Graph call fails — invalid tenant, "
        "revoked secret, missing consent, throttling — the connector is marked error, the failure is "
        "logged to the audit trail with Microsoft's own error detail, and the rest of the platform "
        "continues operating normally; a bad credential cannot crash the server. The client secret is "
        "stored in the connector's config and is never returned to the browser once saved — the API "
        "redacts it to a boolean clientSecretConfigured flag on every read.")
bb.warning(
    "The client secret is stored in plaintext in the SQLite database in this MVP — the same gap as the "
    "general \"SQLite, unencrypted at rest\" item in the Security & Compliance Procedures Control Gap "
    "Register, but worth calling out specifically because this field is a live credential to a "
    "customer's own Azure tenant, not just Laurelshield's own data. Production must encrypt this field "
    "at minimum, and should prefer certificate-based authentication (stored in a key vault) over a "
    "shared secret entirely.", title="PRODUCTION GAP: ENCRYPT OR ELIMINATE THE STORED SECRET")

bb.chapter("8. API Reference (Role-Gated Endpoint Summary)", number="")
bb.para("Full request/response shapes are in the route source files (src/routes/*.js); this is the "
        "endpoint inventory for onboarding a new engineer or auditor.")
bb.table(
    ["Base Path", "Role(s) Required", "Endpoint Count", "Covers"],
    [
        ["/api/auth", "none (login) / any authenticated (me, logout)", "3", "Session login/logout, current-user lookup"],
        ["/api/customer", "customer_admin", "~30", "Org, scopes, assets, connectors (incl. live-connector test-connection), evidence, controls, remediation, passports, sharing, appeals, audit"],
        ["/api/ops", "ls_admin, ls_assessor, ls_decision_officer (role-gated per action)", "~18", "Dashboard, verification queue, re-verification queue, appeals, partners, confidential requirements graph, controls catalogue, freshness/drift demo tools, full audit"],
        ["/api/broker", "broker", "2", "Portfolio (with referral triggers), passport detail (raw claims)"],
        ["/api/carrier", "carrier", "2", "Portfolio (translated readiness), passport detail (translated, confidential-safe)"],
    ], col_widths=[1.3, 2.9, 1.1, 2.0],
)

bb.chapter("9. Running the Platform", number="")
bb.h2("8.1 First-time setup")
bb.diagram(
"""cd Laurelshield-Passport-Platform/app
npm install
cp .env.example .env          # then set SESSION_SECRET and PASSPORT_SIGNING_SECRET
npm run seed                  # idempotent - skips if already seeded
npm start                     # listens on http://localhost:4100 (PORT in .env)""",
    caption="Figure 3: Setup commands")
bb.h2("8.2 Demo accounts (seeded)")
bb.para("All demo accounts share the password Passport#2026, set in src/db/seed.js.")
bb.table(
    ["Role", "Email", "Notes"],
    [
        ["customer_admin (ABC Manufacturing)", "admin@abcmanufacturing.example", "Fully verified: 38/40 controls verified, 2 conditional (accepted compensating controls), passport LS-CRP-CA-000184 issued and shared"],
        ["customer_admin (Meridian Health)", "admin@meridianhealth.example", "Blank-slate sandbox — walk the full Stage 1-9 flow from scratch"],
        ["ls_admin", "admin@laurelshield.internal", "Full access: partner/requirements graph, demo tools, full audit log"],
        ["ls_assessor", "assessor@laurelshield.internal", "Can assess pending verifications; cannot finalize decisions"],
        ["ls_decision_officer", "decisions@laurelshield.internal", "Can finalize verification decisions and resolve appeals; cannot self-assess"],
        ["broker", "broker@granitepeak.example", "Sees only passports explicitly shared with Granite Peak"],
        ["carrier", "underwriter@northstar.example / underwriter@continental.example", "Two independent carriers with different confidential requirement graphs — demonstrates translation without cross-carrier leakage"],
    ], col_widths=[2.0, 2.6, 3.7],
)
bb.h2("8.3 Resetting demo data")
bb.para("Stop the server, delete app/data/laurelshield.db (and the -shm/-wal files if present), then "
        "re-run npm run seed. The seed script is idempotent and will refuse to run against a "
        "non-empty database, which is why the file must be deleted first.")

bb.chapter("10. Production Upgrade Path / Roadmap", number="")
bb.para("Cross-referenced against the Control Gap Register in the Security & Compliance Procedures "
        "document; this is the engineering sequencing view of the same gaps.")
bb.number("Replace HMAC signing with an asymmetric, KMS/HSM-backed keypair so passport recipients can "
          "verify signatures independently of Laurelshield's signing secret.")
bb.number("Migrate SQLite to managed Postgres with encryption at rest and automated backups.")
bb.number("Continue replacing simulated connectors with live, read-only integrations in the priority "
          "order from Section 5.2 of the original research document. Microsoft Graph/Entra is done "
          "(Section 7); EDR (Defender/CrowdStrike) and backup platforms (Veeam/Rubrik) are next, "
          "following the same pattern: a *Connector.js service using the vendor's official SDK/API, a "
          "\"live\" config mode alongside the existing simulated one, and no change to eclEngine, the "
          "passport, or the translation engine, which are all evidence-source-agnostic by design.")
bb.number("Add the Outcome Intelligence layer (Stage 12): a narrow, rights-aware schema capturing "
          "submission/quote/decline/terms data under explicit contractual permission (Section 12.12 of "
          "original research), gated by the rights ledger.")
bb.number("Run a full secure-SDLC pass — SAST/SCA, dependency scanning, DAST/API testing, and an "
          "external penetration test — before onboarding any real customer evidence.")
bb.number("Formalize the certification-mark and accreditation strategy only after the assurance scheme, "
          "impartiality controls, and appeals process have a genuine operating history (Section 11.2 of "
          "original research) — this platform's role-separation design already anticipates that future "
          "state.")

bb.add_footer("Laurelshield — Platform Architecture & Build Documentation")
bb.save(os.path.join(os.path.dirname(__file__), "..", "Laurelshield_Platform_Architecture_and_Build_Documentation.docx"))
print("saved doc3")
