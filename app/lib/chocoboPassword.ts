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
    | "白色"
    | "黒色"
    | "金色"
    | "赤色"
    | "青色"
    | "緑色"
    | "黄色"
    | "紫色"
    | "桃色"
    | "灰色"
    | "水色";
export type ForeheadColor = | "赤色" | "無" | "虹色";
export type EyeColor = | "赤色" | "青色" | "緑色";
export type BodyType = "やせ" | "普通" | "デブ";
export type BodySize = "低" | "中" | "高";
export type Gender = "♂" | "♀";

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
    dart: "✕" | "△" | "○" | "◎";
    round: "なし" | "右" | "左" | "右左";
    temp: "なし" | "暑" | "寒" | "暑寒";
    kakari: "なし" | "あり";
    aori: "なし" | "あり";
    irekomi: "なし" | "あり";
    festival: number;
    kisyo: "✕" | "○";
    slot: "✕" | "○";
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

const LIVE_NAME_CHAR_TO_CODE: Readonly<Record<string, number>> = Object.freeze(
    LIVE_NAME_CODE_TO_CHAR.reduce<Record<string, number>>((acc, ch, idx) => {
        if (ch) acc[ch] = idx;
        return acc;
    }, {})
);

const LIVE_NAME_CODE_INDEXES = [26, 1, 24, 3, 15, 5, 20, 7, 17, 29] as const;
const LIVE_WING_COLORS: WingColor[] = ["白色", "黒色", "金色", "赤色", "青色", "緑色", "黄色", "紫色", "桃色", "灰色"];
const LIVE_FOREHEAD_COLORS: ForeheadColor[] = ["赤色", "無", "虹色"];
const LIVE_EYE_COLORS: EyeColor[] = ["赤色", "青色", "緑色"];
const LIVE_BODY_SIZES: BodySize[] = ["低", "中", "高"];
const LIVE_BODY_TYPES: BodyType[] = ["やせ", "普通", "デブ"];
const LIVE_DARTS = ["✕", "△", "○", "◎"] as const;
const LIVE_ROUNDS = ["なし", "右", "左", "右左"] as const;
const LIVE_TEMPS = ["なし", "暑", "寒", "暑寒"] as const;

export const WING_COLORS: WingColor[] = [
    "白色", "黒色", "金色", "赤色", "青色", "緑色", "黄色", "紫色", "桃色", "灰色",
];

export const FOREHEAD_COLORS: ForeheadColor[] = [
    "赤色", "無", "虹色",
];

export const EYE_COLORS: EyeColor[] = [
    "赤色", "青色", "緑色",
];

export const BODY_TYPES: BodyType[] = ["やせ", "普通", "デブ"];
export const BODY_SIZES: BodySize[] = ["低", "中", "高"];


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
        gender: genderCode === 1 ? "♀" : "♂",
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
        dart: LIVE_DARTS[dartCode] ?? "✕",
        round: LIVE_ROUNDS[roundCode] ?? "なし",
        temp: LIVE_TEMPS[tempCode] ?? "なし",
        kakari: type26 === 1 ? "あり" : "なし",
        aori: type27 === 1 ? "あり" : "なし",
        irekomi: type28 === 1 ? "あり" : "なし",
        festival: matsuri,
        kisyo: kisyoCode === 2 || kisyoCode === 3 ? "○" : "✕",
        slot: slotCode === 1 ? "○" : "✕",
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
        (params.kakari === "あり" ? 4 : 0) +
        (params.aori === "あり" ? 2 : 0) +
        (params.irekomi === "あり" ? 1 : 0);

    code[19] = clamp(type, 0, 7) * 16 + senkoHi;
    code[6] = chokyoHi + senkoLo * 8;
    code[21] = shunHi + chokyoLo * 4;
    code[22] = jizokuHi + shunLo * 2;
    code[23] = jizokuLo;
    code[10] = sokoHi + hpLo * 16;

    const slotCode = params.slot === "○" ? 1 : 0;
    code[11] = slotCode + sokoLo * 8;

    code[2] = jizaiHi;
    code[25] = kasokuHi + jizaiLo * 64;
    code[0] = hpHi + kasokuLo * 32;

    const festival = clamp(Math.floor(params.festival), 0, 15);
    const matsLow = Math.floor(festival / 2);
    const matsHi = festival % 2;

    const genderCode = params.gender === "♀" ? 1 : 0;
    const dartCode = LIVE_DARTS.indexOf(params.dart as (typeof LIVE_DARTS)[number]);
    code[16] = matsLow + genderCode * 8 + clamp(dartCode >= 0 ? dartCode : 0, 0, 3) * 16;

    const roundCode = LIVE_ROUNDS.indexOf(params.round as (typeof LIVE_ROUNDS)[number]);
    const tempCode = LIVE_TEMPS.indexOf(params.temp as (typeof LIVE_TEMPS)[number]);
    code[8] = matsHi * 64 + clamp(roundCode >= 0 ? roundCode : 0, 0, 3) * 4 + clamp(tempCode >= 0 ? tempCode : 0, 0, 3);

    const wingColorCode = LIVE_WING_COLORS.indexOf(params.wingColor as WingColor);
    const wingCode = clamp(wingColorCode >= 0 ? wingColorCode : 0, 0, 9);
    const wingHigh = Math.floor(wingCode / 4);
    const wingLow = wingCode % 4;

    const ageYear = clamp(Math.floor(params.ageYear), 0, 15);
    const ageMonth = clamp(Math.floor(params.ageMonth), 0, 15);
    const ageWeekRaw = clamp(Math.floor(params.ageWeek) - 1, 0, 3);

    const bodySizeCode = LIVE_BODY_SIZES.indexOf(params.bodySize as BodySize);
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

    const eyeColorCode = LIVE_EYE_COLORS.indexOf(params.eyeColor as EyeColor);
    const foreheadColorCode = LIVE_FOREHEAD_COLORS.indexOf(params.foreheadColor as ForeheadColor);
    const bodyTypeCode = LIVE_BODY_TYPES.indexOf(params.bodyType as BodyType);

    code[4] =
        clamp(eyeColorCode >= 0 ? eyeColorCode : 0, 0, 3) +
        clamp(foreheadColorCode >= 0 ? foreheadColorCode : 0, 0, 2) * 4 +
        clamp(bodyTypeCode >= 0 ? bodyTypeCode : 0, 0, 2) * 16 +
        bodySizeLow * 64;

    const crossCode = params.cross === "あり" ? 1 : 0;
    const agariCode = params.agari === "あり" ? 1 : 0;
    const kisyoCode = params.kisyo === "○" ? (agariCode === 1 ? 3 : 2) : agariCode;
    code[18] = clamp(kisyoCode, 0, 3) * 2 + crossCode;

    const nameChars = Array.from(params.name)
        .slice(0, LIVE_NAME_CODE_INDEXES.length)
        .map((ch) => {
            const cp = ch.codePointAt(0) ?? 0;
            if (cp >= CHAR_TABLE_START && cp <= CHAR_TABLE_END) {
                return String.fromCodePoint(cp + KATAKANA_OFFSET);
            }
            return ch;
        });
    while (nameChars.length < LIVE_NAME_CODE_INDEXES.length) nameChars.push("");

    for (let i = 0; i < LIVE_NAME_CODE_INDEXES.length; i++) {
        const idx = LIVE_NAME_CODE_INDEXES[i];
        const ch = nameChars[i] ?? "";
        code[idx] = LIVE_NAME_CHAR_TO_CODE[ch] ?? 0;
    }

    return code.map((v) => LIVE_PASSWORD_CHARS[clamp(v, 0, 127)] ?? LIVE_PASSWORD_CHARS[0]).join("");
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
        name: "チョコボ",
        gender: "♂",
        wingColor: "黄色",
        foreheadColor: "赤色",
        eyeColor: "赤色",
        bodyType: "普通",
        bodySize: "中",
        ageYear: 3,
        ageMonth: 1,
        ageWeek: 1,
        regMonth: 1,
        regWeek: 1,
        wins: 0,
        races: 0,
        dart: "✕",
        round: "なし",
        temp: "なし",
        kakari: "なし",
        aori: "なし",
        irekomi: "なし",
        festival: 0,
        kisyo: "✕",
        slot: "✕",
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
