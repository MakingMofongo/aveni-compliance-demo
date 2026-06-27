// Small pure helpers. Dependency-free so the engine runs in the browser and
// under Vitest unchanged.

import { Severity, RiskBand } from "./types";

/** Severity -> conduct-risk points. Tuned so the three sample calls land in
 *  three distinct bands (Low / High / Critical). */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 30,
  high: 18,
  medium: 9,
  low: 4,
};

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Sum severity weights, capped at 100. */
export function scoreFromWeights(severities: Severity[]): number {
  let s = 0;
  for (const sev of severities) s += SEVERITY_WEIGHT[sev];
  return Math.min(100, s);
}

export function bandFor(score: number): RiskBand {
  if (score >= 60) return "Critical";
  if (score >= 32) return "High";
  if (score >= 12) return "Medium";
  return "Low";
}

export function round(n: number, dp = 0): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}
