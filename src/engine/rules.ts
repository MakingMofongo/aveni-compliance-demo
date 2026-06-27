// Conduct-risk rule set.
//
// Each rule is a transparent, regex-backed pattern with a category, severity, a
// human label and a one-line "why". Rules are scoped by speaker where it
// matters (a guarantee is a problem when the *adviser* says it; a vulnerability
// cue is something the *customer* reveals). This is the rule-based bootstrap
// layer you ship before you have enough labelled call audio to fine-tune an ML
// model — the report shape stays identical when a model drops in behind it.

import { Category, Severity, Speaker } from "./types";

export interface PhraseRule {
  rule: string;
  category: Category;
  severity: Severity;
  label: string;
  why: string;
  /** Only fire on turns spoken by this speaker. Omit to match any speaker. */
  speaker?: Speaker;
  patterns: RegExp[];
  /** Skip a match if these words sit immediately before it (e.g. "not"). */
  negate?: RegExp;
}

export interface GoodRule {
  rule: string;
  label: string;
  note: string;
  speaker?: Speaker;
  patterns: RegExp[];
}

// Words that flip an overpromise into a *compliant* statement, e.g.
// "returns are not guaranteed". If one of these sits just before the match we
// drop it.
const NEGATORS = /\b(not|never|isn'?t|aren'?t|won'?t|no|cannot|can'?t|nothing is)\s*$/i;

export const PHRASE_RULES: PhraseRule[] = [
  // ---------------------------------------------------------------------------
  // GUARANTEES / OVERPROMISING  (adviser)
  // ---------------------------------------------------------------------------
  {
    rule: "guarantee_returns",
    category: "guarantee",
    severity: "critical",
    label: "Guaranteed-returns language",
    why: "Presenting investment returns as guaranteed breaches COBS fair-and-not-misleading rules.",
    speaker: "adviser",
    negate: NEGATORS,
    patterns: [
      /\bguaranteed?\s+(returns?|profit|growth|income|gains?)\b/gi,
      // "returns ... guaranteed" but NOT across a negator ("returns are not guaranteed").
      /\breturns?\b(?:(?!\b(?:not|never|aren'?t|isn'?t|no)\b)[\s\w]){0,30}?\bguaranteed?\b/gi,
      /\bguarantee(s|d)?\s+you(?:'?ll| will)?\s+(get|make|earn|see|double|profit)\b/gi,
      /\bguaranteed?\s+to\s+(grow|rise|increase|make|double|beat)\b/gi,
    ],
  },
  {
    rule: "guarantee_risk_free",
    category: "guarantee",
    severity: "critical",
    label: "“Risk-free” / “can’t lose” claim",
    why: "Describing an at-risk investment as risk-free misrepresents capital risk to the customer.",
    speaker: "adviser",
    negate: NEGATORS,
    patterns: [
      /\brisk[-\s]?free\b/gi,
      /\b(zero|no|without)\s+risk\b/gi,
      /\b(can'?t|cannot|won'?t|will\s+not)\s+lose\b/gi,
      /\bnothing\s+to\s+lose\b/gi,
    ],
  },
  {
    rule: "guarantee_overpromise",
    category: "guarantee",
    severity: "high",
    label: "Overpromising upside",
    why: "Open-ended upside claims set unfair expectations and obscure downside risk.",
    speaker: "adviser",
    negate: NEGATORS,
    patterns: [
      /\bdouble\s+your\s+(money|investment|savings|pot)\b/gi,
      /\b(definitely|certainly|for sure)\s+(grow|go up|rise|increase|make money)\b/gi,
      /\bsafe\s+as\s+houses\b/gi,
      /\b(completely|totally|100%)\s+safe\b/gi,
    ],
  },

  // ---------------------------------------------------------------------------
  // PRESSURE / URGENCY  (adviser)
  // ---------------------------------------------------------------------------
  {
    rule: "pressure_deadline",
    category: "pressure",
    severity: "high",
    label: "Artificial deadline / urgency",
    why: "Manufactured time pressure pushes a decision before the customer can consider it — a Consumer Duty fair-value and understanding concern.",
    speaker: "adviser",
    patterns: [
      /\b(offer|deal|rate|price|window)\s+(ends|closes|expires)\s+(today|tonight|tomorrow|soon|this week)\b/gi,
      /\b(ends|closes|expires|only available)\s+(today|tonight)\b/gi,
      /\bclos(es|ing)\s+to\s+new\s+(money|investors|business)\b/gi,
      /\bbefore\s+(it'?s\s+)?(too late|gone)\b/gi,
    ],
  },
  {
    rule: "pressure_decide_now",
    category: "pressure",
    severity: "high",
    label: "“Decide now” pressure",
    why: "Demanding an immediate decision denies the customer time to seek information or advice.",
    speaker: "adviser",
    patterns: [
      /\b(decide|sign|commit|confirm)\s+(right\s+)?(now|today|right away|straight away)\b/gi,
      /\bneed\s+to\s+(get\s+the\s+paperwork\s+done|do\s+this|sort\s+this)\s+(now|today)\b/gi,
      /\bcan'?t\s+hold\s+(this|the)\s+(rate|price|offer)\b/gi,
    ],
  },
  {
    rule: "pressure_scarcity",
    category: "pressure",
    severity: "medium",
    label: "Scarcity / “don’t miss out”",
    why: "Scarcity framing nudges a purchase on emotion rather than suitability.",
    speaker: "adviser",
    patterns: [
      /\b(limited\s+(spaces|places|time|availability))\b/gi,
      /\bdon'?t\s+miss\s+(out|this)\b/gi,
      /\bwon'?t\s+last\b/gi,
      /\bonly\s+a\s+few\s+(left|spots|places)\b/gi,
    ],
  },
  {
    rule: "pressure_trust_me",
    category: "pressure",
    severity: "medium",
    label: "“Just trust me” steer",
    why: "Substituting personal assurance for documented suitability undermines informed consent.",
    speaker: "adviser",
    patterns: [
      /\b(just\s+)?trust\s+me\b/gi,
      /\bdon'?t\s+overthink\s+(it|this)\b/gi,
    ],
  },

  // ---------------------------------------------------------------------------
  // MIS-SELLING / UNSUITABLE ADVICE  (adviser)
  // ---------------------------------------------------------------------------
  {
    rule: "missell_discourage_docs",
    category: "mis_selling",
    severity: "high",
    label: "Discouraging the customer from reading documents",
    why: "Steering a customer away from the key features / terms blocks informed consent and the customer's understanding outcome.",
    speaker: "adviser",
    patterns: [
      /\bdon'?t\s+(bother|worry about|need to)\s+(read(ing)?|reading\s+through)?\b[^.?!]{0,30}\b(small print|paperwork|documents?|terms|the rest)\b/gi,
      /\bno\s+need\s+to\s+read\b/gi,
      /\bit'?s\s+just\s+(legal\s+)?(boilerplate|jargon|formalit)/gi,
      /\bskip\s+(over\s+)?the\s+(small print|terms|details)\b/gi,
    ],
  },
  {
    rule: "missell_concentration",
    category: "mis_selling",
    severity: "high",
    label: "Concentration / “put it all in”",
    why: "Recommending the customer commit all of their money to a single product ignores diversification and suitability.",
    speaker: "adviser",
    patterns: [
      /\bput\s+(your\s+)?(whole|entire|all\s+(of\s+)?your)\s+(isa|allowance|savings|pension|money|pot|lot)\b/gi,
      /\b(all|everything)\s+(of\s+it\s+)?(in|into)\s+(this|the)\s+(one|fund|product|scheme)\b/gi,
    ],
  },

  // ---------------------------------------------------------------------------
  // DATA / CONSENT  (adviser asking for the wrong things)
  // ---------------------------------------------------------------------------
  {
    rule: "data_full_credentials",
    category: "data_consent",
    severity: "high",
    label: "Requesting full security credentials",
    why: "A firm should never ask a customer to disclose their full PIN, password or full card number — a data-protection and fraud red flag.",
    speaker: "adviser",
    patterns: [
      /\b(your\s+)?(full|whole|complete)\s+(pin|password|passcode)\b/gi,
      /\b(read\s+me|what'?s|tell\s+me)\b[^.?!]{0,20}\b(full\s+)?(card|debit|credit)\s+(card\s+)?number\b/gi,
      /\byour\s+(memorable\s+word|security\s+answer)\s+in\s+full\b/gi,
    ],
  },
  {
    rule: "data_share_no_consent",
    category: "data_consent",
    severity: "medium",
    label: "Sharing data without consent",
    why: "Passing customer details to a third party without explicit consent is a UK GDPR lawful-basis problem.",
    speaker: "adviser",
    patterns: [
      /\b(pass|share|send)\s+(your|their)\s+(details|information|data|number)\s+(on\s+)?to\s+(a\s+)?(third part|our partners?|another firm|other compan)/gi,
    ],
  },

  // ---------------------------------------------------------------------------
  // VULNERABLE CUSTOMER  (customer reveals a vulnerability — FCA 4 drivers)
  // ---------------------------------------------------------------------------
  {
    rule: "vuln_bereavement",
    category: "vulnerable",
    severity: "high",
    label: "Bereavement / recent life event",
    why: "FCA driver 'life events'. Recent bereavement is a recognised vulnerability — the adviser should adapt and check the customer feels able to proceed.",
    speaker: "customer",
    patterns: [
      /\b(since|after|when)\s+i\s+lost\s+my\s+(husband|wife|partner|mum|mother|dad|father|son|daughter)\b[^.?!,;—]*/gi,
      /\bmy\s+(husband|wife|partner)\s+(passed away|died|passed)\b[^.?!,;—]*/gi,
      /\b(passed away|bereave(d|ment)|widow(ed)?|since\s+the\s+funeral)\b[^.?!,;—]*/gi,
      /\b(lost\s+my\s+job|made\s+redundant|going\s+through\s+a\s+divorce)\b[^.?!,;—]*/gi,
    ],
  },
  {
    rule: "vuln_resilience",
    category: "vulnerable",
    severity: "high",
    label: "Low financial resilience",
    why: "FCA driver 'resilience'. If this is all the money the customer has, capital loss could cause serious harm — suitability bar is much higher.",
    speaker: "customer",
    patterns: [
      /\ball\s+(the|my)\s+(money|savings)(\s+i\s+have)?(\s+left)?\b[^.?!,;—]*/gi,
      /\b(my\s+)?life\s+savings\b[^.?!,;—]*/gi,
      /\bcan'?t\s+afford\s+to\s+lose\b[^.?!,;—]*/gi,
      /\b(all\s+i\s+have\s+left|everything\s+i\'?ve\s+got)\b[^.?!,;—]*/gi,
      /\bi'?m\s+(really\s+)?(struggling|in\s+debt|behind\s+on)\b[^.?!,;—]*/gi,
    ],
  },
  {
    rule: "vuln_confusion",
    category: "vulnerable",
    severity: "medium",
    label: "Possible confusion / low capability",
    why: "FCA driver 'capability'. Signs the customer does not understand the product mean the adviser must slow down and confirm understanding before proceeding.",
    speaker: "customer",
    patterns: [
      /\bi\s+(don'?t|do not)\s+(really\s+)?(understand|follow|get)\b[^.?!,;—]*/gi,
      /\bi\s+(do\s+|really\s+)?(get|am|feel|'m)\s+(a\s+bit\s+|really\s+|quite\s+)?(muddled|confused|lost|overwhelmed|out\s+of\s+my\s+depth)\b[^.?!,;—]*/gi,
      /\b(can\s+you\s+)?explain\s+that\s+again\b[^.?!,;—]*/gi,
      /\bi\s+don'?t\s+know\s+what\s+that\s+means\b[^.?!,;—]*/gi,
      /\bit'?s\s+all\s+(a\s+bit\s+)?(confusing|over\s+my\s+head)\b[^.?!,;—]*/gi,
    ],
  },
  {
    rule: "vuln_distress",
    category: "vulnerable",
    severity: "high",
    label: "Signs of distress",
    why: "Emotional distress on the call is a vulnerability cue; pressing on without support risks an unfair outcome.",
    speaker: "customer",
    patterns: [
      /\bi'?m\s+(really\s+|so\s+)?(worried|scared|frightened|panicking|anxious)\b[^.?!,;—]*/gi,
      /\bi\s+can'?t\s+(cope|take\s+much\s+more)\b[^.?!,;—]*/gi,
      /\[(crying|tearful|sobbing|upset)\]/gi,
    ],
  },
  {
    rule: "vuln_health_serious",
    category: "vulnerable",
    severity: "high",
    label: "Health condition / disability",
    why: "FCA driver 'health'. A disclosed health condition can affect capacity to engage and may require adjustments.",
    speaker: "customer",
    patterns: [
      /\b(my\s+)?(dementia|alzheimer'?s?|my\s+diagnosis|registered\s+disabled|terminal|in\s+hospital|my\s+treatment|my\s+medication)\b[^.?!,;—]*/gi,
      /\bi'?ve\s+been\s+(very\s+)?(unwell|ill|poorly)\b[^.?!,;—]*/gi,
    ],
  },
  {
    rule: "vuln_sensory_minor",
    category: "vulnerable",
    severity: "low",
    label: "Minor accessibility need",
    why: "A minor capability/health cue (e.g. eyesight). Low risk on its own, but worth noting so communications can be adapted.",
    speaker: "customer",
    patterns: [
      /\bmy\s+(eyesight|eyes|hearing|memory)\s+(isn'?t|is\s+not|aren'?t|has\s+been)\b[^.?!,;—]*/gi,
      /\bi\s+find\s+(all\s+)?the\s+(paperwork|forms?|reading)\s+(a\s+bit\s+)?(much|hard|difficult)\b[^.?!,;—]*/gi,
    ],
  },
];

// -----------------------------------------------------------------------------
// GOOD-PRACTICE SIGNALS  (positive — surfaced, never scored)
// -----------------------------------------------------------------------------
export const GOOD_RULES: GoodRule[] = [
  {
    rule: "good_recording_notice",
    label: "Call-recording notice given",
    note: "Customer told the call is recorded for training/compliance — consent handled.",
    speaker: "adviser",
    patterns: [
      /\b(this\s+)?call\s+(is|may\s+be|will\s+be|is\s+being)\s+recorded\b[^.?!,;—]*/gi,
      /\brecorded\s+for\s+(training|quality|compliance|monitoring)\b[^.?!,;—]*/gi,
    ],
  },
  {
    rule: "good_risk_warning",
    label: "Investment risk warning given",
    note: "Adviser stated capital is at risk / value can fall — required disclosure present.",
    speaker: "adviser",
    patterns: [
      /\bvalue\s+(of\s+(your\s+)?investments?\s+)?can\s+(go|fall)\s+down\b[^.?!,;—]*/gi,
      /\bcapital\s+(is\s+)?at\s+risk\b[^.?!,;—]*/gi,
      /\bget\s+back\s+less\s+than\s+you\s+(put\s+in|invest|started)\b[^.?!,;—]*/gi,
      /\bcan\s+fall\s+as\s+well\s+as\s+rise\b[^.?!,;—]*/gi,
    ],
  },
  {
    rule: "good_vulnerability_support",
    label: "Vulnerability handled well",
    note: "Adviser offered to slow down / accommodate / involve a family member — appropriate support for a vulnerable customer.",
    speaker: "adviser",
    patterns: [
      /\b(no\s+rush|take\s+(all\s+)?(your|the)\s+time|at\s+your\s+(own\s+)?pace|there'?s\s+no\s+rush)\b[^.?!,;—]*/gi,
      /\b(large\s+print|talk\s+you\s+through\s+every|go\s+at\s+your\s+pace)\b[^.?!,;—]*/gi,
      /\b(family\s+member|your\s+(daughter|son|family)|someone\s+with\s+you)\b[^.?!,;—]*/gi,
    ],
  },
  {
    rule: "good_no_pressure",
    label: "No-pressure / encourages due diligence",
    note: "Adviser invited the customer to take time and read the documents — supports the understanding outcome.",
    speaker: "adviser",
    patterns: [
      /\bno\s+obligation\s+to\s+proceed\b[^.?!,;—]*/gi,
      /\btake\s+(all\s+)?the\s+time\s+you\s+need\s+to\s+read\b[^.?!,;—]*/gi,
      /\bread\s+(it|everything)\s+over\b[^.?!,;—]*/gi,
    ],
  },
];

// -----------------------------------------------------------------------------
// CALL-LEVEL REQUIRED DISCLOSURES  (absence checks)
//
// These are the clever ones: a flag is raised when a *trigger* appears in the
// call but the matching *required* phrase never does. You can't catch a missing
// disclosure with a phrase match — only by reasoning over the whole call.
// -----------------------------------------------------------------------------
export interface DisclosureRule {
  rule: string;
  category: Category;
  severity: Severity;
  /** Neutral name of the disclosure for the checklist UI. */
  name: string;
  label: string;
  why: string;
  /** What in the call makes the disclosure required. */
  trigger: RegExp;
  /** The disclosure that satisfies the requirement. */
  satisfiedBy: RegExp;
  /** If true the requirement is unconditional (no trigger needed). */
  always?: boolean;
}

export const DISCLOSURE_RULES: DisclosureRule[] = [
  {
    rule: "missing_risk_warning",
    category: "missing_disclosure",
    severity: "high",
    name: "Investment risk warning",
    label: "No investment risk warning",
    why: "An investment was discussed but the customer was never told capital is at risk / the value can fall. Required under COBS 14.3.",
    trigger:
      /\binvest|\bfund\b|\bportfolio\b|\bstocks?\b|\bshares?\b|\bisa\b|\bequit|\bthe\s+market\b|growth\s+fund/i,
    satisfiedBy:
      /\b(value\s+(of\s+[^.?!,;—]*)?can\s+(go|fall)\s+down|capital\s+(is\s+)?at\s+risk|get\s+back\s+less\s+than|fall\s+as\s+well\s+as\s+rise)\b/i,
  },
  {
    rule: "missing_past_performance",
    category: "missing_disclosure",
    severity: "medium",
    name: "Past-performance disclaimer",
    label: "Past performance cited without disclaimer",
    why: "A past return was quoted but the 'past performance is not a guide to the future' disclaimer was never given (COBS 4.6).",
    trigger:
      /\b(returned|grew|gained|made|was\s+up|up)\b[^.?!]{0,20}\d+\s*(?:%|per\s*cent)|\d+\s*(?:%|per\s*cent)[^.?!]{0,20}\b(last\s+year|return|growth|gain)\b/i,
    satisfiedBy:
      /\bpast\s+performance\b[^.?!,;—]*\b(not|no|isn'?t)\b[^.?!,;—]*\b(guide|guarantee|indicat)/i,
  },
  {
    rule: "missing_recording_notice",
    category: "data_consent",
    severity: "medium",
    name: "Call-recording notice",
    label: "No call-recording / monitoring notice",
    why: "The customer was never told the call is recorded or monitored — a consent and data-protection gap.",
    trigger: /.*/i,
    always: true,
    satisfiedBy:
      /\b(call\s+(is|may\s+be|will\s+be|is\s+being)\s+recorded|recorded\s+for\s+(training|quality|compliance|monitoring)|monitored\s+(and|or)\s+recorded)\b/i,
  },
];
