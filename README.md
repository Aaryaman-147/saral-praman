# Saral Praman

**A compiler for your government application.** Saral Praman checks your
documents against the real rejection rules *before* you submit, and tells
you in plain language what's happening at every stage after — so the
rejection happens on your phone, not at a tehsil counter three weeks later.

> Prototype built for a hackathon. Not an official government product, not
> affiliated with any government department. All application data,
> documents, and status updates in this project are mock/synthetic — see
> **[What's mocked](#whats-real-vs-mocked)** below.

---

## The problem

Every year, huge numbers of first-time applicants — most commonly
18–24-year-olds applying for their own income, domicile, or caste
certificate for the first time, often to meet a college admission or
scholarship deadline — get turned away or delayed for small, fixable
reasons:

- A self-employment affidavit missing a notary stamp
- An address proof older than the 6-month window most states require
- A name spelled differently across Aadhaar, address proof, and the
  application form
- Applying at the wrong Tehsil after a recent address change

These aren't edge cases — document mismatches are consistently the single
largest cause of rejection at this stage, not eligibility or fraud. The
rules that would prevent this already exist (on a noticeboard, in a state
PDF, in a CSC operator's head) — nobody translates them into "does *my*
specific document, in *my* specific case, satisfy them?" before the
applicant submits. And YouTube/WhatsApp self-help tutorials are often 1–3
years stale against a portal that's since changed.

Full problem framing, target user, and reasoning: see [`PRD.md`](./PRD.md).

## What this prototype does

1. **Eligibility pre-check** — a few plain-language questions before any
   form-filling starts
2. **AI document pre-check** — each uploaded document is checked
   immediately against a plain-language, human-auditable rule set, with a
   specific verdict and reason — not a generic "issue found"
3. **Readiness score** before submission — "3 of 4 documents look good, 1
   needs attention" (informational, not a game mechanic — see PRD §6.2 for
   why we deliberately avoided points/streaks/badges)
4. **Stage-by-stage status tracking** — Submitted → Patwari verification →
   Tehsildar review → Issued, each stage explained in plain language, with
   who actually handles it and typical duration
5. **Rejection → fix → resubmit loop** — a specific, plain-language
   rejection reason, with a direct path to upload a corrected document
   without restarting the whole application
6. **Bilingual AI assistant** (English/Hindi) — grounded in the applicant's
   real current application state, answering "why is this stuck," "how long
   will this take," etc.

## Why this is better than the current experience

- **Prevention, not just explanation.** Existing portals tell you *after*
  submission (or after an in-person rejection) that something's wrong.
  This catches it before you submit.
- **Plain language, not bureaucratic jargon.** "Pending with the Patwari"
  becomes "the local officer who confirms your address has your file, this
  usually takes 3–10 days, you don't need to do anything right now."
- **Built for someone doing this for the first time**, often on behalf of a
  parent — not assuming prior familiarity with tehsils, jurisdictions, or
  document formats.
- **Mobile-first**, designed for slower connections and less powerful
  devices, not a desktop government portal shrunk down.

## What's real vs. mocked

| | |
|---|---|
| ✅ Real | Application state machine (stage transitions, timestamps, rejection logic) — real server-side logic |
| ✅ Real | Document rules engine — config-driven, not hardcoded per certificate type |
| ✅ Real | OpenAI API integration — live calls when `OPENAI_API_KEY` is set, for both document pre-check and the assistant |
| 🟡 Mocked, disclosed in-app | Patwari/Tehsildar government workflow — simulated on a timer, standing in for a real integration; the status tracker carries a visible label saying so |
| 🟡 Mocked | Application & document storage — in-memory, not a persistent database or encrypted file storage |
| 🟡 Mocked | Identity/auth — no real OTP or Aadhaar check; all applicant data is synthetic |
| 🟡 Mocked | Certificate PDF generation, payment/fee handling |

Full breakdown, plus what it would take to run this for real (infra,
government integration paths, AI trust-at-scale, adoption strategy via
WhatsApp/CSC operators): see [`SCALE_AND_ADOPTION.md`](./SCALE_AND_ADOPTION.md).

## Tech stack

- Next.js (App Router), React
- OpenAI API (`gpt-4o-mini`) — vision for document pre-check, text for the
  assistant; both fall back to a clearly-labeled mock response if
  `OPENAI_API_KEY` isn't set, so the app runs fully without a key
- Tailwind CSS

## Running locally

```bash
npm install
npm run dev
```

Optional — enable live AI calls instead of mock fallback responses:

```bash
# .env.local
OPENAI_API_KEY=sk-...
```

Without a key, both AI features still work end-to-end using deterministic
mock responses, clearly labeled in the UI as demo mode.

## Project docs

- [`PRD.md`](./PRD.md) — problem statement, target user, MVP scope, full
  user journey, AI implementation approach, edge cases
- [`SCALE_AND_ADOPTION.md`](./SCALE_AND_ADOPTION.md) — real infrastructure
  needed, government integration paths, AI trust/accuracy at scale,
  adoption strategy

## Disclaimer

This is an independent hackathon prototype. It is not affiliated with,
endorsed by, or connected to any state or central government department.
No real Aadhaar, PAN, OTP, payment, or government-system data is used
anywhere in this project.
