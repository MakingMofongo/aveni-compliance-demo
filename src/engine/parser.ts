// Transcript parser.
//
// Turns free-text into the structured Turn[] the detector consumes. This is the
// bridge between "a reviewer pastes a call" and the pure analysis engine: the
// sample calls and anything typed into the editor flow through the *same*
// parseCall -> analyzeCall path, so nothing in the UI is ever a canned result.
//
// It is deliberately forgiving. It understands the formats real call data comes
// in — "Adviser:" / "Customer:" labels, "[Agent]" brackets, leading "[00:42]"
// timestamps, diarised "Speaker 1:" labels, and multi-line turns — and when a
// line carries no label at all it keeps it as an `unknown`-speaker turn so the
// detector still analyses it (speaker-scoped rules fall back to firing on
// unknown turns). Pure and dependency-free, like the rest of the engine.

import { CallTranscript, Speaker, Turn } from "./types";

const ADVISER_RE =
  /^(?:financial\s+)?(?:advis(?:e|o)r|agent|rep(?:resentative)?|broker|consultant|salesperson|sales\s*rep|seller|fa|operator|firm)\b/i;

const CUSTOMER_RE =
  /^(?:customer|client|caller|consumer|member|policyholder|cust|the\s+customer)\b/i;

/** Map a written speaker label to a canonical role. Ambiguous labels
 *  ("Speaker 1", a bare name) resolve to `unknown`, which still gets analysed. */
export function roleOf(label: string): Speaker {
  const l = label.trim();
  if (ADVISER_RE.test(l)) return "adviser";
  if (CUSTOMER_RE.test(l)) return "customer";
  return "unknown";
}

/** Does this pre-colon fragment look like a speaker label rather than prose?
 *  Labels are short, word-like, and free of sentence punctuation. */
function isLabelLike(s: string): boolean {
  const t = s.trim();
  if (t.length === 0 || t.length > 32) return false;
  if (/[.?!,;…]/.test(t)) return false;
  if (t.split(/\s+/).length > 5) return false;
  // Must contain a letter (rejects pure numbers / times that slipped through).
  return /[A-Za-z]/.test(t);
}

const TS_RE = /^[\[(]?\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[\])]?\s*[-–—]?\s*/;
const BRACKET_LABEL_RE = /^\[\s*([^\]]{1,32}?)\s*\]\s*[:\-–—]?\s*/;
const COLON_LABEL_RE = /^([A-Za-z][A-Za-z0-9 .'/&_-]{0,30}?)\s*[:：]\s+/;

/**
 * Parse raw transcript text into turns.
 *
 * - `[00:42] Adviser: hello`  -> { t:"00:42", speaker:"adviser", text:"hello" }
 * - `[Customer] yes`          -> { speaker:"customer", text:"yes" }
 * - a line with no label is appended to the previous *labelled* turn as a
 *   continuation, or kept as its own `unknown` turn if nothing precedes it.
 */
export function parseTurns(text: string): Turn[] {
  const turns: Turn[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "") continue;

    // 1. Optional leading timestamp.
    let rest = line;
    let t = "";
    const ts = rest.match(TS_RE);
    if (ts) {
      t = ts[1];
      rest = rest.slice(ts[0].length);
    }

    // 2. Optional speaker label — bracketed first, then "Label:" form.
    let label: string | null = null;
    const bracket = rest.match(BRACKET_LABEL_RE);
    if (bracket) {
      label = bracket[1].trim();
      rest = rest.slice(bracket[0].length);
    } else {
      const colon = rest.match(COLON_LABEL_RE);
      if (colon && isLabelLike(colon[1])) {
        label = colon[1].trim();
        rest = rest.slice(colon[0].length);
      }
    }

    const body = rest.trim();

    if (label !== null) {
      turns.push({ speaker: roleOf(label), t, text: body, name: label });
      continue;
    }

    // 3. No label: continue the previous labelled turn, else stand alone.
    const prev = turns[turns.length - 1];
    if (prev && prev.name) {
      prev.text = `${prev.text} ${line}`.trim();
    } else {
      turns.push({ speaker: "unknown", t, text: line });
    }
  }

  return turns;
}

export interface CallMeta {
  id: string;
  title: string;
  blurb: string;
  adviser: string;
  customer: string;
  product: string;
  durationLabel: string;
}

/** First display name seen for a given role, if any. */
function firstName(turns: Turn[], role: Speaker): string | undefined {
  return turns.find((t) => t.speaker === role && t.name)?.name;
}

/**
 * Parse free text into a full CallTranscript. Sample calls supply `meta` for
 * rich display; pasted text supplies none and we derive sensible defaults so
 * the analyser still has parties, a title and a duration to show.
 */
export function parseCall(text: string, meta: Partial<CallMeta> = {}): CallTranscript {
  const turns = parseTurns(text);
  const last = turns[turns.length - 1];

  return {
    id: meta.id ?? "pasted",
    title: meta.title ?? "Pasted transcript",
    blurb: meta.blurb ?? "",
    adviser: meta.adviser ?? firstName(turns, "adviser") ?? "Adviser",
    customer: meta.customer ?? firstName(turns, "customer") ?? "Customer",
    product: meta.product ?? "",
    durationLabel: meta.durationLabel ?? (last?.t ? last.t : ""),
    turns,
  };
}
