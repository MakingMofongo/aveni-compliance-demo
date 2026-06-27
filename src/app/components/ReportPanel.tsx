import { useState } from "react";
import { ComplianceReport, Flag, Severity } from "@/engine/types";
import {
  CATEGORY_LABEL,
  CATEGORIES,
  SEVERITY_LABEL,
  DisclosureCheck,
} from "@/engine/detector";

const SEVS: Severity[] = ["critical", "high", "medium", "low"];

export default function ReportPanel({
  report,
  disclosures,
  activeFlagId,
  onPickFlag,
}: {
  report: ComplianceReport;
  disclosures: DisclosureCheck[];
  activeFlagId: string | null;
  onPickFlag: (id: string) => void;
}) {
  const [sevFilter, setSevFilter] = useState<Severity | null>(null);

  // Dedupe good-practice signals by rule for a clean list.
  const good = Array.from(
    new Map(report.goodSignals.map((g) => [g.rule, g])).values(),
  );

  const visibleCats = CATEGORIES.filter((c) => report.byCategory[c].length > 0);

  return (
    <div className="report">
      <p className="report-summary">{report.summary}</p>

      <div className="sev-row">
        {SEVS.map((s) => (
          <button
            key={s}
            className={`sev-chip sev-${s}${sevFilter === s ? " sev-on" : ""}`}
            onClick={() => setSevFilter(sevFilter === s ? null : s)}
            disabled={report.bySeverity[s] === 0}
            title={`Filter ${SEVERITY_LABEL[s]} flags`}
          >
            <span className="sev-count">{report.bySeverity[s]}</span>
            <span className="sev-name">{SEVERITY_LABEL[s]}</span>
          </button>
        ))}
      </div>

      <section className="report-section">
        <h3 className="report-h">
          Flagged moments
          {sevFilter && (
            <button className="clear-filter" onClick={() => setSevFilter(null)}>
              clear filter ✕
            </button>
          )}
        </h3>

        {report.flags.length === 0 && (
          <p className="report-empty">
            No conduct-risk flags. Required disclosures present — a clean call.
          </p>
        )}

        {visibleCats.map((cat) => {
          const flags = report.byCategory[cat].filter(
            (f) => !sevFilter || f.severity === sevFilter,
          );
          if (flags.length === 0) return null;
          return (
            <div key={cat} className={`cat-group cat-${cat}`}>
              <div className="cat-head">
                <span className="cat-dot" />
                <span className="cat-name">{CATEGORY_LABEL[cat]}</span>
                <span className="cat-count">{flags.length}</span>
              </div>
              <ul className="flag-list">
                {flags.map((f) => (
                  <FlagCard
                    key={f.id}
                    flag={f}
                    active={f.id === activeFlagId}
                    onPick={onPickFlag}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="report-section">
        <h3 className="report-h">Required disclosures</h3>
        <ul className="disc-list">
          {disclosures.map((d) => (
            <li key={d.rule} className={`disc disc-${d.status}`}>
              <span className="disc-icon" aria-hidden>
                {d.status === "present" ? "✓" : d.status === "missing" ? "✕" : "–"}
              </span>
              <span className="disc-name">{d.name}</span>
              <span className="disc-status">
                {d.status === "present"
                  ? "given"
                  : d.status === "missing"
                    ? "missing"
                    : "n/a"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {good.length > 0 && (
        <section className="report-section">
          <h3 className="report-h">Good practice observed</h3>
          <ul className="good-list">
            {good.map((g) => (
              <li key={g.rule} className="good-item">
                <span className="good-icon" aria-hidden>
                  ✓
                </span>
                <div>
                  <strong>{g.label}</strong>
                  <p>{g.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function FlagCard({
  flag,
  active,
  onPick,
}: {
  flag: Flag;
  active: boolean;
  onPick: (id: string) => void;
}) {
  const callLevel = flag.turnIndex < 0;
  return (
    <li
      className={`flag-card flag-${flag.severity}${active ? " flag-active" : ""}`}
      data-card-id={flag.id}
      onClick={() => onPick(flag.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onPick(flag.id);
      }}
    >
      <div className="flag-top">
        <span className={`flag-sev sev-${flag.severity}`}>
          {SEVERITY_LABEL[flag.severity]}
        </span>
        <span className="flag-label">{flag.label}</span>
      </div>
      {callLevel ? (
        <p className="flag-quote flag-absent">
          Required disclosure not found anywhere in this call.
        </p>
      ) : (
        <p className="flag-quote">
          <span className="quote-mark">“</span>
          {flag.quote}
          <span className="quote-mark">”</span>
        </p>
      )}
      <p className="flag-why">{flag.why}</p>
    </li>
  );
}
