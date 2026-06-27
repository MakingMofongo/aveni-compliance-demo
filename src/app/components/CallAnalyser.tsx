"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { SAMPLES, getSample } from "@/engine/transcripts";
import { analyzeCall, disclosureChecklist } from "@/engine/detector";
import { parseCall } from "@/engine/parser";
import ScoreHeader from "./ScoreHeader";
import TranscriptPanel from "./TranscriptPanel";
import FindingsPanel from "./FindingsPanel";
import { Waveform, ExternalLink } from "./icons";

type Mode = "annotated" | "edit";

const PROOF_URL = "https://app.realbotics.ai";
const REPO_URL = "https://github.com/MakingMofongo/aveni-compliance-demo";

/** Scroll a descendant into the middle of its own scroll container only. */
function scrollWithin(container: HTMLElement | null, child: Element | null) {
  if (!container || !child) return;
  const c = container.getBoundingClientRect();
  const e = child.getBoundingClientRect();
  const delta = e.top - c.top - container.clientHeight / 2 + e.height / 2;
  container.scrollBy({ top: delta, behavior: "smooth" });
}

export default function CallAnalyser() {
  const [text, setText] = useState(SAMPLES[1].text); // open on the mis-selling call
  const [sampleId, setSampleId] = useState<string | null>(SAMPLES[1].meta.id);
  const [mode, setMode] = useState<Mode>("annotated");
  const [activeFlagId, setActiveFlagId] = useState<string | null>(null);

  const meta = useMemo(
    () => (sampleId ? getSample(sampleId).meta : {}),
    [sampleId],
  );
  const call = useMemo(() => parseCall(text, meta), [text, meta]);
  const report = useMemo(() => analyzeCall(call), [call]);
  const disclosures = useMemo(() => disclosureChecklist(call), [call]);

  const transcriptScroll = useRef<HTMLDivElement>(null);
  const findingsScroll = useRef<HTMLDivElement>(null);

  const onChangeText = useCallback((v: string) => {
    setText(v);
    // Once the text diverges from the loaded sample, it's a custom transcript.
    setSampleId((id) => (id && v === getSample(id).text ? id : null));
    setActiveFlagId(null);
  }, []);

  const loadSample = useCallback((id: string) => {
    setText(getSample(id).text);
    setSampleId(id);
    setActiveFlagId(null);
    setMode("annotated");
  }, []);

  const clearText = useCallback(() => {
    setText("");
    setSampleId(null);
    setActiveFlagId(null);
    setMode("edit");
  }, []);

  // Selecting a flag (from either pane) syncs the highlight and both scrolls.
  const pickFlag = useCallback((id: string) => {
    setActiveFlagId(id);
    setMode("annotated");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        scrollWithin(
          transcriptScroll.current,
          transcriptScroll.current?.querySelector(`[data-flag-id="${CSS.escape(id)}"]`) ?? null,
        );
        scrollWithin(
          findingsScroll.current,
          findingsScroll.current?.querySelector(`[data-card-id="${CSS.escape(id)}"]`) ?? null,
        );
      }),
    );
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <Waveform size={20} />
          </span>
          <span className="brand-text">
            <span className="brand-name">Call Compliance Analyser</span>
            <span className="brand-sub">Consumer Duty conduct-risk review</span>
          </span>
        </div>
        <div className="topbar-right">
          <span
            className="live-tag"
            title="Every result on this page is computed live by a pure, unit-tested engine."
          >
            <span className="live-dot" />
            live engine
          </span>
          <a className="ghost-link" href={REPO_URL} target="_blank" rel="noreferrer">
            Source <ExternalLink size={12} />
          </a>
        </div>
      </header>

      <p className="lede">
        Paste a recorded call below &#8212; whether the adviser is a person or an
        AI voice agent &#8212; or load a sample. The flags, risk score and
        required-disclosure checks all recompute as you type; nothing on this
        page is pre-canned.
      </p>

      <ScoreHeader report={report} call={call} />

      <main className="workspace">
        <TranscriptPanel
          text={text}
          onChangeText={onChangeText}
          mode={mode}
          onChangeMode={setMode}
          samples={SAMPLES}
          activeSampleId={sampleId}
          onLoadSample={loadSample}
          onClear={clearText}
          call={call}
          report={report}
          activeFlagId={activeFlagId}
          onPickFlag={pickFlag}
          scrollRef={transcriptScroll}
        />
        <FindingsPanel
          report={report}
          disclosures={disclosures}
          call={call}
          activeFlagId={activeFlagId}
          onPickFlag={pickFlag}
          scrollRef={findingsScroll}
        />
      </main>

      <footer className="footnote">
        <p>
          <strong>What&apos;s real:</strong> the detector is pure, dependency-free
          TypeScript with 53 unit tests. Each flag exposes the exact triggering
          phrase, a severity and a reason; the missing-disclosure checks reason
          over the whole call; the score is a transparent severity-weighted sum.
          The same checks govern a human adviser or an AI voice agent &#8212; the
          assurance layer over the call, not just the person. Paste any call and
          watch it re-analyse.{" "}
          <strong>What&apos;s sample:</strong> the four sample calls &#8212; in
          production these turns come from a speech-to-text pipeline (Deepgram /
          Whisper) over the recorded audio, and the engine is unchanged.
        </p>
        <p className="footnote-by">
          Built by Abdul Rasheed to mirror the call-analysis capability of{" "}
          <a href="https://aveni.ai/aveni-detect/" target="_blank" rel="noreferrer">
            Aveni Detect
          </a>
          , and to govern the AI voice agents he builds at{" "}
          <a href={PROOF_URL} target="_blank" rel="noreferrer">
            app.realbotics.ai
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
