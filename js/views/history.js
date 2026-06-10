// 履歴画面 + 食事カード（記録画面・ホームからも再利用）
import { h, escapeHtml, formatDateJP, toast } from '../ui.js';
import { t } from '../i18n.js';
import { getMealsGroupedByDate, deleteMeal, putMeal } from '../db.js';
import { sumDay } from '../nutrition.js';

function round(n) { return Math.round((n || 0) * 10) / 10; }

function mini(label, value) {
  return h('div', { class: 'mini' }, [
    h('div', { class: 'mini-val', text: String(value) }),
    h('div', { class: 'mini-label', text: label }),
  ]);
}

// 1食分のカード。AIの推定値とフィードバックを表示。
// options: { showPhoto, editable, onDelete, onChange }
//  - editable: 「量を修正」ボタンで P/F/糖質/カロリーを手動修正できる
//  - onChange(meal): 保存後に呼ばれる（履歴側は再読込に使う）
export function resultCard(meal, { showPhoto = false, editable = false, onDelete = null, onChange = null } = {}) {
  const card = h('div', { class: 'card meal-card' });

  function render() {
    card.innerHTML = '';
    const a = meal.ai || {};
    const score = a.keto_score ?? 0;
    const scoreColor = score >= 70 ? '#63D8CC' : score >= 40 ? '#D8B36A' : '#E8857A';

    const head = h('div', { class: 'meal-head' }, [
      h('div', {}, [
        h('span', { class: 'meal-type', text: t(`mt.${meal.mealType || '食事'}`) }),
        h('span', { class: 'meal-time', text: new Date(meal.ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }),
      ]),
      h('div', { class: 'keto-score', style: `--c:${scoreColor}` }, [
        h('span', { class: 'score-num', text: String(score) }),
        h('span', { class: 'score-label', text: t('hi.ketoScore') }),
      ]),
    ]);
    card.append(head);

    if (showPhoto && meal.photo) card.append(h('img', { class: 'meal-photo', src: meal.photo, alt: 'meal' }));
    if (a.dish_summary) card.append(h('p', { class: 'dish-summary', text: a.dish_summary }));

    // 栄養価（4項目）
    card.append(h('div', { class: 'macros-mini' }, [
      mini('kcal', Math.round(a.calories || 0)),
      mini('P', `${round(a.protein_g)}g`),
      mini('F', `${round(a.fat_g)}g`),
      mini(t('common.netCarbs'), `${round(a.net_carbs_g)}g`),
    ]));

    // タグ
    const tags = h('div', { class: 'tags' }, [
      a.keto_friendly
        ? h('span', { class: 'tag good', text: t('hi.good') })
        : h('span', { class: 'tag bad', text: t('hi.bad') }),
    ]);
    if (a.edited) tags.append(h('span', { class: 'tag edited', text: t('hi.edited') }));
    card.append(tags);

    if (a.feedback) {
      card.append(h('div', { class: 'feedback' }, [
        h('div', { class: 'feedback-title', text: t('hi.feedback') }),
        h('p', { text: a.feedback }),
      ]));
    }
    if (a.suggestions && a.suggestions.length) {
      card.append(h('div', { class: 'suggestions' }, [
        h('div', { class: 'feedback-title', text: t('hi.suggestions') }),
        h('ul', {}, a.suggestions.map((s) => h('li', { text: s }))),
      ]));
    }
    if (a.flags && a.flags.length) {
      card.append(h('div', { class: 'flags' }, a.flags.map((f) => h('div', { class: 'flag', text: `⚠ ${f}` }))));
    }

    // アクション
    const actions = h('div', { class: 'card-actions' });
    if (editable) {
      actions.append(h('button', { class: 'btn tiny', type: 'button', text: t('hi.edit'), onclick: showEditor }));
    }
    if (onDelete) {
      actions.append(h('button', {
        class: 'btn tiny danger', type: 'button', text: t('common.delete'),
        onclick: async () => {
          if (!confirm(t('hi.confirmDelete'))) return;
          await deleteMeal(meal.id);
          onDelete();
        },
      }));
    }
    if (actions.childNodes.length) card.append(actions);
  }

  function showEditor() {
    const a = meal.ai || {};
    const editor = h('div', { class: 'macro-editor' });
    const field = (key, label, val) => h('label', { class: 'me-field' }, [
      h('span', { text: label }),
      h('input', { type: 'number', step: '0.1', inputmode: 'decimal', 'data-key': key, value: val ?? 0 }),
    ]);
    editor.append(
      h('div', { class: 'me-grid' }, [
        field('calories', 'kcal', round(a.calories)),
        field('protein_g', 'P (g)', round(a.protein_g)),
        field('fat_g', 'F (g)', round(a.fat_g)),
        field('net_carbs_g', `${t('common.netCarbs')} (g)`, round(a.net_carbs_g)),
      ]),
      h('div', { class: 'form-actions' }, [
        h('button', { class: 'btn tiny', type: 'button', text: t('common.cancel'), onclick: render }),
        h('button', {
          class: 'btn tiny primary', type: 'button', text: t('common.save'),
          onclick: async () => {
            const get = (k) => {
              const el = editor.querySelector(`[data-key="${k}"]`);
              return el && el.value !== '' ? Number(el.value) : 0;
            };
            const nc = get('net_carbs_g');
            meal.ai = {
              ...a,
              calories: get('calories'),
              protein_g: get('protein_g'),
              fat_g: get('fat_g'),
              net_carbs_g: nc,
              // 総炭水化物は ネット糖質 + 食物繊維 として整合を保つ
              total_carbs_g: nc + (a.fiber_g || 0),
              // 手動修正後はケト判定も数値ベースで再計算する
              // （1食あたりネット糖質10g以下をケト向きとみなす一般的基準）
              keto_friendly: nc <= 10,
              keto_score: Math.max(0, Math.min(100, Math.round(100 - nc * 5))),
              edited: true,
            };
            await putMeal(meal);
            toast(t('hi.editSaved'), 'success');
            if (onChange) onChange(meal); else render();
          },
        }),
      ])
    );
    // 既存の macros-mini を編集UIに差し替え
    const grid = card.querySelector('.macros-mini');
    if (grid) grid.replaceWith(editor);
    else card.append(editor);
  }

  render();
  return card;
}

export async function renderHistory(container, ctx) {
  const view = h('div', { class: 'view' });
  container.append(view);

  async function reload() {
    view.innerHTML = '';
    view.append(h('div', { class: 'loading', text: t('common.loading') }));
    const groups = await getMealsGroupedByDate();
    view.innerHTML = '';

    if (groups.size === 0) {
      view.append(h('div', { class: 'empty-state' }, [
        h('p', { text: t('hi.empty') }),
        h('button', { class: 'btn primary', text: t('hi.logBtn'), onclick: () => ctx.navigate('log') }),
      ]));
      return;
    }

    const dates = [...groups.keys()].sort((a, b) => b.localeCompare(a));
    for (const dateKey of dates) {
      const meals = groups.get(dateKey);
      const totals = sumDay(meals);
      view.append(
        h('div', { class: 'day-header' }, [
          h('span', { class: 'day-date', text: formatDateJP(dateKey) }),
          h('span', { class: 'day-total', text: t('hi.dayTotal', { cal: totals.calories, nc: totals.net_carbs_g, n: meals.length }) }),
        ])
      );
      for (const m of meals) {
        view.append(resultCard(m, {
          showPhoto: true,
          editable: true,
          onDelete: () => { toast(t('hi.deleted'), 'success'); reload(); },
          onChange: () => reload(),
        }));
      }
    }
  }

  await reload();
}
