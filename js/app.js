// アプリ本体：タブ切り替えと各ビューの描画
import { renderDashboard } from './views/dashboard.js';
import { renderLog } from './views/log.js';
import { renderHistory } from './views/history.js';
import { renderProfile } from './views/profile.js';
import { renderSettings } from './views/settings.js';
import { renderProgress } from './views/progress.js';
import { renderCheckups } from './views/checkups.js';
import { h, icon } from './ui.js';
import { t } from './i18n.js';

const TABS = [
  { id: 'dashboard', labelKey: 'tab.home', icon: 'home' },
  { id: 'log', labelKey: 'tab.log', icon: 'log' },
  { id: 'progress', labelKey: 'tab.trends', icon: 'trend' },
  { id: 'history', labelKey: 'tab.history', icon: 'history' },
  { id: 'settings', labelKey: 'tab.settings', icon: 'settings' },
];

// タブ以外で到達できるルート
const ROUTES = ['dashboard', 'log', 'progress', 'history', 'settings', 'profile', 'checkups'];

const TITLE_KEYS = {
  dashboard: 'title.dashboard',
  log: 'title.log',
  progress: 'title.progress',
  history: 'title.history',
  profile: 'title.profile',
  checkups: 'title.checkups',
  settings: 'title.settings',
};

const appEl = document.getElementById('app');
const titleEl = document.getElementById('app-title');
const tabbarEl = document.getElementById('tabbar');

let current = 'dashboard';

const ctx = {
  navigate,
  refreshHeader,
  // 言語変更時などにタブと現在ビューを作り直す
  rebuild() {
    buildTabbar();
    navigate(current);
  },
};

function buildTabbar() {
  tabbarEl.innerHTML = '';
  for (const tab of TABS) {
    const btn = h('button', { class: 'tab' + (tab.id === current ? ' active' : ''), 'data-tab': tab.id }, [
      icon(tab.icon),
      h('span', { class: 'tab-label', text: t(tab.labelKey) }),
    ]);
    btn.addEventListener('click', () => navigate(tab.id));
    tabbarEl.append(btn);
  }
}

function refreshHeader() {
  titleEl.textContent = TITLE_KEYS[current] ? t(TITLE_KEYS[current]) : 'KETO';
  // タブ以外のルート(profile/checkups)では設定タブをハイライト
  const activeTab = TABS.some((t) => t.id === current) ? current : 'settings';
  tabbarEl.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === activeTab));
}

async function navigate(view) {
  current = view;
  location.hash = view;
  refreshHeader();
  appEl.scrollTop = 0;
  appEl.innerHTML = '';
  try {
    if (view === 'dashboard') await renderDashboard(appEl, ctx);
    else if (view === 'log') renderLog(appEl, ctx);
    else if (view === 'progress') await renderProgress(appEl, ctx);
    else if (view === 'history') await renderHistory(appEl, ctx);
    else if (view === 'profile') renderProfile(appEl, ctx);
    else if (view === 'checkups') await renderCheckups(appEl, ctx);
    else if (view === 'settings') renderSettings(appEl, ctx);
  } catch (err) {
    appEl.append(h('div', { class: 'card error', text: t('common.renderError') + (err.message || err) }));
  }
}

function init() {
  buildTabbar();
  const fromHash = (location.hash || '').replace('#', '');
  const start = ROUTES.includes(fromHash) ? fromHash : 'dashboard';
  navigate(start);
}

window.addEventListener('hashchange', () => {
  const v = (location.hash || '').replace('#', '');
  if (ROUTES.includes(v) && v !== current) navigate(v);
});

init();

// Service Worker 登録（PWA化）。
// 新バージョン配信時は、新SWがcontrollerになった時点で1回だけ自動リロードして
// 旧アセットの混在を防ぐ（初回インストール時はリロードしない）。
if ('serviceWorker' in navigator) {
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((reg) => { try { reg.update(); } catch { /* noop */ } })
      .catch(() => { /* オフライン非対応でも動作する */ });
  });
}
