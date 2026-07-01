/**
 * Dae-un (대운 / 大運): the 10-year luck pillars.
 *
 * Direction is traditionally derived from the YEAR-stem polarity combined with binary sex
 * (yang-year + male OR yin-year + female => forward; otherwise reverse). Because that rule
 * is inherently binary, this engine takes an EXPLICIT `direction` and lets the caller decide
 * — including computing BOTH directions — so the product can present luck pillars without
 * forcing a binary gender on the user. `directionFromConvention` is offered for callers who
 * do want the classical mapping.
 */
import { STEMS, BRANCHES, type Polarity } from "./constants.js";
import type { Pillar, FourPillars } from "./pillars.js";
import { solveSolarTermNear } from "./astro/solarTerms.js";
import { norm360 } from "./astro/julian.js";
import { MONTH_TERM_LONGITUDES } from "./astro/solarTerms.js";

export type DaeunDirection = "forward" | "reverse";

/** Classical (binary) mapping, offered for convenience — not required by the engine. */
export function directionFromConvention(
  yearStemPolarity: Polarity,
  sex: "male" | "female"
): DaeunDirection {
  const yang = yearStemPolarity === "yang";
  const forward = (yang && sex === "male") || (!yang && sex === "female");
  return forward ? "forward" : "reverse";
}

function pillarFromGanzhiIndex(idx: number): Pillar {
  const i = ((idx % 60) + 60) % 60;
  return { ganzhiIndex: i, stem: STEMS[i % 10]!, branch: BRANCHES[i % 12]! };
}

export interface DaeunPillar {
  order: number; // 1-based
  startAge: number; // age (in years, with fractional part) this luck pillar begins
  pillar: Pillar;
}

export interface DaeunResult {
  direction: DaeunDirection;
  /** Age at which the first luck pillar starts (립운 / start of luck). */
  startAge: number;
  startAgeYears: number;
  startAgeMonths: number;
  pillars: DaeunPillar[];
}

export interface DaeunOptions {
  direction: DaeunDirection;
  /** How many 10-year pillars to generate (default 9 => covers ~90 years). */
  count?: number;
}

/**
 * Compute the dae-un sequence.
 * @param pillars the natal four pillars
 * @param jdUt birth instant (UT) — used to measure distance to the bounding solar terms
 * @param monthOffset month index 0..11 from 寅 (from computeFourPillars)
 */
export function computeDaeun(
  pillars: FourPillars,
  jdUt: number,
  monthOffset: number,
  options: DaeunOptions
): DaeunResult {
  const count = options.count ?? 9;
  const forward = options.direction === "forward";

  // Solar term that STARTED the current month, and the one that starts the NEXT month.
  const currentTermLong = MONTH_TERM_LONGITUDES[monthOffset]!;
  const nextTermLong = norm360(currentTermLong + 30);

  const prevTermJD = solveSolarTermNear(currentTermLong, jdUt - 15);
  const nextTermJD = solveSolarTermNear(nextTermLong, jdUt + 15);

  // 3 days ≈ 1 year (=> 1 day ≈ 4 months).
  const days = forward ? nextTermJD - jdUt : jdUt - prevTermJD;
  const startAgeYears = days / 3;
  const startAge = startAgeYears;
  const startAgeMonths = days * 4;

  const pillars_: DaeunPillar[] = [];
  for (let i = 0; i < count; i++) {
    const step = forward ? i + 1 : -(i + 1);
    pillars_.push({
      order: i + 1,
      startAge: startAge + i * 10,
      pillar: pillarFromGanzhiIndex(pillars.month.ganzhiIndex + step),
    });
  }

  return {
    direction: options.direction,
    startAge,
    startAgeYears,
    startAgeMonths,
    pillars: pillars_,
  };
}
