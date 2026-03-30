/**
 * Chocobo Stallion Password Encoder/Decoder
 *
 * Based on community reverse-engineering of the PS1 game "チョコボスタリオン" (Chocobo Stallion).
 * The password system encodes chocobo data as 34 hiragana characters (6 bits per character = 204 bits total).
 *
 * Character table: hiragana range U+3041–U+3080 (ぁ to む), mapping index 0–63.
 * Bit layout derived from fan analysis of the game's password format.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type AbilityGrade = "A" | "B" | "C" | "D";

export interface ChocoboAbilities {
  /** 先行力 – leading / dash ability */
  senko: number;
  /** 長距離 – long-distance ability */
  chokyo: number;
  /** 瞬発力 – burst speed */
  shunpatsu: number;
  /** 持続力 – stamina */
  jizoku: number;
  /** 底力 – grit / last-resort power */
  sokojikara: number;
  /** 自在性 – adaptability */
  jizaisei: number;
  /** 加速力 – acceleration */
  kasoku: number;
  /** HP */
  hp: number;
}

export type WingColor =
  | "黄色" | "白" | "水色" | "青" | "緑" | "赤" | "黒" | "黄金";

export type ForeheadColor =
  | "黄色" | "白" | "水色" | "青" | "緑" | "赤" | "黒" | "紫";

export type EyeColor =
  | "黄" | "赤" | "青" | "緑" | "紫" | "橙" | "白" | "黒";

export type BodyType = "普通" | "ずんぐり" | "スレンダー" | "重厚";
export type BodySize = "普通" | "大" | "小";
export type Gender = "雄" | "雌";

export interface ChocoboHabits {
  /** かかり癖 – tendency to charge/rush */
  kakari: boolean;
  /** 出遅れ癖 – tendency for slow start */
  deokure: boolean;
  /** お祭り好き – loves festivals / excitable */
  omatsuri: boolean;
  /** 左回り得意 – strong on left turns */
  hidarimawari: boolean;
  /** 右回り得意 – strong on right turns */
  migimawari: boolean;
  /** 外枠得意 – strong from outside gate */
  sotowaku: boolean;
  /** 内枠得意 – strong from inside gate */
  uchiwaku: boolean;
  /** 晴れ得意 – strong in fine weather */
  hare: boolean;
  /** 雨得意 – strong in rain */
  ame: boolean;
  /** 重馬場得意 – strong on heavy track */
  omoba: boolean;
}

export interface ChocoboParams {
  abilities: ChocoboAbilities;
  name: string;
  gender: Gender;
  wingColor: WingColor;
  foreheadColor: ForeheadColor;
  eyeColor: EyeColor;
  bodyType: BodyType;
  bodySize: BodySize;
  /** Age in years (3–18) */
  ageYear: number;
  /** Age month (1–12) */
  ageMonth: number;
  /** Age week (1–4) */
  ageWeek: number;
  /** Registration month (1–12) */
  regMonth: number;
  /** Registration week (1–4) */
  regWeek: number;
  /** Total wins */
  wins: number;
  /** Total races entered */
  races: number;
  habits: ChocoboHabits;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/** Password length (characters) */
export const PASSWORD_LENGTH = 34;

/**
 * Password character table: 64 characters starting at Unicode U+3041 (ぁ).
 * Index 0 = ぁ (U+3041), index 63 = む (U+3080).
 *
 * Characters (in order, 0–63):
 * ぁあぃいぅうぇえぉお かがきぎくぐけげこご
 * さざしじすずせぜそぞ ただちぢっつづてでとど
 * なにぬねのはばぱひびぴ ふぶぷへべぺほぼぽまみむ
 *
 * Katakana equivalents (ァ–ム, U+30A1–U+30E0) are also accepted and treated
 * as identical to their hiragana counterparts (offset 0x60).
 */
const CHAR_TABLE_START = 0x3041; // ぁ
const CHAR_TABLE_END = 0x3080;   // む

/** Unicode offset from hiragana to the corresponding katakana character. */
const KATAKANA_OFFSET = 0x60;

export const CHAR_TABLE: string = Array.from(
  { length: CHAR_TABLE_END - CHAR_TABLE_START + 1 },
  (_, i) => String.fromCodePoint(CHAR_TABLE_START + i)
).join("");

/** Name character table – same as the password table for name encoding */
const NAME_CHARS: string[] = [
  "ぁ", "あ", "ぃ", "い", "ぅ", "う", "ぇ", "え", "ぉ", "お",
  "か", "が", "き", "ぎ", "く", "ぐ", "け", "げ", "こ", "ご",
  "さ", "ざ", "し", "じ", "す", "ず", "せ", "ぜ", "そ", "ぞ",
  "た", "だ", "ち", "ぢ", "っ", "つ", "づ", "て", "で", "と",
  "ど", "な", "に", "ぬ", "ね", "の", "は", "ば", "ぱ", "ひ",
  "び", "ぴ", "ふ", "ぶ", "ぷ", "へ", "べ", "ぺ", "ほ", "ぼ",
  "ぽ", "ま", "み", "む",
];

export const WING_COLORS: WingColor[] = [
  "黄色", "白", "水色", "青", "緑", "赤", "黒", "黄金",
];

export const FOREHEAD_COLORS: ForeheadColor[] = [
  "黄色", "白", "水色", "青", "緑", "赤", "黒", "紫",
];

export const EYE_COLORS: EyeColor[] = [
  "黄", "赤", "青", "緑", "紫", "橙", "白", "黒",
];

export const BODY_TYPES: BodyType[] = ["普通", "ずんぐり", "スレンダー", "重厚"];
export const BODY_SIZES: BodySize[] = ["普通", "大", "小"];

// ─────────────────────────────────────────────────────────────
// Bit-stream helpers
// ─────────────────────────────────────────────────────────────

/**
 * Convert a password string to an array of 204 bits (each 0 or 1).
 * Accepts both hiragana (ぁ–む, U+3041–U+3080) and their katakana equivalents
 * (ァ–ム, U+30A1–U+30E0). Returns null if the password contains invalid characters.
 */
function passwordToBits(password: string): number[] | null {
  const bits: number[] = [];
  for (const ch of password) {
    let code = ch.codePointAt(0)!;
    // Normalize katakana to hiragana
    if (code >= CHAR_TABLE_START + KATAKANA_OFFSET && code <= CHAR_TABLE_END + KATAKANA_OFFSET) {
      code -= KATAKANA_OFFSET;
    }
    if (code < CHAR_TABLE_START || code > CHAR_TABLE_END) return null;
    const val = code - CHAR_TABLE_START;
    for (let b = 5; b >= 0; b--) {
      bits.push((val >> b) & 1);
    }
  }
  return bits;
}

/** Read `len` bits from the bit array starting at `offset` and return as an unsigned integer. */
function readBits(bits: number[], offset: number, len: number): number {
  let val = 0;
  for (let i = 0; i < len; i++) {
    val = (val << 1) | (bits[offset + i] ?? 0);
  }
  return val;
}

/** Write `len` bits of `value` into the bit array starting at `offset`. */
function writeBits(bits: number[], offset: number, len: number, value: number): void {
  for (let i = len - 1; i >= 0; i--) {
    bits[offset + (len - 1 - i)] = (value >> i) & 1;
  }
}

/** Convert a 204-bit array into a 34-character password string. */
function bitsToPassword(bits: number[]): string {
  let result = "";
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    let val = 0;
    for (let b = 0; b < 6; b++) {
      val = (val << 1) | (bits[i * 6 + b] ?? 0);
    }
    result += String.fromCodePoint(CHAR_TABLE_START + val);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Bit-field layout
//
// Based on community reverse-engineering of the password format.
// Total: 34 chars × 6 bits = 204 bits.
//
// Offset  Length  Field
//  0       8      先行力 (senko)
//  8       8      長距離 (chokyo)
// 16       8      瞬発力 (shunpatsu)
// 24       8      持続力 (jizoku)
// 32       8      底力   (sokojikara)
// 40       8      自在性 (jizaisei)
// 48       8      加速力 (kasoku)
// 56       8      HP
// 64       1      性別   (gender) 0=雄 1=雌
// 65       3      羽色   (wingColor)
// 68       3      額色   (foreheadColor)
// 71       3      目の色  (eyeColor)
// 74       2      体型   (bodyType)
// 76       2      体格   (bodySize)
// 78       4      年齢(年) (ageYear, stored as year-3)
// 82       4      年齢(月) (ageMonth, stored as month-1)
// 86       2      年齢(週) (ageWeek, stored as week-1)
// 88       4      登録(月) (regMonth, stored as month-1)
// 92       2      登録(週) (regWeek, stored as week-1)
// 94       7      勝数   (wins)
// 101      7      出走数  (races)
// 108      1      かかり癖
// 109      1      出遅れ癖
// 110      1      お祭り好き
// 111      1      左回り得意
// 112      1      右回り得意
// 113      1      外枠得意
// 114      1      内枠得意
// 115      1      晴れ得意
// 116      1      雨得意
// 117      1      重馬場得意
// 118      30     名前 (name) – 5 chars × 6 bits (index into NAME_CHARS)
// 148      56     padding / reserved
//   (total 204 bits)
// ─────────────────────────────────────────────────────────────

const OFF = {
  senko:       0,
  chokyo:      8,
  shunpatsu:  16,
  jizoku:     24,
  sokojikara: 32,
  jizaisei:   40,
  kasoku:     48,
  hp:         56,
  gender:     64,
  wingColor:  65,
  foreheadColor: 68,
  eyeColor:   71,
  bodyType:   74,
  bodySize:   76,
  ageYear:    78,
  ageMonth:   82,
  ageWeek:    86,
  regMonth:   88,
  regWeek:    92,
  wins:       94,
  races:      101,
  kakari:     108,
  deokure:    109,
  omatsuri:   110,
  hidari:     111,
  migi:       112,
  soto:       113,
  uchi:       114,
  hare:       115,
  ame:        116,
  omoba:      117,
  name:       118,  // 5 chars × 6 bits = 30 bits
} as const;

/** Maximum name length (characters) */
const MAX_NAME_LENGTH = 5;

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Decode a 34-character password string into chocobo parameters.
 * Returns null if the password is invalid (wrong length or bad characters).
 */
export function decodePassword(password: string): ChocoboParams | null {
  if (password.length !== PASSWORD_LENGTH) return null;

  const bits = passwordToBits(password);
  if (!bits) return null;

  // Decode name (5 chars × 6 bits)
  let name = "";
  for (let i = 0; i < MAX_NAME_LENGTH; i++) {
    const idx = readBits(bits, OFF.name + i * 6, 6);
    if (idx < NAME_CHARS.length) {
      name += NAME_CHARS[idx];
    }
  }
  // Trim trailing ぁ (index 0) which is used as padding
  name = name.replace(/^ぁ+|ぁ+$/g, "").trim();

  const ageYearRaw  = readBits(bits, OFF.ageYear, 4);
  const ageMonthRaw = readBits(bits, OFF.ageMonth, 4);
  const ageWeekRaw  = readBits(bits, OFF.ageWeek, 2);
  const regMonthRaw = readBits(bits, OFF.regMonth, 4);
  const regWeekRaw  = readBits(bits, OFF.regWeek, 2);

  return {
    abilities: {
      senko:       readBits(bits, OFF.senko,      8),
      chokyo:      readBits(bits, OFF.chokyo,     8),
      shunpatsu:   readBits(bits, OFF.shunpatsu,  8),
      jizoku:      readBits(bits, OFF.jizoku,     8),
      sokojikara:  readBits(bits, OFF.sokojikara, 8),
      jizaisei:    readBits(bits, OFF.jizaisei,   8),
      kasoku:      readBits(bits, OFF.kasoku,     8),
      hp:          readBits(bits, OFF.hp,         8),
    },
    name,
    gender:        readBits(bits, OFF.gender, 1) === 0 ? "雄" : "雌",
    wingColor:     WING_COLORS[readBits(bits, OFF.wingColor, 3)] ?? WING_COLORS[0],
    foreheadColor: FOREHEAD_COLORS[readBits(bits, OFF.foreheadColor, 3)] ?? FOREHEAD_COLORS[0],
    eyeColor:      EYE_COLORS[readBits(bits, OFF.eyeColor, 3)] ?? EYE_COLORS[0],
    bodyType:      BODY_TYPES[readBits(bits, OFF.bodyType, 2)] ?? BODY_TYPES[0],
    bodySize:      BODY_SIZES[readBits(bits, OFF.bodySize, 2) % BODY_SIZES.length] ?? BODY_SIZES[0],
    ageYear:       Math.max(3, ageYearRaw + 3),
    ageMonth:      Math.max(1, ageMonthRaw + 1),
    ageWeek:       Math.max(1, ageWeekRaw + 1),
    regMonth:      Math.max(1, regMonthRaw + 1),
    regWeek:       Math.max(1, regWeekRaw + 1),
    wins:          readBits(bits, OFF.wins,  7),
    races:         readBits(bits, OFF.races, 7),
    habits: {
      kakari:       readBits(bits, OFF.kakari,   1) === 1,
      deokure:      readBits(bits, OFF.deokure,  1) === 1,
      omatsuri:     readBits(bits, OFF.omatsuri, 1) === 1,
      hidarimawari: readBits(bits, OFF.hidari,   1) === 1,
      migimawari:   readBits(bits, OFF.migi,     1) === 1,
      sotowaku:     readBits(bits, OFF.soto,     1) === 1,
      uchiwaku:     readBits(bits, OFF.uchi,     1) === 1,
      hare:         readBits(bits, OFF.hare,     1) === 1,
      ame:          readBits(bits, OFF.ame,      1) === 1,
      omoba:        readBits(bits, OFF.omoba,    1) === 1,
    },
  };
}

/**
 * Encode chocobo parameters into a 34-character password string.
 */
export function encodePassword(params: ChocoboParams): string {
  const bits: number[] = new Array(PASSWORD_LENGTH * 6).fill(0);

  const { abilities, habits } = params;

  writeBits(bits, OFF.senko,      8, clamp(abilities.senko,      0, 255));
  writeBits(bits, OFF.chokyo,     8, clamp(abilities.chokyo,     0, 255));
  writeBits(bits, OFF.shunpatsu,  8, clamp(abilities.shunpatsu,  0, 255));
  writeBits(bits, OFF.jizoku,     8, clamp(abilities.jizoku,     0, 255));
  writeBits(bits, OFF.sokojikara, 8, clamp(abilities.sokojikara, 0, 255));
  writeBits(bits, OFF.jizaisei,   8, clamp(abilities.jizaisei,   0, 255));
  writeBits(bits, OFF.kasoku,     8, clamp(abilities.kasoku,     0, 255));
  writeBits(bits, OFF.hp,         8, clamp(abilities.hp,         0, 255));

  writeBits(bits, OFF.gender,        1, params.gender === "雌" ? 1 : 0);
  writeBits(bits, OFF.wingColor,     3, WING_COLORS.indexOf(params.wingColor));
  writeBits(bits, OFF.foreheadColor, 3, FOREHEAD_COLORS.indexOf(params.foreheadColor));
  writeBits(bits, OFF.eyeColor,      3, EYE_COLORS.indexOf(params.eyeColor));
  writeBits(bits, OFF.bodyType,      2, BODY_TYPES.indexOf(params.bodyType));
  writeBits(bits, OFF.bodySize,      2, BODY_SIZES.indexOf(params.bodySize));

  writeBits(bits, OFF.ageYear,   4, clamp(params.ageYear  - 3, 0, 15));
  writeBits(bits, OFF.ageMonth,  4, clamp(params.ageMonth - 1, 0, 11));
  writeBits(bits, OFF.ageWeek,   2, clamp(params.ageWeek  - 1, 0, 3));
  writeBits(bits, OFF.regMonth,  4, clamp(params.regMonth - 1, 0, 11));
  writeBits(bits, OFF.regWeek,   2, clamp(params.regWeek  - 1, 0, 3));

  writeBits(bits, OFF.wins,  7, clamp(params.wins,  0, 127));
  writeBits(bits, OFF.races, 7, clamp(params.races, 0, 127));

  writeBits(bits, OFF.kakari,   1, habits.kakari       ? 1 : 0);
  writeBits(bits, OFF.deokure,  1, habits.deokure      ? 1 : 0);
  writeBits(bits, OFF.omatsuri, 1, habits.omatsuri     ? 1 : 0);
  writeBits(bits, OFF.hidari,   1, habits.hidarimawari ? 1 : 0);
  writeBits(bits, OFF.migi,     1, habits.migimawari   ? 1 : 0);
  writeBits(bits, OFF.soto,     1, habits.sotowaku     ? 1 : 0);
  writeBits(bits, OFF.uchi,     1, habits.uchiwaku     ? 1 : 0);
  writeBits(bits, OFF.hare,     1, habits.hare         ? 1 : 0);
  writeBits(bits, OFF.ame,      1, habits.ame          ? 1 : 0);
  writeBits(bits, OFF.omoba,    1, habits.omoba        ? 1 : 0);

  // Encode name (up to 5 chars)
  const nameTrimmed = params.name.slice(0, MAX_NAME_LENGTH).padEnd(MAX_NAME_LENGTH, "ぁ");
  for (let i = 0; i < MAX_NAME_LENGTH; i++) {
    const ch = nameTrimmed[i];
    const idx = NAME_CHARS.indexOf(ch);
    writeBits(bits, OFF.name + i * 6, 6, idx >= 0 ? idx : 0);
  }

  return bitsToPassword(bits);
}

// ─────────────────────────────────────────────────────────────
// Derived statistics
// ─────────────────────────────────────────────────────────────

/** Map a raw ability value (0–255) to a letter grade. */
export function getAbilityGrade(value: number): AbilityGrade {
  if (value >= 121) return "A";
  if (value >= 86)  return "B";
  if (value >= 51)  return "C";
  return "D";
}

/**
 * Calculate the theoretical maximum ability value, assuming the chocobo is
 * at 3 years 1 month 1 week (before any training).
 *
 * Growth margins per stat:
 *  - 長距離: current + 65
 *  - All others: current + 75
 */
export function calcMaxAbility(current: number, stat: keyof ChocoboAbilities): number {
  if (stat === "hp") return current; // HP doesn't grow
  const growth = stat === "chokyo" ? 65 : 75;
  return Math.min(255, current + growth);
}

/**
 * A1 – average of the 7 main ability values (excluding HP).
 */
export function calcA1(abilities: ChocoboAbilities): number {
  const { senko, chokyo, shunpatsu, jizoku, sokojikara, jizaisei, kasoku } = abilities;
  return Math.round((senko + chokyo + shunpatsu + jizoku + sokojikara + jizaisei + kasoku) / 7);
}

/**
 * A2 – average of all 8 values including HP.
 */
export function calcA2(abilities: ChocoboAbilities): number {
  const { senko, chokyo, shunpatsu, jizoku, sokojikara, jizaisei, kasoku, hp } = abilities;
  return Math.round((senko + chokyo + shunpatsu + jizoku + sokojikara + jizaisei + kasoku + hp) / 8);
}

/**
 * A3 – average of 先行, 瞬発, 加速 (sprint-oriented stats).
 */
export function calcA3(abilities: ChocoboAbilities): number {
  const { senko, shunpatsu, kasoku } = abilities;
  return Math.round((senko + shunpatsu + kasoku) / 3);
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Validate whether all characters in the password are in the character table.
 *  Accepts both hiragana (ぁ–む) and their katakana equivalents (ァ–ム). */
export function isValidPassword(password: string): boolean {
  if (password.length !== PASSWORD_LENGTH) return false;
  for (const ch of password) {
    let code = ch.codePointAt(0)!;
    // Normalize katakana to hiragana
    if (code >= CHAR_TABLE_START + KATAKANA_OFFSET && code <= CHAR_TABLE_END + KATAKANA_OFFSET) {
      code -= KATAKANA_OFFSET;
    }
    if (code < CHAR_TABLE_START || code > CHAR_TABLE_END) return false;
  }
  return true;
}

/** Default/blank chocobo parameters. */
export function defaultParams(): ChocoboParams {
  return {
    abilities: {
      senko: 100,
      chokyo: 100,
      shunpatsu: 100,
      jizoku: 100,
      sokojikara: 100,
      jizaisei: 100,
      kasoku: 100,
      hp: 100,
    },
    name: "ちょこぼ",
    gender: "雄",
    wingColor: "黄色",
    foreheadColor: "黄色",
    eyeColor: "黄",
    bodyType: "普通",
    bodySize: "普通",
    ageYear: 3,
    ageMonth: 1,
    ageWeek: 1,
    regMonth: 1,
    regWeek: 1,
    wins: 0,
    races: 0,
    habits: {
      kakari: false,
      deokure: false,
      omatsuri: false,
      hidarimawari: false,
      migimawari: false,
      sotowaku: false,
      uchiwaku: false,
      hare: false,
      ame: false,
      omoba: false,
    },
  };
}
