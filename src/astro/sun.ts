/**
 * Apparent solar position and the Equation of Time.
 *
 * Apparent ecliptic longitude is computed from the truncated VSOP87 Earth series (see
 * vsop87.ts), then corrected to the FK5 frame and for nutation and aberration (Meeus ch. 25).
 * This yields sub-arcminute longitude, so solar-term instants are accurate to seconds.
 */
import { norm360, toRad, toDeg } from "./julian.js";
import { earthLongitudeRad, earthRadiusAU } from "./vsop87.js";

export interface SolarPosition {
  /** Apparent geocentric ecliptic longitude of the Sun, degrees [0,360). */
  apparentLongitude: number;
  /** Apparent right ascension, degrees [0,360). */
  rightAscension: number;
  /** Sun's mean longitude L0, degrees (used for the Equation of Time). */
  meanLongitude: number;
  /** Nutation in longitude Δψ, degrees. */
  nutationLongitude: number;
  /** Apparent obliquity of the ecliptic, degrees. */
  obliquity: number;
  /** Earth–Sun distance, AU. */
  radiusAU: number;
}

const ARCSEC = 1 / 3600;

/** Abbreviated nutation (Meeus ch. 22): returns {dpsi, deps} in degrees. */
function nutation(T: number): { dpsi: number; deps: number } {
  const omega = toRad(125.04452 - 1934.136261 * T);
  const Ls = toRad(280.4665 + 36000.7698 * T);
  const Lm = toRad(218.3165 + 481267.8813 * T);
  const dpsi =
    (-17.2 * Math.sin(omega) -
      1.32 * Math.sin(2 * Ls) -
      0.23 * Math.sin(2 * Lm) +
      0.21 * Math.sin(2 * omega)) *
    ARCSEC;
  const deps =
    (9.2 * Math.cos(omega) +
      0.57 * Math.cos(2 * Ls) +
      0.1 * Math.cos(2 * Lm) -
      0.09 * Math.cos(2 * omega)) *
    ARCSEC;
  return { dpsi, deps };
}

/** Compute apparent solar position from a Julian Ephemeris Date (JD in TT). */
export function solarPosition(jde: number): SolarPosition {
  const T = (jde - 2451545.0) / 36525.0;
  const tau = T / 10; // Julian millennia

  // Earth heliocentric longitude -> Sun geocentric geometric longitude.
  const Learth = toDeg(earthLongitudeRad(tau));
  const R = earthRadiusAU(tau);
  let theta = norm360(Learth + 180);

  // FK5 frame correction (constant longitude term; the T-dependent part cancels for λ).
  theta = theta - 0.09033 * ARCSEC;

  // Nutation and aberration.
  const { dpsi, deps } = nutation(T);
  const aberration = (-20.4898 * ARCSEC) / R;
  const apparentLongitude = norm360(theta + dpsi + aberration);

  // Mean longitude (for the Equation of Time) and apparent obliquity.
  const meanLongitude = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const eps0 = 23.439291 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
  const obliquity = eps0 + deps;

  // Apparent right ascension.
  const lamRad = toRad(apparentLongitude);
  const epsRad = toRad(obliquity);
  const rightAscension = norm360(
    toDeg(Math.atan2(Math.cos(epsRad) * Math.sin(lamRad), Math.cos(lamRad)))
  );

  return {
    apparentLongitude,
    rightAscension,
    meanLongitude,
    nutationLongitude: dpsi,
    obliquity,
    radiusAU: R,
  };
}

/** Apparent geocentric ecliptic longitude of the Sun, degrees [0,360). */
export function solarLongitude(jde: number): number {
  return solarPosition(jde).apparentLongitude;
}

/**
 * Equation of Time in MINUTES (apparent solar time − mean solar time), Meeus 28.3.
 * Positive means a sundial reads ahead of mean/clock time.
 */
export function equationOfTimeMinutes(jde: number): number {
  const p = solarPosition(jde);
  const epsRad = toRad(p.obliquity);
  let eDeg =
    p.meanLongitude - 0.0057183 - p.rightAscension + p.nutationLongitude * Math.cos(epsRad);
  // Reduce to [-180,180] to avoid the 360° wrap near the RA/L0 boundary.
  eDeg = ((eDeg + 180) % 360 + 360) % 360 - 180;
  return eDeg * 4;
}
