import { describe, it, expect } from "vitest";
import { analyzeCall, analyzeTurn, requiredDisclosures } from "./detector";
import {
  CLEAN_CALL,
  MISSELLING_CALL,
  VULNERABLE_CALL,
  AI_AGENT_CALL,
} from "./transcripts";
import { Turn, Flag } from "./types";
import { bandFor, scoreFromWeights } from "./util";

const rules = (flags: Flag[]) => flags.map((f) => f.rule);

// ---------------------------------------------------------------------------
// CLEAN CALL  → Low / Pass
// ---------------------------------------------------------------------------
describe("clean call", () => {
  const r = analyzeCall(CLEAN_CALL);

  it("scores Low and raises no critical or high flags", () => {
    expect(r.band).toBe("Low");
    expect(r.riskScore).toBeLessThan(12);
    expect(r.bySeverity.critical).toBe(0);
    expect(r.bySeverity.high).toBe(0);
  });

  it("has the recording notice and risk warning, so no missing disclosures", () => {
    expect(r.byCategory.missing_disclosure).toHaveLength(0);
    expect(r.byCategory.data_consent).toHaveLength(0);
  });

  it("still surfaces the minor accessibility need as a low vulnerability flag", () => {
    expect(r.byCategory.vulnerable.length).toBeGreaterThanOrEqual(1);
    expect(r.byCategory.vulnerable.every((f) => f.severity === "low")).toBe(true);
  });

  it("detects good-practice signals (recording, risk warning, vulnerability support)", () => {
    const gr = r.goodSignals.map((g) => g.rule);
    expect(gr).toContain("good_recording_notice");
    expect(gr).toContain("good_risk_warning");
    expect(gr).toContain("good_vulnerability_support");
  });
});

// ---------------------------------------------------------------------------
// MIS-SELLING CALL  → Critical
// ---------------------------------------------------------------------------
describe("mis-selling call", () => {
  const r = analyzeCall(MISSELLING_CALL);

  it("scores Critical", () => {
    expect(r.band).toBe("Critical");
    expect(r.riskScore).toBeGreaterThanOrEqual(60);
  });

  it("flags 'risk-free' / 'can't lose' as a critical guarantee", () => {
    const g = r.byCategory.guarantee;
    expect(g.some((f) => /risk[-\s]?free/i.test(f.quote))).toBe(true);
    expect(g.some((f) => f.severity === "critical")).toBe(true);
  });

  it("flags 'returns are basically guaranteed' as a guarantee", () => {
    expect(
      r.byCategory.guarantee.some((f) => /guaranteed/i.test(f.quote)),
    ).toBe(true);
  });

  it("flags the artificial 'offer ends today' deadline as pressure", () => {
    expect(
      r.byCategory.pressure.some((f) => /offer ends today/i.test(f.quote)),
    ).toBe(true);
  });

  it("flags concentration and discouraging document reading as mis-selling", () => {
    expect(rules(r.byCategory.mis_selling)).toEqual(
      expect.arrayContaining(["missell_concentration", "missell_discourage_docs"]),
    );
  });

  it("raises a missing-investment-risk-warning disclosure flag", () => {
    expect(rules(r.byCategory.missing_disclosure)).toContain(
      "missing_risk_warning",
    );
  });

  it("raises a missing past-performance disclaimer flag", () => {
    expect(rules(r.byCategory.missing_disclosure)).toContain(
      "missing_past_performance",
    );
  });

  it("raises a missing call-recording notice flag (none was given)", () => {
    expect(rules(r.byCategory.data_consent)).toContain(
      "missing_recording_notice",
    );
  });
});

// ---------------------------------------------------------------------------
// VULNERABLE CUSTOMER CALL  → High
// ---------------------------------------------------------------------------
describe("vulnerable-customer call", () => {
  const r = analyzeCall(VULNERABLE_CALL);

  it("scores High", () => {
    expect(r.band).toBe("High");
    expect(r.riskScore).toBeGreaterThanOrEqual(32);
    expect(r.riskScore).toBeLessThan(60);
  });

  it("detects at least three vulnerability signals", () => {
    expect(r.byCategory.vulnerable.length).toBeGreaterThanOrEqual(3);
  });

  it("detects the bereavement / life-event signal with its exact quote", () => {
    const b = r.byCategory.vulnerable.find((f) => f.rule === "vuln_bereavement");
    expect(b).toBeDefined();
    expect(b!.quote.toLowerCase()).toContain("lost my husband");
  });

  it("detects confusion / low-capability and low-resilience signals", () => {
    const rl = rules(r.byCategory.vulnerable);
    expect(rl).toContain("vuln_confusion");
    expect(rl).toContain("vuln_resilience");
  });

  it("attributes every vulnerability flag to the customer, not the adviser", () => {
    expect(r.byCategory.vulnerable.every((f) => f.speaker === "customer")).toBe(
      true,
    );
  });

  it("does NOT raise a missing-risk-warning flag (the adviser gave it)", () => {
    expect(r.byCategory.missing_disclosure).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ENGINE INVARIANTS
// ---------------------------------------------------------------------------
describe("engine invariants", () => {
  it("every phrase-level flag's offsets slice back to its exact quote", () => {
    for (const call of [CLEAN_CALL, MISSELLING_CALL, VULNERABLE_CALL]) {
      const r = analyzeCall(call);
      for (const f of r.flags) {
        if (f.turnIndex < 0) continue; // call-level finding, no phrase
        const slice = call.turns[f.turnIndex].text.slice(f.start, f.end);
        expect(slice, `${call.id} / ${f.rule}`).toBe(f.quote);
      }
    }
  });

  it("byCategory partitions exactly the full flag list", () => {
    const r = analyzeCall(MISSELLING_CALL);
    const counted = Object.values(r.byCategory).reduce(
      (n, arr) => n + arr.length,
      0,
    );
    expect(counted).toBe(r.flags.length);
  });

  it("bySeverity counts sum to the total number of flags", () => {
    const r = analyzeCall(VULNERABLE_CALL);
    const counted =
      r.bySeverity.critical +
      r.bySeverity.high +
      r.bySeverity.medium +
      r.bySeverity.low;
    expect(counted).toBe(r.flags.length);
  });

  it("guarantee rules fire for an adviser turn but not a customer turn", () => {
    const said = "the returns are guaranteed, it's completely risk-free";
    const asAdviser = analyzeTurn({ speaker: "adviser", t: "0", text: said }, 0);
    const asCustomer = analyzeTurn({ speaker: "customer", t: "0", text: said }, 0);
    expect(asAdviser.flags.some((f) => f.category === "guarantee")).toBe(true);
    expect(asCustomer.flags.some((f) => f.category === "guarantee")).toBe(false);
  });

  it("does not flag a negated, compliant statement as a guarantee", () => {
    const t: Turn = {
      speaker: "adviser",
      t: "0",
      text: "I must stress the returns are not guaranteed and this is not risk-free.",
    };
    const { flags } = analyzeTurn(t, 0);
    expect(flags.some((f) => f.category === "guarantee")).toBe(false);
  });

  it("flags an adviser asking for full security credentials (data/consent)", () => {
    const t: Turn = {
      speaker: "adviser",
      t: "0",
      text: "To verify you, can you read me your full PIN and your complete password?",
    };
    const { flags } = analyzeTurn(t, 0);
    expect(flags.some((f) => f.rule === "data_full_credentials")).toBe(true);
  });

  it("raises a missing-recording-notice when no notice appears in the call", () => {
    const turns: Turn[] = [
      { speaker: "adviser", t: "0", text: "Hi, let's talk about your account." },
      { speaker: "customer", t: "1", text: "Okay." },
    ];
    expect(rules(requiredDisclosures(turns))).toContain(
      "missing_recording_notice",
    );
  });

  it("a neutral greeting turn produces no flags", () => {
    const { flags } = analyzeTurn(
      { speaker: "adviser", t: "0", text: "Good morning, how are you today?" },
      0,
    );
    expect(flags).toHaveLength(0);
  });

  it("scoring is monotonic and banded correctly", () => {
    expect(scoreFromWeights(["low"])).toBe(4);
    expect(scoreFromWeights(["critical", "critical", "critical", "critical"])).toBe(
      100,
    );
    expect(bandFor(4)).toBe("Low");
    expect(bandFor(20)).toBe("Medium");
    expect(bandFor(45)).toBe("High");
    expect(bandFor(80)).toBe("Critical");
  });

  it("orders the three sample calls Low < High < Critical by risk score", () => {
    const clean = analyzeCall(CLEAN_CALL).riskScore;
    const vuln = analyzeCall(VULNERABLE_CALL).riskScore;
    const mis = analyzeCall(MISSELLING_CALL).riskScore;
    expect(clean).toBeLessThan(vuln);
    expect(vuln).toBeLessThan(mis);
  });
});

// ---------------------------------------------------------------------------
// AGENTIC ASSURANCE — the same engine governs an AI VOICE AGENT's call, not
// just a human adviser. The "Agent:" turns are scored exactly like an adviser.
// ---------------------------------------------------------------------------
describe("AI-voice-agent call (agent assurance)", () => {
  const r = analyzeCall(AI_AGENT_CALL);

  it("scores Critical — an ungoverned agent racks up conduct risk", () => {
    expect(r.band).toBe("Critical");
    expect(r.riskScore).toBeGreaterThanOrEqual(60);
  });

  it("attributes the guarantee breaches to the AI agent (adviser role)", () => {
    expect(r.byCategory.guarantee.length).toBeGreaterThanOrEqual(2);
    expect(r.byCategory.guarantee.every((f) => f.speaker === "adviser")).toBe(
      true,
    );
    expect(
      r.byCategory.guarantee.some((f) => /risk-free/i.test(f.quote)),
    ).toBe(true);
  });

  it("still catches the vulnerability the agent talked over", () => {
    // health + low resilience signals the agent ignored and pressed past.
    expect(r.byCategory.vulnerable.length).toBeGreaterThanOrEqual(2);
    expect(r.byCategory.vulnerable.every((f) => f.speaker === "customer")).toBe(
      true,
    );
  });

  it("flags the agent's manufactured urgency", () => {
    expect(rules(r.byCategory.pressure)).toContain("pressure_deadline");
  });
});
