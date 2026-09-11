# -*- coding: utf-8 -*-
"""Builds Laurelshield_Customer_Portal_Help_Guide.docx (Calibri 10pt).

Detailed screen-by-screen help documentation for the Laurelshield customer
portal, covering the nine sections requested: Overview, Scope & Assets,
Evidence & Connectors, Supplier Graph, Remediation, Cyber Risk Passport,
Sharing & Consent, Appeals, Audit Trail. Content mirrors the in-app Help
tab (public/customer/app.js -> HELP_TOPICS) so the live portal and this
document never disagree, plus real screenshots from the running app.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_helpers import BookBuilder, NAVY, TEAL, STEEL, GREY

SHOTS = os.path.join(os.path.dirname(__file__), "..", "screenshots", "customer")

bb = BookBuilder(base_font="Calibri", base_size=10)
doc = bb.doc

# ---------------------------------------------------------------- title page
t = doc.add_paragraph(); t.alignment = 1
bb._run(t, "LAURELSHIELD", bold=True, color=NAVY, size=30)
st = doc.add_paragraph(); st.alignment = 1
bb._run(st, "Customer Portal Help Guide", bold=False, italic=True, color=TEAL, size=15)
sub = doc.add_paragraph(); sub.alignment = 1
bb._run(sub, "A detailed, illustrated, screen-by-screen reference for every section\nof your Laurelshield customer portal",
         color=STEEL, size=11)
bb.page_break()
bb.add_toc()

bb.chapter("Introduction", number="")
bb.para("This guide documents every screen in the Laurelshield customer portal in the order you will "
        "normally use them: from getting oriented on Overview, through defining scope and connecting "
        "evidence, to issuing and sharing your Cyber Risk Passport, and finally the transparency screens "
        "(Appeals and Audit Trail) that let you contest a decision or see exactly who has looked at your "
        "data. Each chapter follows the same structure: what the screen is for, what you will see on it, "
        "step-by-step instructions for using it, and one or more callout boxes for warnings, key points, "
        "or practical tips.")
bb.keypoint("This guide covers the Customer Portal only, the role used by your organization's own security "
            "or IT leadership. Laurelshield Assurance Operations staff, brokers, and carriers see different "
            "portals with different screens, not covered here.")
bb.para("A companion Textbook and Workbook go deeper on the underlying cyber insurance concepts (Evidence "
        "Confidence Levels, canonical controls, the Laurelshield Suite product family) and provide hands-on "
        "exercises. This guide is deliberately procedural: it tells you what to click and what to expect, "
        "with less theory.")

# --------------------------------------------------------------- chapter data
TOPICS = [
    dict(num="1", key="overview", title="Overview", shot="01-overview.png",
         purpose="Your assurance cockpit: a single-glance summary of where your organization stands "
                 "right now, across every registered assurance boundary (scope).",
         sees=[
             "Quick Actions: one-click tiles to every other section of the portal.",
             "Active assurance boundary selector. If you manage more than one scope (for example, "
             "separate legal entities or regions), switch between them here. Every number on this page "
             "reflects whichever scope is currently selected.",
             "Assurance Summary: live counts of Verified, Conditional, Material Gap, and Evidence "
             "Expired controls, Open Remediation items, and Passports Issued.",
             "Resources: a table of your scopes and issued passports. Click any row to jump straight to it.",
             "A reminder of the 12-stage assurance lifecycle at the bottom of the page.",
         ],
         steps=[
             "If you manage more than one scope, use the dropdown to pick which one you are reviewing.",
             "Scan the Assurance Summary card row first. Material Gaps and Evidence Expired are the two "
             "numbers that need your attention before anything else.",
             "Click a Quick Actions tile, or a row in Resources, to jump directly into that part of the "
             "workflow.",
         ],
         tip="Make Overview your starting point every time you log in. It is designed so a busy CISO can "
             "tell in ten seconds whether anything needs attention today."),
    dict(num="2", key="scope", title="Scope & Assets", shot="02-scope-assets.png",
         purpose="Defines the assurance boundary: exactly which legal entity, network, cloud tenant, and "
                 "applications are being assessed. No evidence gets collected against anything until it "
                 "exists here.",
         sees=[
             "Your registered scope(s), each with a status badge (draft or approved) and a version number.",
             "The assets registered inside each scope: type (network, endpoint, cloud subscription, "
             "application, data store), name, criticality, environment, and data classification.",
             "A form to register a new assurance boundary.",
         ],
         steps=[
             'Click "Register New Assurance Boundary." Give it a name that identifies the legal entity and '
             'jurisdiction, for example "ABC Manufacturing (Canadian Operating Entity)." This exact name is '
             "what later appears on your Cyber Risk Passport.",
             "Describe what is inside it: networks, applications, cloud tenants, and sites in scope.",
             "Register your key assets underneath it. At minimum, register your most critical applications "
             "and cloud subscriptions.",
             'Click "Approve Scope" once your asset list is materially complete. Evidence can technically be '
             "added to a draft scope, but most downstream workflows assume an approved one.",
         ],
         warning="A scope left in draft with an incomplete asset list will make your Control Results and "
                 "Passport look less complete than your real environment. Keep the asset list current as "
                 "your environment changes; this is not a one-time setup step.",
         tip="One scope per legal entity or operating region is the usual pattern. If your organization has "
             "genuinely separate business units with different security postures, register each as its own "
             "scope rather than blending them into one."),
    dict(num="3", key="evidence", title="Evidence & Connectors", shot="03-evidence-connectors.png",
         purpose="This is how Laurelshield actually learns about your environment: connectors, operational "
                 "tests, and manual documentation, each carrying source, timestamp, and hash-based chain "
                 "of custody.",
         sees=[
             "Connected Evidence Sources: up to seven connector types (Identity Provider, Endpoint "
             "Detection & Response, Backup & Recovery, External Attack Surface Scanner, Email Security & "
             "DNS, Cloud Platform, SIEM/Log Management), each showing connection status, last sync time, "
             "and whether it is running in Simulated or Live mode.",
             "Operational Tests: buttons to run a restore test or an incident response tabletop exercise, "
             "the only way to reach ECL-4 evidence, proof a control actually works, not just that it is "
             "configured.",
             "Manual/Document Evidence: for governance and data-security controls that have no live "
             "connector.",
         ],
         steps=[
             'Click "+ Add a Connector" and choose the type that matches a real system in your environment.',
             "Choose Simulated for an instant demo, or Live if you want real evidence. Today only the "
             "Identity Provider connector supports Live mode, via a Microsoft Graph (Entra ID) app "
             "registration. You will need a Tenant ID, Client ID, and Client Secret from your Azure AD "
             "administrator, with Policy.Read.All, Directory.Read.All, RoleManagement.Read.Directory, and "
             "AuditLog.Read.All permissions, admin-consented.",
             'For a Live connector, click "Test Connection" first to confirm the credentials work before '
             "running a full sync.",
             'Click "Sync Now." This is what actually pulls evidence and updates Control Results; adding a '
             "connector alone does nothing until you sync it.",
             "For controls with no connector, use Manual/Document Evidence: pick the control, describe the "
             "evidence (for example, a board-approved policy document), and submit. This creates ECL-1 "
             "evidence that sits pending until an assessor reviews it; it does not become a verified claim "
             "automatically.",
         ],
         warning="Adjusting a simulated connector's posture does not take effect until you click Sync Now "
                 "again. Nothing updates silently; this is deliberate so every change to your evidence has "
                 "an explicit, logged trigger.",
         tip="Sync your connectors on a regular cadence, not just once. Evidence has a freshness window per "
             "control, and a control that goes too long without a refresh will show as expired even if "
             "nothing about your actual environment changed."),
    dict(num="4", key="suppliers", title="Supplier Graph", shot="05-supplier-graph.png",
         purpose="Your extended attack surface: the third parties you depend on that could cause a loss "
                 "even if every one of your own controls is perfect.",
         sees=[
             "Registered suppliers with a criticality badge (critical, high, medium, low), the service "
             "they provide, and which canonical controls that relationship affects.",
             "A form to add a new supplier and link it to one or more controls.",
         ],
         steps=[
             "Click Add Supplier for each meaningful third party: cloud hosting, managed IT/MSP, payment "
             "processing, email security, and any vendor with access to in-scope systems or data.",
             "Fill in service, business process supported, data touched, region, contract owner, recovery "
             "dependency, and alternative provider if one exists.",
             "Select every canonical control this supplier relationship affects. For example, a cloud "
             "hosting provider typically touches your Cloud domain controls and your backup controls.",
             'Set criticality honestly. "Critical" plus "no alternative provider" is exactly the '
             "combination that matters most.",
         ],
         keypoint="At the portfolio level, Laurelshield flags concentration risk: a supplier that serves "
                   "multiple insureds at once, meaning a single incident at that supplier becomes a "
                   "multi-policy loss event. This is genuinely useful information for your carrier, not "
                   "just paperwork. Keeping this list accurate and current is one of the highest-leverage "
                   "things you can do in the portal.",
         tip="Revisit this list whenever you change vendors or renew a major contract. A stale supplier "
             "graph understates your real dependency risk."),
    dict(num="5", key="remediation", title="Remediation", shot="06-remediation.png",
         purpose="Tracks and closes findings the right way, with a structural rule that the person who "
                 "fixes something is never the person who signs off that it is fixed.",
         sees=[
             "A table of open findings: control, finding description, owner, due date, and status (open, "
             "reverification pending, closed, overdue).",
         ],
         steps=[
             "Work the finding with whoever owns that control area in your organization.",
             'Click "Mark Remediated" once the fix is in place. This does not close the finding; it queues '
             "it for independent re-verification.",
             "An Assurance Operations reviewer, someone independent of the fix, confirms closure. Only "
             "then does the item move to Closed.",
         ],
         keypoint="This separation of duties is enforced by the platform, not just a policy on paper. It "
                   "exists because self-graded remediation is exactly the kind of gap a claims investigator "
                   'looks for after a breach: "you said you fixed it, who confirmed that?"',
         tip="Do not wait until a renewal deadline to start working your remediation queue. The independent "
             "confirmation step takes real turnaround time on Laurelshield's side; build in a buffer."),
    dict(num="6", key="passport", title="Cyber Risk Passport", shot="07-passport.png",
         purpose="Your signed, portable, revocable credential: the thing you actually hand to a broker or "
                 "carrier instead of re-answering their questionnaire from scratch.",
         sees=[
             "Your passport code (for example LS-CRP-CA-000184), issue date, overall status (verified or "
             "conditional), a signature-verified confirmation line, and the full table of every canonical "
             "control with its status, ECL, and coverage percentage.",
             'An "Issue New Passport" button and, on an existing passport, a "Revoke" button.',
         ],
         steps=[
             "Once you are satisfied with your control coverage on Overview and Control Results, click "
             '"Issue New Passport for Current Scope."',
             "Check the status. Verified means no material gaps; Conditional means some controls need "
             "attention but nothing severe enough to withhold the passport.",
             'Review the "Signature verified" line; this confirms the passport has not been tampered with '
             "since issuance.",
             "Use Sharing & Consent to actually give a partner access to it.",
         ],
         warning="Revocation is permanent in this build; there is no undo. Only revoke a passport you "
                 "genuinely want to withdraw, then issue a fresh one when ready.",
         tip="A passport is a snapshot in time, not a subscription. If your controls change materially "
             "after issuance, especially anything moving toward Material Gap, issue a new passport rather "
             "than letting a stakeholder keep relying on a stale one."),
    dict(num="7", key="sharing", title="Sharing & Consent", shot="08-sharing-consent.png",
         purpose="You decide who can see your passport, for what purpose, and for how long. Nothing is "
                 "visible to a broker or carrier until you explicitly grant it.",
         sees=[
             "Your active sharing grants: recipient, purpose, and expiry date.",
             "A form to grant new access, and a Revoke action on any existing grant.",
         ],
         steps=[
             "Pick a broker or carrier partner from the list.",
             'Set a purpose, for example "renewal placement support" or "pre-bind underwriting review," and '
             "an expiry window.",
             'Click "Share." The partner can now view a translated version of your passport for as long as '
             "the grant is active.",
             'Click "Revoke" on any grant at any time to end access early.',
         ],
         keypoint="A carrier never sees your raw canonical results. Laurelshield translates your verified "
                   "controls into that carrier's own proprietary question wording and thresholds, a "
                   "confidential mapping layer that is never exposed to you, other carriers, or brokers. "
                   "You only ever see the resulting readiness classification; the underlying weighting is "
                   "the carrier's and Laurelshield's trade secret. This is by design; it keeps the process "
                   "fair to every insured being compared.",
         tip="Every time a partner actually opens your shared passport, it is logged. Check Audit Trail if "
             "you want to know whether they have actually looked yet, not just whether you sent the invite."),
    dict(num="8", key="appeals", title="Appeals", shot="09-appeals.png",
         purpose="Your right to contest a verification decision you believe is wrong.",
         sees=[
             "Any appeals you have filed and their status: open, under review, upheld, or overturned.",
             "A form to file a new appeal.",
         ],
         steps=[
             "Click File an Appeal.",
             "If the appeal relates to a specific verification, reference it.",
             "Explain your reason clearly and specifically: which control, what evidence you believe was "
             "misread or overlooked, and why.",
             "An Assurance Operations Decision Officer, independent of the original verification, reviews "
             "and either upholds or overturns the finding.",
         ],
         tip='Vague appeals take longer to resolve than specific ones. "I disagree with the finding on '
             'LS-ID-104" resolves faster than "this seems wrong."'),
    dict(num="9", key="audit", title="Audit Trail", shot="10-audit-trail.png",
         purpose="Radical transparency: a record of every action touching your organization's data, "
                 "including every time a broker or carrier partner actually accessed something you shared "
                 "with them.",
         sees=[
             "A chronological table: when, who (or which system process), what action, and what resource "
             "it touched.",
         ],
         steps=[
             'Use this whenever you need to answer "did anyone outside our organization look at this, and '
             'when."',
             "Cross-reference with Sharing & Consent if a partner's access seems unexpected: confirm the "
             "grant that authorized it is still one you intended to have active.",
         ],
         tip="This is not a marketing claim; it is a genuine log. If a broker or carrier tells you they "
             "reviewed your evidence before a decision, this is where you can confirm it actually happened, "
             "and when."),
    dict(num="10", key="account", title="Account Settings", shot="11-account-settings.png",
         purpose="Manage how you sign in and how the portal looks: appearance, multi-factor authentication, "
                 "and, if your organization has one, single sign-on. These are personal to your login, not "
                 "shared settings for your organization.",
         sees=[
             "Appearance: switch between Light and Dark. This is saved to this browser only; it does not "
             "sync to other devices or other people at your organization.",
             "Multi-Factor Authentication: enable a second factor using any TOTP authenticator app "
             "(Microsoft Authenticator, Google Authenticator, 1Password, Authy, and similar), see how many "
             "one-time recovery codes you have left, disable MFA, or generate a fresh set of recovery codes.",
             "Single Sign-On, shown only for accounts tied to an organization: configure your own identity "
             "provider so everyone at your organization can sign in without ever having a Laurelshield "
             "password.",
         ],
         steps=[
             'Open Account Settings from the gear icon next to "Sign out," top right of every page.',
             "Under Appearance, click Light or Dark. The whole portal switches instantly; there is no save "
             "button.",
             'Under Multi-Factor Authentication, click "Enable MFA," scan the QR code with your '
             "authenticator app (or enter the setup key by hand), then type the 6-digit code it generates "
             "to confirm.",
             "Immediately after enabling MFA, save the 10 recovery codes shown on screen somewhere safe, "
             "for example a password manager. Each one signs you in exactly once if you ever lose access "
             "to your authenticator app.",
             'If your organization runs its own identity provider, fill in Single Sign-On: your email '
             'domain, issuer URL, client ID, and client secret, then click "Test Configuration" to confirm '
             "Laurelshield can actually reach it before saving.",
         ],
         warning="Recovery codes and the MFA setup key are shown only once, at the moment they are "
                 "generated. If you lose them and also lose your authenticator device, an administrator "
                 "will need to help you back into your account.",
         keypoint="Single sign-on signs in an existing Laurelshield account matched by email address; it "
                   "does not create new accounts or grant roles by itself. Who has an account at all, and "
                   "what role they hold, is still decided separately when the account is provisioned.",
         tip="Enabling MFA is one of the highest-value five minutes you can spend in this portal: it "
             "protects the same login that can issue, share, and revoke your organization's Cyber Risk "
             "Passport.",
         shot2="12-dark-mode.png",
         shot2_caption="Figure 10.2: The Overview screen in Dark mode, switched on from Account Settings. "
                        "Every heading, stat, badge, and link remains fully legible against the near-black "
                        "background."),
]

for topic in TOPICS:
    bb.chapter(f"{topic['num']}. {topic['title']}")
    bb.para(topic["purpose"], bold=False)
    bb.h3("What You'll See")
    for s in topic["sees"]:
        bb.bullet(s)
    bb.h3("Step by Step")
    for s in topic["steps"]:
        bb.number(s)
    bb.h3("On Screen")
    bb.screenshot(os.path.join(SHOTS, topic["shot"]),
                   caption=f"Figure {topic['num']}.1: The {topic['title']} screen, shown here for a fully "
                           f"verified demo tenant (ABC Manufacturing Ltd.).")
    if topic.get("shot2"):
        bb.screenshot(os.path.join(SHOTS, topic["shot2"]), caption=topic.get("shot2_caption"))
    if topic.get("keypoint"):
        bb.keypoint(topic["keypoint"])
    if topic.get("warning"):
        bb.warning(topic["warning"])
    if topic.get("tip"):
        bb.goodpractice(topic["tip"], title="TIP")

bb.chapter("Getting Further Help", number="")
bb.para("If something in the portal does not match this guide, confirm you are looking at the right "
        "screen for your role, screens differ between the customer, broker, carrier, and Assurance "
        "Operations portals, and check with your Laurelshield administrator whether your environment has "
        "been updated since this guide was produced.")
bb.checklist([
    "Confirm you are signed in as a customer_admin user, not a broker, carrier, or Assurance Operations account.",
    "Confirm the active assurance boundary selected on Overview is the one you expect.",
    "For a Live connector issue, check the exact error text; it usually comes directly from Microsoft, not Laurelshield.",
    "For anything else, contact your Laurelshield administrator or Assurance Operations contact.",
], title="BEFORE YOU CONTACT SUPPORT")

bb.add_footer("Laurelshield Customer Portal Help Guide")
bb.save(os.path.join(os.path.dirname(__file__), "..", "Laurelshield_Customer_Portal_Help_Guide.docx"))
print("saved help guide")
