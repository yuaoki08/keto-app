// 栄養・ケトーシス計算ロジック
// すべての計算はクライアント側で完結する（健康情報を外部に出さない）。

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'ほとんど運動しない（デスクワーク中心）' },
  { value: 1.375, label: '軽い運動（週1〜3回）' },
  { value: 1.55, label: '中程度（週3〜5回）' },
  { value: 1.725, label: '活発（週6〜7回）' },
  { value: 1.9, label: '非常に活発（肉体労働・1日2回運動）' },
];

// 基礎代謝量（Mifflin-St Jeor 式）
export function bmr({ sex, weightKg, heightCm, age }) {
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'female' ? base - 161 : base + 5);
}

// 総消費カロリー（TDEE）
export function tdee(profile) {
  const b = bmr(profile);
  if (b == null) return null;
  const act = profile.activity || 1.2;
  return Math.round(b * act);
}

// 目標摂取カロリー。減量ペース（kg/週）から1日あたりの赤字を計算。
// 体脂肪1kg ≒ 7700kcal。
export function targetCalories(profile) {
  const t = tdee(profile);
  if (t == null) return null;
  const pace = profile.paceKgPerWeek || 0; // 減量なら正の値
  const dailyDeficit = (pace * 7700) / 7;
  // 安全のため BMR を下回らないようにする
  const b = bmr(profile) || 1200;
  return Math.max(b, Math.round(t - dailyDeficit));
}

// ケト用 PFC 目標（グラム）
//  - 糖質: ネット糖質の上限（既定20g）
//  - タンパク質: 体重 × proteinPerKg（既定1.4g/kg）
//  - 脂質: 残りのカロリーを埋める
export function ketoMacroTargets(profile) {
  const cal = targetCalories(profile);
  if (cal == null) return null;
  const netCarbG = profile.netCarbLimitG ?? 20;
  const proteinG = Math.round((profile.weightKg || 60) * (profile.proteinPerKg ?? 1.4));
  const proteinCal = proteinG * 4;
  const carbCal = netCarbG * 4;
  const fatCal = Math.max(0, cal - proteinCal - carbCal);
  const fatG = Math.round(fatCal / 9);
  return {
    calories: cal,
    proteinG,
    fatG,
    netCarbG,
    // 参考: カロリー比率
    ratio: {
      fat: Math.round((fatCal / cal) * 100),
      protein: Math.round((proteinCal / cal) * 100),
      carb: Math.round((carbCal / cal) * 100),
    },
  };
}

// 血中ケトン体（β-ヒドロキシ酪酸, mmol/L）からの判定
export function ketosisLevel(bhb) {
  if (bhb == null || bhb === '' || isNaN(bhb)) return null;
  const v = Number(bhb);
  if (v < 0.5) return { key: 'none', label: 'ケトーシス前', color: '#5C6A80', desc: '糖質代謝が優位。まだ脂質燃焼モードに入っていません。' };
  if (v < 1.5) return { key: 'light', label: '軽度の栄養性ケトーシス', color: '#D8B36A', desc: '脂質燃焼が始まっています。' };
  if (v <= 3.0) return { key: 'optimal', label: '最適なケトーシス', color: '#63D8CC', desc: '減量・代謝効率の観点で理想的な範囲です。' };
  return { key: 'high', label: '高ケトーシス', color: '#E8857A', desc: '値が高め。水分・電解質に注意してください。' };
}

// 1日の合計を集計
export function sumDay(meals) {
  const acc = { calories: 0, protein_g: 0, fat_g: 0, net_carbs_g: 0, total_carbs_g: 0, fiber_g: 0 };
  for (const m of meals) {
    const a = m.ai;
    if (!a) continue;
    acc.calories += a.calories || 0;
    acc.protein_g += a.protein_g || 0;
    acc.fat_g += a.fat_g || 0;
    acc.net_carbs_g += a.net_carbs_g || 0;
    acc.total_carbs_g += a.total_carbs_g || 0;
    acc.fiber_g += a.fiber_g || 0;
  }
  for (const k of Object.keys(acc)) acc[k] = Math.round(acc[k] * 10) / 10;
  return acc;
}

export function todayKey(d = new Date()) {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

export function dateKeyOffset(days, from = new Date()) {
  return todayKey(new Date(from.getTime() + days * 86400000));
}

// 条件を満たす日付集合(Set<YYYY-MM-DD>)から、今日（または昨日）を起点に
// 連続している日数を数える。今日が未達でも昨日まで連続していれば継続中とみなす。
export function streakFromDates(qualifying) {
  const set = qualifying instanceof Set ? qualifying : new Set(qualifying);
  if (set.size === 0) return 0;
  let cursor = 0;
  // 今日が未達なら昨日からカウント開始（記録忘れ・未入力に寛容）
  if (!set.has(dateKeyOffset(0))) cursor = -1;
  let streak = 0;
  while (set.has(dateKeyOffset(cursor))) {
    streak++;
    cursor--;
  }
  return streak;
}

// 直近 n 日の dateKey 配列（古い→新しい）
export function lastNDateKeys(n) {
  const arr = [];
  for (let i = n - 1; i >= 0; i--) arr.push(dateKeyOffset(-i));
  return arr;
}
