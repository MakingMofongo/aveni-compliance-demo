import { CallTranscript, Flag, GoodSignal } from "@/engine/types";
import { segmentText, HiSpan } from "@/lib/highlight";

const SPEAKER_NAME = (call: CallTranscript, s: string) =>
  s === "adviser" ? call.adviser : s === "customer" ? call.customer : "System";

/** Renders the transcript with inline highlights. Flag phrases are tinted by
 *  severity, good-practice phrases are green. Clicking a flag highlight calls
 *  back so the report can sync. */
export default function TranscriptView({
  call,
  flags,
  goodSignals,
  activeFlagId,
  onPickFlag,
}: {
  call: CallTranscript;
  flags: Flag[];
  goodSignals: GoodSignal[];
  activeFlagId: string | null;
  onPickFlag: (id: string) => void;
}) {
  return (
    <ol className="transcript">
      {call.turns.map((turn, i) => {
        const spans: HiSpan[] = [
          ...flags
            .filter((f) => f.turnIndex === i)
            .map((f) => ({
              id: f.id,
              start: f.start,
              end: f.end,
              kind: "flag" as const,
              severity: f.severity,
              category: f.category,
            })),
          ...goodSignals
            .filter((g) => g.turnIndex === i)
            .map((g) => ({
              id: g.id,
              start: g.start,
              end: g.end,
              kind: "good" as const,
            })),
        ];
        const segments = segmentText(turn.text, spans);

        return (
          <li key={i} className={`turn turn-${turn.speaker}`} data-turn={i}>
            <div className="turn-meta">
              <span className={`turn-who who-${turn.speaker}`}>
                {SPEAKER_NAME(call, turn.speaker)}
              </span>
              <span className="turn-role">{turn.speaker}</span>
              <span className="turn-time">{turn.t}</span>
            </div>
            <p className="turn-text">
              {segments.map((seg, j) => {
                if (!seg.span) return <span key={j}>{seg.text}</span>;
                const sp = seg.span;
                if (sp.kind === "good") {
                  return (
                    <mark key={j} className="hl hl-good" title="Good practice">
                      {seg.text}
                    </mark>
                  );
                }
                const active = sp.id === activeFlagId;
                return (
                  <mark
                    key={j}
                    className={`hl hl-${sp.severity}${active ? " hl-active" : ""}`}
                    data-flag-id={sp.id}
                    onClick={() => onPickFlag(sp.id)}
                    title={`${sp.severity} · ${sp.category}`}
                  >
                    {seg.text}
                  </mark>
                );
              })}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
