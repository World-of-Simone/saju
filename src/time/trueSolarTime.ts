/**
 * Civil clock time -> True Solar Time (진태양시).
 *
 * Two corrections turn the wall clock into the Sun's actual position:
 *   1. Longitude: local mean time = UT + longitude/15 hours (4 min per degree).
 *   2. Equation of Time: apparent solar time = local mean time + EoT (±~16 min seasonal).
 *
 * Historical time-zone offset and DST are resolved from the IANA database (via Luxon),
 * keyed to the birth date — so a 1954 Seoul birth (UTC+8:30) or a US birth during a DST
 * summer is handled correctly without hardcoding.
 */
import { DateTime } from "luxon";
import { julianDate, calendarFromJulianDate, type CalendarDateTime } from "../astro/julian.js";
import { deltaTSeconds } from "../astro/deltaT.js";
import { equationOfTimeMinutes } from "../astro/sun.js";

export interface CivilInput {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23 (local clock, as written on a birth certificate)
  minute: number; // 0-59
  second?: number;
  /** IANA zone id, e.g. "Asia/Seoul", "America/New_York". */
  timezone: string;
  /** Birthplace longitude in degrees, EAST positive (e.g. Seoul ≈ 126.98, NYC ≈ -74.0). */
  longitude: number;
}

export interface TrueSolarTimeResult {
  /** Julian Date of the birth instant in UT. */
  jdUt: number;
  /** Julian Ephemeris Date (TT) of the birth instant. */
  jde: number;
  /** UTC offset actually applied (minutes), including any historical DST. */
  utcOffsetMinutes: number;
  /** Whether Luxon reports DST in effect at the birth instant. */
  isDST: boolean;
  /** Longitude correction applied (minutes). */
  longitudeCorrectionMinutes: number;
  /** Equation of Time applied (minutes). */
  equationOfTimeMinutes: number;
  /** Total offset from local clock to true solar time (minutes). */
  totalCorrectionMinutes: number;
  /** The true-solar wall-clock date/time (what the pillars are actually computed from). */
  trueSolar: CalendarDateTime;
}

export function computeTrueSolarTime(input: CivilInput): TrueSolarTimeResult {
  const second = input.second ?? 0;

  const local = DateTime.fromObject(
    {
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour,
      minute: input.minute,
      second,
    },
    { zone: input.timezone }
  );

  if (!local.isValid) {
    throw new Error(`Invalid civil time or timezone: ${local.invalidReason ?? "unknown"}`);
  }

  const utc = local.toUTC();
  const utcOffsetMinutes = local.offset; // minutes east of UTC at that instant
  const isDST = local.isInDST;

  // JD in UT from the UTC wall clock.
  const dayFraction =
    (utc.hour * 3600 + utc.minute * 60 + utc.second + utc.millisecond / 1000) / 86400;
  const jdUt = julianDate(utc.year, utc.month, utc.day, dayFraction);

  const dt = deltaTSeconds(utc.year, utc.month) / 86400;
  const jde = jdUt + dt;

  // Corrections.
  const longitudeCorrectionMinutes = (input.longitude / 15) * 60; // = longitude * 4
  const eot = equationOfTimeMinutes(jde);

  // Apparent solar time as a Julian Date, then convert to a wall clock.
  const tstJd = jdUt + input.longitude / 360 + eot / 1440;
  const trueSolar = calendarFromJulianDate(tstJd);

  // Total correction from local clock -> true solar time (informational).
  const totalCorrectionMinutes =
    longitudeCorrectionMinutes + eot - utcOffsetMinutes;

  return {
    jdUt,
    jde,
    utcOffsetMinutes,
    isDST,
    longitudeCorrectionMinutes,
    equationOfTimeMinutes: eot,
    totalCorrectionMinutes,
    trueSolar,
  };
}
