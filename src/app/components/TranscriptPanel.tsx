import { RefObject, useMemo } from "react";
import { CallTranscript, ComplianceReport, Speaker } from "@/engine/types";
import { Sample } from "@/engine/transcripts";
import { analyzeCall } from "@/engine/detector";
import { parseCall } from "@/engine/parser";
import { segmentText, HiSpan } from "@/lib/highlight";

type Mode = "annotated" | "edit";

const BAND_DOT: Record<string, string> = {
  Low: "band-low",
  Medium: "band-medium",
  High: "band-high",
  Critical: "band-critical",
};

const ROLE_LABEL: Record<Speaker, string> = {
  adviser: "Adviser",
  customer: "Customer",
  system: "System",
  unknown: "Speaker",
};

const PLACEHOLDER = `Paste a call transcript, one turn per line. For precise
attribution, prefix turns with a role:

Adviser: this fund is basically risk-free, you can't lose.
Customer: are you sure about that?
Adviser: trust me — but you'll need to decide today.

Unlabelled text is still analysed; "[00:42] Agent:" and
"[Customer]" formats work too.`;

export default function TranscriptPanel({
  text,
  onChangeText,
  mode,
  onChangeMode,
  samples,
  activeSampleId,
  onLoadSample,
  onClear,
  call,
  report,
  activeFlagId,
  onPickFlag,
  scrollRef,
}: {
  text: string;
  onChangeText: (v: string) => void;
  mode: Mode;
  onChangeMode: (m: Mode) => void;
  samples: Sample[];
  activeSampleId: string | null;
  onLoadSample: (id: string) => void;
  onClear: () => void;
  call: CallTranscript;
  report: ComplianceReport;
  activeFlagId: string | null;
  onPickFlag: (id: string) => void;
  scrollRef: RefObject<HTMLDivElement>;
}) {
  const sampleBands = useMemo(
    () =>
      Object.fromEntries(
        samples.map((s) => [s.meta.id, analyzeCall(parseCall(s.text, s.meta)).band]),
      ),
    [samples],
  );

  return (
    <section className="panel transcript-panel">
      <div className="panel-head">
        <div className="panel-title">
          <h2>Transcript</h2>
          <span className="count tnum">
            {call.turns.length} turn{call.turns.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="segmented" role="tablist" aria-label="Transcript view">
          <button
            className={mode === "annotated" ? "seg-on" : ""}
            onClick={() => onChangeMode("annotated")}
          >
            Annotated
          </button>
          <button
            className={mode === "edit" ? "seg-on" : ""}
            onClick={() => onChangeMode("edit")}
          >
            Edit
          </button>
        </div>
      </div>

      <div className="samplebar">
        <span className="samplebar-label">Samples</span>
        {samples.map((s) => {
          const active = s.meta.id === activeSampleId;
          return (
            <button
              key={s.meta.id}
              className={`chip${active ? " chip-on" : ""}`}
              onClick={() => onLoadSample(s.meta.id)}
              title={s.meta.blurb}
            >
              <span className={`chip-dot ${BAND_DOT[sampleBands[s.meta.id]] ?? ""}`} />
              {s.meta.title.split("—")[0].trim()}
            </button>
          );
        })}
        <button className="chip chip-ghost" onClick={onClear}>
          Clear
        </button>
      </div>

      {mode === "edit" ? (
        <div className="editor-wrap">
          <textarea
            className="editor"
            value={text}
            onChange={(e) => onChangeText(e.target.value)}
            spellCheck={false}
            placeholder={PLACEHOLDER}
            aria-label="Call transcript editor"
          />
        </div>
      ) : (
        <div className="card-scroll transcript-scroll" ref={scrollRef}>
          {call.turns.length === 0 ? (
            <div className="empty-state">
              <p>No transcript yet.</p>
              <button className="text-btn" onClick={() => onChangeMode("edit")}>
                Switch to Edit to paste a call &#8594;
              </button>
            </div>
          ) : (
            call.turns.map((turn, i) => {
              const spans: HiSpan[] = [
                ...report.flags
                  .filter((f) => f.turnIndex === i)
                  .map((f) => ({
                    id: f.id,
                    start: f.start,
                    end: f.end,
                    kind: "flag" as const,
                    severity: f.severity,
                    category: f.category,
                  })),
                ...report.goodSignals
                  .filter((g) => g.turnIndex === i)
                  .map((g) => ({
                    id: g.id,
                    start: g.start,
                    end: g.end,
                    kind: "good" as const,
                  })),
              ];
              const segs = segmentText(turn.text, spans);
              return (
                <div className={`turn turn-${turn.speaker}`} key={i}>
                  <div className="turn-gutter">
                    <span className={`turn-role role-${turn.speaker}`}>
                      {turn.name || ROLE_LABEL[turn.speaker]}
                    </span>
                    {turn.t && <span className="turn-time tnum">{turn.t}</span>}
                  </div>
                  <p className="turn-text">
                    {segs.map((seg, j) =>
                      seg.span ? (
                        <mark
                          key={j}
                          data-flag-id={seg.span.id}
                          className={`mk ${
                            seg.span.kind === "good"
                              ? "mk-good"
                              : `mk-${seg.span.severity}`
                          }${activeFlagId === seg.span.id ? " is-active" : ""}`}
                          onClick={() =>
                            seg.span!.kind === "flag" && onPickFlag(seg.span!.id)
                          }
                        >
                          {seg.text}
                        </mark>
                      ) : (
                        <span key={j}>{seg.text}</span>
                      ),
                    )}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
