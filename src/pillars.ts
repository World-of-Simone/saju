/**
 * Four Pillars (사주 / 四柱) assembly under Master Kim's method (raw clock, no true-solar).
 *
 * Conventions (locked project decisions):
 *  - Year boundary = 立春 / Ipchun (NOT Lunar New Year), from the apparent Sun longitude.
 *  - Month boundary = the 12 major solar terms (절), to the minute, from the Sun longitude.
 *  - Day boundary = 23:00 rolls to the NEXT day, ALWAYS. No 야자시/조자시 split: from 11pm
 *    the branches restart at 子 (자시) AND the Day Pillar advances a day. A 23:30 birth is
 *    read as the next day's 자시.
 *  - Hour = the 2-hour 시 branch from the RAW clock, where 子 (자시) begins at 23:00.
 *
 * The birth instant used for 절기/입춘 is the raw clock interpreted as KST (see sajuTime.ts);
 * no longitude, equation-of-time, timezone, or DST correction is applied to the wall clock.
 */
import {
  STEMS,
  BRANCHES,
  FIVE_TIGERS_MONTH_STEM,
  FIVE_RATS_HOUR_STEM,
  type Stem,
  type Branch,
} from "./constants.js";
import { julianDayNumber, norm360 } from "./astro/julian.js";
import { solarLongitude } from "./astro/sun.js";
import { ipchunJD } from "./astro/solarTerms.js";
import type { SajuTimeResult } from "./time/sajuTime.js";

/**
 * Day-Pillar calibration constant: sexagenary day index = (JDN + DAY_GANZHI_OFFSET) mod 60,
 * where index 0 = 甲子 (Gapja) and JDN is the integer Julian Day Number of the date.
 * Pinned by tests against reference data (1984-02-02 = 甲子 day).
 */
export const DAY_GANZHI_OFFSET = 49;

export interface Pillar {
  /** 0..59 sexagenary index (0 = 甲子). */
  ganzhiIndex: number;
  stem: Stem;
  branch: Branch;
}

function pillarFromStemBranch(stemIndex: number, branchIndex: number): Pillar {
  const s = ((stemIndex % 10) + 10) % 10;
  const b = ((branchIndex % 12) + 12) % 12;
  // Recover the 60-cycle index from stem (mod 10) and branch (mod 12).
  let ganzhi = -1;
  for (let i = 0; i < 60; i++) {
    if (i % 10 === s && i % 12 === b) {
      ganzhi = i;
      break;
    }
  }
  return { ganzhiIndex: ganzhi, stem: STEMS[s]!, branch: BRANCHES[b]! };
}

/** Day Pillar from an integer Julian Day Number (already 23:00-rolled by the time layer). */
export function dayPillarFromJdn(jdn: number): Pillar {
  const idx = ((jdn + DAY_GANZHI_OFFSET) % 60 + 60) % 60;
  return { ganzhiIndex: idx, stem: STEMS[idx % 10]!, branch: BRANCHES[idx % 12]! };
}

/** Day Pillar from a calendar date (noon convention; no 23:00 rollover applied here). */
export function dayPillar(year: number, month: number, day: number): Pillar {
  return dayPillarFromJdn(julianDayNumber(year, month, day));
}

/**
 * Year Pillar. The Saju year rolls at Ipchun (立春), so a birth before that year's Ipchun
 * belongs to the previous Saju year. Comparison is on the true birth instant (UT).
 */
export function yearPillar(jdUt: number, gregorianYear: number): { pillar: Pillar; sajuYear: number } {
  const ipchunThisYear = ipchunJD(gregorianYear);
  const sajuYear = jdUt < ipchunThisYear ? gregorianYear - 1 : gregorianYear;
  const stem = ((sajuYear - 4) % 10 + 10) % 10;
  const branch = ((sajuYear - 4) % 12 + 12) % 12;
  return { pillar: pillarFromStemBranch(stem, branch), sajuYear };
}

/**
 * Month index 0..11 measured from 寅 (In / first month), based on the apparent solar
 * longitude at the birth instant. 立春 (315°) begins month 0.
 */
export function monthOffsetFromLongitude(apparentLongitudeDeg: number): number {
  return Math.floor(norm360(apparentLongitudeDeg - 315) / 30);
}

/** Month Pillar. Branch from the solar sector; stem from the Five Tigers rule + year stem. */
export function monthPillar(jde: number, yearStemIndex: number): { pillar: Pillar; monthOffset: number } {
  const lambda = solarLongitude(jde);
  const k = monthOffsetFromLongitude(lambda);
  const branchIndex = (2 + k) % 12; // 寅 = 2
  const firstMonthStem = FIVE_TIGERS_MONTH_STEM[yearStemIndex % 5]!;
  const stemIndex = (firstMonthStem + k) % 10;
  return { pillar: pillarFromStemBranch(stemIndex, branchIndex), monthOffset: k };
}

/** Earthly-branch index of the two-hour period for a true-solar clock hour (子 spans 23–01). */
export function hourBranchIndex(fractionalHour: number): number {
  return Math.floor((fractionalHour + 1) / 2) % 12;
}

/** Hour Pillar. Branch from the true-solar 시진; stem from the Five Rats rule + day stem. */
export function hourPillar(fractionalHour: number, dayStemIndex: number): Pillar {
  const branchIndex = hourBranchIndex(fractionalHour);
  const firstHourStem = FIVE_RATS_HOUR_STEM[dayStemIndex % 5]!;
  const stemIndex = (firstHourStem + branchIndex) % 10;
  return pillarFromStemBranch(stemIndex, branchIndex);
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null; // null when birth time is unknown
  sajuYear: number;
  monthOffset: number;
}

/** Assemble all four pillars from a resolved her-method time result. */
export function computeFourPillars(t: SajuTimeResult, hasBirthTime: boolean): FourPillars {
  const { pillar: year, sajuYear } = yearPillar(t.jdUt, t.clock.year);
  const { pillar: month, monthOffset } = monthPillar(t.jde, year.stem.index);
  const day = dayPillarFromJdn(t.dayJdn);
  const hour = hasBirthTime ? hourPillar(t.fractionalHour, day.stem.index) : null;

  return { year, month, day, hour, sajuYear, monthOffset };
}
