/**
 * 신강약 (day-master strength) and 용신 (useful god) analysis.
 *
 * Two very different epistemic statuses live in this file, and the output is designed to keep
 * them apart:
 *
 *   • 신강약 (strength) is DETERMINISTIC. Given the pillars, the classical 득령/득지/득세
 *     (month-command / rootedness / allies) tests have definite answers. We compute all three
 *     and combine them into a verdict. There is broad agreement on this machinery.
 *
 *   • 용신 (the "useful god") is INTERPRETIVE and contested. Different schools pick it
 *     differently, and a real practitioner weighs the whole chart. We therefore compute a
 *     PROVISIONAL 억부 (support/suppress) candidate AND a separate 조후 (climate) candidate,
 *     and — crucially — we flag when they disagree instead of silently resolving the tension.
 *     This is a starting point for a human reading, never a verdict.
 */
import {
  GENERATES,
  CONTROLS,
  STEMS,
  type Element,
  type Stem,
} from "./constants.js";
import type { FourPillars } from "./pillars.js";
import type { ElementBalance } from "./analysis.js";

/** The five seasonal states of the Day Master relative to the month (旺相休囚死). */
export type Phase = "wang" | "sang" | "hyu" | "su" | "sa";

export interface PhaseInfo {
  key: Phase;
  hangul: string;
  hanja: string;
  en: string;
}

const PHASE: Record<Phase, PhaseInfo> = {
  wang: { key: "wang", hangul: "왕", hanja: "旺", en: "Prospering (in season)" },
  sang: { key: "sang", hangul: "상", hanja: "相", en: "Supported (season feeds you)" },
  hyu: { key: "hyu", hangul: "휴", hanja: "休", en: "Resting (you fed the season)" },
  su: { key: "su", hangul: "수", hanja: "囚", en: "Trapped (you fight the season)" },
  sa: { key: "sa", hangul: "사", hanja: "死", en: "Dead (season drains you)" },
};

/**
 * Seasonal element of a month branch. Each 90° season folds its transitional earth month
 * (辰/未/戌/丑) into the dominant season, the standard grouping for the 旺相休囚死 table.
 *   寅卯辰 → Wood (spring), 巳午未 → Fire (summer), 申酉戌 → Metal (autumn), 亥子丑 → Water (winter).
 */
function seasonElement(monthBranchIndex: number): Element {
  const b = ((monthBranchIndex % 12) + 12) % 12;
  if (b === 2 || b === 3 || b === 4) return "wood";
  if (b === 5 || b === 6 || b === 7) return "fire";
  if (b === 8 || b === 9 || b === 10) return "metal";
  return "water"; // 亥(11) 子(0) 丑(1)
}

/** The element that PRODUCES `e` (its resource-giver). */
function producerOf(e: Element): Element {
  return (Object.keys(GENERATES) as Element[]).find((k) => GENERATES[k] === e)!;
}
/** The element that CONTROLS `e` (its officer). */
function controllerOf(e: Element): Element {
  return (Object.keys(CONTROLS) as Element[]).find((k) => CONTROLS[k] === e)!;
}

/** Day-Master-relative element roles (십성 grouped into five families). */
function dmRoles(dm: Element) {
  return {
    companion: dm, // 비겁 — same element as you
    resource: producerOf(dm), // 인성 — what produces you
    output: GENERATES[dm], // 식상 — what you produce
    wealth: CONTROLS[dm], // 재성 — what you control
    officer: controllerOf(dm), // 관살 — what controls you
  };
}

/** Phase of the Day Master in its birth season. */
function phaseOf(dm: Element, season: Element): Phase {
  if (dm === season) return "wang";
  if (GENERATES[season] === dm) return "sang"; // season generates you
  if (GENERATES[dm] === season) return "hyu"; // you generated the season
  if (CONTROLS[dm] === season) return "su"; // you fight the season
  return "sa"; // CONTROLS[season] === dm — the season drains you
}

export type StrengthVerdict = "태강" | "신강" | "중화" | "신약" | "태약";

export interface StrengthResult {
  phase: PhaseInfo;
  /** 득령: does the Day Master command the month? True when the phase is 旺 or 相. */
  hasMonthCommand: boolean;
  /** 득지 (통근): branches whose hidden stems contain the Day Master's OWN element. */
  strongRoots: number;
  /** Branches whose hidden stems contain the Day Master's RESOURCE element (a weaker root). */
  resourceRoots: number;
  hasRoot: boolean;
  /** 득세: weighted count of allies (비겁 + 인성) across all eight characters incl. hidden stems. */
  supportCount: number;
  /** Weighted count of that which drains/opposes you (식상 + 재성 + 관살). */
  drainCount: number;
  hasAllies: boolean;
  /** How many of the three classical conditions (득령/득지/득세) the Day Master meets. */
  conditionsMet: number;
  verdict: StrengthVerdict;
  /** True when the three conditions split — a genuinely mixed chart a human should weigh. */
  borderline: boolean;
  /** English one-liner the UI/export can show verbatim. */
  summary: string;
}

/**
 * Compute 신강약. Deterministic: three classical tests, then a verdict.
 *   1) 득령 (month command)  — the 旺相休囚死 phase.
 *   2) 득지 (통근 / rootedness) — does the Day Master's element sit hidden in the branches?
 *   3) 득세 (allies)          — do supporters (비겁+인성) outnumber drainers (식상+재성+관살)?
 */
export function computeStrength(
  pillars: FourPillars,
  dayMaster: Stem,
  elements: ElementBalance
): StrengthResult {
  const dm = dayMaster.element;
  const roles = dmRoles(dm);
  const season = seasonElement(pillars.month.branch.index);

  // 1) 득령 — month command.
  const phase = phaseOf(dm, season);
  const hasMonthCommand = phase === "wang" || phase === "sang";

  // 2) 득지 — rootedness (통근). Scan every present branch's hidden stems.
  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch];
  if (pillars.hour) branches.push(pillars.hour.branch);
  let strongRoots = 0;
  let resourceRoots = 0;
  for (const b of branches) {
    const els = b.hiddenStems.map((si) => STEMS[si]!.element);
    if (els.includes(dm)) strongRoots += 1;
    if (els.includes(roles.resource)) resourceRoots += 1;
  }
  const hasRoot = strongRoots > 0;

  // 3) 득세 — allies vs drainers, from the weighted tally (stems + all hidden stems).
  const w = elements.weighted;
  // Subtract the Day Master stem itself from its own-element allies; it is "you", not an ally.
  const supportCount = Math.max(0, w[roles.companion] - 1) + w[roles.resource];
  const drainCount = w[roles.output] + w[roles.wealth] + w[roles.officer];
  const hasAllies = supportCount > drainCount;

  // Combine.
  const conditionsMet =
    (hasMonthCommand ? 1 : 0) + (hasRoot ? 1 : 0) + (hasAllies ? 1 : 0);

  let verdict: StrengthVerdict;
  let borderline = false;
  if (conditionsMet === 3) {
    verdict = supportCount > drainCount * 3 || drainCount === 0 ? "태강" : "신강";
  } else if (conditionsMet === 0) {
    verdict = drainCount > supportCount * 3 || supportCount === 0 ? "태약" : "신약";
  } else {
    verdict = "중화";
    borderline = true;
  }

  const summary =
    `Day Master ${dayMaster.hanja} (${dayMaster.roman}, ${dm}) is ${verdict}` +
    ` — month phase ${PHASE[phase].hanja}(${PHASE[phase].en}); ` +
    `${hasMonthCommand ? "득령" : "실령"}, ${hasRoot ? "득지" : "실지"}, ${hasAllies ? "득세" : "실세"}; ` +
    `support ${supportCount} vs drain ${drainCount}.`;

  return {
    phase: PHASE[phase],
    hasMonthCommand,
    strongRoots,
    resourceRoots,
    hasRoot,
    supportCount,
    drainCount,
    hasAllies,
    conditionsMet,
    verdict,
    borderline,
    summary,
  };
}

// ── 용신 (useful god): PROVISIONAL ────────────────────────────────────────────

export interface EokbuCandidate {
  /** Always true: 억부 output is a candidate, not a verdict. */
  provisional: true;
  /** Elements that would help balance the Day Master (favorable, 희용신). */
  usefulElements: Element[];
  /** Elements likely unfavorable given the strength (기신). */
  avoidElements: Element[];
  rationale: string;
}

export interface JohuCandidate {
  /** True when the chart is climatically lopsided (too hot or too cold) and wants correction. */
  tension: boolean;
  /** "hot" | "cold" | "balanced". */
  climate: "hot" | "cold" | "balanced";
  /** The element that would temper the climate (water for hot, fire for cold); null if balanced. */
  candidateElement: Element | null;
  rationale: string;
}

export interface YongsinResult {
  /** 억부 (support/suppress) candidate — the default method here. */
  eokbu: EokbuCandidate;
  /** 조후 (climate) candidate — a separate lens that can disagree with 억부. */
  johu: JohuCandidate;
  /** True when 억부 and 조후 point in incompatible directions. Surface, do not resolve. */
  diverges: boolean;
  /** Standing caveat the UI/export must show. */
  note: string;
}

const NOT_SETTLED =
  "용신 is interpretive and school-dependent. These are computed CANDIDATES to start a human " +
  "reading — an 억부 (strength-balancing) candidate and a separate 조후 (climate) candidate — " +
  "never a settled answer. Where they diverge, a practitioner weighs the whole chart.";

/**
 * Compute PROVISIONAL 용신 candidates.
 *   • 억부: if the Day Master is weak, feed it (resource + companion); if strong, drain it
 *     (output + wealth + officer). Straightforward from the strength verdict.
 *   • 조후: independent climate read. A fire-dominant/summer chart wants Water to cool it;
 *     a water-dominant/winter chart wants Fire to warm it.
 * Then flag divergence.
 */
export function computeYongsin(
  strength: StrengthResult,
  dayMaster: Stem,
  elements: ElementBalance,
  monthBranchIndex: number
): YongsinResult {
  const dm = dayMaster.element;
  const roles = dmRoles(dm);
  const weak = strength.verdict === "신약" || strength.verdict === "태약";
  const strong = strength.verdict === "신강" || strength.verdict === "태강";

  // 억부 candidate.
  let usefulElements: Element[];
  let avoidElements: Element[];
  let rationale: string;
  if (weak) {
    usefulElements = [roles.resource, roles.companion];
    avoidElements = [roles.output, roles.wealth, roles.officer];
    rationale =
      "Day Master is weak, so the 억부 method favors what supports it: 인성 (resource) and " +
      "비겁 (companion). Elements that further drain it are treated as unfavorable.";
  } else if (strong) {
    usefulElements = [roles.output, roles.wealth, roles.officer];
    avoidElements = [roles.resource, roles.companion];
    rationale =
      "Day Master is strong, so the 억부 method favors what channels or restrains it: 식상 " +
      "(output), 재성 (wealth), and 관살 (officer). More support is treated as unfavorable.";
  } else {
    // 중화 — near balance; nudge toward whichever side is thinner, but stay tentative.
    if (strength.supportCount >= strength.drainCount) {
      usefulElements = [roles.output, roles.wealth, roles.officer];
      avoidElements = [roles.resource, roles.companion];
    } else {
      usefulElements = [roles.resource, roles.companion];
      avoidElements = [roles.output, roles.wealth, roles.officer];
    }
    rationale =
      "Day Master is near balance (중화); the 억부 lean here is slight and especially " +
      "uncertain — a human should decide whether to strengthen or drain.";
  }

  // 조후 candidate — climate.
  const w = elements.weighted;
  const season = seasonElement(monthBranchIndex);
  const fireSeason = season === "fire";
  const waterSeason = season === "water";
  const strongest = elements.strongest;

  let climate: JohuCandidate["climate"] = "balanced";
  let candidateElement: Element | null = null;
  let johuRationale: string;
  if ((w.fire > w.water && strongest === "fire") || (fireSeason && w.fire >= w.water)) {
    climate = "hot";
    candidateElement = "water";
    johuRationale =
      "The chart runs hot (Fire dominant / summer season). 조후 wants Water to cool and moisten it.";
  } else if ((w.water > w.fire && strongest === "water") || (waterSeason && w.water >= w.fire)) {
    climate = "cold";
    candidateElement = "fire";
    johuRationale =
      "The chart runs cold (Water dominant / winter season). 조후 wants Fire to warm it.";
  } else {
    johuRationale = "Climate looks reasonably balanced; 조후 does not force a candidate.";
  }
  const tension = candidateElement !== null;

  // Divergence: the 조후 candidate falls in the 억부 avoid set (or plainly outside its useful set).
  const diverges =
    tension &&
    (avoidElements.includes(candidateElement!) || !usefulElements.includes(candidateElement!));

  return {
    eokbu: { provisional: true, usefulElements, avoidElements, rationale },
    johu: { tension, climate, candidateElement, rationale: johuRationale },
    diverges,
    note: NOT_SETTLED,
  };
}
