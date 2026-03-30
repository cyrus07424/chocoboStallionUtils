"use client";

import {useState} from "react";
import {
    BODY_SIZES,
    BODY_TYPES,
    type BodySize,
    type BodyType,
    calcA1,
    calcA2,
    calcA3,
    calcMaxAbility,
    type ChocoboAbilities,
    type ChocoboParams,
    decodePassword,
    defaultParams,
    encodePassword,
    EYE_COLORS,
    type EyeColor,
    FOREHEAD_COLORS,
    type ForeheadColor,
    type Gender,
    getAbilityGrade,
    isValidPassword,
    PASSWORD_LENGTH,
    WING_COLORS,
    type WingColor,
} from "./lib/chocoboPassword";

// ─────────────────────────────────────────────────────────────
// Tooltips
// ─────────────────────────────────────────────────────────────

const TOOLTIPS: Record<string, string> = {
    先行力: "レース序盤に先頭へ出る力。高いほど逃げ・先行戦法が有利になる。",
    長距離: "長距離コースでの持久力。高いほど長いコースで安定する。",
    瞬発力: "ラストスパートの瞬間的な加速力。高いほど末脚が伸びる。",
    持続力: "一定のスピードを長時間維持するスタミナ。",
    底力: "苦しい場面での粘り強さ。高いほど粘り込みに強い。",
    自在性: "コース・展開・馬場への適応力。高いほど幅広い条件に対応できる。",
    加速力: "スタート後の加速力。高いほど序盤のダッシュが速い。",
    HP: "体力・全体的なスタミナ。レース全体の消耗に影響する。",
    "お祭り好き": "GI・EXレースでのみ実力以上の能力を発揮する「大舞台で燃えるタイプ」。0〜15の16段階。EXでは「祭＋1」ごとに「長距離＋1・加速力＋1」相当の補正がかかる。",
    気性: "4-2気性。ほ系・み系(○)とは系・ふ系(なし)に分かれる。ほ系・み系のほうが強く、EXでは「長距離＋18・加速力＋18」相当の差がある。",
    スロット: "登録スロット。スロット1登録(○)のほうがタイムが速い。EXでは「長＋2・瞬＋2・持＋2・自＋2・加＋2」相当の差がある。",
    Ａ１: "先行・長距離・瞬発・持続・底力・自在・加速の7能力の平均値。",
    Ａ２: "先行・長距離・瞬発・持続・底力・自在・加速・HPの8能力の平均値。",
    Ａ３: "先行・瞬発・加速の3能力の平均値。短距離・スプリント適性の目安。",
    Ａ４: "先行・瞬発・自在・加速の4能力の平均値。",
    Ａ５: "先行・長距離・瞬発・自在・加速の5能力の平均値。",
    先自: "先行と自在の平均値。",
    先瞬: "先行と瞬発の平均値。",
    瞬加: "瞬発と加速の平均値。",
    先加: "先行と加速の平均値。",
    あがり症: "4-2気性のうちみ系・ふ系（*1）のチョコボで発症する可能性がある特性。レース中タイムが遅くなることがある。",
    クロス病: "インブリード（近親配合）が影響し発症する可能性がある特性。タイムが遅くなることがある。",
    ダート: "ダートコースへの適性。なし＜△＜○＜◎の順で得意。",
    周り: "得意なコースの回り方。右・左・右左・なしのいずれか。",
    気温: "得意な気温帯。暑・寒・暑寒・なしのいずれか。気温が合うと有利になる。",
    かかり癖: "レース道中に上体を反らして加速することがある（エビぞり）。気性難由来の特性。",
    あおり癖: "出遅れ癖。スタートで出遅れることがある。出遅れ暴走が発生すると長瞬持自加に大幅ボーナスがつく場合もある。",
    いれこみ癖: "タイムが遅くなることがある（バテやすくなる可能性）。気性難由来の特性。",
    羽名: "チョコボの名前。最大10文字（カタカナ）。",
    性別: "チョコボの性別。雄・雌のいずれか。",
    羽色: "羽の色。白・黒・金・赤・青・緑・黄・紫・桃・灰の10種類。",
    額色: "額の羽の有無・色。赤・無・虹のいずれか。",
    "目の色": "瞳の色。赤・青・緑の3種類。",
    体型: "横方向の体型。やせ・普通・デブのいずれか。",
    体格: "縦方向の体格。低・中・高のいずれか。",
    年齢: "チョコボの年齢。3歳1月1週が調教前の最も若い状態。",
    登録: "EXレースに登録した月・週。",
    戦績: "通算出走数と勝利数。",
};

function Tooltip({text, children}: { text: string; children: React.ReactNode }) {
    return (
        <span className="relative group cursor-help inline-block">
      {children}
            <span
                className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block w-64 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl leading-relaxed pointer-events-none whitespace-normal">
        {text}
      </span>
    </span>
    );
}

function HelpIconTooltip({text}: { text: string }) {
    return (
        <Tooltip text={text}>
      <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold align-middle"
          aria-label="用語解説"
      >
        ?
      </span>
        </Tooltip>
    );
}

// Sub-components

interface AbilityRowProps {
    label: string;
    labelJp: string;
    value: number | string;
    maxValue?: number;
    grade?: string;
}

function AbilityRow({label, labelJp, value, maxValue, grade}: AbilityRowProps) {
    const resolvedGrade =
        grade !== undefined ? grade : typeof value === "number" ? getAbilityGrade(value) : "";
    const gradeColor =
        resolvedGrade === "A" ? "text-red-600 font-bold" :
            resolvedGrade === "B" ? "text-orange-500 font-bold" :
                resolvedGrade === "C" ? "text-blue-500" : "text-gray-500";
    const tip = TOOLTIPS[labelJp];

    return (
        <tr className="border-b border-gray-100">
            <td className="py-1.5 text-sm font-medium text-gray-600 w-32">
        <span className="inline-flex items-center gap-1">
          {labelJp}
            {tip && <HelpIconTooltip text={tip}/>}
        </span>
            </td>
            <td className="py-1.5 text-sm font-mono w-24 text-right">{value}</td>
            <td className={`py-1.5 text-sm text-center ${gradeColor}`}>{resolvedGrade}</td>
            <td className="py-1.5 text-xs text-gray-500">
                {maxValue !== undefined ? `最大: ${maxValue} (${getAbilityGrade(maxValue)})` : ""}
            </td>
        </tr>
    );
}

interface AbilityInputProps {
    label: string;
    labelJp: string;
    value: number;
    onChange: (v: number) => void;
}

function AbilityInput({label, labelJp, value, onChange}: AbilityInputProps) {
    const grade = getAbilityGrade(value);
    const gradeColor =
        grade === "A" ? "text-red-600 font-bold" :
            grade === "B" ? "text-orange-500 font-bold" :
                grade === "C" ? "text-blue-500" : "text-gray-400";

    return (
        <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium text-gray-700 shrink-0">
                {labelJp}
            </label>
            <input
                type="number"
                min={0}
                max={255}
                value={value}
                onChange={(e) => onChange(Math.max(0, Math.min(255, Number(e.target.value) || 0)))}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center font-mono"
            />
            <span className={`text-sm w-4 ${gradeColor}`}>{grade}</span>
            <input
                type="range"
                min={0}
                max={255}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="flex-1 accent-yellow-500"
            />
        </div>
    );
}

// Password Analyzer

function PasswordAnalyzer() {
    const [input, setInput] = useState("");
    const [result, setResult] = useState<ChocoboParams | null>(null);
    const [error, setError] = useState("");

    const pasteAndAnalyze = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const trimmed = text.replace(/\s/g, "").replace(/　/g, "");
            setInput(trimmed);
            setError("");
            if (trimmed.length === 0) {
                setError("クリップボードが空です。");
                setResult(null);
                return;
            }
            if (!isValidPassword(trimmed)) {
                if (trimmed.length !== PASSWORD_LENGTH) {
                    setError(`パスワードは${PASSWORD_LENGTH}文字で入力してください。（現在: ${trimmed.length}文字）`);
                } else {
                    setError("パスワードに使用できない文字が含まれています。チョコボスタリオンのパスワード文字セットで入力してください。");
                }
                setResult(null);
                return;
            }
            const decoded = decodePassword(trimmed);
            if (!decoded) {
                setError("パスワードの解析に失敗しました。");
                setResult(null);
                return;
            }
            setError("");
            setResult(decoded);
        } catch {
            setError("クリップボードの読み取りに失敗しました。ブラウザの権限設定を確認してください。");
        }
    };

    const analyze = () => {
        const trimmed = input.trim();
        if (trimmed.length === 0) {
            setError("パスワードを入力してください。");
            setResult(null);
            return;
        }
        if (!isValidPassword(trimmed)) {
            if (trimmed.length !== PASSWORD_LENGTH) {
                setError(
                    `パスワードは${PASSWORD_LENGTH}文字で入力してください。（現在: ${trimmed.length}文字）`
                );
            } else {
                setError("パスワードに使用できない文字が含まれています。チョコボスタリオンのパスワード文字セットで入力してください。");
            }
            setResult(null);
            return;
        }
        const decoded = decodePassword(trimmed);
        if (!decoded) {
            setError("パスワードの解析に失敗しました。");
            setResult(null);
            return;
        }
        setError("");
        setResult(decoded);
    };

    const {abilities} = result ?? {abilities: null};

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    パスワード入力 <span className="text-gray-400 font-normal">（{PASSWORD_LENGTH}文字）</span>
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            setError("");
                        }}
                        placeholder="34文字のパスワードを入力"
                        maxLength={PASSWORD_LENGTH}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <button
                        onClick={analyze}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-sm font-semibold transition-colors"
                    >
                        解析
                    </button>
                    <button
                        onClick={pasteAndAnalyze}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm font-semibold transition-colors"
                    >
                        貼付け解析
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    文字数: {input.trim().length} / {PASSWORD_LENGTH}
                </p>
                {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
            </div>

            {result && abilities && (
                <div className="space-y-5">
                    <div className="bg-yellow-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-800 mb-3">基本情報</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <InfoItem label="羽名" value={result.name || "（不明）"}/>
                            <InfoItem label="性別" value={result.gender}/>
                            <InfoItem label="羽色" value={result.wingColor}/>
                            <InfoItem label="額色" value={result.foreheadColor}/>
                            <InfoItem label="目の色" value={result.eyeColor}/>
                            <InfoItem label="体型" value={result.bodyType}/>
                            <InfoItem label="体格" value={result.bodySize}/>
                            <InfoItem
                                label="年齢"
                                value={`${result.ageYear}歳${result.ageMonth}月${result.ageWeek}週`}
                            />
                            <InfoItem
                                label="登録"
                                value={`${result.regMonth}月${result.regWeek}週`}
                            />
                            <InfoItem
                                label="戦績"
                                value={`${result.wins}勝 / ${result.races}戦`}
                            />
                            <InfoItem label="ダート" value={result.dart || "なし"}/>
                            <InfoItem label="周り" value={result.round}/>
                            <InfoItem label="気温" value={result.temp}/>
                            <InfoItem label="かかり癖" value={result.kakari}/>
                            <InfoItem label="あおり癖" value={result.aori}/>
                            <InfoItem label="いれこみ癖" value={result.irekomi}/>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-800 mb-3">能力値</h3>
                        <table className="w-full text-left">
                            <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-200">
                                <th className="pb-1 font-medium">能力</th>
                                <th className="pb-1 font-medium text-right">値</th>
                                <th className="pb-1 font-medium text-center">評価</th>
                                <th className="pb-1 font-medium">理論最大値 ※</th>
                            </tr>
                            </thead>
                            <tbody>
                            <AbilityRow label="senko" labelJp="先行力" value={abilities.senko}
                                        maxValue={calcMaxAbility(abilities.senko, "senko")}/>
                            <AbilityRow label="chokyo" labelJp="長距離" value={abilities.chokyo}
                                        maxValue={calcMaxAbility(abilities.chokyo, "chokyo")}/>
                            <AbilityRow label="shunpatsu" labelJp="瞬発力" value={abilities.shunpatsu}
                                        maxValue={calcMaxAbility(abilities.shunpatsu, "shunpatsu")}/>
                            <AbilityRow label="jizoku" labelJp="持続力" value={abilities.jizoku}
                                        maxValue={calcMaxAbility(abilities.jizoku, "jizoku")}/>
                            <AbilityRow label="sokojikara" labelJp="底力" value={abilities.sokojikara}
                                        maxValue={calcMaxAbility(abilities.sokojikara, "sokojikara")}/>
                            <AbilityRow label="jizaisei" labelJp="自在性" value={abilities.jizaisei}
                                        maxValue={calcMaxAbility(abilities.jizaisei, "jizaisei")}/>
                            <AbilityRow label="kasoku" labelJp="加速力" value={abilities.kasoku}
                                        maxValue={calcMaxAbility(abilities.kasoku, "kasoku")}/>
                            <AbilityRow label="hp" labelJp="HP" value={abilities.hp}/>
                            <AbilityRow label="omatsuri" labelJp="お祭り好き" value={result.festival} grade=""/>
                            <AbilityRow label="kisyo" labelJp="気性" value={result.kisyo || "なし"} grade=""/>
                            <AbilityRow label="slot" labelJp="スロット" value={result.slot || "なし"} grade=""/>
                            <AbilityRow label="a1" labelJp="Ａ１" value={result.a1} grade=""/>
                            <AbilityRow label="a2" labelJp="Ａ２" value={result.a2} grade=""/>
                            <AbilityRow label="a3" labelJp="Ａ３" value={result.a3} grade=""/>
                            <AbilityRow label="a4" labelJp="Ａ４" value={result.a4} grade=""/>
                            <AbilityRow label="a5" labelJp="Ａ５" value={result.a5} grade=""/>
                            <AbilityRow label="senJizai" labelJp="先自" value={result.senJizai} grade=""/>
                            <AbilityRow label="senShun" labelJp="先瞬" value={result.senShun} grade=""/>
                            <AbilityRow label="shunKa" labelJp="瞬加" value={result.shunKa} grade=""/>
                            <AbilityRow label="senKa" labelJp="先加" value={result.senKa} grade=""/>
                            <AbilityRow label="agari" labelJp="あがり症" value={result.agari} grade=""/>
                            <AbilityRow label="cross" labelJp="クロス病" value={result.cross} grade=""/>
                            </tbody>
                        </table>
                        <p className="text-xs text-gray-400 mt-2">
                            ※ 理論最大値: 3歳1月1週（調教前）時点のパスワードで計算した場合の成長後最大値。
                            長距離 +65、その他 +75 が上限の目安。
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Password Generator

function PasswordGenerator() {
    const [params, setParams] = useState<ChocoboParams>(defaultParams());
    const [password, setPassword] = useState("");
    const [copied, setCopied] = useState(false);

    const generate = () => {
        const pw = encodePassword(params);
        setPassword(pw);
        setCopied(false);
    };

    const copyToClipboard = () => {
        if (!password) return;
        navigator.clipboard.writeText(password).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const setAbility = (key: keyof ChocoboAbilities, value: number) => {
        setParams((p) => ({
            ...p,
            abilities: {...p.abilities, [key]: value},
        }));
    };

    const setHabit = (key: keyof typeof params.habits, value: boolean) => {
        setParams((p) => ({
            ...p,
            habits: {...p.habits, [key]: value},
        }));
    };

    const {abilities} = params;

    return (
        <div className="space-y-6">
            <section className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-4">能力値 (0–255)</h3>
                <div className="mb-2 flex gap-6 text-sm text-gray-600">
                    <span>A1: <b>{calcA1(abilities)}</b></span>
                    <span>A2: <b>{calcA2(abilities)}</b></span>
                    <span>A3: <b>{calcA3(abilities)}</b></span>
                </div>
                <div className="space-y-2">
                    <AbilityInput label="senko" labelJp="先行力" value={abilities.senko}
                                  onChange={(v) => setAbility("senko", v)}/>
                    <AbilityInput label="chokyo" labelJp="長距離" value={abilities.chokyo}
                                  onChange={(v) => setAbility("chokyo", v)}/>
                    <AbilityInput label="shunpatsu" labelJp="瞬発力" value={abilities.shunpatsu}
                                  onChange={(v) => setAbility("shunpatsu", v)}/>
                    <AbilityInput label="jizoku" labelJp="持続力" value={abilities.jizoku}
                                  onChange={(v) => setAbility("jizoku", v)}/>
                    <AbilityInput label="sokojikara" labelJp="底力" value={abilities.sokojikara}
                                  onChange={(v) => setAbility("sokojikara", v)}/>
                    <AbilityInput label="jizaisei" labelJp="自在性" value={abilities.jizaisei}
                                  onChange={(v) => setAbility("jizaisei", v)}/>
                    <AbilityInput label="kasoku" labelJp="加速力" value={abilities.kasoku}
                                  onChange={(v) => setAbility("kasoku", v)}/>
                    <AbilityInput label="hp" labelJp="HP" value={abilities.hp} onChange={(v) => setAbility("hp", v)}/>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                    評価基準: A=121以上, B=86〜120, C=51〜85, D=50以下
                </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-4">基本情報</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">羽名（最大5文字）</label>
                        <input
                            type="text"
                            value={params.name}
                            maxLength={5}
                            onChange={(e) => setParams((p) => ({...p, name: e.target.value}))}
                            placeholder="ひらがな5文字以内"
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
                        <div className="flex gap-4">
                            {(["雄", "雌"] as Gender[]).map((g) => (
                                <label key={g} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={params.gender === g}
                                        onChange={() => setParams((p) => ({...p, gender: g}))}
                                        className="accent-yellow-500"
                                    />
                                    {g}
                                </label>
                            ))}
                        </div>
                    </div>

                    <SelectField
                        label="羽色"
                        value={params.wingColor}
                        options={WING_COLORS}
                        onChange={(v) => setParams((p) => ({...p, wingColor: v as WingColor}))}
                    />

                    <SelectField
                        label="額色"
                        value={params.foreheadColor}
                        options={FOREHEAD_COLORS}
                        onChange={(v) => setParams((p) => ({...p, foreheadColor: v as ForeheadColor}))}
                    />

                    <SelectField
                        label="目の色"
                        value={params.eyeColor}
                        options={EYE_COLORS}
                        onChange={(v) => setParams((p) => ({...p, eyeColor: v as EyeColor}))}
                    />

                    <SelectField
                        label="体型"
                        value={params.bodyType}
                        options={BODY_TYPES}
                        onChange={(v) => setParams((p) => ({...p, bodyType: v as BodyType}))}
                    />

                    <SelectField
                        label="体格"
                        value={params.bodySize}
                        options={BODY_SIZES}
                        onChange={(v) => setParams((p) => ({...p, bodySize: v as BodySize}))}
                    />
                </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-3">年齢・登録・戦績</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">年齢</label>
                        <div className="flex gap-2 items-center">
                            <NumberField label="年" value={params.ageYear} min={3} max={18}
                                         onChange={(v) => setParams((p) => ({...p, ageYear: v}))}/>
                            <NumberField label="月" value={params.ageMonth} min={1} max={12}
                                         onChange={(v) => setParams((p) => ({...p, ageMonth: v}))}/>
                            <NumberField label="週" value={params.ageWeek} min={1} max={4}
                                         onChange={(v) => setParams((p) => ({...p, ageWeek: v}))}/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">登録</label>
                        <div className="flex gap-2 items-center">
                            <NumberField label="月" value={params.regMonth} min={1} max={12}
                                         onChange={(v) => setParams((p) => ({...p, regMonth: v}))}/>
                            <NumberField label="週" value={params.regWeek} min={1} max={4}
                                         onChange={(v) => setParams((p) => ({...p, regWeek: v}))}/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">戦績</label>
                        <div className="flex gap-2 items-center">
                            <NumberField label="勝" value={params.wins} min={0} max={127}
                                         onChange={(v) => setParams((p) => ({...p, wins: v}))}/>
                            <NumberField label="戦" value={params.races} min={0} max={127}
                                         onChange={(v) => setParams((p) => ({...p, races: v}))}/>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-3">癖・得意条件</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <HabitCheckbox label="かかり癖" checked={params.habits.kakari}
                                   onChange={(v) => setHabit("kakari", v)}/>
                    <HabitCheckbox label="出遅れ癖" checked={params.habits.deokure}
                                   onChange={(v) => setHabit("deokure", v)}/>
                    <HabitCheckbox label="お祭り好き" checked={params.habits.omatsuri}
                                   onChange={(v) => setHabit("omatsuri", v)}/>
                    <HabitCheckbox label="左回り得意" checked={params.habits.hidarimawari}
                                   onChange={(v) => setHabit("hidarimawari", v)}/>
                    <HabitCheckbox label="右回り得意" checked={params.habits.migimawari}
                                   onChange={(v) => setHabit("migimawari", v)}/>
                    <HabitCheckbox label="外枠得意" checked={params.habits.sotowaku}
                                   onChange={(v) => setHabit("sotowaku", v)}/>
                    <HabitCheckbox label="内枠得意" checked={params.habits.uchiwaku}
                                   onChange={(v) => setHabit("uchiwaku", v)}/>
                    <HabitCheckbox label="晴れ得意" checked={params.habits.hare} onChange={(v) => setHabit("hare", v)}/>
                    <HabitCheckbox label="雨得意" checked={params.habits.ame} onChange={(v) => setHabit("ame", v)}/>
                    <HabitCheckbox label="重馬場得意" checked={params.habits.omoba}
                                   onChange={(v) => setHabit("omoba", v)}/>
                </div>
            </section>

            <button
                onClick={generate}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold text-base transition-colors"
            >
                パスワードを生成する
            </button>

            {password && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">生成されたパスワード</label>
                    <div
                        className="text-2xl font-mono font-bold text-amber-700 tracking-widest text-center py-2 bg-white rounded border border-amber-200 cursor-pointer select-all"
                        onClick={copyToClipboard}
                        title="クリックでコピー"
                    >
                        {password}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">{password.length}文字</span>
                        <button
                            onClick={copyToClipboard}
                            className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                        >
                            {copied ? "✓ コピー済" : "コピー"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper components

function InfoItem({label, value}: { label: string; value: string }) {
    const tip = TOOLTIPS[label];
    return (
        <div>
      <span className="text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          {label}
            {tip && <HelpIconTooltip text={tip}/>}
        </span>
      </span>
            <div className="font-medium text-gray-800 text-sm">{value}</div>
        </div>
    );
}


function HabitCheckbox({
                           label,
                           checked,
                           onChange,
                       }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="accent-yellow-500"
            />
            {label}
        </label>
    );
}

function SelectField({
                         label,
                         value,
                         options,
                         onChange,
                     }: {
    label: string;
    value: string;
    options: readonly string[];
    onChange: (v: string) => void;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o}
                    </option>
                ))}
            </select>
        </div>
    );
}

function NumberField({
                         label,
                         value,
                         min,
                         max,
                         onChange,
                     }: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className="flex items-center gap-1">
            <input
                type="number"
                value={value}
                min={min}
                max={max}
                onChange={(e) =>
                    onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))
                }
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
            />
            <span className="text-sm text-gray-600">{label}</span>
        </div>
    );
}

function TabButton({
                       children,
                       active,
                       onClick,
                   }: {
    children: React.ReactNode;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
                active
                    ? "text-amber-600 border-b-2 border-amber-500 bg-amber-50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
            {children}
        </button>
    );
}

// Main Page

type Tab = "analyzer" | "generator";

export default function Home() {
    const [tab, setTab] = useState<Tab>("analyzer");

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-lg overflow-visible">
                    <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-5">
                        <h1 className="text-2xl font-bold text-white drop-shadow">
                            🐦 チョコボスタリオン パスワードツール
                        </h1>
                        <p className="text-yellow-100 text-sm mt-1">
                            パスワード解析 &amp; パスワード生成
                        </p>
                    </div>

                    <div className="flex border-b border-gray-200">
                        <TabButton
                            active={tab === "analyzer"}
                            onClick={() => setTab("analyzer")}
                        >
                            🔍 パスワード解析
                        </TabButton>
                        <TabButton
                            active={tab === "generator"}
                            onClick={() => setTab("generator")}
                        >
                            ✨ パスワード生成
                        </TabButton>
                    </div>

                    <div className="p-6">
                        {tab === "analyzer" ? <PasswordAnalyzer/> : <PasswordGenerator/>}
                    </div>

                    <div className="bg-blue-50 border-t border-blue-100 px-6 py-3">
                        <p className="text-xs text-blue-600">
                            ※ このツールはコミュニティによるリバースエンジニアリングに基づいています。
                            デコード結果はゲーム内の実際の値と異なる場合があります。
                        </p>
                    </div>
                </div>
            </div>

            <footer className="text-center text-gray-400 mt-8 text-sm">
                &copy; 2026{" "}
                <a
                    href="https://github.com/cyrus07424"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-600"
                >
                    cyrus
                </a>
            </footer>
        </div>
    );
}
