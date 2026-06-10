// Claude API クライアント（ブラウザから直接呼び出し）。
// 食事の写真＋音声テキストを送り、健康情報を踏まえたケト視点のフィードバックを得る。
//
// セキュリティ注記: ブラウザから直接 Anthropic API を叩くため、APIキーは
// この端末の localStorage に保存され、リクエストヘッダーに乗ります。
// 個人利用を前提とした構成です（共用端末では使わないこと）。

import { ketoMacroTargets, bmr, tdee, targetCalories, ketosisLevel } from './nutrition.js';
import { aiLangInstruction, t } from './i18n.js';
import { backendEnabled, backendAnalyze } from './backend.js';

const API_URL = 'https://api.anthropic.com/v1/messages';

// 推定値＋フィードバックを1つのJSONで受け取る構造化スキーマ
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    dish_summary: { type: 'string', description: '食べたものの簡潔な要約（日本語）' },
    calories: { type: 'number', description: '推定総カロリー(kcal)' },
    protein_g: { type: 'number', description: 'タンパク質(g)' },
    fat_g: { type: 'number', description: '脂質(g)' },
    total_carbs_g: { type: 'number', description: '総炭水化物(g)' },
    fiber_g: { type: 'number', description: '食物繊維(g)' },
    net_carbs_g: { type: 'number', description: 'ネット糖質(g) = 総炭水化物 - 食物繊維' },
    keto_score: { type: 'integer', description: 'ケト適性スコア 0-100（高いほどケトに適している）' },
    keto_friendly: { type: 'boolean', description: 'ケトーシス維持に適した食事か' },
    feedback: { type: 'string', description: '健康情報・目標を踏まえた具体的フィードバック（日本語、2-4文）' },
    suggestions: {
      type: 'array',
      items: { type: 'string' },
      description: '次の食事や改善の具体的な提案（日本語、1-3個）',
    },
    flags: {
      type: 'array',
      items: { type: 'string' },
      description: 'アレルギー・持病・服薬・苦手食材に関わる注意点（該当なければ空配列）',
    },
  },
  required: [
    'dish_summary', 'calories', 'protein_g', 'fat_g', 'total_carbs_g',
    'fiber_g', 'net_carbs_g', 'keto_score', 'keto_friendly', 'feedback',
    'suggestions', 'flags',
  ],
  additionalProperties: false,
};

function appendContext(lines, ctx) {
  if (!ctx) return;
  const { daily, latestCheckup } = ctx;
  if (daily) {
    const bits = [];
    if (daily.weightKg) bits.push(`体重 ${daily.weightKg}kg`);
    if (daily.bodyFatPct) bits.push(`体脂肪 ${daily.bodyFatPct}%`);
    if (daily.training && daily.training.done) {
      bits.push(`本日筋トレ実施（${daily.training.type || ''}${daily.training.minutes ? ` ${daily.training.minutes}分` : ''}）`);
    } else if (daily.training && daily.training.done === false) {
      bits.push('本日は筋トレ未実施');
    }
    const o = daily.oura || {};
    if (o.sleepScore != null) bits.push(`睡眠スコア ${o.sleepScore}`);
    if (o.readinessScore != null) bits.push(`リカバリー ${o.readinessScore}`);
    if (o.hrv != null) bits.push(`HRV ${o.hrv}ms`);
    if (o.restingHR != null) bits.push(`安静時心拍 ${o.restingHR}bpm`);
    if (bits.length) {
      lines.push('## 本日のコンディション');
      lines.push('- ' + bits.join(' / '));
      lines.push('');
    }
  }
  if (latestCheckup && latestCheckup.values) {
    const vals = Object.entries(latestCheckup.values).filter(([, v]) => v != null && v !== '');
    if (vals.length) {
      lines.push(`## 直近の健康診断（${latestCheckup.date}）`);
      lines.push('- ' + vals.map(([k, v]) => `${k}:${v}`).join(' / '));
      lines.push('');
    }
  }
}

function buildSystemPrompt(profile, targets, ctx) {
  const lines = [];
  lines.push('あなたはケトジェニックダイエット（ケトーシス誘導）を専門とする管理栄養士兼コーチです。');
  lines.push('ユーザーが食べた食事（写真と本人の説明）を分析し、ケトーシスに入る／維持する観点で評価とフィードバックを日本語で行います。');
  lines.push('');
  lines.push('## ユーザーの健康プロフィール');
  if (profile.sex) lines.push(`- 性別: ${profile.sex === 'female' ? '女性' : '男性'}`);
  if (profile.age) lines.push(`- 年齢: ${profile.age}歳`);
  if (profile.heightCm) lines.push(`- 身長: ${profile.heightCm}cm`);
  if (profile.weightKg) lines.push(`- 体重: ${profile.weightKg}kg`);
  if (profile.bodyFatPct) lines.push(`- 体脂肪率: ${profile.bodyFatPct}%`);
  if (profile.goalWeightKg) lines.push(`- 目標体重: ${profile.goalWeightKg}kg（ペース ${profile.paceKgPerWeek}kg/週）`);
  if (profile.bloodGlucose) lines.push(`- 直近の血糖値: ${profile.bloodGlucose} mg/dL`);
  if (profile.bloodKetones != null && profile.bloodKetones !== '') {
    const kl = ketosisLevel(profile.bloodKetones);
    lines.push(`- 直近の血中ケトン体: ${profile.bloodKetones} mmol/L${kl ? `（${kl.label}）` : ''}`);
  }
  if (profile.conditions) lines.push(`- 持病・既往: ${profile.conditions}`);
  if (profile.medications) lines.push(`- 服薬: ${profile.medications}`);
  if (profile.allergies) lines.push(`- アレルギー: ${profile.allergies}`);
  if (profile.dislikes) lines.push(`- 苦手な食材: ${profile.dislikes}`);
  if (profile.notes) lines.push(`- その他メモ: ${profile.notes}`);
  lines.push('');
  if (targets) {
    lines.push('## 1日の目標（参考）');
    lines.push(`- カロリー: ${targets.calories} kcal`);
    lines.push(`- タンパク質: ${targets.proteinG} g`);
    lines.push(`- 脂質: ${targets.fatG} g`);
    lines.push(`- ネット糖質上限: ${targets.netCarbG} g`);
    lines.push('');
  }
  appendContext(lines, ctx);
  lines.push('## 指示');
  lines.push('- 写真と説明から、その食事の栄養価（カロリー・PFC・総炭水化物・食物繊維・ネット糖質）を現実的に推定する。');
  lines.push('- ネット糖質（= 総炭水化物 − 食物繊維）を重視し、ケトーシス維持に適しているかを judge する。');
  lines.push('- アレルギー・持病・服薬・苦手食材に該当する要素があれば必ず flags に記載する（例: 糖尿病・腎臓病・痛風など）。');
  lines.push('- 本日のコンディション（筋トレ・睡眠・リカバリー）や健康診断値があれば、それを踏まえてfeedbackを出す（例: 筋トレ日はタンパク質を増やす、リカバリーが低い日は無理をしない等）。');
  lines.push('- feedback は本人の目標と健康状態に紐づけて具体的に。一般論で終わらせない。');
  lines.push('- 推定が難しい場合も妥当な概算を返す（不明として 0 にしない）。');
  lines.push('- ' + aiLangInstruction());
  return lines.join('\n');
}

// 画像 dataURL を Claude 用の image ブロックに変換
function imageBlockFromDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return {
    type: 'image',
    source: { type: 'base64', media_type: m[1], data: m[2] },
  };
}

export async function analyzeMeal({ text, photoDataUrl, mealType, todayTotals, daily, latestCheckup }, profile, settings) {
  const targets = ketoMacroTargets(profile);
  const system = buildSystemPrompt(profile, targets, { daily, latestCheckup });

  // サブスク（バックエンド）が有効ならサーバー経由のGeminiで分析（端末にAPIキー不要）
  if (backendEnabled()) {
    const m = photoDataUrl ? /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(photoDataUrl) : null;
    const parsed = await backendAnalyze({
      text, mealType, system, todayTotals,
      photoMime: m ? m[1] : null,
      photoBase64: m ? m[2] : null,
    });
    if (parsed && parsed.net_carbs_g == null && parsed.total_carbs_g != null) {
      parsed.net_carbs_g = Math.max(0, (parsed.total_carbs_g || 0) - (parsed.fiber_g || 0));
    }
    return parsed;
  }

  // それ以外は BYOK（端末のClaudeキー）
  if (!settings.apiKey) {
    throw new Error(t('err.noKey'));
  }

  const userContent = [];
  const img = photoDataUrl ? imageBlockFromDataUrl(photoDataUrl) : null;
  if (img) userContent.push(img);

  const parts = [];
  parts.push(`食事の種類: ${mealType || '不明'}`);
  parts.push(`本人の説明（音声）: ${text || '（説明なし。写真から推定してください）'}`);
  if (todayTotals) {
    parts.push(
      `本日ここまでの合計: ${todayTotals.calories}kcal / P${todayTotals.protein_g}g ` +
        `F${todayTotals.fat_g}g ネット糖質${todayTotals.net_carbs_g}g`
    );
  }
  parts.push('この食事を分析し、スキーマに従ってJSONで回答してください。');
  userContent.push({ type: 'text', text: parts.join('\n') });

  const body = {
    model: settings.model || 'claude-opus-4-8',
    max_tokens: 2000,
    system,
    messages: [{ role: 'user', content: userContent }],
    output_config: {
      format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
    },
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message || JSON.stringify(err);
    } catch {
      detail = await res.text();
    }
    if (res.status === 401) throw new Error(t('err.badKey'));
    if (res.status === 429) throw new Error(t('err.rateLimit'));
    throw new Error(t('err.api', { s: res.status, d: detail }));
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  if (!textBlock) throw new Error(t('err.parse'));
  let parsed;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error(t('err.parse'));
  }
  // ネット糖質の整合性を一応担保
  if (parsed.net_carbs_g == null && parsed.total_carbs_g != null) {
    parsed.net_carbs_g = Math.max(0, (parsed.total_carbs_g || 0) - (parsed.fiber_g || 0));
  }
  return parsed;
}

// プロフィール全体への週次/総合アドバイスを生成（任意機能）
export async function coachAdvice({ recentDays, latestCheckup, streaks }, profile, settings) {
  if (!settings.apiKey) throw new Error(t('err.noKey'));
  const targets = ketoMacroTargets(profile);
  const system = buildSystemPrompt(profile, targets, { latestCheckup }) +
    '\n\n以下の数日間の食事・運動・睡眠の傾向を踏まえ、ケトーシス達成・維持と健康改善のための総合アドバイスを日本語で返してください（JSON不要、300字程度）。良い点は具体的に褒めてモチベーションを高め、改善点は実行可能な提案にしてください。';

  const summary = recentDays
    .map((d) => {
      const t = d.training && d.training.done ? `筋トレ:${d.training.type || '実施'}${d.training.minutes ? `${d.training.minutes}分` : ''}` : '筋トレ:なし';
      const o = d.oura || {};
      const ou = [o.sleepScore != null ? `睡眠${o.sleepScore}` : '', o.readinessScore != null ? `回復${o.readinessScore}` : ''].filter(Boolean).join(' ');
      return `${d.dateKey}: ${d.totals.calories}kcal / P${d.totals.protein_g} F${d.totals.fat_g} ネット糖質${d.totals.net_carbs_g}g（${d.count}食） ${t} ${ou}`;
    })
    .join('\n');
  const streakLine = streaks
    ? `\n継続記録: 糖質遵守 ${streaks.carb}日連続 / 筋トレ ${streaks.training}日連続`
    : '';

  const body = {
    model: settings.model || 'claude-opus-4-8',
    max_tokens: 1500,
    system,
    messages: [{ role: 'user', content: `直近の記録:\n${summary}${streakLine}\n\n総合的なアドバイスをお願いします。` }],
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(t('err.api', { s: res.status, d: '' }));
  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  return textBlock ? textBlock.text : '';
}
