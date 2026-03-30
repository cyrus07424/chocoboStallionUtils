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
  | "白" | "黒" | "黄金" | "赤" | "青" | "緑" | "黄色" | "紫" | "桃" | "灰"
  | "水色";

export type ForeheadColor =
  | "赤" | "無" | "虹"
  | "黄色" | "白" | "水色" | "青" | "緑" | "黒" | "紫";

export type EyeColor =
  | "赤" | "青" | "緑"
  | "黄" | "紫" | "橙" | "白" | "黒";

export type BodyType = "やせ" | "普通" | "デブ" | "ずんぐり" | "スレンダー" | "重厚";
export type BodySize = "低" | "中" | "高" | "普通" | "大" | "小";
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
  dart: "" | "△" | "○" | "◎";
  round: "なし" | "右" | "左" | "右左";
  temp: "なし" | "暑" | "寒" | "暑寒";
  kakari: "なし" | "あり";
  aori: "なし" | "あり";
  irekomi: "なし" | "あり";
  festival: number;
  kisyo: "" | "○";
  slot: "" | "○";
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  a5: number;
  senJizai: number;
  senShun: number;
  shunKa: number;
  senKa: number;
  agari: "なし" | "あり";
  cross: "なし" | "あり";
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/** Password length (characters) */
export const PASSWORD_LENGTH = 34;

/**
 * 旧エンコード処理で使用している64文字テーブル。
 * デコードは別の128コード表を利用する。
 */
const CHAR_TABLE_START = 0x3041; // ぁ
const CHAR_TABLE_END = 0x3080;   // む

/** Unicode offset from hiragana to the corresponding katakana character. */
const KATAKANA_OFFSET = 0x60;

export const CHAR_TABLE: string = Array.from(
  { length: CHAR_TABLE_END - CHAR_TABLE_START + 1 },
  (_, i) => String.fromCodePoint(CHAR_TABLE_START + i)
).join("");

// decode_pass() の 0..127 対応表をそのまま移植
const LIVE_PASSWORD_CHARS: string[] = [
  "ヅ", "デ", "ド", "ダ", "ヂ", "か", "き", "く", "け", "こ", "さ", "し", "す", "せ", "そ", "た",
  "ち", "つ", "て", "と", "な", "に", "ぬ", "ね", "の", "は", "ひ", "ふ", "ぁ", "ほ", "ま", "み",
  "む", "め", "も", "や", "ゆ", "よ", "ら", "り", "る", "れ", "ろ", "わ", "を", "バ", "が", "ぎ",
  "ぐ", "げ", "ご", "ざ", "じ", "ず", "ぜ", "ぞ", "だ", "ぢ", "づ", "で", "ど", "ば", "び", "ぶ",
  "ぃ", "ぼ", "ビ", "ブ", "ぅ", "ボ", "ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ",
  "サ", "シ", "ス", "セ", "ソ", "タ", "チ", "ツ", "テ", "ト", "ナ", "ニ", "ヌ", "ネ", "ノ", "ハ",
  "ヒ", "フ", "ぇ", "ホ", "マ", "ミ", "ム", "メ", "モ", "ヤ", "ユ", "ヨ", "ラ", "リ", "ル", "レ",
  "ロ", "ワ", "ヲ", "ン", "ヴ", "ガ", "ギ", "グ", "ゲ", "ゴ", "ッ", "ザ", "ジ", "ズ", "ゼ", "ゾ",
];

const LIVE_PASSWORD_CHAR_TO_CODE: Readonly<Record<string, number>> = Object.freeze(
  LIVE_PASSWORD_CHARS.reduce<Record<string, number>>((acc, ch, idx) => {
    acc[ch] = idx;
    return acc;
  }, {})
);

const LIVE_NAME_CODE_TO_CHAR: string[] = [
  "", "ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ", "サ", "シ", "ス", "セ", "ソ",
  "タ", "チ", "ツ", "テ", "ト", "ナ", "ニ", "ヌ", "ネ", "ノ", "ハ", "ヒ", "フ", "ヘ", "ホ", "マ",
  "ミ", "ム", "メ", "モ", "ヤ", "ユ", "ヨ", "ラ", "リ", "ル", "レ", "ロ", "ワ", "ヲ", "ン", "ヴ",
  "ガ", "ギ", "グ", "ゲ", "ゴ", "ザ", "ジ", "ズ", "ゼ", "ゾ", "ダ", "ヂ", "ヅ", "デ", "ド", "バ",
  "ビ", "ブ", "ベ", "ボ", "パ", "ピ", "プ", "ペ", "ポ", "ァ", "ィ", "ゥ", "ェ", "ォ", "ッ", "ャ",
  "ュ", "ョ", "ー", "０", "１", "２", "３", "４", "５", "６", "７", "８", "９",
];

const LIVE_NAME_CODE_INDEXES = [26, 1, 24, 3, 15, 5, 20, 7, 17, 29] as const;
const LIVE_WING_COLORS: WingColor[] = ["白", "黒", "黄金", "赤", "青", "緑", "黄色", "紫", "桃", "灰"];
const LIVE_FOREHEAD_COLORS: ForeheadColor[] = ["赤", "無", "虹"];
const LIVE_EYE_COLORS: EyeColor[] = ["赤", "青", "緑"];
const LIVE_BODY_SIZES: BodySize[] = ["低", "中", "高"];
const LIVE_BODY_TYPES: BodyType[] = ["やせ", "普通", "デブ"];
const LIVE_DARTS = ["", "△", "○", "◎"] as const;
const LIVE_ROUNDS = ["なし", "右", "左", "右左"] as const;
const LIVE_TEMPS = ["なし", "暑", "寒", "暑寒"] as const;

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
  const normalized = password.replace(/[ 　]/g, "");
  if (normalized.length !== PASSWORD_LENGTH) return null;

  const code: number[] = [];
  for (const ch of normalized) {
    const value = LIVE_PASSWORD_CHAR_TO_CODE[ch];
    if (value === undefined) return null;
    code.push(value);
  }

  let name = "";
  for (const idx of LIVE_NAME_CODE_INDEXES) {
    const ch = LIVE_NAME_CODE_TO_CHAR[code[idx] ?? -1];
    if (ch === undefined) return null;
    name += ch;
  }

  const senko = Math.floor((code[19] % 16) * 16 + code[6] / 8);
  const chokyo = Math.floor((code[6] % 8) * 32 + code[21] / 4);
  const shunpatsu = Math.floor((code[21] % 4) * 64 + code[22] / 2);
  const jizoku = Math.floor((code[22] % 2) * 128 + code[23]);
  const sokojikara = Math.floor((code[10] % 16) * 16 + code[11] / 8);
  const jizaisei = Math.floor(code[2] * 2 + code[25] / 64);
  const kasoku = Math.floor((code[25] % 64) * 4 + code[0] / 32);
  const hp = Math.floor((code[0] % 32) * 8 + code[10] / 16);

  const ageYear = Math.floor((code[14] % 32) / 2);
  const ageMonth = Math.floor(code[27] / 8);
  const ageWeek = Math.floor((code[27] % 8) / 2 + 1);
  const races = Math.floor(code[28] / 2);
  const wins = Math.floor(code[12] / 4);

  const genderCode = Math.floor((code[16] % 16) / 8);
  const wingColorCode = Math.floor((code[13] % 4) * 4 + code[14] / 32);
  const foreheadColorCode = Math.floor((code[4] % 16) / 4);
  const bodySizeCode = Math.floor((code[14] % 2) * 2 + code[4] / 64);
  const bodyTypeCode = Math.floor((code[4] % 64) / 16);
  const eyeColorCode = code[4] % 4;

  const roundCode = Math.floor((code[8] % 16) / 4);
  const tempCode = code[8] % 4;
  const dartCode = Math.floor((code[16] % 64) / 16);
  const type = Math.floor(code[19] / 16);
  const type26 = Math.floor(type / 4);
  const type27 = Math.floor((type % 4) / 2);
  const type28 = type % 2;
  const matsuri = Math.floor((code[16] % 8) * 2 + code[8] / 64);
  const kisyoCode = Math.floor((code[18] % 8) / 2);
  const slotCode = code[11] % 2;
  const crossCode = code[18] % 2;
  const agariCode = Math.floor((code[18] % 4) / 2);

  const a1 = Math.floor((senko + chokyo + shunpatsu + jizoku + sokojikara + jizaisei + kasoku) / 7);
  const a2 = Math.floor((senko + chokyo + shunpatsu + jizoku + sokojikara + jizaisei + kasoku + hp) / 8);
  const a3 = Math.floor((senko + shunpatsu + kasoku) / 3);
  const a4 = Math.floor((senko + shunpatsu + jizaisei + kasoku) / 4);
  const a5 = Math.floor((senko + chokyo + shunpatsu + jizaisei + kasoku) / 5);
  const senJizai = Math.floor((senko + jizaisei) / 2);
  const senShun = Math.floor((senko + shunpatsu) / 2);
  const shunKa = Math.floor((shunpatsu + kasoku) / 2);
  const senKa = Math.floor((senko + kasoku) / 2);

  return {
    abilities: {
      senko,
      chokyo,
      shunpatsu,
      jizoku,
      sokojikara,
      jizaisei,
      kasoku,
      hp,
    },
    name,
    gender: genderCode === 1 ? "雌" : "雄",
    wingColor: LIVE_WING_COLORS[wingColorCode] ?? LIVE_WING_COLORS[0],
    foreheadColor: LIVE_FOREHEAD_COLORS[foreheadColorCode] ?? LIVE_FOREHEAD_COLORS[0],
    eyeColor: LIVE_EYE_COLORS[eyeColorCode] ?? LIVE_EYE_COLORS[0],
    bodyType: LIVE_BODY_TYPES[bodyTypeCode] ?? LIVE_BODY_TYPES[0],
    bodySize: LIVE_BODY_SIZES[bodySizeCode] ?? LIVE_BODY_SIZES[0],
    ageYear,
    ageMonth,
    ageWeek,
    regMonth: ageMonth,
    regWeek: ageWeek,
    wins,
    races,
    habits: {
      kakari: type26 === 1,
      deokure: type27 === 1,
      omatsuri: matsuri > 0,
      hidarimawari: roundCode === 2 || roundCode === 3,
      migimawari: roundCode === 1 || roundCode === 3,
      sotowaku: false,
      uchiwaku: false,
      hare: tempCode === 1 || tempCode === 3,
      ame: tempCode === 2 || tempCode === 3,
      omoba: false,
    },
    dart: LIVE_DARTS[dartCode] ?? "",
    round: LIVE_ROUNDS[roundCode] ?? "なし",
    temp: LIVE_TEMPS[tempCode] ?? "なし",
    kakari: type26 === 1 ? "あり" : "なし",
    aori: type27 === 1 ? "あり" : "なし",
    irekomi: type28 === 1 ? "あり" : "なし",
    festival: matsuri,
    kisyo: kisyoCode === 2 || kisyoCode === 3 ? "○" : "",
    slot: slotCode === 1 ? "○" : "",
    a1,
    a2,
    a3,
    a4,
    a5,
    senJizai,
    senShun,
    shunKa,
    senKa,
    agari: agariCode === 1 ? "あり" : "なし",
    cross: crossCode === 1 ? "あり" : "なし",
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
  const normalized = password.replace(/[ 　]/g, "");
  if (normalized.length !== PASSWORD_LENGTH) return false;
  for (const ch of normalized) {
    if (LIVE_PASSWORD_CHAR_TO_CODE[ch] === undefined) return false;
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
    dart: "",
    round: "なし",
    temp: "なし",
    kakari: "なし",
    aori: "なし",
    irekomi: "なし",
    festival: 0,
    kisyo: "",
    slot: "",
    a1: 100,
    a2: 100,
    a3: 100,
    a4: 100,
    a5: 100,
    senJizai: 100,
    senShun: 100,
    shunKa: 100,
    senKa: 100,
    agari: "なし",
    cross: "なし",
  };
}
