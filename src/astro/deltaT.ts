/**
 * ΔT = TT − UT, the difference between Terrestrial Time and Universal Time.
 *
 * We convert civil (UT-based) instants to TT before computing solar position, because
 * the Sun's true position is a function of TT. Ignoring ΔT silently shifts solar-term
 * boundaries — trivial today (~69 s) but tens of minutes for 19th-century births.
 *
 * Polynomial fits from Espenak & Meeus (NASA), covering our supported range well.
 * Returns ΔT in SECONDS.
 */
export function deltaTSeconds(year: number, month = 6): number {
  const y = year + (month - 0.5) / 12;

  if (year >= 2005 && year <= 2050) {
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  if (year >= 1986 && year < 2005) {
    const t = y - 2000;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t * t +
      0.0017275 * t * t * t +
      0.000651814 * t * t * t * t +
      0.00002373599 * t * t * t * t * t
    );
  }
  if (year >= 1961 && year < 1986) {
    const t = y - 1975;
    return 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718;
  }
  if (year >= 1941 && year < 1961) {
    const t = y - 1950;
    return 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547;
  }
  if (year >= 1920 && year < 1941) {
    const t = y - 1920;
    return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t;
  }
  if (year >= 1900 && year < 1920) {
    const t = y - 1900;
    return (
      -2.79 +
      1.494119 * t -
      0.0598939 * t * t +
      0.0061966 * t * t * t -
      0.000197 * t * t * t * t
    );
  }
  if (year >= 1860 && year < 1900) {
    const t = y - 1860;
    return (
      7.62 +
      0.5737 * t -
      0.251754 * t * t +
      0.01680668 * t * t * t -
      0.0004473624 * t * t * t * t +
      (t * t * t * t * t) / 233174
    );
  }
  if (year >= 2050 && year <= 2150) {
    return -20 + 32 * Math.pow((y - 1820) / 100, 2) - 0.5628 * (2150 - y);
  }
  // Fallback long-term parabola (Morrison & Stephenson).
  const u = (y - 1820) / 100;
  return -20 + 32 * u * u;
}
