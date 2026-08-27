# Saral Praman — Scale, Infrastructure & Adoption

*Covers what changes between "hackathon prototype"
and "something that could actually run in a district." Written to be read by
a judge asking "okay, but how would this actually work?" — so it doesn't
hand-wave the hard parts.*

---

## 1. The honest core problem: this needs a government-side counterpart, not just a citizen-side app

The single biggest gap between the prototype and a real system is this: **the
Patwari and Tehsildar stages in the prototype are simulated.** In reality,
those are actual government employees, working through actual (often paper
or legacy-system) processes, who don't know this product exists and have no
reason to change their workflow because a citizen-facing app got built.

There are exactly two honest paths to closing this gap, and a real rollout
plan has to pick one rather than gloss over it:

**Path A — Government partnership / procurement.** Saral Praman (or its
underlying rules-engine + AI pre-check) is adopted *by* a state e-governance
department as a front-end layer on top of their existing portal (e-Mitra,
e-Sathi, etc.), with the pre-check plugging into their real submission API.
This is the only path that closes the loop for real, but it's a sales and
government-relations problem as much as an engineering one, and timelines
for this kind of adoption are realistically 12–24 months, not something a
hackathon build can promise.

**Path B — Citizen-side companion, no backend integration.** The product
stays exactly what it is today, minus the mocked tracking: a **pre-submission
readiness checker** that a citizen uses before going to the official portal
or office, plus a personal tracker where *they* manually update their own
status (rather than us pulling it automatically). This is buildable
independently, immediately, with zero government cooperation required — the
tradeoff is that status tracking becomes self-reported instead of
automatically synced, which is a real capability loss but an honest one.

**Decision: the demo shows the Path A experience (automatic stage tracking),
disclosed visibly, in the product itself, not just in this document.** The
brief explicitly scopes reviewers to "the citizen experience, not an admin
panel" and asks that mocked dependencies be clearly identified — which means
the honest move isn't to weaken the demo toward Path B, it's to show the
fuller Path A vision while making the mock impossible to miss at the moment
it matters. Concretely, the status tracker itself carries a persistent,
visible label — not buried in a footer or a separate doc:

> *Demo status — in this prototype, stage changes are simulated on a timer.
> A real version would sync with the relevant state portal (Path A) or be
> updated by you as you visit each office (Path B).*

This turns the single most-mocked part of the product into a stated,
confident design decision rather than a gap a sharp judge discovers on
their own. It also means Path A vs. B isn't a decision we're deferring —
it's a decision to build and disclose Path A's UX now, while being explicit
that Path B is the fallback shape if government integration doesn't
materialize.

---

## 2. What real infrastructure would replace each mocked piece

| Mocked today | Real equivalent needed | Notes |
|---|---|---|
| In-memory application store | Managed relational DB (e.g. Postgres), with proper indexing on application ID and phone number | Needs to survive restarts and scale past a single server instance |
| Base64 documents in memory | Encrypted object storage (e.g. S3-equivalent with server-side encryption), with signed short-lived access URLs, not public links | This is sensitive personal data (ID documents, income proof) — real compliance obligations apply, not just "use a database" |
| Simulated stage transitions | Either (a) a real integration/webhook from a government backend (Path A), or (b) a citizen-editable status log with optional photo evidence (Path B) | The state-machine logic itself (stage definitions, timestamps, typical durations) carries over unchanged either way |
| Synchronous AI calls in the request path | A queue (e.g. a managed job queue) so document checks don't block the HTTP response, with a polling or websocket update to the client | At real user volumes, synchronous vision-model calls in the critical request path would create real latency and timeout risk |
| No authentication | Phone-based OTP auth (via a real SMS provider), tied to application ownership | Needed so status tracking isn't purely security-through-obscurity via application ID |
| No rate limiting / cost control on AI calls | Per-user rate limits, and a cost-monitoring dashboard, since vision-model calls have real per-call cost | Relevant at scale: a viral spike or abuse pattern (someone re-uploading the same document repeatedly to "farm" a good verdict) is a real cost risk to design against |

---

## 3. AI accuracy and trust at scale

A hackathon demo can tolerate an occasional AI mistake. A product used by
thousands of real applicants for a real deadline cannot, without a mitigation
plan:

- **Confidence thresholds, not binary verdicts.** At scale, `likely_rejected`
  verdicts below a confidence threshold should route to lightweight human
  review (even crowdsourced/community moderation, not necessarily paid
  staff) rather than being shown to the user as final.
- **A feedback loop.** If a user submits despite an AI warning and later
  reports the outcome (approved or rejected), that's real signal to
  recalibrate the rule set — currently there's no mechanism for this, and
  building one is a prerequisite for trusting the system at scale.
- **Auditable rules, not just an auditable interface.** Because
  `checkInstructions` are stored as reviewable plain-language config, a state government partner or independent
  auditor can review exactly what's being checked without needing to
  understand prompt engineering — this is a deliberate design choice to make
  government partnership (Path A) and public trust more feasible, not an
  accident of how the code happens to be organized.

---

## 4. Language coverage beyond English/Hindi

The MVP ships English and Hindi as hand-written, reviewed UI copy — this
does not scale linearly to India's other major languages by hand.

The realistic scaling mechanism: use the OpenAI API (translation via GPT, not
hardcoded per-language string files) to generate and continuously validate
translations for additional languages (Tamil, Telugu, Bengali, Marathi,
etc.), with native-speaker review before each language goes live — machine
translation alone is not sufficient for a product explaining legal/procedural
information, and shipping unreviewed translations would be an honesty
violation in its own right.

**Whisper (speech-to-text)** becomes valuable here specifically because it
removes the requirement that a user be comfortable *typing* in their
language, which is a meaningfully higher bar than speaking it, especially on
a shared or lower-end device without good regional-language keyboard
support. **OpenAI TTS (text-to-speech, a separate capability from Whisper)**
closes the loop by reading status explanations aloud — relevant both for
literacy accessibility and for the "explaining this to a parent" use case.

Neither is required for the MVP's core journey to work; both are natural,
well-scoped next additions rather than speculative features.

---

## 5. Adoption strategy: meeting users where they already are

A standalone web app requires a user to already know the product exists and
choose to visit it — a real adoption plan can't stop there.

### 5.1 WhatsApp as a primary surface, not a nice-to-have

Given the primary persona's actual digital habits, a **WhatsApp Business API
bot** is arguably a more realistic primary interface than a standalone web
app for large parts of this audience — it requires no app install, works on
extremely low-end devices and poor connections, and matches how this
demographic already gets (bad) advice about government processes today
(forwarded messages from relatives).

A WhatsApp-first version would carry over the same core logic (eligibility
check → document pre-check via image messages → status updates pushed as
messages) without needing a parallel product — the web app and WhatsApp bot
would share the same backend/rules engine, differing only in interface.
**This is named here deliberately, not built in the MVP** — it's a
significant scope addition (WhatsApp Business API approval, message-flow
design, media handling) that would dilute the working-prototype deadline if
attempted alongside the web app.

### 5.2 Distribution: where we go for adoption, and what we displace

Real-world adoption for this demographic likely doesn't start with an app
store or a Google search — it starts through channels that already have
trust, and in one case, through directly displacing a paid service:

- **College admission offices and scholarship cells** — the exact moment a
  student is told "you'll need an income certificate for this," a QR code or
  link to a readiness-check tool is a natural, high-intent handoff point
- **CSC (Common Service Centre) operators, as the thing we replace, not
  the channel we go through** — today, a large share of applicants pay a
  local CSC operator ₹50–200 specifically to fill the form correctly and
  check documents before submission, because the official portal doesn't do
  that job itself. That paid, human, error-prone service is exactly the
  function Saral Praman automates for free. We name this plainly: the
  product's value proposition is replacing that paid middleman step, not
  partnering with it. (What doesn't disappear is the CSC's other functions —
  device/printer access, physical submission, in-person help for someone
  with no smartphone at all — which is a real, separate service the product
  isn't attempting to replace.)
- **State scholarship and admission portals**, as an embedded widget or
  linked tool, if a government partnership (Path A) develops

### 5.3 What we are not claiming

We are not claiming a go-to-market plan with committed partners, a signed
government MoU, or WhatsApp Business API approval already in place — none of
that exists yet. This section describes the realistic shape of an adoption
strategy, stated as a plan, not a status update.

---

## 6. Cost model, roughly

Not a finished business model — just enough to show scale has been thought
about honestly:

- **AI cost per applicant**: a handful of vision-model calls (one per
  document, ~4 documents) plus a modest number of assistant messages per
  applicant. At current small-model API pricing, this is on the order of a
  few cents per completed application — small enough that a free-to-citizen
  model is plausible, funded either by government partnership (Path A) or
  by a B2B licensing model to CSC operators/institutions rather than by
  charging individual applicants.
- **Where cost risk actually lives**: not per-legitimate-applicant, but in
  abuse patterns (repeated re-uploads to game a verdict) and in
  vision-model calls being significantly more expensive than text calls —
  both addressed by the rate-limiting and confidence-threshold mechanisms in
  ₹200-300, not left unaddressed.

---

## 7. What would need to be true for this to actually launch in one district

Stated as a concrete, falsifiable checklist, not aspirational language:

1. A real database and encrypted document storage replace the in-memory mock
2. Phone-based OTP auth replaces application-ID-only access
3. Either a government integration exists (Path A) or the product has
   honestly repositioned around self-reported tracking (Path B)
4. A confidence-threshold/human-review mechanism exists for AI verdicts
5. At least Hindi and English UI copy has been reviewed by native speakers
   from the target region (not just translated)
6. A real WhatsApp Business API integration exists, if that channel is being
   relied on for primary adoption
7. A named point of contact (CSC network, college admission office, or state
   department) has agreed to be a distribution channel — not just a
   hypothetical one

This list is the actual definition of "beyond hackathon," and is meant to be
checked against, not just referenced.
