// Shared types for the call-compliance analysis engine.
//
// The engine ingests an adviser <-> customer call transcript and produces an
// explainable compliance report: every flag points at the exact phrase that
// triggered it, the conduct-risk category, a severity, and a one-line "why".

// "unknown" is used for pasted lines whose speaker could not be identified
// (e.g. raw prose with no "Adviser:" / "Customer:" labels). Speaker-scoped
// rules still fire on unknown turns so detection degrades gracefully.
export type Speaker = "adviser" | "customer" | "system" | "unknown";

/** Conduct-risk categories a UK financial-compliance team cares about. */
export type Category =
  | "mis_selling" // unsuitable advice / discouraging due diligence
  | "guarantee" // unverified guarantees / overpromising ("guaranteed returns")
  | "pressure" // pressure / urgency selling tactics
  | "vulnerable" // FCA vulnerable-customer signals
  | "data_consent" // data protection / consent / recording handling
  | "missing_disclosure"; // a required risk disclosure was never given

export type Severity = "critical" | "high" | "medium" | "low";

export type RiskBand = "Low" | "Medium" | "High" | "Critical";

/**
 * A single compliance flag.
 *
 * Phrase-level flags carry the turn index plus the [start, end) character
 * offsets of the triggering phrase, so the UI can highlight it inline and the
 * tests can prove `text.slice(start, end) === quote`.
 *
 * Call-level flags (e.g. a required disclosure that was never given anywhere in
 * the call) use turnIndex === -1 and start/end === -1 — there is no phrase to
 * point at, which is the whole point of the flag.
 */
export interface Flag {
  id: string;
  category: Category;
  severity: Severity;
  /** Short human title, e.g. "Bereavement / recent life event". */
  label: string;
  /** One-line explanation of why this matters for compliance. */
  why: string;
  /** Stable rule id that fired, e.g. "guarantee_risk_free". */
  rule: string;
  /** Index into transcript.turns, or -1 for a call-level finding. */
  turnIndex: number;
  speaker: Speaker;
  /** Exact triggering phrase, or a description of what was required-but-absent. */
  quote: string;
  /** Char offsets within the turn text, or -1/-1 for call-level findings. */
  start: number;
  end: number;
}

/** A positive signal — good practice that mitigates risk. Shown, not scored. */
export interface GoodSignal {
  id: string;
  rule: string;
  label: string;
  note: string;
  turnIndex: number;
  quote: string;
  start: number;
  end: number;
}

export interface ComplianceReport {
  flags: Flag[];
  goodSignals: GoodSignal[];
  byCategory: Record<Category, Flag[]>;
  bySeverity: Record<Severity, number>;
  /** 0..100 weighted conduct-risk score. */
  riskScore: number;
  band: RiskBand;
  summary: string;
}

export interface Turn {
  speaker: Speaker;
  /** Clock label for display, e.g. "00:42". Empty when none was supplied. */
  t: string;
  text: string;
  /** Original speaker label as written, e.g. "Adviser", "Dean", "Agent 2". */
  name?: string;
}

export interface CallTranscript {
  id: string;
  title: string;
  blurb: string;
  adviser: string;
  customer: string;
  product: string;
  durationLabel: string;
  turns: Turn[];
}
