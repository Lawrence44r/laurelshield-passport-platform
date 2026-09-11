# -*- coding: utf-8 -*-
"""Builds Laurelshield_Customer_Portal_Textbook.docx

A full customer-facing textbook covering (I) why evidence matters in cyber
insurance, (II) the Laurelshield Suite product-name vocabulary, and (III) a
guided, screenshot-by-screenshot walkthrough of the Customer Portal, plus a
consolidated glossary.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_helpers import BookBuilder, NAVY, TEAL, STEEL, GREY

bb = BookBuilder()
doc = bb.doc

SHOT = lambda name: os.path.join(os.path.dirname(__file__), "..", "screenshots", "customer", name)

# ============================================================== TITLE PAGE
t = doc.add_paragraph(); t.alignment = 1
bb._run(t, "LAURELSHIELD", bold=True, color=NAVY, size=30)
st = doc.add_paragraph(); st.alignment = 1
bb._run(st, "Customer Portal Textbook", bold=False, italic=True, color=TEAL, size=15)
sub = doc.add_paragraph(); sub.alignment = 1
bb._run(sub, "Understanding cyber insurance evidence, the Laurelshield Suite, and a\n"
             "guided walkthrough of every screen a customer administrator will use",
         color=STEEL, size=11)
bb.page_break()
bb.add_toc()

# ======================================================================
# PART I
# ======================================================================
bb.part_divider(1, "Understanding Cyber Insurance & Why Evidence Matters",
                 blurb="Before touching a single screen in the Laurelshield Customer Portal, "
                       "a customer administrator needs a working mental model of the problem the "
                       "platform exists to solve. This part builds that model: how cyber insurance "
                       "underwriting actually works today, why self-attestation breaks down under "
                       "pressure, what evidence and confidence really mean, why a vendor-neutral "
                       "control catalogue matters, and what happens when a claim exposes the gap "
                       "between what an organization said and what was true.")

# ---------------------------------------------------------------- CH 1
bb.chapter("1. What Cyber Insurance Actually Covers, and How Underwriting Works")
bb.para("Cyber insurance is a contract that transfers a defined slice of financial risk from an "
        "organization to an insurer, in exchange for a premium. A typical policy responds to costs "
        "arising from a covered cyber event: forensic investigation, legal counsel, breach "
        "notification to affected individuals, credit monitoring, ransom negotiation and payment "
        "where permitted, business interruption losses, and third-party liability claims from "
        "customers, partners, or regulators. None of this is exotic; it is the same basic "
        "insurance logic as property or liability coverage, applied to a newer category of loss.")
bb.para("What makes cyber insurance different from, say, commercial auto insurance is the "
        "underwriting problem. An auto insurer can send an adjuster to physically inspect a "
        "vehicle, pull a driving record from a motor vehicle authority, and check a VIN against a "
        "database it does not control. A cyber insurer underwriting a mid-market manufacturer has "
        "none of that. It cannot walk into the applicant's data center (which may not exist; it "
        "may be a cloud tenant). It cannot independently query whether multi-factor authentication "
        "is actually enforced on every privileged account. It has almost no external, trustworthy "
        "signal about the true state of the applicant's security posture. So it falls back on the "
        "one tool it has always had: asking.")
bb.para("The underwriting application for a cyber policy is a long questionnaire. It asks whether "
        "the organization enforces MFA, encrypts backups, segments its network, trains employees on "
        "phishing, patches critical vulnerabilities within a defined window, and dozens of similar "
        "questions across identity, endpoint, backup, logging, vulnerability management, network "
        "architecture, email security, cloud configuration, data protection, and governance. The "
        "underwriter reads the answers, applies actuarial judgment and pricing models built from "
        "industry loss data, and decides whether to offer coverage, at what premium, with what "
        "sublimits, and subject to what warranties. If the applicant's answers suggest strong "
        "controls, pricing improves. If they suggest weak controls, pricing worsens or coverage is "
        "declined outright.")
bb.keypoint("Underwriting is fundamentally a bet made on the accuracy of information the insurer "
            "did not independently verify. Every dollar of pricing precision an insurer thinks it "
            "has is only as good as the honesty and accuracy of the questionnaire answers beneath "
            "it. This is the seam that cyber insurance has struggled with since the product "
            "category existed, and it is the seam Laurelshield is built to close.")
bb.analogy("Think of underwriting a cyber policy the way a bank underwrites a mortgage from a "
           "self-reported income statement, with no pay stubs, no employer verification, and no "
           "credit bureau to cross-check against. The bank can still price a loan off that "
           "statement, and most of the time the borrower is being honest. But the bank has no way "
           "to catch the exceptions before money changes hands, only after a missed payment forces "
           "a closer look. Cyber insurance underwriting has operated the same way: pricing built on "
           "trust, with the verification step pushed to the one moment nobody wants it, the claim.")
bb.para("Grace Thompson is the CISO at ABC Manufacturing Ltd., a mid-market Canadian manufacturer "
        "and the running example used throughout this textbook. When Grace's broker submits ABC's "
        "renewal application to a market of carriers, each carrier's underwriter reads the same "
        "self-reported answers and prices independently against their own proprietary model. Grace "
        "has no way to prove, at the moment of underwriting, that what she wrote is true beyond her "
        "own signature on the form. That gap between claimed and provable is the subject of the "
        "rest of this chapter.")
bb.h2("Why insurers cannot simply verify everything themselves")
bb.para("It would be reasonable to ask why an insurer does not just hire assessors to inspect every "
        "applicant before binding a policy. The honest answer is economics and speed. A full "
        "independent technical assessment of even a mid-market organization's identity, endpoint, "
        "backup, network, cloud, and logging posture is a multi-week engagement requiring "
        "specialized skills. Insurers underwrite thousands of applications a year, many of them "
        "small enough that the premium would never cover the cost of that engagement. The industry "
        "response has been risk-based sampling: a small number of applicants (usually larger, "
        "higher-limit accounts) get a scan-based or questionnaire-plus-call level of scrutiny, and "
        "the rest are priced on the honor system, with the insurer's real leverage held in reserve "
        "for the moment a claim is filed and a forensic investigator finally looks under the hood.")
bb.goodpractice("A CISO preparing a renewal should assume that whatever a forensic investigator "
                 "could discover after a breach, an underwriter is implicitly pricing as if they "
                 "already knew it. The gap between what you wrote on the application and what a "
                 "forensic team would find during an incident response engagement is exactly the "
                 "gap that determines whether a claim gets paid smoothly or fought line by line.")

# ---------------------------------------------------------------- CH 2
bb.chapter("2. The Self-Attestation Problem")
bb.para("Self-attestation is not dishonesty. Most applicants filling out a cyber insurance "
        "questionnaire genuinely believe their answers are true when they write them. The problem "
        "is that security posture is not a fixed fact you can simply recall accurately; it is a "
        "moving target across dozens of systems, configurations, and human processes, and most "
        "organizations do not have a single reliable source of truth for it at the moment the "
        "form is being filled out. A CISO answering \"is MFA enforced on all privileged accounts\" "
        "is often answering from memory of a policy decision made months earlier, not from a live "
        "query of the identity provider run that afternoon. Between the policy decision and the "
        "application deadline, a service account may have been exempted for a legacy integration, "
        "a contractor account may have been provisioned without MFA to unblock a project, or a "
        "conditional access policy may have been quietly relaxed to fix an outage and never "
        "restored. None of that is malicious. All of it makes the attestation wrong.")
bb.warning("The moment self-attestation becomes dangerous is not when the applicant lies. It is "
           "when the applicant is confidently, honestly wrong, submits the application, a breach "
           "happens, and a forensic investigation working from actual system logs and configuration "
           "exports finds a materially different picture than the one on file. From the insurer's "
           "side, intent is often irrelevant to the contractual question of whether a warranty in "
           "the policy was breached.")
bb.para("There is a second, more structural reason insurers do not fully trust the application even "
        "when they believe the applicant is acting in good faith: self-attestation is not "
        "distinguishable from fabrication using the artifact alone. A checked box that says "
        "\"backups are tested quarterly\" looks identical whether that testing genuinely happens on "
        "a fixed cadence with documented results, or whether nobody has actually run a restore test "
        "in two years and the box was checked because it seemed like the right answer. The "
        "questionnaire format itself destroys the information an underwriter would need to tell "
        "these two very different realities apart. This is precisely the design flaw Laurelshield's "
        "Evidence Confidence Level scale exists to fix, covered in depth in the next chapter: it "
        "keeps self-attested claims permanently, visibly distinguishable from independently "
        "verified ones, rather than flattening both into an identical checked box.")
bb.analogy("A self-attested control is like a resume line that says \"fluent in French.\" It might "
           "be completely true. It might be true of the applicant's French three years and one "
           "unused semester ago. It might be generous. An interviewer who actually needs a French "
           "speaker does not take the resume line at face value; they ask the candidate to conduct "
           "part of the interview in French. Cyber insurance underwriting, historically, has been "
           "an interview conducted entirely in the applicant's native language, taking every resume "
           "line as spoken fact.")
bb.para("The self-attestation problem compounds with scale. A questionnaire has perhaps sixty to a "
        "hundred yes/no or short-answer questions. An organization the size of ABC Manufacturing has "
        "dozens of interconnected systems, hundreds of user accounts, multiple cloud subscriptions, "
        "and a stack of vendor relationships, each a potential point where the real answer to a "
        "question diverges from the written one. No CISO, however diligent, can hold the current, "
        "accurate state of all of it in working memory while filling out a form under deadline "
        "pressure from a broker. The industry has effectively been asking a single human to serve "
        "as both the sensor and the reporter for a system far too large for either role to be done "
        "reliably from memory.")
bb.keypoint("The fix is not to blame the applicant for imperfect memory. It is to move the source of "
            "truth away from memory and self-report entirely, toward evidence pulled directly from "
            "the systems in question, refreshed on a cadence, and kept distinguishable by how "
            "strongly it was verified. That shift, evidence replacing recollection, is the single "
            "idea underneath everything Laurelshield does.")
bb.h2("What insurers do instead, today, to compensate")
bb.para("In the absence of a better mechanism, carriers have layered partial fixes onto the "
        "self-attestation model: warranty language that makes coverage conditional on the accuracy "
        "of specific answers, external attack surface scans purchased from third-party data "
        "providers to spot-check a handful of externally visible facts (open ports, expired "
        "certificates, exposed services), and, for larger accounts, a call with the applicant's "
        "security team before binding. Each of these helps at the margin. None of them closes the "
        "fundamental gap, because none of them produces continuously fresh, control-by-control "
        "evidence that is available before the application is filed, stays current afterward, and "
        "can be shown, unmodified, to any carrier evaluating the same risk. That is the specific "
        "gap Laurelshield occupies.")

# ---------------------------------------------------------------- CH 3
bb.chapter("3. Evidence and Confidence: The Evidence Confidence Level (ECL) Scale")
bb.para("If self-attestation is the disease, evidence is the cure, but not all evidence is equally "
        "trustworthy, and pretending otherwise creates a new, subtler version of the same problem. "
        "A document that says a control exists is evidence. A live system confirming the control's "
        "current configuration is also evidence. A recorded test proving the control actually works "
        "under real conditions is also evidence. These three are not interchangeable, and an "
        "assurance platform that flattened them into a single \"verified\" checkbox would simply "
        "recreate the self-attestation problem one layer down. Laurelshield's answer is the "
        "Evidence Confidence Level, or ECL: a 0-to-5 scale that stays attached to every piece of "
        "evidence and every control result, so a reader always knows not just what was claimed but "
        "how strongly it was established.")
bb.h2("The six tiers, in full")
bb.para("**ECL-0, Not Assessed.** No evidence exists yet for this control in this scope. This is "
        "not a failure state; it is an honest starting point, distinct from a control that was "
        "checked and found lacking.")
bb.para("**ECL-1, Self-Attestation.** Someone stated that the control exists or is effective, and "
        "nobody has independently checked it. This is the weakest tier the platform will record, "
        "and critically, it is never silently upgraded. A self-attested claim stays visibly "
        "labeled ECL-1 until stronger evidence replaces it. This is a deliberate design principle: "
        "the platform is strict about never letting a claim look more trustworthy than the evidence "
        "actually supports.")
bb.para("**ECL-2, Reviewed Document/Policy Evidence.** A policy document, procedure, or similar "
        "artifact was submitted and an assessor reviewed it and made an observation. This is "
        "stronger than a bare claim because a qualified second party has looked at something "
        "concrete, but it still describes what the organization says it does on paper, not a "
        "live confirmation that the systems are actually configured that way today.")
bb.para("**ECL-3, Live Connector Evidence.** An actual, automated pull was made from the real "
        "system in question (for example, a query against Microsoft Entra ID via Microsoft Graph, "
        "an EDR console, or a backup platform's API), and that pull has been repeated multiple "
        "times with consistent results. This is qualitatively different from a document: it is the "
        "system reporting its own current state, not a person describing what they believe the "
        "system's state to be.")
bb.para("**ECL-4, Operational Test Evidence.** A real test was performed and its outcome recorded: "
        "an actual backup restore was attempted and succeeded, an actual incident response "
        "tabletop exercise was run with the team that would respond to a real incident. ECL-4 "
        "answers a harder question than ECL-3. ECL-3 confirms a control is configured; ECL-4 "
        "confirms it works when exercised, which is the question a claims investigator actually "
        "cares about after a real incident.")
bb.para("**ECL-5, Sustained Live Verification.** The highest tier, reserved for controls with "
        "repeated live connector evidence sustained over time, so the confidence is not just that "
        "the control was correctly configured at one snapshot, but that it has stayed correctly "
        "configured across multiple independent checks.")
bb.analogy("Picture the difference between a sticky note on the thermostat that says \"house is 68 "
           "degrees,\" written from memory this morning, and a smart thermostat that reports its own "
           "temperature to your phone every fifteen minutes. The sticky note is ECL-1: someone said "
           "so, and by the time you read it, it might already be stale or simply wrong. The smart "
           "thermostat streaming live readings is ECL-3: the system itself is the source of the "
           "claim, not a person's recollection of it. Now add one more step: an inspector who "
           "physically opens the furnace, runs it through a full heating cycle, and confirms it "
           "actually produces 68 degrees of usable heat under real conditions. That is ECL-4, proof "
           "the mechanism works, not merely proof it is switched on. And a thermostat that has been "
           "streaming accurate, consistent readings every day for months, with no unexplained gaps, "
           "is ECL-5: sustained confidence built from repetition, not a single good reading.")
bb.para("Why does this scale matter enough to organize an entire platform around it? Because the "
        "question a claims investigator asks after a breach is never simply \"did the applicant "
        "check the MFA box.\" It is closer to \"what evidence exists that MFA was actually enforced, "
        "how was that evidence obtained, and how current was it relative to the incident.\" A "
        "control sitting at ECL-4 or ECL-5, with a clear evidence trail behind it, is dramatically "
        "harder for an investigator to argue against than a control whose only support is a "
        "checked box on a form filled out a year earlier. ECL does not make a control more secure "
        "by itself. It makes the strength of the proof behind the control legible, to the "
        "organization, to its broker, and, when authorized, to the carrier.")
bb.keypoint("Higher ECL is not a vanity score. It is the specific thing that makes a claim harder "
            "to dispute after a breach, because it replaces \"we said so\" with a traceable, "
            "repeatable evidence chain that a third party can independently evaluate.")
bb.goodpractice("When Grace Thompson reviews ABC Manufacturing's Control Results screen, she should "
                 "treat any control sitting at ECL-1 or ECL-2 as unfinished work, not as done. The "
                 "goal of the assurance lifecycle is to move every material control up the ECL "
                 "ladder toward live, and eventually sustained, evidence, not merely to get every "
                 "control to show a green status once.")

# ---------------------------------------------------------------- CH 4
bb.chapter("4. Controls and Frameworks: Why Canonical, Vendor-Neutral Language Matters")
bb.para("Every cyber insurance carrier writes its own questionnaire, in its own wording, organized "
        "around its own internal risk model. One carrier might ask \"describe your privileged "
        "access management program\"; another might ask five separate yes/no questions that, read "
        "together, are asking roughly the same thing in a different shape. If an organization tried "
        "to build evidence separately for every carrier's specific wording, the work would multiply "
        "with every additional market the broker approaches, and evidence collected for one carrier "
        "would not obviously transfer to the next. This is the second structural problem "
        "Laurelshield addresses, distinct from the self-attestation problem but closely related to "
        "it: fragmentation of language.")
bb.para("Laurelshield's answer is a canonical control catalogue: forty controls, grouped into ten "
        "domains (Identity & Access, Endpoint, Backup & Recovery, Logging/Detection & Response, "
        "Vulnerability & Patch, Network & Remote Access, Email & Collaboration, Cloud, Data "
        "Security, and Governance), each with a stable code such as LS-ID-101 (Privileged "
        "Authentication MFA), LS-BCP-301 (Immutable/Offline Backup Copy), or LS-EDR-201 (EDR "
        "Coverage). \"Canonical\" means vendor-neutral: the catalogue is not owned by, or written "
        "for, any single carrier. It is Laurelshield's own published standard, and every carrier's "
        "proprietary wording gets translated to and from it, rather than the organization having to "
        "restate its posture from scratch for every market its broker approaches.")
bb.analogy("A canonical control catalogue works the same way a standard electrical outlet works. A "
           "lamp manufacturer does not build a different plug for every country's wall socket "
           "standard; the plug is built once, to one standard, and an adapter handles the "
           "translation at the boundary where it is actually needed. Evidence built once against "
           "Laurelshield's canonical LS-ID-101 does not need to be rebuilt for every carrier that "
           "asks about privileged MFA in its own words. The translation happens once, at the "
           "market-facing boundary, not forty times inside the organization.")
bb.para("This is also why the canonical catalogue has to be vendor-neutral in a stronger sense than "
        "just \"not owned by a carrier.\" It cannot be owned by a single security tool vendor "
        "either. A control like LS-EDR-201, EDR Coverage, describes the security outcome (endpoint "
        "detection and response deployed and reporting across the covered asset population), not a "
        "specific product. Whether ABC Manufacturing runs one EDR vendor's agent or another's, the "
        "canonical control and its evidence requirements stay the same. This is what lets the "
        "connector framework (covered in Part III) plug in different real-world tools behind a "
        "stable, comparable control layer.")
bb.h2("How canonical controls connect to carrier-specific requirements")
bb.para("Each carrier maintains its own confidential mapping between Laurelshield's canonical "
        "controls and its own proprietary questions, thresholds, and internal weighting; inside "
        "Laurelshield this confidential mapping is what the Carrier Requirements Graph refers to "
        "(named InsurGraph in the Suite's internal vocabulary, covered in Part II). A customer "
        "never sees another carrier's thresholds or weighting, and in fact never sees even their "
        "own carrier's internal weighting directly; what they see is the translated result: their "
        "own organization's canonical evidence, read through their chosen carrier's own question "
        "wording. This selective, one-directional translation is what allows two very different "
        "carriers, say Northstar Assurance Co. and Continental Underwriters Ltd., to independently "
        "price the same underlying, canonically verified evidence without either one learning "
        "anything about how the other carrier weighs risk.")
bb.warning("A customer administrator should never expect to see, and should be suspicious of any "
           "screen that appears to show, a competing carrier's internal thresholds or weighting. "
           "The confidentiality of that mapping is a structural design decision, not an oversight, "
           "and it protects the customer as much as it protects the carriers: it keeps the "
           "underlying verified evidence portable across every market the broker wants to approach.")
bb.para("Framework alignment is a related but separate idea worth being precise about. Laurelshield's "
        "canonical catalogue is not a reskin of any single external compliance framework; it is "
        "purpose-built for the specific question cyber underwriting asks (is this control real, "
        "how strongly is that established, and is the evidence current), which overlaps with, but "
        "is not identical to, the broader set of questions frameworks like general IT control "
        "catalogues are built to answer. An organization that already maintains other compliance "
        "programs will recognize many of the same underlying security practices inside the "
        "canonical catalogue, described in Laurelshield's own vendor-neutral language.")

# ---------------------------------------------------------------- CH 5
bb.chapter("5. Claims, Disputes, and What Happens When You Cannot Prove What You Claimed")
bb.para("The moment every earlier chapter in this part has been building toward is the claim. A "
        "breach happens. The organization notifies its broker, the broker notifies the carrier, "
        "and a claims process begins that, in the more difficult cases, runs in parallel with a "
        "forensic investigation. That investigation exists to answer two related but distinct "
        "questions: what happened, technically, during the incident, and did the organization's "
        "actual security posture at the time of the incident match what was represented when the "
        "policy was underwritten. The second question is the one that determines whether coverage "
        "responds cleanly, responds with a fight, or is denied.")
bb.para("When the forensic findings and the application line up, the claims process, while never "
        "pleasant, proceeds on its merits: covered costs get paid according to the policy terms. "
        "When they diverge, the carrier's claims team and its coverage counsel have a contractual "
        "basis to argue that a warranty was breached, that the risk they priced was not the risk "
        "they actually took on, and that coverage should be reduced, delayed pending further "
        "investigation, or in the most severe cases, rescinded. None of this requires bad faith on "
        "the applicant's side. It only requires a gap between claimed and true, of exactly the kind "
        "Chapter 2 described as the predictable result of self-attestation under memory and time "
        "pressure.")
bb.warning("The most damaging disputes are rarely about controls that were never implemented at "
           "all. They are usually about controls that were mostly true when the application was "
           "filed, drifted quietly afterward, and were never true again at the moment of the "
           "incident: an MFA exemption granted for one vendor integration and forgotten, a backup "
           "job that silently started failing three months before the ransomware event and nobody "
           "noticed because nobody was testing restores. Drift, not fabrication, is the more common "
           "root cause of a denied or reduced claim.")
bb.para("This is precisely the scenario continuous assurance (the freshness mechanism referred to "
        "inside the Suite as LaurelGuard, covered in Part II) is built to catch before a claim ever "
        "happens: evidence and claims expire on a schedule tied to each control, and a control that "
        "has gone stale is flagged, not silently left showing an old \"verified\" status. It is also "
        "why operational testing at ECL-4, an actual restore test rather than a configuration check, "
        "matters so much for exactly the controls that tend to fail silently, like backups: a "
        "backup job can report success in its own logs for months while producing restores that "
        "do not actually work, and only a real restore test would ever catch that.")
bb.para("Laurelshield's newer claim evidence pack capability exists specifically for the moment a "
        "claim is filed. When an incident date is established, the platform can freeze an evidence "
        "window around it (by default, thirty days before the incident through fourteen days after), "
        "seal a hash-chained, signed manifest of every relevant evidence object, control state, and "
        "the supplier dependency graph as of that moment, require independent reviewer approval "
        "before it goes anywhere, and then release the sealed pack to the carrier handling the "
        "claim. This exists to solve a specific, recurring pain point in claims disputes: the "
        "organization's own inability to reconstruct, months after the fact, exactly what its "
        "security posture actually was on the day of the breach, as distinct from what it is now, "
        "after emergency remediation has already changed things.")
bb.analogy("A claim evidence pack works like a building's sealed black box flight recorder after an "
           "incident, not like a witness trying to remember what they saw. Human memory reconstructs "
           "and inevitably contaminates itself with what happened afterward; a sealed, hash-chained "
           "record captured at the time cannot be quietly edited after the fact to look better, and "
           "that immutability is exactly what makes it credible to a skeptical claims investigator.")
bb.keypoint("Everything in Part I reduces to one operating principle for a customer administrator: "
            "treat every control result as something that will eventually be read by a forensic "
            "investigator under adversarial conditions, not merely by an underwriter under routine "
            "conditions. Evidence built to survive that scrutiny is, by construction, also the "
            "evidence that makes routine underwriting faster and cheaper. The bar does not move; "
            "only the stakes of failing to meet it do.")
bb.checklist([
    "Can you name, for any control on your Control Results screen, what evidence sits behind its current status and ECL.",
    "Do you know which of your controls are still resting on self-attestation (ECL-1) rather than live or tested evidence.",
    "Has your organization ever run an actual restore test, not just confirmed a backup job reports success.",
    "Do you know how old the evidence behind your most critical controls is right now.",
    "If a claim were filed today, could you show, not just describe, what your posture was on a specific past date.",
], title="PART I SELF-CHECK")

# ======================================================================
# PART II
# ======================================================================
bb.part_divider(2, "The Laurelshield Suite: One Platform, Many Capabilities",
                 blurb="Laurelshield uses fifteen distinct product names internally to talk "
                       "precisely about different responsibilities inside the platform. This part "
                       "explains what each name means, why the vocabulary exists, and where a "
                       "customer administrator will and will not actually encounter each one.")

bb.chapter("6. Reading the Suite: One Integrated Platform, Fifteen Names for Fifteen Jobs")
bb.warning("Read this before the table below, not after. In this reference platform, all fifteen "
           "names describe capabilities delivered by one single integrated application, not "
           "fifteen separately deployed products. Nobody buys LaurelVerify separately from "
           "LaurelProof today; there is one Laurelshield deployment, and these names are a precise "
           "internal vocabulary for talking about what each part of that one system does. They are "
           "also a preview of Laurelshield's own roadmap: the expectation is that as the platform "
           "matures from pilot toward production scale, some of these responsibilities may grow "
           "into their own standalone services with their own release cycles. Until that happens, "
           "treat every name below as a label for a role inside one product, not as a separate "
           "purchase.")
bb.para("Why bother with this vocabulary at all, if it is all one product today? Because precise "
        "internal language prevents precisely the kind of conceptual flattening that caused the "
        "self-attestation problem in the first place. \"The evidence platform\" is a different "
        "concept from \"the verification platform,\" which is different again from \"the trust "
        "platform,\" even though a customer administrator experiences all three inside the same "
        "portal. Keeping the responsibilities named separately, LaurelProof collects, LaurelVerify "
        "judges, LaurelTrust attests, makes it possible to reason clearly about where a problem "
        "actually lives when something does not look right on screen. If a control's evidence "
        "looks wrong, that is a LaurelProof question. If a control's status looks wrong given "
        "correct evidence, that is a LaurelVerify question. If a passport itself looks wrong, that "
        "is a LaurelTrust question. The vocabulary is a diagnostic tool as much as a marketing one.")
bb.para("The table below reproduces the full naming map exactly as Laurelshield defines it "
        "internally: the product name, its one-line description, what it actually is inside this "
        "build, and where, if anywhere, a customer administrator like Grace Thompson will see it "
        "directly.")
bb.table(
    ["Product Name", "One-Line Description", "What It Actually Is In This Build", "Where the Customer Sees It"],
    [
        ["LaurelVerify", "Verification platform", "The assessor/decision-officer workflow and ECL scoring engine that turns raw evidence into a verified control status", "Control Results tab; the Verification Queue behind the scenes"],
        ["LaurelProof", "Evidence platform", "The connector framework, operational tests, and manual-evidence submission process, how evidence gets collected", "Evidence & Connectors tab"],
        ["LaurelVault", "Evidence repository", "The hashed, chain-of-custody evidence store (every object gets a SHA-256 hash, source, collector, and timestamp), how evidence is kept safe and provable", "Not a separate screen; backs every piece of evidence shown across the portal"],
        ["LaurelAssure", "Insurability assurance", "The umbrella methodology, the full lifecycle end to end; effectively \"Laurelshield\" as the customer experiences the whole product", "The portal's Overview tab and the lifecycle description on it"],
        ["LaurelEvidence", "Evidence infrastructure", "The technical plumbing shared by LaurelProof and LaurelVault, the schema and framework connectors are built against", "Not directly visible; the foundation the visible evidence features stand on"],
        ["LaurelTrust", "Trust/verification platform", "The Cyber Risk Passport itself and its cryptographic signature, what lets a third party trust the result without redoing the work", "Cyber Risk Passport tab"],
        ["LaurelGuard", "Continuous control assurance", "The freshness engine, tracks evidence expiry windows per control and flags/expires stale claims automatically", "\"Evidence expired\" counts and the freshness-check action"],
        ["LaurelSignal", "Underwriting risk intelligence", "The output that reaches an underwriter, readiness score, material gaps, drivers of change, translated into their own wording", "Not customer-visible; this is what a carrier sees on their side"],
        ["LaurelLens", "Underwriting visibility", "The carrier's own dashboard/viewing experience (portfolio view, supplier concentration, claim packs)", "Not customer-visible; the carrier-side counterpart to the customer's Overview"],
        ["AssureGraph", "Graph-based assurance", "The conceptual relationship model connecting policy, insured, supplier, asset, control, evidence, and finding (implemented relationally in this pilot, not a literal graph database)", "Supplier Graph tab is the clearest customer-facing expression today"],
        ["InsurGraph", "Insurance/control graph", "The confidential Carrier Requirements Graph, the trade-secret mapping between canonical controls and each carrier's proprietary questions and thresholds", "Never shown to the customer directly, by design"],
        ["ControlProof", "Technical control verification", "The specific evidence tied to one individual control, the granular building block", "Each row in Control Results / the Passport control list"],
        ["ControlLedger", "Historical control evidence", "The history of verifications for a single control over time, every assessment, remediation, and re-verification", "Not a separate screen in this build; conceptually a control's \"history\" view"],
        ["AssuranceLedger", "Continuous assurance record", "The organization-wide historical record, the Audit Trail, broadened to every assurance claim change over time", "Audit Trail tab"],
        ["InsurabilityOS", "The broadest platform proposition", "The top-level brand for the entire Suite as one coherent operating layer between a security stack and the insurance market", "Not a screen; the name for \"all of the above, together\""],
    ], col_widths=[1.15, 1.35, 3.0, 1.7], font_size=8.5,
)

bb.chapter("7. The Evidence Family: LaurelProof, LaurelVault, LaurelEvidence")
bb.para("The evidence family answers the most basic question underneath the whole platform: where "
        "does a claim actually come from, and can anyone tamper with it after the fact. Three names "
        "cover three layers of that answer: LaurelProof collects, LaurelVault stores, and "
        "LaurelEvidence is the shared plumbing both are built on.")
bb.h2("LaurelProof: the evidence platform")
bb.para("LaurelProof is the collection layer, the connector framework, the operational test runner, "
        "and the manual evidence submission workflow, all considered as a single responsibility: "
        "getting evidence into the system in the first place. When Grace Thompson opens Evidence & "
        "Connectors and clicks Sync Now on ABC Manufacturing's Identity Provider connector, she is "
        "using LaurelProof. When she clicks Run Restore Test on the Operational Tests card, she is "
        "using LaurelProof. When she submits a policy document for a control that has no automated "
        "connector, that manual submission also flows through LaurelProof, into the Verification "
        "Queue for an assessor to review.")
bb.analogy("LaurelProof is the intake department of a hospital lab, not the lab itself. Its entire "
           "job is making sure a properly labeled sample actually reaches the lab in a form the lab "
           "can work with, whether that sample arrived by an automated pneumatic tube (a live "
           "connector), a courier hand-delivering a sealed vial (a manual document submission), or "
           "a technician running a test at the bedside and recording the result directly (an "
           "operational test).")
bb.h2("LaurelVault: the evidence repository")
bb.para("LaurelVault is what happens to evidence after LaurelProof collects it: it is hashed "
        "(SHA-256), stamped with its source, its collector, and a timestamp, and stored in a way "
        "that establishes chain of custody. A customer administrator never opens a screen labeled "
        "\"LaurelVault\"; there is no separate Vault tab in the portal. Instead, LaurelVault is what "
        "makes every other screen trustworthy: when the Control Results table shows a control's "
        "status, that status is only meaningful because the evidence behind it is provably intact "
        "and unaltered since collection, which is exactly what a hash-chained store guarantees.")
bb.goodpractice("If a broker or an underwriter ever asks Grace \"how do we know this evidence was "
                 "not edited after the fact to look better,\" the answer is the SHA-256 hash chain "
                 "LaurelVault maintains on every evidence object. This is worth understanding well "
                 "enough to explain in a placement conversation, because it directly answers the "
                 "credibility question at the heart of the self-attestation problem from Part I.")
bb.h2("LaurelEvidence: the shared infrastructure")
bb.para("LaurelEvidence is the least customer-visible name in the Suite: it is the common schema "
        "and technical framework that both LaurelProof's connectors and LaurelVault's storage are "
        "built against, so that evidence collected from seven very different source types (identity "
        "providers, EDR platforms, backup systems, attack surface scanners, email security "
        "gateways, cloud platforms, and SIEM/log management tools) all lands in a consistent, "
        "comparable shape. A customer administrator will never click a button labeled "
        "LaurelEvidence. Understanding that it exists matters mainly for one reason: it is why "
        "evidence from wildly different vendors and system types can sit side by side in the same "
        "Control Results table and be evaluated on the same ECL scale, rather than each connector "
        "type inventing its own incompatible reporting format.")

bb.chapter("8. The Verification Family: LaurelVerify, ControlProof, ControlLedger")
bb.para("If the evidence family answers \"where did this come from,\" the verification family "
        "answers the next question: \"given that evidence, what should we actually conclude about "
        "this control, and who is allowed to say so.\"")
bb.h2("LaurelVerify: the verification platform")
bb.para("LaurelVerify is the assessor and decision-officer workflow together with the ECL scoring "
        "engine: the machinery that takes raw evidence sitting in LaurelVault and turns it into a "
        "judged control status (verified, conditional, material gap, expired, revoked, or not "
        "assessed) with an assigned ECL. This is where Part I's separation of duties principle is "
        "enforced structurally: an assessor can propose a finding and an ECL, but only a decision "
        "officer, or an admin, can finalize an approve or reject decision. Grace does not operate "
        "LaurelVerify directly; it runs on Laurelshield's own Assurance Operations side. What Grace "
        "sees is its output, on the Control Results tab.")
bb.analogy("LaurelVerify is the peer review process at a scientific journal, not the laboratory that "
           "ran the experiment. The lab (LaurelProof) produces results; a reviewer (the assessor) "
           "reads them and proposes a judgment; an editor (the decision officer) makes the final "
           "call to publish or reject. No single person plays both the reviewer and the editor on "
           "the same paper, for the same reason no single Laurelshield role can both assess and "
           "approve the same finding.")
bb.h2("ControlProof: the granular building block")
bb.para("ControlProof is LaurelVerify's output at the finest grain: the specific bundle of evidence "
        "and judgment tied to one individual control. Where LaurelVerify names the platform-level "
        "workflow, ControlProof names the artifact that workflow produces for a single control code "
        "like LS-ID-101. Every row in the Control Results table, and every row in an issued Cyber "
        "Risk Passport's control list, is a piece of ControlProof made visible.")
bb.h2("ControlLedger: the history behind one control")
bb.para("ControlLedger is the historical record for a single control over time: every assessment, "
        "every remediation, every re-verification that has ever touched, say, LS-BCP-301 for ABC "
        "Manufacturing's scope. There is no separate ControlLedger screen in this build; "
        "conceptually, it is what a reader would see if they clicked a \"history\" link on one "
        "control result. Its importance is mostly forward-looking: it is the concept that makes "
        "questions like \"has this control ever regressed before\" answerable, which matters both "
        "for an organization's own continuous improvement and, eventually, for a carrier evaluating "
        "trend, not just snapshot, risk.")

bb.chapter("9. The Trust and Continuity Family: LaurelTrust, LaurelGuard, AssuranceLedger")
bb.para("The trust and continuity family covers what happens once evidence has been verified: how "
        "it gets packaged into something a third party can rely on, how that reliability is kept "
        "honest over time as reality drifts, and how the whole history of that process stays "
        "visible to the organization it belongs to.")
bb.h2("LaurelTrust: the passport and its signature")
bb.para("LaurelTrust is the Cyber Risk Passport itself, together with the cryptographic signature "
        "that lets a recipient verify it has not been tampered with, without having to re-run the "
        "underlying assessment themselves. In this reference build the signature uses HMAC-SHA256; "
        "a production deployment would move to an asymmetric, KMS or HSM-backed signature, a "
        "meaningful security upgrade in how the key is protected, but not a change to what the "
        "signature promises a reader. When Grace issues a new passport for ABC Manufacturing and "
        "sees \"Signature verified: evidence lineage intact\" on the Cyber Risk Passport tab, she "
        "is looking directly at LaurelTrust doing its job.")
bb.analogy("LaurelTrust is a wax seal on a sealed envelope, reinvented cryptographically. A wax "
           "seal does not make the letter inside more truthful; it proves the letter has not been "
           "opened and altered since the seal was pressed. A recipient who trusts the seal does not "
           "need to independently re-verify every sentence in the letter, only that the seal itself "
           "is genuine and unbroken. A signed Laurelshield passport works the same way for a broker "
           "or carrier: the signature does not re-prove every control, it proves the summarized "
           "result has not been altered since Laurelshield issued it.")
bb.h2("LaurelGuard: keeping trust fresh")
bb.para("LaurelGuard is the freshness engine introduced conceptually in Chapter 5: it tracks an "
        "evidence expiry window per control and automatically flags, or expires, a claim once its "
        "supporting evidence ages past that window. This is the concept behind the phrase \"verified "
        "today does not mean verified forever.\" On the Overview tab's Assurance Summary row, the "
        "Evidence Expired count is LaurelGuard's output made visible; a freshness-check action "
        "elsewhere in the platform is LaurelGuard's mechanism actually running.")
bb.warning("A passport with zero Evidence Expired controls today can have a nonzero count next "
           "month with no action taken on the organization's part, simply because time passed and "
           "a control's evidence window closed. This is not a bug or a regression; it is LaurelGuard "
           "correctly refusing to let a stale claim continue to look current. Treat any nonzero "
           "Evidence Expired count as a work queue, not an alarm about something having gone wrong.")
bb.h2("AssuranceLedger: the organization-wide history")
bb.para("AssuranceLedger broadens ControlLedger's single-control history to the whole organization: "
        "it is the complete historical record of every assurance claim change, evidence sync, "
        "passport issuance, sharing grant, and partner access, for ABC Manufacturing as a whole. "
        "Customer-facing, this is the Audit Trail tab, covered in depth in Part III, and it is the "
        "concrete expression of the transparency principle running through the whole platform: "
        "customers can always see who looked at their data, and when.")

bb.chapter("10. The Market-Facing Family: LaurelSignal, LaurelLens, InsurGraph, AssureGraph")
bb.para("The market-facing family covers the side of the platform a customer administrator will "
        "almost never see directly, because it belongs to the carrier and broker side of the "
        "relationship. Understanding it still matters, because it explains what happens to a "
        "customer's evidence after they choose to share it.")
bb.h2("LaurelSignal and LaurelLens: what a carrier actually sees")
bb.para("LaurelSignal is the output that reaches an underwriter: a readiness score, a list of "
        "material gaps, and the drivers behind any change since the last review, all translated "
        "into that carrier's own proprietary wording. LaurelLens is the carrier's own dashboard "
        "experience for viewing that output: a portfolio view across every insured that has shared "
        "a passport with them, supplier concentration flags, and claim evidence packs when a claim "
        "is in progress. Neither of these has a customer-facing screen. They are the direct "
        "counterpart, on the carrier's side, to what LaurelAssure's Overview tab is on the "
        "customer's side.")
bb.h2("InsurGraph: the confidential mapping, by design invisible to the customer")
bb.para("InsurGraph is the name for the Carrier Requirements Graph introduced in Chapter 4: the "
        "confidential, trade-secret mapping between Laurelshield's canonical controls and each "
        "carrier's own proprietary questions and thresholds. It is deliberately never shown to the "
        "customer, not because Laurelshield is hiding something from its own customer, but because "
        "that mapping belongs to the carrier and is competitively sensitive between carriers. A "
        "customer only ever sees the translated result of InsurGraph doing its job, never the "
        "mapping itself.")
bb.h2("AssureGraph: the relationship model behind the Supplier Graph")
bb.para("AssureGraph is the conceptual relationship model that connects policy, insured, supplier, "
        "asset, control, evidence, and finding into one coherent web. In this pilot build those "
        "relationships live in a relational database (SQLite) rather than a literal graph database; "
        "AssureGraph names the idea, which is Laurelshield's roadmap direction as the platform "
        "scales toward production. The clearest place a customer administrator actually meets this "
        "idea today is the Supplier Graph tab, where a supplier like CloudCore Managed Hosting is "
        "linked to the specific canonical controls it affects, which is a small, concrete slice of "
        "the larger AssureGraph concept made visible and useful today.")
bb.keypoint("A useful rule of thumb: if a capability produces something a customer administrator "
            "clicks on inside the portal, it likely belongs to the evidence, verification, or trust "
            "and continuity families. If it produces something a carrier or broker sees on their "
            "own side of the relationship, it belongs to the market-facing family.")

bb.chapter("11. The Umbrella: LaurelAssure and InsurabilityOS")
bb.para("Two names sit above the four families because they are not describing one responsibility; "
        "they are describing the whole thing, at two different altitudes.")
bb.h2("LaurelAssure: the whole lifecycle, as the customer experiences it")
bb.para("LaurelAssure is the umbrella methodology: the full assurance lifecycle end to end, from "
        "onboarding and scope registration through evidence collection, canonical mapping, "
        "confidence scoring, market readiness translation, remediation, independent re-verification, "
        "passport issuance, authorized demonstration, and continuous assurance. For practical "
        "purposes, when Grace Thompson thinks about \"using Laurelshield,\" she is thinking about "
        "LaurelAssure; it is effectively the customer-facing name for the whole product experience. "
        "The Overview tab's lifecycle summary card is LaurelAssure's most direct visible expression "
        "in the portal.")
bb.h2("InsurabilityOS: the vision-level frame")
bb.para("InsurabilityOS is the broadest name in the Suite: the top-level brand for the entire "
        "vocabulary above, framed as a coherent operating layer sitting between an organization's "
        "real security stack and the insurance market that prices its risk. It has no screen of its "
        "own, deliberately, because it is not a feature; it is the name for what all fourteen other "
        "names add up to when considered together. A customer administrator is unlikely to "
        "encounter this term inside the day-to-day portal experience; it belongs more to pitch and "
        "strategy contexts than to hands-on use, and it is included here mainly so that if Grace "
        "encounters the term in a Laurelshield strategy conversation, she recognizes it as the name "
        "for the whole vision, not a new feature she has somehow missed.")
bb.analogy("If LaurelAssure is the specific ride a customer actually takes, InsurabilityOS is the "
           "name for the entire transit system the ride belongs to, tracks, signaling, scheduling, "
           "and all the other lines a rider never personally boards but that make the one ride "
           "possible and repeatable at scale.")

# ======================================================================
# PART III
# ======================================================================
bb.part_divider(3, "Using the Laurelshield Customer Portal: A Guided Walkthrough",
                 blurb="This part is the most important in the book. Each chapter takes one real "
                       "screen from the Customer Portal, captured from the fully verified "
                       "ABC Manufacturing Ltd. demo tenant, and walks through exactly what is on "
                       "it, what each element means, what actions are available, and how it "
                       "connects back to the concepts from Part I and the product vocabulary from "
                       "Part II.")

# ---------------------------------------------------------------- CH 12 Login
bb.chapter("12. Signing In")
bb.para("Every session with the Laurelshield Customer Portal begins at the same split-panel login "
        "screen. The left panel, rendered in dark navy, carries the Laurelshield logo and wordmark, "
        "the platform's tagline, \"Verify once. Demonstrate everywhere,\" a short description of "
        "what the platform does, and four bullet value-proposition points: canonical control "
        "verification, signed and revocable passports, independent decision authority, and a full "
        "audit trail. The right panel, in white, holds the actual sign-in form: an email field, a "
        "password field, and, in this reference deployment, a demo-accounts reference block listing "
        "the available demo logins.")
bb.screenshot(SHOT("00-login.png"), caption="Figure 12.1: The Laurelshield split-panel login screen.")
bb.para("The four bullet points on the left panel are not marketing filler; they are a compressed "
        "preview of the entire book. \"Canonical control verification\" is Part I, Chapter 4 and "
        "the LaurelVerify family from Part II. \"Signed, revocable passports\" is LaurelTrust, "
        "covered in Chapter 9 and walked through hands-on in Chapter 19 of this part. \"Independent "
        "decision authority\" is the separation-of-duties principle explained in Chapter 5 and "
        "again in Chapter 8. \"Full audit trail\" is AssuranceLedger, walked through in Chapter 22. "
        "By the time a reader finishes this textbook, every one of those four bullets should read "
        "as a specific, concrete capability rather than a slogan.")
bb.para("For a customer administrator like Grace Thompson, the account used throughout most of this "
        "walkthrough is admin@abcmanufacturing.example, a fully populated, fully verified demo "
        "tenant for ABC Manufacturing Ltd. In a live production deployment, the address in the "
        "browser bar will differ from any address shown in a demo reference block; a customer "
        "administrator should always confirm the correct URL and credentials with their own "
        "Laurelshield administrator rather than assuming a documentation example is the live "
        "address.")
bb.goodpractice("Routing after login is role-based and automatic: signing in with a customer "
                 "account lands on the Customer Portal covered in this part; signing in with a "
                 "broker or carrier account lands on a different, role-appropriate portal. There is "
                 "no manual portal selection step, which is itself a small piece of access control: "
                 "a user cannot accidentally, or deliberately, browse into a portal their role does "
                 "not grant.")

# ---------------------------------------------------------------- CH 13 Overview
bb.chapter("13. The Overview Screen")
bb.para("After signing in as a customer administrator, the first screen is Overview, the portal's "
        "dashboard and, per Part II, the clearest direct expression of LaurelAssure, the whole "
        "assurance lifecycle presented as one customer-facing experience. The top bar shows the "
        "Laurelshield logo, the label \"Laurelshield / Customer Portal,\" the organization name and "
        "signed-in user's name in the top right, and a Sign out control. The left sidebar lists ten "
        "navigation items: Overview, Scope & Assets, Evidence & Connectors, Control Results, "
        "Supplier Graph, Remediation, Cyber Risk Passport, Sharing & Consent, Appeals, and Audit "
        "Trail. Every one of those nine items after Overview gets its own dedicated chapter later "
        "in this part.")
bb.screenshot(SHOT("01-overview.png"), caption="Figure 13.1: The Customer Portal Overview screen for ABC Manufacturing Ltd.")
bb.para("The main content area opens with \"Welcome, ABC Manufacturing Ltd.\" followed by a Quick "
        "Actions tile row of eight icon tiles, each a shortcut into one of the other navigation "
        "sections. Below that sits the active assurance boundary selector, a dropdown currently "
        "showing \"ABC Manufacturing (Canadian Operating Entity) (LS-SCOPE-000184).\" This selector "
        "is the practical, everyday expression of the scope, or assurance boundary, concept from "
        "the twelve-stage lifecycle described in Part I: it names exactly which legal entity, "
        "network, cloud tenant, and application footprint every number on the rest of this screen, "
        "and every other screen in the portal, actually applies to.")
bb.h2("Reading the Assurance Summary row")
bb.para("The Assurance Summary stat row is the single fastest way to read ABC Manufacturing's "
        "current posture: 38 Verified Controls, 2 Conditional, 0 Material Gaps, 0 Evidence Expired, "
        "2 Open Remediation, and 1 Passports Issued. Each number maps directly onto concepts already "
        "introduced. Verified and Conditional are two of the control status values from Chapter 8's "
        "LaurelVerify discussion; with forty total canonical controls in the catalogue, 38 Verified "
        "plus 2 Conditional accounts for all forty, meaning no control currently sits at Material "
        "Gap. Zero Evidence Expired means LaurelGuard's freshness engine, from Chapter 9, has not "
        "yet flagged anything as stale in this scope. Two Open Remediation is the live count feeding "
        "the Remediation tab covered in Chapter 18. One Passports Issued confirms ABC Manufacturing "
        "currently holds a live LaurelTrust credential, examined in full in Chapter 19.")
bb.keypoint("A stat row this clean, 38 Verified and 2 Conditional out of 40, with zero material "
            "gaps and zero expired evidence, represents a mature, well-maintained assurance program, "
            "not a typical starting point. A newly onboarded organization, or the blank sandbox "
            "tenant referenced elsewhere in Laurelshield's documentation, would show mostly ECL-0 "
            "and ECL-1 controls at the start, with this kind of summary being the goal state the "
            "twelve-stage lifecycle works toward, not the default.")
bb.para("Below the summary sits a Resources table listing the registered scope and the currently "
        "issued passport, and a twelve-stage assurance lifecycle summary card, a compact visual "
        "restatement of the same lifecycle introduced in Part I: onboarding and scope registration, "
        "evidence collection, canonical control mapping, confidence and effectiveness scoring, "
        "market readiness translation, remediation, independent re-verification, passport issuance, "
        "authorized demonstration, and continuous assurance. Some Laurelshield materials describe "
        "this lifecycle in ten stages and others in twelve; the underlying flow is the same "
        "regardless of exactly how the stages are counted and labeled on a given screen, and a "
        "reader should treat the lifecycle qualitatively rather than fixating on the precise stage "
        "count shown in any one place.")

# ---------------------------------------------------------------- CH 14 Scope & Assets
bb.chapter("14. Scope & Assets")
bb.para("Scope & Assets is where the assurance boundary named on the Overview screen actually gets "
        "defined and registered; it corresponds to Stage 1 of the lifecycle, onboarding and scope "
        "registration. The screen shows the registered assurance boundary as a card, carrying a "
        "status badge, followed underneath by the specific assets registered inside that boundary, "
        "for example an ERP application and an Azure production tenant for ABC Manufacturing. Below "
        "the existing scope, a form allows registering a new assurance boundary.")
bb.screenshot(SHOT("02-scope-assets.png"), caption="Figure 14.1: Scope & Assets, showing ABC Manufacturing's registered assurance boundary and assets.")
bb.para("Getting scope right matters more than any other single step in the whole lifecycle, "
        "because every downstream claim inherits it. A passport is not a claim that \"ABC "
        "Manufacturing is secure\" in some abstract, company-wide sense; it is a claim that "
        "everything inside a specific, named boundary, this legal entity, this network, this cloud "
        "tenant, these applications, was verified to a specific standard as of a specific date. If "
        "the scope is drawn too narrowly, real risk sits outside the boundary and outside the "
        "passport's claims entirely, which is itself a form of the self-attestation gap from Part "
        "I: the passport would be technically accurate about what it covers while creating a "
        "misleading impression about what it does not.")
bb.analogy("Defining an assurance boundary is like a home inspector's engagement letter specifying "
           "exactly which structure is being inspected, the main house, not the detached garage, "
           "and exactly which systems, plumbing and electrical, not the swimming pool equipment. A "
           "clean inspection report is only meaningful if the reader also knows precisely what was, "
           "and was not, inside its scope. A vague or overly broad scope produces a report that "
           "sounds reassuring while actually protecting nobody from the parts that were never "
           "looked at.")
bb.warning("If ABC Manufacturing later acquires a subsidiary, stands up a new cloud environment, or "
           "retires a legacy application, the scope registered here needs to be revisited. A "
           "passport issued against a stale scope description creates exactly the drift risk "
           "described in Chapter 5: technically accurate when issued, quietly misleading later.")
bb.goodpractice("Register assets at a level of detail specific enough to actually mean something to "
                 "a carrier or forensic investigator later, a named ERP application and a named "
                 "cloud tenant, not a vague \"our systems.\" Specific asset registration is what "
                 "lets Stage 2 evidence collection, and every connector examined in the next "
                 "chapter, target the right systems.")

# ---------------------------------------------------------------- CH 15 Evidence & Connectors
bb.chapter("15. Evidence & Connectors")
bb.para("Evidence & Connectors is where Stage 2 of the lifecycle, evidence collection, actually "
        "happens, and it is the single clearest customer-facing home of LaurelProof from Chapter 7. "
        "Everything on this screen exists to answer one question: how does raw evidence get into "
        "Laurelshield in the first place, before LaurelVerify ever judges it and LaurelVault ever "
        "stores it.")
bb.screenshot(SHOT("03-evidence-connectors.png"), caption="Figure 15.1: Evidence & Connectors, showing all seven connected evidence sources for ABC Manufacturing.")
bb.para("At the top, a working scope banner confirms which assurance boundary this evidence "
        "collection applies to, reinforcing the scope discipline from the previous chapter. Below "
        "it are seven Connected Evidence Sources cards, one for each connector type the platform "
        "supports: Identity Provider, Endpoint Detection & Response, Backup & Recovery Platform, "
        "External Attack Surface Scanner, Email Security & DNS, Cloud Platform, and SIEM/Log "
        "Management. Each card shows a CONNECTED status, a SIMULATED badge, the last sync "
        "timestamp, and Sync Now and Adjust Posture buttons.")
bb.h2("Being honest about SIMULATED versus Live")
bb.para("The SIMULATED badge is not a detail to gloss over; it is one of the most important honesty "
        "signals in the entire platform. In this reference build, most connectors, including the "
        "six connectors beyond Identity Provider shown here, run in Simulated mode: they generate "
        "realistic demonstration evidence instantly, with no vendor setup required, which is why "
        "every screenshot in this textbook shows a fully populated, richly verified demo tenant. "
        "The Identity Provider connector is the one exception: alongside Simulated mode, it also "
        "supports a genuinely Live mode using Microsoft Graph with OAuth2 client-credentials "
        "authentication, pulling real Conditional Access policy, real privileged role membership, "
        "and real sign-in activity from an organization's actual Microsoft Entra tenant.")
bb.warning("A customer administrator must never represent Simulated evidence to a broker or carrier "
           "as if it were live, real data pulled from their own systems. Simulated mode exists for "
           "demonstration, training, and evaluating the platform's workflow; it is not a substitute "
           "for actually connecting a real system when an organization moves from evaluating "
           "Laurelshield to relying on it for a real placement. As of this reference build, the "
           "Identity Provider connector's Live mode is the only connector fully wired to a real "
           "vendor API; the other six are architected identically and are expected to be wired to "
           "their respective real vendor APIs as the platform matures, but readers should not "
           "assume that has already happened.")
bb.para("Beneath the seven connector cards sits an Operational Tests card, labeled ECL-4, with Run "
        "Restore Test and Run Tabletop Exercise buttons; this is where a customer administrator "
        "generates the ECL-4 operational test evidence described in Chapter 3, proof a control "
        "actually works under exercise, not merely proof it is configured. Below that, a Manual/"
        "Document Evidence card provides a control picker, a note field, and a Submit for Assessor "
        "Review button, the manual submission path referenced in Chapter 7 that feeds directly into "
        "the Verification Queue on Laurelshield's Assurance Operations side.")
bb.analogy("The seven connector cards are like seven separate diagnostic machines in a clinic, each "
           "reporting on a different body system, identity access like a vital-signs monitor, "
           "backups like an imaging scan, external attack surface like a skin exam looking for "
           "something visible from outside. A CONNECTED, recently synced card is a machine "
           "currently plugged in and reporting; a stale last-sync timestamp is the equivalent of a "
           "machine that was plugged in once but has not reported a fresh reading in a while, which "
           "is exactly what LaurelGuard's freshness tracking is watching for across every one of "
           "these sources.")
bb.goodpractice("Click Sync Now on a regular cadence, not only when preparing for a renewal. "
                 "Evidence that is only ever refreshed right before an application is filed drifts "
                 "back toward looking like self-attestation in spirit, current at the one moment it "
                 "matters to the organization, rather than continuously current the way ECL-3 and "
                 "ECL-5 are meant to describe.")

# ---------------------------------------------------------------- CH 16 Control Results
bb.chapter("16. Control Results")
bb.para("Control Results is, in the words of the brief this textbook was built from, the single "
        "richest screen in the entire portal, and it is the direct customer-facing output of "
        "LaurelVerify from Chapter 8. It presents a long table of all forty canonical controls, "
        "grouped by the ten domains introduced in Chapter 4: Identity & Access, Endpoint, Backup & "
        "Recovery, Logging/Detection & Response, Vulnerability & Patch, Network & Remote Access, "
        "Email & Collaboration, Cloud, Data Security, and Governance. Each row shows a control code, "
        "its title, a status badge, an ECL pill, and a coverage percentage.")
bb.screenshot(SHOT("04-control-results.png"), caption="Figure 16.1: Control Results, all 40 canonical controls grouped by domain, with status, ECL, and coverage.")
bb.para("For ABC Manufacturing's tenant, the pattern across this table is overwhelmingly VERIFIED "
        "status with a couple of controls at CONDITIONAL, and ECL pills clustering mostly at ECL-5, "
        "with a handful of controls sitting at ECL-2 or ECL-4. Reading this table well means "
        "connecting each piece back to earlier chapters rather than treating status and ECL as two "
        "unrelated columns. Status describes what LaurelVerify concluded; ECL describes how strongly "
        "that conclusion is supported by evidence. A control can be VERIFIED and still sit at a "
        "lower ECL than a reader might expect if its evidence is a reviewed document (ECL-2) rather "
        "than sustained live connector data (ECL-5): the assessor judged the evidence sufficient to "
        "verify the control, while the ECL pill keeps the strength of that evidence honestly "
        "visible rather than letting a VERIFIED badge imply more than the evidence actually "
        "supports.")
bb.h2("Real control codes visible in this table")
bb.para("Concrete examples make this table easier to read. In the Identity & Access domain, "
        "LS-ID-101, Privileged Authentication MFA, is exactly the kind of control most cyber "
        "insurance questionnaires ask about directly, and its status and ECL here are what a "
        "translated LaurelSignal readout would eventually show an underwriter, in their own wording. "
        "In the Backup & Recovery domain, LS-BCP-301, Immutable/Offline Backup Copy, is the control "
        "most directly connected to ransomware resilience, and the discussion in Chapter 5 about "
        "backups failing silently is exactly why an ECL-4 operational restore test matters so much "
        "for this specific control rather than resting on ECL-3 configuration evidence alone. In "
        "the Endpoint domain, LS-EDR-201, EDR Coverage, is the control that answers whether "
        "endpoint detection and response is actually deployed and reporting across the covered "
        "asset population, the same vendor-neutral framing from Chapter 4's discussion of what "
        "\"canonical\" means in practice.")
bb.keypoint("Grouping by domain, rather than presenting forty controls as one flat list, mirrors "
            "how both an internal security team and an external underwriter actually think about "
            "risk: in categories, not as an undifferentiated pile. A reader scanning this table "
            "domain by domain can quickly spot whether weakness clusters in one area, for instance "
            "several CONDITIONAL or lower-ECL controls concentrated in Vulnerability & Patch, which "
            "is a materially different risk story than the same two CONDITIONAL controls being "
            "scattered randomly across unrelated domains.")
bb.para("This table is also the clearest place to see ControlProof, from Chapter 8, made concrete: "
        "each individual row, one control code, its status, its ECL, its coverage percentage, is "
        "exactly the granular unit ControlProof names. And this same table, filtered down to only "
        "what a specific carrier is authorized to see and translated into that carrier's own "
        "wording, is what eventually becomes LaurelSignal on the carrier's side, described in "
        "Chapter 10.")

# ---------------------------------------------------------------- CH 17 Supplier Graph
bb.chapter("17. Supplier Graph")
bb.para("Supplier Graph is where ABC Manufacturing registers the third parties it depends on, and "
        "it is the clearest customer-facing expression of AssureGraph from Chapter 10. The screen "
        "lists registered suppliers, in the demo tenant these include CloudCore Managed Hosting, "
        "NorthMail Security Gateway, SwiftPay Payment Processor, and Vantage ERP Support, each shown "
        "with a criticality badge (critical, high, medium, or low), a short service description, "
        "and the specific canonical controls that supplier is linked to. A form below the list "
        "allows adding a new supplier and linking it to the controls it affects.")
bb.screenshot(SHOT("05-supplier-graph.png"), caption="Figure 17.1: Supplier Graph, ABC Manufacturing's registered third-party suppliers and the controls each affects.")
bb.para("Why does a cyber insurance assurance platform care about an organization's suppliers at "
        "all? Because a modern organization's actual attack surface rarely stops at its own "
        "network boundary. If CloudCore Managed Hosting has an incident, ABC Manufacturing's own "
        "controls may be flawless and it can still suffer a real loss, because the loss originated "
        "one hop away, at a vendor it depends on. Linking a supplier to the specific canonical "
        "controls it affects makes that dependency legible in exactly the same vendor-neutral "
        "language used for the organization's own controls, rather than leaving vendor risk as a "
        "vague, unquantified worry.")
bb.h2("Concentration risk, a portfolio-level view")
bb.para("At the portfolio level, across every organization Laurelshield serves, this same supplier "
        "data lets the platform flag concentration risk: a single supplier that serves multiple "
        "insureds, meaning one supplier-side incident becomes, from a carrier's perspective, a "
        "multi-policy loss event rather than an isolated one. The seed data behind this textbook's "
        "screenshots includes a real example of exactly this pattern: CloudCore Managed Hosting "
        "serves both ABC Manufacturing and Meridian Health. If CloudCore had a major incident, a "
        "carrier underwriting both organizations would be looking at correlated, not independent, "
        "risk, information that self-attested questionnaires, answered by each organization "
        "separately with no visibility into each other, could never surface.")
bb.analogy("Concentration risk in a supplier graph is the same underlying idea as an investment "
           "portfolio manager discovering that two funds marketed as independent actually both hold "
           "large positions in the same single company. Each fund looked diversified in isolation; "
           "only a view across the whole portfolio reveals the shared exposure. A carrier looking "
           "only at ABC Manufacturing's application in isolation cannot see that CloudCore also "
           "sits underneath Meridian Health; only a supplier graph maintained across the portfolio "
           "can.")
bb.para("This capability is a comparatively newer addition to the platform, built specifically to "
        "support the broader Suite pitch described in Part II, and it is a good example of "
        "AssureGraph's conceptual model, connecting policy, insured, supplier, asset, control, "
        "evidence, and finding, already at work in a form a customer administrator can directly "
        "use today, even while the underlying implementation remains a relational database rather "
        "than the literal graph database the roadmap eventually points toward.")
bb.goodpractice("Register a supplier's criticality honestly, not optimistically. A payment "
                 "processor like SwiftPay handling live transaction data should generally be rated "
                 "critical or high, not medium, because the criticality rating is what determines "
                 "how seriously an incident at that supplier gets weighed against ABC "
                 "Manufacturing's own controls elsewhere in the graph.")

# ---------------------------------------------------------------- CH 18 Remediation
bb.chapter("18. Remediation")
bb.para("Remediation is Stage 6 of the lifecycle made concrete: a table of findings that require "
        "action, each row showing the affected control, a description of the finding, an assigned "
        "owner, a due date, and a current status, with a Mark Remediated action available on each "
        "open item.")
bb.screenshot(SHOT("06-remediation.png"), caption="Figure 18.1: Remediation, open findings requiring action for ABC Manufacturing.")
bb.para("The Assurance Summary row on the Overview screen showed 2 Open Remediation items for ABC "
        "Manufacturing; this screen is where those two items actually live and get worked. A "
        "finding lands here after an assessor reviews evidence for a control and determines it "
        "falls short of full verification, whether that is a genuine gap (a control that is not yet "
        "implemented) or something closer to the CONDITIONAL status seen on Control Results (a "
        "partial or compensating control that needs strengthening).")
bb.para("Clicking Mark Remediated is where Chapter 5's separation of duties principle becomes "
        "operationally real, not just a policy statement. Marking an item remediated does not "
        "immediately flip the underlying control back to VERIFIED status. Instead, it queues the "
        "item for independent re-verification, Stage 7 of the lifecycle, by an Assurance Operations "
        "role. This means the person who actually implemented the fix, ABC Manufacturing's own IT "
        "team, is never the same party who signs off that the fix worked. That confirmation comes "
        "from someone structurally independent of the remediation itself.")
bb.warning("A customer administrator who marks an item remediated should expect a delay before the "
           "corresponding control shows VERIFIED again on Control Results, not an instant update. "
           "That delay is the independent re-verification step doing its job, and treating it as a "
           "bug or an unnecessary bottleneck misunderstands exactly the design principle that makes "
           "a Laurelshield passport more credible than a self-attested claim in the first place: "
           "nobody grades their own work here.")
bb.analogy("This is the same reason a building inspector, not the contractor who did the repair, "
           "signs off on a permit closeout after remediation work. The contractor's own confidence "
           "that a repair is complete is useful information, but it is not, by itself, sufficient "
           "proof for a third party relying on the permit; an independent inspection is what "
           "actually closes the loop.")

# ---------------------------------------------------------------- CH 19 Passport
bb.chapter("19. The Cyber Risk Passport")
bb.para("The Cyber Risk Passport screen is where LaurelTrust, introduced in Chapter 9, becomes "
        "something a customer administrator can directly see, issue, and manage. An \"Issue New "
        "Passport for Current Scope\" button sits above the currently issued passport card, which "
        "shows the passport's code, LS-CRP-CA-000184, its issue date, a summary line reading "
        "\"38/40 controls verified,\" a VERIFIED status badge, the line \"Signature verified: "
        "evidence lineage intact,\" and a Revoke button. Below the card sits the full table of all "
        "forty controls with their status, ECL, and coverage, the same underlying data seen on "
        "Control Results, now packaged as the customer's actual portable credential.")
bb.screenshot(SHOT("07-passport.png"), caption="Figure 19.1: The Cyber Risk Passport, LS-CRP-CA-000184, ABC Manufacturing's issued credential.")
bb.para("The passport code itself, LS-CRP-CA-000184, is worth reading carefully: it is a stable, "
        "unique identifier a broker or carrier can reference directly in correspondence, distinct "
        "from the scope code (LS-SCOPE-000184) seen on the Overview screen. \"38/40 controls "
        "verified\" is exactly the Verified plus Conditional split seen on the Overview summary row "
        "and the Control Results table, now stated as the headline number a third party reading "
        "the passport will see first.")
bb.h2("What \"Signature verified: evidence lineage intact\" actually means")
bb.para("This line is the passport making LaurelTrust's cryptographic promise legible in plain "
        "language. Under the hood, the passport's contents are signed (HMAC-SHA256 in this "
        "reference build), and that signature check confirms two things at once: that the passport "
        "displayed matches exactly what Laurelshield issued, with nothing altered in transit or "
        "storage, and that the evidence lineage behind every control listed traces back, "
        "unbroken, through LaurelVault's hash-chained store. A recipient does not have to take "
        "Laurelshield's word for this; the signature is independently checkable.")
bb.keypoint("This is the single screen that most directly answers Part I's core problem. Where a "
            "traditional cyber insurance application hands a broker a self-attested questionnaire "
            "with no independent verification behind it, this screen hands the same broker a "
            "signed, forty-control, ECL-scored credential that a carrier's underwriting or claims "
            "team can trust without redoing the underlying work themselves.")
bb.para("Revocation is a deliberate, one-way action in this build: once a passport is revoked, that "
        "revocation is permanent, and the way forward is issuing a new passport for the current "
        "scope, not undoing the revocation. This mirrors how a passport in the everyday sense "
        "works: a canceled passport is not reactivated, a new one is issued. A customer "
        "administrator should revoke deliberately, for example when a scope materially changes or "
        "an issued passport needs to be retired, not experimentally.")
bb.goodpractice("Before sharing a newly issued passport with a broker or carrier through the Sharing "
                 "& Consent screen covered next, confirm the \"Signature verified\" line is showing "
                 "cleanly and that the controls/ECL mix genuinely reflects current reality, not "
                 "evidence that has quietly gone stale since the last sync. A passport is only as "
                 "trustworthy as the evidence it was issued against.")

# ---------------------------------------------------------------- CH 20 Sharing & Consent
bb.chapter("20. Sharing & Consent")
bb.para("Sharing & Consent is where Stage 9 of the lifecycle, authorized demonstration, actually "
        "happens, and it is the screen that makes Part I's promise concrete: the customer, not "
        "Laurelshield, decides who sees their passport. The screen shows active sharing grants, who "
        "has been given access, for what purpose, and when that access expires, alongside a form to "
        "grant new access to a named broker or carrier partner, and controls to revoke an existing "
        "grant.")
bb.screenshot(SHOT("08-sharing-consent.png"), caption="Figure 20.1: Sharing & Consent, ABC Manufacturing's active grants and the grant/revoke controls.")
bb.para("Every grant is deliberately purpose-limited and time-limited: for example, a grant might "
        "authorize Granite Peak Insurance Brokers to view the passport for the stated purpose of "
        "\"renewal placement support,\" expiring automatically in 180 days rather than persisting "
        "indefinitely. This is a meaningfully different model from a traditional application "
        "process, where once an underwriter has an applicant's information, the applicant generally "
        "has little practical way to know how long it is retained or who else within that carrier's "
        "organization can see it.")
bb.analogy("A sharing grant works like a visitor badge issued at a building's front desk, not a "
           "permanent building key. The badge is stamped with who it belongs to, what floor they "
           "are authorized to visit, and an expiration time printed on its face. It can also be "
           "deactivated from the front desk at any moment if circumstances change, without needing "
           "the visitor to physically return it.")
bb.para("Revoking a grant at any time is a meaningful, real control the customer holds, not a "
        "symbolic gesture. If ABC Manufacturing switches brokers, or a renewal cycle with a "
        "particular carrier ends without a bind, Grace can revoke that partner's access immediately, "
        "and the revocation takes effect right away rather than waiting for the original expiry "
        "date. Every grant, and every revocation, is itself logged, which is the direct link "
        "forward into Chapter 22's Audit Trail: sharing is not a one-way disclosure into a black "
        "box, it is a tracked relationship the customer can see and end.")
bb.keypoint("Selective disclosure, the principle underneath this whole screen, means a recipient "
            "only ever sees what the grant specifically authorizes, the passport's translated "
            "result for their own organization, never another carrier's requirements or weighting "
            "(Chapter 4), and never the raw underlying evidence itself, only the verified claim "
            "built from it.")

# ---------------------------------------------------------------- CH 21 Appeals
bb.chapter("21. Appeals")
bb.para("The Appeals screen exists for a specific, important scenario: what happens when ABC "
        "Manufacturing's security team disagrees with a verification decision made by Laurelshield's "
        "Assurance Operations staff. In the fully verified demo tenant used throughout this "
        "textbook, this screen shows mostly an empty state, no appeals have been filed, alongside a "
        "form to file an appeal against a specific verification decision.")
bb.screenshot(SHOT("09-appeals.png"), caption="Figure 21.1: Appeals, mostly empty state in ABC Manufacturing's demo tenant, with the file-an-appeal form.")
bb.para("The empty state itself is worth pausing on rather than skipping past. A clean control "
        "results table with zero open appeals is not evidence the appeals mechanism does not "
        "matter; it is evidence that, for this particular tenant, the assessor and decision officer "
        "judgments so far have not produced a disagreement serious enough for the customer to "
        "contest. The mechanism existing and being available is what matters structurally, whether "
        "or not it happens to be in active use on any given day.")
bb.para("Why does an evidence-based, seemingly objective platform need an appeals process at all? "
        "Because ECL and control status, while grounded in evidence, still involve human judgment "
        "at the assessment layer. An assessor reviewing a document submission, or weighing whether "
        "a compensating control is strong enough to justify CONDITIONAL rather than a material gap, "
        "is exercising professional judgment, and professional judgment can reasonably be "
        "contested with additional context the assessor did not have. Appeals is the structured, "
        "logged channel for exactly that conversation, rather than leaving it to an informal email "
        "exchange that would fall outside the platform's evidence trail entirely.")
bb.goodpractice("File an appeal through this screen, with specific supporting context, rather than "
                 "trying to resolve a disagreement about a verification decision through an "
                 "off-platform conversation. Keeping the disagreement, and its resolution, inside "
                 "the platform preserves it as part of the same auditable record that gives every "
                 "other decision its credibility.")

# ---------------------------------------------------------------- CH 22 Audit Trail
bb.chapter("22. Audit Trail")
bb.para("Audit Trail is the customer-facing home of AssuranceLedger, introduced in Chapter 9: a "
        "chronological table of every logged action touching ABC Manufacturing's data, scope "
        "changes, evidence syncs, passport issuance, sharing grants, and, critically, every time a "
        "broker or carrier partner actually accessed something that was shared with them.")
bb.screenshot(SHOT("10-audit-trail.png"), caption="Figure 22.1: Audit Trail, the chronological log of every action touching ABC Manufacturing's data.")
bb.para("This is the screen that proves, rather than merely asserts, the transparency value "
        "proposition stated back on the login screen's bullet points in Chapter 12: \"full audit "
        "trail\" is not marketing language here, it is a literal, browsable log a customer "
        "administrator can open at any time. When Grace grants Granite Peak Insurance Brokers "
        "access on the Sharing & Consent screen, and Granite Peak's broker later actually opens "
        "ABC Manufacturing's passport, that access event appears here, visible to Grace, not hidden "
        "inside Laurelshield's own internal systems where the customer would have no way to confirm "
        "it happened at all.")
bb.keypoint("Audit Trail closes the loop that runs through the entire book. Part I explained why "
            "evidence needs to be independently verifiable rather than self-attested. Part II named "
            "the specific responsibilities, collection, verification, trust, continuity, that turn "
            "raw evidence into a credible passport. Part III has walked through every screen a "
            "customer administrator uses to make that happen. Audit Trail is where all of it "
            "becomes checkable after the fact: not just \"trust that this process happened "
            "correctly,\" but \"here is the log, go look for yourself.\"")
bb.para("This is also the practical, day-to-day partner of the deliberate transparency principle "
        "described in Part I's discussion of selective disclosure: sharing is never a silent, "
        "one-way act from the customer's point of view. Every access is logged and visible back to "
        "the organization it belongs to, which is a meaningfully different posture from a "
        "traditional insurance application process, where an applicant generally has no visibility "
        "at all into who within a carrier's organization reviewed their submission, when, or how "
        "many times.")
bb.para("This concludes the guided walkthrough of the Customer Portal. A customer administrator who "
        "has worked through this part in order, from first login through the Audit Trail, has now "
        "seen every screen they need for the full lifecycle: registering scope, connecting "
        "evidence, reviewing verified control results, mapping supplier dependencies, working "
        "remediation, issuing and managing a signed passport, controlling who can see it, "
        "contesting a decision when warranted, and confirming, independently, that the whole "
        "process behaved exactly as described.")

# ======================================================================
# BACK MATTER: GLOSSARY
# ======================================================================
bb.chapter("Glossary", number="")
bb.para("This glossary consolidates every acronym and term used throughout this textbook, plus a "
        "single quick-reference table of all fifteen Laurelshield Suite product names from Part II.")
bb.h2("Core terms")
bb.table(
    ["Term", "Definition"],
    [
        ["Assurance Boundary / Scope", "The specific legal entity, network, cloud tenant, and application footprint that an assessment and a passport's claims apply to, identified by a persistent scope code (for example, LS-SCOPE-000184)."],
        ["Canonical Control", "A vendor-neutral statement of a security outcome (for example, LS-ID-101, Privileged Authentication MFA) that many different carriers' proprietary questions can be translated to and from, rather than being owned by any single carrier or tool vendor."],
        ["ECL (Evidence Confidence Level)", "A 0-5 scale describing how strongly a piece of evidence, or a control's status, is supported. See the tier definitions below."],
        ["ECL-0", "Not Assessed. No evidence exists yet for this control in this scope."],
        ["ECL-1", "Self-Attestation. Someone stated the control exists or is effective; nobody has independently checked it. Never silently upgraded."],
        ["ECL-2", "Reviewed Document/Policy Evidence. A policy or procedure document was submitted and an assessor reviewed it and recorded an observation."],
        ["ECL-3", "Live Connector Evidence. An automated pull was made directly from the real system, repeated multiple times with consistent results."],
        ["ECL-4", "Operational Test Evidence. A real test was performed and its outcome recorded, for example an actual backup restore or an incident response tabletop exercise."],
        ["ECL-5", "Sustained Live Verification. Repeated live connector evidence maintained consistently over time; the highest tier."],
        ["Connector", "An integration that pulls evidence from a real external system (Identity Provider, EDR, Backup & Recovery, External Attack Surface Scanner, Email Security & DNS, Cloud Platform, or SIEM/Log Management), run in Simulated or, for Identity, Live mode in this build."],
        ["Cyber Risk Passport", "A signed, revocable, portable credential (format example: LS-CRP-CA-000184) listing every canonical control's status, ECL, coverage, and validity window for a scope."],
        ["Remediation", "The workflow for tracking and closing findings that fell short of full verification, ending in independent re-verification rather than self-certified closure."],
        ["Sharing Grant", "A purpose-limited, time-limited, revocable authorization letting a named broker or carrier partner view a specific passport."],
        ["Selective Disclosure", "The principle that a recipient only ever sees the minimum information a sharing grant authorizes, never another party's confidential requirements, and never raw underlying evidence."],
        ["Separation of Duties", "The structural rule that the party who proposes or implements a fix or an assessment can never be the same party who finalizes or independently re-verifies it."],
        ["Material Gap", "A control result serious enough to prevent a clean verified passport status for that control."],
        ["Concentration Risk", "The risk that a single supplier serving multiple insured organizations turns one supplier-side incident into a correlated, multi-policy loss event."],
        ["Claim Evidence Pack", "A sealed, hash-chained, signed manifest of evidence, control state, and supplier graph frozen around an incident date, released to a carrier after independent reviewer approval."],
    ], col_widths=[1.9, 5.2], font_size=9,
)
bb.h2("The Laurelshield Suite, quick reference")
bb.table(
    ["Product Name", "Family", "One-Line Description"],
    [
        ["LaurelProof", "Evidence", "Evidence platform: connectors, operational tests, manual submission"],
        ["LaurelVault", "Evidence", "Evidence repository: hashed, chain-of-custody storage"],
        ["LaurelEvidence", "Evidence", "Evidence infrastructure: shared schema and framework"],
        ["LaurelVerify", "Verification", "Verification platform: assessor/decision-officer workflow, ECL scoring"],
        ["ControlProof", "Verification", "Technical control verification: one control's evidence bundle"],
        ["ControlLedger", "Verification", "Historical control evidence: one control's history over time"],
        ["LaurelTrust", "Trust & Continuity", "Trust/verification platform: the Cyber Risk Passport and its signature"],
        ["LaurelGuard", "Trust & Continuity", "Continuous control assurance: the freshness/expiry engine"],
        ["AssuranceLedger", "Trust & Continuity", "Continuous assurance record: the organization-wide Audit Trail"],
        ["LaurelSignal", "Market-Facing", "Underwriting risk intelligence: the translated output an underwriter sees"],
        ["LaurelLens", "Market-Facing", "Underwriting visibility: the carrier's own dashboard experience"],
        ["InsurGraph", "Market-Facing", "Insurance/control graph: the confidential carrier requirements mapping"],
        ["AssureGraph", "Market-Facing", "Graph-based assurance: the relationship model across policy, insured, supplier, asset, control, evidence, finding"],
        ["LaurelAssure", "Umbrella", "Insurability assurance: the full lifecycle end to end, customer-facing"],
        ["InsurabilityOS", "Umbrella", "The broadest platform proposition: the whole Suite as one vision"],
    ], col_widths=[1.4, 1.4, 4.3], font_size=9,
)

bb.add_footer("Laurelshield Customer Portal Textbook")
bb.save(os.path.join(os.path.dirname(__file__), "..", "Laurelshield_Customer_Portal_Textbook.docx"))
print("saved textbook_customer_portal")
