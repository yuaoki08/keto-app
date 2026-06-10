// 共通UIヘルパー

export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// File -> 縮小済み dataURL（長辺を maxPx に。トークン・容量削減）
export function fileToResizedDataUrl(file, maxPx = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxPx) {
          height = Math.round((height * maxPx) / width);
          width = maxPx;
        } else if (height > maxPx) {
          width = Math.round((width * maxPx) / height);
          height = maxPx;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---- SVG リング（Oura風グロー付きプログレスリング） ---- */

const SVG_NS = 'http://www.w3.org/2000/svg';
let _gradSeq = 0;

const GRADIENTS = {
  teal: ['#7BE3D6', '#2E8F86'],
  ice: ['#8FD4F5', '#2E7FB0'],
  gold: ['#EBD29A', '#A87F3E'],
  coral: ['#F0A296', '#B85548'],
};

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  return el;
}

// ヒーローリング。value/max の達成率を描画し、中央に数値を表示。
// over=true（上限超過）のときは coral で警告表示。
export function progressRing({ value, max, size = 200, stroke = 10, grad = 'teal', num, numUnit, cap }) {
  const ratio = Math.max(0, Math.min(1, max ? value / max : 0));
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const [g1, g2] = GRADIENTS[grad] || GRADIENTS.teal;
  const gid = `rg${++_gradSeq}`;
  const glow = grad === 'coral' ? 'rgba(232,133,122,.45)' : 'rgba(99,216,204,.45)';

  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size });
  const defs = svgEl('defs');
  const lg = svgEl('linearGradient', { id: gid, x1: 0, y1: 0, x2: 1, y2: 1 });
  lg.append(svgEl('stop', { offset: 0, 'stop-color': g1 }), svgEl('stop', { offset: 1, 'stop-color': g2 }));
  defs.append(lg);
  svg.append(defs);
  svg.append(svgEl('circle', { cx: size / 2, cy: size / 2, r, stroke: 'rgba(255,255,255,.06)', 'stroke-width': stroke, fill: 'none' }));
  const arc = svgEl('circle', {
    cx: size / 2, cy: size / 2, r,
    stroke: `url(#${gid})`, 'stroke-width': stroke, fill: 'none',
    'stroke-linecap': 'round',
    'stroke-dasharray': c.toFixed(1),
    'stroke-dashoffset': (c * (1 - ratio)).toFixed(1),
  });
  arc.style.filter = `drop-shadow(0 0 8px ${glow})`;
  svg.append(arc);

  const box = h('div', { class: 'ringbox' }, [svg]);
  const center = h('div', { class: 'ring-center' });
  if (num != null) {
    const numEl = h('div', { class: 'ring-num' });
    numEl.append(document.createTextNode(String(num)));
    if (numUnit) numEl.append(h('small', { text: ` ${numUnit}` }));
    center.append(numEl);
  }
  if (cap) center.append(h('div', { class: 'ring-cap', text: cap }));
  box.append(center);
  return box;
}

// ミニリング（スコア表示用、Sleep/Readiness等）
export function miniRing({ value, max = 100, size = 72, grad = 'teal', label }) {
  const ring = progressRing({ value, max, size, stroke: 5, grad });
  ring.classList.add('mini-ringbox');
  ring.classList.remove('ringbox');
  const center = ring.querySelector('.ring-center');
  center.textContent = value != null ? String(value) : '–';
  const wrap = h('div', { class: 'score' }, [ring]);
  if (label) wrap.append(h('div', { class: 'l', text: label }));
  return wrap;
}

// 線画アイコン（ストロークSVG）
export const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/>',
  log: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  trend: '<path d="M3 17l5-6 4 4 6-8 3 4"/>',
  history: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 01-.1 1.2l2 1.6-2 3.4-2.4-1a7 7 0 01-2 1.2L14 21h-4l-.5-2.6a7 7 0 01-2-1.2l-2.4 1-2-3.4 2-1.6A7 7 0 015 12a7 7 0 01.1-1.2l-2-1.6 2-3.4 2.4 1a7 7 0 012-1.2L10 3h4l.5 2.6a7 7 0 012 1.2l2.4-1 2 3.4-2 1.6c.06.4.1.8.1 1.2z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M3 17l5-4 4 3 5-5 4 4"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
};

export function icon(name, size = 21) {
  const wrap = document.createElement('span');
  wrap.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  return wrap.firstChild;
}

// 進捗バー（値 / 目標）
export function macroBar(label, value, target, unit, color) {
  const pct = target ? clamp(Math.round((value / target) * 100), 0, 100) : 0;
  const over = target && value > target;
  return h('div', { class: 'macro' }, [
    h('div', { class: 'macro-head' }, [
      h('span', { class: 'macro-label', text: label }),
      h('span', { class: 'macro-val', text: `${Math.round(value * 10) / 10}${target ? ` / ${target}` : ''}${unit}` }),
    ]),
    h('div', { class: 'bar' }, [
      h('div', { class: 'bar-fill' + (over ? ' over' : ''), style: `width:${pct}%;background:${over ? '#ef4444' : color}` }),
    ]),
  ]);
}

let _toastTimer = null;
export function toast(msg, type = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast' });
    document.body.appendChild(el);
  }
  el.className = `toast ${type} show`;
  el.textContent = msg;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
}

export function formatDateJP(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const lang = localStorage.getItem('keto.lang.v1') || ((navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en');
  if (lang === 'en') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  }
  const [, m, d] = dateKey.split('-');
  const wd = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${Number(m)}月${Number(d)}日(${wd})`;
}
