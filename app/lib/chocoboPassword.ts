/**
 * Chocobo Stallion Password Encoder/Decoder
 *
 * Based on community reverse-engineering of the PS1 game "チョコボスタリオン" (Chocobo Stallion).
 * The password system encodes chocobo data as 34 characters (7 bits per character = 238 bits total).
 *
 * Password character table: PASSWORD_CHARS (128 entries, index 0–127).
 * Bit layout derived from fan analysis of the game's password format.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type AbilityGrade = "A" | "B" | "C" | "D";

/** 羽色の選択肢（コード値 0–9 に対応） */
export const WING_COLORS = ["白色", "黒色", "金色", "赤色", "青色", "緑色", "黄色", "紫色", "桃色", "灰色"] as const;
/** 額色の選択肢（コード値 0–2 に対応） */
export const FOREHEAD_COLORS = ["赤色", "無", "虹色"] as const;
/** 目の色の選択肢（コード値 0–2 に対応） */
export const EYE_COLORS = ["赤色", "青色", "緑色"] as const;
/** 体型の選択肢（コード値 0–2：やせ / 普通 / デブ） */
export const BODY_TYPES = ["やせ", "普通", "デブ"] as const;
/** 体格（大きさ）の選択肢（コード値 0–2：低 / 中 / 高） */
export const BODY_SIZES = ["低", "中", "高"] as const;
/** 性別の選択肢（コード値 0–1：♂ / ♀） */
export const GENDER_VALUES = ["♂", "♀"] as const;
/** ダートの選択肢（コード値 0–3：✕ / △ / ○ / ◎） */
export const DART_VALUES = ["✕", "△", "○", "◎"] as const;
/** 周り（コース方向得意）の選択肢（コード値 0–3：なし / 右 / 左 / 右左） */
export const ROUND_VALUES = ["なし", "右", "左", "右左"] as const;
/** 気温（得意気候）の選択肢（コード値 0–3：なし / 暑 / 寒 / 暑寒） */
export const TEMP_VALUES = ["なし", "暑", "寒", "暑寒"] as const;
/** あり／なしの選択肢（コード値 0–1） */
export const ARI_NASHI_VALUES = ["なし", "あり"] as const;
/** ✕／○ の選択肢（コード値 0–1） */
export const XO_VALUES = ["✕", "○"] as const;

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

export type WingColor = typeof WING_COLORS[number];
export type ForeheadColor = typeof FOREHEAD_COLORS[number];
export type EyeColor = typeof EYE_COLORS[number];
export type BodyType = typeof BODY_TYPES[number];
export type BodySize = typeof BODY_SIZES[number];
export type Gender = typeof GENDER_VALUES[number];
export type Dart = typeof DART_VALUES[number];
export type Round = typeof ROUND_VALUES[number];
export type Temp = typeof TEMP_VALUES[number];
export type AriNashi = typeof ARI_NASHI_VALUES[number];
export type XO = typeof XO_VALUES[number];

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
    dart: Dart;
    round: Round;
    temp: Temp;
    kakari: AriNashi;
    aori: AriNashi;
    irekomi: AriNashi;
    /** 祭 – お祭りイベント回数 (0–15) */
    festival: number;
    /** 気性 – 気性難の有無 */
    kisyo: XO;
    /** スロット – スロット補正の有無 */
    slot: XO;
    /** A1 – 7能力値（HP除く）の平均 */
    a1: number;
    /** A2 – 8能力値（HP含む）の平均 */
    a2: number;
    /** A3 – 先行力・瞬発力・加速力の平均 */
    a3: number;
    /** A4 – 先行力・瞬発力・自在性・加速力の平均 */
    a4: number;
    /** A5 – 先行力・長距離・瞬発力・自在性・加速力の平均 */
    a5: number;
    /** 先自 – 先行力と自在性の平均 */
    senJizai: number;
    /** 先瞬 – 先行力と瞬発力の平均 */
    senShun: number;
    /** 瞬加 – 瞬発力と加速力の平均 */
    shunKa: number;
    /** 先加 – 先行力と加速力の平均 */
    senKa: number;
    /** あがり症 – あがり症の有無 */
    agari: AriNashi;
    /** クロス病 – クロス病の有無 */
    cross: AriNashi;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/** Password length (characters) */
export const PASSWORD_LENGTH = 34;

/**
 * 羽名エンコード時に、ひらがな（ぁ–む）をカタカナへ変換するための範囲定数。
 * KATAKANA_OFFSET を加算することで対応するカタカナのコードポイントに変換する。
 */
const CHAR_TABLE_START = 0x3041; // ぁ (U+3041)
const CHAR_TABLE_END = 0x3080;   // む (U+3080)

/** Unicode offset from hiragana to the corresponding katakana character. */
const KATAKANA_OFFSET = 0x60;

/**
 * パスワードの文字コードテーブル（128エントリ、インデックス 0–127）。
 * パスワードの各文字はこの配列のインデックスとして 7 ビットで表現される。
 */
const PASSWORD_CHARS: string[] = [
    "ヅ", "デ", "ド", "ダ", "ヂ", "か", "き", "く", "け", "こ", "さ", "し", "す", "せ", "そ", "た",
    "ち", "つ", "て", "と", "な", "に", "ぬ", "ね", "の", "は", "ひ", "ふ", "ぁ", "ほ", "ま", "み",
    "む", "め", "も", "や", "ゆ", "よ", "ら", "り", "る", "れ", "ろ", "わ", "を", "バ", "が", "ぎ",
    "ぐ", "げ", "ご", "ざ", "じ", "ず", "ぜ", "ぞ", "だ", "ぢ", "づ", "で", "ど", "ば", "び", "ぶ",
    "ぃ", "ぼ", "ビ", "ブ", "ぅ", "ボ", "ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ",
    "サ", "シ", "ス", "セ", "ソ", "タ", "チ", "ツ", "テ", "ト", "ナ", "ニ", "ヌ", "ネ", "ノ", "ハ",
    "ヒ", "フ", "ぇ", "ホ", "マ", "ミ", "ム", "メ", "モ", "ヤ", "ユ", "ヨ", "ラ", "リ", "ル", "レ",
    "ロ", "ワ", "ヲ", "ン", "ヴ", "ガ", "ギ", "グ", "ゲ", "ゴ", "ッ", "ザ", "ジ", "ズ", "ゼ", "ゾ",
];

/** PASSWORD_CHARS の逆引きマップ（文字 → インデックス）。デコード時の O(1) 検索用。 */
const PASSWORD_CHAR_TO_CODE: Readonly<Record<string, number>> = Object.freeze(
    PASSWORD_CHARS.reduce<Record<string, number>>((acc, ch, idx) => {
        acc[ch] = idx;
        return acc;
    }, {})
);

/**
 * 名前コード（0–93）に対応するカタカナ文字テーブル。
 * インデックス 0 は空文字（名前終端・未使用スロット）を表す。
 */
const NAME_CODE_TO_CHAR: string[] = [
    "", "ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ", "サ", "シ", "ス", "セ", "ソ",
    "タ", "チ", "ツ", "テ", "ト", "ナ", "ニ", "ヌ", "ネ", "ノ", "ハ", "ヒ", "フ", "ヘ", "ホ", "マ",
    "ミ", "ム", "メ", "モ", "ヤ", "ユ", "ヨ", "ラ", "リ", "ル", "レ", "ロ", "ワ", "ヲ", "ン", "ヴ",
    "ガ", "ギ", "グ", "ゲ", "ゴ", "ザ", "ジ", "ズ", "ゼ", "ゾ", "ダ", "ヂ", "ヅ", "デ", "ド", "バ",
    "ビ", "ブ", "ベ", "ボ", "パ", "ピ", "プ", "ペ", "ポ", "ァ", "ィ", "ゥ", "ェ", "ォ", "ッ", "ャ",
    "ュ", "ョ", "ー", "０", "１", "２", "３", "４", "５", "６", "７", "８", "９",
];

/** NAME_CODE_TO_CHAR の逆引きマップ（カタカナ文字 → コード番号）。エンコード時の O(1) 検索用。 */
const NAME_CHAR_TO_CODE: Readonly<Record<string, number>> = Object.freeze(
    NAME_CODE_TO_CHAR.reduce<Record<string, number>>((acc, ch, idx) => {
        if (ch) acc[ch] = idx;
        return acc;
    }, {})
);

/**
 * パスワード配列（34文字）の中で、名前の各文字データが格納されているインデックス位置。
 * 先頭から順に 10 文字分の名前に対応する（NAME_CODE_TO_CHAR でデコード）。
 */
const NAME_CODE_INDEXES = [26, 1, 24, 3, 15, 5, 20, 7, 17, 29] as const;


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
        const value = PASSWORD_CHAR_TO_CODE[ch];
        if (value === undefined) return null;
        code.push(value);
    }

    let name = "";
    for (const idx of NAME_CODE_INDEXES) {
        const ch = NAME_CODE_TO_CHAR[code[idx] ?? -1];
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
        gender: GENDER_VALUES[genderCode] ?? GENDER_VALUES[0],
        wingColor: WING_COLORS[wingColorCode] ?? WING_COLORS[0],
        foreheadColor: FOREHEAD_COLORS[foreheadColorCode] ?? FOREHEAD_COLORS[0],
        eyeColor: EYE_COLORS[eyeColorCode] ?? EYE_COLORS[0],
        bodyType: BODY_TYPES[bodyTypeCode] ?? BODY_TYPES[0],
        bodySize: BODY_SIZES[bodySizeCode] ?? BODY_SIZES[0],
        ageYear,
        ageMonth,
        ageWeek,
        regMonth: ageMonth,
        regWeek: ageWeek,
        wins,
        races,
        dart: DART_VALUES[dartCode] ?? DART_VALUES[0],
        round: ROUND_VALUES[roundCode] ?? ROUND_VALUES[0],
        temp: TEMP_VALUES[tempCode] ?? TEMP_VALUES[0],
        kakari: ARI_NASHI_VALUES[type26] ?? ARI_NASHI_VALUES[0],
        aori: ARI_NASHI_VALUES[type27] ?? ARI_NASHI_VALUES[0],
        irekomi: ARI_NASHI_VALUES[type28] ?? ARI_NASHI_VALUES[0],
        festival: matsuri,
        kisyo: kisyoCode === 2 || kisyoCode === 3 ? XO_VALUES[1] : XO_VALUES[0],
        slot: XO_VALUES[slotCode] ?? XO_VALUES[0],
        a1,
        a2,
        a3,
        a4,
        a5,
        senJizai,
        senShun,
        shunKa,
        senKa,
        agari: ARI_NASHI_VALUES[agariCode] ?? ARI_NASHI_VALUES[0],
        cross: ARI_NASHI_VALUES[crossCode] ?? ARI_NASHI_VALUES[0],
    };
}

/**
 * Encode chocobo parameters into a 34-character password string.
 */
export function encodePassword(params: ChocoboParams): string {
    const code: number[] = new Array(PASSWORD_LENGTH).fill(0);
    const {abilities} = params;

    const senko = clamp(abilities.senko, 0, 255);
    const chokyo = clamp(abilities.chokyo, 0, 255);
    const shunpatsu = clamp(abilities.shunpatsu, 0, 255);
    const jizoku = clamp(abilities.jizoku, 0, 255);
    const sokojikara = clamp(abilities.sokojikara, 0, 255);
    const jizaisei = clamp(abilities.jizaisei, 0, 255);
    const kasoku = clamp(abilities.kasoku, 0, 255);
    const hp = clamp(abilities.hp, 0, 255);

    const senkoHi = Math.floor(senko / 16);
    const senkoLo = senko % 16;
    const chokyoHi = Math.floor(chokyo / 32);
    const chokyoLo = chokyo % 32;
    const shunHi = Math.floor(shunpatsu / 64);
    const shunLo = shunpatsu % 64;
    const jizokuHi = Math.floor(jizoku / 128);
    const jizokuLo = jizoku % 128;
    const sokoHi = Math.floor(sokojikara / 16);
    const sokoLo = sokojikara % 16;
    const jizaiHi = Math.floor(jizaisei / 2);
    const jizaiLo = jizaisei % 2;
    const kasokuHi = Math.floor(kasoku / 4);
    const kasokuLo = kasoku % 4;
    const hpHi = Math.floor(hp / 8);
    const hpLo = hp % 8;

    const type =
        (params.kakari === ARI_NASHI_VALUES[1] ? 4 : 0) +
        (params.aori === ARI_NASHI_VALUES[1] ? 2 : 0) +
        (params.irekomi === ARI_NASHI_VALUES[1] ? 1 : 0);

    code[19] = clamp(type, 0, 7) * 16 + senkoHi;
    code[6] = chokyoHi + senkoLo * 8;
    code[21] = shunHi + chokyoLo * 4;
    code[22] = jizokuHi + shunLo * 2;
    code[23] = jizokuLo;
    code[10] = sokoHi + hpLo * 16;

    const slotCode = XO_VALUES.indexOf(params.slot);
    code[11] = slotCode + sokoLo * 8;

    code[2] = jizaiHi;
    code[25] = kasokuHi + jizaiLo * 64;
    code[0] = hpHi + kasokuLo * 32;

    const festival = clamp(Math.floor(params.festival), 0, 15);
    const matsLow = Math.floor(festival / 2);
    const matsHi = festival % 2;

    const genderCode = GENDER_VALUES.indexOf(params.gender);
    const dartCode = DART_VALUES.indexOf(params.dart);
    code[16] = matsLow + genderCode * 8 + clamp(dartCode >= 0 ? dartCode : 0, 0, 3) * 16;

    const roundCode = ROUND_VALUES.indexOf(params.round);
    const tempCode = TEMP_VALUES.indexOf(params.temp);
    code[8] = matsHi * 64 + clamp(roundCode >= 0 ? roundCode : 0, 0, 3) * 4 + clamp(tempCode >= 0 ? tempCode : 0, 0, 3);

    const wingColorCode = WING_COLORS.indexOf(params.wingColor);
    const wingCode = clamp(wingColorCode >= 0 ? wingColorCode : 0, 0, 9);
    const wingHigh = Math.floor(wingCode / 4);
    const wingLow = wingCode % 4;

    const ageYear = clamp(Math.floor(params.ageYear), 0, 15);
    const ageMonth = clamp(Math.floor(params.ageMonth), 0, 15);
    const ageWeekRaw = clamp(Math.floor(params.ageWeek) - 1, 0, 3);

    const bodySizeCode = BODY_SIZES.indexOf(params.bodySize);
    const bodySize = clamp(bodySizeCode >= 0 ? bodySizeCode : 0, 0, 2);
    const bodySizeHigh = Math.floor(bodySize / 2);
    const bodySizeLow = bodySize % 2;

    code[14] = wingLow * 32 + ageYear * 2 + bodySizeHigh;
    code[27] = ageMonth * 8 + ageWeekRaw * 2;

    const races = clamp(Math.floor(params.races), 0, 63);
    const wins = clamp(Math.floor(params.wins), 0, 31);
    code[28] = races * 2;
    code[12] = wins * 4;

    code[13] = wingHigh;

    const eyeColorCode = EYE_COLORS.indexOf(params.eyeColor);
    const foreheadColorCode = FOREHEAD_COLORS.indexOf(params.foreheadColor);
    const bodyTypeCode = BODY_TYPES.indexOf(params.bodyType);

    code[4] =
        clamp(eyeColorCode >= 0 ? eyeColorCode : 0, 0, 3) +
        clamp(foreheadColorCode >= 0 ? foreheadColorCode : 0, 0, 2) * 4 +
        clamp(bodyTypeCode >= 0 ? bodyTypeCode : 0, 0, 2) * 16 +
        bodySizeLow * 64;

    const crossCode = ARI_NASHI_VALUES.indexOf(params.cross);
    const agariCode = ARI_NASHI_VALUES.indexOf(params.agari);
    const kisyoCode = params.kisyo === XO_VALUES[1] ? (agariCode === 1 ? 3 : 2) : agariCode;
    code[18] = clamp(kisyoCode, 0, 3) * 2 + crossCode;

    const nameChars = Array.from(params.name)
        .slice(0, NAME_CODE_INDEXES.length)
        .map((ch) => {
            const cp = ch.codePointAt(0) ?? 0;
            if (cp >= CHAR_TABLE_START && cp <= CHAR_TABLE_END) {
                return String.fromCodePoint(cp + KATAKANA_OFFSET);
            }
            return ch;
        });
    while (nameChars.length < NAME_CODE_INDEXES.length) nameChars.push("");

    for (let i = 0; i < NAME_CODE_INDEXES.length; i++) {
        const idx = NAME_CODE_INDEXES[i];
        const ch = nameChars[i] ?? "";
        code[idx] = NAME_CHAR_TO_CODE[ch] ?? 0;
    }

    return code.map((v) => PASSWORD_CHARS[clamp(v, 0, 127)] ?? PASSWORD_CHARS[0]).join("");
}

// ─────────────────────────────────────────────────────────────
// Derived statistics
// ─────────────────────────────────────────────────────────────

/** Map a raw ability value (0–255) to a letter grade. */
export function getAbilityGrade(value: number): AbilityGrade {
    if (value >= 121) return "A";
    if (value >= 86) return "B";
    if (value >= 51) return "C";
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
        if (PASSWORD_CHAR_TO_CODE[ch] === undefined) return false;
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
        name: "チョコボ",
        gender: GENDER_VALUES[0],
        wingColor: WING_COLORS[6],
        foreheadColor: FOREHEAD_COLORS[1],
        eyeColor: EYE_COLORS[1],
        bodyType: BODY_TYPES[1],
        bodySize: BODY_SIZES[1],
        ageYear: 3,
        ageMonth: 1,
        ageWeek: 1,
        regMonth: 1,
        regWeek: 1,
        wins: 0,
        races: 0,
        dart: DART_VALUES[0],
        round: ARI_NASHI_VALUES[0],
        temp: ARI_NASHI_VALUES[0],
        kakari: ARI_NASHI_VALUES[0],
        aori: ARI_NASHI_VALUES[0],
        irekomi: ARI_NASHI_VALUES[0],
        festival: 0,
        kisyo: XO_VALUES[0],
        slot: XO_VALUES[0],
        a1: 100,
        a2: 100,
        a3: 100,
        a4: 100,
        a5: 100,
        senJizai: 100,
        senShun: 100,
        shunKa: 100,
        senKa: 100,
        agari: ARI_NASHI_VALUES[0],
        cross: ARI_NASHI_VALUES[0],
    };
}
