# -*- coding: utf-8 -*-
"""Builds Laurelshield_MOAT_Validation_and_Improvement_Memo.docx"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_helpers import BookBuilder, NAVY, TEAL, STEEL, GREY

bb = BookBuilder()
doc = bb.doc

# ---- Title page ----
t = doc.add_paragraph(); t.alignment = 1
bb._run(t, "LAURELSHIELD", bold=True, color=NAVY, size=30)
st = doc.add_paragraph(); st.alignment = 1
bb._run(st, "MOAT Validation & Strategic Improvement Memo", bold=False, italic=True, color=TEAL, size=15)
sub = doc.add_paragraph(); sub.alignment = 1
bb._run(sub, "An independent review of the Cyber Insurability Assurance research, five concrete\namendments, and a summary of the reference platform built to operationalize it.",
         color=STEEL, size=11)
bb.para("", space_after=20)
meta = doc.add_paragraph(); meta.alignment = 1
bb._run(meta, "Prepared as a second-opinion review of the September 2026 Laurelshield MOAT\nresearch document. Companion documents: Security & Compliance Procedures,\nPlatform Architecture & Build Documentation, Operations Runbook, Role Quick-Start Guides.",
        color=GREY, size=9.5, italic=True)
bb.page_break()
bb.add_toc()

# ---- Section 1 ----
bb.chapter("1. Verdict: Is This a Real Moat?", number="")
bb.para("Short answer: no single idea in the original research document is a moat, and the document "
        "itself already says so. That self-assessment holds up under independent review. The category — "
        "“verify a company's cyber controls and show insurers” — is populated by SPECTRA, HITRUST, "
        "CyberCube, Coalition, CFC, and CyberSurance Canada, among others. A questionnaire, a report "
        "template, a scoring rubric, or even the phrase “Cyber Insurability Assurance” can be copied "
        "in weeks. None of that is defensible on its own.")
bb.para("What is defensible is the compounding stack the document lays out in Section 1.3: canonical "
        "controls, a disciplined evidence-confidence model, a confidential carrier-mapping graph, a "
        "portable signed passport, continuous assurance, embedded distribution, and — the slowest and "
        "most valuable layer — years of underwriting-outcome data tied to verified controls. That "
        "conclusion is correct. This memo does not change it.")
bb.keypoint("The one refinement worth making to the verdict: the scarce asset is not “verification” "
            "(a commodity every carrier and rating platform already performs some version of) but "
            "**independence that a competing carrier will actually trust** — a passport is only "
            "useful across multiple carriers if none of them believe it was shaped by placement or "
            "premium incentives. That neutrality is harder to copy than the technology, because a "
            "carrier-owned or broker-owned version of this product structurally cannot offer it.",
            title="SHARPENED VERDICT")

bb.chapter("2. Where the Original Strategy Is Right", number="")
bb.para("These elements of the September 2026 document are sound as written and this review found no "
        "reason to change them:")
bb.bullet("The ten-layer moat stack (Section 1.3) and its strength ratings (Section 1.2) — realistic, "
          "not inflated.")
bb.bullet("Carrier-neutral, broker-neutral positioning (Key Strategic Decision #1) — the correct starting "
          "posture given how many carrier-owned competitors already exist (Coalition, CFC, BOXX/Zurich).")
bb.bullet("The Evidence Confidence Level model, ECL-0 through ECL-5 (Section 5.4) — a genuinely useful "
          "public standard; publishing it does not weaken the moat because the discipline of applying "
          "it consistently is the hard part, not the scale itself.")
bb.bullet("Treating the Carrier Requirements Graph, scoring weights, and outcome data as trade secrets "
          "rather than trying to patent or trademark them (Section 11.5) — correct instinct; those are "
          "exactly the assets patents and trademarks cannot protect but confidentiality can.")
bb.bullet("The 24-month phased execution sequence (Section 16) — appropriately conservative; it resists "
          "the temptation to over-build software before a single broker or carrier has confirmed the "
          "evidence is useful.")

bb.chapter("3. Five Concrete Improvements", number="")
bb.h2("3.1 Adopt an open credential format; keep the value proprietary")
bb.para("The passport's cryptographic wrapper (Section 5.7) does not need to be a bespoke Laurelshield "
        "format. A carrier or broker asked to trust a signature scheme they cannot inspect will resist "
        "adoption regardless of how good the underlying evidence is. Structuring the passport as a "
        "W3C Verifiable Credential (or an equivalent open, auditable envelope) removes that objection "
        "for free, because the format was never the moat — the confidential mapping and weighting "
        "behind it is. This also makes the eventual Madrid-style multi-jurisdiction and multi-carrier "
        "expansion (Section 11.1) easier to reason about, since the credential's authenticity no longer "
        "depends on trusting Laurelshield's proprietary verifier alone.")
bb.h2("3.2 Build decision-independence into the system, not just the policy")
bb.para("Section 4.1 and 10.1 correctly require that the certification decision be structurally "
        "independent of remediation delivery. The original document treats this as a governance policy. "
        "It should also be a system control: role-based access control that makes it technically "
        "impossible for the same account that proposed an ECL to also finalize the decision, and "
        "impossible for the account that closed a customer's remediation item to be the same account "
        "that approved the original finding. The reference platform built this session enforces exactly "
        "this separation (assessor vs. decision officer) — see Section 5 below.")
bb.h2("3.3 Bring the broker “readiness score” product forward")
bb.para("The product ladder (Section 7.1) sequences the Broker Console after Verified Assessment and "
        "Passport Subscription. CyberCube's Prep Module is already validating broker demand for exactly "
        "this signal today, before any certification scheme matures (Section 2.3). A narrower, "
        "unbundled “readiness snapshot for a known broker relationship” offering should be "
        "tested in the Days 31-90 pilot window (Section 12.3) rather than waiting for Months 7-12.")
bb.h2("3.4 Start the outcome-data rights ledger on day one, not month seven")
bb.para("Section 12.12 and 12.5 schedule structured outcome-data collection for Months 7-12. Outcome "
        "data is the slowest-compounding layer in the entire stack (Section 1.3, Layer 9) — it needs "
        "years, not months, to become defensible. The rights ledger (Section 11.7) and a simple opt-in "
        "outcome-sharing clause should be part of the very first design-partner MSA (Section 12.2), even "
        "though the data pipeline to use it won't be built for months. Every pilot customer who doesn't "
        "sign the opt-in on day one is outcome data Laurelshield can never retroactively collect.")
bb.h2("3.5 Say the quiet part in every carrier conversation")
bb.para("The document's discovery-question list (Section 9.2) asks carriers what evidence they need. It "
        "should also, explicitly and early, ask what would make a carrier trust evidence assembled by a "
        "vendor who is not their own MGA or panel provider. If the honest answer is “nothing, we only "
        "trust our own assessment,” that carrier is not a near-term target regardless of how good the "
        "passport is — better to learn this in a Level 0-1 discovery conversation (Section 9.1) than "
        "after months of a Level 2 pilot.")

bb.chapter("4. One Risk the Original Document Under-Weights", number="")
bb.warning(
    "If Laurelshield's assurance output materially shapes underwriting terms across multiple carriers "
    "at scale, a regulator could eventually try to characterize that role as adjacent to underwriting "
    "support or insurance advice — even though Laurelshield binds no coverage and makes no placement "
    "recommendation. The original document's “must never claim” list (Section 3.3) is the right "
    "first line of defense. The addition this memo recommends: obtain a coverage-counsel opinion on "
    "licensing boundaries before the Months 7-12 carrier-integration push (Section 12.5), not after a "
    "regulator asks the question first.",
    title="REGULATORY CHARACTERIZATION RISK")

bb.chapter("5. The Reference Platform Built This Session", number="")
bb.para("To make Sections 12.2-12.3's “sample Passport prototype,” “one-page architecture,” "
        "and “lightweight secure portal” deliverables concrete before the next Aon/EVC or design-"
        "partner conversation, a working reference implementation now exists: a Node.js/Express API "
        "with a SQLite evidence store and four role-separated web portals (Customer, Assurance "
        "Operations, Broker, Carrier).")
bb.para("It instantiates, end to end, the full Stage 1-12 business process from Section 4: scope "
        "registration, simulated evidence connectors mapped to 40 canonical controls across the ten "
        "domains in Section 6.1, the ECL-0 through ECL-5 confidence model, a confidential Carrier "
        "Requirements Graph with per-partner translation (Section 5.6, 6.3, Appendix B), signed and "
        "revocable passport issuance (Section 5.7), customer-controlled selective disclosure with a full "
        "access log (Section 5.8), and a continuous-assurance freshness engine that automatically "
        "downgrades stale claims (Section 5.9, Stage 11).")
bb.goodpractice(
    "Two simplifications were deliberate and match the original document's own phasing, not oversights: "
    "evidence connectors are simulated rather than live Microsoft Graph/CrowdStrike/Veeam integrations "
    "(the document's own Days 31-90 plan calls for exactly one live connector first, Section 12.3), and "
    "passport signatures use HMAC-SHA256 rather than a KMS/HSM-backed asymmetric keypair (fine for a "
    "single-tenant proof of concept; the upgrade path is documented in the Platform Architecture doc). "
    "Both are one-file changes when the business is ready to move past pilot.",
    title="WHAT WAS SIMPLIFIED AND WHY")
bb.para("Full technical detail is in the companion Platform Architecture & Build Documentation. "
        "Day-to-day operating procedures for running the business processes the platform supports are "
        "in the companion Operations Runbook. Security and privacy control mappings are in the companion "
        "Security & Compliance Procedures document.")

bb.chapter("6. Recommendation", number="")
bb.para("Proceed with the original 24-month execution sequence (Section 16) essentially as written. "
        "Treat the five amendments in Section 3 of this memo as refinements, not a change of direction. "
        "Use the reference platform as the tangible artifact for the “immediate deliverables” list "
        "in Section 16.1 — it is closer to a working Passport and architecture diagram than a slide "
        "deck would be, and it can be demonstrated live in a discovery conversation with a broker or "
        "underwriter without exposing the confidential Carrier Requirements Graph itself.")

bb.add_footer("Laurelshield — MOAT Validation & Improvement Memo")
bb.save(os.path.join(os.path.dirname(__file__), "..", "Laurelshield_MOAT_Validation_and_Improvement_Memo.docx"))
print("saved doc1")
