/**
 * Teaching-forward web UI for the Saju engine. Imports the compiled engine from ../dist so
 * Vite never has to resolve the engine's NodeNext ".js" specifiers against ".ts" sources.
 */
import {
  computeSaju,
  GLOSSARY,
  ELEMENT_EN,
  type SajuResult,
  type Element,
} from "../dist/index.js";
import type { Pillar } from "../dist/pillars.js";
import type { PillarTenGods, TenGodLabel } from "../dist/analysis.js";
import type { DaeunResult } from "../dist/daeun.js";
import { CITIES, type City } from "./cities";

// ---------- tiny DOM helpers ----------
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const el = (tag: string, cls?: string, html?: string) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

const elClass = (e: Element) => `el-${e}`;
const fmt = (n: number, digits = 1) => (n >= 0 ? "+" : "") + n.toFixed(digits);

/** Wrap a phrase in a teaching tooltip trigger keyed to a glossary entry. */
function term(text: string, key: string): string {
  return `<span class="term" data-term="${key}">${esc(text)}</span>`;
}

// ---------- city autocomplete ----------
const cityInput = $<HTMLInputElement>("#city-input");
const sugBox = $<HTMLUListElement>("#city-suggestions");
const lonInput = $<HTMLInputElement>("#longitude");
const tzInput = $<HTMLInputElement>("#timezone");
let activeIdx = -1;
let matches: City[] = [];

function applyCity(c: City) {
  cityInput.value = `${c.name}, ${c.country}`;
  lonInput.value = String(c.lon);
  tzInput.value = c.tz;
}

function renderSuggestions() {
  sugBox.innerHTML = "";
  if (matches.length === 0) {
    sugBox.hidden = true;
    return;
  }
  matches.forEach((c, i) => {
    const li = el("li", i === activeIdx ? "active" : "");
    li.innerHTML = `<span>${esc(c.name)}</span><span class="country">${esc(c.country)}</span>`;
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      applyCity(c);
      sugBox.hidden = true;
    });
    sugBox.appendChild(li);
  });
  sugBox.hidden = false;
}

cityInput.addEventListener("input", () => {
  const q = cityInput.value.trim().toLowerCase();
  activeIdx = -1;
  if (q.length < 1) {
    matches = [];
    renderSuggestions();
    return;
  }
  matches = CITIES.filter(
    (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
  ).slice(0, 8);
  renderSuggestions();
});

cityInput.addEventListener("keydown", (e) => {
  if (sugBox.hidden) return;
  if (e.key === "ArrowDown") { activeIdx = Math.min(activeIdx + 1, matches.length - 1); renderSuggestions(); e.preventDefault(); }
  else if (e.key === "ArrowUp") { activeIdx = Math.max(activeIdx - 1, 0); renderSuggestions(); e.preventDefault(); }
  else if (e.key === "Enter" && activeIdx >= 0) { applyCity(matches[activeIdx]!); sugBox.hidden = true; e.preventDefault(); }
  else if (e.key === "Escape") { sugBox.hidden = true; }
});
cityInput.addEventListener("blur", () => setTimeout(() => (sugBox.hidden = true), 120));

// ---------- tooltip ----------
const tooltip = $("#tooltip");
function showTip(target: HTMLElement) {
  const key = target.dataset.term!;
  const g = GLOSSARY[key];
  if (!g) return;
  tooltip.innerHTML = `<div class="tt-title">${esc(g.en)}<span class="tt-ko">${esc(g.hangul)} ${esc(g.hanja)}</span></div>${esc(g.explain)}`;
  tooltip.hidden = false;
  const r = target.getBoundingClientRect();
  const tr = tooltip.getBoundingClientRect();
  let left = r.left + r.width / 2 - tr.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tr.width - 8));
  let top = r.top - tr.height - 8;
  if (top < 8) top = r.bottom + 8;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}
document.addEventListener("mouseover", (e) => {
  const t = (e.target as HTMLElement).closest(".term") as HTMLElement | null;
  if (t) showTip(t);
});
document.addEventListener("mouseout", (e) => {
  if ((e.target as HTMLElement).closest(".term")) tooltip.hidden = true;
});

// ---------- unknown-time toggle ----------
const unknownTime = $<HTMLInputElement>("#unknown-time");
const timeInput = $<HTMLInputElement>("#birthtime");
unknownTime.addEventListener("change", () => {
  timeInput.disabled = unknownTime.checked;
  timeInput.style.opacity = unknownTime.checked ? "0.5" : "1";
});

// ---------- rendering ----------
function stemBlock(p: Pillar, tg: TenGodLabel | null, isDayMaster: boolean): string {
  const s = p.stem;
  const god = isDayMaster
    ? `<div class="tengod">${term("일간 · Day Master", "ilgan")}</div>`
    : `<div class="tengod">${tg ? term(`${tg.info.hangul} · ${tg.info.en}`, "sipseong") : ""}</div>`;
  return `<div class="char stem">
    <span class="hanja ${elClass(s.element)}">${s.hanja}</span>
    <div class="reading">${s.hangul} · ${s.roman}</div>
    ${god}
  </div>`;
}

function branchBlock(p: Pillar, tg: PillarTenGods): string {
  const b = p.branch;
  const hidden = tg.hidden
    .map((h) => `<span class="hs">${h.info.hangul}</span>`)
    .join(" ");
  return `<div class="char branch">
    <span class="hanja ${elClass(b.element)}">${b.hanja}</span>
    <div class="reading">${b.hangul} · ${b.roman}</div>
    <div class="animal">${b.animalEn}</div>
    <div class="tengod">${term(`${tg.branchMain.info.hangul} · ${tg.branchMain.info.en}`, "sipseong")}</div>
  </div>
  <div class="hidden-stems">${term("지장간", "jijanggan")}: ${hidden}</div>`;
}

function pillarCard(label: string, ko: string, p: Pillar, tg: PillarTenGods, isDay: boolean): string {
  return `<div class="pillar${isDay ? " day-master" : ""}">
    <div class="pillar-head">${label}<br /><span style="font-weight:400">${ko}</span>${isDay ? '<span class="badge">Day Master</span>' : ""}</div>
    ${stemBlock(p, tg.stem, isDay)}
    ${branchBlock(p, tg)}
  </div>`;
}

function renderPillars(r: SajuResult): string {
  const P = r.pillars, T = r.tenGods;
  // Hour pillar may be absent (unknown birth time) — build it only when present.
  const hourCard =
    P.hour && T.hour
      ? pillarCard("Hour", "시주", P.hour, T.hour, false)
      : `<div class="pillar"><div class="pillar-head">Hour<br /><span style="font-weight:400">시주</span></div><div class="char" style="padding:1.5rem 0.5rem;color:var(--ink-soft);font-size:0.8rem">Birth time<br/>unknown</div></div>`;
  const dayCard = pillarCard("Day", "일주", P.day, T.day, true);
  const monthCard = pillarCard("Month", "월주", P.month, T.month, false);
  const yearCard = pillarCard("Year", "연주", P.year, T.year, false);
  return `<section class="card result-section">
    <h3>Four Pillars <span class="ko">${term("사주 · Saju", "saju")}</span></h3>
    <div class="pillars">${hourCard}${dayCard}${monthCard}${yearCard}</div>
    <p class="el-note">Read right→left (Year → Hour). The highlighted <b>Day Master</b> (${term("일간", "ilgan")}) is “you”; every ${term("Ten God", "sipseong")} label describes how that character relates to you.</p>
  </section>`;
}

function renderTST(r: SajuResult): string {
  const t = r.trueSolarTime;
  const ts = t.trueSolar;
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${ts.year}-${pad(ts.month)}-${pad(ts.day)} ${pad(ts.hour)}:${pad(ts.minute)}`;
  const row = (k: string, v: string) => `<div class="tst-item"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  return `<section class="card result-section">
    <h3>${term("True Solar Time", "jintaeyangsi")} <span class="ko">진태양시</span></h3>
    <div class="tst-grid">
      ${row("UTC offset applied", fmt(t.utcOffsetMinutes / 60, 2) + " h" + (t.isDST ? " (DST)" : ""))}
      ${row("Longitude correction", fmt(t.longitudeCorrectionMinutes) + " min")}
      ${row("Equation of Time", fmt(t.equationOfTimeMinutes) + " min")}
      ${row("Net shift vs clock", fmt(t.totalCorrectionMinutes) + " min")}
      <div class="tst-highlight"><span>True solar birth moment</span><span>${clock}</span></div>
    </div>
    <p class="el-note">Your pillars are computed from this corrected moment — the Sun's real position at your birthplace, not the wall clock.</p>
  </section>`;
}

function renderElements(r: SajuResult): string {
  const e = r.elements;
  const order: Element[] = ["wood", "fire", "earth", "metal", "water"];
  const max = Math.max(...order.map((k) => e.weighted[k]), 1);
  const bars = order
    .map((k) => {
      const w = e.weighted[k];
      const pct = (w / max) * 100;
      return `<div class="el-bar">
        <span><span class="dot bg-${k}"></span>${ELEMENT_EN[k]}</span>
        <span class="track"><span class="fill bg-${k}" style="width:${pct}%"></span></span>
        <span class="v ${elClass(k)}" style="text-align:right">${w}</span>
      </div>`;
    })
    .join("");
  const missing =
    e.missing.length > 0
      ? `<p class="el-note">Missing (not visible in the eight characters): <b>${e.missing.map((m) => ELEMENT_EN[m]).join(", ")}</b>. A missing element is often the most telling part of a reading.</p>`
      : `<p class="el-note">All five elements are represented.</p>`;
  return `<section class="card result-section">
    <h3>Five Elements <span class="ko">${term("오행 · Ohaeng", "ohaeng")}</span></h3>
    <div class="el-bars">${bars}</div>
    <p class="el-note">Weighted count includes ${term("hidden stems", "jijanggan")}. Strongest: <b class="${elClass(e.strongest)}">${ELEMENT_EN[e.strongest]}</b> · Weakest: <b class="${elClass(e.weakest)}">${ELEMENT_EN[e.weakest]}</b>.</p>
    ${missing}
  </section>`;
}

function daeunBlock(title: string, d: DaeunResult): string {
  const cells = d.pillars
    .map(
      (dp) => `<div class="daeun-cell">
        <div class="age">${dp.startAge.toFixed(1)}y</div>
        <div class="gz"><span class="${elClass(dp.pillar.stem.element)}">${dp.pillar.stem.hanja}</span><span class="${elClass(dp.pillar.branch.element)}">${dp.pillar.branch.hanja}</span></div>
        <div class="rd">${dp.pillar.stem.hangul}${dp.pillar.branch.hangul}</div>
      </div>`
    )
    .join("");
  return `<div class="daeun-block">
    <h4>${title} <span class="daeun-meta">starts at age ${d.startAgeYears.toFixed(1)} (${Math.round(d.startAgeMonths)} mo)</span></h4>
    <div class="daeun-track">${cells}</div>
  </div>`;
}

function renderDaeun(r: SajuResult): string {
  if (!r.daeun || (!r.daeun.forward && !r.daeun.reverse)) return "";
  let inner = "";
  const dir = r.daeun.forward ? "forward (순행)" : "reverse (역행)";
  if (r.daeun.forward) inner += daeunBlock("Forward (순행)", r.daeun.forward);
  if (r.daeun.reverse) inner += daeunBlock("Reverse (역행)", r.daeun.reverse);
  return `<section class="card result-section">
    <h3>${term("Luck Pillars", "daeun")} <span class="ko">대운 · Dae-un</span></h3>
    ${inner}
    <div class="inclusivity">Each 10-year pillar layers over your natal chart. Yours run <b>${dir}</b> — a direction the classical system derives from your birth-year polarity together with the gender you chose; the start age comes from your birth's distance to the neighboring solar terms. This is one interpretive lens, not a fixed forecast — recompute with the other gender any time to compare.</div>
  </section>`;
}

function renderWarnings(r: SajuResult): string {
  if (r.warnings.length === 0) return "";
  const items = r.warnings.map((w) => `<li>${esc(w)}</li>`).join("");
  return `<section class="result-section"><ul class="warnings">${items}</ul></section>`;
}

function render(r: SajuResult) {
  const out = $("#results");
  out.innerHTML =
    renderWarnings(r) +
    renderPillars(r) +
    renderTST(r) +
    renderElements(r) +
    renderDaeun(r);
  out.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ---------- form submit ----------
$<HTMLFormElement>("#saju-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const [y, mo, d] = $<HTMLInputElement>("#birthdate").value.split("-").map(Number);
  const hasTime = !unknownTime.checked;
  let hour = 12, minute = 0;
  if (hasTime && timeInput.value) {
    const [h, mi] = timeInput.value.split(":").map(Number);
    hour = h; minute = mi;
  }
  const genderInput = $("input[name=gender]:checked") as HTMLInputElement | null;
  if (!genderInput) {
    $("#results").innerHTML =
      `<section class="card result-section"><p style="color:var(--accent)">Please choose a gender above — the classical system needs it to derive the direction of your luck pillars (대운). Pick the one you most identify with; you can always recompute with the other.</p></section>`;
    ($(".daeun-fieldset") as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const sex = genderInput.value as "male" | "female";

  try {
    const r = computeSaju({
      year: y!, month: mo!, day: d!, hour, minute,
      timezone: tzInput.value.trim(),
      longitude: parseFloat(lonInput.value),
      hasBirthTime: hasTime,
      daeun: { fromConvention: { sex } },
    });
    render(r);
  } catch (err) {
    $("#results").innerHTML = `<section class="card result-section"><p style="color:var(--accent)">Could not compute chart: ${esc((err as Error).message)}</p></section>`;
  }
});
