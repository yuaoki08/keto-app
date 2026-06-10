// プロフィール（健康情報）入力画面
import { h, toast } from '../ui.js';
import { t } from '../i18n.js';
import { getProfile, saveProfile } from '../store.js';
import { ACTIVITY_LEVELS, bmr, tdee, ketoMacroTargets, ketosisLevel } from '../nutrition.js';

function field(label, control, hint) {
  return h('label', { class: 'field' }, [
    h('span', { class: 'field-label', text: label }),
    control,
    hint ? h('span', { class: 'field-hint', text: hint }) : null,
  ]);
}

function input(name, value, attrs = {}) {
  return h('input', { name, value: value ?? '', ...attrs });
}

export function renderProfile(container, ctx) {
  const p = getProfile();
  const form = h('form', { class: 'form', id: 'profile-form' });

  // --- 基本身体情報 ---
  const sexSel = h('select', { name: 'sex' }, [
    h('option', { value: 'male', ...(p.sex === 'male' ? { selected: true } : {}) }, t('p.male')),
    h('option', { value: 'female', ...(p.sex === 'female' ? { selected: true } : {}) }, t('p.female')),
  ]);
  const activitySel = h('select', { name: 'activity' },
    ACTIVITY_LEVELS.map((a, i) =>
      h('option', { value: a.value, ...(Number(p.activity) === a.value ? { selected: true } : {}) }, t(`act.${i + 1}`))
    )
  );

  form.append(
    h('h2', { text: t('p.basic') }),
    field(t('p.sex'), sexSel),
    field(t('p.age'), input('age', p.age, { type: 'number', min: 1, max: 120, inputmode: 'numeric' })),
    field(t('p.height'), input('heightCm', p.heightCm, { type: 'number', step: '0.1', inputmode: 'decimal' })),
    field(t('p.weight'), input('weightKg', p.weightKg, { type: 'number', step: '0.1', inputmode: 'decimal' })),
    field(t('p.activity'), activitySel),

    h('h2', { text: t('p.goal') }),
    field(t('p.goalWeight'), input('goalWeightKg', p.goalWeightKg, { type: 'number', step: '0.1', inputmode: 'decimal' })),
    field(t('p.pace'), input('paceKgPerWeek', p.paceKgPerWeek, { type: 'number', step: '0.1', inputmode: 'decimal' }), t('p.paceHint')),
    field(t('p.targetDate'), input('targetDate', p.targetDate, { type: 'date' })),
    field(t('p.carbLimit'), input('netCarbLimitG', p.netCarbLimitG, { type: 'number', step: '1', inputmode: 'numeric' }), t('p.carbHint')),
    field(t('p.proteinCoef'), input('proteinPerKg', p.proteinPerKg, { type: 'number', step: '0.1', inputmode: 'decimal' }), t('p.proteinHint')),

    h('h2', { text: t('p.blood') }),
    field(t('p.glucose'), input('bloodGlucose', p.bloodGlucose, { type: 'number', step: '1', inputmode: 'numeric' })),
    field(t('p.ketone'), input('bloodKetones', p.bloodKetones, { type: 'number', step: '0.1', inputmode: 'decimal' }), t('p.ketoneHint')),
    field(t('p.bodyFat'), input('bodyFatPct', p.bodyFatPct, { type: 'number', step: '0.1', inputmode: 'decimal' })),

    h('h2', { text: t('p.limits') }),
    field(t('p.conditions'), h('textarea', { name: 'conditions', rows: 2 }, p.conditions || '')),
    field(t('p.medications'), h('textarea', { name: 'medications', rows: 2 }, p.medications || '')),
    field(t('p.allergies'), h('textarea', { name: 'allergies', rows: 2 }, p.allergies || '')),
    field(t('p.dislikes'), h('textarea', { name: 'dislikes', rows: 2 }, p.dislikes || '')),
    field(t('p.notes'), h('textarea', { name: 'notes', rows: 2 }, p.notes || '')),
  );

  const calcBox = h('div', { class: 'card calc-box' });
  function renderCalc() {
    const data = readForm(form);
    const b = bmr(data);
    const td = tdee(data);
    const targets = ketoMacroTargets(data);
    const kl = ketosisLevel(data.bloodKetones);
    calcBox.innerHTML = '';
    calcBox.append(h('h3', { text: t('p.calc') }));
    if (b == null) {
      calcBox.append(h('p', { class: 'muted', text: t('p.calcHint') }));
    } else {
      calcBox.append(
        h('div', { class: 'calc-grid' }, [
          stat(t('p.bmr'), `${b} kcal`),
          stat(t('p.tdee'), `${td} kcal`),
          stat(t('p.targetCal'), `${targets.calories} kcal`),
          stat(t('common.protein'), `${targets.proteinG} g`),
          stat(t('common.fat'), `${targets.fatG} g`),
          stat(t('common.netCarbs'), `${targets.netCarbG} g`),
        ])
      );
      calcBox.append(h('p', { class: 'muted small', text: t('p.ratio', { f: targets.ratio.fat, p: targets.ratio.protein, c: targets.ratio.carb }) }));
      if (kl) {
        calcBox.append(h('p', { class: 'ketosis-badge', style: `color:${kl.color}`, text: t('p.currentKetosis', { label: t(`kl.${kl.key}.label`) }) }));
      }
    }
  }

  form.addEventListener('input', renderCalc);

  // 保存処理（submitボタンがフォーム外でも確実に動くよう、明示的なclickで実行）
  const doSave = () => {
    const data = readForm(form);
    saveProfile(data);
    toast(t('p.saved'), 'success');
    ctx.refreshHeader && ctx.refreshHeader();
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); doSave(); });
  const saveBtn = h('button', { class: 'btn primary', type: 'button', text: t('common.save'), onclick: doSave });

  container.append(
    h('div', { class: 'view' }, [
      h('p', { class: 'muted', text: t('p.intro') }),
      calcBox,
      form,
      h('div', { class: 'form-actions' }, [saveBtn]),
    ])
  );
  renderCalc();
}

function stat(label, value) {
  return h('div', { class: 'stat' }, [
    h('div', { class: 'stat-val', text: value }),
    h('div', { class: 'stat-label', text: label }),
  ]);
}

function readForm(form) {
  const fd = new FormData(form);
  const num = (k) => {
    const v = fd.get(k);
    return v === '' || v == null ? null : Number(v);
  };
  return {
    sex: fd.get('sex'),
    age: num('age'),
    heightCm: num('heightCm'),
    weightKg: num('weightKg'),
    activity: num('activity') || 1.375,
    goalWeightKg: num('goalWeightKg'),
    paceKgPerWeek: num('paceKgPerWeek') ?? 0,
    targetDate: fd.get('targetDate') || '',
    netCarbLimitG: num('netCarbLimitG') ?? 20,
    proteinPerKg: num('proteinPerKg') ?? 1.4,
    bloodGlucose: num('bloodGlucose'),
    bloodKetones: num('bloodKetones'),
    bodyFatPct: num('bodyFatPct'),
    conditions: fd.get('conditions') || '',
    medications: fd.get('medications') || '',
    allergies: fd.get('allergies') || '',
    dislikes: fd.get('dislikes') || '',
    notes: fd.get('notes') || '',
  };
}
