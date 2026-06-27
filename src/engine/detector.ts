// Compliance detector.
//
// `analyzeTurn` runs the phrase rules over a single transcript turn and returns
// flags (with exact char offsets) plus good-practice signals. `analyzeCall`
// runs every turn, layers the call-level required-disclosure checks on top, then
// scores and groups the findings into an explainable ComplianceReport.
//
// Everything here is pure and side-effect free, so it runs identically in the
// browser, under Vitest, and behind a live STT pipeline (Deepgram/Whisper) — the
// transcript is the only input it needs.

import {
  Category,
  ComplianceReport,
  Flag,
  GoodSignal,
  Severity,
  Speaker,
  Turn,
  CallTranscript,
} from "./types";
import {
  PHRASE_RULES,
  GOOD_RULES,
  DISCLOSURE_RULES,
  PhraseRule,
  GoodRule,
} from "./rules";
import { SEVERITY_WEIGHT, scoreFromWeights, bandFor } from "./util";

const CATEGORIES: Category[] = [
  "mis_selling",
  "guarantee",
  "pressure",
  "vulnerable",
  "data_consent",
  "missing_disclosure",
];

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

interface Span {
  start: number;
  end: number;
  quote: string;
}

/** Collect every non-overlapping match of a rule's patterns within `text`. */
function matchRule(text: string, rule: PhraseRule | GoodRule): Span[] {
  const spans: Span[] = [];
  for (const pat of rule.patterns) {
    // Defensive copy so a shared /g regex never carries lastIndex across calls.
    const re = new RegExp(pat.source, pat.flags.includes("g") ? pat.flags : pat.flags + "g");
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      const raw = m[0];
      const quote = raw.replace(/\s+$/g, "");
      const end = start + quote.length;
      if (quote.trim().length === 0) continue;

      // Negation guard: skip "not guaranteed", "won't lose", etc.
      if ("negate" in rule && rule.negate) {
        const before = text.slice(Math.max(0, start - 12), start);
        if (rule.negate.test(before)) continue;
      }

      // Drop a span that overlaps one already captured for this same rule.
      if (spans.some((s) => start < s.end && end > s.start)) continue;
      spans.push({ start, end, quote });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}

export interface TurnFindings {
  flags: Flag[];
  goodSignals: GoodSignal[];
}

/**
 * Should a speaker-scoped rule be skipped on this turn?
 *
 * A rule with no speaker scope fires on every turn. A scoped rule fires on its
 * own speaker — and ALSO on `unknown` turns, so that a transcript pasted without
 * "Adviser:" / "Customer:" labels still gets fully analysed (we surface rather
 * than silently drop). When the turn's speaker is known, scoping is precise.
 */
function speakerMismatch(ruleSpeaker: Speaker | undefined, turnSpeaker: Speaker): boolean {
  if (!ruleSpeaker) return false;
  if (turnSpeaker === "unknown") return false;
  return ruleSpeaker !== turnSpeaker;
}

/** Analyse a single turn. Pure — no knowledge of the rest of the call. */
export function analyzeTurn(turn: Turn, turnIndex: number): TurnFindings {
  const flags: Flag[] = [];
  const goodSignals: GoodSignal[] = [];

  for (const rule of PHRASE_RULES) {
    if (speakerMismatch(rule.speaker, turn.speaker)) continue;
    for (const span of matchRule(turn.text, rule)) {
      flags.push({
        id: `${turnIndex}:${rule.rule}:${span.start}`,
        category: rule.category,
        severity: rule.severity,
        label: rule.label,
        why: rule.why,
        rule: rule.rule,
        turnIndex,
        speaker: turn.speaker,
        quote: span.quote,
        start: span.start,
        end: span.end,
      });
    }
  }

  for (const rule of GOOD_RULES) {
    if (speakerMismatch(rule.speaker, turn.speaker)) continue;
    for (const span of matchRule(turn.text, rule)) {
      goodSignals.push({
        id: `${turnIndex}:${rule.rule}:${span.start}`,
        rule: rule.rule,
        label: rule.label,
        note: rule.note,
        turnIndex,
        quote: span.quote,
        start: span.start,
        end: span.end,
      });
    }
  }

  return { flags, goodSignals };
}

/** Call-level checks: a required disclosure whose trigger fired but whose
 *  satisfying phrase never appeared anywhere in the call. */
export function requiredDisclosures(turns: Turn[]): Flag[] {
  const adviserText = turns
    .filter((t) => t.speaker !== "customer")
    .map((t) => t.text)
    .join("  \n");
  const allText = turns.map((t) => t.text).join("  \n");

  const out: Flag[] = [];
  for (const rule of DISCLOSURE_RULES) {
    const triggered = rule.always === true || rule.trigger.test(adviserText);
    if (!triggered) continue;
    if (rule.satisfiedBy.test(allText)) continue;
    out.push({
      id: `call:${rule.rule}`,
      category: rule.category,
      severity: rule.severity,
      label: rule.label,
      why: rule.why,
      rule: rule.rule,
      turnIndex: -1,
      speaker: "system",
      quote: "Required disclosure not found in this call",
      start: -1,
      end: -1,
    });
  }
  return out;
}

function emptyByCategory(): Record<Category, Flag[]> {
  return {
    mis_selling: [],
    guarantee: [],
    pressure: [],
    vulnerable: [],
    data_consent: [],
    missing_disclosure: [],
  };
}

function emptyBySeverity(): Record<Severity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0 };
}

/** Analyse a whole call into an explainable, scored compliance report. */
export function analyzeCall(call: CallTranscript): ComplianceReport {
  // An empty transcript has nothing to analyse — don't raise an "always"
  // disclosure (e.g. missing recording notice) against a blank editor.
  if (call.turns.length === 0) {
    return {
      flags: [],
      goodSignals: [],
      byCategory: emptyByCategory(),
      bySeverity: emptyBySeverity(),
      riskScore: 0,
      band: "Low",
      summary: "No transcript to analyse yet.",
    };
  }

  const flags: Flag[] = [];
  const goodSignals: GoodSignal[] = [];

  call.turns.forEach((turn, i) => {
    const f = analyzeTurn(turn, i);
    flags.push(...f.flags);
    goodSignals.push(...f.goodSignals);
  });

  flags.push(...requiredDisclosures(call.turns));

  const byCategory = emptyByCategory();
  const bySeverity = emptyBySeverity();
  for (const f of flags) {
    byCategory[f.category].push(f);
    bySeverity[f.severity] += 1;
  }

  const riskScore = scoreFromWeights(flags.map((f) => f.severity));
  const band = bandFor(riskScore);

  const topCats = CATEGORIES.filter((c) => byCategory[c].length > 0)
    .sort((a, b) => byCategory[b].length - byCategory[a].length)
    .slice(0, 3)
    .map((c) => CATEGORY_LABEL[c]);

  const sevParts: string[] = [];
  if (bySeverity.critical) sevParts.push(`${bySeverity.critical} critical`);
  if (bySeverity.high) sevParts.push(`${bySeverity.high} high`);
  const sevText = sevParts.length ? ` (${sevParts.join(", ")})` : "";

  const summary =
    flags.length === 0
      ? "No conduct-risk flags raised. Required disclosures present."
      : `${flags.length} flag${flags.length > 1 ? "s" : ""}${sevText} across ${topCats.join(", ")}.`;

  return {
    flags,
    goodSignals,
    byCategory,
    bySeverity,
    riskScore,
    band,
    summary,
  };
}

export interface DisclosureCheck {
  rule: string;
  name: string;
  status: "present" | "missing" | "na";
  severity: Severity;
}

/** Per-call status of each required disclosure: given, missing, or not
 *  applicable (its trigger never fired). Drives the "Required disclosures"
 *  checklist in the UI. */
export function disclosureChecklist(call: CallTranscript): DisclosureCheck[] {
  const adviserText = call.turns
    .filter((t) => t.speaker !== "customer")
    .map((t) => t.text)
    .join("  \n");
  const allText = call.turns.map((t) => t.text).join("  \n");

  return DISCLOSURE_RULES.map((rule) => {
    const triggered = rule.always === true || rule.trigger.test(adviserText);
    if (!triggered) {
      return { rule: rule.rule, name: rule.name, status: "na" as const, severity: rule.severity };
    }
    const present = rule.satisfiedBy.test(allText);
    return {
      rule: rule.rule,
      name: rule.name,
      status: present ? ("present" as const) : ("missing" as const),
      severity: rule.severity,
    };
  });
}

export const CATEGORY_LABEL: Record<Category, string> = {
  mis_selling: "Mis-selling / suitability",
  guarantee: "Unverified guarantees",
  pressure: "Pressure & urgency",
  vulnerable: "Vulnerable customer",
  data_consent: "Data & consent",
  missing_disclosure: "Missing disclosures",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export { CATEGORIES, SEVERITIES, SEVERITY_WEIGHT };
