/**
 * saju-engine — accurate Korean Four Pillars (사주) calculation with true solar time.
 *
 * Public entry point: `computeSaju(input)`.
 */
import { computeTrueSolarTime, type CivilInput, type TrueSolarTimeResult } from "./time/trueSolarTime.js";
import { computeFourPillars, type FourPillars } from "./pillars.js";
import { boundaryProximity } from "./astro/solarTerms.js";
import {
  computeTenGods,
  computeElementBalance,
  type TenGodsResult,
  type ElementBalance,
} from "./analysis.js";
import {
  computeDaeun,
  directionFromConvention,
  type DaeunResult,
  type DaeunDirection,
} from "./daeun.js";
import {
  computeStrength,
  computeYongsin,
  type StrengthResult,
  type YongsinResult,
} from "./strength.js";
import type { Stem } from "./constants.js";

export * from "./constants.js";
export * from "./glossary.js";
export type { CivilInput, TrueSolarTimeResult } from "./time/trueSolarTime.js";
export type { FourPillars, Pillar } from "./pillars.js";
export type { TenGodsResult, ElementBalance } from "./analysis.js";
export type { DaeunResult, DaeunDirection } from "./daeun.js";
export type { StrengthResult, YongsinResult } from "./strength.js";

export interface SajuInput extends CivilInput {
  /**
   * Set false when the birth time is unknown. The Hour Pillar and (unless a direction is
   * given) dae-un are omitted rather than guessed.
   */
  hasBirthTime?: boolean;
  daeun?: {
    /**
     * Explicit direction avoids forcing a binary gender. Pass "both" to compute forward AND
     * reverse and let the user choose. Omit to skip dae-un entirely.
     */
    direction?: DaeunDirection | "both";
    /**
     * Optional convenience: derive direction from the classical (binary) rule. Ignored if
     * `direction` is provided. `note` documents the inclusivity caveat for the UI.
     */
    fromConvention?: { sex: "male" | "female" };
    count?: number;
  };
}

export interface SajuResult {
  input: SajuInput;
  trueSolarTime: TrueSolarTimeResult;
  pillars: FourPillars;
  dayMaster: Stem;
  tenGods: TenGodsResult;
  elements: ElementBalance;
  /** 신강약 — Day Master strength. Deterministic. */
  strength: StrengthResult;
  /** 용신 — PROVISIONAL useful-god candidates (억부 + 조후), with a divergence flag. */
  yongsin: YongsinResult;
  daeun?: { forward?: DaeunResult; reverse?: DaeunResult; inclusivityNote?: string };
  warnings: string[];
}

const INCLUSIVITY_NOTE =
  "Dae-un direction traditionally depends on birth-year polarity combined with binary sex. " +
  "This result exposes the direction(s) explicitly; where sex is not provided or not binary, " +
  "present both directions and let the person choose what resonates.";

export function computeSaju(input: SajuInput): SajuResult {
  const warnings: string[] = [];
  const hasBirthTime = input.hasBirthTime ?? true;
  if (!hasBirthTime) {
    warnings.push("Birth time unknown: Hour Pillar omitted; chart computed with 3 pillars.");
  }

  const tst = computeTrueSolarTime(input);
  const pillars = computeFourPillars(tst, hasBirthTime);
  const dayMaster = pillars.day.stem;

  // The VSOP87-based solar longitude puts solar-term instants within ~20 seconds, so the
  // remaining risk near a boundary is the accuracy of the RECORDED birth time. Warn when the
  // birth falls within 5 min of a month/year boundary so a rounded/uncertain time can be checked.
  const proximity = boundaryProximity(tst.jdUt, pillars.monthOffset);
  if (proximity.nearestMinutes < 5) {
    warnings.push(
      `Birth is only ~${Math.round(proximity.nearestMinutes)} min from a solar-term (월/절기) ` +
        `boundary. The Month Pillar (or Year Pillar near 입춘) is time-sensitive here; if the ` +
        `recorded birth time is rounded or uncertain, the pillar could differ — verify it.`
    );
  }
  const tenGods = computeTenGods(pillars);
  const elements = computeElementBalance(pillars);
  const strength = computeStrength(pillars, dayMaster, elements);
  const yongsin = computeYongsin(strength, dayMaster, elements, pillars.month.branch.index);

  let daeun: SajuResult["daeun"];
  if (input.daeun) {
    const count = input.daeun.count;
    let directions: DaeunDirection[] = [];

    if (input.daeun.direction === "both") {
      directions = ["forward", "reverse"];
    } else if (input.daeun.direction) {
      directions = [input.daeun.direction];
    } else if (input.daeun.fromConvention) {
      directions = [
        directionFromConvention(pillars.year.stem.polarity, input.daeun.fromConvention.sex),
      ];
    }

    daeun = { inclusivityNote: INCLUSIVITY_NOTE };
    for (const d of directions) {
      const r = computeDaeun(pillars, tst.jdUt, pillars.monthOffset, { direction: d, count });
      if (d === "forward") daeun.forward = r;
      else daeun.reverse = r;
    }
  }

  return { input, trueSolarTime: tst, pillars, dayMaster, tenGods, elements, strength, yongsin, daeun, warnings };
}
