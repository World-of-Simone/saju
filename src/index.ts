/**
 * saju-engine — Korean Four Pillars (사주) under Master Kim's method.
 *
 * Her governing rule: build to her method, not to astronomical correctness. Pillars are
 * computed from the RAW recorded clock — no true solar time, no timezone/DST conversion, no
 * longitude. The one mandatory precision is the 절기 (solar-term) boundary. The astronomical
 * true-solar/IANA calculation is preserved ONLY as an off-by-default diagnostic for
 * comparison (never feeds the chart or the reading agent).
 *
 * Public entry point: `computeSaju(input)`.
 */
import { resolveSajuTime, type SajuClockInput } from "./time/sajuTime.js";
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
  computeJohuSeason,
  type StrengthResult,
  type JohuSeason,
} from "./strength.js";
import type { Stem } from "./constants.js";

export * from "./constants.js";
export * from "./glossary.js";
export type { SajuClockInput } from "./time/sajuTime.js";
export type { CivilInput, TrueSolarTimeResult } from "./time/trueSolarTime.js";
export type { FourPillars, Pillar } from "./pillars.js";
export type { TenGodsResult, ElementBalance } from "./analysis.js";
export type { DaeunResult, DaeunDirection } from "./daeun.js";
export type { StrengthResult, JohuSeason } from "./strength.js";

export interface SajuInput extends SajuClockInput {
  /**
   * Set false when the birth time is unknown. The Hour Pillar and (unless a direction is
   * given) dae-un are omitted rather than guessed.
   */
  hasBirthTime?: boolean;
  /**
   * Birthplace reference only — under her method it does NOT feed a timezone or longitude
   * correction. Supplied purely so the astronomical diagnostic (below) can be computed.
   */
  timezone?: string;
  longitude?: number;
  /**
   * Off by default. When true (and timezone + longitude are given), also compute the
   * astronomical true-solar/IANA chart for comparison. It NEVER drives the pillars and is
   * never fed to the reading agent — it is a developer diagnostic only.
   */
  diagnostics?: boolean;
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
  /**
   * Astronomical true-solar/IANA comparison. Present ONLY when `diagnostics` is requested;
   * it does not affect the pillars and must never be fed to the reading agent.
   */
  trueSolarTime?: TrueSolarTimeResult;
  pillars: FourPillars;
  dayMaster: Stem;
  tenGods: TenGodsResult;
  elements: ElementBalance;
  /**
   * 신강약 INGREDIENTS (득령/득지/득세, 월지 root, 인성/비겁 presence). The 신강/신약 VERDICT is
   * deliberately NOT emitted — that call belongs to the reading layer (spec §6).
   */
  strength: StrengthResult;
  /**
   * 조후 (climate) SEASON — a labeled, overridable default read from the month branch. NOT a
   * 용신: the useful god is never a calculator output (spec §6).
   */
  johuSeason: JohuSeason;
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

  const time = resolveSajuTime(input);
  const pillars = computeFourPillars(time, hasBirthTime);
  const dayMaster = pillars.day.stem;

  // Off-by-default astronomical diagnostic (never drives the pillars, never fed to the agent).
  let trueSolarTime: TrueSolarTimeResult | undefined;
  if (input.diagnostics && input.timezone && input.longitude != null) {
    trueSolarTime = computeTrueSolarTime({
      year: input.year, month: input.month, day: input.day,
      hour: input.hour, minute: input.minute, second: input.second,
      timezone: input.timezone, longitude: input.longitude,
    });
  }

  // The VSOP87-based solar longitude puts solar-term instants within ~20 seconds, so the
  // remaining risk near a boundary is the accuracy of the RECORDED birth time. Warn when the
  // birth falls within 5 min of a month/year boundary so a rounded/uncertain time can be checked.
  const proximity = boundaryProximity(time.jdUt, pillars.monthOffset);
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
  const johuSeason = computeJohuSeason(pillars.month.branch.index);

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
      const r = computeDaeun(pillars, time.jdUt, pillars.monthOffset, { direction: d, count });
      if (d === "forward") daeun.forward = r;
      else daeun.reverse = r;
    }
  }

  return { input, trueSolarTime, pillars, dayMaster, tenGods, elements, strength, johuSeason, daeun, warnings };
}
