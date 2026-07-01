/**
 * Demo: print a full Saju chart. Run after `npm run build` with:
 *   node --experimental-strip-types examples/demo.ts
 * (or import { computeSaju } from "saju-engine" in your own app).
 */
import { computeSaju, ELEMENT_EN } from "../dist/index.js";

const result = computeSaju({
  year: 1988,
  month: 9,
  day: 17,
  hour: 14,
  minute: 20,
  timezone: "Asia/Seoul",
  longitude: 126.98, // Seoul
  daeun: { direction: "both", count: 8 },
});

const p = result.pillars;
const gz = (pil: { stem: { hanja: string; hangul: string }; branch: { hanja: string; hangul: string } } | null) =>
  pil ? `${pil.stem.hanja}${pil.branch.hanja} (${pil.stem.hangul}${pil.branch.hangul})` : "—";

console.log("=== 사주 / Saju — Four Pillars ===");
console.log(`Hour : ${gz(p.hour)}`);
console.log(`Day  : ${gz(p.day)}   ← 일간/Day Master: ${p.day.stem.hangul}(${p.day.stem.hanja}) ${ELEMENT_EN[p.day.stem.element]} ${p.day.stem.polarity}`);
console.log(`Month: ${gz(p.month)}`);
console.log(`Year : ${gz(p.year)}   (Saju year ${p.sajuYear})`);

console.log("\n=== 진태양시 / True Solar Time ===");
const t = result.trueSolarTime;
console.log(`UTC offset applied : ${t.utcOffsetMinutes} min (DST: ${t.isDST})`);
console.log(`Longitude correction: ${t.longitudeCorrectionMinutes.toFixed(1)} min`);
console.log(`Equation of Time    : ${t.equationOfTimeMinutes.toFixed(1)} min`);
console.log(`True solar clock    : ${t.trueSolar.hour}:${String(t.trueSolar.minute).padStart(2, "0")}`);

console.log("\n=== 오행 / Five Elements (weighted, incl. hidden stems) ===");
console.log(result.elements.weighted, `| strongest: ${result.elements.strongest}, weakest: ${result.elements.weakest}`);
if (result.elements.missing.length) console.log(`Missing (visible): ${result.elements.missing.join(", ")}`);

console.log("\n=== 십성 / Ten Gods ===");
console.log(`Year stem : ${result.tenGods.year.stem?.info.hangul} (${result.tenGods.year.stem?.info.en})`);
console.log(`Month stem: ${result.tenGods.month.stem?.info.hangul} (${result.tenGods.month.stem?.info.en})`);
console.log(`Hour stem : ${result.tenGods.hour?.stem?.info.hangul} (${result.tenGods.hour?.stem?.info.en})`);

console.log("\n=== 대운 / Luck Pillars (both directions) ===");
console.log(`Start age ≈ ${result.daeun?.forward?.startAge.toFixed(1)} yrs`);
const fmt = (d?: { pillars: { startAge: number; pillar: { stem: { hanja: string }; branch: { hanja: string } } }[] }) =>
  d?.pillars.map((x) => `${Math.round(x.startAge)}:${x.pillar.stem.hanja}${x.pillar.branch.hanja}`).join("  ");
console.log(`forward: ${fmt(result.daeun?.forward)}`);
console.log(`reverse: ${fmt(result.daeun?.reverse)}`);

if (result.warnings.length) {
  console.log("\n=== ⚠ Warnings ===");
  result.warnings.forEach((w) => console.log("- " + w));
}
