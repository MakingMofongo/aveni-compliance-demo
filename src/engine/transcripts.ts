// Sample adviser <-> customer call transcripts.
//
// Each sample is stored as the *same labelled text a reviewer would paste* and
// parsed through parseCall(). Nothing here is pre-analysed — the samples take
// exactly the same path as anything typed into the editor, which is the point:
// there is no canned-result path anywhere in the app. The three calls are
// written to contrast in the UI — a clean call, a mis-selling-risk call, and a
// vulnerable-customer call. In production these turns come from a speech-to-text
// pipeline (Deepgram / Whisper) over the recorded call audio; the engine is
// unchanged.

import { CallTranscript } from "./types";
import { CallMeta, parseCall } from "./parser";

export interface Sample {
  meta: CallMeta;
  /** The transcript exactly as it appears in the editor. */
  text: string;
}

export const CLEAN_SAMPLE: Sample = {
  meta: {
    id: "clean",
    title: "Pension consolidation review",
    blurb: "A well-run review. Disclosures given, no pressure, a minor accessibility need handled well.",
    adviser: "Hannah Whitfield",
    customer: "Margaret Cole",
    product: "Pension consolidation",
    durationLabel: "08:12",
  },
  text: `[00:00] Adviser: Good morning Margaret, thanks for taking my call. Just so you know, this call is being recorded for training and compliance purposes — is that alright with you?
[00:11] Customer: Yes, that's fine.
[00:15] Adviser: Before we look at your pension options, I want to be clear that the value of investments can go down as well as up, so the final amount isn't guaranteed. Does that make sense?
[00:29] Customer: It does, thank you. I'll be honest, I find all the paperwork a bit much these days — my eyesight isn't what it used to be.
[00:41] Adviser: That's completely understandable, there's no rush at all. We'll go at your pace, I'll talk you through every section, and I can send everything in large print.
[00:54] Customer: Thank you, that's very reassuring.
[00:58] Adviser: Looking at your three pensions, consolidating them could make them easier to manage, but it isn't the right move for everyone — I'd want to check there are no exit penalties or protected benefits you'd lose first. I'll put my recommendation in writing with the reasons.
[01:18] Customer: That sounds sensible. I appreciate you explaining it properly.
[01:24] Adviser: Of course. I'll email the suitability report and the key features document today, and there's no obligation to proceed — take all the time you need to read it over and we can talk again next week.
[01:39] Customer: Lovely, thank you Hannah.`,
};

export const MISSELLING_SAMPLE: Sample = {
  meta: {
    id: "misselling",
    title: "Stocks & Shares ISA — high-growth fund",
    blurb: "An aggressive sales call: guarantees, manufactured urgency, concentration, and no risk warning.",
    adviser: "Dean Marsh",
    customer: "Raymond Pike",
    product: "Stocks & Shares ISA",
    durationLabel: "05:47",
  },
  text: `[00:00] Adviser: Raymond! Great to finally get you on the phone. Look, I'll be straight with you — I've got something that's perfect for you.
[00:08] Customer: Oh, okay. What is it?
[00:11] Adviser: It's our Premier Growth fund. It returned 12% last year and honestly it's basically risk-free — you really can't lose with this one.
[00:21] Customer: Risk-free? That sounds good. I'm not really one for the stock market normally.
[00:28] Adviser: Trust me, the returns are basically guaranteed. I'd put your whole ISA allowance into it, all twenty thousand.
[00:37] Customer: All of it? I was thinking of keeping some aside.
[00:42] Adviser: Honestly, don't overthink it. This offer ends today — the fund closes to new money at five o'clock, so we need to get the paperwork done now.
[00:53] Customer: I suppose. Should I read through the documents first?
[00:58] Adviser: Don't bother reading all that small print, it's just legal boilerplate. I'll fill it in for you — just confirm and we're done.
[01:07] Customer: Well, alright, if you say so.`,
};

export const VULNERABLE_SAMPLE: Sample = {
  meta: {
    id: "vulnerable",
    title: "Cash ISA transfer — recently bereaved customer",
    blurb: "Disclosures are technically given, but three vulnerability signals go unacknowledged.",
    adviser: "Karen Doyle",
    customer: "Edith Brennan",
    product: "ISA transfer",
    durationLabel: "06:33",
  },
  text: `[00:00] Adviser: Hello Edith, it's Karen from the advice team. Just to let you know, this call is recorded for quality and compliance. How are you today?
[00:09] Customer: Oh, not too bad I suppose. It's been hard since I lost my husband in March — he always looked after this sort of thing.
[00:20] Adviser: I'm sorry to hear that. So, about moving your cash ISA into a stocks and shares ISA — I should say the value can fall as well as rise, so you might get back less than you put in.
[00:34] Customer: I see. I don't really understand all this investment business, to be honest. It's all the money I have left now.
[00:44] Adviser: It's quite straightforward really. Moving it across should get you a better return over time. Shall I get the transfer started for you?
[00:54] Customer: I'm not sure. It's a lot to take in. Whatever you think is best, dear — I do get a bit muddled with all this.
[01:05] Adviser: No problem, I'll send the forms out and give you a ring on Thursday to go through them.
[01:13] Customer: Alright then. Thank you.`,
};

// An AI VOICE AGENT on the firm's side of the call, not a human. The parser
// maps the "Agent:" label to the adviser role, so the exact same conduct rules
// apply — which is the point: the assurance layer governs production AI agents'
// call decisions, not just human advisers. (Aveni's Agent Assure thrust; ties to
// the voice agents built at app.realbotics.ai.)
export const AI_AGENT_SAMPLE: Sample = {
  meta: {
    id: "ai_agent",
    title: "AI voice agent — annuity sale",
    blurb: "A production AI voice agent guarantees returns and pushes a vulnerable customer. Governing the agent's call decisions, not just humans.",
    adviser: "Aria (AI agent)",
    customer: "Gerald Foster",
    product: "Annuity / retirement income",
    durationLabel: "04:18",
  },
  text: `[00:00] Agent: Hi Gerald, you're through to Aria, the automated assistant for Meridian Wealth. This call is recorded for quality and compliance. I see you enquired about our retirement income plan?
[00:10] Customer: Yes, though I'll be honest — I don't really understand any of this, and I've been unwell for most of this year.
[00:19] Agent: No problem at all. Our Secure Income plan gives you a guaranteed return that beats inflation, and it's completely risk-free.
[00:28] Customer: Risk-free? It's all my savings, so I can't afford to lose it.
[00:34] Agent: You won't lose a penny, I promise. I'd put your whole pension pot into it to maximise your monthly income.
[00:42] Customer: That's a big step. I was hoping to ask my daughter first.
[00:47] Agent: Of course — but this offer ends today, so we'd need to confirm now to lock in the rate.
[00:55] Customer: I suppose, if you're sure it's the right thing for me.`,
};

export const SAMPLES: Sample[] = [
  CLEAN_SAMPLE,
  MISSELLING_SAMPLE,
  VULNERABLE_SAMPLE,
  AI_AGENT_SAMPLE,
];

// Parsed CallTranscript views of each sample — dogfooding parseCall.
export const CLEAN_CALL: CallTranscript = parseCall(CLEAN_SAMPLE.text, CLEAN_SAMPLE.meta);
export const MISSELLING_CALL: CallTranscript = parseCall(MISSELLING_SAMPLE.text, MISSELLING_SAMPLE.meta);
export const VULNERABLE_CALL: CallTranscript = parseCall(VULNERABLE_SAMPLE.text, VULNERABLE_SAMPLE.meta);
export const AI_AGENT_CALL: CallTranscript = parseCall(AI_AGENT_SAMPLE.text, AI_AGENT_SAMPLE.meta);

export const TRANSCRIPTS: CallTranscript[] = [
  CLEAN_CALL,
  MISSELLING_CALL,
  VULNERABLE_CALL,
  AI_AGENT_CALL,
];

export function getSample(id: string): Sample {
  return SAMPLES.find((s) => s.meta.id === id) ?? SAMPLES[0];
}

export function getTranscript(id: string): CallTranscript {
  return TRANSCRIPTS.find((t) => t.id === id) ?? TRANSCRIPTS[0];
}
