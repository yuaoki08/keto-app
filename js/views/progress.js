// 進捗ビュー：体重・体脂肪、筋トレ頻度＋Oura回復、糖質遵守streak、健康診断推移のグラフ
import { h } from '../ui.js';
import { t } from '../i18n.js';
import { lineChart, barChart, legend } from '../charts.js';
import { getAllDaily, getMealsGroupedByDate, getAllCheckups } from '../db.js';
import { getProfile } from '../store.js';
import {
  ketoMacroTargets, sumDay, lastNDateKeys, streakFromDates, todayKey,
} from '../nutrition.js';
import { CHECKUP_METRICS } from '../store.js';

let RANGE = 30;

function card(title, ...nodes) {
  return h('div', { class: 'card' }, [h('h3', { text: title }), ...nodes]);
}

function streakBadge(label, value, lit) {
  return h('div', { class: 'streak' + (lit ? ' lit' : '') }, [
    h('div', { class: 'streak-num', text: String(value) }),
    h('div', { class: 'streak-label', text: label }),
  ]);
}

export async function renderProgress(container, ctx) {
  const view = h('div', { class: 'view' });
  container.append(view);

  const [dailyArr, mealGroups, checkups] = await Promise.all([
    getAllDaily(), getMealsGroupedByDate(), getAllCheckups(),
  ]);
  const profile = getProfile();
  const targets = ketoMacroTargets(profile);
  const carbLimit = profile.netCarbLimitG ?? 20;

  const dailyMap = new Map(dailyArr.map((d) => [d.dateKey, d]));
  // 食事の日次ネット糖質
  const carbByDay = new Map();
  for (const [dk, meals] of mealGroups) carbByDay.set(dk, sumDay(meals).net_carbs_g);

  // --- streak 計算 ---
  const carbQualifying = new Set([...carbByDay.entries()].filter(([, c]) => c <= carbLimit).map(([dk]) => dk));
  const trainQualifying = new Set(dailyArr.filter((d) => d.training && d.training.done).map((d) => d.dateKey));
  const carbStreak = streakFromDates(carbQualifying);
  const trainStreak = streakFromDates(trainQualifying);
  // 直近range日の筋トレ回数
  const rangeKeys = lastNDateKeys(RANGE);
  const trainCount = rangeKeys.filter((dk) => trainQualifying.has(dk)).length;

  // --- レンジ切替 ---
  const ranges = [14, 30, 90];
  const rangeRow = h('div', { class: 'chips range-tabs' }, ranges.map((r) =>
    h('button', { type: 'button', class: 'chip' + (r === RANGE ? ' active' : ''), text: t(`pr.range${r}`),
      onclick: () => { RANGE = r; container.innerHTML = ''; renderProgress(container, ctx); } })
  ));

  // streak バッジ
  const badges = h('div', { class: 'streak-row' }, [
    streakBadge(t('pr.carbStreakDays'), carbStreak, carbStreak > 0),
    streakBadge(t('pr.trainStreakDays'), trainStreak, trainStreak > 0),
    streakBadge(t('pr.trainCount', { n: RANGE }), trainCount, trainCount > 0),
  ]);

  view.append(badges, rangeRow);

  const keys = lastNDateKeys(RANGE);

  // --- 体重・体脂肪 ---
  const weightPts = keys.map((dk) => ({ x: dk, y: dailyMap.get(dk)?.weightKg ?? null }));
  const fatPts = keys.map((dk) => ({ x: dk, y: dailyMap.get(dk)?.bodyFatPct ?? null }));
  const hasWeight = weightPts.some((p) => p.y != null);
  const hasFat = fatPts.some((p) => p.y != null);
  const wfCard = card(t('pr.weightFat'));
  if (hasWeight) {
    wfCard.append(
      h('div', { class: 'chart-label', text: `${t('pr.weightLabel')}${profile.goalWeightKg ? ` · ${t('pr.goal')} ${profile.goalWeightKg}kg` : ''}` }),
      lineChart([{ label: t('common.weight'), color: '#63D8CC', points: weightPts }], { height: 180 })
    );
  }
  if (hasFat) {
    wfCard.append(
      h('div', { class: 'chart-label', text: t('pr.fatLabel') }),
      lineChart([{ label: t('common.bodyFat'), color: '#D8B36A', points: fatPts }], { height: 150 })
    );
  }
  if (!hasWeight && !hasFat) wfCard.append(h('p', { class: 'muted', text: t('pr.weightEmpty') }));
  view.append(wfCard);

  // --- 筋トレ頻度 ---
  const trainBars = keys.map((dk) => {
    const t = dailyMap.get(dk)?.training;
    return { label: dk, value: t && t.done ? (t.minutes || 30) : 0, color: '#D8B36A' };
  });
  view.append(card(t('pr.training'), barChart(trainBars, { height: 160, color: '#D8B36A' })));

  // --- Oura 回復 ---
  const sleepPts = keys.map((dk) => ({ x: dk, y: dailyMap.get(dk)?.oura?.sleepScore ?? null }));
  const readyPts = keys.map((dk) => ({ x: dk, y: dailyMap.get(dk)?.oura?.readinessScore ?? null }));
  const hrvPts = keys.map((dk) => ({ x: dk, y: dailyMap.get(dk)?.oura?.hrv ?? null }));
  const hasOura = sleepPts.some((p) => p.y != null) || readyPts.some((p) => p.y != null);
  const ouraCard = card(t('pr.oura'));
  if (hasOura) {
    const series = [
      { label: t('pr.sleepScore'), color: '#59B7E8', points: sleepPts },
      { label: t('pr.readiness'), color: '#63D8CC', points: readyPts },
    ];
    ouraCard.append(legend(series), lineChart(series, { height: 180, yMin: 0, yMax: 100 }));
    if (hrvPts.some((p) => p.y != null)) {
      ouraCard.append(h('div', { class: 'chart-label', text: 'HRV (ms)' }), lineChart([{ label: 'HRV', color: '#59B7E8', points: hrvPts }], { height: 130 }));
    }
  } else {
    ouraCard.append(h('p', { class: 'muted', text: t('pr.ouraEmpty') }));
  }
  view.append(ouraCard);

  // --- ネット糖質遵守 ---
  const carbPts = keys.map((dk) => ({ x: dk, y: carbByDay.has(dk) ? carbByDay.get(dk) : null }));
  const carbCard = card(t('pr.netCarbs'));
  if (carbPts.some((p) => p.y != null)) {
    carbCard.append(
      h('div', { class: 'chart-label', text: t('pr.netCarbLabel', { max: carbLimit }) }),
      lineChart([{ label: t('common.netCarbs'), color: '#63D8CC', points: carbPts }], { height: 170, yMin: 0 })
    );
  } else {
    carbCard.append(h('p', { class: 'muted', text: t('pr.carbEmpty') }));
  }
  view.append(carbCard);

  // --- 健康診断の推移 ---
  if (checkups.length) {
    const cCard = card(t('pr.checkups'));
    let any = false;
    for (const m of CHECKUP_METRICS) {
      const pts = checkups.map((c) => ({ x: c.date, y: c.values?.[m.key] ?? null })).filter((p) => p.y != null);
      if (pts.length < 1) continue;
      any = true;
      const latest = pts[pts.length - 1];
      cCard.append(h('div', { class: 'chart-label', text: `${t(`cm.${m.key}`)} (${m.unit}) · ${t('pr.latest')}: ${latest.y}` }));
      if (pts.length >= 2) {
        cCard.append(lineChart([{ label: t(`cm.${m.key}`), color: '#59B7E8', points: checkups.map((c) => ({ x: c.date, y: c.values?.[m.key] ?? null })) }], { height: 120 }));
      }
    }
    if (!any) cCard.append(h('p', { class: 'muted', text: t('pr.checkupEmpty') }));
    cCard.append(h('button', { class: 'btn', text: t('pr.editCheckups'), onclick: () => ctx.navigate('checkups') }));
    view.append(cCard);
  } else {
    view.append(card(t('pr.checkups'),
      h('p', { class: 'muted', text: t('pr.checkupHint') }),
      h('button', { class: 'btn', text: t('pr.addCheckups'), onclick: () => ctx.navigate('checkups') })
    ));
  }
}
