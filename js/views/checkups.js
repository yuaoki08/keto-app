// 健康診断データの入力・管理
import { h, toast, formatDateJP } from '../ui.js';
import { t } from '../i18n.js';
import { CHECKUP_METRICS } from '../store.js';
import { putCheckup, deleteCheckup, getAllCheckups, newId } from '../db.js';
import { pushCheckup, removeCheckup } from '../backend.js';
import { todayKey } from '../nutrition.js';

function evalStatus(metric, value) {
  if (value == null || value === '' || !metric.ref) return null;
  const v = Number(value);
  const [lo, hi] = metric.ref;
  if (v < lo) return metric.betterLow ? 'good' : 'low';
  if (v > hi) return 'high';
  return 'good';
}

export async function renderCheckups(container, ctx) {
  const view = h('div', { class: 'view' });
  container.append(view);

  async function reload() {
    view.innerHTML = '';
    view.append(buildForm());
    const records = await getAllCheckups();
    if (records.length) {
      view.append(h('h2', { text: t('c.list') }));
      [...records].reverse().forEach((rec) => view.append(recordCard(rec)));
    }
  }

  function buildForm() {
    const form = h('form', { class: 'form card' });
    const dateInput = h('input', { type: 'date', name: 'date', value: todayKey() });
    form.append(h('h3', { text: t('c.add') }), h('label', { class: 'field' }, [
      h('span', { class: 'field-label', text: t('c.date') }), dateInput,
    ]));

    const grid = h('div', { class: 'checkup-grid' });
    for (const m of CHECKUP_METRICS) {
      grid.append(h('label', { class: 'field' }, [
        h('span', { class: 'field-label', text: `${t(`cm.${m.key}`)} (${m.unit})` }),
        h('input', { type: 'number', step: '0.1', inputmode: 'decimal', name: m.key, placeholder: m.ref ? t('c.refHint', { lo: m.ref[0], hi: m.ref[1] }) : '' }),
      ]));
    }
    form.append(grid);
    form.append(h('label', { class: 'field' }, [
      h('span', { class: 'field-label', text: t('c.memo') }),
      h('textarea', { name: 'notes', rows: 2 }, ''),
    ]));
    const saveBtn = h('button', { class: 'btn primary', type: 'submit', text: t('common.save') });
    form.append(saveBtn);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const values = {};
      for (const m of CHECKUP_METRICS) {
        const v = fd.get(m.key);
        if (v !== '' && v != null) values[m.key] = Number(v);
      }
      if (Object.keys(values).length === 0) { toast(t('c.needOne'), 'error'); return; }
      const rec = {
        id: newId(),
        date: fd.get('date') || todayKey(),
        values,
        notes: fd.get('notes') || '',
        createdAt: new Date().toISOString(),
      };
      await putCheckup(rec);
      pushCheckup(rec);
      toast(t('c.saved'), 'success');
      reload();
    });
    return form;
  }

  function recordCard(rec) {
    const c = h('div', { class: 'card' });
    c.append(h('div', { class: 'day-header' }, [
      h('span', { class: 'day-date', text: formatDateJP(rec.date) }),
      h('button', { class: 'btn tiny danger', text: t('common.delete'), onclick: async () => {
        if (!confirm(t('hi.confirmDelete'))) return;
        await deleteCheckup(rec.id); removeCheckup(rec.id); toast(t('hi.deleted'), 'success'); reload();
      } }),
    ]));
    const grid = h('div', { class: 'checkup-values' });
    for (const m of CHECKUP_METRICS) {
      const v = rec.values?.[m.key];
      if (v == null) continue;
      const status = evalStatus(m, v);
      grid.append(h('div', { class: 'cv' + (status === 'high' || status === 'low' ? ' alert' : status === 'good' ? ' ok' : '') }, [
        h('div', { class: 'cv-val', text: `${v}` }),
        h('div', { class: 'cv-label', text: t(`cm.${m.key}`) }),
      ]));
    }
    c.append(grid);
    if (rec.notes) c.append(h('p', { class: 'muted small', text: rec.notes }));
    return c;
  }

  await reload();
}
