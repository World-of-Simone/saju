/**
 * Derived chart relations required by the reading spec's "compute the whole chart first" rule:
 *
 *   • 공망 (空亡, gongmang) — the two "empty" branches of the day pillar's 旬 (decade). The reading
 *     locates a void on whichever palace (year/month/day/hour) it lands on and reads it there.
 *   • 신살 (神殺, sinsal) — named stars. We compute ONLY the reliable set the spec keeps: the twelve
 *     십이신살 plus 효신살, 괴강, and 양인. The flattering/scary label-살 are deliberately excluded.
 *   • 삼합/방합/충 (branch relations) — combinations that concentrate an element "past its headcount"
 *     (read as strength on top of the visible count) and clashes that fall between two palaces.
 *
 * The engine SURFACES these as facts; every interpretive call (what a void/clash/star MEANS in this
 * chart) stays with the reading layer. Two conventions worth flagging for Master Kim:
 *   - 십이신살 are computed from the DAY branch (일지) as the reference. Some schools instead read
 *     them from the year branch (년지); we expose the reference used so the choice is explicit.
 *   - 괴강 is checked on the day pillar and reported on any pillar it also appears in.
 */
import { BRANCHES, STEMS } from "./constants.js";
import { tenGodOf } from "./analysis.js";
import type { FourPillars, Pillar } from "./pillars.js";

export type PillarPos = "year" | "month" | "day" | "hour";

/** A branch located on one of the four palaces. */
export interface BranchAt {
  pos: PillarPos;
  branchIndex: number;
  hangul: string;
  hanja: string;
}

function branchAt(pos: PillarPos, p: Pillar): BranchAt {
  return { pos, branchIndex: p.branch.index, hangul: p.branch.hangul, hanja: p.branch.hanja };
}

/** The four palaces present in the chart (hour omitted when the birth time is unknown). */
function palaces(pillars: FourPillars): BranchAt[] {
  const list: BranchAt[] = [
    branchAt("year", pillars.year),
    branchAt("month", pillars.month),
    branchAt("day", pillars.day),
  ];
  if (pillars.hour) list.push(branchAt("hour", pillars.hour));
  return list;
}

const POS_KO: Record<PillarPos, string> = { year: "연주", month: "월주", day: "일주", hour: "시주" };
const POS_EN: Record<PillarPos, string> = { year: "Year", month: "Month", day: "Day", hour: "Hour" };
export { POS_KO, POS_EN };

/* ─────────────────────────────  공망 (空亡)  ───────────────────────────── */

export interface VoidResult {
  /** The two empty branches of the day pillar's decade (旬). */
  branches: { branchIndex: number; hangul: string; hanja: string }[];
  /** Which palaces (if any) fall on a void branch — this is where the reading applies it. */
  hits: BranchAt[];
  hangul: string; // "공망(空亡)"
  note: string;
}

/**
 * 공망 branches of the day pillar. Within a 旬 (a run of 10 sexagenary pairs) two of the twelve
 * branches are left unpaired with a stem — those are the void. From the day stem index s and day
 * branch index b, the pair is ((b - s) + 10) and ((b - s) + 11), mod 12.
 */
export function computeVoid(pillars: FourPillars): VoidResult {
  const s = pillars.day.stem.index;
  const b = pillars.day.branch.index;
  const base = ((b - s) % 12 + 12) % 12;
  const idxs = [(base + 10) % 12, (base + 11) % 12];
  const branches = idxs.map((i) => {
    const br = BRANCHES[i]!;
    return { branchIndex: i, hangul: br.hangul, hanja: br.hanja };
  });
  const hits = palaces(pillars).filter((p) => idxs.includes(p.branchIndex));
  return {
    branches,
    hits,
    hangul: "공망(空亡)",
    note:
      "The two 'empty' branches of the day pillar's decade. A palace that lands on a void reads as " +
      "thinned or hard to hold in that life-area; read it on the position it falls (year/month/day/hour).",
  };
}

/* ─────────────────────────────  삼합/방합/충  ───────────────────────────── */

export type BranchElement = "wood" | "fire" | "earth" | "metal" | "water";

interface Trio {
  members: number[]; // branch indices
  peak: number; // 旺 (peak) branch — the one that must be present for a half-combination
  element: BranchElement;
  hanja: string;
  hangul: string;
}

/** 삼합 (three-harmony) frames — each concentrates one element around its 旺 (peak) branch. */
const SAMHAP: Trio[] = [
  { members: [8, 0, 4], peak: 0, element: "water", hanja: "申子辰", hangul: "신자진" },
  { members: [11, 3, 7], peak: 3, element: "wood", hanja: "亥卯未", hangul: "해묘미" },
  { members: [2, 6, 10], peak: 6, element: "fire", hanja: "寅午戌", hangul: "인오술" },
  { members: [5, 9, 1], peak: 9, element: "metal", hanja: "巳酉丑", hangul: "사유축" },
];

/** 방합 (directional/seasonal) frames — a full season of three adjacent branches. */
const BANGHAP: Trio[] = [
  { members: [2, 3, 4], peak: 3, element: "wood", hanja: "寅卯辰", hangul: "인묘진" },
  { members: [5, 6, 7], peak: 6, element: "fire", hanja: "巳午未", hangul: "사오미" },
  { members: [8, 9, 10], peak: 9, element: "metal", hanja: "申酉戌", hangul: "신유술" },
  { members: [11, 0, 1], peak: 0, element: "water", hanja: "亥子丑", hangul: "해자축" },
];

export interface Combination {
  kind: "samhap" | "banghap";
  /** "full" = all three branches present; "half" = the peak + one other (반합). */
  degree: "full" | "half";
  element: BranchElement;
  hanja: string;
  hangul: string;
  /** The palaces taking part. */
  at: BranchAt[];
  note: string;
}

function detectCombos(pillars: FourPillars, trios: Trio[], kind: "samhap" | "banghap"): Combination[] {
  const ps = palaces(pillars);
  const present = new Set(ps.map((p) => p.branchIndex));
  const out: Combination[] = [];
  for (const t of trios) {
    const have = t.members.filter((m) => present.has(m));
    const at = ps.filter((p) => t.members.includes(p.branchIndex));
    if (have.length === 3) {
      out.push(combo(kind, "full", t, at));
    } else if (have.length === 2 && have.includes(t.peak)) {
      out.push(combo(kind, "half", t, at));
    }
  }
  return out;
}

function combo(
  kind: "samhap" | "banghap",
  degree: "full" | "half",
  t: Trio,
  at: BranchAt[],
): Combination {
  const kindKo = kind === "samhap" ? "삼합" : "방합";
  const note =
    degree === "full"
      ? `A full ${kindKo} (${t.hanja}) — the branches lock into a ${t.element} frame, so ${t.element} reads as strong here regardless of its raw headcount.`
      : `A half ${kindKo} (반합, ${t.hanja}) anchored on the ${BRANCHES[t.peak]!.hanja} peak — a real but weaker pull toward ${t.element}.`;
  return { kind, degree, element: t.element, hanja: t.hanja, hangul: t.hangul, at, note };
}

export interface Clash {
  a: BranchAt;
  b: BranchAt;
  hanja: string; // e.g. "子午"
  hangul: string;
  note: string;
}

/** 충 (clash): the six opposing branch pairs (index differs by 6). */
export function computeClashes(pillars: FourPillars): Clash[] {
  const ps = palaces(pillars);
  const out: Clash[] = [];
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      if ((Math.abs(ps[i]!.branchIndex - ps[j]!.branchIndex) % 12) === 6) {
        out.push({
          a: ps[i]!,
          b: ps[j]!,
          hanja: `${ps[i]!.hanja}${ps[j]!.hanja}`,
          hangul: `${ps[i]!.hangul}${ps[j]!.hangul}`,
          note:
            `A ${POS_EN[ps[i]!.pos]}–${POS_EN[ps[j]!.pos]} clash — read it between those two palaces ` +
            `(e.g. a day-branch clash falls on the marriage palace).`,
        });
      }
    }
  }
  return out;
}

export interface BranchRelations {
  combinations: Combination[]; // 삼합 + 방합, full and half
  clashes: Clash[]; // 충
}

export function computeBranchRelations(pillars: FourPillars): BranchRelations {
  return {
    combinations: [
      ...detectCombos(pillars, SAMHAP, "samhap"),
      ...detectCombos(pillars, BANGHAP, "banghap"),
    ],
    clashes: computeClashes(pillars),
  };
}

/* ─────────────────────────────  신살 (神殺)  ───────────────────────────── */

/** The twelve 십이신살, indexed by offset from the reference group's 生地 (birth) branch. */
const TWELVE_SINSAL: { hangul: string; hanja: string; en: string; note: string }[] = [
  { hangul: "지살", hanja: "地殺", en: "Movement (earth star)", note: "Movement, relocation, self-driven change." },
  { hangul: "년살", hanja: "年殺", en: "Peach Blossom (도화)", note: "도화 — magnetism; people take to them and want to help." },
  { hangul: "월살", hanja: "月殺", en: "Moon star", note: "Depletion, dryness; things that don't quite fill up." },
  { hangul: "망신살", hanja: "亡身殺", en: "Exposure star", note: "Private matters coming to light; loss of face if careless." },
  { hangul: "장성살", hanja: "將星殺", en: "General Star", note: "Natural authority, command, fortunes rising." },
  { hangul: "반안살", hanja: "攀鞍殺", en: "Saddle star", note: "Promotion, honors, a comfortable seat; support from above." },
  { hangul: "역마살", hanja: "驛馬殺", en: "Traveling Horse (역마)", note: "Lives far from birthplace, movement, going abroad; the work that travels is the work that succeeds." },
  { hangul: "육해살", hanja: "六害殺", en: "Six-harm star", note: "Chronic small frictions, illness or obligation that nags." },
  { hangul: "화개살", hanja: "華蓋殺", en: "Canopy Star (화개)", note: "Art, depth, solitude, absorption; an old-soul quality." },
  { hangul: "겁살", hanja: "劫殺", en: "Robbery star", note: "Sudden loss or being taken from; guard against overreach." },
  { hangul: "재살", hanja: "災殺", en: "Calamity star (수옥)", note: "Confinement, legal snares, being caught up in others' trouble." },
  { hangul: "천살", hanja: "天殺", en: "Heaven star", note: "What is outside one's control; sky-sent, not self-caused." },
];

/** 生地 (birth branch) of the 삼합 group a branch belongs to, indexed by branch % 4. */
const BIRTH_BRANCH_BY_MOD4 = [8, 5, 2, 11]; // 申, 巳, 寅, 亥

export interface SinsalHit {
  hangul: string;
  hanja: string;
  en: string;
  note: string;
  /** The palace carrying the star. */
  at: BranchAt;
}

/** 괴강 sexagenary pairs (60-cycle indices): 庚辰, 庚戌, 壬辰, 戊戌. */
const GWAEGANG = new Set([16, 46, 28, 34]);

/** 양인 branch for each YANG day master (yin day masters have no 양인). */
const YANGIN_BRANCH: Record<number, number> = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 }; // 甲→卯 丙→午 戊→午 庚→酉 壬→子

export interface SinsalResult {
  /** Reference branch the 십이신살 were read from (day branch). */
  reference: { pos: PillarPos; hangul: string; hanja: string };
  /** Twelve-star hits present in the chart, located on their palace. */
  twelve: SinsalHit[];
  /** 효신살 — day master sits on 편인 (indirect resource): disturbed sleep, night-owl, works late. */
  hyosin: SinsalHit[];
  /** 괴강 — a very strong-willed pillar; an engine that pulls the person forward. */
  gwaegang: { pos: PillarPos; hangul: string; hanja: string; note: string }[];
  /** 양인 — mind the body; accident or health caution. */
  yangin: SinsalHit[];
}

export function computeSinsal(pillars: FourPillars): SinsalResult {
  const ps = palaces(pillars);
  const dm = pillars.day.stem;

  // 십이신살, read from the day branch's 삼합 group.
  const refBranch = pillars.day.branch.index;
  const birth = BIRTH_BRANCH_BY_MOD4[refBranch % 4]!;
  const twelve: SinsalHit[] = [];
  for (const p of ps) {
    const offset = ((p.branchIndex - birth) % 12 + 12) % 12;
    const star = TWELVE_SINSAL[offset]!;
    twelve.push({ ...star, at: p });
  }

  // 효신살 — any palace whose branch main-qi is 편인 relative to the day master.
  const hyosin: SinsalHit[] = [];
  for (const p of pillarsList(pillars)) {
    const mainStem = STEMS[p.branch.hiddenStems[0]!]!;
    if (tenGodOf(dm, mainStem) === "pyeonin") {
      hyosin.push({
        hangul: "효신살", hanja: "梟神殺", en: "Owl star (올빼미살)",
        note: "Sits on 편인 (indirect resource): disturbed sleep, sharper at night, works late.",
        at: branchAt(posOf(pillars, p), p),
      });
    }
  }

  // 괴강 — any pillar whose 60-cycle index is a 괴강 pair.
  const gwaegang = pillarsList(pillars)
    .filter((p) => GWAEGANG.has(p.ganzhiIndex))
    .map((p) => ({
      pos: posOf(pillars, p),
      hangul: "괴강(魁罡)",
      hanja: `${p.stem.hanja}${p.branch.hanja}`,
      note: "Very strong will, an engine that pulls the person forward.",
    }));

  // 양인 — chart branches equal to the yang day master's 양인 branch.
  const yangin: SinsalHit[] = [];
  const yanginBranch = YANGIN_BRANCH[dm.index];
  if (yanginBranch != null) {
    for (const p of ps) {
      if (p.branchIndex === yanginBranch) {
        yangin.push({
          hangul: "양인(陽刃)", hanja: "陽刃", en: "Yang Blade",
          note: "Mind the body; accident or health caution. Also raw drive that must be channeled.",
          at: p,
        });
      }
    }
  }

  return {
    reference: {
      pos: "day",
      hangul: pillars.day.branch.hangul,
      hanja: pillars.day.branch.hanja,
    },
    twelve,
    hyosin,
    gwaegang,
    yangin,
  };
}

/* helpers for iterating pillars with their position label */
function pillarsList(pillars: FourPillars): Pillar[] {
  const list = [pillars.year, pillars.month, pillars.day];
  if (pillars.hour) list.push(pillars.hour);
  return list;
}
function posOf(pillars: FourPillars, p: Pillar): PillarPos {
  if (p === pillars.year) return "year";
  if (p === pillars.month) return "month";
  if (p === pillars.day) return "day";
  return "hour";
}

export interface RelationsResult {
  void: VoidResult;
  sinsal: SinsalResult;
  branchRelations: BranchRelations;
}

export function computeRelations(pillars: FourPillars): RelationsResult {
  return {
    void: computeVoid(pillars),
    sinsal: computeSinsal(pillars),
    branchRelations: computeBranchRelations(pillars),
  };
}
