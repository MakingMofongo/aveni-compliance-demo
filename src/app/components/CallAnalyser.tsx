"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { TRANSCRIPTS, getTranscript } from "@/engine/transcripts";
import { analyzeCall, disclosureChecklist } from "@/engine/detector";
import { RiskBand } from "@/engine/types";
import RiskGauge from "./RiskGauge";
import TranscriptView from "./TranscriptView";
import ReportPanel from "./ReportPanel";

const BAND_DOT: Record<RiskBand, string> = {
  Low: "dot-low",
  Medium: "dot-medium",
  High: "dot-high",
  Critical: "dot-critical",
};

/** Scroll a child element into the middle of its own scrollable container,
 *  without scrolling the whole page. */
function scrollWithin(container: HTMLElement | null, child: Element | null) {
  if (!container || !child) return;
  const cRect = container.getBoundingClientRect();
  const eRect = child.getBoundingClientRect();
  const delta = eRect.top - cRect.top - container.clientHeight / 2 + eRect.height / 2;
  container.scrollBy({ top: delta, behavior: "smooth" });
}

export default function CallAnalyser() {
  const [callId, setCallId] = useState(TRANSCRIPTS[0].id);
  const [activeFlagId, setActiveFlagId] = useState<string | null>(null);

  const call = useMemo(() => getTranscript(callId), [callId]);
  const report = useMemo(() => analyzeCall(call), [call]);
  const disclosures = useMemo(() => disclosureChecklist(call), [call]);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Picking a flag (from either side) syncs both panels.
  const pickFlag = useCallback((id: string) => {
    setActiveFlagId(id);
    requestAnimationFrame(() => {
      scrollWithin(
        transcriptRef.current,
        transcriptRef.current?.querySelector(`[data-flag-id="${CSS.escape(id)}"]`) ??
          null,
      );
      scrollWithin(
        reportRef.current,
        reportRef.current?.querySelector(`[data-card-id="${CSS.escape(id)}"]`) ??
          null,
      );
    });
  }, []);

  const selectCall = useCallback((id: string) => {
    setCallId(id);
    setActiveFlagId(null);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 24 24" width="26" height="26">
              <path
                d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 12.5l2.3 2.3 4.7-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="brand-text">
            <h1>CallGuard</h1>
            <p>Adviser-call compliance &amp; conduct-risk analysis</p>
          </div>
        </div>
        <div className="topbar-right">
          <span
            className="badge"
            title="The transcripts are sample data. The detection engine is real, pure and unit-tested."
          >
            sample transcripts · real detection engine
          </span>
          <a
            className="repo-link"
            href="https://github.com/MakingMofongo/aveni-compliance-demo"
            target="_blank"
            rel="noreferrer"
          >
            source ↗
          </a>
        </div>
      </header>

      <div className="subbar">
        <p>
          A working proof-of-concept that analyses recorded adviser↔customer
          calls for Consumer Duty conduct risk — the same shape as a call-monitoring
          QA product. Pick a call to see it scored.
        </p>
      </div>

      <nav className="callpicker" aria-label="Sample calls">
        {TRANSCRIPTS.map((t) => {
          const band = analyzeCall(t).band;
          const active = t.id === callId;
          return (
            <button
              key={t.id}
              className={`call-pill${active ? " call-pill-active" : ""}`}
              onClick={() => selectCall(t.id)}
            >
              <span className={`pill-dot ${BAND_DOT[band]}`} />
              <span className="pill-text">
                <strong>{t.title}</strong>
                <small>{t.blurb}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <section className={`callbar band-${report.band.toLowerCase()}`}>
        <div className="callbar-id">
          <div className="callbar-parties">
            <span className="party adviser">{call.adviser}</span>
            <span className="party-arrow">↔</span>
            <span className="party customer">{call.customer}</span>
          </div>
          <div className="callbar-meta">
            <span className="meta-pill">{call.product}</span>
            <span className="meta-sep">·</span>
            <span>{call.turns.length} turns</span>
            <span className="meta-sep">·</span>
            <span>{call.durationLabel}</span>
          </div>
        </div>
        <RiskGauge score={report.riskScore} band={report.band} />
      </section>

      <main className="grid">
        <section className="card transcript-card">
          <header className="card-head">
            <h2>Call transcript</h2>
            <span className="card-kicker">{call.title}</span>
          </header>
          <div className="card-scroll" ref={transcriptRef}>
            <TranscriptView
              call={call}
              flags={report.flags}
              goodSignals={report.goodSignals}
              activeFlagId={activeFlagId}
              onPickFlag={pickFlag}
            />
          </div>
        </section>

        <aside className="card report-card">
          <header className="card-head">
            <h2>Compliance report</h2>
            <span className="card-kicker">explainable · scored</span>
          </header>
          <div className="card-scroll" ref={reportRef}>
            <ReportPanel
              report={report}
              disclosures={disclosures}
              activeFlagId={activeFlagId}
              onPickFlag={pickFlag}
            />
          </div>
        </aside>
      </main>

      <footer className="footnote">
        <p>
          <strong>What&apos;s real:</strong> the detector is pure, dependency-free
          TypeScript covered by unit tests — every flag exposes the exact phrase,
          a severity and a reason, and the missing-disclosure checks reason over
          the whole call. <strong>What&apos;s sample:</strong> the three
          transcripts. In production these turns come from a speech-to-text
          pipeline (Deepgram / Whisper) over the recorded call audio; the engine
          is unchanged. Built by Abdul Rasheed to mirror the call-analysis
          capability of{" "}
          <a href="https://aveni.ai/aveni-detect/" target="_blank" rel="noreferrer">
            Aveni Detect
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
