// プロフィール（健康情報）と設定の保存。localStorage を使う（端末内のみ）。

const PROFILE_KEY = 'keto.profile.v1';
const SETTINGS_KEY = 'keto.settings.v1';

const DEFAULT_PROFILE = {
  // 基本身体情報
  sex: 'male',
  age: null,
  heightCm: null,
  weightKg: null,
  activity: 1.375,
  // 目標設定
  goalWeightKg: null,
  paceKgPerWeek: 0.5,
  targetDate: '',
  netCarbLimitG: 20,
  proteinPerKg: 1.4,
  // 血液・体組成データ
  bloodGlucose: null, // mg/dL
  bloodKetones: null, // mmol/L (β-ヒドロキシ酪酸)
  bodyFatPct: null,
  // 既往・制限事項
  conditions: '', // 持病
  medications: '', // 服薬
  allergies: '', // アレルギー
  dislikes: '', // 苦手な食材
  notes: '',
  updatedAt: null,
};

const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'claude-opus-4-8',
  // Oura: Personal Access Token と任意のCORSプロキシ。
  // ouraProxy に {url} を含めると encodeURIComponent(対象URL) に置換、
  // 含めなければ末尾に追記する（例: https://proxy.example/?url=）。
  ouraToken: '',
  ouraProxy: '',
};

export function getProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile) {
  const next = { ...getProfile(), ...profile, updatedAt: new Date().toISOString() };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  return next;
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  const next = { ...getSettings(), ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function profileIsComplete(p = getProfile()) {
  return !!(p.age && p.heightCm && p.weightKg);
}

export const MODELS = [
  { value: 'claude-opus-4-8', labelKey: 'model.opus' },
  { value: 'claude-sonnet-4-6', labelKey: 'model.sonnet' },
  { value: 'claude-haiku-4-5', labelKey: 'model.haiku' },
];

// 筋トレの種別（シンプル記録）
export const TRAINING_TYPES = ['筋トレ', '有酸素', 'その他'];

// 健康診断の標準項目。reference は参考基準範囲（色分け・モチベ用）。
export const CHECKUP_METRICS = [
  { key: 'systolic', label: '収縮期血圧', unit: 'mmHg', ref: [90, 130], betterLow: true },
  { key: 'diastolic', label: '拡張期血圧', unit: 'mmHg', ref: [60, 85], betterLow: true },
  { key: 'hba1c', label: 'HbA1c', unit: '%', ref: [4.6, 5.6], betterLow: true },
  { key: 'fastingGlucose', label: '空腹時血糖', unit: 'mg/dL', ref: [70, 99], betterLow: true },
  { key: 'totalChol', label: '総コレステロール', unit: 'mg/dL', ref: [140, 219] },
  { key: 'ldl', label: 'LDL', unit: 'mg/dL', ref: [0, 139], betterLow: true },
  { key: 'hdl', label: 'HDL', unit: 'mg/dL', ref: [40, 200], betterHigh: true },
  { key: 'triglycerides', label: '中性脂肪', unit: 'mg/dL', ref: [30, 149], betterLow: true },
  { key: 'alt', label: 'ALT(GPT)', unit: 'U/L', ref: [0, 30], betterLow: true },
  { key: 'ast', label: 'AST(GOT)', unit: 'U/L', ref: [0, 30], betterLow: true },
  { key: 'ggtp', label: 'γ-GTP', unit: 'U/L', ref: [0, 50], betterLow: true },
  { key: 'uricAcid', label: '尿酸', unit: 'mg/dL', ref: [3.0, 7.0], betterLow: true },
];

// Oura の日次指標
export const OURA_METRICS = [
  { key: 'sleepScore', label: '睡眠スコア', unit: '', range: [0, 100] },
  { key: 'readinessScore', label: 'リカバリー(Readiness)', unit: '', range: [0, 100] },
  { key: 'hrv', label: 'HRV', unit: 'ms', range: null },
  { key: 'restingHR', label: '安静時心拍', unit: 'bpm', range: null },
  { key: 'sleepHours', label: '睡眠時間', unit: 'h', range: null },
  { key: 'steps', label: '歩数', unit: '歩', range: null },
];
