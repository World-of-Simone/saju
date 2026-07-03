/**
 * Teaching-forward web UI for the Saju engine. Imports the compiled engine from ../dist so
 * Vite never has to resolve the engine's NodeNext ".js" specifiers against ".ts" sources.
 */
import {
  computeSaju,
  GLOSSARY,
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

// ---------- i18n (crude first pass; Korean copy to be refined later) ----------
export type Lang = "en" | "ko";
let lang: Lang = localStorage.getItem("saju-lang") === "ko" ? "ko" : "en";
/** Pick the string for the active language. */
const tr = (en: string, ko: string) => (lang === "ko" ? ko : en);

const ELEMENT_LABEL: Record<Lang, Record<Element, string>> = {
  en: { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" },
  ko: { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" },
};
const elName = (e: Element) => ELEMENT_LABEL[lang][e];
const POLARITY_LABEL: Record<Lang, Record<"yang" | "yin", string>> = {
  en: { yang: "Yang", yin: "Yin" },
  ko: { yang: "양(陽)", yin: "음(陰)" },
};
const polName = (p: "yang" | "yin") => POLARITY_LABEL[lang][p];

/** Static page copy (index.html), filled in by data-i18n attributes. */
const STATIC: Record<Lang, Record<string, string>> = {
  en: {
    hero_title: "Welcome to your Saju reading with Saju Master Kim.",
    hero_tagline:
      "Saju is ancient Korean art that reads your life from the pattern the sky held at the hour you were born, arranged into a portrait of your character, your closest relationships, and the seasons your luck moves through.",
    hero_precision:
      "This calculator follows a Korean master's method: your pillars are read from the clock time you were born at, exactly as recorded — no timezone, daylight-saving, or true-solar adjustment. The one place it insists on precision is the 절기 (solar-term) boundaries that set your month pillar, computed to the second; the year turns at 입춘 and the day at 23:00.",
    hero_cta:
      'Enter four details<a href="#accuracy-note" class="asterisk">*</a> and cast your chart.',
    form_title: "Your birth details",
    f_date: "Date of birth",
    f_time: "Time of birth",
    f_time_hint: "Enter it as exactly as you can.",
    f_time_unknown: "Time unknown",
    f_unknown_hint:
      "Without a birth time, we can still build most of your chart, but not the part drawn from the hour you were born.",
    f_place: "Birthplace",
    f_place_ph: "Start typing a city…",
    f_place_hint:
      "Recorded for reference only — under this method your birthplace does not adjust the time or change the pillars.",
    f_adv: "Advanced: set longitude & timezone manually",
    f_lon: "Longitude (° east +)",
    f_tz: "IANA timezone",
    f_gender:
      'Gender <span class="legend-ko">— for the direction of your 대운 (luck pillars)</span>',
    f_gender_hint:
      'Your <span class="term" data-term="daeun">luck pillars</span> unfold in a direction the classical system derives from your birth-year polarity together with gender — and the tradition only recognizes two. Choose the one you most identify with, or try each and compare.',
    f_female: "Female",
    f_male: "Male",
    f_philosophy:
      "Saju is an interpretive art, a way of contemplating life — not a deterministic prediction or a fixed verdict about who you are.",
    f_submit: "Cast my chart",
    footer_credit:
      "This tool was built by Simone Grace Seol, under the supervision of her mother-in-law, Master Kim H.K. — a Saju practitioner with three decades of experience, who is certified in five classical disciplines, and appointed to the central academic committee of Korea's scholarly society for fate studies. Our family's wish is that what you find here helps you know yourself, live well, and do good in the world.",
    footer_geonames:
      'City data © <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a>, licensed under CC BY 4.0.',
  },
  ko: {
    hero_title: "김선생님과 함께하는 사주 풀이에 오신 것을 환영합니다.",
    hero_tagline:
      "사주는 당신이 태어난 시각에 하늘이 품고 있던 무늬로부터 삶을 읽어내는 한국의 오래된 예술로, 당신의 성품과 가장 가까운 관계들, 그리고 운이 흐르는 계절들을 하나의 초상으로 그려냅니다.",
    hero_precision:
      "이 계산기는 한국 선생님의 방식을 따릅니다: 기둥은 기록된 출생 시각을 있는 그대로 읽으며, 시간대·일광절약·진태양시 보정을 적용하지 않습니다. 정밀함을 고집하는 단 한 곳은 월주를 정하는 절기 경계로, 초 단위까지 계산됩니다. 해는 입춘에, 날은 23시에 바뀝니다.",
    hero_cta:
      '네 가지 정보<a href="#accuracy-note" class="asterisk">*</a>를 입력하고 사주를 뽑아 보세요.',
    form_title: "출생 정보",
    f_date: "생년월일",
    f_time: "태어난 시각",
    f_time_hint: "가능한 한 정확하게 입력하세요.",
    f_time_unknown: "시간 모름",
    f_unknown_hint:
      "태어난 시각이 없어도 사주의 대부분을 세울 수 있지만, 태어난 시(時)에서 나오는 부분은 세울 수 없습니다.",
    f_place: "출생지",
    f_place_ph: "도시 이름을 입력하세요…",
    f_place_hint:
      "참고용으로만 기록됩니다 — 이 방식에서는 출생지가 시간을 보정하거나 기둥을 바꾸지 않습니다.",
    f_adv: "고급: 경도와 시간대 직접 설정",
    f_lon: "경도 (동경 +)",
    f_tz: "IANA 시간대",
    f_gender:
      '성별 <span class="legend-ko">— 대운(운의 기둥)의 방향을 정하기 위함</span>',
    f_gender_hint:
      '당신의 <span class="term" data-term="daeun">대운</span>은 태어난 해의 음양과 성별로부터 고전 체계가 이끌어내는 방향으로 흐르며, 전통은 두 가지만을 인정합니다. 가장 자신과 가깝다고 느끼는 것을 고르거나, 각각을 시도해 비교해 보세요.',
    f_female: "여성",
    f_male: "남성",
    f_philosophy:
      "사주는 해석의 예술이자 삶을 성찰하는 방법이며, 결정론적 예언이나 당신이 누구인지에 대한 고정된 판결이 아닙니다.",
    f_submit: "내 사주 뽑기",
    footer_credit:
      "이 도구는 시몬 그레이스 설이 시어머니 김희경 선생님의 감수를 받아 만들었습니다. 김 선생님은 30년 경력의 사주 명리 실천가로, 다섯 가지 고전 분야에서 자격을 갖추었으며, 한국 명리학 학회의 중앙 학술 위원으로 위촉되셨습니다. 여기서 얻은 것이 당신이 자신을 알고, 잘 살아가며, 세상에 선을 행하는 데 도움이 되기를 저희 가족은 바랍니다.",
    footer_geonames:
      '도시 데이터 © <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a>, CC BY 4.0 라이선스.',
  },
};

/** Fill the static page copy from the catalog for the active language. */
function applyStaticI18n() {
  const d = STATIC[lang];
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((n) => {
    const v = d[n.dataset.i18n!];
    if (v != null) n.textContent = v;
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((n) => {
    const v = d[n.dataset.i18nHtml!];
    if (v != null) n.innerHTML = v;
  });
  document.querySelectorAll<HTMLInputElement>("[data-i18n-ph]").forEach((n) => {
    const v = d[n.dataset.i18nPh!];
    if (v != null) n.placeholder = v;
  });
  document.documentElement.lang = lang;
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
  return `${s.hanja} (${s.hangul} · ${s.roman}), ${elName(s.element)}/${polName(s.polarity)}`;
}

function pillarText(label: string, ko: string, p: Pillar, tg: PillarTenGods, isDay: boolean): string {
  const gz = `${p.stem.hanja}${p.branch.hanja} (${p.stem.hangul}${p.branch.hangul} · ${p.stem.roman}-${p.branch.roman})`;
  const godLabel = (info: { en: string; hangul: string }) =>
    tr(`${info.en} (${info.hangul})`, info.hangul);
  const stemGod = isDay
    ? tr("Day Master (일간) — this pillar's stem IS you", "일간 — 이 기둥의 천간이 곧 '나'")
    : tg.stem
      ? godLabel(tg.stem.info)
      : "—";
  const branchGod = godLabel(tg.branchMain.info);
  const animal = tr(p.branch.animalEn, p.branch.animalKo);
  const hidden = p.branch.hiddenStems
    .map((idx, i) => {
      const hs = STEMS[idx]!;
      const hg = tg.hidden[i];
      return `${hs.hanja}${hs.hangul}${hg ? ` [${tr(hg.info.en, hg.info.hangul)}]` : ""}`;
    })
    .join(", ");
  return [
    `${label} (${ko}): ${gz}`,
    `    ${tr("Stem", "천간")}   ${stemDesc(p.stem)} — ${tr("Ten God", "십성")}: ${stemGod}`,
    `    ${tr("Branch", "지지")} ${p.branch.hanja} (${p.branch.hangul} · ${p.branch.roman}), ${animal}, ${elName(p.branch.element)}/${polName(p.branch.polarity)} — ${tr("Ten God", "십성")}: ${branchGod}`,
    `    ${tr("Hidden stems", "지장간")} (지장간): ${hidden}`,
  ].join("\n");
}

function daeunText(d: DaeunResult): string {
  const head = tr(
    `Direction: ${d.direction === "forward" ? "forward (순행)" : "reverse (역행)"}. First luck pillar begins at age ${d.startAgeYears.toFixed(1)}.`,
    `방향: ${d.direction === "forward" ? "순행" : "역행"}. 첫 대운은 ${d.startAgeYears.toFixed(1)}세에 시작합니다.`,
  );
  const lines = d.pillars.map(
    (dp) =>
      `  ${tr("age", "나이")} ${dp.startAge.toFixed(1)}: ${dp.pillar.stem.hanja}${dp.pillar.branch.hanja} (${dp.pillar.stem.hangul}${dp.pillar.branch.hangul})`,
  );
  return [head, ...lines].join("\n");
}

function buildChartText(r: SajuResult, place: string): string {
  const inp = r.input;
  const e = r.elements;
  const order: Element[] = ["wood", "fire", "earth", "metal", "water"];

  const bd = `${inp.year}-${pad2(inp.month)}-${pad2(inp.day)}`;
  const known = inp.hasBirthTime !== false;
  const timeStr = known ? `${pad2(inp.hour)}:${pad2(inp.minute)}` : tr("unknown", "모름");
  const sex = inp.daeun?.fromConvention?.sex;
  const els = (arr: Element[]) => arr.map((m) => elName(m)).join(", ");

  const L: string[] = [];
  L.push(tr("KOREAN SAJU (사주 · Four Pillars) CHART", "사주 (四柱) 명식"));
  L.push(tr("Computed at ", "계산: ") + "https://world-of-simone.github.io/saju/");
  L.push("");
  L.push(
    tr(
      "I'm sharing my Saju (Korean Four Pillars) chart below. It follows a Korean master's method: " +
        "the pillars are read from my recorded clock time exactly as written — no timezone, daylight-saving, " +
        "or true-solar adjustment — with the year boundary at 입춘 (Start of Spring), the month boundaries at " +
        "the 12 solar terms (절기, computed to the minute), and the day rolling over at 23:00. " +
        "Please read it as an interpretive art: a lens for self-reflection and contemplation, not a fixed " +
        "prediction or a verdict about who I am. Walk me through what stands out and what it might mean, and " +
        "keep the framing exploratory. Feel free to ask me questions back.",
      "아래는 제 사주(四柱) 명식입니다. 한국 선생님의 방식을 따릅니다: 기둥은 기록된 시계 시각을 있는 그대로 " +
        "읽으며 — 시간대·일광절약·진태양시 보정을 적용하지 않습니다 — 해의 경계는 입춘, 달의 경계는 12절기(분 단위까지 계산), " +
        "날의 경계는 23시로 삼습니다. " +
        "이것을 결정된 예언이나 저에 대한 판결이 아니라, 성찰과 관조를 위한 해석의 예술로 읽어 주세요. " +
        "무엇이 두드러지고 그것이 무엇을 뜻할 수 있는지 탐구적인 태도로 짚어 주시고, 저에게 되물어 주셔도 좋습니다.",
    ),
  );
  L.push("");

  L.push(tr("── BIRTH DETAILS ──", "── 출생 정보 ──"));
  L.push(`${tr("Date", "생년월일")}: ${bd}`);
  L.push(
    `${tr("Time", "시각")}: ${timeStr}${known ? tr(" (recorded clock time, used as-is)", " (기록된 시계 시각, 그대로 사용)") : tr(" (Hour Pillar omitted)", " (시주 생략)")}`,
  );
  L.push(`${tr("Birthplace", "출생지")}: ${place || tr("(unspecified)", "(미지정)")} ${tr("(reference only — not used to adjust the time)", "(참고용 — 시간 보정에 사용되지 않음)")}`);
  if (sex) L.push(`${tr("Gender used for luck-pillar direction (classical binary rule)", "대운 방향에 사용된 성별 (고전 이분법)")}: ${tr(sex, sex === "male" ? "남성" : "여성")}`);
  L.push("");

  L.push(tr("── FOUR PILLARS (사주 / 八字) ──", "── 사주 (四柱 / 八字) ──"));
  L.push(
    tr(
      "Traditionally read right→left: Year, Month, Day, Hour. The Day stem is the Day Master (일간) = me.",
      "전통적으로 우→좌로 읽습니다: 연, 월, 일, 시. 일간(日干)이 곧 '나'입니다.",
    ),
  );
  L.push(`${tr("Day Master", "일간")}: ${stemDesc(r.dayMaster)}`);
  L.push("");
  L.push(pillarText(tr("YEAR ", "연주"), "연주", r.pillars.year, r.tenGods.year, false));
  L.push(pillarText(tr("MONTH", "월주"), "월주", r.pillars.month, r.tenGods.month, false));
  L.push(pillarText(tr("DAY  ", "일주"), "일주", r.pillars.day, r.tenGods.day, true));
  if (r.pillars.hour && r.tenGods.hour) {
    L.push(pillarText(tr("HOUR ", "시주"), "시주", r.pillars.hour, r.tenGods.hour, false));
  } else {
    L.push(tr("HOUR  (시주): unknown — birth time not provided.", "시주: 모름 — 태어난 시각이 제공되지 않음."));
  }
  L.push("");

  L.push(tr("── FIVE ELEMENTS (오행) ──", "── 오행 (五行) ──"));
  L.push(
    tr("Weighted (includes hidden stems): ", "가중 (지장간 포함): ") +
      order.map((m) => `${elName(m)} ${e.weighted[m]}`).join(" · "),
  );
  L.push(tr("Visible (8 characters):        ", "드러난 8글자:        ") + order.map((m) => `${elName(m)} ${e.visible[m]}`).join(" · "));
  L.push(`${tr("Strongest", "가장 강함")}: ${elName(e.strongest)} · ${tr("Weakest", "가장 약함")}: ${elName(e.weakest)}`);
  L.push(
    e.missing.length
      ? `${tr("Missing (absent from the eight characters)", "없음 (여덟 글자에 나타나지 않음)")}: ${e.missing.map((m) => elName(m)).join(", ")}${tr(" — often the most telling part of a reading.", " — 종종 풀이에서 가장 많은 것을 말해 줍니다.")}`
      : tr("All five elements are represented.", "다섯 오행이 모두 나타납니다."),
  );
  L.push("");

  const st = r.strength;
  L.push(tr("── DAY MASTER STRENGTH (신강약) ──", "── 신강약 (身强弱) ──"));
  L.push(tr("Deterministic: three classical tests, then a verdict.", "결정론적: 세 가지 고전 판정 후 결론."));
  L.push(`${tr("Verdict", "결론")}: ${st.verdict}${st.borderline ? tr(" (borderline / mixed — weigh by hand)", " (경계 / 혼합 — 직접 저울질 필요)") : ""}`);
  L.push(`${tr("Month phase", "월령 왕상휴수사")} (旺相休囚死): ${st.phase.hangul} ${st.phase.hanja} — ${tr(st.phase.en, st.phase.hangul)}`);
  L.push(`  득령 (${tr("month command", "월령")}): ${st.hasMonthCommand ? tr("yes", "예") : tr("no", "아니오")}`);
  L.push(`  득지 (${tr("rootedness/통근", "통근")}): ${st.hasRoot ? tr("yes", "예") : tr("no", "아니오")} — ${st.strongRoots} ${tr("strong root(s)", "강한 뿌리")}, ${st.resourceRoots} ${tr("resource root(s)", "인성 뿌리")}`);
  L.push(`  득세 (${tr("allies", "세력")}): ${st.hasAllies ? tr("yes", "예") : tr("no", "아니오")} — ${tr("support", "생조")} ${st.supportCount} vs ${tr("drain", "설기")} ${st.drainCount}`);
  L.push("");

  const y = r.yongsin;
  L.push(tr("── USEFUL GOD CANDIDATES (용신 · PROVISIONAL) ──", "── 용신 후보 (用神 · 잠정) ──"));
  L.push(
    tr(
      "Interpretive and school-dependent — these are CANDIDATES to start a human reading, not a verdict.",
      "해석적이며 유파에 따라 다릅니다 — 이는 사람이 하는 풀이의 출발점이 되는 후보이지 결론이 아닙니다.",
    ),
  );
  L.push(`${tr("억부 (support/suppress) candidate — favorable", "억부(抑扶) 후보 — 유리")}: ${els(y.eokbu.usefulElements)}; ${tr("unfavorable", "불리")}: ${els(y.eokbu.avoidElements)}`);
  L.push(`  ${y.eokbu.rationale}`);
  L.push(
    y.johu.tension
      ? `${tr("조후 (climate) candidate — chart runs", "조후(調候) 후보 — 명식이")} ${tr(y.johu.climate, y.johu.climate === "hot" ? "더움" : "추움")}; ${tr("wants", "필요")}: ${y.johu.candidateElement ? elName(y.johu.candidateElement) : "—"}`
      : tr("조후 (climate) candidate — climate looks balanced; no forced candidate.", "조후(調候) 후보 — 한난이 균형 잡혀 있어 강제 후보 없음."),
  );
  L.push(`  ${y.johu.rationale}`);
  if (y.diverges) {
    L.push(
      tr(
        "⚠ The 억부 and 조후 candidates DIVERGE. This tension is intentional — a practitioner weighs the whole chart rather than picking one automatically.",
        "⚠ 억부와 조후 후보가 서로 다릅니다. 이 긴장은 의도된 것으로, 실천가는 하나를 자동으로 고르기보다 명식 전체를 저울질합니다.",
      ),
    );
  }
  L.push("");

  if (r.daeun && (r.daeun.forward || r.daeun.reverse)) {
    L.push(tr("── LUCK PILLARS (대운 · Dae-un) ──", "── 대운 (大運) ──"));
    L.push(
      tr(
        "Ten-year seasons that layer over the natal chart; start age comes from birth's distance to the neighboring solar terms.",
        "원국 위에 겹쳐지는 10년 단위의 계절; 시작 나이는 출생과 이웃 절기 사이의 거리에서 나옵니다.",
      ),
    );
    if (r.daeun.forward) L.push(daeunText(r.daeun.forward));
    if (r.daeun.reverse) L.push(daeunText(r.daeun.reverse));
    L.push("");
  }

  if (r.warnings.length) {
    L.push(tr("── NOTES ──", "── 참고 ──"));
    for (const w of r.warnings) L.push(`- ${w}`);
    L.push("");
  }

  L.push(
    tr(
      "Reminder for interpretation: Saju is a contemplative, interpretive tradition — please explore " +
        "possibilities and meaning rather than issuing deterministic predictions.",
      "해석에 대한 당부: 사주는 관조적이고 해석적인 전통입니다 — 결정론적 예언을 내리기보다 가능성과 의미를 탐구해 주세요.",
    ),
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
        <h3 style="margin:0">${tr("Take this reading with you", "이 풀이를 가져가세요")}</h3>
        <p class="el-note" style="margin:0.3rem 0 0">${tr("Copy your full chart as text, then paste it into ChatGPT, Claude, or any AI to ask your own questions.", "전체 명식을 텍스트로 복사해 ChatGPT, Claude 등 어떤 AI에든 붙여넣고 직접 질문해 보세요.")}</p>
      </div>
      <button type="button" id="copy-chart" class="copy-btn">${tr("Copy chart for AI", "AI용 명식 복사")}</button>
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
      ? tr("Copied! Paste it into ChatGPT, Claude, or any AI.", "복사되었습니다! ChatGPT, Claude 등 AI에 붙여넣으세요.")
      : tr("Couldn't copy automatically — select the text in the chart above and copy it manually.", "자동 복사에 실패했습니다 — 위 명식의 텍스트를 직접 선택해 복사하세요.");
    status.classList.toggle("ok", ok);
  }
});

// ---------- rendering ----------
/** Ten God visible label — bilingual in English, hangul-only in Korean. */
const godText = (info: { hangul: string; en: string }) =>
  tr(`${info.hangul} · ${info.en}`, info.hangul);

function stemBlock(p: Pillar, tg: TenGodLabel | null, isDayMaster: boolean): string {
  const s = p.stem;
  const god = isDayMaster
    ? `<div class="tengod">${term(tr("일간 · Day Master", "일간 · 나"), "ilgan")}</div>`
    : `<div class="tengod">${tg ? term(godText(tg.info), "sipseong") : ""}</div>`;
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
    <div class="animal">${tr(b.animalEn, b.animalKo)}</div>
    <div class="tengod">${term(godText(tg.branchMain.info), "sipseong")}</div>
  </div>
  <div class="hidden-stems">${term("지장간", "jijanggan")}: ${hidden}</div>`;
}

function pillarCard(label: string, ko: string, p: Pillar, tg: PillarTenGods, isDay: boolean): string {
  const head =
    lang === "ko"
      ? ko
      : `${label}<br /><span style="font-weight:400">${ko}</span>`;
  return `<div class="pillar${isDay ? " day-master" : ""}">
    <div class="pillar-head">${head}${isDay ? `<span class="badge">${tr("Day Master", "일간")}</span>` : ""}</div>
    ${stemBlock(p, tg.stem, isDay)}
    ${branchBlock(p, tg)}
  </div>`;
}

function renderPillars(r: SajuResult): string {
  const P = r.pillars, T = r.tenGods;
  const unknownHead = lang === "ko" ? "시주" : `Hour<br /><span style="font-weight:400">시주</span>`;
  // Hour pillar may be absent (unknown birth time) — build it only when present.
  const hourCard =
    P.hour && T.hour
      ? pillarCard("Hour", "시주", P.hour, T.hour, false)
      : `<div class="pillar"><div class="pillar-head">${unknownHead}</div><div class="char" style="padding:1.5rem 0.5rem;color:var(--ink-soft);font-size:0.8rem">${tr("Birth time<br/>unknown", "출생 시각<br/>모름")}</div></div>`;
  const dayCard = pillarCard("Day", "일주", P.day, T.day, true);
  const monthCard = pillarCard("Month", "월주", P.month, T.month, false);
  const yearCard = pillarCard("Year", "연주", P.year, T.year, false);
  return `<section class="card result-section">
    <h3><span class="h3-ko">${term("사주", "saju")}</span><span class="h3-en">${tr("Four Pillars · Saju", "네 기둥")}</span></h3>
    <div class="pillars">${hourCard}${dayCard}${monthCard}${yearCard}</div>
    <p class="el-note">${tr(
      `Read right→left (Year → Hour). The highlighted <b>Day Master</b> (${term("일간", "ilgan")}) is “you”; every ${term("Ten God", "sipseong")} label describes how that character relates to you.`,
      `우→좌로 읽습니다 (연 → 시). 강조된 <b>일간</b>(${term("일간", "ilgan")})이 '나'이며, 모든 ${term("십성", "sipseong")} 표시는 그 글자가 나와 어떤 관계인지 나타냅니다.`,
    )}</p>
  </section>`;
}

function renderTST(r: SajuResult): string {
  // Astronomical diagnostic only — absent under her method, so this panel is omitted.
  const t = r.trueSolarTime;
  if (!t) return "";
  const ts = t.trueSolar;
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${ts.year}-${pad(ts.month)}-${pad(ts.day)} ${pad(ts.hour)}:${pad(ts.minute)}`;
  const row = (k: string, v: string) => `<div class="tst-item"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  const min = tr(" min", " 분");
  return `<section class="card result-section">
    <h3><span class="h3-ko">${term("진태양시", "jintaeyangsi")}</span><span class="h3-en">${tr("True Solar Time", "실제 태양시")}</span></h3>
    <div class="tst-grid">
      ${row(tr("UTC offset applied", "적용된 UTC 오프셋"), fmt(t.utcOffsetMinutes / 60, 2) + tr(" h", " 시간") + (t.isDST ? tr(" (DST)", " (일광절약)") : ""))}
      ${row(tr("Longitude correction", "경도 보정"), fmt(t.longitudeCorrectionMinutes) + min)}
      ${row(tr("Equation of Time", "균시차"), fmt(t.equationOfTimeMinutes) + min)}
      ${row(tr("Net shift vs clock", "시계 대비 순보정"), fmt(t.totalCorrectionMinutes) + min)}
      <div class="tst-highlight"><span>${tr("True solar birth moment", "진태양시 출생 순간")}</span><span>${clock}</span></div>
    </div>
    <p class="el-note">${tr("Your pillars are computed from this corrected moment — the Sun's real position at your birthplace, not the wall clock.", "당신의 기둥은 이 보정된 순간 — 시계가 아니라 태어난 곳에서의 태양의 실제 위치 — 로부터 계산됩니다.")}</p>
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
        <span><span class="dot bg-${k}"></span>${elName(k)}</span>
        <span class="track"><span class="fill bg-${k}" style="width:${pct}%"></span></span>
        <span class="v ${elClass(k)}" style="text-align:right">${w}</span>
      </div>`;
    })
    .join("");
  const missing =
    e.missing.length > 0
      ? `<p class="el-note">${tr(
          `Missing (not visible in the eight characters): <b>${e.missing.map((m) => elName(m)).join(", ")}</b>. A missing element is often the most telling part of a reading.`,
          `없음 (여덟 글자에 보이지 않음): <b>${e.missing.map((m) => elName(m)).join(", ")}</b>. 빠진 오행은 종종 풀이에서 가장 많은 것을 말해 줍니다.`,
        )}</p>`
      : `<p class="el-note">${tr("All five elements are represented.", "다섯 오행이 모두 나타납니다.")}</p>`;
  return `<section class="card result-section">
    <h3><span class="h3-ko">${term("오행", "ohaeng")}</span><span class="h3-en">${tr("Five Elements · Ohaeng", "다섯 원소")}</span></h3>
    <div class="el-bars">${bars}</div>
    <p class="el-note">${tr(
      `Weighted count includes ${term("hidden stems", "jijanggan")}. Strongest: <b class="${elClass(e.strongest)}">${elName(e.strongest)}</b> · Weakest: <b class="${elClass(e.weakest)}">${elName(e.weakest)}</b>.`,
      `가중 집계는 ${term("지장간", "jijanggan")}을 포함합니다. 가장 강함: <b class="${elClass(e.strongest)}">${elName(e.strongest)}</b> · 가장 약함: <b class="${elClass(e.weakest)}">${elName(e.weakest)}</b>.`,
    )}</p>
    ${missing}
  </section>`;
}

function renderStrength(r: SajuResult): string {
  const st = r.strength;
  const y = r.yongsin;
  const chip = (ko: string, en: string, ok: boolean) =>
    `<span class="cond ${ok ? "cond-yes" : "cond-no"}">${ko} <small>${en}</small> ${ok ? "✓" : "✕"}</span>`;
  const pill = (arr: Element[]) =>
    arr.map((m) => `<span class="yong-el ${elClass(m)}">${elName(m)}</span>`).join(" ");
  const climateWord = y.johu.climate === "hot" ? tr("hot", "더움") : tr("cold", "추움");

  return `<section class="card result-section">
    <h3><span class="h3-ko">${term("신강약", "singangyak")}</span><span class="h3-en">${tr("Day Master Strength · Singangyak", "일간의 강약")}</span></h3>
    <p class="strength-verdict">${tr("Verdict", "결론")}: <b class="${elClass(r.dayMaster.element)}">${st.verdict}</b>${st.borderline ? ` <span class="el-note" style="font-weight:400">${tr("(borderline — a genuinely mixed chart)", "(경계 — 진정으로 혼합된 명식)")}</span>` : ""}</p>
    <div class="cond-row">
      ${chip(term("득령", "deukryeong"), tr("month command", "월령"), st.hasMonthCommand)}
      ${chip(term("득지", "tongeun"), tr("rootedness", "통근"), st.hasRoot)}
      ${chip("득세", tr("allies", "세력"), st.hasAllies)}
    </div>
    <p class="el-note">${tr(
      `Month phase ${term("旺相休囚死", "deukryeong")}: <b>${st.phase.hangul} ${st.phase.hanja}</b> — ${esc(st.phase.en)}. Roots: ${st.strongRoots} strong, ${st.resourceRoots} resource. Allies: support ${st.supportCount} vs drain ${st.drainCount}. This part is deterministic.`,
      `월령 ${term("旺相休囚死", "deukryeong")}: <b>${st.phase.hangul} ${st.phase.hanja}</b>. 뿌리: 강근 ${st.strongRoots}, 인성근 ${st.resourceRoots}. 세력: 생조 ${st.supportCount} vs 설기 ${st.drainCount}. 이 부분은 결정론적입니다.`,
    )}</p>

    <h4 class="yong-head">${term(tr("Useful God", "용신"), "yongsin")} ${tr("candidates", "후보")} <span class="provisional-tag">${tr("provisional", "잠정")}</span></h4>
    <p class="el-note">${tr(
      `Choosing a ${term("용신", "yongsin")} is interpretive and school-dependent, so these are starting points — not a verdict.`,
      `${term("용신", "yongsin")}을 정하는 일은 해석적이고 유파에 따라 달라, 이는 출발점일 뿐 결론이 아닙니다.`,
    )}</p>
    <div class="yong-grid">
      <div class="yong-card">
        <div class="yong-title">${term("억부", "eokbu")} · ${tr("support/suppress", "생조/억제")}</div>
        <div class="yong-line">${tr("Favorable", "유리")}: ${pill(y.eokbu.usefulElements)}</div>
        <div class="yong-line yong-avoid">${tr("Unfavorable", "불리")}: ${pill(y.eokbu.avoidElements)}</div>
      </div>
      <div class="yong-card">
        <div class="yong-title">${term("조후", "johu")} · ${tr("climate", "한난")}</div>
        ${
          y.johu.tension && y.johu.candidateElement
            ? `<div class="yong-line">${tr(`Runs <b>${climateWord}</b>; wants`, `<b>${climateWord}</b>; 필요`)} ${pill([y.johu.candidateElement])}</div>`
            : `<div class="yong-line">${tr("Climate looks balanced — no forced candidate.", "한난이 균형 잡혀 있어 강제 후보 없음.")}</div>`
        }
      </div>
    </div>
    ${
      y.diverges
        ? `<p class="yong-diverge">${tr(
            "⚠ The 억부 and 조후 candidates <b>diverge</b>. That tension is intentional — a practitioner weighs the whole chart rather than letting the calculator pick one.",
            "⚠ 억부와 조후 후보가 <b>서로 다릅니다</b>. 이 긴장은 의도된 것으로, 실천가는 계산기가 하나를 고르게 두기보다 명식 전체를 저울질합니다.",
          )}</p>`
        : ""
    }
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
    <h4>${title} <span class="daeun-meta">${tr(`starts at age ${d.startAgeYears.toFixed(1)} (${Math.round(d.startAgeMonths)} mo)`, `${d.startAgeYears.toFixed(1)}세 시작 (${Math.round(d.startAgeMonths)}개월)`)}</span></h4>
    <div class="daeun-track">${cells}</div>
  </div>`;
}

function renderDaeun(r: SajuResult): string {
  if (!r.daeun || (!r.daeun.forward && !r.daeun.reverse)) return "";
  let inner = "";
  const dir = r.daeun.forward ? tr("forward (순행)", "순행") : tr("reverse (역행)", "역행");
  if (r.daeun.forward) inner += daeunBlock(tr("Forward (순행)", "순행"), r.daeun.forward);
  if (r.daeun.reverse) inner += daeunBlock(tr("Reverse (역행)", "역행"), r.daeun.reverse);
  return `<section class="card result-section">
    <h3><span class="h3-ko">${term("대운", "daeun")}</span><span class="h3-en">${tr("Luck Pillars · Dae-un", "운의 기둥")}</span></h3>
    ${inner}
    <div class="inclusivity">${tr(
      `Each 10-year pillar layers over your natal chart. Yours run <b>${dir}</b> — a direction the classical system derives from your birth-year polarity together with the gender you chose; the start age comes from your birth's distance to the neighboring solar terms. This is one interpretive lens, not a fixed forecast — recompute with the other gender any time to compare.`,
      `각 10년 기둥은 당신의 원국 위에 겹쳐집니다. 당신의 대운은 <b>${dir}</b>으로 흐릅니다 — 고전 체계가 태어난 해의 음양과 선택한 성별로부터 이끌어내는 방향이며, 시작 나이는 출생과 이웃 절기 사이의 거리에서 나옵니다. 이것은 하나의 해석적 렌즈일 뿐 고정된 예보가 아니며, 언제든 다른 성별로 다시 계산해 비교할 수 있습니다.`,
    )}</div>
  </section>`;
}

function renderWarnings(r: SajuResult): string {
  if (r.warnings.length === 0) return "";
  const items = r.warnings.map((w) => `<li>${esc(w)}</li>`).join("");
  return `<section class="result-section"><ul class="warnings">${items}</ul></section>`;
}

// Remember the last computed chart so a language switch can re-render it.
let lastResult: SajuResult | null = null;
let lastPlace = "";

function render(r: SajuResult, place: string) {
  lastResult = r;
  lastPlace = place;
  currentChartText = buildChartText(r, place);
  const out = $("#results");
  out.innerHTML =
    copyBar() +
    renderWarnings(r) +
    renderPillars(r) +
    renderTST(r) +
    renderElements(r) +
    renderStrength(r) +
    renderDaeun(r);
  out.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ---------- language toggle ----------
function syncLangButtons() {
  document.querySelectorAll<HTMLElement>(".lang-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === lang);
    b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
  });
}

function setLang(next: Lang) {
  if (next === lang) return;
  lang = next;
  localStorage.setItem("saju-lang", next);
  applyStaticI18n();
  syncLangButtons();
  if (lastResult) render(lastResult, lastPlace); // re-render results in the new language
}

document.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((b) => {
  b.addEventListener("click", () => setLang(b.dataset.lang as Lang));
});

// Apply the persisted language to the static page on first load.
applyStaticI18n();
syncLangButtons();

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
      `<section class="card result-section"><p style="color:var(--accent)">${tr(
        "Please choose a gender above — the classical system needs it to derive the direction of your luck pillars (대운). Pick the one you most identify with; you can always recompute with the other.",
        "위에서 성별을 선택해 주세요 — 고전 체계는 대운의 방향을 이끌어내는 데 성별이 필요합니다. 가장 자신과 가깝다고 느끼는 것을 고르세요. 언제든 다른 성별로 다시 계산할 수 있습니다.",
      )}</p></section>`;
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
    $("#results").innerHTML = `<section class="card result-section"><p style="color:var(--accent)">${tr("Could not compute chart", "명식을 계산할 수 없습니다")}: ${esc((err as Error).message)}</p></section>`;
  }
});
