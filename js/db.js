// 食事記録・日次コンディション・健康診断の保存（IndexedDB）。
//  - meals   : 1食ごとの記録（写真含む）
//  - daily   : 1日ごとのコンディション（体重・体脂肪・筋トレ・血中ケトン・Oura等）
//  - checkups: 健康診断などの定期データ（時系列）

const DB_NAME = 'keto-app';
const DB_VERSION = 2;
const STORE = 'meals';
const DAILY = 'daily';
const CHECKUPS = 'checkups';

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('dateKey', 'dateKey', { unique: false });
        os.createIndex('ts', 'ts', { unique: false });
      }
      if (!db.objectStoreNames.contains(DAILY)) {
        // dateKey(YYYY-MM-DD) を主キーに。1日1レコード。
        db.createObjectStore(DAILY, { keyPath: 'dateKey' });
      }
      if (!db.objectStoreNames.contains(CHECKUPS)) {
        const cs = db.createObjectStore(CHECKUPS, { keyPath: 'id' });
        cs.createIndex('date', 'date', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function store(name, mode) {
  return openDB().then((db) => db.transaction(name, mode).objectStore(name));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ---------- meals ---------- */

export async function putMeal(meal) {
  const os = await store(STORE, 'readwrite');
  await reqToPromise(os.put(meal));
  return meal;
}
export async function getMeal(id) {
  const os = await store(STORE, 'readonly');
  return (await reqToPromise(os.get(id))) || null;
}
export async function deleteMeal(id) {
  const os = await store(STORE, 'readwrite');
  return reqToPromise(os.delete(id));
}
export async function getMealsByDate(dateKey) {
  const os = await store(STORE, 'readonly');
  const res = (await reqToPromise(os.index('dateKey').getAll(IDBKeyRange.only(dateKey)))) || [];
  return res.sort((a, b) => a.ts.localeCompare(b.ts));
}
export async function getAllMeals() {
  const os = await store(STORE, 'readonly');
  const res = (await reqToPromise(os.getAll())) || [];
  return res.sort((a, b) => b.ts.localeCompare(a.ts));
}
export async function getMealsGroupedByDate() {
  const all = await getAllMeals();
  const groups = new Map();
  for (const m of all) {
    if (!groups.has(m.dateKey)) groups.set(m.dateKey, []);
    groups.get(m.dateKey).push(m);
  }
  return groups;
}

/* ---------- daily condition ---------- */

export async function getDaily(dateKey) {
  const os = await store(DAILY, 'readonly');
  return (await reqToPromise(os.get(dateKey))) || null;
}

// 既存レコードに部分マージして保存
export async function upsertDaily(dateKey, patch) {
  const os = await store(DAILY, 'readwrite');
  const existing = (await reqToPromise(os.get(dateKey))) || { dateKey };
  const next = deepMerge(existing, patch);
  next.dateKey = dateKey;
  next.updatedAt = new Date().toISOString();
  await reqToPromise(os.put(next));
  return next;
}

export async function getAllDaily() {
  const os = await store(DAILY, 'readonly');
  const res = (await reqToPromise(os.getAll())) || [];
  return res.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

/* ---------- checkups ---------- */

export async function putCheckup(rec) {
  const os = await store(CHECKUPS, 'readwrite');
  await reqToPromise(os.put(rec));
  return rec;
}
export async function deleteCheckup(id) {
  const os = await store(CHECKUPS, 'readwrite');
  return reqToPromise(os.delete(id));
}
export async function getAllCheckups() {
  const os = await store(CHECKUPS, 'readonly');
  const res = (await reqToPromise(os.getAll())) || [];
  return res.sort((a, b) => a.date.localeCompare(b.date));
}

/* ---------- utils ---------- */

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function deepMerge(target, patch) {
  const out = { ...target };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge(out[k] && typeof out[k] === 'object' ? out[k] : {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
