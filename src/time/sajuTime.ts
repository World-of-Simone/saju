/**
 * Her-method birth-instant resolution — 진태양시·시간대·서머타임 모두 미적용.
 *
 * Master Kim's convention (build to her method, not to astronomical correctness):
 * read the RAW recorded clock number straight into the Korean 만세력. No true solar time,
 * no timezone conversion, no daylight saving, no longitude correction. The recorded local
 * clock number is used exactly as written.
 *
 * The ONE place precision is mandatory is the 절기 (solar-term) boundary, which is a real
 * astronomical event — so we still need an instant to evaluate the Sun's longitude. The
 * 만세력 lists 절기 times in Korean Standard Time, so the raw clock number is interpreted in
 * that same frame (KST, UTC+9) to place the birth relative to a term boundary. This is
 * applied UNIVERSALLY, foreign births included: a 12:20 birth in Los Angeles is read as
 * 12:20 against the Korean almanac (see spec §2 rule 4 and "the one genuine edge").
 *
 * Day boundary: 23:00 rolls to the NEXT day, always. No 야자시/조자시 split — from 11pm the
 * branches restart at 子 (자시) AND the day pillar advances (무조건 열한시부터는 다음 날로).
 */
import { julianDate, julianDayNumber } from "../astro/julian.js";
import { deltaTSeconds } from "../astro/deltaT.js";

/** Fixed frame for reading the raw clock against the Korean 만세력 (Korean Standard Time). */
export const MANSERYEOK_UTC_OFFSET_HOURS = 9;

export interface SajuClockInput {
  year: number;
  month: number; // 1-12
  day: number;
  /** 0-23, raw recorded clock — NOT converted for timezone, DST, or true solar time. */
  hour: number;
  minute: number; // 0-59
  second?: number;
}

export interface SajuTimeResult {
  /**
   * Julian Date (UT) of the birth instant, with the raw clock interpreted as KST (+9).
   * Used ONLY to evaluate 절기 / 입춘 boundaries — never to shift the wall clock.
   */
  jdUt: number;
  /** Julian Ephemeris Date (TT) = jdUt + ΔT, for the VSOP87 solar longitude. */
  jde: number;
  /** Integer Julian Day Number for the DAY pillar, after the 23:00 → next-day rule. */
  dayJdn: number;
  /** Whether the 23:00 rule advanced the day pillar to the next calendar day. */
  rolledToNextDay: boolean;
  /** Raw clock hour as a fraction (e.g. 14.5 for 14:30); drives the 시 (hour) branch. */
  fractionalHour: number;
  /** Echo of the raw recorded clock, exactly as supplied. */
  clock: Required<SajuClockInput>;
}

/**
 * Resolve the birth instant under her method: raw clock, no corrections, KST frame for 절기.
 */
export function resolveSajuTime(input: SajuClockInput): SajuTimeResult {
  const second = input.second ?? 0;
  const { year, month, day, hour, minute } = input;

  // Astronomical instant: interpret the raw clock as KST (+9), then step back to UT.
  const localDayFraction = (hour * 3600 + minute * 60 + second) / 86400;
  const jdLocalAsIfUt = julianDate(year, month, day, localDayFraction);
  const jdUt = jdLocalAsIfUt - MANSERYEOK_UTC_OFFSET_HOURS / 24;

  const jde = jdUt + deltaTSeconds(year, month) / 86400;

  // Day-pillar date: the raw calendar date, advanced one day from 23:00 (no 자시 split).
  const rolledToNextDay = hour >= 23;
  const dayJdn = julianDayNumber(year, month, day) + (rolledToNextDay ? 1 : 0);

  const fractionalHour = hour + minute / 60 + second / 3600;

  return {
    jdUt,
    jde,
    dayJdn,
    rolledToNextDay,
    fractionalHour,
    clock: { year, month, day, hour, minute, second },
  };
}
