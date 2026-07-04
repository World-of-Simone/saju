/**
 * 신강약 (day-master strength) INGREDIENTS and the 조후 (climate) season default.
 *
 * Per spec §6, two calls are judgment, not computation, and the engine must NOT hand them down
 * as verdicts:
 *
 *   • 신강약 (strength) — the engine surfaces the classical INGREDIENTS (득령/득지/득세, i.e.
 *     월지 command, rootedness, allies) but NOT the 신강/신약 verdict. The call is the reading
 *     layer's, shown with reasoning and offered as contestable (order: 월지 → 인성 → 비겁).
 *
 *   • 용신 (the "useful god") is the most discretion-heavy call in the chart and is NEVER a
 *     calculator output. The engine emits only the 조후 SEASON classification as a labeled,
 *     overridable default (see computeJohuSeason) — a starting prior, not a verdict.
 */
import {
  GENERATES,
  CONTROLS,
  STEMS,
  BRANCHES,
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

export interface StrengthResult {
  phase: PhaseInfo;
  /** 득령 (월지): does the Day Master command the month? True when the phase is 旺 or 相. */
  hasMonthCommand: boolean;
  /** 월지 통근: the Day Master's OWN element sits hidden in the MONTH branch (the primary root). */
  rootedInMonthBranch: boolean;
  /** 득지 (통근): branches whose hidden stems contain the Day Master's OWN element. */
  strongRoots: number;
  /** Branches whose hidden stems contain the Day Master's RESOURCE element (a weaker root). */
  resourceRoots: number;
  hasRoot: boolean;
  /** 인성 (resource) present anywhere in the chart. */
  resourcePresent: boolean;
  /** 비겁 (companion) present beyond the Day Master stem itself. */
  companionPresent: boolean;
  /** 득세: weighted count of allies (비겁 + 인성) across all eight characters incl. hidden stems. */
  supportCount: number;
  /** Weighted count of that which drains/opposes you (식상 + 재성 + 관살). */
  drainCount: number;
  hasAllies: boolean;
  /** How many of the three classical conditions (득령/득지/득세) the Day Master meets, 0–3. */
  conditionsMet: number;
  /**
   * INGREDIENT summary only. The 신강/신약 call is the reading layer's — weighed from these
   * ingredients (order: 월지 → 인성 → 비겁), shown with reasoning, offered as contestable.
   * The engine never hands down a verdict.
   */
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
  // 월지 통근: the primary root — the Day Master's OWN element hidden in the MONTH branch.
  const rootedInMonthBranch = pillars.month.branch.hiddenStems
    .map((si) => STEMS[si]!.element)
    .includes(dm);

  // 3) 득세 — allies vs drainers, from the weighted tally (stems + all hidden stems).
  const w = elements.weighted;
  // Subtract the Day Master stem itself from its own-element allies; it is "you", not an ally.
  const supportCount = Math.max(0, w[roles.companion] - 1) + w[roles.resource];
  const drainCount = w[roles.output] + w[roles.wealth] + w[roles.officer];
  const hasAllies = supportCount > drainCount;
  // 인성 (resource) present anywhere; 비겁 (companion) present beyond the Day Master stem itself.
  const resourcePresent = w[roles.resource] > 0;
  const companionPresent = Math.max(0, w[roles.companion] - 1) > 0;

  // How many of the three classical conditions the Day Master meets — an INGREDIENT count, not
  // a verdict. The 신강/신약 call is the reading layer's.
  const conditionsMet =
    (hasMonthCommand ? 1 : 0) + (hasRoot ? 1 : 0) + (hasAllies ? 1 : 0);

  const summary =
    `Day Master ${dayMaster.hanja} (${dayMaster.roman}, ${dm}) — INGREDIENTS for the strength call ` +
    `(the 신강/신약 verdict is the reading's, not the engine's): ` +
    `month phase ${PHASE[phase].hanja}(${PHASE[phase].en}); ` +
    `${hasMonthCommand ? "득령" : "실령"}, ${hasRoot ? "득지" : "실지"}, ${hasAllies ? "득세" : "실세"}; ` +
    `${rootedInMonthBranch ? "rooted in the month branch" : "no root in the month branch"}; ` +
    `인성 ${resourcePresent ? "present" : "absent"}, 비겁 ${companionPresent ? "present" : "absent"}; ` +
    `support ${supportCount} vs drain ${drainCount} (${conditionsMet}/3 conditions).`;

  return {
    phase: PHASE[phase],
    hasMonthCommand,
    rootedInMonthBranch,
    strongRoots,
    resourceRoots,
    hasRoot,
    resourcePresent,
    companionPresent,
    supportCount,
    drainCount,
    hasAllies,
    conditionsMet,
    summary,
  };
}

// ── 조후 (climate) SEASON: a labeled, overridable default ─────────────────────
//
// 용신 (the "useful god") is NOT computed here and is never a calculator output (spec §6). The
// engine emits only the 조후 SEASON classification — the climate season the chart is born into —
// as a starting prior a practitioner may keep or override.
//
// The climate season LAGS the calendar term by one branch: the four 生地 season-openers
// (寅 spring / 巳 summer / 申 autumn / 亥 winter) still read climatically as the tail of the
// PRIOR season (the cold of early 寅, the heat lingering into 申, etc.). Implemented as a
// one-branch offset so each climate season runs one branch later than the bare calendar season:
//   winter {子 丑 寅}, spring {卯 辰 巳}, summer {午 未 申}, autumn {酉 戌 亥}.
// The classification is firmest for 寅월 (deep-winter cold at the calendar start of spring).

export type JohuSeasonKey = "spring" | "summer" | "autumn" | "winter";

interface SeasonLabel {
  hangul: string;
  hanja: string;
  en: string;
}

const SEASON_LABEL: Record<JohuSeasonKey, SeasonLabel> = {
  spring: { hangul: "봄", hanja: "春", en: "Spring" },
  summer: { hangul: "여름", hanja: "夏", en: "Summer" },
  autumn: { hangul: "가을", hanja: "秋", en: "Autumn" },
  winter: { hangul: "겨울", hanja: "冬", en: "Winter" },
};

/** Climate season by month-branch index (0=子 … 11=亥), lagging the calendar term by one branch. */
const JOHU_SEASON: JohuSeasonKey[] = [
  "winter", // 0 子
  "winter", // 1 丑
  "winter", // 2 寅  ← calendar spring, but climatically still deep winter (firmest case)
  "spring", // 3 卯
  "spring", // 4 辰
  "spring", // 5 巳
  "summer", // 6 午
  "summer", // 7 未
  "summer", // 8 申
  "autumn", // 9 酉
  "autumn", // 10 戌
  "autumn", // 11 亥
];

const JOHU_NOTE =
  "조후 season is a labeled, overridable DEFAULT — a starting prior for the reading, not a " +
  "verdict. 용신 (the useful god) is interpretive and school-dependent and is deliberately NOT " +
  "emitted by the engine; a practitioner weighs the whole chart.";

export interface JohuSeason {
  season: JohuSeasonKey;
  hangul: string;
  hanja: string;
  en: string;
  /** Hanja of the month branch this was read from. */
  monthBranchHanja: string;
  /** True when the month branch is a 生地 season-opener (寅巳申亥) read back one season. */
  seasonOpener: boolean;
  /** True for 寅월 — the case where the climate/calendar lag is firmest (deep-winter cold). */
  firmest: boolean;
  /** Always true: this is a default the reading may override. */
  default: true;
  note: string;
}

/**
 * Classify the 조후 (climate) season the chart is born into, from the MONTH branch. A labeled,
 * overridable default — never a 용신 and never a verdict (spec §6).
 */
export function computeJohuSeason(monthBranchIndex: number): JohuSeason {
  const b = ((monthBranchIndex % 12) + 12) % 12;
  const season = JOHU_SEASON[b]!;
  const label = SEASON_LABEL[season];
  const seasonOpener = b === 2 || b === 5 || b === 8 || b === 11; // 寅 巳 申 亥
  return {
    season,
    hangul: label.hangul,
    hanja: label.hanja,
    en: label.en,
    monthBranchHanja: BRANCHES[b]!.hanja,
    seasonOpener,
    firmest: b === 2, // 寅월
    default: true,
    note: JOHU_NOTE,
  };
}
