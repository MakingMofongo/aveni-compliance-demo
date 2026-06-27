import { RiskBand } from "@/engine/types";

const BAND_CLASS: Record<RiskBand, string> = {
  Low: "band-low",
  Medium: "band-medium",
  High: "band-high",
  Critical: "band-critical",
};

/** Compact SVG donut showing the 0–100 conduct-risk score and its band. */
export default function RiskGauge({
  score,
  band,
}: {
  score: number;
  band: RiskBand;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, score)) / 100) * c;

  return (
    <div className={`gauge ${BAND_CLASS[band]}`}>
      <svg viewBox="0 0 130 130" className="gauge-svg" aria-hidden>
        <circle className="gauge-track" cx="65" cy="65" r={r} />
        <circle
          className="gauge-value"
          cx="65"
          cy="65"
          r={r}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeDashoffset={c / 4}
          transform="rotate(-90 65 65)"
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-score">{score}</span>
        <span className="gauge-out">/100</span>
      </div>
      <span className="gauge-band">{band} risk</span>
    </div>
  );
}
