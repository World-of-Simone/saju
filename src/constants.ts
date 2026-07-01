/**
 * Core Saju constants: the 10 Heavenly Stems (천간) and 12 Earthly Branches (지지),
 * their elements, polarities, hidden stems, and the Ten Gods (십성) relationships.
 *
 * Labels are provided in Korean (hangul + hanja) and English. We deliberately use
 * Korean romanization, NOT pinyin. `note` fields exist to teach the user, because
 * several traditional term translations are confusing or misleading.
 */

export type Element = "wood" | "fire" | "earth" | "metal" | "water";
export type Polarity = "yang" | "yin";

export const ELEMENT_KO: Record<Element, string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

export const ELEMENT_EN: Record<Element, string> = {
  wood: "Wood",
  fire: "Fire",
  earth: "Earth",
  metal: "Metal",
  water: "Water",
};

export const POLARITY_KO: Record<Polarity, string> = { yang: "양(陽)", yin: "음(陰)" };
export const POLARITY_EN: Record<Polarity, string> = { yang: "Yang", yin: "Yin" };

export interface Stem {
  index: number; // 0..9
  hanja: string;
  hangul: string; // Korean reading
  roman: string; // Revised Romanization of the Korean reading
  element: Element;
  polarity: Polarity;
}

export interface Branch {
  index: number; // 0..11
  hanja: string;
  hangul: string;
  roman: string;
  element: Element;
  polarity: Polarity;
  animalKo: string;
  animalEn: string;
  /** Hidden stems (지장간): stem indices concealed inside the branch, main qi last-weighted. */
  hiddenStems: number[];
}

/** 10 Heavenly Stems — 천간 (cheon-gan). */
export const STEMS: Stem[] = [
  { index: 0, hanja: "甲", hangul: "갑", roman: "Gap", element: "wood", polarity: "yang" },
  { index: 1, hanja: "乙", hangul: "을", roman: "Eul", element: "wood", polarity: "yin" },
  { index: 2, hanja: "丙", hangul: "병", roman: "Byeong", element: "fire", polarity: "yang" },
  { index: 3, hanja: "丁", hangul: "정", roman: "Jeong", element: "fire", polarity: "yin" },
  { index: 4, hanja: "戊", hangul: "무", roman: "Mu", element: "earth", polarity: "yang" },
  { index: 5, hanja: "己", hangul: "기", roman: "Gi", element: "earth", polarity: "yin" },
  { index: 6, hanja: "庚", hangul: "경", roman: "Gyeong", element: "metal", polarity: "yang" },
  { index: 7, hanja: "辛", hangul: "신", roman: "Sin", element: "metal", polarity: "yin" },
  { index: 8, hanja: "壬", hangul: "임", roman: "Im", element: "water", polarity: "yang" },
  { index: 9, hanja: "癸", hangul: "계", roman: "Gye", element: "water", polarity: "yin" },
];

/** 12 Earthly Branches — 지지 (ji-ji). Hidden stems per classical table. */
export const BRANCHES: Branch[] = [
  { index: 0, hanja: "子", hangul: "자", roman: "Ja", element: "water", polarity: "yang", animalKo: "쥐", animalEn: "Rat", hiddenStems: [9] },
  { index: 1, hanja: "丑", hangul: "축", roman: "Chuk", element: "earth", polarity: "yin", animalKo: "소", animalEn: "Ox", hiddenStems: [5, 9, 7] },
  { index: 2, hanja: "寅", hangul: "인", roman: "In", element: "wood", polarity: "yang", animalKo: "호랑이", animalEn: "Tiger", hiddenStems: [0, 2, 4] },
  { index: 3, hanja: "卯", hangul: "묘", roman: "Myo", element: "wood", polarity: "yin", animalKo: "토끼", animalEn: "Rabbit", hiddenStems: [1] },
  { index: 4, hanja: "辰", hangul: "진", roman: "Jin", element: "earth", polarity: "yang", animalKo: "용", animalEn: "Dragon", hiddenStems: [4, 1, 9] },
  { index: 5, hanja: "巳", hangul: "사", roman: "Sa", element: "fire", polarity: "yin", animalKo: "뱀", animalEn: "Snake", hiddenStems: [2, 6, 4] },
  { index: 6, hanja: "午", hangul: "오", roman: "O", element: "fire", polarity: "yang", animalKo: "말", animalEn: "Horse", hiddenStems: [3, 5] },
  { index: 7, hanja: "未", hangul: "미", roman: "Mi", element: "earth", polarity: "yin", animalKo: "양", animalEn: "Goat", hiddenStems: [5, 3, 1] },
  { index: 8, hanja: "申", hangul: "신", roman: "Sin", element: "metal", polarity: "yang", animalKo: "원숭이", animalEn: "Monkey", hiddenStems: [6, 8, 4] },
  { index: 9, hanja: "酉", hangul: "유", roman: "Yu", element: "metal", polarity: "yin", animalKo: "닭", animalEn: "Rooster", hiddenStems: [7] },
  { index: 10, hanja: "戌", hangul: "술", roman: "Sul", element: "earth", polarity: "yang", animalKo: "개", animalEn: "Dog", hiddenStems: [4, 7, 3] },
  { index: 11, hanja: "亥", hangul: "해", roman: "Hae", element: "water", polarity: "yin", animalKo: "돼지", animalEn: "Pig", hiddenStems: [8, 0] },
];

/** Five-element generating (생) cycle: producer -> produced. */
export const GENERATES: Record<Element, Element> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

/** Five-element controlling (극) cycle: controller -> controlled. */
export const CONTROLS: Record<Element, Element> = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};

export type TenGodKey =
  | "bigyeon" | "geopjae"
  | "siksin" | "sanggwan"
  | "pyeonjae" | "jeongjae"
  | "pyeongwan" | "jeonggwan"
  | "pyeonin" | "jeongin";

export interface TenGod {
  key: TenGodKey;
  hangul: string;
  hanja: string;
  en: string;
  /** A plain-language teaching note; traditional English names are often misleading. */
  note: string;
}

export const TEN_GODS: Record<TenGodKey, TenGod> = {
  bigyeon: { key: "bigyeon", hangul: "비견", hanja: "比肩", en: "Companion", note: "Same element & same polarity as your Day Master — peers, siblings, self-reliance, competition among equals." },
  geopjae: { key: "geopjae", hangul: "겁재", hanja: "劫財", en: "Rival", note: "Same element, opposite polarity. Literally 'rob wealth' — think rivals/allies who both help and compete for resources." },
  siksin: { key: "siksin", hangul: "식신", hanja: "食神", en: "Output (Eating God)", note: "What your Day Master produces, same polarity. Steady creativity, expression, nurturing, enjoyment. 'Eating God' is a literal, misleading name — it means productive output, not food." },
  sanggwan: { key: "sanggwan", hangul: "상관", hanja: "傷官", en: "Expression (Hurting Officer)", note: "What you produce, opposite polarity. Bold, unconventional expression and talent. 'Hurting Officer' sounds negative but denotes rule-breaking brilliance." },
  pyeonjae: { key: "pyeonjae", hangul: "편재", hanja: "偏財", en: "Indirect Wealth", note: "What your Day Master controls, same polarity. Fluid/opportunistic wealth, ventures, generosity." },
  jeongjae: { key: "jeongjae", hangul: "정재", hanja: "正財", en: "Direct Wealth", note: "What you control, opposite polarity. Stable, earned, managed wealth; in classical texts also the wife for a male chart." },
  pyeongwan: { key: "pyeongwan", hangul: "편관", hanja: "偏官", en: "Indirect Authority (Seven Killings)", note: "What controls your Day Master, same polarity. Pressure, drive, discipline, power. Also called 칠살 (Seven Killings) — intense but not inherently bad." },
  jeonggwan: { key: "jeonggwan", hangul: "정관", hanja: "正官", en: "Direct Authority", note: "What controls you, opposite polarity. Legitimate status, responsibility, structure, reputation." },
  pyeonin: { key: "pyeonin", hangul: "편인", hanja: "偏印", en: "Indirect Resource", note: "What produces your Day Master, same polarity. Unconventional learning, intuition, insight; sometimes overthinking." },
  jeongin: { key: "jeongin", hangul: "정인", hanja: "正印", en: "Direct Resource", note: "What produces you, opposite polarity. Nurturing support, education, mother figure, steady knowledge." },
};

/**
 * Five Tigers rule (오호둔): the Heavenly Stem of the first solar month (寅/In / Tiger month)
 * for each year stem. Indexed by yearStem % 5.
 */
export const FIVE_TIGERS_MONTH_STEM = [2, 4, 6, 8, 0]; // 甲己->丙, 乙庚->戊, 丙辛->庚, 丁壬->壬, 戊癸->甲

/**
 * Five Rats rule (오서둔): the Heavenly Stem of the 子/Ja (Rat) hour for each day stem.
 * Indexed by dayStem % 5.
 */
export const FIVE_RATS_HOUR_STEM = [0, 2, 4, 6, 8]; // 甲己->甲, 乙庚->丙, 丙辛->戊, 丁壬->庚, 戊癸->壬
