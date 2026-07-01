/**
 * Julian Day conversions (Meeus, "Astronomical Algorithms", ch. 7).
 * All functions operate on the proleptic Gregorian calendar (valid for our year range).
 */

const DEG = Math.PI / 180;
export const toRad = (d: number) => d * DEG;
export const toDeg = (r: number) => r / DEG;

/** Normalize an angle in degrees to [0, 360). */
export function norm360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/**
 * Julian Date from a Gregorian date + fractional day.
 * @param y full year, @param m month 1-12, @param d day-of-month
 * @param dayFraction fraction of the day past midnight (0..1), i.e. (h*3600+min*60+s)/86400
 * Returns the Julian Date (days since -4712-01-01 12:00 UT).
 */
export function julianDate(y: number, m: number, d: number, dayFraction = 0): number {
  let Y = y;
  let M = m;
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd0 =
    Math.floor(365.25 * (Y + 4716)) +
    Math.floor(30.6001 * (M + 1)) +
    d +
    B -
    1524.5;
  return jd0 + dayFraction;
}

/**
 * Integer Julian Day Number for a calendar DATE (the JDN whose civil day is y-m-d).
 * Uses the noon convention: JDN = floor(JD at 12:00) so it is stable for the whole day.
 */
export function julianDayNumber(y: number, m: number, d: number): number {
  // JD at 12:00 UT of that date, floored.
  return Math.floor(julianDate(y, m, d, 0.5) + 0.5);
}

export interface CalendarDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** fractional hour of day, e.g. 13.5 for 13:30 */
  fractionalHour: number;
}

/** Julian Date -> Gregorian calendar date/time (Meeus ch. 7). */
export function calendarFromJulianDate(jd: number): CalendarDateTime {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let A = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    A = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const dayWithFrac = B - D - Math.floor(30.6001 * E) + f;
  const day = Math.floor(dayWithFrac);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const dayFraction = dayWithFrac - day;
  const totalSeconds = Math.round(dayFraction * 86400);
  const hour = Math.floor(totalSeconds / 3600);
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const second = totalSeconds % 60;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    fractionalHour: dayFraction * 24,
  };
}

/** Julian centuries of Terrestrial Time since J2000.0 (JDE = JD + ΔT). */
export function julianCenturiesTT(jde: number): number {
  return (jde - 2451545.0) / 36525.0;
}
