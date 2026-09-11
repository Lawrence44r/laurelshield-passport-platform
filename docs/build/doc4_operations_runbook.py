# -*- coding: utf-8 -*-
"""Builds Laurelshield_Operations_Runbook.docx"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_helpers import BookBuilder, NAVY, TEAL, STEEL, GREY

bb = BookBuilder()
doc = bb.doc

t = doc.add_paragraph(); t.alignment = 1
bb._run(t, "LAURELSHIELD", bold=True, color=NAVY, size=30)
st = doc.add_paragraph(); st.alignment = 1
bb._run(st, "Operations Runbook", bold=False, italic=True, color=TEAL, size=15)
sub = doc.add_paragraph(); sub.alignment = 1
bb._run(sub, "Day-to-day procedures for running the Cyber Insurability Assurance\nbusiness process on the reference platform",
         color=STEEL, size=11)
bb.page_break()
bb.add_toc()

bb.chapter("1. Purpose and Audience", number="")
bb.para("This runbook is for the people who operate Laurelshield day to day: Assurance Operations staff "
        "(assessors, decision officers, the scheme manager/admin), and anyone onboarding a new customer, "
        "broker, or carrier relationship. It describes how to actually perform each of the 12 business-"
        "process stages using the reference platform, not just what the stage means in principle.")

bb.chapter("2. Roles and Responsibilities", number="")
bb.table(
    ["Role", "Platform Account Type", "Responsibility", "Cannot Do"],
    [
        ["Scheme Manager / Admin", "ls_admin", "Maintains the control catalogue and Carrier Requirements Graph; runs continuous-assurance demo/ops tools; sole holder of full audit-log visibility", "Nothing is withheld from this role in the MVP — production should split admin into narrower roles (see Platform Architecture & Build Documentation, Roadmap)"],
        ["Technical Assessor", "ls_assessor", "Reviews manual/document evidence in the Verification Queue; proposes ECL, effectiveness, and exceptions", "Cannot finalize a verification decision (approve/reject) — structurally blocked by RBAC"],
        ["Assurance Decision Officer", "ls_decision_officer", "Finalizes verification decisions; closes remediation items after independent re-verification; resolves appeals", "Cannot self-assess a verification before deciding it in the same action — must review an assessor's proposal or the automatic connector evidence"],
        ["Customer Administrator", "customer_admin", "Registers scope, connects evidence sources, runs syncs and operational tests, manages remediation and sharing", "Cannot approve their own manual evidence submissions or close their own remediation items — both require an Assurance Operations role"],
        ["Broker", "broker", "Views only passports explicitly shared by the customer; sees referral triggers", "Cannot see any passport without an active, non-expired sharing grant"],
        ["Carrier", "carrier", "Views only the translated, carrier-specific readiness view for passports shared with them", "Cannot see another carrier's requirement weights, another carrier's shared passports, or raw evidence"],
    ], col_widths=[1.5, 1.2, 2.5, 2.0],
)

bb.chapter("3. Operating Cadence", number="")
bb.table(
    ["Cadence", "Activity", "Owner"],
    [
        ["Continuous", "Freshness engine evaluates evidence age against each control's freshness threshold", "System (customer-triggered check or scheduled sweep)"],
        ["Daily", "Clear the Verification Queue (Section 6); clear the Re-verification Queue (Section 7)", "Assessor / Decision Officer"],
        ["Weekly", "Review open appeals; review the full audit log for anomalous access patterns", "Decision Officer / Admin"],
        ["Monthly", "Review Carrier Requirements Graph entries approaching their review_date; confirm each mapping's source_classification is still accurate", "Admin"],
        ["Quarterly", "Assessor competence review; scheme-document version review (CIA Standard, Assurance Method Manual)", "Scheme Manager"],
        ["Annually", "Full re-verification cycle for controls with 12-month freshness windows (tabletop exercises, policy approvals)", "Assessor"],
    ], col_widths=[1.2, 4.1, 1.9],
)

bb.chapter("4. Procedure: Onboarding a New Customer (Stages 1-2)", number="")
bb.number("Execute the MSA/SOW, confidentiality terms, and evidence-collection consent outside the "
          "platform (contract templates: Section 11.6 of the original research document).")
bb.number("Create the customer_admin user account (currently a direct database insert via seed.js "
          "pattern in the MVP; production requires a self-service signup flow — see Roadmap).")
bb.number("Customer logs in and creates a Scope under Scope & Assets: name, description. The platform "
          "assigns a persistent LS-SCOPE-###### code automatically.")
bb.number("Customer registers assets (applications, cloud subscriptions, networks) under that scope.")
bb.number("Customer (or Assurance Operations, on the customer's behalf) clicks Approve Scope once the "
          "boundary is agreed — this moves the scope from draft to approved status.")
bb.keypoint("Do not approve a scope with material exclusions unresolved. An approved scope is the "
            "boundary every subsequent claim and passport will reference — changing it later requires "
            "a new scope version and re-verification of affected controls.", title="SCOPE DISCIPLINE")

bb.chapter("5. Procedure: Connecting a Live Microsoft Graph Connector (Stage 3)", number="")
bb.para("Optional, per customer, alongside the zero-setup simulated connector. Full Azure-side setup "
        "steps and the exact Graph permissions required are in the Platform Architecture & Build "
        "Documentation, Section 7. This is the operational sequence for actually turning it on.")
bb.number("Confirm the customer's Azure AD administrator has completed the app registration, created a "
          "client secret, added the four required Application permissions, and clicked Grant admin "
          "consent. Laurelshield cannot do this step — it requires the customer's own tenant "
          "administrator.")
bb.number("In Evidence & Connectors, add the Identity Provider connector and choose Live (Microsoft "
          "Graph) instead of Simulated. Enter the Tenant ID, Client ID, and Client Secret the "
          "customer's administrator provided.")
bb.number("Click Test Connection before the first sync. A successful test returns the tenant's display "
          "name — confirm this matches the customer you expect before proceeding, to catch a "
          "copy-paste error pointing at the wrong tenant.")
bb.number("Click Sync Now. Evidence for LS-ID-101 through LS-ID-104 is now collected from the "
          "customer's real Conditional Access policies, directory roles, and sign-in activity instead "
          "of the simulator.")
bb.warning(
    "If Test Connection or Sync fails, the error message returned is Microsoft's own Azure AD/Graph "
    "error text (e.g., AADSTS900021 for an invalid tenant ID, 403 for missing admin consent). Read it "
    "literally before escalating — most failures are a missing admin-consent step or a copy-paste error "
    "in the Tenant/Client ID, not a platform defect.", title="READ THE AZURE ERROR MESSAGE FIRST")
bb.para("A failed live connector is marked error and does not affect any other connector or control on "
        "the scope. Evidence already collected before the failure remains valid until its freshness "
        "window expires normally.")

bb.chapter("6. Procedure: Verification Queue (Stage 5)", number="")
bb.para("Populated by manual/document evidence submissions (governance and data-security controls "
        "without a live connector). Connector-sourced evidence bypasses this queue and computes ECL/"
        "status automatically, because it is machine-verified, not self-attested.")
bb.number("Assessor opens Verification Queue, selects a pending item, reviews the submitted evidence "
          "note.")
bb.number("Assessor clicks Assess, sets the ECL (0-5) per the published scale, and records notes.")
bb.number("Decision Officer (a different account) reviews the assessed item and clicks Approve or "
          "Reject. Approval immediately creates or updates the signed assurance_claims row for that "
          "control; rejection leaves the control unverified and logs the rejection.")
bb.warning("If the same person holds both ls_assessor and ls_decision_officer credentials in a "
           "production deployment, the independence principle (Section 4.1 of the original research "
           "document) is defeated even though the software allowed it for ls_admin in the MVP. "
           "Production account provisioning must assign these as mutually exclusive roles per person.",
           title="OPERATIONAL DISCIPLINE REQUIRED BEYOND THE SOFTWARE")

bb.chapter("7. Procedure: Independent Re-verification of Remediation (Stage 8)", number="")
bb.number("Customer marks a remediation item as remediated in their Remediation tab — this moves the "
          "item to reverification_pending and does not, by itself, close the finding or restore the "
          "assurance claim.")
bb.number("Assurance Operations (assessor, decision officer, or admin) opens the Re-verification Queue.")
bb.number("For a connector-covered control, ask the customer to re-sync the relevant connector first "
          "(the automatic sync is itself the independent, machine-verified re-check). For a manual/"
          "governance control, confirm the corrective evidence directly.")
bb.number("Click Confirm Closure. This records an ECL-2 (observed) verification, re-issues the "
          "assurance claim as verified, and closes the remediation item with the reviewer's identity "
          "attached — never the same identity that implemented the fix.")

bb.chapter("8. Procedure: Passport Issuance and Revocation (Stage 9)", number="")
bb.number("Confirm all material findings are either closed or accepted as documented compensating-"
          "control exceptions (Section 5.7 of the original research: “Significant Exceptions” field).")
bb.number("Customer clicks Issue New Passport for Current Scope. The platform computes overall status "
          "(verified if zero material_gap claims exist, otherwise conditional), assigns a passport code, "
          "and signs the result.")
bb.number("Verify the passport's signature indicator reads “Signature verified — evidence lineage "
          "intact” before sharing it with any counterparty. A failed signature check must never be "
          "shared — treat it as a Section 9 (Security & Compliance doc) incident.")
bb.number("To revoke: customer (or admin, on request) clicks Revoke on the passport card. This is "
          "irreversible in the MVP — a revoked passport must be re-issued from scratch, not un-revoked.")

bb.chapter("9. Procedure: Sharing, Consent, and Revocation (Stage 10)", number="")
bb.number("Customer selects a passport, a recipient (broker or carrier partner), a purpose string, and "
          "an expiry window (hours) under Sharing & Consent.")
bb.number("Grant Access creates a time-limited sharing_grants row. The recipient can now see the "
          "passport the next time they log in — no separate token exchange is required in the MVP "
          "because recipients authenticate as their own organization's user.")
bb.number("The customer's Audit Trail tab shows every grant and every subsequent view by that "
          "recipient. Review this before renewing a relationship with a broker or carrier.")
bb.number("Revoke Access immediately blocks further viewing; it does not retroactively un-disclose "
          "information already viewed, and this should be stated plainly to customers who ask.")

bb.chapter("10. Procedure: Continuous Assurance Monitoring (Stage 11)", number="")
bb.para("In production, the freshness sweep should run on a schedule (e.g., hourly) rather than only "
        "on demand. The MVP exposes it as a button for demonstration purposes.")
bb.number("Customer or admin triggers a freshness check (per-scope from the Customer Portal, or "
          "globally from the Ops Console's Continuous Assurance Tools).")
bb.number("Any claim whose valid_until has passed is marked expired and a new remediation item is "
          "opened automatically, prompting the customer to re-sync or re-verify.")
bb.number("Use Simulate Evidence Drift in the Ops Console only in demo/testing contexts — it backdates "
          "real evidence timestamps and is destructive to the demo dataset's “freshly issued” state.")

bb.chapter("11. Procedure: Carrier Requirements Graph Change Management", number="")
bb.para("This confidential graph (ls_admin only) should never be edited casually — every change alters "
        "how existing passports translate for that partner.")
bb.number("Record the source of the new or changed requirement: public application language, customer-"
          "provided document, broker-provided confidential rule, carrier-provided confidential rule, or "
          "inferred/unvalidated — never mark an inferred mapping as carrier-approved.")
bb.number("Set an effective_date and a review_date; nothing should sit unreviewed indefinitely.")
bb.number("After saving, manually spot-check at least one existing shared passport's translated view "
          "for that partner to confirm the change produced the intended Pass/Conditional/Material Gap "
          "distribution (the original research document's Section 12.11 calls this a “regression "
          "analysis against existing passports” — the MVP performs this as a manual spot-check; "
          "production should automate it).")
bb.number("Confirm no field from this table (weight, min_ecl, max_evidence_age_hours, "
          "source_classification, confidential_notes) has been pasted into any customer-, broker-, or "
          "cross-carrier-facing document, email, or support ticket.")

bb.chapter("12. Procedure: Appeals and Complaints (Section 10.2)", number="")
bb.number("Customer files an appeal from their Appeals tab, referencing the contested verification if "
          "known.")
bb.number("A Decision Officer other than the one who made the original decision reviews the appeal — "
          "in a two-person Assurance Operations team, this may require the Admin to review instead; "
          "document who reviewed in the resolution notes regardless.")
bb.number("Resolve as Uphold (original decision stands) or Overturn (decision reversed — manually "
          "re-run the verification decision workflow to correct the assurance claim).")
bb.number("All appeal outcomes are permanent audit-log entries; there is no “delete appeal” action by "
          "design.")

bb.chapter("13. Incident Response (Operational Steps)", number="")
bb.para("This section operationalizes the Security & Compliance Procedures document's Section 9 for the "
        "people actually on call.")
bb.table(
    ["Step", "Action", "Owner"],
    [
        ["1. Detect", "Freshness alert, anomalous audit-log pattern, or direct report", "Any Assurance Operations role"],
        ["2. Triage", "Confirm scope of exposure using the Full Audit Log (ls_admin) filtered by resource and time window", "Admin"],
        ["3. Contain", "Revoke affected sharing grants and/or passports; if signing-key compromise is suspected, rotate PASSPORT_SIGNING_SECRET in .env and restart the server (this invalidates every outstanding signature); if a live connector's Azure client secret is suspected compromised, have the customer's Azure AD administrator revoke it immediately in the Azure Portal (Certificates & secrets) and issue a new one", "Admin"],
        ["4. Notify", "Customer per MSA/DPA breach clause; affected brokers/carriers per partner agreement; regulatory assessment with privacy counsel", "Scheme Manager"],
        ["5. Recover", "Re-verify affected controls; re-issue passports; record root cause in the audit trail", "Assessor / Decision Officer"],
    ], col_widths=[1.1, 4.4, 1.7],
)

bb.chapter("14. Backup and Disaster Recovery (Current State)", number="")
bb.warning(
    "The MVP has no automated backup. The entire platform state lives in app/data/laurelshield.db. "
    "Until the production upgrade path (Security & Compliance Procedures, Control Gap Register) is "
    "implemented, the operational workaround is: (1) stop the server, (2) copy laurelshield.db, "
    "laurelshield.db-shm, and laurelshield.db-wal to a separate backup location before any risky change "
    "(e.g., a Carrier Requirements Graph migration), and (3) keep the seed script as a known-good "
    "fallback for demo/training environments. This is not an acceptable production DR posture — do not "
    "onboard real customer evidence against this database without first completing the managed-Postgres "
    "migration.", title="NO PRODUCTION BACKUP YET — DO NOT SKIP THIS")

bb.chapter("15. Certification & Assurance Governance Calendar", number="")
bb.table(
    ["Item", "Frequency", "Reference"],
    [
        ["CIA Standard version review", "Semi-annual, or on any control-catalogue change", "Original research Section 10.2"],
        ["Assessor competence review", "Quarterly", "Original research Section 10.2, 12.10"],
        ["Impartiality & conflict-of-interest attestation", "Annual, per Assurance Operations staff member", "Original research Section 4.1, 10.1"],
        ["Carrier Requirements Graph full audit", "Quarterly", "Section 10 of this runbook"],
        ["Appeals process effectiveness review", "Annual", "Original research Section 10.2"],
    ], col_widths=[2.6, 1.8, 2.5],
)

bb.add_footer("Laurelshield — Operations Runbook")
bb.save(os.path.join(os.path.dirname(__file__), "..", "Laurelshield_Operations_Runbook.docx"))
print("saved doc4")
