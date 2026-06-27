import { describe, it, expect } from "vitest";
import { segmentText, HiSpan } from "./highlight";

describe("segmentText", () => {
  const text = "the returns are guaranteed and risk-free";

  it("splits text into plain and marked segments that reconstruct the original", () => {
    const spans: HiSpan[] = [
      { id: "a", start: 16, end: 26, kind: "flag", severity: "critical" }, // "guaranteed"
      { id: "b", start: 31, end: 40, kind: "flag", severity: "critical" }, // "risk-free"
    ];
    const segs = segmentText(text, spans);
    expect(segs.map((s) => s.text).join("")).toBe(text);
    expect(segs.filter((s) => s.span).map((s) => s.text)).toEqual([
      "guaranteed",
      "risk-free",
    ]);
  });

  it("drops overlapping spans, keeping the first", () => {
    const spans: HiSpan[] = [
      { id: "a", start: 4, end: 11, kind: "flag" },
      { id: "b", start: 8, end: 15, kind: "flag" }, // overlaps a
    ];
    const segs = segmentText(text, spans);
    expect(segs.filter((s) => s.span)).toHaveLength(1);
    expect(segs.map((s) => s.text).join("")).toBe(text);
  });

  it("returns a single plain segment when there are no spans", () => {
    expect(segmentText(text, [])).toEqual([{ text }]);
  });
});
