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

// ---------- tiny DOM helpers ----------
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
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
const POS_LABEL: Record<Lang, Record<"year" | "month" | "day" | "hour", string>> = {
  en: { year: "Year", month: "Month", day: "Day", hour: "Hour" },
  ko: { year: "연주", month: "월주", day: "일주", hour: "시주" },
};
const posName = (p: "year" | "month" | "day" | "hour") => POS_LABEL[lang][p];

/** Static page copy (index.html), filled in by data-i18n attributes. */
const STATIC: Record<Lang, Record<string, string>> = {
  en: {
    hero_title: "Cast Your Saju Chart",
    form_title: "Your birth details",
    f_date: "Date of birth",
    f_time: "Time of birth",
    f_time_hint: "Enter it as exactly as you can.",
    f_time_unknown: "Time unknown",
    f_unknown_hint:
      "Without a birth time, we can still build most of your chart, but not the part drawn from the hour you were born.",
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
    hero_title: "사주 뽑기",
    form_title: "출생 정보",
    f_date: "생년월일",
    f_time: "태어난 시각",
    f_time_hint: "아는 만큼 정확하게 입력하세요.",
    f_time_unknown: "시간 모름",
    f_unknown_hint:
      "태어난 시각을 몰라도 사주의 대부분은 세울 수 있습니다. 다만 태어난 시(時)에서 나오는 부분, 곧 시주만은 알 수 없습니다.",
    f_gender:
      '성별 <span class="legend-ko">— 대운(운의 기둥)의 방향을 정하는 데 필요합니다</span>',
    f_gender_hint:
      '<span class="term" data-term="daeun">대운</span>은 태어난 해의 음양과 성별에 따라 흐르는 방향이 정해지며, 전통에서는 성별을 둘로만 나눕니다. 가장 자신과 가깝게 느껴지는 쪽을 고르시거나, 둘 다 계산해 비교해 보셔도 됩니다.',
    f_female: "여성",
    f_male: "남성",
    f_philosophy:
      "사주는 삶을 돌아보게 하는 해석의 예술입니다. 앞날을 못박는 예언도, 어떤 사람인지 재단하는 판결도 아닙니다.",
    f_submit: "내 사주 뽑기",
    footer_credit:
      "이 도구는 시몬 그레이스 설이 시어머니 김희경 선생님의 감수를 받아 만들었습니다. 김 선생님은 30년 경력의 사주 명리 전문가로, 다섯 가지 고전 분야의 자격을 갖추셨으며, 한국 명리학 학회의 중앙 학술 위원으로 위촉되셨습니다. 이곳에서 얻은 것이 스스로를 이해하고, 잘 살아가며, 세상에 선을 더하는 데 보탬이 되기를 저희 가족은 바랍니다.",
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

// ---------- tooltip ----------
const tooltip = $("#tooltip");
function showTip(target: HTMLElement) {
  const key = target.dataset.term!;
  const g = GLOSSARY[key];
  if (!g) return;
  // Korean mode: hangul is the headword (hanja small), body is the Korean explanation.
  // English mode: the English name leads, hangul+hanja sit alongside it.
  const title =
    lang === "ko"
      ? `${esc(g.hangul)}<span class="tt-ko">${esc(g.hanja)}</span>`
      : `${esc(g.en)}<span class="tt-ko">${esc(g.hangul)} ${esc(g.hanja)}</span>`;
  const body = lang === "ko" ? g.explainKo : g.explain;
  tooltip.innerHTML = `<div class="tt-title">${title}</div>${esc(body)}`;
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

function buildChartText(r: SajuResult): string {
  const inp = r.input;
  const e = r.elements;
  const order: Element[] = ["wood", "fire", "earth", "metal", "water"];

  const bd = `${inp.year}-${pad2(inp.month)}-${pad2(inp.day)}`;
  const known = inp.hasBirthTime !== false;
  const timeStr = known ? `${pad2(inp.hour)}:${pad2(inp.minute)}` : tr("unknown", "모름");
  const sex = inp.daeun?.fromConvention?.sex;

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
      "아래는 제 사주(四柱) 명식입니다. 한국의 한 선생님 방식을 따릅니다. 기둥은 기록된 시계 시각을 있는 그대로 " +
        "읽고 — 시간대·일광절약·진태양시 보정을 적용하지 않습니다 — 해의 경계는 입춘, 달의 경계는 12절기(분 단위까지 계산), " +
        "날의 경계는 밤 11시로 삼습니다. " +
        "이것을 앞날을 단정하는 예언이나 저를 규정하는 판결이 아니라, 성찰과 관조를 위한 해석의 예술로 읽어 주세요. " +
        "무엇이 두드러지고 그것이 무엇을 뜻할 수 있는지 탐구하듯 짚어 주시고, 저에게 되물어 주셔도 좋습니다.",
    ),
  );
  L.push("");

  L.push(tr("── BIRTH DETAILS ──", "── 출생 정보 ──"));
  L.push(`${tr("Date", "생년월일")}: ${bd}`);
  L.push(
    `${tr("Time", "시각")}: ${timeStr}${known ? tr(" (recorded clock time, used as-is)", " (기록된 시계 시각, 그대로 사용)") : tr(" (Hour Pillar omitted)", " (시주 생략)")}`,
  );
  if (sex) L.push(`${tr("Gender used for luck-pillar direction (classical binary rule)", "대운 방향 결정에 쓴 성별 (전통의 남녀 구분)")}: ${tr(sex, sex === "male" ? "남성" : "여성")}`);
  L.push("");

  L.push(tr("── FOUR PILLARS (사주 / 八字) ──", "── 사주 (四柱 / 八字) ──"));
  L.push(
    tr(
      "Traditionally read right→left: Year, Month, Day, Hour. The Day stem is the Day Master (일간) = me.",
      "전통적으로 오른쪽에서 왼쪽으로 — 연, 월, 일, 시 순으로 읽습니다. 일간(日干)이 곧 '나'입니다.",
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
    tr(
      "The count is the VISIBLE eight characters only (stems + branch elements); hidden stems are deliberately excluded from it.",
      "드러난 여덟 글자(천간 + 지지 오행)만 셉니다. 지장간은 일부러 넣지 않습니다.",
    ),
  );
  L.push(tr("Count (8 characters): ", "여덟 글자 집계: ") + order.map((m) => `${elName(m)} ${e.visible[m]}`).join(" · "));
  L.push(`${tr("Strongest", "가장 강함")}: ${elName(e.strongest)} · ${tr("Weakest", "가장 약함")}: ${elName(e.weakest)}`);
  L.push(
    e.missing.length
      ? `${tr("Missing (absent from the eight characters)", "없음 (여덟 글자에 드러나지 않음)")}: ${e.missing.map((m) => elName(m)).join(", ")}${tr(" — often the most telling part of a reading.", " — 오히려 이 빠진 오행이 가장 많은 것을 말해 주기도 합니다.")}`
      : tr("All five elements are represented.", "다섯 오행이 모두 나타납니다."),
  );
  L.push("");

  const st = r.strength;
  L.push(tr("── DAY MASTER STRENGTH INGREDIENTS (신강약 근거) ──", "── 신강약 근거 (身强弱) ──"));
  L.push(
    tr(
      "The 신강/신약 VERDICT is left to the reading (weigh these in order: 월지 command → 인성 resource → 비겁 companion). The engine reports only the ingredients.",
      "신강/신약 결론은 풀이의 몫입니다 (월지 → 인성 → 비겁 순으로 저울질). 계산기는 근거만 내놓습니다.",
    ),
  );
  L.push(`${tr("Month phase", "월령 왕상휴수사")} (旺相休囚死): ${st.phase.hangul} ${st.phase.hanja} — ${tr(st.phase.en, st.phase.hangul)}`);
  L.push(`  득령 (${tr("month command", "월령")}): ${st.hasMonthCommand ? tr("yes", "예") : tr("no", "아니오")}`);
  L.push(`  득지 (${tr("rootedness/통근", "통근")}): ${st.hasRoot ? tr("yes", "예") : tr("no", "아니오")} — ${st.strongRoots} ${tr("strong root(s)", "강한 뿌리")}, ${st.resourceRoots} ${tr("resource root(s)", "인성 뿌리")}; ${tr("rooted in month branch", "월지 통근")}: ${st.rootedInMonthBranch ? tr("yes", "예") : tr("no", "아니오")}`);
  L.push(`  득세 (${tr("allies", "세력")}): ${st.hasAllies ? tr("yes", "예") : tr("no", "아니오")} — ${tr("support", "생조")} ${st.supportCount} ${tr("vs", "대")} ${tr("drain", "설기")} ${st.drainCount}`);
  L.push(`  ${tr("인성 (resource) present", "인성 존재")}: ${st.resourcePresent ? tr("yes", "예") : tr("no", "아니오")} · ${tr("비겁 (companion) present", "비겁 존재")}: ${st.companionPresent ? tr("yes", "예") : tr("no", "아니오")}`);
  L.push("");

  const j = r.johuSeason;
  L.push(tr("── CLIMATE SEASON (조후) ──", "── 조후 (調候) ──"));
  L.push(
    tr(
      "A labeled, OVERRIDABLE default read from the month branch. This is NOT a 용신 — the useful god is interpretive, school-dependent, and deliberately not emitted by the calculator.",
      "월지에서 읽어낸 기본값으로, 얼마든지 바꿔도 됩니다. 이것은 용신이 아닙니다 — 용신은 해석의 영역이자 유파마다 달라 계산기가 정하지 않습니다.",
    ),
  );
  L.push(
    `${tr("Season", "계절")}: ${tr(j.en, j.hangul)} (${j.hangul}/${j.hanja}) — ${tr("from the", "월지")} ${j.monthBranchHanja} ${tr("month branch", "기준")}` +
      (j.seasonOpener ? tr(" (a 生地 season-opener, read back one season as the climate lags)", " (生地 절기 시작월 — 기후 지연으로 한 계절 뒤로 읽음)") : ""),
  );
  L.push("");

  const rel = r.relations;
  L.push(tr("── VOID, SPIRIT STARS & BRANCH RELATIONS (공망 · 신살 · 지지관계) ──", "── 공망 · 신살 · 지지관계 ──"));
  L.push(
    tr(
      "These are chart FACTS for the reading to locate and interpret; the engine draws no conclusions from them. Only reliable stars are listed (the twelve 십이신살 + 효신살/괴강/양인); decorative label-stars are omitted.",
      "이것들은 풀이가 찾아 읽어낼 사주의 사실입니다. 계산기는 여기서 결론을 내지 않습니다. 믿을 만한 신살만 적습니다 (십이신살 + 효신살·괴강·양인). 뜻이 얕은 이름살은 뺐습니다.",
    ),
  );
  // 공망
  L.push(
    `${tr("Void (공망)", "공망")}: ${rel.void.branches.map((b) => `${b.hangul}(${b.hanja})`).join(" · ")}` +
      (rel.void.hits.length
        ? tr(
            ` — lands on the ${rel.void.hits.map((h) => POS_LABEL.en[h.pos]).join(", ")} palace(s); read that palace as hollow.`,
            ` — ${rel.void.hits.map((h) => POS_LABEL.ko[h.pos]).join(", ")} 자리에 놓임. 그 자리는 비어 있다고 읽습니다.`,
          )
        : tr(" — not sitting on any of the four palaces.", " — 네 기둥 어디에도 놓이지 않음.")),
  );
  // 십이신살 per palace
  L.push(
    `${tr("Twelve stars (십이신살, from year branch)", "십이신살 (연지 기준)")}: ` +
      rel.sinsal.twelve.map((t) => `${tr(POS_LABEL.en[t.at.pos], POS_LABEL.ko[t.at.pos])}=${t.hangul}(${t.hanja})`).join(" · "),
  );
  // special stars
  const specials: string[] = [];
  for (const h of rel.sinsal.hyosin) specials.push(`${h.hangul}(${tr(POS_LABEL.en[h.at.pos], POS_LABEL.ko[h.at.pos])})`);
  for (const g of rel.sinsal.gwaegang) specials.push(`${g.hangul} ${g.hanja}(${tr(POS_LABEL.en[g.pos], POS_LABEL.ko[g.pos])})`);
  for (const y of rel.sinsal.yangin) specials.push(`${y.hangul}(${tr(POS_LABEL.en[y.at.pos], POS_LABEL.ko[y.at.pos])})`);
  L.push(`${tr("Special stars", "특수 신살")}: ${specials.length ? specials.join(" · ") : tr("none", "없음")}`);
  // combinations
  L.push(
    `${tr("Branch combinations (삼합/방합)", "삼합/방합")}: ` +
      (rel.branchRelations.combinations.length
        ? rel.branchRelations.combinations
            .map((c) => `${c.hangul}(${c.hanja}) ${c.degree === "full" ? tr("full", "완성") : tr("half/반합", "반합")} ${c.kind === "samhap" ? "삼합" : "방합"}→${elName(c.element as Element)}`)
            .join(" · ")
        : tr("none", "없음")),
  );
  // clashes
  L.push(
    `${tr("Clashes (충)", "충")}: ` +
      (rel.branchRelations.clashes.length
        ? rel.branchRelations.clashes.map((c) => `${c.hangul}(${c.hanja}) ${tr(POS_LABEL.en[c.a.pos], POS_LABEL.ko[c.a.pos])}↔${tr(POS_LABEL.en[c.b.pos], POS_LABEL.ko[c.b.pos])}`).join(" · ")
        : tr("none", "없음")),
  );
  L.push("");

  if (r.daeun && (r.daeun.forward || r.daeun.reverse)) {
    L.push(tr("── LUCK PILLARS (대운 · Dae-un) ──", "── 대운 (大運) ──"));
    L.push(
      tr(
        "Ten-year seasons that layer over the natal chart; start age comes from birth's distance to the neighboring solar terms.",
        "원국 위에 겹쳐지는 10년 단위의 흐름입니다. 시작 나이는 출생과 이웃한 절기 사이의 거리에서 나옵니다.",
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
      "해석에 대한 당부: 사주는 관조하고 해석하는 전통입니다. 앞날을 단정하기보다 가능성과 의미를 함께 탐구해 주세요.",
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
      `오른쪽에서 왼쪽으로 읽습니다 (연 → 시). 강조된 <b>${term("일간", "ilgan")}</b>이 곧 '나'이고, 모든 ${term("십성", "sipseong")} 표시는 그 글자가 나와 맺는 관계를 나타냅니다.`,
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
  const max = Math.max(...order.map((k) => e.visible[k]), 1);
  const bars = order
    .map((k) => {
      const v = e.visible[k];
      const pct = (v / max) * 100;
      return `<div class="el-bar">
        <span><span class="dot bg-${k}"></span>${elName(k)}</span>
        <span class="track"><span class="fill bg-${k}" style="width:${pct}%"></span></span>
        <span class="v ${elClass(k)}" style="text-align:right">${v}</span>
      </div>`;
    })
    .join("");
  const missing =
    e.missing.length > 0
      ? `<p class="el-note">${tr(
          `Missing (not visible in the eight characters): <b>${e.missing.map((m) => elName(m)).join(", ")}</b>. A missing element is often the most telling part of a reading.`,
          `없음 (여덟 글자에 드러나지 않음): <b>${e.missing.map((m) => elName(m)).join(", ")}</b>. 오히려 빠진 오행이 풀이에서 가장 많은 것을 말해 주기도 합니다.`,
        )}</p>`
      : `<p class="el-note">${tr("All five elements are represented.", "다섯 오행이 모두 나타납니다.")}</p>`;
  return `<section class="card result-section">
    <h3><span class="h3-ko">${term("오행", "ohaeng")}</span><span class="h3-en">${tr("Five Elements · Ohaeng", "다섯 원소")}</span></h3>
    <div class="el-bars">${bars}</div>
    <p class="el-note">${tr(
      `The count is the <b>visible eight characters</b> only — ${term("hidden stems", "jijanggan")} are deliberately left out of it. Strongest: <b class="${elClass(e.strongest)}">${elName(e.strongest)}</b> · Weakest: <b class="${elClass(e.weakest)}">${elName(e.weakest)}</b>.`,
      `<b>드러난 여덟 글자</b>만 셉니다 — ${term("지장간", "jijanggan")}은 일부러 넣지 않습니다. 가장 강한 오행: <b class="${elClass(e.strongest)}">${elName(e.strongest)}</b> · 가장 약한 오행: <b class="${elClass(e.weakest)}">${elName(e.weakest)}</b>.`,
    )}</p>
    ${missing}
  </section>`;
}

function renderStrength(r: SajuResult): string {
  const st = r.strength;
  const j = r.johuSeason;
  const chip = (ko: string, en: string, ok: boolean) =>
    `<span class="cond ${ok ? "cond-yes" : "cond-no"}">${ko} <small>${en}</small> ${ok ? "✓" : "✕"}</span>`;

  return `<section class="card result-section">
    <h3><span class="h3-ko">${term("신강약", "singangyak")}</span><span class="h3-en">${tr("Strength Ingredients · Singangyak", "일간 강약의 근거")}</span></h3>
    <p class="el-note">${tr(
      `The <b>신강/신약 verdict is left to the reading</b>, not the calculator — weigh these ingredients in order: ${term("월지", "deukryeong")} command → ${term("인성", "sipseong")} resource → ${term("비겁", "sipseong")} companion. What the engine reports:`,
      `<b>신강/신약 결론은 계산기가 아니라 풀이의 몫</b>입니다 — 근거를 ${term("월지", "deukryeong")} → ${term("인성", "sipseong")} → ${term("비겁", "sipseong")} 순으로 저울질하세요. 계산기가 내놓는 근거는 이렇습니다:`,
    )}</p>
    <div class="cond-row">
      ${chip(term("득령", "deukryeong"), tr("month command", "월령"), st.hasMonthCommand)}
      ${chip(term("득지", "tongeun"), tr("rootedness", "통근"), st.hasRoot)}
      ${chip("득세", tr("allies", "세력"), st.hasAllies)}
    </div>
    <p class="el-note">${tr(
      `Month phase ${term("旺相休囚死", "deukryeong")}: <b>${st.phase.hangul} ${st.phase.hanja}</b> — ${esc(st.phase.en)}. Rooted in the month branch: <b>${st.rootedInMonthBranch ? "yes" : "no"}</b> (${st.strongRoots} strong root(s), ${st.resourceRoots} resource root(s)). 인성 resource present: <b>${st.resourcePresent ? "yes" : "no"}</b> · 비겁 companion present: <b>${st.companionPresent ? "yes" : "no"}</b>. Allies: support ${st.supportCount} vs drain ${st.drainCount}.`,
      `월령 ${term("旺相休囚死", "deukryeong")}: <b>${st.phase.hangul} ${st.phase.hanja}</b>. 월지 통근: <b>${st.rootedInMonthBranch ? "예" : "아니오"}</b> (강근 ${st.strongRoots}, 인성근 ${st.resourceRoots}). 인성 존재: <b>${st.resourcePresent ? "예" : "아니오"}</b> · 비겁 존재: <b>${st.companionPresent ? "예" : "아니오"}</b>. 세력: 생조 ${st.supportCount} 대 설기 ${st.drainCount}.`,
    )}</p>

    <h4 class="yong-head">${term("조후", "johu")} · ${tr("Climate Season", "조후 계절")} <span class="provisional-tag">${tr("default", "기본값")}</span></h4>
    <p class="el-note">${tr(
      `A labeled, overridable default read from the ${term("월지", "deukryeong")} (month branch). This is <b>not a ${term("용신", "yongsin")}</b> — the useful god is interpretive and school-dependent, and the calculator deliberately does not emit one.`,
      `${term("월지", "deukryeong")}에서 읽어낸 기본값으로, 얼마든지 바꿔도 됩니다. 이것은 <b>${term("용신", "yongsin")}이 아닙니다</b> — 용신은 해석의 영역이자 유파마다 달라 계산기가 정하지 않습니다.`,
    )}</p>
    <p class="strength-verdict">${tr("Season", "계절")}: <b>${tr(j.en, j.hangul)}</b> <span class="el-note" style="font-weight:400">(${j.hangul}/${j.hanja} — ${tr("from the", "월지")} <b>${j.monthBranchHanja}</b> ${tr("month branch", "기준")}${j.seasonOpener ? tr("; a 生地 opener read back one season as the climate lags the calendar", "; 生地 시작월 — 기후가 절기보다 늦어 한 계절 뒤로 읽음") : ""})</span></p>
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
      `각 10년 기둥은 타고난 사주(원국) 위에 겹쳐집니다. 대운은 <b>${dir}</b>으로 흐릅니다 — 태어난 해의 음양과 선택한 성별에 따라 방향이 정해지고, 시작 나이는 출생과 이웃한 절기 사이의 거리에서 나옵니다. 이것은 하나의 관점일 뿐 정해진 예언이 아니니, 언제든 다른 성별로 다시 계산해 비교해 보셔도 됩니다.`,
    )}</div>
  </section>`;
}

function renderRelations(r: SajuResult): string {
  const rel = r.relations;
  const v = rel.void;
  const s = rel.sinsal;
  const br = rel.branchRelations;

  // ── 공망 (void) ──
  const voidBranches = v.branches.map((b) => `${b.hangul}(${b.hanja})`).join(" · ");
  const voidHits =
    v.hits.length > 0
      ? tr(
          `Falls on your <b>${v.hits.map((h) => posName(h.pos)).join(", ")}</b> palace — that palace is read as “hollow”: present in form but thin in substance.`,
          `<b>${v.hits.map((h) => posName(h.pos)).join(", ")}</b> 자리에 놓입니다 — 그 자리는 비어 있다고 읽습니다. 틀은 있으나 알맹이가 얕습니다.`,
        )
      : tr(
          "Neither void branch sits on one of your four palaces, so 공망 is quiet in this chart.",
          "두 공망 지지 모두 네 기둥에 놓이지 않아, 이 사주에서 공망은 잠잠합니다.",
        );

  // ── 십이신살 (twelve stars, per palace) ──
  const twelveRows = s.twelve
    .map(
      (t) =>
        `<div class="rel-row"><span class="rel-pos">${posName(t.at.pos)}</span><span class="rel-star">${t.hangul} <span class="rel-hanja">${t.hanja}</span></span></div>`,
    )
    .join("");

  // ── special stars ──
  const special: string[] = [];
  for (const h of s.hyosin)
    special.push(
      `<span class="rel-chip">${h.hangul} <small>${tr("Owl", "梟神")}</small> · ${posName(h.at.pos)}</span>`,
    );
  for (const g of s.gwaegang)
    special.push(
      `<span class="rel-chip">${g.hangul} · ${posName(g.pos)} ${g.hanja}</span>`,
    );
  for (const y of s.yangin)
    special.push(
      `<span class="rel-chip">${y.hangul} <small>${tr("Blade", "陽刃")}</small> · ${posName(y.at.pos)}</span>`,
    );
  const specialBlock =
    special.length > 0
      ? `<div class="rel-chips">${special.join("")}</div>`
      : `<p class="el-note">${tr(
          "None of 효신살 / 괴강 / 양인 are present.",
          "효신살 / 괴강 / 양인은 없습니다.",
        )}</p>`;

  // ── 삼합 / 방합 (combinations) ──
  const comboRows = br.combinations
    .map((c) => {
      const kindKo = c.kind === "samhap" ? tr("three-harmony 삼합", "삼합") : tr("directional 방합", "방합");
      const deg = c.degree === "full" ? tr("full", "완성") : tr("half 반합", "반합");
      return `<div class="rel-row"><span class="rel-combo ${elClass(c.element as Element)}">${c.hangul} <span class="rel-hanja">${c.hanja}</span></span><span class="rel-meta">${deg} ${kindKo} → ${elName(c.element as Element)}</span></div>`;
    })
    .join("");
  const comboBlock =
    br.combinations.length > 0
      ? `<div class="rel-list">${comboRows}</div>`
      : `<p class="el-note">${tr(
          "No 삼합 or 방합 branch combinations are formed.",
          "삼합·방합 결합은 없습니다.",
        )}</p>`;

  // ── 충 (clashes) ──
  const clashBlock =
    br.clashes.length > 0
      ? `<div class="rel-list">${br.clashes
          .map(
            (c) =>
              `<div class="rel-row"><span class="rel-combo">${c.hangul} <span class="rel-hanja">${c.hanja}</span></span><span class="rel-meta">${tr(
                `${posName(c.a.pos)} ↔ ${posName(c.b.pos)} clash`,
                `${posName(c.a.pos)} ↔ ${posName(c.b.pos)} 충`,
              )}</span></div>`,
          )
          .join("")}</div>`
      : `<p class="el-note">${tr("No branch clashes (충).", "지지 충은 없습니다.")}</p>`;

  return `<section class="card result-section">
    <h3><span class="h3-ko">${term("신살·관계", "sinsal")}</span><span class="h3-en">${tr(
      "Void, Spirit Stars & Branch Relations",
      "공망 · 신살 · 지지 관계",
    )}</span></h3>
    <p class="el-note">${tr(
      `These are <b>facts the reading locates and interprets</b> — the calculator surfaces them but never draws conclusions from them. Only the reliable stars are shown (the twelve ${term("십이신살", "sinsal")} plus ${term("효신살", "sinsal")} / ${term("괴강", "sinsal")} / ${term("양인", "sinsal")}); decorative label-stars are deliberately left out.`,
      `이것들은 <b>풀이가 찾아 읽어내는 사실</b>입니다 — 계산기는 드러낼 뿐 결론을 내리지 않습니다. 믿을 만한 신살만 보여 드립니다 (${term("십이신살", "sinsal")}과 ${term("효신살", "sinsal")}·${term("괴강", "sinsal")}·${term("양인", "sinsal")}). 뜻이 얕은 이름살은 일부러 뺐습니다.`,
    )}</p>

    <h4 class="yong-head">${term("공망", "gongmang")} · ${tr("Void", "공망")}</h4>
    <p class="strength-verdict">${tr("Void branches", "공망 지지")}: <b>${voidBranches}</b></p>
    <p class="el-note">${voidHits}</p>

    <h4 class="yong-head">${term("십이신살", "sinsal")} · ${tr("Twelve Stars", "십이신살")} <span class="provisional-tag">${tr(
      "from 연지",
      "연지 기준",
    )}</span></h4>
    <div class="rel-list">${twelveRows}</div>

    <h4 class="yong-head">${tr("Special stars", "특수 신살")}</h4>
    ${specialBlock}

    <h4 class="yong-head">${term("삼합", "samhap")} / ${term("방합", "banghap")} · ${tr("Branch Combinations", "지지 결합")}</h4>
    ${comboBlock}

    <h4 class="yong-head">${term("충", "chung")} · ${tr("Clashes", "충")}</h4>
    ${clashBlock}
  </section>`;
}

function renderWarnings(r: SajuResult): string {
  if (r.warnings.length === 0) return "";
  const items = r.warnings.map((w) => `<li>${esc(w)}</li>`).join("");
  return `<section class="result-section"><ul class="warnings">${items}</ul></section>`;
}

// Remember the last computed chart so a language switch can re-render it.
let lastResult: SajuResult | null = null;
function render(r: SajuResult) {
  lastResult = r;
  currentChartText = buildChartText(r);
  const out = $("#results");
  out.innerHTML =
    copyBar() +
    renderWarnings(r) +
    renderPillars(r) +
    renderTST(r) +
    renderElements(r) +
    renderStrength(r) +
    renderRelations(r) +
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
  if (lastResult) render(lastResult); // re-render results in the new language
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
      hasBirthTime: hasTime,
      daeun: { fromConvention: { sex } },
    });
    render(r);
  } catch (err) {
    $("#results").innerHTML = `<section class="card result-section"><p style="color:var(--accent)">${tr("Could not compute chart", "명식을 계산할 수 없습니다")}: ${esc((err as Error).message)}</p></section>`;
  }
});
