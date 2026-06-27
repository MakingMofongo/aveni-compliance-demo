# CallGuard — adviser-call compliance & conduct-risk analyser

Ingests a recorded **financial-adviser ↔ customer call transcript** and flags the
**Consumer Duty conduct-risk** moments a UK compliance team cares about — with an
explainable, severity-scored report: every flag points at the **exact phrase**
that triggered it, its **category**, a **severity**, and a one-line **why**.

> **Live demo:** https://makingmofongo.github.io/aveni-compliance-demo/

![CallGuard analysing a mis-selling-risk call](public/cover.png)

Built as a working proof-of-concept that mirrors the call-analysis capability of
[**Aveni Detect**](https://aveni.ai/aveni-detect/) (automated QA & Consumer Duty
monitoring for wealth firms). The three call transcripts are **sample data**; the
detection engine is **real, pure, and unit-tested**. In production these turns
come from a speech-to-text pipeline (Deepgram / Whisper) over the call audio —
the engine is unchanged.

---

## What it detects (and why a compliance team cares)

| Category | What fires it | Example flag |
|---|---|---|
| **Unverified guarantees** | "guaranteed returns", "risk-free", "can't lose" | *critical* — misrepresents capital risk (COBS fair-and-not-misleading) |
| **Missing risk disclosure** | an investment is discussed but **"capital at risk" is never said** | *high* — reasons over the **whole call**, not one phrase (COBS 14.3) |
| **Pressure / urgency** | "offer ends today", "decide now", "don't overthink it" | *high* — denies the customer time to consider |
| **Mis-selling / suitability** | "put your whole ISA in", "don't bother reading the small print" | *high* — concentration + blocking informed consent |
| **Vulnerable customer** | bereavement, confusion, low resilience, distress, health | *high* — the FCA's four drivers of vulnerability |
| **Data & consent** | no call-recording notice, asking for a full PIN/password | *medium/high* — UK GDPR & fraud red flags |

Each flag carries `{ category, severity, label, quote, why, turnIndex, start, end }`.
The `start`/`end` offsets slice **exactly** back to the triggering phrase — proven
by a unit test — which is what powers the inline highlighting in the UI.

The **missing-disclosure** checks are the interesting part: you can't catch a
*missing* disclosure with a keyword match. The engine detects that a *trigger*
appeared in the call (an investment was discussed, a past return was quoted) but
the *required* phrase never did — anywhere in the call.

---

## Three sample calls (deliberate contrast)

1. **Pension consolidation review** → **Low / pass.** Recording notice and risk
   warning given, no pressure, a minor accessibility need handled well. Score 8.
2. **Stocks & Shares ISA — high-growth fund** → **Critical.** Guarantees,
   manufactured urgency, concentration, no risk warning. 14 flags, score 100.
3. **Cash ISA transfer — recently bereaved customer** → **High.** The adviser is
   *technically* compliant on disclosures, but three vulnerability signals
   (bereavement, confusion, low resilience) go unacknowledged — exactly the
   subtle failure a 3%-sampling QA misses. Score 54.

---

## What's actually working (not faked)

| Capability | Where | Real? |
|---|---|---|
| Phrase-level conduct-risk detection w/ offsets | `src/engine/detector.ts` → `analyzeTurn()` | ✅ explainable rule scorer |
| Speaker-scoped rules (guarantee = adviser, vulnerability = customer) | `src/engine/rules.ts` | ✅ |
| Negation handling ("returns are **not** guaranteed" → not flagged) | `detector.ts` | ✅ |
| Missing-disclosure reasoning over the whole call | `detector.ts` → `requiredDisclosures()` | ✅ absence detection |
| Weighted 0–100 risk score + band | `src/engine/util.ts` | ✅ |
| Inline highlight segmentation | `src/lib/highlight.ts` | ✅ pure, tested |
| Live call audio / STT | — | ❌ sample transcripts (wires to Deepgram/Whisper) |

Covered by **31 unit tests** (`npm test`) — the detector classifies every sample
call into the right band, raises the right flags with the right quotes, scopes
rules by speaker, ignores negated statements, and the highlight segmentation
reconstructs the original text exactly.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 31 engine + UI unit tests
npm run build    # static export to ./out
```

Stack: **Next.js 14 (App Router) · React · TypeScript**, no UI dependencies.
Deployed as a static export to GitHub Pages via `.github/workflows/deploy.yml`.

---

## Wiring it to live calls

The detector is pure and side-effect free — `analyzeCall(transcript)` is the only
entry point — so it drops straight onto a live pipeline:

- **Call audio → transcript:** Deepgram / Whisper streaming STT, diarised into
  adviser vs customer turns (the `Turn[]` shape the engine already takes).
- **Scale:** run `analyzeCall` per call in a worker; persist `ComplianceReport`
  for the QA queue, prioritised by `riskScore` and `band`.
- **Model upgrade path:** the rule scorer is the bootstrap layer you ship before
  you have enough labelled audio. Swap individual categories for a fine-tuned
  classifier behind the same `Flag` interface without touching the UI.

---

*Built by Abdul Rasheed as a working proof-of-concept. Honest about what's
sample (the transcripts) and what's real (the engine). The compliance logic that
matters is genuine and tested.*
