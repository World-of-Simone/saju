/**
 * Unit tests for 공망 (void), 신살 (the reliable stars only), and 삼합/방합/충 (branch relations).
 * Cases are hand-derived from the classical tables.
 */
import { describe, it, expect } from "vitest";
import { STEMS, BRANCHES } from "../src/constants.js";
import type { FourPillars, Pillar } from "../src/pillars.js";
import {
  computeVoid,
  computeSinsal,
  computeBranchRelations,
  computeClashes,
} from "../src/relations.js";

/** Build a Pillar from stem/branch indices (they must share parity to be a real 60-cycle pair). */
function mkPillar(stemIndex: number, branchIndex: number): Pillar {
  const s = ((stemIndex % 10) + 10) % 10;
  const b = ((branchIndex % 12) + 12) % 12;
  let ganzhiIndex = -1;
  for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) { ganzhiIndex = i; break; }
  if (ganzhiIndex < 0) throw new Error(`invalid pair stem ${s} branch ${b}`);
  return { ganzhiIndex, stem: STEMS[s]!, branch: BRANCHES[b]! };
}

/** Assemble a FourPillars from [stem,branch] pairs; hour optional. */
function mkChart(
  year: [number, number],
  month: [number, number],
  day: [number, number],
  hour?: [number, number],
): FourPillars {
  return {
    year: mkPillar(...year),
    month: mkPillar(...month),
    day: mkPillar(...day),
    hour: hour ? mkPillar(...hour) : null,
    sajuYear: 2000,
    monthOffset: 0,
  };
}

describe("공망 (void)", () => {
  it("gives 戌亥 for a 甲子 day (the 甲子 decade)", () => {
    const chart = mkChart([0, 0], [0, 0], [0, 0]); // day 甲子
    const v = computeVoid(chart);
    expect(v.branches.map((b) => b.hanja).sort()).toEqual(["亥", "戌"]);
  });

  it("gives 申酉 for a 庚辰 day (the 甲戌 decade) and locates a hit on a palace", () => {
    // day 庚辰 (6,4); put 申 on the year palace so the void lands there.
    const chart = mkChart([0, 8], [1, 3], [6, 4]); // year 甲申, month 乙卯, day 庚辰
    const v = computeVoid(chart);
    expect(v.branches.map((b) => b.hanja).sort()).toEqual(["申", "酉"]);
    expect(v.hits.map((h) => h.pos)).toEqual(["year"]);
  });
});

describe("십이신살 (from the day branch)", () => {
  it("maps palaces off the DAY branch's 삼합 group (day 戌 → fire group 寅午戌, 生地 寅)", () => {
    // day 戌 → fire group 寅午戌, 生地 寅. 午=장성, 申=역마, 戌=화개, 卯=년살(도화).
    const chart = mkChart([0, 6], [0, 8], [0, 10], [1, 3]); // 甲午 甲申 甲戌 乙卯
    const s = computeSinsal(chart);
    expect(s.reference.pos).toBe("day");
    const byPos = Object.fromEntries(s.twelve.map((t) => [t.at.pos, t.hangul]));
    expect(byPos.year).toBe("장성살");
    expect(byPos.month).toBe("역마살");
    expect(byPos.day).toBe("화개살");
    expect(byPos.hour).toBe("년살");
  });

  it("anchors on the DAY branch, not the year branch (丙寅/庚寅/庚子/丁亥)", () => {
    // day master 庚, day branch 子 → 申子辰 group. Chart branches 寅 寅 子 亥.
    // 子=장성살, 寅=역마살, 亥=망신살. (Under a year-branch anchor on 寅 it would be neither.)
    const chart = mkChart([2, 2], [6, 2], [6, 0], [3, 11]); // 丙寅 庚寅 庚子 丁亥
    const s = computeSinsal(chart);
    expect(s.reference.pos).toBe("day");
    const byPos = Object.fromEntries(s.twelve.map((t) => [t.at.pos, t.hangul]));
    expect(byPos.day).toBe("장성살"); // 子
    expect(byPos.year).toBe("역마살"); // 寅
    expect(byPos.month).toBe("역마살"); // 寅
    expect(byPos.hour).toBe("망신살"); // 亥
  });
});

describe("효신살 · 괴강 · 양인", () => {
  it("flags 庚辰 day as both 효신살 (sits on 편인) and 괴강", () => {
    const chart = mkChart([0, 0], [1, 3], [6, 4]); // day 庚辰
    const s = computeSinsal(chart);
    expect(s.hyosin.some((h) => h.at.pos === "day")).toBe(true);
    expect(s.gwaegang.some((g) => g.pos === "day")).toBe(true);
  });

  it("flags 양인 for a 庚 day master with a 酉 branch, and none for a yin day master", () => {
    const withYangin = mkChart([1, 9], [1, 3], [6, 4]); // year 乙酉, day 庚辰 → 酉 is 庚's 양인
    expect(computeSinsal(withYangin).yangin.length).toBeGreaterThan(0);

    const yinDay = mkChart([1, 9], [1, 3], [7, 3]); // day 辛卯 (yin master) → no 양인
    expect(computeSinsal(yinDay).yangin.length).toBe(0);
  });
});

describe("삼합 / 방합 / 충", () => {
  it("detects a full 申子辰 water 삼합", () => {
    const chart = mkChart([0, 8], [0, 0], [0, 4]); // 甲申 甲子 甲辰
    const combos = computeBranchRelations(chart).combinations;
    const full = combos.find((c) => c.kind === "samhap" && c.degree === "full");
    expect(full?.element).toBe("water");
    expect(full?.hanja).toBe("申子辰");
  });

  it("detects a 반합 (half 삼합) when the peak plus one member are present", () => {
    // 卯 (peak of 亥卯未) + 亥, no 未 → half wood.
    const chart = mkChart([1, 11], [1, 3], [0, 0]); // 乙亥 乙卯 甲子
    const combos = computeBranchRelations(chart).combinations;
    const half = combos.find((c) => c.kind === "samhap" && c.degree === "half");
    expect(half?.element).toBe("wood");
  });

  it("detects a full 巳午未 fire 방합", () => {
    const chart = mkChart([1, 5], [0, 6], [1, 7]); // 乙巳 甲午 乙未
    const combos = computeBranchRelations(chart).combinations;
    const bang = combos.find((c) => c.kind === "banghap" && c.degree === "full");
    expect(bang?.element).toBe("fire");
    expect(bang?.hanja).toBe("巳午未");
  });

  it("detects a 子午 clash between two palaces", () => {
    const chart = mkChart([0, 0], [1, 3], [0, 6]); // year 子, day 午
    const clashes = computeClashes(chart);
    expect(clashes.length).toBe(1);
    expect(clashes[0]!.hanja).toBe("子午");
    expect([clashes[0]!.a.pos, clashes[0]!.b.pos].sort()).toEqual(["day", "year"]);
  });
});
