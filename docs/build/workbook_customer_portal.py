# -*- coding: utf-8 -*-
"""Builds Laurelshield_Customer_Portal_Workbook.docx

Pure exercises, worksheets, and self-assessments companion to
Laurelshield_Customer_Portal_Textbook.docx. No screenshots; the reader is
expected to be logged into a real running Laurelshield instance (their own,
or the demo/reference tenant) while working through Parts B and C.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_helpers import BookBuilder, NAVY, TEAL, STEEL, GREY

bb = BookBuilder()
doc = bb.doc

# ---------------------------------------------------------------- title page
t = doc.add_paragraph(); t.alignment = 1
bb._run(t, "LAURELSHIELD", bold=True, color=NAVY, size=30)
st = doc.add_paragraph(); st.alignment = 1
bb._run(st, "Customer Portal Workbook", bold=False, italic=True, color=TEAL, size=15)
sub = doc.add_paragraph(); sub.alignment = 1
bb._run(sub, "Hands-on exercises, worksheets, and self-assessments",
         color=STEEL, size=11)
bb.page_break()
bb.add_toc()

# =============================================================================
# HOW TO USE THIS WORKBOOK
# =============================================================================
bb.chapter("How to Use This Workbook", number="")

bb.para("This Workbook is the hands-on companion to the **Laurelshield Customer Portal "
        "Textbook**. The Textbook explains the platform in narrative form: how the "
        "12-stage assurance lifecycle works, what the Evidence Confidence Level (ECL) "
        "scale means, how the Laurelshield Suite product names map onto one integrated "
        "application, and what each screen in the customer portal is for. This Workbook "
        "does not re-teach any of that in the same depth. Instead, it gives you worksheets "
        "to fill in, exact steps to click through in a real running portal, reflection "
        "questions that require you to look at your own screen (not a screenshot in a "
        "book), scenario exercises that require judgment rather than a single correct "
        "answer, and a self-graded terminology check.")

bb.para("Where a concept needs a fuller explanation than this Workbook gives it, you will "
        "see a cross-reference such as \"see Textbook Part II\" or \"see Textbook Part "
        "III, Chapter 16.\" That said, this Workbook is written to be fully usable on its "
        "own. Every exercise includes enough grounding that you do not have to stop and go "
        "find the Textbook mid-exercise unless you want the deeper explanation.")

bb.h2("What You Need Before You Start")
bb.para("Parts B and C of this Workbook require access to a running Laurelshield instance. "
        "If you are working through this Workbook as part of your own organization's real "
        "onboarding, use the login and scope your Laurelshield administrator has already "
        "set up for you. If you are using this Workbook to learn the platform before your "
        "own tenant exists, or as part of a training program, use the reference/demo "
        "environment and the demo accounts below. All demo accounts share the password "
        "`Passport#2026`. The reference build runs locally at `http://localhost:4100`; a "
        "production deployment will have a different address, so confirm the correct URL "
        "with your administrator before you begin.")

bb.table(
    ["Role", "Account", "Used In This Workbook For"],
    [
        ["Customer Administrator (fully verified tenant)", "admin@abcmanufacturing.example",
         "Part B: guided walkthrough of every screen against a fully populated, realistic tenant"],
        ["Customer Administrator (blank sandbox)", "admin@meridianhealth.example",
         "Part C: building the entire assurance lifecycle yourself, from zero"],
        ["Assurance Operations (Admin)", "admin@laurelshield.internal",
         "Referenced in Part D scenarios and Part B reflection questions; not required for hands-on exercises in this Workbook"],
        ["Assurance Operations (Assessor)", "assessor@laurelshield.internal",
         "Referenced conceptually; assessing evidence is Assurance Operations' job, not the customer's"],
        ["Assurance Operations (Decision Officer)", "decisions@laurelshield.internal",
         "Referenced conceptually; finalizing a verification is a separate role from assessing it"],
        ["Broker", "broker@granitepeak.example",
         "Used as the sharing-grant recipient in Part B, Exercise B8, and in Part C, Step 7"],
        ["Carrier", "underwriter@northstar.example / underwriter@continental.example",
         "Referenced in Part D scenarios as the eventual recipient of a translated passport view"],
    ], col_widths=[2.1, 2.5, 2.5],
    caption="Table 0.1: Demo account reference for readers using the reference/demo environment."
)

bb.warning("If you are using your own organization's real Laurelshield tenant rather than "
           "the demo environment, do not perform the hands-on steps in Part B and Part C "
           "against production scopes, real connectors, or real supplier records until you "
           "understand what each action does. Issuing a passport, granting sharing access, "
           "revoking a passport, and marking a remediation item are all real, logged actions "
           "with real consequences for your organization's actual assurance record. Practice "
           "on a sandbox scope first if one is available.")

bb.keypoint("Throughout this Workbook you will see references to Suite product names such "
            "as LaurelVerify, LaurelProof, LaurelTrust, and LaurelGuard. In this reference "
            "platform, all of these capabilities live inside one integrated application, "
            "not fifteen separately deployed products. The names describe distinct "
            "responsibilities inside the architecture: a precise vocabulary for talking "
            "about what each part of the system does, and a preview of how each capability "
            "is expected to mature into its own standalone service as Laurelshield scales "
            "from pilot to production. You do not buy or deploy these separately today. "
            "See Textbook Part II for the full naming map and family groupings.",
            title="A NOTE ON PRODUCT NAMES BEFORE YOU BEGIN")

bb.h2("How the Parts Fit Together")
bb.bullet("**Part A, Before You Log In**: pre-work worksheets you can complete with a pen "
          "and no portal access at all. Do this first, even if you already have a login.")
bb.bullet("**Part B, Guided Walkthrough Exercises**: one exercise per portal screen, done "
          "against the fully verified `admin@abcmanufacturing.example` tenant. Pairs 1:1 "
          "with Textbook Part III.")
bb.bullet("**Part C, From-Scratch Exercise**: a single longer exercise that takes you "
          "through the entire assurance lifecycle yourself, from a blank sandbox tenant "
          "(`admin@meridianhealth.example`) to an issued, shared passport.")
bb.bullet("**Part D, Scenario Exercises**: realistic judgment-call situations with "
          "discussion notes, not a rigid answer key. Useful for self-study or for "
          "discussion with a team.")
bb.bullet("**Part E, Self-Assessment**: a terminology check and an ECL-scale recall "
          "exercise, both done from memory first, with an answer key at the end of the "
          "Part so you can self-grade honestly.")
bb.bullet("**Part F, Onboarding Readiness Checklist**: a practical checklist to work "
          "through before your actual onboarding call with Laurelshield's Assurance "
          "Operations team.")

bb.goodpractice("Work through this Workbook in order the first time. Part A's worksheets "
                 "feed directly into what you look for in Part B; Part B's screen-by-screen "
                 "familiarity is what makes Part C's from-scratch exercise fast instead of "
                 "confusing; and Part D's scenarios only land if you already know what the "
                 "screens actually do. After the first pass, the Parts stand alone well "
                 "enough to revisit individually, for example before a renewal, an "
                 "onboarding call, or a team training session.")

# =============================================================================
# PART A - BEFORE YOU LOG IN
# =============================================================================
bb.part_divider("A", "Before You Log In",
                 blurb="Three worksheets you can complete on paper, with no portal access, "
                       "before your organization ever creates a Laurelshield account.")

# ---- Evidence Inventory Worksheet ----
bb.chapter("Evidence Inventory Worksheet")
bb.para("Before you ever log into a Laurelshield portal, the single most useful thing you "
        "can do is take an honest inventory of what security tooling your organization "
        "already has, and where the evidence for each of Laurelshield's ten canonical "
        "control domains would actually come from. Assurance Operations will ask you most "
        "of these questions during onboarding regardless; doing the thinking now, without "
        "a screen in front of you, produces better answers than doing it live on a call.")

bb.analogy("Think of this worksheet the way an insurance adjuster thinks of a home "
           "inventory before a claim, not after one. Nobody wants to be standing in a "
           "burned-out kitchen trying to remember whether the stove was three years old or "
           "five. The organizations that get through onboarding fastest are the ones who "
           "already know, in writing, which system does what and who is responsible for "
           "it, before Assurance Operations ever asks.", title="ANALOGY")

bb.h2("Part 1: Map Your Tools to Laurelshield's Seven Connector Types")
bb.para("Laurelshield collects live evidence through seven connector types. For each row "
        "below, the connector type is already filled in from the canonical list. Fill in "
        "the remaining columns with your organization's real tooling. It is fine, and "
        "common, to leave a row blank if your organization has no tool in that category "
        "yet; a blank row is itself useful information for your onboarding conversation.")
bb.table(
    ["Connector Type", "Your Organization's Actual Tool/Platform", "Who Administers It",
     "Notes (e.g., could this run Live today, or only Simulated?)"],
    [
        ["Identity Provider (e.g., Microsoft Entra/Graph)", "", "", ""],
        ["Endpoint Detection & Response (EDR)", "", "", ""],
        ["Backup & Recovery Platform", "", "", ""],
        ["External Attack Surface Scanner", "", "", ""],
        ["Email Security & DNS", "", "", ""],
        ["Cloud Platform (AWS / Azure / GCP)", "", "", ""],
        ["SIEM / Log Management", "", "", ""],
    ], col_widths=[1.9, 1.9, 1.4, 1.9],
    caption="Table A.1: Connector inventory. Only the Identity Provider connector has a "
            "real Live mode in this reference build today (via Microsoft Graph); every "
            "other connector type is architected the same way but runs in Simulated mode "
            "for demonstration. See Textbook Part II for detail."
)

bb.h2("Part 2: Map Your Evidence to the Ten Canonical Control Domains")
bb.para("Laurelshield's 40 canonical controls are grouped into ten domains. For each "
        "domain, write down what you believe today's real evidence would be, in what "
        "format, and how confident you are that it would actually hold up under "
        "independent review rather than just under self-attestation. Be honest in the "
        "Confidence column; overstating it here only means a rougher surprise later.")
bb.table(
    ["Control Domain", "Primary Control/Tool You Believe Satisfies This Today",
     "Evidence Format Available (policy doc / screenshot / log export / none yet)",
     "Confidence Before Verification (Low / Medium / High)"],
    [
        ["Identity & Access", "", "", ""],
        ["Endpoint", "", "", ""],
        ["Backup & Recovery", "", "", ""],
        ["Logging/Detection & Response", "", "", ""],
        ["Vulnerability & Patch", "", "", ""],
        ["Network & Remote Access", "", "", ""],
        ["Email & Collaboration", "", "", ""],
        ["Cloud", "", "", ""],
        ["Data Security", "", "", ""],
        ["Governance", "", "", ""],
    ], col_widths=[1.5, 2.1, 1.9, 1.6],
    caption="Table A.2: Control domain inventory. Compare this against your organization's "
            "real Control Results screen once your tenant exists; the gaps between what "
            "you wrote here and what actually verifies are exactly what onboarding is for."
)

bb.goodpractice("If a domain's Confidence column says \"High\" but the Evidence Format "
                 "column says \"none yet,\" flag that row specifically for your onboarding "
                 "call. High confidence without evidence is precisely the self-attestation "
                 "gap Laurelshield exists to close, described in the Textbook's opening "
                 "chapter on why cyber insurance applications fail claims investigations.")

# ---- Stakeholder Worksheet ----
bb.chapter("Stakeholder Worksheet")
bb.para("Every control domain, every connector, and every consequential decision in "
        "Laurelshield's lifecycle (approving a scope, issuing a passport, granting a "
        "sharing grant) needs a real named owner inside your organization. This worksheet "
        "exists so that on your onboarding call, and during every exercise in Part B and "
        "Part C of this Workbook, you already know who that person is instead of guessing "
        "or defaulting to \"IT will figure it out.\"")

bb.table(
    ["Domain / Area", "Name", "Role / Title", "Email", "Backup Contact"],
    [
        ["Identity & Access", "", "", "", ""],
        ["Endpoint", "", "", "", ""],
        ["Backup & Recovery", "", "", "", ""],
        ["Logging/Detection & Response", "", "", "", ""],
        ["Vulnerability & Patch", "", "", "", ""],
        ["Network & Remote Access", "", "", "", ""],
        ["Email & Collaboration", "", "", "", ""],
        ["Cloud", "", "", "", ""],
        ["Data Security", "", "", "", ""],
        ["Governance", "", "", "", ""],
        ["Scope approval / assurance boundary decisions", "", "", "", ""],
        ["Connector administration (who can add/adjust connectors)", "", "", "", ""],
        ["Passport issuance decision", "", "", "", ""],
        ["Sharing & Consent approval (who can grant broker/carrier access)", "", "", "", ""],
        ["Supplier inventory owner (procurement / vendor management)", "", "", "", ""],
    ], col_widths=[2.4, 1.3, 1.3, 1.6, 1.2],
    caption="Table A.3: Stakeholder ownership worksheet, ten canonical domains plus five "
            "platform-level decisions."
)

bb.number("Once the table above is filled in, count how many distinct names appear in the "
          "Name column. Write that number here: _____.")
bb.number("Now count how many rows share the same single name across three or more "
          "domains. If that number is high, that person is a single point of failure "
          "for your onboarding timeline; note who they are, and whether a backup contact "
          "genuinely exists or is just a formality: _____________________________.")
bb.number("Identify the one row above where the Backup Contact column is still blank "
          "after your first pass. That is the row to fix before your onboarding call, "
          "not after it.")

bb.warning("Do not leave \"Passport issuance decision\" and \"Sharing & Consent approval\" "
           "assigned to the same overworked person by default just because they filled in "
           "the scope form. Issuing a passport and deciding who sees it are two different "
           "kinds of judgment calls; larger organizations often split them.")

# ---- Onboarding Readiness Self-Assessment ----
bb.chapter("Onboarding Readiness Self-Assessment")
bb.para("Before scheduling an onboarding call with Laurelshield's Assurance Operations "
        "team, use this short self-assessment to gauge whether your organization is "
        "actually ready to get real value out of the first call, rather than spending it "
        "on internal questions that Part A of this Workbook was meant to answer.")
bb.checklist([
    "We have completed the Evidence Inventory Worksheet (Table A.1 and A.2) above.",
    "We have completed the Stakeholder Worksheet (Table A.3) above, and every row has a "
    "named owner, not a department name.",
    "We know which of our real security tools could plausibly feed a Live connector "
    "versus which would only ever produce manual/document evidence today.",
    "We have identified who in our organization can approve or provision an Azure AD "
    "app registration, since that is required for the one connector type with a real "
    "Live mode today (Identity Provider).",
    "We understand that a scope (assurance boundary) means a specific legal entity, "
    "network, and application footprint, and we know roughly what ours should include.",
    "We have a rough list of the third parties we depend on operationally (cloud host, "
    "MSP, payment processor, email security vendor) even if we have not yet formally "
    "registered them anywhere.",
    "We know who at our organization is authorized to decide who outside the company "
    "(a broker or carrier) gets to see our evidence, and for how long.",
    "We are not expecting a Laurelshield passport to itself guarantee that we get "
    "insurance; we understand brokers and carriers retain full placement and "
    "underwriting authority.",
], title="AM WE READY TO ONBOARD?")

bb.keypoint("A \"no\" on any item above is not a reason to delay onboarding. It is a "
            "reason to bring that specific gap to the onboarding call as a named agenda "
            "item, rather than discovering it live and losing the rest of the call to it.")

# =============================================================================
# PART B - GUIDED WALKTHROUGH EXERCISES
# =============================================================================
bb.part_divider("B", "Guided Walkthrough Exercises",
                 blurb="Ten exercises, one per portal screen, done against the fully "
                       "verified `admin@abcmanufacturing.example` tenant. Pairs 1:1 with "
                       "Textbook Part III. Log in before you begin each exercise.")

bb.para("Every exercise in this Part follows the same shape: a short framing of what "
        "you're practicing, numbered steps telling you exactly what to click and look "
        "for, and reflection questions that require you to actually look at your own "
        "screen to answer. There is no answer key for Part B; the correct answer is "
        "whatever your own tenant's screen actually shows. If your numbers differ from "
        "the ones described in Textbook Part III's screenshots, that is expected: this "
        "reference tenant's data may have been reset, re-synced, or extended with your "
        "own practice actions from earlier exercises in this Workbook.")

# ---- B1 Overview ----
bb.chapter("Exercise B1: Overview")
bb.h2("What You'll Practice")
bb.para("Reading the dashboard at a glance: the active assurance boundary, the Assurance "
        "Summary stat row, the Resources table, the 12-Stage Assurance Lifecycle summary "
        "card, and the Quick Actions tiles that jump to every other screen. This is the "
        "screen Grace Thompson, CISO at ABC Manufacturing, would open first on any given "
        "morning.")
bb.h2("Steps")
bb.number("Log in at your instance URL (confirm with your administrator; the local "
          "reference build runs at `http://localhost:4100`) using "
          "`admin@abcmanufacturing.example` / `Passport#2026`.")
bb.number("On the Overview screen, locate the active assurance boundary selector near the "
          "top. Confirm it reads \"ABC Manufacturing (Canadian Operating Entity)\" with "
          "scope code `LS-SCOPE-000184`.")
bb.number("Read the Assurance Summary stat row left to right: Verified Controls, "
          "Conditional, Material Gaps, Evidence Expired, Open Remediation, Passports "
          "Issued.")
bb.number("Find the Resources table beneath the stat row and note what it lists.")
bb.number("Scroll to the 12-Stage Assurance Lifecycle summary card and identify which "
          "stage this tenant's evidence and passport currently sit at.")
bb.number("Click each of the eight Quick Actions tiles one at a time (use your browser's "
          "back button between clicks) and note which portal screen each one opens.")
bb.h2("Reflection Questions")
bb.number("What is the exact Verified Controls count shown for this tenant, and out of "
          "how many total canonical controls?")
bb.number("The stat row likely shows 0 Material Gaps and 0 Evidence Expired. In your own "
          "words, what would have to happen for either of those numbers to move above "
          "zero?")
bb.number("Which single Quick Actions tile would you click first on a Monday morning if "
          "your goal was to confirm nothing had quietly expired over the weekend? Why "
          "that one and not another?")

# ---- B2 Scope & Assets ----
bb.chapter("Exercise B2: Scope & Assets")
bb.h2("What You'll Practice")
bb.para("Understanding the assurance boundary concept in concrete form: a registered "
        "scope, its status, and the real assets listed underneath it. This is Stage 1 of "
        "the 12-stage lifecycle made visible.")
bb.h2("Steps")
bb.number("Navigate to Scope & Assets.")
bb.number("Locate the registered assurance boundary card and read its status badge.")
bb.number("List every asset registered underneath it (for example, an ERP application, an "
          "Azure production tenant).")
bb.number("Scroll to the \"register a new assurance boundary\" form and read every field "
          "without submitting it yet.")
bb.h2("Reflection Questions")
bb.number("How many distinct assets are registered under the current scope, and what "
          "asset types do they represent?")
bb.number("If ABC Manufacturing acquired a second manufacturing plant tomorrow with its "
          "own separate network, would you register it under the existing scope or "
          "create a new one? Justify your answer using the definition of an assurance "
          "boundary.")
bb.number("What status badge does the current scope show, and what do you think would "
          "need to happen for that status to change?")

# ---- B3 Evidence & Connectors ----
bb.chapter("Exercise B3: Evidence & Connectors")
bb.h2("What You'll Practice")
bb.para("This screen is where LaurelProof, the evidence-collection platform, is visible "
        "as a working screen: the seven connector cards, the Operational Tests (ECL-4) "
        "card, and Manual/Document Evidence submission. This is Stage 2 of the lifecycle.")
bb.h2("Steps")
bb.number("Navigate to Evidence & Connectors and confirm the working scope banner at the "
          "top.")
bb.number("Count the seven \"Connected Evidence Sources\" cards and confirm each shows "
          "status CONNECTED.")
bb.number("Read each card's mode badge. Most will read SIMULATED; check whether the "
          "Identity Provider card reads SIMULATED or LIVE in this tenant.")
bb.number("Read the last sync time on the Identity Provider card.")
bb.number("Click Sync Now on the EDR card and note whether its last-sync timestamp "
          "changes.")
bb.number("Open the Operational Tests (ECL-4) card and read what Run Restore Test and Run "
          "Tabletop Exercise each claim to do.")
bb.number("Open Manual/Document Evidence. Read the control picker, the note field, and "
          "the Submit for Assessor Review button, without submitting yet (you'll get a "
          "chance to submit real manual evidence in Part C).")
bb.h2("Reflection Questions")
bb.number("Which of the seven connectors in this tenant is SIMULATED, and which, if any, "
          "shows LIVE? What does that difference actually mean for the evidence quality "
          "behind the controls it feeds?")
bb.number("After clicking Sync Now, did the EDR connector's last-sync time change? Did "
          "anything change in Control Results as a result? Why might a routine sync "
          "sometimes produce no visible change to a control's status?")
bb.number("What is the difference in evidentiary weight between an Operational Test "
          "(ECL-4) like the restore test, and a routine connector sync (ECL-3)? Use the "
          "restore test as your concrete example.")

# ---- B4 Control Results ----
bb.chapter("Exercise B4: Control Results")
bb.h2("What You'll Practice")
bb.para("Reading the full 40-control canonical catalogue, grouped by the ten domains, "
        "with each control's status, ECL, and coverage percentage. This is the single "
        "richest screen in the portal and the one that makes LaurelVerify's scoring "
        "engine visible as a working table.")
bb.h2("Steps")
bb.number("Navigate to Control Results and confirm the table groups controls by all ten "
          "canonical domains.")
bb.number("Within the Identity & Access domain group, find control `LS-ID-101` "
          "(Privileged Authentication MFA). Record its status, ECL, and coverage "
          "percentage.")
bb.number("Scan the full table and list every control currently showing CONDITIONAL "
          "status, by control code.")
bb.number("Find the control or controls with the lowest ECL value anywhere in the table. "
          "Record their codes and ECL values.")
bb.number("Look for any control below 100 percent coverage that is still marked VERIFIED, "
          "and think through why the platform allows that.")
bb.h2("Reflection Questions")
bb.number("How many controls in your tenant currently show ECL-5? What do they have in "
          "common (connector-backed, synced repeatedly over time, a specific domain)?")
bb.number("Pick one CONDITIONAL control from your list above. What do you think is the "
          "most likely reason it is not fully VERIFIED yet?")
bb.number("If you were Grace Thompson preparing for a renewal call next week, which "
          "domain would you spend the most prep time on, and why that one over the "
          "others?")

# ---- B5 Supplier Graph ----
bb.chapter("Exercise B5: Supplier Graph")
bb.h2("What You'll Practice")
bb.para("Third-party dependency tracking: registered suppliers, their criticality, and "
        "the canonical controls each one affects. This is the customer-facing expression "
        "of the AssureGraph concept, and the screen where supplier concentration risk "
        "becomes concrete.")
bb.h2("Steps")
bb.number("Navigate to Supplier Graph.")
bb.number("List every registered supplier and its criticality badge (you should see "
          "CloudCore Managed Hosting, NorthMail Security Gateway, SwiftPay Payment "
          "Processor, and Vantage ERP Support).")
bb.number("Open CloudCore Managed Hosting and read which canonical controls it is linked "
          "to.")
bb.number("Read the \"add a new supplier\" form's fields without submitting, noting what "
          "information it asks for (service description, criticality, linked controls).")
bb.h2("Reflection Questions")
bb.number("Which supplier is marked highest criticality, and which canonical controls "
          "would a failure at that supplier put at risk?")
bb.number("CloudCore Managed Hosting also serves Meridian Health in this reference "
          "dataset. From a carrier's portfolio-level view, why does one supplier serving "
          "two of their insureds matter more than either relationship would matter alone? "
          "This is the concentration risk concept; explain it in your own words.")
bb.number("If SwiftPay Payment Processor disclosed a breach tomorrow, which of your "
          "registered controls would you immediately want to re-check?")

# ---- B6 Remediation ----
bb.chapter("Exercise B6: Remediation")
bb.h2("What You'll Practice")
bb.para("Working an open finding through to Mark Remediated, and understanding what that "
        "button does and does not do (Stage 6 of the lifecycle).")
bb.h2("Steps")
bb.number("Navigate to Remediation.")
bb.number("List every open finding: control, description, owner, due date, and status.")
bb.number("Pick one open item and read exactly what the Mark Remediated action claims to "
          "do before clicking it.")
bb.number("If you are comfortable doing so in this demo tenant, click Mark Remediated on "
          "one genuinely-describable-as-fixed item and observe what status it moves to.")
bb.h2("Reflection Questions")
bb.number("How many open remediation items exist right now, and do any of them map to the "
          "same controls you flagged as CONDITIONAL in Exercise B4?")
bb.number("After clicking Mark Remediated, did the finding disappear from Remediation "
          "immediately, or did it move to a pending-confirmation state? What does that "
          "tell you about separation of duties in this platform?")
bb.number("If you, as the control owner, disagreed with a finding rather than wanting to "
          "fix it, what screen would you use instead of Mark Remediated?")
bb.keypoint("Marking something remediated is not the same as it being verified fixed. The "
            "person who fixes a control can never be the same person who signs off that "
            "it is fixed; that separation of duties is enforced by the platform, not just "
            "policy. See Textbook Part II.")

# ---- B7 Cyber Risk Passport ----
bb.chapter("Exercise B7: Cyber Risk Passport")
bb.h2("What You'll Practice")
bb.para("Reading the customer's actual portable credential: the passport card, its "
        "signature verification line, and the full control list beneath it. This is "
        "LaurelTrust made visible, and Stage 8 of the lifecycle.")
bb.h2("Steps")
bb.number("Navigate to Cyber Risk Passport.")
bb.number("Record the passport code shown (the format looks like `LS-CRP-CA-000184`), its "
          "issue date, and the \"X/40 controls verified\" line.")
bb.number("Confirm the status badge and read the \"Signature verified: evidence lineage "
          "intact\" line.")
bb.number("Scroll the full control list beneath the passport card and cross-check a few "
          "entries against what you recorded in Exercise B4's Control Results table.")
bb.number("Read, without necessarily clicking, the \"Issue New Passport for Current "
          "Scope\" button and the Revoke button. Note what each claims to do.")
bb.h2("Reflection Questions")
bb.number("What exact passport code is issued for this scope? What do you think each "
          "segment of the code encodes (organization/region, entity type, sequence "
          "number)?")
bb.number("If ABC Manufacturing fixed its last CONDITIONAL control tomorrow, would the "
          "existing passport update automatically, or would a new one need to be issued? "
          "What does your answer imply about the word \"revocable\" in the passport's "
          "own definition?")
bb.number("Why do you think revocation is permanent in this platform rather than "
          "reversible? Think about what a carrier would infer from a passport that got "
          "un-revoked.")

# ---- B8 Sharing & Consent ----
bb.chapter("Exercise B8: Sharing & Consent")
bb.h2("What You'll Practice")
bb.para("Granting and understanding a purpose-limited, time-limited sharing grant to an "
        "external partner. This is Stage 9 of the lifecycle, and the screen that makes "
        "selective disclosure a real, working control rather than just a design "
        "principle.")
bb.h2("Steps")
bb.number("Navigate to Sharing & Consent.")
bb.number("List any active sharing grants: recipient, purpose, and expiry date.")
bb.number("Read the \"grant new access\" form: recipient type (broker or carrier), the "
          "specific partner, purpose, and duration fields.")
bb.number("If you are comfortable doing so, grant access to `broker@granitepeak.example` "
          "for a stated purpose (for example, \"renewal placement support\") with a short "
          "expiry, then locate where you would revoke it again.")
bb.h2("Reflection Questions")
bb.number("If you granted Granite Peak Insurance Brokers access \"for renewal placement "
          "support\" expiring in 180 days, what exactly will they be able to see when "
          "they log in as `broker@granitepeak.example`? How does that compare with what a "
          "carrier account like `underwriter@northstar.example` would see for the same "
          "passport?")
bb.number("Why does Laurelshield make the customer, not Laurelshield itself, the party "
          "who decides sharing grants? What would be lost if Laurelshield could share on "
          "the customer's behalf without asking first?")
bb.number("How would you know, without directly asking the broker, whether they actually "
          "looked at what you shared with them?")

# ---- B9 Appeals ----
bb.chapter("Exercise B9: Appeals")
bb.h2("What You'll Practice")
bb.para("Understanding appeals as a due-process mechanism against a verification "
        "decision, distinct from simply resubmitting evidence.")
bb.h2("Steps")
bb.number("Navigate to Appeals and confirm this demo tenant currently shows a mostly "
          "empty state, since no appeals have been filed here.")
bb.number("Read the \"file an appeal\" form: which verification decision it is filed "
          "against, and what evidence or argument fields it asks for.")
bb.number("Pick a specific control from your Exercise B4 notes that you might, "
          "hypothetically, disagree with. Without submitting anything, draft on paper "
          "what argument you would make.")
bb.h2("Reflection Questions")
bb.number("Why does a platform built around independent verification also need an "
          "appeals process? Isn't independent verification supposed to already be "
          "final?")
bb.number("What is the practical difference between appealing a decision here versus "
          "simply resubmitting new manual evidence through Evidence & Connectors "
          "(Exercise B3)? When would you use each path?")
bb.number("If you were a Decision Officer reviewing an appeal, what kind of argument "
          "would make you side with the customer versus uphold the original decision?")

# ---- B10 Audit Trail ----
bb.chapter("Exercise B10: Audit Trail")
bb.h2("What You'll Practice")
bb.para("Reading the chronological, organization-wide record of every action touching "
        "your data, including every time a broker or carrier accessed something. This is "
        "AssuranceLedger made visible, and it is the screen that proves the platform's "
        "transparency claim rather than just asserting it.")
bb.h2("Steps")
bb.number("Navigate to Audit Trail.")
bb.number("Scan the chronological table and identify the categories of events logged "
          "(scope changes, evidence syncs, passport issuance, sharing grants, partner "
          "access).")
bb.number("If you completed the optional grant in Exercise B8, look for that grant event "
          "here. If you also have access to log in separately as "
          "`broker@granitepeak.example`, do so, view the passport, log back in as the "
          "customer admin, and look for that access event here as well.")
bb.number("Note the oldest and newest timestamps currently visible in the table.")
bb.h2("Reflection Questions")
bb.number("Find one entry that was generated by an action you personally took earlier in "
          "this Workbook, such as a connector sync or a sharing grant. Does the "
          "timestamp and description match what you expected?")
bb.number("The Audit Trail is described as proof of a deliberate transparency principle, "
          "not just a security feature. In your own words, whose trust is this feature "
          "actually built for: the customer's, the carrier's, or both? Explain.")
bb.number("If Granite Peak Insurance Brokers viewed your passport but that access never "
          "showed up here, what would that suggest is broken about the platform's core "
          "promise?")

# =============================================================================
# PART C - FROM-SCRATCH EXERCISE
# =============================================================================
bb.part_divider("C", "From-Scratch Exercise: Meridian Health, Zero to Passport",
                 blurb="One long guided exercise. You build the entire assurance "
                       "lifecycle yourself, starting from a blank sandbox tenant.")

bb.chapter("Meridian Health: Zero to Passport")
bb.h2("Before You Begin")
bb.para("`admin@meridianhealth.example` is a blank-slate sandbox account representing a "
        "fictional healthcare organization. Unlike `admin@abcmanufacturing.example`, "
        "which arrives fully populated with a working scope, seven connected connectors, "
        "40 scored controls, and an issued passport, Meridian Health starts with none of "
        "that. That is the point: this exercise is where you build it yourself, one "
        "lifecycle stage at a time, so that every concept from Part B becomes something "
        "you did rather than something you read about.")
bb.warning("If your own organization has a real Laurelshield tenant, do not use it to "
           "practice this exercise unless a dedicated sandbox scope is available. Every "
           "action below (registering a scope, syncing a connector, issuing a passport, "
           "granting access) is a real, logged action with real downstream consequences "
           "in a production tenant.")
bb.analogy("Building a tenant from zero is like setting up a new house's insurance file "
           "the honest way: you do not start by claiming the roof was replaced last year "
           "if it wasn't. You register what actually exists, add evidence as it becomes "
           "available, and let the coverage percentage be whatever it honestly is. A "
           "passport issued early with low coverage is more useful, and more credible "
           "later, than silence followed by a rushed claim of full coverage right before "
           "a renewal.", title="ANALOGY")

bb.h2("Step 1: Register Your First Scope")
bb.para("Predict before you click: will Laurelshield let you register a scope with zero "
        "assets listed, or will it require at least one asset before the scope can be "
        "approved? Write your prediction here: _____________________________.")
bb.number("Log in as `admin@meridianhealth.example` / `Passport#2026`.")
bb.number("Navigate to Scope & Assets.")
bb.number("Fill in a legal entity name and a short description of the assurance boundary "
          "you're defining (for example, \"Meridian Health, U.S. clinical operations\").")
bb.number("Register at least one asset underneath the scope (an application, a cloud "
          "tenant, or a network segment).")
bb.number("Submit the scope registration and confirm its resulting status badge and any "
          "generated Scope ID.")
bb.para("Now confirm your prediction: did the platform require at least one asset, or did "
        "it let you submit an empty scope? Write what actually happened: "
        "_____________________________.")

bb.h2("Step 2: Add and Sync a Connector")
bb.para("Predict before you click: for the connector you're about to add, what do you "
        "expect Control Results to show for its domain before you've synced anything at "
        "all? Write your prediction here: _____________________________.")
bb.number("Navigate to Evidence & Connectors.")
bb.number("Add an Identity Provider connector and choose Simulated mode.")
bb.number("Click Test Connection, then click Sync Now.")
bb.number("Note the resulting last-sync timestamp on the connector card.")
bb.para("Now navigate to Control Results and check the Identity & Access domain. Did "
        "anything change from what you predicted? Write what actually happened: "
        "_____________________________.")

bb.h2("Step 3: Watch Control Results Update")
bb.number("Stay on Control Results and look specifically at the Identity & Access "
          "domain's controls.")
bb.number("Record the ECL and coverage percentage shown for at least two controls in "
          "that domain right now, immediately after your first sync.")
bb.number("Note that a single sync typically does not push a control all the way to "
          "ECL-5; ECL-5 is reserved for sustained, repeated live connector evidence over "
          "time, not a first connection.")
bb.para("Reflection: based on what you just saw, roughly how many syncs over how much "
        "time do you think it would take for a connector-backed control to climb from "
        "ECL-3 toward ECL-5? Explain your reasoning: _____________________________.")

bb.h2("Step 4: Submit One Piece of Manual Evidence")
bb.para("Predict before you click: will the control you're about to submit evidence for "
        "immediately show VERIFIED in Control Results the moment you submit, or will it "
        "show something else first? Write your prediction here: "
        "_____________________________.")
bb.number("Navigate to Evidence & Connectors and open Manual/Document Evidence.")
bb.number("Pick a control not yet covered by your connector, for example a Governance "
          "domain control tied to information security policy.")
bb.number("Write a short, realistic note describing the evidence you are attaching (for "
          "example, \"Information Security Policy v3, approved by the Board, effective "
          "date attached\").")
bb.number("Click Submit for Assessor Review.")
bb.para("Now check Control Results for that control. Did it immediately show VERIFIED? "
        "Write what actually happened, and why: _____________________________.")
bb.keypoint("Manual evidence you submit goes into the Verification Queue, where an "
            "assessor role proposes an ECL and a decision officer role finalizes the "
            "result. A customer administrator can never verify their own submitted "
            "evidence; that is the same separation of duties you saw in Exercise B6.")

bb.h2("Step 5: Mark a Remediation Item")
bb.number("Navigate to Remediation.")
bb.number("In this fresh sandbox tenant, check whether any open findings exist yet. If "
          "none exist, that is expected this early: findings are typically created once "
          "Assurance Operations has assessed enough evidence to identify a gap.")
bb.number("If an open finding does exist, work through Mark Remediated on it and observe "
          "the resulting status, exactly as you did in Exercise B6.")
bb.para("Reflection: if Remediation is empty right now, what specific event earlier in "
        "this exercise (or still to come) do you think would be most likely to create "
        "the first finding here? _____________________________.")

bb.h2("Step 6: Issue Your First Passport")
bb.para("Predict before you click: with only a small handful of controls actually "
        "verified so far, will Laurelshield still let you issue a passport, or will it "
        "block issuance until some minimum coverage threshold is reached? Write your "
        "prediction here: _____________________________.")
bb.number("Navigate to Cyber Risk Passport.")
bb.number("Click \"Issue New Passport for Current Scope.\"")
bb.number("Record the resulting passport code, and compare its format against ABC "
          "Manufacturing's `LS-CRP-CA-000184` pattern from Exercise B7.")
bb.number("Record the \"X/40 controls verified\" line. It will likely be a low number, "
          "since this is a freshly built tenant.")
bb.para("Now confirm your prediction: did the platform block issuance, or did it issue a "
        "low-coverage passport? Write what actually happened: "
        "_____________________________.")
bb.keypoint("A Laurelshield passport is designed to tell the truth even when the truth is "
            "\"early and incomplete.\" It is not a marketing document that only gets "
            "issued once everything looks good; it is a signed, honest snapshot of "
            "exactly where an organization's assurance actually stands right now. A low "
            "coverage percentage on a passport is not a failure of the platform; it is "
            "the platform working correctly.")

bb.h2("Step 7: Share It With a Partner")
bb.number("Navigate to Sharing & Consent.")
bb.number("Grant access to `broker@granitepeak.example` (or another available broker "
          "account), with a stated purpose and a defined expiry window.")
bb.number("Confirm the grant now appears listed as active.")
bb.para("Reflection: given how few controls are verified in this tenant right now, would "
        "you actually share this passport with a real broker at this early stage in "
        "real life? Why or why not? What would change your answer? "
        "_____________________________.")

bb.goodpractice("You have now walked every visible stage of the assurance lifecycle "
                 "yourself: scope registration, evidence collection, control mapping and "
                 "scoring, remediation, passport issuance, and authorized sharing. For the "
                 "narrative explanation of every stage, including the stages that happen "
                 "behind the scenes (canonical control mapping, market readiness "
                 "translation, and continuous assurance), see Textbook Part III.")

# =============================================================================
# PART D - SCENARIO EXERCISES
# =============================================================================
bb.part_divider("D", "Scenario Exercises",
                 blurb="Five realistic situations requiring judgment, not a single "
                       "rigid correct answer. Each includes Discussion Notes rather "
                       "than an answer key, so this Part works for self-study.")

bb.para("These scenarios are grounded in the real platform concepts covered in Parts A "
        "through C. Read each setup, then work through the questions yourself, in "
        "writing, before reading the Discussion Notes underneath. The Discussion Notes "
        "offer guidance and reasoning, not a single correct answer; real judgment calls "
        "like these rarely have only one defensible response.")

# ---- D1 ----
bb.chapter("Scenario D1: The 24-Hour Broker Request")
bb.para("It's Thursday afternoon. Grace Thompson, CISO at ABC Manufacturing, gets an "
        "email from her broker at Granite Peak Insurance Brokers: the renewal deadline "
        "is tomorrow morning, and the underwriter has asked for an updated evidence "
        "package before they'll finalize terms. Grace checks the portal. Her Identity "
        "Provider connector last synced six days ago, and one control, EDR Coverage, "
        "currently shows CONDITIONAL rather than VERIFIED.")
bb.number("What do you do in the next hour? List your first three actions in order.")
bb.number("How would you use the purpose and expiry fields in Sharing & Consent for this "
          "specific, time-pressured request?")
bb.number("What would you deliberately choose not to do, even though it might be "
          "tempting given the deadline?")
bb.h4("Discussion Notes")
bb.para("Re-syncing every connector you have access to is fast, safe, and immediately "
        "improves evidence freshness; that is a reasonable first move within the hour. "
        "A CONDITIONAL status on EDR Coverage is not, by itself, a red flag; it is a "
        "normal state meaning there is coverage and effectiveness evidence that falls "
        "short of full verification, often because of an accepted compensating control. "
        "Issuing a fresh passport that honestly shows one CONDITIONAL control alongside "
        "everything else that is VERIFIED is more credible to an underwriter, and holds "
        "up better under future scrutiny, than any attempt to make the CONDITIONAL "
        "control look resolved before it actually is. What you should not do is ask an "
        "assessor to rush a full re-verification cycle in an hour; independent "
        "re-verification exists specifically so that it cannot be compressed under "
        "deadline pressure from the party being assessed.")

# ---- D2 ----
bb.chapter("Scenario D2: A Critical Supplier Discloses a Breach")
bb.para("CloudCore Managed Hosting, the supplier ABC Manufacturing registered in "
        "Exercise B5 and linked to several canonical controls, sends a breach "
        "notification to all its customers. In this reference dataset, CloudCore also "
        "serves Meridian Health, meaning a single incident at CloudCore is not an "
        "isolated event from a carrier's portfolio-level point of view.")
bb.number("Which of your own canonical controls, the ones linked to CloudCore in your "
          "Supplier Graph, are you now most worried about?")
bb.number("Would you expect your own passport's status to change automatically because "
          "of CloudCore's breach, or does something have to trigger that change? Explain "
          "your reasoning.")
bb.number("What would you proactively want to tell your broker or carrier, and through "
          "which screen would you do it?")
bb.h4("Discussion Notes")
bb.para("Laurelshield's Supplier Graph records that a control depends on a given "
        "supplier; it does not continuously monitor that supplier's own security posture "
        "in real time. This means your passport will not automatically downgrade the "
        "moment CloudCore discloses a breach; your own passport reflects your own "
        "evidence, not your supplier's. That is exactly why the supplier link matters: it "
        "tells you which of your own controls to go re-verify immediately, rather than "
        "waiting for something automatic to happen. Proactively submitting manual "
        "evidence or a note explaining what you've confirmed about your own exposure, "
        "and considering whether to notify your broker before they ask, is generally the "
        "stronger posture. Also worth knowing: if a carrier holds multiple insureds who "
        "all depend on CloudCore, they may already be seeing this concentration risk from "
        "their own portfolio view, meaning your proactive disclosure may be landing on an "
        "audience that already has partial visibility, which argues for getting ahead of "
        "it rather than waiting.")

# ---- D3 ----
bb.chapter("Scenario D3: MFA Marked Conditional Instead of Verified")
bb.para("An assessor reviews `LS-ID-101`, Privileged Authentication MFA, after the "
        "Identity Provider connector's latest sync. Instead of marking it VERIFIED, they "
        "mark it CONDITIONAL, with a note explaining that three privileged accounts were "
        "found without MFA enrollment during the sync, even though MFA is enforced "
        "policy-wide for the vast majority of accounts.")
bb.number("Do you file an appeal against this assessment, or do you remediate the "
          "underlying issue first? What tips your decision one way or the other?")
bb.number("What is the practical difference in outcome and timeline between the appeal "
          "path and the remediation path here?")
bb.number("Would you proactively disclose the CONDITIONAL status to a carrier before "
          "they ask about it, or wait? Why?")
bb.h4("Discussion Notes")
bb.para("In almost every case like this, remediation is the faster and more direct path: "
        "identify the three dormant privileged accounts, either deprovision them or "
        "enroll them in MFA, and resubmit evidence for the assessor to review, exactly as "
        "practiced in Exercise B6. An appeal is the right tool only if you believe the "
        "assessor misread the underlying evidence itself, for example if those three "
        "accounts were actually already deprovisioned before the sync ran and the "
        "connector data was stale; appealing is a challenge to the finding's accuracy, "
        "not a way to argue that a real gap doesn't matter. On disclosure: since every "
        "access to your evidence is already logged in your own Audit Trail and visible to "
        "you, and since a carrier viewing a translated passport will see the CONDITIONAL "
        "status regardless, there is little practical benefit to waiting to be asked. "
        "Being the one who explains a CONDITIONAL finding, in your own words, tends to "
        "land better than having it discovered cold.")

# ---- D4 ----
bb.chapter("Scenario D4: A Passport About to Expire From Stale Evidence")
bb.para("The freshness engine flags that the Backup & Recovery domain's evidence is "
        "aging toward its expiry window. A renewal call is scheduled in ten days. If "
        "nothing changes, the relevant controls will move from VERIFIED toward Evidence "
        "Expired before that call happens.")
bb.number("What is your first move today, and why today rather than closer to the "
          "renewal call?")
bb.number("Which connector sync or operational test would you prioritize, and what would "
          "make you choose one over the other?")
bb.number("If you cannot refresh the evidence in time, what do you say to your broker, "
          "and when do you say it?")
bb.h4("Discussion Notes")
bb.para("The whole point of the freshness engine, the mechanism behind \"verified today "
        "doesn't mean verified forever,\" is that it gives you a window to act before "
        "expiry rather than after it. Acting today, rather than waiting until closer to "
        "the renewal call, gives Assurance Operations time to process any resulting "
        "queue items and gives you a buffer if the first sync attempt fails or a "
        "connector needs re-authorization. Between a routine Sync Now and a full "
        "Operational Test like a restore test, prioritize whichever one is faster to "
        "execute and still produces meaningful evidence; a restore test is stronger "
        "evidence (ECL-4) but typically takes longer to arrange than a connector sync "
        "(ECL-3). If you genuinely cannot refresh in time, telling your broker proactively "
        "and early, rather than letting them discover an expired control mid-call, is "
        "almost always the better outcome; a broker who is warned in advance can plan "
        "around it, while one who discovers it live has no time to help you.")

# ---- D5 ----
bb.chapter("Scenario D5: A New Line of Business Changes the Scope")
bb.para("ABC Manufacturing acquires a small e-commerce subsidiary. The subsidiary runs "
        "its own AWS account, handles customer payment data directly, and was not part "
        "of the assurance boundary registered when ABC Manufacturing first onboarded to "
        "Laurelshield.")
bb.number("Does the new subsidiary belong inside the existing scope, or does it warrant "
          "registering a new one? What in the definition of an assurance boundary drives "
          "your answer?")
bb.number("Which canonical control domains are most likely to become newly relevant "
          "because of this acquisition, and why those specifically?")
bb.number("What new entries would you expect to add to your Supplier Graph as a result?")
bb.h4("Discussion Notes")
bb.para("An assurance boundary is defined as a specific legal entity, network, cloud "
        "tenant, and application footprint. A newly acquired subsidiary with its own "
        "separate AWS account and a materially different data flow (direct handling of "
        "customer payment data, which the parent manufacturing business likely never "
        "handled at all) is a strong argument for registering it as its own scope rather "
        "than silently folding it into the existing one; doing otherwise risks making the "
        "existing passport's claims less precise about what they actually cover. On "
        "control domains, expect Cloud (a new AWS account needs its own evidence, not "
        "inherited evidence from the parent's cloud footprint) and Data Security (payment "
        "data handling is a materially different risk than manufacturing operations data) "
        "to become newly relevant quickly, alongside whichever Identity & Access and "
        "Network domain controls apply to the subsidiary's own environment. On suppliers, "
        "a payment processor almost certainly needs to be registered and linked to the "
        "relevant Data Security and Governance controls, following the same pattern as "
        "SwiftPay Payment Processor in the existing ABC Manufacturing tenant.")

# =============================================================================
# PART E - SELF-ASSESSMENT
# =============================================================================
bb.part_divider("E", "Self-Assessment",
                 blurb="A terminology check and an ECL-scale recall exercise, both done "
                       "from memory first. The answer key is at the end of this Part, "
                       "clearly separated, so you can grade yourself honestly.")

# ---- Terminology ----
bb.chapter("Terminology Self-Assessment")
bb.para("Write your own definition of each term below from memory, in the blank space "
        "after it, before checking the Glossary or the Textbook. This is most useful if "
        "you genuinely try to recall each one rather than skipping straight to the "
        "answer key at the end of this Part.")
bb.number("Assurance Boundary / Scope: _______________________________________________")
bb.number("Canonical Control: ______________________________________________________")
bb.number("Evidence Confidence Level (ECL): ________________________________________")
bb.number("Evidence Connector: _____________________________________________________")
bb.number("Operational Test: _______________________________________________________")
bb.number("Manual / Document Evidence: _____________________________________________")
bb.number("Control Domain: _________________________________________________________")
bb.number("Cyber Risk Passport: ____________________________________________________")
bb.number("Selective Disclosure: ___________________________________________________")
bb.number("Sharing Grant: __________________________________________________________")
bb.number("Passport Revocation: ____________________________________________________")
bb.number("Material Gap: ___________________________________________________________")
bb.number("Conditional Status: _____________________________________________________")
bb.number("Independent Re-verification: ____________________________________________")
bb.number("Separation of Duties (in this platform): ________________________________")
bb.number("Supplier Concentration Risk: ____________________________________________")
bb.number("Continuous Assurance / Freshness: _______________________________________")
bb.number("Audit Trail: ____________________________________________________________")

bb.warning("Do not read Chapter \"Part E Answer Key\" at the end of this Part until you "
           "have genuinely attempted every term above from memory. Skipping ahead "
           "defeats the purpose of a self-assessment.")

# ---- ECL recall ----
bb.chapter("ECL Scale Recall Exercise")
bb.para("Write the six Evidence Confidence Level tiers, ECL-0 through ECL-5, from memory, "
        "before checking the Textbook or the answer key at the end of this Part.")
bb.number("ECL-0: __________________________________________________________________")
bb.number("ECL-1: __________________________________________________________________")
bb.number("ECL-2: __________________________________________________________________")
bb.number("ECL-3: __________________________________________________________________")
bb.number("ECL-4: __________________________________________________________________")
bb.number("ECL-5: __________________________________________________________________")
bb.para("Once you've written all six from memory, check your answers against the answer "
        "key in the next chapter. Circle any tier you got wrong or vague, and re-read "
        "that tier's description in Textbook Part II before moving on to Part F.")

# ---- Answer key ----
bb.chapter("Part E Answer Key")
bb.warning("This chapter is the answer key for the two self-assessment exercises above. "
           "Do not read past this point until you have attempted both from memory.")

bb.h2("Terminology Answer Key")
bb.table(
    ["Term", "Definition"],
    [
        ["Assurance Boundary / Scope", "The specific legal entity, network, cloud tenant, and application footprint that a passport's claims apply to; identified by a persistent Scope ID such as LS-SCOPE-000184."],
        ["Canonical Control", "A vendor-neutral statement of a security outcome (for example, LS-ID-101, Privileged Authentication MFA) that many different insurer questionnaires can map to, rather than being tied to any one carrier's wording."],
        ["Evidence Confidence Level (ECL)", "A 0-5 scale describing how much trust a piece of evidence deserves: 0 not assessed, 1 self-attested, 2 reviewed document/policy evidence, 3 live connector evidence, 4 operational test evidence, 5 sustained repeated live connector evidence over time."],
        ["Evidence Connector", "A read-only integration that pulls evidence from a real system (Identity Provider, EDR, Backup & Recovery, External Attack Surface Scanner, Email Security & DNS, Cloud Platform, or SIEM/Log Management), running in either Simulated or Live mode."],
        ["Operational Test", "A real exercise performed to prove a control actually works, not just that it's configured, such as a restore test or an incident response tabletop; produces ECL-4 evidence."],
        ["Manual / Document Evidence", "Evidence submitted directly by the customer (a policy document, a screenshot, a written note) rather than pulled automatically by a connector; goes to the Verification Queue for assessor and decision officer review."],
        ["Control Domain", "One of the ten groupings the 40 canonical controls are organized into: Identity & Access, Endpoint, Backup & Recovery, Logging/Detection & Response, Vulnerability & Patch, Network & Remote Access, Email & Collaboration, Cloud, Data Security, Governance."],
        ["Cyber Risk Passport", "A signed, revocable, portable credential listing every canonical control's status, ECL, coverage percentage, and validity window for a given scope."],
        ["Selective Disclosure", "The principle that a recipient only ever sees the minimum information necessary; a broker or carrier never sees raw underlying evidence, only a translated claim."],
        ["Sharing Grant", "A purpose-limited, time-limited authorization letting one named broker or carrier partner view one specific passport; can be revoked by the customer at any time."],
        ["Passport Revocation", "Permanently withdrawing a passport's validity; permanent by design in this platform, meaning a new passport must be issued rather than un-revoking the old one."],
        ["Material Gap", "A control result serious enough (typically low coverage on a high or critical-severity control) to block a clean VERIFIED passport status."],
        ["Conditional Status", "A normal, expected state where there is coverage and effectiveness evidence for a control, but it falls short of full verification, often because of an accepted compensating control."],
        ["Independent Re-verification", "Confirmation that a remediation was actually fixed, performed by an Assurance Operations role different from whoever implemented the fix."],
        ["Separation of Duties (in this platform)", "The structural rule that the person who assesses evidence (Assessor) is never the same person who finalizes a decision (Decision Officer), and the person who fixes a finding is never the same person who confirms it's fixed."],
        ["Supplier Concentration Risk", "The portfolio-level risk that a single supplier serving multiple insureds turns one supplier incident into a multi-policy loss event for a carrier."],
        ["Continuous Assurance / Freshness", "The mechanism that automatically flags or expires a claim once its evidence ages past a control-specific freshness window, reflecting that verification is a point-in-time fact, not a permanent one."],
        ["Audit Trail", "The chronological, organization-wide log of every action touching a customer's data, including every time a broker or carrier accessed something, visible back to the customer at all times."],
    ], col_widths=[2.0, 5.1],
)

bb.h2("ECL Scale Answer Key")
bb.table(
    ["Tier", "Definition"],
    [
        ["ECL-0", "Not assessed / no evidence exists yet for this control."],
        ["ECL-1", "Self-attestation: someone said so, and nobody has independently checked it. The weakest tier, but still explicitly and permanently distinguishable in the platform from verified fact."],
        ["ECL-2", "Reviewed document or policy evidence, with an assessor's observation attached."],
        ["ECL-3", "Live connector evidence: an actual API pull from the real system (for example, Entra, an EDR platform, a backup platform), synced multiple times for consistency."],
        ["ECL-4", "Operational test evidence: a real restore test was performed, a real incident response tabletop was run. Proof the control works, not just that it's configured."],
        ["ECL-5", "The highest tier, reached by controls with sustained, repeated live connector evidence over time."],
    ], col_widths=[1.1, 6.0],
)
bb.keypoint("Higher ECL makes it harder for a claims investigator, after a breach, to "
            "credibly argue that a control wasn't really there. That is the entire "
            "practical reason the scale exists.")

# =============================================================================
# PART F - ONBOARDING READINESS CHECKLIST
# =============================================================================
bb.part_divider("F", "Onboarding Readiness Checklist",
                 blurb="A practical checklist to work through before your real "
                       "onboarding call with Laurelshield's Assurance Operations team.")

bb.chapter("Onboarding Readiness Checklist")
bb.para("This checklist is meant to be used, not just read: print it, fill it in, and "
        "bring it to your onboarding call. Each section below maps to a real "
        "onboarding conversation topic. Completing the Part A worksheets earlier in this "
        "Workbook makes most of this checklist fast to fill in.")

bb.h2("Identity Provider Access")
bb.para("The Identity Provider connector is the only connector type with a real Live "
        "mode today, via Microsoft Graph. It requires an Azure AD app registration under "
        "OAuth2 client-credentials, controlled by your own organization.")
bb.checklist([
    "We have identified who at our organization can create or already owns an Azure AD "
    "app registration.",
    "We know whether that person can grant admin consent for the required Graph "
    "permissions themselves, or needs to escalate to someone else.",
    "We understand this connector will read Conditional Access policy, privileged role "
    "membership, and sign-in activity, and we've confirmed there's no internal policy "
    "objection to that scope of read access.",
    "We have a fallback plan (Simulated mode) if the Live app registration isn't ready "
    "in time for our first onboarding call.",
], title="IDENTITY PROVIDER READINESS")

bb.h2("EDR, Backup, Cloud, and Email Admin Access")
bb.para("Every other connector type runs in Simulated mode in this reference build today, "
        "but the onboarding conversation will still cover what real access would look "
        "like as each connector matures toward its own Live mode, and what evidence you "
        "can already provide manually in the meantime.")
bb.checklist([
    "We know who administers our EDR platform and could speak to its coverage and "
    "configuration on a call.",
    "We know who administers our Backup & Recovery platform, and whether a real restore "
    "test has ever actually been performed and documented (not just configured).",
    "We know who administers our Cloud Platform accounts (AWS, Azure, or GCP) and could "
    "describe our production footprint at a high level.",
    "We know who administers our Email Security & DNS configuration (SPF, DKIM, DMARC, "
    "and any gateway product).",
    "We know who administers our SIEM or log management platform, if one exists.",
    "For any of the above we do not yet have a tool for, we know that and can say so "
    "plainly on the call rather than guessing.",
], title="CONNECTOR ADMIN ACCESS READINESS")

bb.h2("Supplier Inventory Readiness")
bb.para("The Supplier Graph is most useful once populated with real third-party "
        "dependencies and their criticality. You do not need a perfect list before your "
        "first call, but a rough one saves time.")
bb.checklist([
    "We have a rough list of the third parties our operations genuinely depend on: "
    "cloud/hosting provider, MSP, payment processor, email security vendor, and any "
    "others.",
    "We have a rough sense of each one's criticality (critical, high, medium, low) "
    "based on what would happen operationally if that supplier had an incident.",
    "We know, or can find out quickly, which of our canonical controls each supplier "
    "actually affects.",
], title="SUPPLIER INVENTORY READINESS")

bb.h2("Stakeholder Sign-off")
bb.para("This section is a direct callback to the Stakeholder Worksheet completed in "
        "Part A. If that worksheet has gaps, resolve them before the call rather than "
        "during it.")
bb.checklist([
    "Every one of the ten canonical control domains has a named, reachable owner (not "
    "just a department).",
    "We have identified who is authorized to approve a scope registration.",
    "We have identified who is authorized to decide when to issue a passport.",
    "We have identified who is authorized to grant or revoke sharing access to a broker "
    "or carrier.",
    "We have confirmed that no single overworked individual is silently the sole owner "
    "of more than half these decisions.",
], title="STAKEHOLDER SIGN-OFF READINESS")

bb.h2("Scope Definition Readiness")
bb.para("Coming to the call with a rough first draft of your assurance boundary saves an "
        "entire round-trip conversation.")
bb.checklist([
    "We can describe, in one or two sentences, which legal entity, network, and "
    "application footprint we want our first scope to cover.",
    "We have a rough list of the specific assets (applications, cloud tenants, network "
    "segments) we expect to register under that scope.",
    "If we operate more than one legal entity or geography, we have thought about "
    "whether we need one scope or several, and can explain our reasoning.",
], title="SCOPE DEFINITION READINESS")

bb.h2("General Call Logistics")
bb.checklist([
    "We know who from our organization is attending the onboarding call, and they are "
    "the actual decision-makers identified in the Stakeholder Worksheet, not proxies.",
    "We have completed the Evidence Inventory Worksheet and Stakeholder Worksheet from "
    "Part A and will bring them to the call.",
    "We have completed at least the Part B guided walkthrough exercises against the "
    "demo tenant, so portal terminology is already familiar going into the call.",
    "We have a secure way to store and share the real login credentials our "
    "administrator will issue us, once our own tenant exists.",
], title="GENERAL LOGISTICS READINESS")

bb.keypoint("None of the readiness signals above are pass/fail gates; Laurelshield's "
            "Assurance Operations team onboards organizations at every stage of "
            "maturity. Their purpose is to make sure the limited time on your first call "
            "goes toward decisions only your organization can make, rather than basic "
            "groundwork this Workbook already let you do on your own schedule.")

bb.add_footer("Laurelshield Customer Portal Workbook")
bb.save(os.path.join(os.path.dirname(__file__), "..", "Laurelshield_Customer_Portal_Workbook.docx"))
print("saved workbook")
