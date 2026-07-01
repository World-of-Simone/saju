/**
 * Solar-term (절기 / jieqi) solver.
 *
 * A solar term is the instant the Sun's apparent ecliptic longitude reaches a multiple
 * of 15°. Saju month boundaries are the 12 "major" terms (절 / jié) at 315°, 345°, 15° …
 * (every 30° starting at 立春/Ipchun = 315°). The Saju YEAR boundary is 立春 (Ipchun).
 *
 * We solve λ(t) = target by Newton/secant iteration in Terrestrial Time, then convert the
 * result back to UT via ΔT. The Sun moves ~0.98565°/day, so 2–3 iterations converge.
 */
import { solarLongitude } from "./sun.js";
import { deltaTSeconds } from "./deltaT.js";
import { julianDate, calendarFromJulianDate } from "./julian.js";

const MEAN_DEG_PER_DAY = 0.98564736;

/** Signed smallest angular difference (target − value) mapped to [-180, 180]. */
function angleDiff(target: number, value: number): number {
  return ((target - value + 540) % 360) - 180;
}

/**
 * Solve for the Julian Date (UT) at which the Sun reaches `targetDeg`, starting from a
 * UT guess. Returns JD in UT.
 */
export function solveSolarTermNear(targetDeg: number, guessJdUt: number): number {
  // Work in TT.
  const guessCal = calendarFromJulianDate(guessJdUt);
  let dt = deltaTSeconds(guessCal.year, guessCal.month) / 86400;
  let jde = guessJdUt + dt;

  for (let i = 0; i < 8; i++) {
    const lam = solarLongitude(jde);
    const diff = angleDiff(targetDeg, lam);
    if (Math.abs(diff) < 1e-6) break;
    jde += diff / MEAN_DEG_PER_DAY;
  }

  // Convert back to UT using ΔT at the solved date.
  const cal = calendarFromJulianDate(jde);
  dt = deltaTSeconds(cal.year, cal.month) / 86400;
  return jde - dt;
}

/**
 * The Julian Date (UT) of the solar term with longitude `targetDeg` occurring closest to
 * the given Gregorian year (initial guess from a linear ecliptic model).
 */
export function solarTermJD(year: number, targetDeg: number): number {
  // Spring equinox (λ=0) falls near day-of-year ~79.5 (Mar 20). Linear guess.
  const approxDayOfYear = 79.5 + targetDeg / MEAN_DEG_PER_DAY;
  const jan1 = julianDate(year, 1, 1, 0);
  const guess = jan1 + (approxDayOfYear % 365.2422);
  return solveSolarTermNear(targetDeg, guess);
}

/**
 * Ipchun (立春, λ=315°) for a given Gregorian year, as JD in UT.
 * This is the Saju year boundary.
 */
export function ipchunJD(year: number): number {
  // Ipchun is early February; guess Feb 4 of `year`.
  const guess = julianDate(year, 2, 4, 0.0);
  return solveSolarTermNear(315, guess);
}

/** The 12 major-term longitudes (절/jié) that begin each Saju month, in month order from 寅/In. */
export const MONTH_TERM_LONGITUDES = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285];

/** Korean names of the 12 month-starting major terms, aligned to MONTH_TERM_LONGITUDES. */
export const MONTH_TERM_NAMES_KO = [
  "입춘(立春)", "경칩(驚蟄)", "청명(淸明)", "입하(立夏)", "망종(芒種)", "소서(小暑)",
  "입추(立秋)", "백로(白露)", "한로(寒露)", "입동(立冬)", "대설(大雪)", "소한(小寒)",
];

export interface BoundaryProximity {
  /** Minutes from the birth instant to the solar term that STARTED the current Saju month. */
  minutesSincePrevTerm: number;
  /** Minutes from the birth instant to the term that starts the NEXT Saju month. */
  minutesUntilNextTerm: number;
  /** Smaller of the two (minutes to the nearest month/year boundary). */
  nearestMinutes: number;
}

/**
 * Distance (in minutes) from a birth instant to the neighboring month-boundary solar terms.
 * Used to warn when a birth is close enough to a boundary that the ~7-minute precision of the
 * solar-longitude model could plausibly affect the Month (or Year, at Ipchun) Pillar.
 */
export function boundaryProximity(jdUt: number, monthOffset: number): BoundaryProximity {
  const currentTermLong = MONTH_TERM_LONGITUDES[monthOffset]!;
  const nextTermLong = (currentTermLong + 30) % 360;
  const prevTermJD = solveSolarTermNear(currentTermLong, jdUt - 15);
  const nextTermJD = solveSolarTermNear(nextTermLong, jdUt + 15);
  const minutesSincePrevTerm = (jdUt - prevTermJD) * 1440;
  const minutesUntilNextTerm = (nextTermJD - jdUt) * 1440;
  return {
    minutesSincePrevTerm,
    minutesUntilNextTerm,
    nearestMinutes: Math.min(Math.abs(minutesSincePrevTerm), Math.abs(minutesUntilNextTerm)),
  };
}
