/**
 * Teaching glossary. Our primary audience is non-Korean and usually starts from zero, and many
 * traditional term translations are confusing or actively misleading, so each entry pairs the
 * Korean term (hangul + hanja) with a plain-English explanation the UI can surface inline.
 *
 * `explainKo` is the Korean counterpart, written idiomatically for a Korean reader who already
 * knows the tradition's basics — it assumes more and drops the English-specific meta-commentary
 * (e.g. "'Gods' is a translation artifact"), rather than being a literal translation of `explain`.
 */
export interface GlossaryEntry {
  term: string; // canonical key
  hangul: string;
  hanja: string;
  en: string;
  explain: string;
  explainKo: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  saju: {
    term: "saju",
    hangul: "사주",
    hanja: "四柱",
    en: "Four Pillars",
    explain:
      "Literally 'four pillars' — the year, month, day, and hour of birth, each written as one Heavenly Stem + one Earthly Branch. Together they form eight characters (사주팔자, Saju Palja).",
    explainKo:
      "태어난 해·달·날·시의 네 기둥입니다. 각 기둥은 천간 하나와 지지 하나로 이루어지고, 네 기둥의 여덟 글자를 합쳐 사주팔자라 부릅니다.",
  },
  ilgan: {
    term: "ilgan",
    hangul: "일간",
    hanja: "日干",
    en: "Day Master",
    explain:
      "The Heavenly Stem of your Day Pillar — the single character that represents 'you'. Every other element in the chart is read in relation to it. This is the anchor of the whole reading.",
    explainKo:
      "일주의 천간, 곧 사주에서 '나'를 나타내는 글자입니다. 나머지 글자는 모두 이 일간과의 관계로 읽으며, 풀이 전체의 중심이 됩니다.",
  },
  cheongan: {
    term: "cheongan",
    hangul: "천간",
    hanja: "天干",
    en: "Heavenly Stems",
    explain:
      "The 10 Heavenly Stems: five elements (Wood, Fire, Earth, Metal, Water) each in a Yang and a Yin form. They sit on top of each pillar.",
    explainKo:
      "열 개의 천간입니다. 목·화·토·금·수 오행이 저마다 양과 음으로 나뉘며, 각 기둥의 위쪽에 자리합니다.",
  },
  jiji: {
    term: "jiji",
    hangul: "지지",
    hanja: "地支",
    en: "Earthly Branches",
    explain:
      "The 12 Earthly Branches, the same set as the 12 zodiac animals. They sit at the bottom of each pillar and each secretly contains one or more 'hidden stems'.",
    explainKo:
      "열두 개의 지지로, 열두 띠와 같은 차례입니다. 각 기둥의 아래쪽에 놓이며, 저마다 지장간(숨은 천간)을 품고 있습니다.",
  },
  jijanggan: {
    term: "jijanggan",
    hangul: "지장간",
    hanja: "支藏干",
    en: "Hidden Stems",
    explain:
      "Heavenly Stems 'hidden' inside an Earthly Branch. They add nuance the visible characters miss — e.g. an element that looks absent may be hiding inside a branch.",
    explainKo:
      "지지 속에 숨어 있는 천간입니다. 드러난 여덟 글자만으로는 놓치기 쉬운 결을 더해 줍니다 — 없어 보이던 오행이 지지 안에 숨어 있기도 합니다.",
  },
  ohaeng: {
    term: "ohaeng",
    hangul: "오행",
    hanja: "五行",
    en: "Five Elements",
    explain:
      "Wood, Fire, Earth, Metal, Water. They generate one another in a cycle (Wood→Fire→Earth→Metal→Water→Wood) and control one another across it. Balance among them drives interpretation.",
    explainKo:
      "목·화·토·금·수입니다. 목→화→토→금→수→목으로 서로를 낳고(상생), 하나 건너뛰어 서로를 이깁니다(상극). 이 다섯의 균형이 풀이의 바탕입니다.",
  },
  sipseong: {
    term: "sipseong",
    hangul: "십성",
    hanja: "十星",
    en: "Ten Gods",
    explain:
      "The ten roles other stems play relative to your Day Master (companion, output, wealth, authority, resource — each in two polarities). 'Gods' is a translation artifact; think 'ten relationships'. Some traditional English names (Eating God, Seven Killings, Hurting Officer) sound dramatic but are neutral technical labels.",
    explainKo:
      "일간을 기준으로 다른 글자가 맡는 열 가지 역할입니다. 비겁·식상·재성·관성·인성의 다섯 무리가 각각 음양으로 갈립니다. 결국 각 글자가 나와 어떤 관계인지를 나타냅니다.",
  },
  ipchun: {
    term: "ipchun",
    hangul: "입춘",
    hanja: "立春",
    en: "Start of Spring",
    explain:
      "The solar term (~Feb 4) that begins the Saju year. Your Year Pillar changes at Ipchun, NOT at Jan 1 or Lunar New Year — a common source of wrong charts.",
    explainKo:
      "사주에서 한 해가 시작되는 절기(대개 2월 4일 무렵)입니다. 연주는 양력 1월 1일이나 설날이 아니라 입춘에 바뀝니다 — 이를 놓쳐 사주가 틀리는 경우가 흔합니다.",
  },
  jeolgi: {
    term: "jeolgi",
    hangul: "절기",
    hanja: "節氣",
    en: "Solar Terms",
    explain:
      "24 markers of the Sun's position along the ecliptic (every 15°). The 12 'major' terms set the Saju month boundaries, so the Month Pillar changes with the Sun, not the calendar month.",
    explainKo:
      "태양의 위치를 15°마다 나눈 스물넷의 마디입니다. 그중 12절기가 사주의 달 경계가 되므로, 월주는 달력의 월이 아니라 태양의 움직임을 따라 바뀝니다.",
  },
  jintaeyangsi: {
    term: "jintaeyangsi",
    hangul: "진태양시",
    hanja: "眞太陽時",
    en: "True Solar Time",
    explain:
      "Clock time corrected to where the Sun actually is at your birthplace: adjust for longitude (4 min per degree) and the Equation of Time (±~16 min). Since the Hour Pillar changes every 2 hours, this correction can change your chart.",
    explainKo:
      "태어난 곳에서 해가 실제로 놓인 위치에 맞춰 시계 시각을 보정한 시간입니다(경도·균시차 반영). 이 방식에서는 사주에 쓰지 않고 참고용으로만 두며, 기둥은 기록된 시계 시각 그대로 세웁니다.",
  },
  daeun: {
    term: "daeun",
    hangul: "대운",
    hanja: "大運",
    en: "Luck Pillars",
    explain:
      "10-year phases that modify the natal chart over a lifetime. Their direction and start age come from the birth's distance to the neighboring solar terms.",
    explainKo:
      "원국 위에 겹쳐지며 삶을 10년 단위로 물들이는 운의 기둥입니다. 흐르는 방향과 시작 나이는 출생과 이웃한 절기 사이의 거리에서 정해집니다.",
  },
  jasi: {
    term: "jasi",
    hangul: "자시",
    hanja: "子時",
    en: "Zi Hour",
    explain:
      "The 2-hour period spanning 23:00–01:00. Because it straddles midnight, births at 23:00–24:00 (야자시) keep the current day's Day Pillar while 00:00–01:00 (조자시) uses the next day.",
    explainKo:
      "밤 11시부터 새벽 1시까지의 두 시간입니다. 자정을 걸치므로, 23~24시(야자시)는 그날의 일주를 그대로 쓰고 0~1시(조자시)는 다음 날 일주를 씁니다.",
  },
  singangyak: {
    term: "singangyak",
    hangul: "신강약",
    hanja: "身强弱",
    en: "Day Master Strength",
    explain:
      "How strong or weak your Day Master is, judged by three classical tests: 득령 (does it command the birth month's season?), 득지 (is it rooted in the branches?), and 득세 (do allies outnumber drainers?). A strong (신강) vs weak (신약) chart is read very differently — this part is deterministic.",
    explainKo:
      "일간이 얼마나 강하고 약한지입니다. 득령(월령을 얻었는가)·득지(지지에 뿌리내렸는가)·득세(내 편이 더 많은가)의 세 가지로 가늠합니다. 신강이냐 신약이냐에 따라 풀이가 크게 달라집니다.",
  },
  deukryeong: {
    term: "deukryeong",
    hangul: "득령",
    hanja: "得令",
    en: "Month Command",
    explain:
      "Whether the Day Master is 'in season' at birth. The month decides its 旺相休囚死 phase — thriving, supported, resting, trapped, or exhausted. Being in a favorable phase (득령) is the single strongest factor in strength.",
    explainKo:
      "일간이 태어난 달의 기운을 얻었는지입니다. 월지가 왕·상·휴·수·사의 상태를 정하며, 득령 여부는 신강약을 가르는 가장 큰 요소입니다.",
  },
  tongeun: {
    term: "tongeun",
    hangul: "통근",
    hanja: "通根",
    en: "Rootedness",
    explain:
      "Whether the Day Master's own element hides inside the Earthly Branches (득지). A stem with roots below is anchored and hard to topple; a rootless stem is fragile even if it looks supported on the surface.",
    explainKo:
      "일간의 오행이 지지 속에 뿌리를 두었는지입니다(득지). 뿌리가 있는 천간은 쉬이 흔들리지 않고, 뿌리 없는 천간은 겉이 든든해 보여도 약합니다.",
  },
  yongsin: {
    term: "yongsin",
    hangul: "용신",
    hanja: "用神",
    en: "Useful God",
    explain:
      "The element a chart most needs for balance — the pivot of a reading. Unlike strength, choosing the 용신 is interpretive and varies by school, so this tool offers CANDIDATES (never a verdict): an 억부 candidate and a 조후 candidate, flagging when they disagree.",
    explainKo:
      "사주의 균형을 위해 가장 필요한 기운으로, 풀이의 축이 됩니다. 신강약과 달리 용신은 해석의 영역이자 유파마다 달라서, 이 도구는 결론을 내리지 않고 후보만 짚어 줍니다.",
  },
  eokbu: {
    term: "eokbu",
    hangul: "억부",
    hanja: "抑扶",
    en: "Support/Suppress Method",
    explain:
      "The most common way to pick a 용신: if the Day Master is weak, favor what supports it (resource + companion); if strong, favor what drains or restrains it (output, wealth, officer). 'Suppress the strong, support the weak.'",
    explainKo:
      "용신을 잡는 가장 흔한 방법입니다. 일간이 약하면 도와주는 기운(인성·비겁)을, 강하면 덜어내거나 눌러 주는 기운(식상·재성·관성)을 씁니다 — 강한 것은 누르고 약한 것은 돕는다.",
  },
  johu: {
    term: "johu",
    hangul: "조후",
    hanja: "調候",
    en: "Climate Method",
    explain:
      "A separate way to pick a 용신, by temperature: a chart that runs hot (Fire-heavy / summer) wants Water to cool it; one that runs cold (Water-heavy / winter) wants Fire to warm it. It can disagree with the 억부 candidate — that tension is meaningful, not an error.",
    explainKo:
      "기후로 용신을 잡는 방법입니다. 화가 많거나 여름생이라 더운 사주는 수로 식히고, 수가 많거나 겨울생이라 찬 사주는 화로 덥힙니다. 억부와 어긋날 수 있는데, 그렇게 갈리는 자리가 오히려 의미가 됩니다.",
  },
  gongmang: {
    term: "gongmang",
    hangul: "공망",
    hanja: "空亡",
    en: "Void / Emptiness",
    explain:
      "Two 'empty' branches determined by your Day Pillar's ten-day cycle (旬). Wherever one lands in your chart, that palace is read as hollow — present in form but thin in substance, so its themes feel unsettled or need to be earned rather than assumed.",
    explainKo:
      "일주가 속한 순(旬)에 따라 정해지는 두 개의 '빈' 지지입니다. 이것이 놓인 자리는 비어 있다고 봅니다 — 틀은 있으나 알맹이가 얕아, 그 자리의 일은 저절로 주어지기보다 스스로 채워야 합니다.",
  },
  sinsal: {
    term: "sinsal",
    hangul: "신살",
    hanja: "神殺",
    en: "Spirit Stars",
    explain:
      "Named markers layered onto the chart. This calculator shows only the reliable ones — the twelve 십이신살 (read from your day branch) plus 효신살, 괴강, and 양인 — and deliberately omits the many decorative 'label' stars whose meaning is thin or contested.",
    explainKo:
      "사주에 덧입혀 읽는 이름 붙은 기운입니다. 이 도구는 믿을 만한 것만 보여 줍니다 — 십이신살(일지 기준)과 효신살·괴강·양인. 뜻이 얕거나 논란이 많은 이름살은 일부러 뺐습니다.",
  },
  samhap: {
    term: "samhap",
    hangul: "삼합",
    hanja: "三合",
    en: "Three-Harmony",
    explain:
      "Three branches that lock together into a single element frame (e.g. 申子辰 → Water). A full set makes that element read as strong regardless of its raw headcount; a 반합 (half, the peak plus one) is a real but weaker pull.",
    explainKo:
      "세 지지가 하나의 오행으로 뭉치는 결합입니다(예: 申子辰 → 수). 셋이 다 모이면 글자 수와 상관없이 그 오행이 강해지고, 왕지에 하나만 더해진 반합은 힘은 약해도 실제로 작용하는 끌림입니다.",
  },
  banghap: {
    term: "banghap",
    hangul: "방합",
    hanja: "方合",
    en: "Directional Union",
    explain:
      "Three branches of the same season/direction joining as one element (e.g. 巳午未 → Fire, summer/south). Like 삼합 it concentrates an element, but through seasonal kinship rather than the harmony triangle.",
    explainKo:
      "같은 계절·방위의 세 지지가 한 오행으로 뭉치는 결합입니다(예: 巳午未 → 화, 여름·남방). 삼합처럼 오행을 모으지만, 삼각 구도가 아니라 같은 계절이라는 인연으로 묶입니다.",
  },
  chung: {
    term: "chung",
    hangul: "충",
    hanja: "沖",
    en: "Clash",
    explain:
      "Two directly opposing branches (six apart, e.g. 子午) meeting in the chart. A clash is friction between the two palaces involved — movement, disruption, or a push-pull to be read, not automatically 'bad'.",
    explainKo:
      "정면으로 마주 보는 두 지지(여섯 칸 떨어진, 예: 子午)가 만나는 것입니다. 충은 두 자리 사이의 마찰 — 움직임·흔들림·밀고 당김으로 읽으며, 무조건 나쁜 것만은 아닙니다.",
  },
};
