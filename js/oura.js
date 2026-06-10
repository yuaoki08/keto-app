// Oura Ring v2 API クライアント（Personal Access Token）。
// ブラウザ直接呼び出しはCORSで失敗することが多いため、任意のプロキシ設定に対応。
// 取得した日次データは daily ストアに oura.* としてマージ保存する。

import { upsertDaily } from './db.js';
import { t } from './i18n.js';

const BASE = 'https://api.ouraring.com/v2/usercollection';

function proxied(url, ouraProxy) {
  if (!ouraProxy) return url;
  if (ouraProxy.includes('{url}')) return ouraProxy.replace('{url}', encodeURIComponent(url));
  return ouraProxy + encodeURIComponent(url);
}

async function getCollection(name, { start, end }, settings) {
  const url = `${BASE}/${name}?start_date=${start}&end_date=${end}`;
  const res = await fetch(proxied(url, settings.ouraProxy), {
    headers: { Authorization: `Bearer ${settings.ouraToken}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error(t('err.ouraBadToken'));
    throw new Error(t('err.ouraApi', { s: res.status }));
  }
  const data = await res.json();
  return data.data || [];
}

// 直近 days 日分を同期。成功した日数を返す。
export async function syncOura(days, settings) {
  if (!settings.ouraToken) throw new Error(t('err.ouraNoToken'));
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const fmt = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const range = { start: fmt(start), end: fmt(end) };

  // 各コレクションを並行取得（プロキシ未設定だとCORSで失敗しうる）
  let sleepScore = [], readiness = [], activity = [], sleep = [];
  try {
    [sleepScore, readiness, activity, sleep] = await Promise.all([
      getCollection('daily_sleep', range, settings),
      getCollection('daily_readiness', range, settings),
      getCollection('daily_activity', range, settings),
      getCollection('sleep', range, settings),
    ]);
  } catch (err) {
    // CORSは TypeError として出る
    if (err instanceof TypeError) {
      throw new Error(t('err.ouraCors'));
    }
    throw err;
  }

  const byDay = new Map();
  const ensure = (day) => {
    if (!byDay.has(day)) byDay.set(day, { source: 'oura' });
    return byDay.get(day);
  };
  for (const r of sleepScore) if (r.day != null) ensure(r.day).sleepScore = r.score;
  for (const r of readiness) if (r.day != null) ensure(r.day).readinessScore = r.score;
  for (const r of activity) if (r.day != null) ensure(r.day).steps = r.steps;
  for (const r of sleep) {
    if (r.day == null) continue;
    const d = ensure(r.day);
    if (r.average_hrv != null) d.hrv = Math.round(r.average_hrv);
    const hr = r.lowest_heart_rate ?? r.average_heart_rate;
    if (hr != null) d.restingHR = Math.round(hr);
    if (r.total_sleep_duration != null) d.sleepHours = Math.round((r.total_sleep_duration / 3600) * 10) / 10;
  }

  let count = 0;
  for (const [day, oura] of byDay) {
    await upsertDaily(day, { oura });
    count++;
  }
  return count;
}
