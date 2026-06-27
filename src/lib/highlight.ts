// Pure text-segmentation for inline highlighting.
//
// Given a turn's text and a set of spans (flags + good signals that carry char
// offsets), split the text into ordered segments so the UI can render plain text
// and <mark> runs without dangerouslySetInnerHTML. Overlapping spans are
// resolved by keeping the first (already sorted) and skipping any that overlap.

export interface HiSpan {
  id: string;
  start: number;
  end: number;
  /** "flag" tints by severity; "good" is the positive/green mark. */
  kind: "flag" | "good";
  severity?: "critical" | "high" | "medium" | "low";
  category?: string;
}

export interface Segment {
  text: string;
  span?: HiSpan;
}

export function segmentText(text: string, spans: HiSpan[]): Segment[] {
  const usable = spans
    .filter((s) => s.start >= 0 && s.end > s.start && s.end <= text.length)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const chosen: HiSpan[] = [];
  let lastEnd = 0;
  for (const s of usable) {
    if (s.start < lastEnd) continue; // overlaps a span we already kept
    chosen.push(s);
    lastEnd = s.end;
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const s of chosen) {
    if (s.start > cursor) segments.push({ text: text.slice(cursor, s.start) });
    segments.push({ text: text.slice(s.start, s.end), span: s });
    cursor = s.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}
