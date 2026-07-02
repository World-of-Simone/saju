/**
 * Teaching-forward web UI for the Saju engine. Imports the compiled engine from ../dist so
 * Vite never has to resolve the engine's NodeNext ".js" specifiers against ".ts" sources.
 */
import {
  computeSaju,
  GLOSSARY,
  ELEMENT_EN,
  POLARITY_EN,
  STEMS,
  type SajuResult,
  type Element,
  type Stem,
} from "../dist/index.js";
import type { Pillar } from "../dist/pillars.js";
import type { PillarTenGods, TenGodLabel } from "../dist/analysis.js";
import type { DaeunResult } from "../dist/daeun.js";
import { warmCities, searchCities, type City } from "./cities";

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
let searchSeq = 0; // guards against out-of-order async results

/** Secondary line for a city: "Region, Country" (region omitted when absent/redundant). */
const cityDetail = (c: City) =>
  c.region && c.region !== c.name ? `${c.region}, ${c.country}` : c.country;

function applyCity(c: City) {
  cityInput.value = `${c.name}, ${cityDetail(c)}`;
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
    li.innerHTML = `<span>${esc(c.name)}</span><span class="country">${esc(cityDetail(c))}</span>`;
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      applyCity(c);
      sugBox.hidden = true;
    });
    sugBox.appendChild(li);
  });
  sugBox.hidden = false;
}

// Warm the (lazily fetched) city dataset as soon as the field gains focus.
cityInput.addEventListener("focus", warmCities);

cityInput.addEventListener("input", () => {
  const q = cityInput.value.trim();
  activeIdx = -1;
  if (q.length < 1) {
    matches = [];
    renderSuggestions();
    return;
  }
  const seq = ++searchSeq;
  searchCities(q).then((results) => {
    if (seq !== searchSeq) return; // a newer query superseded this one
    matches = results;
    renderSuggestions();
  }).catch(() => {
    if (seq !== searchSeq) return;
    matches = [];
    renderSuggestions(); // fall back silently; manual longitude/timezone entry still works
  });
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

// ---------- plain-text export (copy chart for AI) ----------
const pad2 = (n: number) => String(n).padStart(2, "0");

/** Current chart serialized as text; refreshed on every render, read by the copy button. */
let currentChartText = "";

function stemDesc(s: Stem): string {
  return `${s.hanja} (${s.hangul} · ${s.roman}), ${ELEMENT_EN[s.element]}/${POLARITY_EN[s.polarity]}`;
}

function pillarText(label: string, ko: string, p: Pillar, tg: PillarTenGods, isDay: boolean): string {
  const gz = `${p.stem.hanja}${p.branch.hanja} (${p.stem.hangul}${p.branch.hangul} · ${p.stem.roman}-${p.branch.roman})`;
  const stemGod = isDay
    ? "Day Master (일간) — this pillar's stem IS you"
    : tg.stem
      ? `${tg.stem.info.en} (${tg.stem.info.hangul})`
      : "—";
  const branchGod = `${tg.branchMain.info.en} (${tg.branchMain.info.hangul})`;
  const hidden = p.branch.hiddenStems
    .map((idx, i) => {
      const hs = STEMS[idx]!;
      const hg = tg.hidden[i];
      return `${hs.hanja}${hs.hangul}${hg ? ` [${hg.info.en}]` : ""}`;
    })
    .join(", ");
  return [
    `${label} (${ko}): ${gz}`,
    `    Stem   ${stemDesc(p.stem)} — Ten God: ${stemGod}`,
    `    Branch ${p.branch.hanja} (${p.branch.hangul} · ${p.branch.roman}), ${p.branch.animalEn}, ${ELEMENT_EN[p.branch.element]}/${POLARITY_EN[p.branch.polarity]} — Ten God: ${branchGod}`,
    `    Hidden stems (지장간): ${hidden}`,
  ].join("\n");
}

function daeunText(d: DaeunResult): string {
  const head = `Direction: ${d.direction === "forward" ? "forward (순행)" : "reverse (역행)"}. First luck pillar begins at age ${d.startAgeYears.toFixed(1)}.`;
  const lines = d.pillars.map(
    (dp) =>
      `  age ${dp.startAge.toFixed(1)}: ${dp.pillar.stem.hanja}${dp.pillar.branch.hanja} (${dp.pillar.stem.hangul}${dp.pillar.branch.hangul})`,
  );
  return [head, ...lines].join("\n");
}

function buildChartText(r: SajuResult, place: string): string {
  const inp = r.input;
  const t = r.trueSolarTime;
  const ts = t.trueSolar;
  const e = r.elements;
  const order: Element[] = ["wood", "fire", "earth", "metal", "water"];

  const bd = `${inp.year}-${pad2(inp.month)}-${pad2(inp.day)}`;
  const known = inp.hasBirthTime !== false;
  const timeStr = known ? `${pad2(inp.hour)}:${pad2(inp.minute)}` : "unknown";
  const trueClock = `${ts.year}-${pad2(ts.month)}-${pad2(ts.day)} ${pad2(ts.hour)}:${pad2(ts.minute)}`;
  const sex = inp.daeun?.fromConvention?.sex;

  const L: string[] = [];
  L.push("KOREAN SAJU (사주 · Four Pillars) CHART");
  L.push("Computed at https://world-of-simone.github.io/saju/");
  L.push("");
  L.push(
    "I'm sharing my Saju (Korean Four Pillars) chart below. It was calculated from true solar time — " +
      "the Sun's actual position over my birthplace — with the year boundary at 입춘 (Start of Spring) and " +
      "month boundaries at the 12 solar terms, so it's more astronomically precise than typical calculators. " +
      "Please read it as an interpretive art: a lens for self-reflection and contemplation, not a fixed " +
      "prediction or a verdict about who I am. Walk me through what stands out and what it might mean, and " +
      "keep the framing exploratory. Feel free to ask me questions back.",
  );
  L.push("");

  L.push("── BIRTH DETAILS ──");
  L.push(`Date: ${bd}`);
  L.push(`Time: ${timeStr}${known ? " (local clock time as recorded)" : " (Hour Pillar omitted)"}`);
  L.push(`Birthplace: ${place || "(unspecified)"} (longitude ${inp.longitude}° E)`);
  L.push(`Timezone: ${inp.timezone} (UTC${fmt(t.utcOffsetMinutes / 60, 2)}${t.isDST ? ", DST in effect" : ""})`);
  if (known) {
    L.push(`True solar birth moment: ${trueClock}`);
    L.push(
      `  Longitude correction ${fmt(t.longitudeCorrectionMinutes)} min · Equation of Time ${fmt(t.equationOfTimeMinutes)} min · net shift vs clock ${fmt(t.totalCorrectionMinutes)} min`,
    );
  }
  if (sex) L.push(`Gender used for luck-pillar direction (classical binary rule): ${sex}`);
  L.push("");

  L.push("── FOUR PILLARS (사주 / 八字) ──");
  L.push("Traditionally read right→left: Year, Month, Day, Hour. The Day stem is the Day Master (일간) = me.");
  L.push(`Day Master: ${stemDesc(r.dayMaster)}`);
  L.push("");
  L.push(pillarText("YEAR ", "연주", r.pillars.year, r.tenGods.year, false));
  L.push(pillarText("MONTH", "월주", r.pillars.month, r.tenGods.month, false));
  L.push(pillarText("DAY  ", "일주", r.pillars.day, r.tenGods.day, true));
  if (r.pillars.hour && r.tenGods.hour) {
    L.push(pillarText("HOUR ", "시주", r.pillars.hour, r.tenGods.hour, false));
  } else {
    L.push("HOUR  (시주): unknown — birth time not provided.");
  }
  L.push("");

  L.push("── FIVE ELEMENTS (오행) ──");
  L.push(
    "Weighted (includes hidden stems): " +
      order.map((k) => `${ELEMENT_EN[k]} ${e.weighted[k]}`).join(" · "),
  );
  L.push("Visible (8 characters):        " + order.map((k) => `${ELEMENT_EN[k]} ${e.visible[k]}`).join(" · "));
  L.push(`Strongest: ${ELEMENT_EN[e.strongest]} · Weakest: ${ELEMENT_EN[e.weakest]}`);
  L.push(
    e.missing.length
      ? `Missing (absent from the eight characters): ${e.missing.map((m) => ELEMENT_EN[m]).join(", ")} — often the most telling part of a reading.`
      : "All five elements are represented.",
  );
  L.push("");

  if (r.daeun && (r.daeun.forward || r.daeun.reverse)) {
    L.push("── LUCK PILLARS (대운 · Dae-un) ──");
    L.push("Ten-year seasons that layer over the natal chart; start age comes from birth's distance to the neighboring solar terms.");
    if (r.daeun.forward) L.push(daeunText(r.daeun.forward));
    if (r.daeun.reverse) L.push(daeunText(r.daeun.reverse));
    L.push("");
  }

  if (r.warnings.length) {
    L.push("── NOTES ──");
    for (const w of r.warnings) L.push(`- ${w}`);
    L.push("");
  }

  L.push(
    "Reminder for interpretation: Saju is a contemplative, interpretive tradition — please explore " +
      "possibilities and meaning rather than issuing deterministic predictions.",
  );

  return L.join("\n");
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function copyBar(): string {
  return `<section class="card result-section copy-bar">
    <div class="copy-bar-row">
      <div class="copy-bar-text">
        <h3 style="margin:0">Take this reading with you</h3>
        <p class="el-note" style="margin:0.3rem 0 0">Copy your full chart as text, then paste it into ChatGPT, Claude, or any AI to ask your own questions.</p>
      </div>
      <button type="button" id="copy-chart" class="copy-btn">Copy chart for AI</button>
    </div>
    <p id="copy-status" class="copy-status" aria-live="polite"></p>
  </section>`;
}

document.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest("#copy-chart");
  if (!btn) return;
  const ok = await copyToClipboard(currentChartText);
  const status = $("#copy-status");
  if (status) {
    status.textContent = ok
      ? "Copied! Paste it into ChatGPT, Claude, or any AI."
      : "Couldn't copy automatically — select the text in the chart above and copy it manually.";
    status.classList.toggle("ok", ok);
  }
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

function render(r: SajuResult, place: string) {
  currentChartText = buildChartText(r, place);
  const out = $("#results");
  out.innerHTML =
    copyBar() +
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
    render(r, cityInput.value.trim());
  } catch (err) {
    $("#results").innerHTML = `<section class="card result-section"><p style="color:var(--accent)">Could not compute chart: ${esc((err as Error).message)}</p></section>`;
  }
});
