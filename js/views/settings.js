// 設定画面（言語・APIキー・モデル・Oura・データ管理）
import { h, toast } from '../ui.js';
import { t, getLang, setLang, LANGS } from '../i18n.js';
import { getSettings, saveSettings, MODELS } from '../store.js';
import { getAllMeals } from '../db.js';

export function renderSettings(container, ctx) {
  const s = getSettings();
  const form = h('form', { class: 'form' });

  // 言語
  const langSel = h('select', { name: 'lang' },
    LANGS.map((l) => h('option', { value: l.value, ...(getLang() === l.value ? { selected: true } : {}) }, l.label))
  );

  // Claude API
  const keyInput = h('input', {
    name: 'apiKey', type: 'password', value: s.apiKey || '',
    placeholder: 'sk-ant-...', autocomplete: 'off',
  });
  const showToggle = h('button', { type: 'button', class: 'btn tiny', text: t('s.show') });
  showToggle.addEventListener('click', () => {
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
    showToggle.textContent = keyInput.type === 'password' ? t('s.show') : t('s.hide');
  });
  const modelSel = h('select', { name: 'model' },
    MODELS.map((m) => h('option', { value: m.value, ...(s.model === m.value ? { selected: true } : {}) }, t(m.labelKey)))
  );

  // Oura
  const ouraTokenInput = h('input', {
    name: 'ouraToken', type: 'password', value: s.ouraToken || '',
    placeholder: 'Personal Access Token', autocomplete: 'off',
  });
  const ouraProxyInput = h('input', {
    name: 'ouraProxy', type: 'text', value: s.ouraProxy || '',
    placeholder: 'https://your-proxy.example/?url=', autocomplete: 'off',
  });

  form.append(
    h('label', { class: 'field' }, [
      h('span', { class: 'field-label', text: t('s.lang') }),
      langSel,
    ]),
    h('h2', { text: t('s.api') }),
    h('label', { class: 'field' }, [
      h('span', { class: 'field-label', text: t('s.apiKey') }),
      h('div', { class: 'inline' }, [keyInput, showToggle]),
      h('span', { class: 'field-hint', html: t('s.apiHint') }),
    ]),
    h('label', { class: 'field' }, [
      h('span', { class: 'field-label', text: t('s.model') }),
      modelSel,
    ]),
    h('h2', { text: t('s.oura') }),
    h('label', { class: 'field' }, [
      h('span', { class: 'field-label', text: t('s.ouraToken') }),
      ouraTokenInput,
      h('span', { class: 'field-hint', html: t('s.ouraTokenHint') }),
    ]),
    h('label', { class: 'field' }, [
      h('span', { class: 'field-label', text: t('s.ouraProxy') }),
      ouraProxyInput,
      h('span', { class: 'field-hint', html: t('s.ouraProxyHint') }),
    ])
  );

  // 保存処理（submitボタンがフォーム外でも確実に動くよう、明示的なclickで実行）
  const save = () => {
    const langChanged = langSel.value !== getLang();
    setLang(langSel.value);
    saveSettings({
      apiKey: keyInput.value.trim(),
      model: modelSel.value,
      ouraToken: ouraTokenInput.value.trim(),
      ouraProxy: ouraProxyInput.value.trim(),
    });
    toast(t('s.saved'), 'success');
    if (langChanged && ctx.rebuild) ctx.rebuild();
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  const saveBtn = h('button', { class: 'btn primary', type: 'button', text: t('common.save'), onclick: save });

  // データ書き出し
  const exportBtn = h('button', { class: 'btn', type: 'button', text: t('s.export') });
  exportBtn.addEventListener('click', async () => {
    const meals = await getAllMeals();
    // 写真は大きいので書き出しからは除く
    const slim = meals.map(({ photo, ...rest }) => ({ ...rest, hasPhoto: !!photo }));
    const blob = new Blob([JSON.stringify(slim, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `keto-records-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    URL.revokeObjectURL(url);
  });

  container.append(
    h('div', { class: 'view' }, [
      form,
      h('div', { class: 'form-actions' }, [saveBtn]),
      h('h2', { text: t('s.health') }),
      h('div', { class: 'form-actions' }, [
        h('button', { class: 'btn', type: 'button', text: t('s.profileBtn'), onclick: () => ctx.navigate('profile') }),
        h('button', { class: 'btn', type: 'button', text: t('s.checkupBtn'), onclick: () => ctx.navigate('checkups') }),
      ]),
      h('h2', { text: t('s.data') }),
      h('div', { class: 'form-actions' }, [exportBtn]),
      h('div', { class: 'card warn' }, [
        h('h3', { text: t('s.security') }),
        h('p', { class: 'muted', html: t('s.securityBody') }),
      ]),
    ])
  );
}
