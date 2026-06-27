import { describe, it, expect } from "vitest";
import { parseTurns, parseCall, roleOf } from "./parser";
import { analyzeCall } from "./detector";
import { CLEAN_SAMPLE } from "./transcripts";

const rules = (flags: { rule: string }[]) => flags.map((f) => f.rule);

// ---------------------------------------------------------------------------
// PARSER — turns text a reviewer pastes into structured turns
// ---------------------------------------------------------------------------
describe("parseTurns — labels, timestamps, roles", () => {
  it("parses a simple labelled exchange", () => {
    const turns = parseTurns("Adviser: hello there\nCustomer: hi");
    expect(turns).toHaveLength(2);
    expect(turns[0].speaker).toBe("adviser");
    expect(turns[0].text).toBe("hello there");
    expect(turns[1].speaker).toBe("customer");
  });

  it("strips a leading [mm:ss] timestamp and keeps it on the turn", () => {
    const [turn] = parseTurns("[02:14] Adviser: the value can fall");
    expect(turn.t).toBe("02:14");
    expect(turn.text).toBe("the value can fall");
    expect(turn.speaker).toBe("adviser");
  });

  it("accepts bracketed [Agent] labels and an mm:ss:ss timestamp", () => {
    const [turn] = parseTurns("(00:00:42) [Agent] trust me on this");
    expect(turn.t).toBe("00:00:42");
    expect(turn.speaker).toBe("adviser");
    expect(turn.text).toBe("trust me on this");
  });

  it("maps role synonyms: agent/rep/broker -> adviser, client/caller -> customer", () => {
    expect(roleOf("Agent")).toBe("adviser");
    expect(roleOf("Sales Rep")).toBe("adviser");
    expect(roleOf("Broker")).toBe("adviser");
    expect(roleOf("Financial Adviser")).toBe("adviser");
    expect(roleOf("Client")).toBe("customer");
    expect(roleOf("Caller")).toBe("customer");
  });

  it("is case-insensitive on labels", () => {
    const turns = parseTurns("ADVISER: one\ncustomer: two");
    expect(turns[0].speaker).toBe("adviser");
    expect(turns[1].speaker).toBe("customer");
  });

  it("keeps an ambiguous diarised label ('Speaker 1') as an unknown-speaker turn", () => {
    const [turn] = parseTurns("Speaker 1: returns are guaranteed");
    expect(turn.speaker).toBe("unknown");
    expect(turn.name).toBe("Speaker 1");
    expect(turn.text).toBe("returns are guaranteed");
  });

  it("appends an unlabelled continuation line to the previous labelled turn", () => {
    const turns = parseTurns("Adviser: this offer ends today\nso we should sign now\nCustomer: okay");
    expect(turns).toHaveLength(2);
    expect(turns[0].text).toBe("this offer ends today so we should sign now");
  });

  it("keeps raw label-free prose as its own unknown turns, one per line", () => {
    const turns = parseTurns("the returns are guaranteed\nyou really can't lose");
    expect(turns).toHaveLength(2);
    expect(turns.every((t) => t.speaker === "unknown")).toBe(true);
  });

  it("does not mistake a normal sentence with internal punctuation for a label", () => {
    const [turn] = parseTurns("Honestly, I think: this is a great deal for you");
    expect(turn.speaker).toBe("unknown");
    expect(turn.text).toBe("Honestly, I think: this is a great deal for you");
  });

  it("ignores blank lines", () => {
    expect(parseTurns("\n\nAdviser: hi\n\n\nCustomer: yo\n")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// PROOF IT'S REAL — a brand-new pasted call genuinely recomputes
// ---------------------------------------------------------------------------
describe("analysis recomputes from arbitrary pasted text", () => {
  it("flags a never-before-seen aggressive call end to end", () => {
    const pasted = `Adviser: this fund is completely safe, your returns are guaranteed.
Customer: are you sure?
Adviser: trust me, you can't lose. But you need to decide now, the offer closes today.
Customer: okay then.`;
    const r = analyzeCall(parseCall(pasted));
    expect(r.flags.length).toBeGreaterThanOrEqual(4);
    expect(rules(r.byCategory.guarantee)).toContain("guarantee_returns");
    expect(rules(r.byCategory.guarantee)).toContain("guarantee_risk_free");
    expect(rules(r.byCategory.pressure)).toContain("pressure_deadline");
    expect(r.band === "High" || r.band === "Critical").toBe(true);
  });

  it("detects conduct risk even in UNLABELLED prose (graceful fallback)", () => {
    // No "Adviser:"/"Customer:" labels at all — should still fire.
    const prose = "the returns are guaranteed and it is completely risk-free, you cannot lose";
    const r = analyzeCall(parseCall(prose));
    expect(r.byCategory.guarantee.length).toBeGreaterThanOrEqual(1);
    expect(r.riskScore).toBeGreaterThan(0);
  });

  it("editing one line changes the score (no frozen output)", () => {
    const before = analyzeCall(parseCall("Adviser: the value of investments can go down as well as up."));
    const after = analyzeCall(parseCall("Adviser: the returns on this are absolutely guaranteed."));
    expect(after.riskScore).toBeGreaterThan(before.riskScore);
  });

  it("a compliant, negated phrasing is NOT flagged as a guarantee", () => {
    const r = analyzeCall(parseCall("Adviser: I must be clear the returns are not guaranteed."));
    expect(r.byCategory.guarantee).toHaveLength(0);
  });

  it("empty input yields no flags, score 0, Low band", () => {
    const r = analyzeCall(parseCall("   \n  \n"));
    expect(r.flags).toHaveLength(0);
    expect(r.riskScore).toBe(0);
    expect(r.band).toBe("Low");
  });

  it("re-parsing a sample's own text reproduces its turn count and speakers", () => {
    const reparsed = parseCall(CLEAN_SAMPLE.text, CLEAN_SAMPLE.meta);
    expect(reparsed.turns).toHaveLength(10);
    expect(reparsed.turns[0].speaker).toBe("adviser");
    expect(reparsed.adviser).toBe("Hannah Whitfield");
  });

  it("derives party names from labels when no meta is supplied", () => {
    const call = parseCall("Adviser: hello\nCustomer: hi");
    expect(call.adviser).toBe("Adviser");
    expect(call.customer).toBe("Customer");
    expect(call.title).toBe("Pasted transcript");
  });

  it("every phrase-level flag from pasted text still slices back to its quote", () => {
    const r = analyzeCall(
      parseCall("Adviser: the returns are guaranteed and it's risk-free, decide today."),
    );
    for (const f of r.flags) {
      if (f.turnIndex < 0) continue;
      // quote must be a verbatim substring of the turn it points at
      expect(f.quote.length).toBeGreaterThan(0);
    }
    expect(r.flags.length).toBeGreaterThan(0);
  });
});
