/**
 * Validate the engine end-to-end against lunar-python reference data.
 *
 * Strategy: drive the REAL engine with a fixed UTC+8 offset and longitude 120°E, so the
 * longitude correction exactly cancels the zone offset and the only residual is the
 * Equation of Time (±16 min). All reference datetimes are chosen mid-shichen and mid-month,
 * so that residual cannot flip a pillar. This exercises the whole pipeline (TST → pillars)
 * against an independent implementation.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeSaju } from "../src/index.js";
import { dayPillar } from "../src/pillars.js";
import { ipchunJD } from "../src/astro/solarTerms.js";
import { calendarFromJulianDate } from "../src/astro/julian.js";

const here = dirname(fileURLToPath(import.meta.url));
const ref = JSON.parse(readFileSync(join(here, "reference", "lunar_python.json"), "utf-8")) as {
  cases: { y: number; m: number; d: number; h: number; mi: number; year: string; month: string; day: string; time: string }[];
  dayCases: { y: number; m: number; d: number; dayGZ: string }[];
  ipchun: { y: number; iso: string }[];
};

function gz(p: { stem: { hanja: string }; branch: { hanja: string } }): string {
  return p.stem.hanja + p.branch.hanja;
}

// QUARANTINED (Phase 1): this comparison was built around the old true-solar/UTC+8 path
// (timezone UTC+8 + longitude 120 so the longitude correction cancels the offset). Under
// Master Kim's method the engine ignores timezone/longitude/true-solar and reads the raw
// clock in the KST 만세력 frame, so a lunar-python cross-check is no longer the right oracle.
// Spec §9 is explicit that the AI-generated lunar_python.json must NOT be trusted and is to
// be replaced with practitioner-corrected reference charts (Simone, Julie, Sam, Carter, 현준)
// in Phase 5. Re-enable with those fixtures then.
describe.skip("four pillars vs lunar-python (superseded by practitioner fixtures — Phase 5)", () => {
  for (const c of ref.cases) {
    it(`${c.y}-${c.m}-${c.d} ${c.h}:00 -> ${c.year} ${c.month} ${c.day} ${c.time}`, () => {
      const r = computeSaju({
        year: c.y, month: c.m, day: c.d, hour: c.h, minute: c.mi,
        timezone: "UTC+8", longitude: 120,
      });
      expect(gz(r.pillars.year)).toBe(c.year);
      expect(gz(r.pillars.month)).toBe(c.month);
      expect(gz(r.pillars.day)).toBe(c.day);
      expect(gz(r.pillars.hour!)).toBe(c.time);
    });
  }
});

describe("day pillar calibration (noon)", () => {
  for (const c of ref.dayCases) {
    it(`${c.y}-${c.m}-${c.d} -> ${c.dayGZ}`, () => {
      expect(gz(dayPillar(c.y, c.m, c.d))).toBe(c.dayGZ);
    });
  }
});

// With the truncated VSOP87 series, apparent solar longitude is accurate to sub-arcminute,
// so our solar-term instants agree with lunar-python's to ~2 min (the residual is mostly
// lunar-python's own approximation, not ours).
describe("Ipchun solar-term time vs lunar-python (within 2 min)", () => {
  for (const ip of ref.ipchun) {
    it(`${ip.y} Ipchun ≈ ${ip.iso}`, () => {
      // lunar-python reports Ipchun in UTC+8 wall clock. Convert our UT-based JD to UTC+8.
      const cal = calendarFromJulianDate(ipchunJD(ip.y) + 8 / 24);
      const mine = Date.UTC(cal.year, cal.month - 1, cal.day, cal.hour, cal.minute, cal.second);
      const theirs = Date.parse(ip.iso + "Z");
      const diffMin = Math.abs(mine - theirs) / 60000;
      expect(diffMin).toBeLessThan(2);
    });
  }
});
