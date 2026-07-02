/**
 * Unit tests for the parts the lunar-python reference cannot cover:
 * true-solar-time corrections, historical timezone/DST resolution, the split 자시 day
 * boundary, Ten Gods logic, and dae-un direction/start-age.
 */
import { describe, it, expect } from "vitest";
import { computeSaju } from "../src/index.js";
import { computeTrueSolarTime } from "../src/time/trueSolarTime.js";
import { tenGodOf, computeTenGods } from "../src/analysis.js";
import { STEMS, BRANCHES } from "../src/constants.js";
import type { FourPillars } from "../src/pillars.js";
import { directionFromConvention } from "../src/daeun.js";

describe("true solar time — longitude & equation of time", () => {
  it("applies ~ -32 min longitude correction for Seoul (127°E vs 135° meridian)", () => {
    // Seoul longitude 126.98; the KST meridian is 135. Net longitude effect ≈ (126.98-135)*4 ≈ -32 min.
    const r = computeTrueSolarTime({
      year: 1990, month: 6, day: 15, hour: 12, minute: 0,
      timezone: "Asia/Seoul", longitude: 126.98,
    });
    // Longitude correction alone (relative to the +9h meridian):
    const relToMeridian = r.longitudeCorrectionMinutes - r.utcOffsetMinutes;
    expect(relToMeridian).toBeGreaterThan(-34);
    expect(relToMeridian).toBeLessThan(-30);
    // Equation of Time in June is modest.
    expect(Math.abs(r.equationOfTimeMinutes)).toBeLessThan(5);
  });

  it("keeps the net correction near zero for a UTC+8 birth at 120°E", () => {
    const r = computeTrueSolarTime({
      year: 2000, month: 3, day: 20, hour: 12, minute: 0,
      timezone: "UTC+8", longitude: 120,
    });
    // longitude correction (480) minus offset (480) = 0; only EoT remains.
    expect(Math.abs(r.longitudeCorrectionMinutes - r.utcOffsetMinutes)).toBeLessThan(1e-6);
  });
});

describe("historical timezone / DST resolution", () => {
  it("resolves 1954 Seoul as UTC+8:30 (Rhee-era meridian)", () => {
    const r = computeTrueSolarTime({
      year: 1954, month: 6, day: 1, hour: 12, minute: 0,
      timezone: "Asia/Seoul", longitude: 126.98,
    });
    expect(r.utcOffsetMinutes).toBe(510); // +8:30
  });

  it("resolves modern Seoul as UTC+9", () => {
    const r = computeTrueSolarTime({
      year: 2000, month: 6, day: 1, hour: 12, minute: 0,
      timezone: "Asia/Seoul", longitude: 126.98,
    });
    expect(r.utcOffsetMinutes).toBe(540); // +9:00
  });

  it("detects US Eastern DST for a July birth", () => {
    const r = computeTrueSolarTime({
      year: 1985, month: 7, day: 4, hour: 12, minute: 0,
      timezone: "America/New_York", longitude: -74.0,
    });
    expect(r.isDST).toBe(true);
    expect(r.utcOffsetMinutes).toBe(-240); // EDT = -4h
  });
});

describe("split 자시 (야자시/조자시) day boundary", () => {
  const base = { year: 2024, month: 6, day: 10, timezone: "UTC+8", longitude: 120 } as const;

  it("23:30 (야자시) keeps the current day; 00:30 (조자시) uses the next day", () => {
    const late = computeSaju({ ...base, hour: 23, minute: 30 });
    const early = computeSaju({ ...base, day: 11, hour: 0, minute: 30 });
    // Both are the 子 (Ja) hour...
    expect(late.pillars.hour!.branch.hanja).toBe("子");
    expect(early.pillars.hour!.branch.hanja).toBe("子");
    // ...but the day pillars differ by exactly one (midnight rollover, not 23:00).
    const d1 = late.pillars.day.ganzhiIndex;
    const d2 = early.pillars.day.ganzhiIndex;
    expect((d1 + 1) % 60).toBe(d2);
  });
});

describe("Ten Gods logic", () => {
  const gap = STEMS[0]!; // 甲 Yang Wood — a Day Master
  it("same element+polarity => 비견 (Companion)", () => {
    expect(tenGodOf(gap, STEMS[0]!)).toBe("bigyeon");
  });
  it("same element, opposite polarity => 겁재 (Rival)", () => {
    expect(tenGodOf(gap, STEMS[1]!)).toBe("geopjae"); // 乙 Yin Wood
  });
  it("element I produce, same polarity => 식신 (Output)", () => {
    expect(tenGodOf(gap, STEMS[2]!)).toBe("siksin"); // 丙 Yang Fire
  });
  it("element that controls me, opposite polarity => 정관 (Direct Authority)", () => {
    expect(tenGodOf(gap, STEMS[7]!)).toBe("jeonggwan"); // 辛 Yin Metal
  });
  it("element that produces me, opposite polarity => 정인 (Direct Resource)", () => {
    expect(tenGodOf(gap, STEMS[9]!)).toBe("jeongin"); // 癸 Yin Water
  });
});

describe("branch Ten God is driven by the main qi (정기), stored first", () => {
  // Invariant the selection logic depends on: index 0 of every branch's hidden stems is the
  // 정기 — its element always matches the branch's own element.
  it("stores the main qi first in every branch's hidden stems", () => {
    for (const b of BRANCHES) {
      expect(STEMS[b.hiddenStems[0]!]!.element).toBe(b.element);
    }
  });

  // Regression for the branch-Ten-God bug: it read the LAST hidden stem (residual qi) instead
  // of the FIRST (main qi). Chart: 庚 (Yang Metal) day master over 寅 / 亥 / 子.
  //  - 寅 main qi 甲 => 편재 (was wrongly 편인 from residual 戊)
  //  - 亥 main qi 壬 => 식신 (was wrongly 편재 from residual 甲)
  //  - 子 single hidden 癸 => 상관 (correct either way; included to pin it)
  it("keys 寅/亥/子 off the main qi for a 庚 day master", () => {
    const gyeong = STEMS[6]!; // 庚 Yang Metal
    const cell = (branchIdx: number) => ({ ganzhiIndex: 0, stem: gyeong, branch: BRANCHES[branchIdx]! });
    const pillars: FourPillars = {
      year: cell(2), // 寅
      month: cell(11), // 亥
      day: cell(0), // 子 — Day Master stem is 庚
      hour: cell(2), // 寅
      sajuYear: 0,
      monthOffset: 0,
    };
    const tg = computeTenGods(pillars);
    expect(tg.year.branchMain.info.hangul).toBe("편재"); // 寅
    expect(tg.month.branchMain.info.hangul).toBe("식신"); // 亥
    expect(tg.day.branchMain.info.hangul).toBe("상관"); // 子
    // The residual qi must NOT drive it: 寅's last hidden stem is 戊 => 편인.
    expect(tg.year.branchMain.info.hangul).not.toBe("편인");
  });
});

describe("dae-un direction & inclusivity", () => {
  it("classical mapping: yang year + male => forward; yang year + female => reverse", () => {
    expect(directionFromConvention("yang", "male")).toBe("forward");
    expect(directionFromConvention("yang", "female")).toBe("reverse");
    expect(directionFromConvention("yin", "male")).toBe("reverse");
    expect(directionFromConvention("yin", "female")).toBe("forward");
  });

  it("can compute BOTH directions without requiring a gender", () => {
    const r = computeSaju({
      year: 1990, month: 6, day: 15, hour: 10, minute: 0,
      timezone: "Asia/Seoul", longitude: 126.98,
      daeun: { direction: "both", count: 8 },
    });
    expect(r.daeun?.forward?.pillars).toHaveLength(8);
    expect(r.daeun?.reverse?.pillars).toHaveLength(8);
    expect(r.daeun?.inclusivityNote).toBeTruthy();
    // Forward and reverse first pillars step opposite ways from the month pillar.
    const monthIdx = r.pillars.month.ganzhiIndex;
    expect(r.daeun!.forward!.pillars[0]!.pillar.ganzhiIndex).toBe((monthIdx + 1) % 60);
    expect(r.daeun!.reverse!.pillars[0]!.pillar.ganzhiIndex).toBe((monthIdx + 59) % 60);
    // Start age is a sensible positive number under 10.
    expect(r.daeun!.forward!.startAge).toBeGreaterThan(0);
    expect(r.daeun!.forward!.startAge).toBeLessThan(10);
  });
});

describe("unknown birth time", () => {
  it("omits the hour pillar and warns", () => {
    const r = computeSaju({
      year: 1990, month: 6, day: 15, hour: 0, minute: 0,
      timezone: "Asia/Seoul", longitude: 126.98, hasBirthTime: false,
    });
    expect(r.pillars.hour).toBeNull();
    expect(r.warnings.some((w) => w.includes("Birth time unknown"))).toBe(true);
  });
});
