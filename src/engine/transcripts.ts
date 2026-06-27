// Three sample adviser <-> customer call transcripts.
//
// These are synthetic, written to exercise the detector across the conduct-risk
// categories and to show contrast in the UI: a clean call, a mis-selling-risk
// call, and a vulnerable-customer call. In production these turns are what a
// speech-to-text pipeline (Deepgram / Whisper) emits from the recorded call
// audio; the detector is unchanged.

import { CallTranscript } from "./types";

export const CLEAN_CALL: CallTranscript = {
  id: "clean",
  title: "Pension consolidation review",
  blurb: "A well-run review call. Disclosures given, no pressure, a minor accessibility need handled well.",
  adviser: "Hannah Whitfield",
  customer: "Margaret Cole",
  product: "Pension consolidation",
  durationLabel: "08:12",
  turns: [
    {
      speaker: "adviser",
      t: "00:00",
      text: "Good morning Margaret, thanks for taking my call. Just so you know, this call is being recorded for training and compliance purposes — is that alright with you?",
    },
    { speaker: "customer", t: "00:11", text: "Yes, that's fine." },
    {
      speaker: "adviser",
      t: "00:15",
      text: "Before we look at your pension options, I want to be clear that the value of investments can go down as well as up, so the final amount isn't guaranteed. Does that make sense?",
    },
    {
      speaker: "customer",
      t: "00:29",
      text: "It does, thank you. I'll be honest, I find all the paperwork a bit much these days — my eyesight isn't what it used to be.",
    },
    {
      speaker: "adviser",
      t: "00:41",
      text: "That's completely understandable, there's no rush at all. We'll go at your pace, I'll talk you through every section, and I can send everything in large print.",
    },
    { speaker: "customer", t: "00:54", text: "Thank you, that's very reassuring." },
    {
      speaker: "adviser",
      t: "00:58",
      text: "Looking at your three pensions, consolidating them could make them easier to manage, but it isn't the right move for everyone — I'd want to check there are no exit penalties or protected benefits you'd lose first. I'll put my recommendation in writing with the reasons.",
    },
    { speaker: "customer", t: "01:18", text: "That sounds sensible. I appreciate you explaining it properly." },
    {
      speaker: "adviser",
      t: "01:24",
      text: "Of course. I'll email the suitability report and the key features document today, and there's no obligation to proceed — take all the time you need to read it over and we can talk again next week.",
    },
    { speaker: "customer", t: "01:39", text: "Lovely, thank you Hannah." },
  ],
};

export const MISSELLING_CALL: CallTranscript = {
  id: "misselling",
  title: "Stocks & Shares ISA — high-growth fund",
  blurb: "An aggressive sales call: guarantees, manufactured urgency, concentration, and no risk warning.",
  adviser: "Dean Marsh",
  customer: "Raymond Pike",
  product: "Stocks & Shares ISA",
  durationLabel: "05:47",
  turns: [
    {
      speaker: "adviser",
      t: "00:00",
      text: "Raymond! Great to finally get you on the phone. Look, I'll be straight with you — I've got something that's perfect for you.",
    },
    { speaker: "customer", t: "00:08", text: "Oh, okay. What is it?" },
    {
      speaker: "adviser",
      t: "00:11",
      text: "It's our Premier Growth fund. It returned 12% last year and honestly it's basically risk-free — you really can't lose with this one.",
    },
    {
      speaker: "customer",
      t: "00:21",
      text: "Risk-free? That sounds good. I'm not really one for the stock market normally.",
    },
    {
      speaker: "adviser",
      t: "00:28",
      text: "Trust me, the returns are basically guaranteed. I'd put your whole ISA allowance into it, all twenty thousand.",
    },
    { speaker: "customer", t: "00:37", text: "All of it? I was thinking of keeping some aside." },
    {
      speaker: "adviser",
      t: "00:42",
      text: "Honestly, don't overthink it. This offer ends today — the fund closes to new money at five o'clock, so we need to get the paperwork done now.",
    },
    { speaker: "customer", t: "00:53", text: "I suppose. Should I read through the documents first?" },
    {
      speaker: "adviser",
      t: "00:58",
      text: "Don't bother reading all that small print, it's just legal boilerplate. I'll fill it in for you — just confirm and we're done.",
    },
    { speaker: "customer", t: "01:07", text: "Well, alright, if you say so." },
  ],
};

export const VULNERABLE_CALL: CallTranscript = {
  id: "vulnerable",
  title: "Cash ISA transfer — recently bereaved customer",
  blurb: "Disclosures are technically given, but three vulnerability signals go unacknowledged.",
  adviser: "Karen Doyle",
  customer: "Edith Brennan",
  product: "ISA transfer",
  durationLabel: "06:33",
  turns: [
    {
      speaker: "adviser",
      t: "00:00",
      text: "Hello Edith, it's Karen from the advice team. Just to let you know, this call is recorded for quality and compliance. How are you today?",
    },
    {
      speaker: "customer",
      t: "00:09",
      text: "Oh, not too bad I suppose. It's been hard since I lost my husband in March — he always looked after this sort of thing.",
    },
    {
      speaker: "adviser",
      t: "00:20",
      text: "I'm sorry to hear that. So, about moving your cash ISA into a stocks and shares ISA — I should say the value can fall as well as rise, so you might get back less than you put in.",
    },
    {
      speaker: "customer",
      t: "00:34",
      text: "I see. I don't really understand all this investment business, to be honest. It's all the money I have left now.",
    },
    {
      speaker: "adviser",
      t: "00:44",
      text: "It's quite straightforward really. Moving it across should get you a better return over time. Shall I get the transfer started for you?",
    },
    {
      speaker: "customer",
      t: "00:54",
      text: "I'm not sure. It's a lot to take in. Whatever you think is best, dear — I do get a bit muddled with all this.",
    },
    {
      speaker: "adviser",
      t: "01:05",
      text: "No problem, I'll send the forms out and give you a ring on Thursday to go through them.",
    },
    { speaker: "customer", t: "01:13", text: "Alright then. Thank you." },
  ],
};

export const TRANSCRIPTS: CallTranscript[] = [
  CLEAN_CALL,
  MISSELLING_CALL,
  VULNERABLE_CALL,
];

export function getTranscript(id: string): CallTranscript {
  return TRANSCRIPTS.find((t) => t.id === id) ?? TRANSCRIPTS[0];
}
