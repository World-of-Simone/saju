/**
 * Derived analysis: Ten Gods (십성) and Five-Element (오행) balance.
 */
import {
  STEMS,
  BRANCHES,
  GENERATES,
  CONTROLS,
  TEN_GODS,
  type Stem,
  type Element,
  type TenGodKey,
  type TenGod,
} from "./constants.js";
import type { FourPillars, Pillar } from "./pillars.js";

/**
 * The Ten God (십성) that `other` represents relative to the Day Master `dm`.
 * Determined by the five-element relationship plus same/opposite polarity.
 */
export function tenGodOf(dm: Stem, other: Stem): TenGodKey {
  const same = dm.polarity === other.polarity;

  if (other.element === dm.element) return same ? "bigyeon" : "geopjae";
  if (GENERATES[dm.element] === other.element) return same ? "siksin" : "sanggwan"; // output
  if (CONTROLS[dm.element] === other.element) return same ? "pyeonjae" : "jeongjae"; // wealth
  if (CONTROLS[other.element] === dm.element) return same ? "pyeongwan" : "jeonggwan"; // authority
  if (GENERATES[other.element] === dm.element) return same ? "pyeonin" : "jeongin"; // resource

  // Unreachable for valid stems.
  throw new Error(`Cannot classify Ten God for ${dm.hanja} vs ${other.hanja}`);
}

export interface TenGodLabel {
  key: TenGodKey;
  info: TenGod;
}

function label(key: TenGodKey): TenGodLabel {
  return { key, info: TEN_GODS[key] };
}

export interface PillarTenGods {
  /** Ten God of this pillar's stem relative to the Day Master (null for the Day Pillar stem itself). */
  stem: TenGodLabel | null;
  /** Ten God of the branch's MAIN hidden stem relative to the Day Master. */
  branchMain: TenGodLabel;
  /** Ten Gods of ALL hidden stems in the branch (지장간), main qi (정기) first. */
  hidden: TenGodLabel[];
}

function pillarTenGods(dm: Stem, pillar: Pillar, isDayPillar: boolean): PillarTenGods {
  const hidden = pillar.branch.hiddenStems.map((si) => label(tenGodOf(dm, STEMS[si]!)));
  // The branch's Ten God is driven by the main qi (정기/본기), which is stored FIRST in
  // hiddenStems (its element always matches the branch's own element).
  const mainHiddenStem = STEMS[pillar.branch.hiddenStems[0]!]!;
  return {
    stem: isDayPillar ? null : label(tenGodOf(dm, pillar.stem)),
    branchMain: label(tenGodOf(dm, mainHiddenStem)),
    hidden,
  };
}

export interface TenGodsResult {
  year: PillarTenGods;
  month: PillarTenGods;
  day: PillarTenGods;
  hour: PillarTenGods | null;
}

export function computeTenGods(pillars: FourPillars): TenGodsResult {
  const dm = pillars.day.stem; // Day Master (일간)
  return {
    year: pillarTenGods(dm, pillars.year, false),
    month: pillarTenGods(dm, pillars.month, false),
    day: pillarTenGods(dm, pillars.day, true),
    hour: pillars.hour ? pillarTenGods(dm, pillars.hour, false) : null,
  };
}

export interface ElementBalance {
  /** Count across the visible 8 characters (stems + branch primary elements). */
  visible: Record<Element, number>;
  /** Weighted count including all hidden stems (지장간) in branches. */
  weighted: Record<Element, number>;
  strongest: Element;
  weakest: Element;
  /** Elements with a zero visible count — often the most telling in a reading. */
  missing: Element[];
}

const ZERO = (): Record<Element, number> => ({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 });

export function computeElementBalance(pillars: FourPillars): ElementBalance {
  const visible = ZERO();
  const weighted = ZERO();

  const list: Pillar[] = [pillars.year, pillars.month, pillars.day];
  if (pillars.hour) list.push(pillars.hour);

  for (const p of list) {
    visible[p.stem.element] += 1;
    visible[p.branch.element] += 1;
    weighted[p.stem.element] += 1;
    // Hidden stems contribute to the weighted tally.
    for (const si of p.branch.hiddenStems) {
      weighted[STEMS[si]!.element] += 1;
    }
  }

  const elements = Object.keys(visible) as Element[];
  const strongest = elements.reduce((a, b) => (weighted[b] > weighted[a] ? b : a));
  const weakest = elements.reduce((a, b) => (weighted[b] < weighted[a] ? b : a));
  const missing = elements.filter((e) => visible[e] === 0);

  return { visible, weighted, strongest, weakest, missing };
}
