/**
 * Teaching glossary. Our audience is non-Korean and usually starts from zero, and many
 * traditional term translations are confusing or actively misleading. Every entry pairs the
 * Korean term (hangul + hanja) with a plain-English explanation the UI can surface inline.
 */
export interface GlossaryEntry {
  term: string; // canonical key
  hangul: string;
  hanja: string;
  en: string;
  explain: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  saju: {
    term: "saju",
    hangul: "사주",
    hanja: "四柱",
    en: "Four Pillars",
    explain:
      "Literally 'four pillars' — the year, month, day, and hour of birth, each written as one Heavenly Stem + one Earthly Branch. Together they form eight characters (사주팔자, Saju Palja).",
  },
  ilgan: {
    term: "ilgan",
    hangul: "일간",
    hanja: "日干",
    en: "Day Master",
    explain:
      "The Heavenly Stem of your Day Pillar — the single character that represents 'you'. Every other element in the chart is read in relation to it. This is the anchor of the whole reading.",
  },
  cheongan: {
    term: "cheongan",
    hangul: "천간",
    hanja: "天干",
    en: "Heavenly Stems",
    explain:
      "The 10 Heavenly Stems: five elements (Wood, Fire, Earth, Metal, Water) each in a Yang and a Yin form. They sit on top of each pillar.",
  },
  jiji: {
    term: "jiji",
    hangul: "지지",
    hanja: "地支",
    en: "Earthly Branches",
    explain:
      "The 12 Earthly Branches, the same set as the 12 zodiac animals. They sit at the bottom of each pillar and each secretly contains one or more 'hidden stems'.",
  },
  jijanggan: {
    term: "jijanggan",
    hangul: "지장간",
    hanja: "支藏干",
    en: "Hidden Stems",
    explain:
      "Heavenly Stems 'hidden' inside an Earthly Branch. They add nuance the visible characters miss — e.g. an element that looks absent may be hiding inside a branch.",
  },
  ohaeng: {
    term: "ohaeng",
    hangul: "오행",
    hanja: "五行",
    en: "Five Elements",
    explain:
      "Wood, Fire, Earth, Metal, Water. They generate one another in a cycle (Wood→Fire→Earth→Metal→Water→Wood) and control one another across it. Balance among them drives interpretation.",
  },
  sipseong: {
    term: "sipseong",
    hangul: "십성",
    hanja: "十星",
    en: "Ten Gods",
    explain:
      "The ten roles other stems play relative to your Day Master (companion, output, wealth, authority, resource — each in two polarities). 'Gods' is a translation artifact; think 'ten relationships'. Some traditional English names (Eating God, Seven Killings, Hurting Officer) sound dramatic but are neutral technical labels.",
  },
  ipchun: {
    term: "ipchun",
    hangul: "입춘",
    hanja: "立春",
    en: "Start of Spring",
    explain:
      "The solar term (~Feb 4) that begins the Saju year. Your Year Pillar changes at Ipchun, NOT at Jan 1 or Lunar New Year — a common source of wrong charts.",
  },
  jeolgi: {
    term: "jeolgi",
    hangul: "절기",
    hanja: "節氣",
    en: "Solar Terms",
    explain:
      "24 markers of the Sun's position along the ecliptic (every 15°). The 12 'major' terms set the Saju month boundaries, so the Month Pillar changes with the Sun, not the calendar month.",
  },
  jintaeyangsi: {
    term: "jintaeyangsi",
    hangul: "진태양시",
    hanja: "眞太陽時",
    en: "True Solar Time",
    explain:
      "Clock time corrected to where the Sun actually is at your birthplace: adjust for longitude (4 min per degree) and the Equation of Time (±~16 min). Since the Hour Pillar changes every 2 hours, this correction can change your chart.",
  },
  daeun: {
    term: "daeun",
    hangul: "대운",
    hanja: "大運",
    en: "Luck Pillars",
    explain:
      "10-year phases that modify the natal chart over a lifetime. Their direction and start age come from the birth's distance to the neighboring solar terms.",
  },
  jasi: {
    term: "jasi",
    hangul: "자시",
    hanja: "子時",
    en: "Zi Hour",
    explain:
      "The 2-hour period spanning 23:00–01:00. Because it straddles midnight, births at 23:00–24:00 (야자시) keep the current day's Day Pillar while 00:00–01:00 (조자시) uses the next day.",
  },
  singangyak: {
    term: "singangyak",
    hangul: "신강약",
    hanja: "身强弱",
    en: "Day Master Strength",
    explain:
      "How strong or weak your Day Master is, judged by three classical tests: 득령 (does it command the birth month's season?), 득지 (is it rooted in the branches?), and 득세 (do allies outnumber drainers?). A strong (신강) vs weak (신약) chart is read very differently — this part is deterministic.",
  },
  deukryeong: {
    term: "deukryeong",
    hangul: "득령",
    hanja: "得令",
    en: "Month Command",
    explain:
      "Whether the Day Master is 'in season' at birth. The month decides its 旺相休囚死 phase — thriving, supported, resting, trapped, or exhausted. Being in a favorable phase (득령) is the single strongest factor in strength.",
  },
  tongeun: {
    term: "tongeun",
    hangul: "통근",
    hanja: "通根",
    en: "Rootedness",
    explain:
      "Whether the Day Master's own element hides inside the Earthly Branches (득지). A stem with roots below is anchored and hard to topple; a rootless stem is fragile even if it looks supported on the surface.",
  },
  yongsin: {
    term: "yongsin",
    hangul: "용신",
    hanja: "用神",
    en: "Useful God",
    explain:
      "The element a chart most needs for balance — the pivot of a reading. Unlike strength, choosing the 용신 is interpretive and varies by school, so this tool offers CANDIDATES (never a verdict): an 억부 candidate and a 조후 candidate, flagging when they disagree.",
  },
  eokbu: {
    term: "eokbu",
    hangul: "억부",
    hanja: "抑扶",
    en: "Support/Suppress Method",
    explain:
      "The most common way to pick a 용신: if the Day Master is weak, favor what supports it (resource + companion); if strong, favor what drains or restrains it (output, wealth, officer). 'Suppress the strong, support the weak.'",
  },
  johu: {
    term: "johu",
    hangul: "조후",
    hanja: "調候",
    en: "Climate Method",
    explain:
      "A separate way to pick a 용신, by temperature: a chart that runs hot (Fire-heavy / summer) wants Water to cool it; one that runs cold (Water-heavy / winter) wants Fire to warm it. It can disagree with the 억부 candidate — that tension is meaningful, not an error.",
  },
};
