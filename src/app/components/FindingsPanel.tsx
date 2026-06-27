import { RefObject } from "react";
import { CallTranscript, ComplianceReport, Flag, Speaker } from "@/engine/types";
import {
  CATEGORY_LABEL,
  SEVERITY_LABEL,
  DisclosureCheck,
} from "@/engine/detector";
import { SEVERITY_RANK } from "@/engine/util";
import { Check, Cross, Dash } from "./icons";

const ROLE_LABEL: Record<Speaker, string> = {
  adviser: "Adviser",
  customer: "Customer",
  system: "System",
  unknown: "Speaker",
};

const DISC_ORDER: Record<DisclosureCheck["status"], number> = {
  missing: 0,
  present: 1,
  na: 2,
};

const DISC_WORD: Record<DisclosureCheck["status"], string> = {
  missing: "Missing",
  present: "Given",
  na: "N/A",
};

function sortFlags(flags: Flag[]): Flag[] {
  return [...flags].sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      (a.turnIndex < 0 ? Infinity : a.turnIndex) -
        (b.turnIndex < 0 ? Infinity : b.turnIndex),
  );
}

export default function FindingsPanel({
  report,
  disclosures,
  call,
  activeFlagId,
  onPickFlag,
  scrollRef,
}: {
  report: ComplianceReport;
  disclosures: DisclosureCheck[];
  call: CallTranscript;
  activeFlagId: string | null;
  onPickFlag: (id: string) => void;
  scrollRef: RefObject<HTMLDivElement>;
}) {
  const flags = sortFlags(report.flags);
  const orderedDisc = [...disclosures].sort(
    (a, b) => DISC_ORDER[a.status] - DISC_ORDER[b.status],
  );
  // One good-practice item per rule.
  const goodSeen = new Set<string>();
  const goodItems = report.goodSignals.filter((g) =>
    goodSeen.has(g.rule) ? false : (goodSeen.add(g.rule), true),
  );

  return (
    <section className="panel findings-panel">
      <div className="panel-head">
        <div className="panel-title">
          <h2>Findings</h2>
          <span className="count tnum">
            {flags.length} flag{flags.length === 1 ? "" : "s"}
          </span>
        </div>
        <span className="kicker">explainable &middot; scored</span>
      </div>

      <div className="card-scroll findings-scroll" ref={scrollRef}>
        {/* Required disclosures ------------------------------------------- */}
        <div className="section">
          <h3 className="section-title">Required disclosures</h3>
          <ul className="disclosures">
            {orderedDisc.map((d) => (
              <li key={d.rule} className={`disc disc-${d.status}`}>
                <span className="disc-icon">
                  {d.status === "present" ? (
                    <Check size={13} />
                  ) : d.status === "missing" ? (
                    <Cross size={13} />
                  ) : (
                    <Dash size={13} />
                  )}
                </span>
                <span className="disc-name">{d.name}</span>
                <span className="disc-status">{DISC_WORD[d.status]}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Flags ---------------------------------------------------------- */}
        <div className="section">
          <h3 className="section-title">
            Conduct-risk flags
            <span className="section-count tnum">{flags.length}</span>
          </h3>

          {flags.length === 0 ? (
            <div className="pass-card">
              <span className="pass-icon">
                <Check size={15} />
              </span>
              <div>
                <strong>No conduct-risk flags raised.</strong>
                <p>{report.summary}</p>
              </div>
            </div>
          ) : (
            <div className="flag-list">
              {flags.map((f) => {
                const phrase = f.turnIndex >= 0;
                return (
                  <button
                    key={f.id}
                    data-card-id={f.id}
                    className={`flag-card sev-${f.severity}${
                      activeFlagId === f.id ? " is-active" : ""
                    }`}
                    onClick={() => onPickFlag(f.id)}
                  >
                    <div className="flag-top">
                      <span className={`sev-tag sev-${f.severity}`}>
                        <span className="sev-tag-dot" />
                        {SEVERITY_LABEL[f.severity]}
                      </span>
                      <span className="flag-cat">{CATEGORY_LABEL[f.category]}</span>
                      <span className="flag-loc tnum">
                        {phrase
                          ? `Turn ${f.turnIndex + 1} · ${
                              call.turns[f.turnIndex]?.name ||
                              ROLE_LABEL[f.speaker]
                            }`
                          : "Call-level"}
                      </span>
                    </div>
                    <div className="flag-label">{f.label}</div>
                    {phrase ? (
                      <blockquote className="flag-quote">
                        &ldquo;{f.quote}&rdquo;
                      </blockquote>
                    ) : (
                      <div className="flag-absent">{f.quote}</div>
                    )}
                    <div className="flag-why">{f.why}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Good practice -------------------------------------------------- */}
        {goodItems.length > 0 && (
          <div className="section">
            <h3 className="section-title">Good practice observed</h3>
            <ul className="good-list">
              {goodItems.map((g) => (
                <li key={g.id} className="good-item">
                  <span className="good-icon">
                    <Check size={12} />
                  </span>
                  <div>
                    <span className="good-label">{g.label}</span>
                    <span className="good-note">{g.note}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
