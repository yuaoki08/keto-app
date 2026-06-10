// ダッシュボード：日付ナビ・PFCを大きく表示・その日の食事(修正可)・コンディション・AIコーチ
import { h, escapeHtml, toast, progressRing } from '../ui.js';
import { t, getLang } from '../i18n.js';
import { getProfile, getSettings, saveProfile, profileIsComplete, TRAINING_TYPES } from '../store.js';
import {
  getMealsByDate, getMealsGroupedByDate, getDaily, upsertDaily, getAllDaily, getAllCheckups,
} from '../db.js';
import {
  todayKey, dateKeyOffset, sumDay, ketoMacroTargets, ketosisLevel, streakFromDates,
} from '../nutrition.js';
import { coachAdvice } from '../ai.js';
import { syncOura } from '../oura.js';
import { pushDaily } from '../backend.js';
import { resultCard } from './history.js';

// 表示・入力対象の日付（セッション内で保持）。既定は今日。
let selectedDate = todayKey();

function dayLabel(dateKey) {
  return dateKey === todayKey() ? t('d.today') : formatDate(dateKey);
}
function formatDate(dateKey) {
  const d = new Date(`${dateKey}T00:00:00`);
  return getLang() === 'en'
    ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
    : `${Number(dateKey.slice(5, 7))}月${Number(dateKey.slice(8, 10))}日(${['日','月','火','水','木','金','土'][d.getDay()]})`;
}

export async function renderDashboard(container, ctx) {
  const profile = getProfile();
  const settings = getSettings();
  const view = h('div', { class: 'view' });
  container.append(view);

  const dateKey = selectedDate;
  const isToday = dateKey === todayKey();
  const [meals, daily, allDaily, mealGroups] = await Promise.all([
    getMealsByDate(dateKey), getDaily(dateKey), getAllDaily(), getMealsGroupedByDate(),
  ]);
  const totals = sumDay(meals);
  const targets = ketoMacroTargets(profile);

  const reload = () => { container.innerHTML = ''; renderDashboard(container, ctx); };

  if (!profileIsComplete(profile)) {
    view.append(h('div', { class: 'card cta' }, [
      h('h3', { text: t('d.setupTitle') }),
      h('p', { class: 'muted', text: t('d.setupBody') }),
      h('button', { class: 'btn primary', text: t('d.setupBtn'), onclick: () => ctx.navigate('profile') }),
    ]));
  }

  /* ---- 日付ナビ ---- */
  view.append(buildDateNav(dateKey, isToday, (newDate) => { selectedDate = newDate; reload(); }));

  /* ---- PFC を大きく表示 ---- */
  const pfc = h('div', { class: 'card pfc-card' });
  const over = targets && totals.net_carbs_g > targets.netCarbG;
  pfc.append(
    h('div', { class: 'pfc-head' }, [
      h('span', { class: 'micro', text: t('d.pfcTitle') }),
      h('span', { class: 'pfc-cal', text: targets ? t('d.calLine', { v: Math.round(totals.calories), t: targets.calories }) : `${Math.round(totals.calories)} kcal` }),
    ]),
    h('div', { class: 'macro-rings' }, [
      macroRing(t('common.protein'), totals.protein_g, targets && targets.proteinG, 'ice'),
      macroRing(t('common.fat'), totals.fat_g, targets && targets.fatG, 'gold'),
      macroRing(t('common.netCarbs'), totals.net_carbs_g, targets && targets.netCarbG, over ? 'coral' : 'teal'),
    ])
  );
  view.append(pfc);

  /* ---- ケトーシス状態（その日の値を優先） ---- */
  const bhb = (daily && daily.bloodKetones != null) ? daily.bloodKetones : (isToday ? profile.bloodKetones : null);
  const kl = ketosisLevel(bhb);
  if (kl) {
    view.append(h('div', { class: 'card ketosis-mini' }, [
      h('div', { class: 'state' + (kl.key === 'none' || kl.key === 'high' ? ' warn-state' : '') }, [
        h('span', { class: 'dot' }),
        h('span', { text: `${t(`kl.${kl.key}.label`)} · ${bhb} mmol/L` }),
      ]),
    ]));
  }

  /* ---- streak（常に全期間ベース） ---- */
  const carbLimit = profile.netCarbLimitG ?? 20;
  const carbByDay = new Map();
  for (const [dk, ms] of mealGroups) carbByDay.set(dk, sumDay(ms).net_carbs_g);
  const carbStreak = streakFromDates(new Set([...carbByDay.entries()].filter(([, c]) => c <= carbLimit).map(([dk]) => dk)));
  const trainStreak = streakFromDates(new Set(allDaily.filter((d) => d.training && d.training.done).map((d) => d.dateKey)));
  view.append(h('div', { class: 'streak-row' }, [
    streakCell(t('d.carbStreak'), carbStreak, carbStreak > 0),
    streakCell(t('d.trainStreak'), trainStreak, trainStreak > 0),
  ]));

  /* ---- コンディション入力（選択日） ---- */
  view.append(buildConditionCard(dateKey, daily, settings, ctx, reload));

  /* ---- その日の食事（修正可） ---- */
  const mealsCard = h('div', { class: 'card' });
  mealsCard.append(h('h3', { text: `${t('d.dayMeals')} · ${t('d.intakeOf', { n: meals.length })}` }));
  if (meals.length === 0) {
    mealsCard.append(h('p', { class: 'muted', text: t('d.noMealsDay') }));
  } else {
    for (const m of meals) {
      mealsCard.append(resultCard(m, { showPhoto: false, editable: true, onChange: reload, onDelete: () => { toast(t('hi.deleted'), 'success'); reload(); } }));
    }
  }
  view.append(mealsCard);

  view.append(h('div', { class: 'form-actions' }, [
    h('button', { class: 'btn primary big', text: t('d.logMeal'), onclick: () => { ctx.logDate = dateKey; ctx.navigate('log'); } }),
    h('button', { class: 'btn', text: t('d.viewTrends'), onclick: () => ctx.navigate('progress') }),
  ]));

  /* ---- AIコーチ ---- */
  view.append(buildCoachCard(profile, settings, ctx));
}

/* ===== 部品 ===== */

function buildDateNav(dateKey, isToday, onPick) {
  const prev = h('button', { class: 'date-arrow', type: 'button', 'aria-label': 'previous day', text: '‹', onclick: () => onPick(dateKeyOffset(-1, new Date(`${dateKey}T00:00:00`))) });
  const next = h('button', { class: 'date-arrow', type: 'button', 'aria-label': 'next day', text: '›', ...(isToday ? { disabled: true } : {}), onclick: () => { if (!isToday) onPick(dateKeyOffset(1, new Date(`${dateKey}T00:00:00`))); } });
  const picker = h('input', { type: 'date', class: 'date-input', value: dateKey, max: todayKey() });
  picker.addEventListener('change', () => { if (picker.value) onPick(picker.value); });
  const label = h('button', { class: 'date-label', type: 'button', text: dayLabel(dateKey), onclick: () => picker.showPicker ? picker.showPicker() : picker.focus() });
  const row = h('div', { class: 'date-nav' }, [prev, h('div', { class: 'date-center' }, [label, picker]), next]);
  if (!isToday) {
    row.append(h('button', { class: 'btn tiny', type: 'button', text: t('d.today'), onclick: () => onPick(todayKey()) }));
  }
  return row;
}

// P/F/糖質 を 1つのリング＋数値で大きく表示
function macroRing(label, value, target, grad) {
  const v = Math.round((value || 0) * 10) / 10;
  const ring = progressRing({
    value: value || 0, max: target || (value || 1), size: 104, stroke: 8, grad,
    num: Math.round(value || 0), numUnit: 'g',
  });
  ring.classList.add('mring-ring');
  return h('div', { class: 'mring' }, [
    ring,
    h('div', { class: 'mring-name', text: label }),
    h('div', { class: 'mring-target', text: target ? t('d.targetG', { t: target }) : `${v} g` }),
  ]);
}

function streakCell(label, value, lit) {
  return h('div', { class: 'streak' + (lit ? ' lit' : '') }, [
    h('div', { class: 'streak-num' }, [document.createTextNode(String(value)), h('small', { text: t('common.days') })]),
    h('div', { class: 'streak-label', text: label }),
  ]);
}

function buildConditionCard(dateKey, daily, settings, ctx, reload) {
  const d = daily || {};
  const tr = d.training || {};
  const card = h('div', { class: 'card' });
  card.append(h('h3', { text: t('d.condition') }));

  const numField = (label, name, value) =>
    h('label', { class: 'field' }, [
      h('span', { class: 'field-label', text: label }),
      h('input', { type: 'number', step: '0.1', inputmode: 'decimal', name, value: value ?? '' }),
    ]);

  const grid = h('div', { class: 'cond-grid' }, [
    numField(t('d.weightKg'), 'weightKg', d.weightKg),
    numField(t('d.bodyFatPct'), 'bodyFatPct', d.bodyFatPct),
    numField(t('d.ketoneMmol'), 'bloodKetones', d.bloodKetones),
    numField(t('d.glucoseMg'), 'bloodGlucose', d.bloodGlucose),
  ]);

  let trainingDone = !!tr.done;
  const toggle = h('button', { type: 'button', class: 'btn toggle' + (trainingDone ? ' on' : ''), text: trainingDone ? t('d.trainedOn') : t('d.trainedQ') });
  const trainDetail = h('div', { class: 'train-detail' + (trainingDone ? '' : ' hidden') });
  const typeChips = h('div', { class: 'chips' }, TRAINING_TYPES.map((tt) => {
    const chip = h('button', { type: 'button', class: 'chip' + ((tr.type || '筋トレ') === tt ? ' active' : ''), text: t(`tt.${tt}`) });
    chip.dataset.value = tt;
    chip.addEventListener('click', () => {
      trainDetail.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
    });
    return chip;
  }));
  const minutesInput = h('input', { type: 'number', inputmode: 'numeric', name: 'minutes', value: tr.minutes ?? 30 });
  trainDetail.append(typeChips, h('label', { class: 'field' }, [h('span', { class: 'field-label', text: t('d.minutes') }), minutesInput]));
  toggle.addEventListener('click', () => {
    trainingDone = !trainingDone;
    toggle.classList.toggle('on', trainingDone);
    toggle.textContent = trainingDone ? t('d.trainedOn') : t('d.trainedQ');
    trainDetail.classList.toggle('hidden', !trainingDone);
  });

  const ouraRow = h('div', { class: 'oura-row' });
  if (d.oura && (d.oura.sleepScore != null || d.oura.readinessScore != null)) {
    let line = t('d.ouraLine', { s: d.oura.sleepScore ?? '–', r: d.oura.readinessScore ?? '–' });
    if (d.oura.hrv != null) line += ` / HRV ${d.oura.hrv}`;
    ouraRow.append(h('span', { class: 'muted small', text: line }));
  }
  const ouraBtn = h('button', { type: 'button', class: 'btn', text: settings.ouraToken ? t('d.ouraSync') : t('d.ouraSetup') });
  ouraBtn.addEventListener('click', async () => {
    if (!settings.ouraToken) { ctx.navigate('settings'); return; }
    ouraBtn.disabled = true; ouraBtn.textContent = t('d.syncing');
    try {
      const n = await syncOura(30, settings);
      toast(t('d.ouraSynced', { n }), 'success');
      reload();
    } catch (err) { toast(err.message, 'error'); } finally {
      ouraBtn.disabled = false; ouraBtn.textContent = t('d.ouraSync');
    }
  });
  ouraRow.append(ouraBtn);

  const saveBtn = h('button', { type: 'button', class: 'btn primary', text: t('d.saveDay') });
  saveBtn.addEventListener('click', async () => {
    const num = (el) => (el.value === '' ? null : Number(el.value));
    const patch = {
      weightKg: num(grid.querySelector('[name=weightKg]')),
      bodyFatPct: num(grid.querySelector('[name=bodyFatPct]')),
      bloodKetones: num(grid.querySelector('[name=bloodKetones]')),
      bloodGlucose: num(grid.querySelector('[name=bloodGlucose]')),
      training: {
        done: trainingDone,
        type: typeChips.querySelector('.chip.active')?.dataset.value || '筋トレ',
        minutes: minutesInput.value ? Number(minutesInput.value) : null,
      },
    };
    const merged = await upsertDaily(dateKey, patch);
    pushDaily(dateKey, merged);
    // 今日の入力のみプロフィールへ反映（目標カロリーの追従）
    if (dateKey === todayKey()) {
      if (patch.weightKg) saveProfile({ weightKg: patch.weightKg });
      if (patch.bodyFatPct) saveProfile({ bodyFatPct: patch.bodyFatPct });
      if (patch.bloodKetones != null) saveProfile({ bloodKetones: patch.bloodKetones });
    }
    toast(t('d.savedDay'), 'success');
    reload();
  });

  card.append(grid, toggle, trainDetail, h('div', { class: 'form-actions' }, [saveBtn]), ouraRow);
  return card;
}

function buildCoachCard(profile, settings, ctx) {
  const box = h('div', { class: 'card' });
  box.append(h('h3', { text: t('d.coach') }));
  const btn = h('button', { class: 'btn', type: 'button', text: t('d.coachBtn') });
  const out = h('div', { class: 'coach-out' });
  btn.addEventListener('click', async () => {
    if (!settings.apiKey) { toast(t('d.needKey'), 'error'); ctx.navigate('settings'); return; }
    btn.disabled = true;
    out.innerHTML = '';
    out.append(h('div', { class: 'loading', text: t('d.coachLoading') }));
    try {
      const [groups, allDaily, checkups] = await Promise.all([getMealsGroupedByDate(), getAllDaily(), getAllCheckups()]);
      const dailyMap = new Map(allDaily.map((d) => [d.dateKey, d]));
      const recentDays = [...groups.entries()]
        .sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7)
        .map(([dk, ms]) => { const dd = dailyMap.get(dk) || {}; return { dateKey: dk, totals: sumDay(ms), count: ms.length, training: dd.training, oura: dd.oura }; });
      if (recentDays.length === 0) { out.innerHTML = ''; out.append(h('p', { class: 'muted', text: t('d.noRecords') })); return; }
      const carbLimit = profile.netCarbLimitG ?? 20;
      const carbStreak = streakFromDates(new Set([...groups.entries()].filter(([, ms]) => sumDay(ms).net_carbs_g <= carbLimit).map(([dk]) => dk)));
      const trainStreak = streakFromDates(new Set(allDaily.filter((d) => d.training && d.training.done).map((d) => d.dateKey)));
      const latestCheckup = checkups.length ? checkups[checkups.length - 1] : null;
      const advice = await coachAdvice({ recentDays, latestCheckup, streaks: { carb: carbStreak, training: trainStreak } }, profile, settings);
      out.innerHTML = '';
      out.append(h('p', { class: 'advice-text', text: advice }));
    } catch (err) {
      out.innerHTML = '';
      out.append(h('div', { class: 'card error', html: escapeHtml(err.message) }));
    } finally { btn.disabled = false; }
  });
  box.append(btn, out);
  return box;
}
