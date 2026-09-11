# -*- coding: utf-8 -*-
"""Builds Laurelshield_Role_QuickStart_and_Support_Guide.docx"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_helpers import BookBuilder, NAVY, TEAL, STEEL, GREY

bb = BookBuilder()
doc = bb.doc

t = doc.add_paragraph(); t.alignment = 1
bb._run(t, "LAURELSHIELD", bold=True, color=NAVY, size=30)
st = doc.add_paragraph(); st.alignment = 1
bb._run(st, "Role Quick-Start & Support Guide", bold=False, italic=True, color=TEAL, size=15)
sub = doc.add_paragraph(); sub.alignment = 1
bb._run(sub, "First-login walkthroughs for every role, a glossary, an FAQ,\nand troubleshooting for the reference platform",
         color=STEEL, size=11)
bb.page_break()
bb.add_toc()

bb.chapter("1. Before You Start", number="")
bb.para("The platform runs at the address your administrator gives you (locally, this is typically "
        "http://localhost:4100). All demo accounts share the password Passport#2026. Sign in at the "
        "root login page — you will be routed automatically to the correct portal for your role.")

bb.chapter("2. Quick Start: Customer Administrator", number="")
bb.para("Account: admin@abcmanufacturing.example (fully populated example) or "
        "admin@meridianhealth.example (blank-slate sandbox — start here to learn the flow).")
bb.number("Overview tab: confirm your organization name and pick the active assurance boundary from the "
          "scope selector (or create your first one in Scope & Assets).")
bb.number("Scope & Assets: create a scope if you don't have one, describe what's in it, register key "
          "assets, then click Approve Scope.")
bb.number("Evidence & Connectors: add a connector (e.g., Identity Provider). Choose Simulated for an "
          "instant demo, or Live (Microsoft Graph) if your Azure AD administrator has set up an app "
          "registration for you (see the Operations Runbook, Section 5) — then click Test Connection, "
          "then Sync Now, and watch Control Results update.")
bb.number("Control Results: review status, ECL, and coverage per control, grouped by domain.")
bb.number("Remediation: for anything not verified, work the finding, then click Mark Remediated — this "
          "queues it for independent confirmation by Assurance Operations, it does not close "
          "automatically.")
bb.number("Cyber Risk Passport: once you're satisfied with coverage, click Issue New Passport. Check "
          "that the signature shows “verified.”")
bb.number("Sharing & Consent: grant a broker or carrier access to your passport for a defined purpose "
          "and time window. Revoke at any time.")
bb.number("Audit Trail: see every access to your evidence and passports, by whom, and when.")

bb.chapter("3. Quick Start: Assurance Operations (Assessor / Decision Officer / Admin)", number="")
bb.para("Accounts: assessor@laurelshield.internal, decisions@laurelshield.internal, "
        "admin@laurelshield.internal.")
bb.number("Dashboard: see queue depths at a glance — pending verifications, re-verification queue, open "
          "appeals.")
bb.number("As Assessor: open Verification Queue, click Assess on a pending item, set an ECL (0-5) and "
          "notes. You will not see an Approve/Reject button — that requires a Decision Officer.")
bb.number("As Decision Officer: open Verification Queue, click Approve or Reject on an assessed item. "
          "This is the action that actually creates the signed assurance claim.")
bb.number("Re-verification Queue: confirm remediation closures reported by customers. This is "
          "independent confirmation, not a rubber stamp — check the underlying control result first.")
bb.number("As Admin only: Partners & Requirements Graph (confidential — see Section 6 of this guide "
          "before touching it), Controls Catalogue (reference), Continuous Assurance Tools (demo/"
          "testing), Full Audit Log.")

bb.chapter("4. Quick Start: Broker", number="")
bb.para("Account: broker@granitepeak.example.")
bb.number("Portfolio: shows every passport a client has explicitly shared with you, its status, and any "
          "referral triggers (e.g., Unverified MFA, Backup Concern, EDR Gap, External Exposure, "
          "Renewal Readiness).")
bb.number("Click View Evidence Detail on any passport to see the full per-control status, ECL, and "
          "coverage — this is what you'd bring to a placement conversation.")
bb.para("If a client isn't showing up, they haven't granted you access yet, or the grant has expired — "
        "ask them to check Sharing & Consent in their portal.")

bb.chapter("5. Quick Start: Carrier", number="")
bb.para("Accounts: underwriter@northstar.example, underwriter@continental.example (two independent "
        "carriers with different confidential requirement mappings — log into both to see how the same "
        "underlying evidence translates differently).")
bb.number("Portfolio: shows every passport shared with your organization, an overall readiness status "
          "(Ready / Conditional / Evidence Expiring / Material Gap), and a 0-100 readiness score.")
bb.number("Click View Translated Evidence to see each of your organization's own requirements, the "
          "canonical control behind it, the result, and a plain-language evidence note.")
bb.keypoint("You will never see another carrier's requirement wording, thresholds, or weighting — only "
            "your own organization's translated view of the same underlying verified evidence.",
            title="WHAT YOU WILL NOT SEE, AND WHY")

bb.chapter("6. Handling the Confidential Requirements Graph (Admin)", number="")
bb.warning(
    "Partners & Requirements Graph contains competitively sensitive material: minimum ECL thresholds, "
    "evidence freshness windows, and — most sensitive of all — the weight assigned to each requirement "
    "in a carrier's overall readiness score. Never paste a row from this screen into an email, support "
    "ticket, customer-facing document, or a conversation with a different carrier or broker. If a "
    "customer or broker asks “why did this show as Conditional,” answer using the plain-language "
    "evidence_note field only — never the underlying threshold.", title="HANDLE WITH CARE")

bb.chapter("7. Glossary", number="")
bb.table(
    ["Term", "Meaning"],
    [
        ["Scope / Assurance Boundary", "The specific legal entity, network, and application footprint a passport's claims apply to. Identified by a persistent Scope ID (e.g., LS-SCOPE-000184)."],
        ["Canonical Control", "A vendor-neutral statement of a security outcome (e.g., LS-ID-101, Privileged Authentication MFA) that many different insurer questionnaires can map to."],
        ["Evidence Confidence Level (ECL)", "A 0-5 scale describing how strong the evidence behind a claim is: 0 self-attested, 1 documented, 2 observed, 3 technically verified, 4 operationally tested, 5 continuously verified."],
        ["Assurance Claim", "The signed, current record of a control's status, ECL, and coverage for a specific scope. This is what a passport and every partner translation ultimately read from."],
        ["Cyber Risk Passport", "A signed, portable credential summarizing an organization's verified claims for a scope, with a status, freshness, and revocation state."],
        ["Selective Disclosure", "The principle that a recipient only ever sees the minimum claim necessary (status, ECL, date) — never the underlying raw evidence."],
        ["Sharing Grant", "A time-limited, revocable authorization letting one named broker or carrier partner view one specific passport for a stated purpose."],
        ["Carrier Requirements Graph", "The confidential mapping between canonical controls and a specific carrier or broker's own requirements, thresholds, and weighting."],
        ["Freshness / Continuous Assurance", "The mechanism that automatically downgrades or expires a claim once its evidence ages past a control-specific threshold."],
        ["Independent Re-verification", "Confirmation of a remediation's closure by an Assurance Operations role different from whoever implemented the fix."],
        ["Material Gap", "A control result serious enough (low coverage on a high/critical-severity control) to block a clean “verified” passport status."],
    ], col_widths=[1.8, 5.3],
)

bb.chapter("8. Frequently Asked Questions", number="")
bb.h3("Does a Laurelshield passport guarantee my client gets cyber insurance?")
bb.para("No. Laurelshield verifies cybersecurity controls and evidence; brokers and underwriters retain "
        "full insurance placement and underwriting authority. Never represent otherwise in a customer "
        "conversation (Section 3.3 of the original research document).")
bb.h3("Why does a control show Conditional instead of Verified or Material Gap?")
bb.para("Conditional means there is coverage/effectiveness evidence but it falls short of full "
        "verification — typically an accepted compensating control (e.g., a small number of dormant "
        "privileged accounts) rather than a full failure. It is a normal, expected state, not a red flag "
        "by itself.")
bb.h3("Why did a control that was Verified yesterday show Expired today?")
bb.para("Its evidence aged past the control's freshness window (see the Continuous Assurance Tools / "
        "freshness check). Re-sync the relevant connector or re-run the relevant test to restore "
        "verified status.")
bb.h3("What's the difference between a Simulated and a Live connector?")
bb.para("Simulated generates realistic demo evidence instantly, no setup required — used throughout the "
        "seeded demo data. Live authenticates to your organization's real Microsoft Entra tenant via an "
        "Azure AD app registration your own administrator controls, and reads your actual Conditional "
        "Access policies, privileged role membership, and sign-in activity. Both produce evidence in "
        "exactly the same shape; only the source differs.")
bb.h3("My Live connector Test Connection failed with an AADSTS error — what do I do?")
bb.para("Read the message — it's Microsoft's own error text, not a Laurelshield error. The most common "
        "causes are an incorrect Tenant ID or Client ID, a client secret that was never granted admin "
        "consent for the required permissions, or a secret that has expired. See Operations Runbook, "
        "Section 5.")
bb.h3("Can I undo a passport revocation?")
bb.para("No — revocation is permanent by design in the MVP. Issue a new passport once ready.")
bb.h3("Why can't I (as Assessor) approve my own assessment?")
bb.para("Structural separation of duties: the role that proposes an ECL is never the role that finalizes "
        "the decision. This is enforced by the platform, not just a policy — see Operations Runbook, "
        "Section 5.")

bb.chapter("9. Troubleshooting", number="")
bb.table(
    ["Symptom", "Likely Cause", "Fix"],
    [
        ["“authentication_required” on every page", "Session cookie expired or server was restarted (in-memory session store)", "Log in again"],
        ["403 “forbidden” loading another org's scope", "Tenant isolation is working as intended — you are not authorized for that scope", "Confirm you're using the right account; this is not a bug"],
        ["Broker/carrier can't see a client's passport", "No active sharing grant, or it expired/was revoked", "Ask the customer to check Sharing & Consent"],
        ["Manual evidence submission never appears as Verified", "It's sitting in the Verification Queue awaiting assessor + decision officer action", "Log in as an Assurance Operations role and process the queue"],
        ["Seed script says “already seeded — skipping”", "Database already has data", "Delete app/data/laurelshield.db (and -shm/-wal) if you want a clean reset, then re-run npm run seed"],
        ["Server won't start / port already in use", "A previous instance is still running", "Stop the existing node process before starting a new one"],
    ], col_widths=[2.2, 2.2, 2.3],
)

bb.add_footer("Laurelshield — Role Quick-Start & Support Guide")
bb.save(os.path.join(os.path.dirname(__file__), "..", "Laurelshield_Role_QuickStart_and_Support_Guide.docx"))
print("saved doc5")
