// Supabase バックエンド連携（依存ゼロ・fetchのみ）。
//  - 認証（メール＋パスワード）
//  - /analyze（Geminiプロキシ）呼び出し
//  - データ同期（meals/daily_logs/checkups の push / pull）
//  - 購読状態・利用量の取得
// バックエンドが未設定（URL/anonキー無し）または未ログインのときは「無効」。
// その場合アプリは従来どおり BYOK（端末のClaudeキー）で動作する。

import { getSettings } from './store.js';
import { putMeal, getAllMeals, upsertDaily, getAllDaily, putCheckup, getAllCheckups, deleteMeal as dbDeleteMeal } from './db.js';

const SESSION_KEY = 'keto.session.v1';

function cfg() {
  const s = getSettings();
  return { url: (s.supabaseUrl || '').replace(/\/$/, ''), anon: s.supabaseAnonKey || '' };
}

export function backendConfigured() {
  const { url, anon } = cfg();
  return !!(url && anon);
}

/* ---------- セッション ---------- */
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
function saveSession(s) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}
export function currentUser() {
  const s = loadSession();
  return s && s.user ? s.user : null;
}
export function backendEnabled() {
  return backendConfigured() && !!currentUser();
}

function setFromAuthResponse(data) {
  if (!data || !data.access_token) return null;
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in ? data.expires_in * 1000 : 3600 * 1000),
    user: data.user || (data.user_metadata ? data : null),
  };
  saveSession(session);
  return session;
}

async function authFetch(path, opts = {}) {
  const { url, anon } = cfg();
  let session = loadSession();
  // 期限が近ければリフレッシュ
  if (session && session.expires_at - Date.now() < 60000 && session.refresh_token) {
    try {
      const r = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST', headers: { apikey: anon, 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (r.ok) session = setFromAuthResponse(await r.json());
    } catch { /* オフライン等は既存トークンで続行 */ }
  }
  const headers = { apikey: anon, 'content-type': 'application/json', ...(opts.headers || {}) };
  if (session) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(`${url}${path}`, { ...opts, headers });
}

/* ---------- 認証 ---------- */
export async function signUp(email, password) {
  const { url, anon } = cfg();
  const r = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST', headers: { apikey: anon, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.msg || data.error_description || 'signup failed');
  const session = setFromAuthResponse(data);
  return { session, needsConfirm: !session }; // メール確認が有効だとセッション無し
}

export async function signIn(email, password) {
  const { url, anon } = cfg();
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: anon, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error_description || data.msg || 'signin failed');
  const session = setFromAuthResponse(data);
  await pullAll().catch(() => {}); // 別端末のデータを取得
  return session;
}

export function signOut() { saveSession(null); }

/* ---------- /analyze（Geminiプロキシ） ---------- */
// 戻り値: { ai } または例外（402 はクォータ超過）
export async function backendAnalyze(payload) {
  const r = await authFetch('/functions/v1/analyze', { method: 'POST', body: JSON.stringify(payload) });
  if (r.status === 402) {
    const e = new Error('quota_exceeded');
    e.code = 'quota_exceeded';
    throw e;
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `backend ${r.status}`);
  return data.ai;
}

/* ---------- 購読・利用量 ---------- */
export async function getEntitlement() {
  const r = await authFetch('/rest/v1/profiles?select=subscription_status,plan,analyses_used,month_key,current_period_end');
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []);
  return rows[0] || null;
}

/* ---------- データ同期 ---------- */
function uid() { const u = currentUser(); return u && u.id; }

async function upsert(table, body) {
  return authFetch(`/rest/v1/${table}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  });
}

export async function pushMeal(meal) {
  if (!backendEnabled()) return;
  try {
    await upsert('meals', {
      id: meal.id, user_id: uid(), date_key: meal.dateKey, ts: meal.ts,
      meal_type: meal.mealType, text: meal.text || '', ai: meal.ai || {},
      updated_at: new Date().toISOString(),
    });
  } catch { /* 同期失敗は無視（次回push/pullで回復） */ }
}
export async function removeMeal(id) {
  if (!backendEnabled()) return;
  try { await authFetch(`/rest/v1/meals?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); } catch { /* noop */ }
}
export async function pushDaily(dateKey, data) {
  if (!backendEnabled()) return;
  try { await upsert('daily_logs', { user_id: uid(), date_key: dateKey, data, updated_at: new Date().toISOString() }); } catch { /* noop */ }
}
export async function pushCheckup(rec) {
  if (!backendEnabled()) return;
  try { await upsert('checkups', { id: rec.id, user_id: uid(), date: rec.date, values: rec.values || {}, notes: rec.notes || '', updated_at: new Date().toISOString() }); } catch { /* noop */ }
}
export async function removeCheckup(id) {
  if (!backendEnabled()) return;
  try { await authFetch(`/rest/v1/checkups?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); } catch { /* noop */ }
}

// ログイン時: サーバーのデータを端末へ取り込む（クラウド優先で復元）
export async function pullAll() {
  if (!backendEnabled()) return;
  const [m, d, c] = await Promise.all([
    authFetch('/rest/v1/meals?select=*').then((r) => r.ok ? r.json() : []),
    authFetch('/rest/v1/daily_logs?select=*').then((r) => r.ok ? r.json() : []),
    authFetch('/rest/v1/checkups?select=*').then((r) => r.ok ? r.json() : []),
  ]);
  for (const r of m || []) {
    await putMeal({ id: r.id, ts: r.ts, dateKey: r.date_key, mealType: r.meal_type, text: r.text, photo: null, ai: r.ai || {}, status: 'done' });
  }
  for (const r of d || []) {
    await upsertDaily(r.date_key, r.data || {});
  }
  for (const r of c || []) {
    await putCheckup({ id: r.id, date: r.date, values: r.values || {}, notes: r.notes || '', createdAt: r.updated_at });
  }
}

// 端末の既存データを初回まとめてサーバーへ送る（任意・サインアップ直後など）
export async function pushAllLocal() {
  if (!backendEnabled()) return;
  const [meals, daily, checkups] = await Promise.all([getAllMeals(), getAllDaily(), getAllCheckups()]);
  for (const m of meals) await pushMeal(m);
  for (const d of daily) await pushDaily(d.dateKey, d);
  for (const c of checkups) await pushCheckup(c);
}

export { dbDeleteMeal };
