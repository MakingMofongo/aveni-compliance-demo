import { ComplianceReport, CallTranscript, Severity } from "@/engine/types";

const BAND_CLASS: Record<string, string> = {
  Low: "band-low",
  Medium: "band-medium",
  High: "band-high",
  Critical: "band-critical",
};

const SEVS: { key: Severity; label: string }[] = [
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

// Band boundaries (see util.bandFor) — drawn as ticks on the meter.
const TICKS = [12, 32, 60];

export default function ScoreHeader({
  report,
  call,
}: {
  report: ComplianceReport;
  call: CallTranscript;
}) {
  const bandClass = BAND_CLASS[report.band] ?? "band-low";
  const flagCount = report.flags.length;

  return (
    <section className="scorebar">
      <div className="sb-score">
        <span className="eyebrow">Conduct-risk score</span>
        <div className={`sb-score-row ${bandClass}`}>
          <span className="sb-num tnum">{report.riskScore}</span>
          <span className="sb-denom">/100</span>
          <span className={`band-chip ${bandClass}`}>{report.band}</span>
        </div>
        <div className="meter" role="img" aria-label={`Risk ${report.riskScore} of 100, ${report.band}`}>
          <div className={`meter-fill ${bandClass}`} style={{ width: `${report.riskScore}%` }} />
          {TICKS.map((t) => (
            <span key={t} className="meter-tick" style={{ left: `${t}%` }} />
          ))}
        </div>
      </div>

      <div className="sb-sev">
        {SEVS.map(({ key, label }) => {
          const n = report.bySeverity[key];
          return (
            <div key={key} className={`sevcell sev-${key}${n === 0 ? " is-zero" : ""}`}>
              <span className="sevcell-dot" />
              <span className="sevcell-num tnum">{n}</span>
              <span className="sevcell-label">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="sb-meta">
        <p className="sb-summary">{report.summary}</p>
        <div className="sb-meta-row">
          <span className="party adviser">{call.adviser}</span>
          <span className="party-sep">&#8596;</span>
          <span className="party customer">{call.customer}</span>
          {call.product && <span className="meta-pill">{call.product}</span>}
          <span className="meta-dim tnum">
            {call.turns.length} turn{call.turns.length === 1 ? "" : "s"}
          </span>
          {report.goodSignals.length > 0 && (
            <span className="meta-good tnum">
              {report.goodSignals.length} good-practice
            </span>
          )}
          {flagCount > 0 && (
            <span className="meta-dim tnum">
              {flagCount} flag{flagCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
