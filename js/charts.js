// 依存ゼロのSVGチャート。レスポンシブ（viewBox + width:100%）。
import { t } from './i18n.js';
const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) el.setAttribute(k, v);
  }
  return el;
}

function niceBounds(min, max) {
  if (min === max) { return [min - 1, max + 1]; }
  const pad = (max - min) * 0.12;
  return [min - pad, max + pad];
}

// 折れ線グラフ。
// series: [{ label, color, points:[{x:'YYYY-MM-DD'|label, y:number|null}] }]
export function lineChart(series, { height = 200, yUnit = '', yMin = null, yMax = null } = {}) {
  const W = 360, H = height, padL = 38, padR = 12, padT = 14, padB = 26;
  const wrap = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', preserveAspectRatio: 'none', width: '100%', height });

  // X 軸ラベルは最初の系列のpoints基準
  const base = series.find((s) => s.points.length) || { points: [] };
  const labels = base.points.map((p) => p.x);
  const n = labels.length;

  const allY = [];
  for (const s of series) for (const p of s.points) if (p.y != null && !isNaN(p.y)) allY.push(p.y);
  if (allY.length === 0) return emptyChart(height);

  let lo = yMin != null ? yMin : Math.min(...allY);
  let hi = yMax != null ? yMax : Math.max(...allY);
  if (yMin == null && yMax == null) [lo, hi] = niceBounds(lo, hi);
  if (lo === hi) hi = lo + 1;

  const xAt = (i) => padL + (n <= 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const yAt = (v) => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo));

  // グリッド + Y目盛り（3本）
  for (let g = 0; g <= 2; g++) {
    const val = lo + ((hi - lo) * g) / 2;
    const y = yAt(val);
    wrap.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: 'rgba(255,255,255,.07)', 'stroke-width': 1 }));
    const t = svgEl('text', { x: 2, y: y + 3, fill: '#5C6A80', 'font-size': 9 });
    t.textContent = formatNum(val);
    wrap.appendChild(t);
  }

  // 各系列
  for (const s of series) {
    let d = '';
    let started = false;
    s.points.forEach((p, i) => {
      if (p.y == null || isNaN(p.y)) { started = false; return; }
      const cmd = started ? 'L' : 'M';
      d += `${cmd}${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)} `;
      started = true;
    });
    if (d) wrap.appendChild(svgEl('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    // 点
    s.points.forEach((p, i) => {
      if (p.y == null || isNaN(p.y)) return;
      wrap.appendChild(svgEl('circle', { cx: xAt(i), cy: yAt(p.y), r: 2.4, fill: s.color }));
    });
  }

  // X ラベル（最大5つ）
  const step = Math.max(1, Math.ceil(n / 5));
  labels.forEach((lab, i) => {
    if (i % step !== 0 && i !== n - 1) return;
    const t = svgEl('text', { x: xAt(i), y: H - 8, fill: '#5C6A80', 'font-size': 9, 'text-anchor': 'middle' });
    t.textContent = shortLabel(lab);
    wrap.appendChild(t);
  });

  return wrap;
}

// 棒グラフ。values:[{label, value, color?}]
export function barChart(values, { height = 180, color = '#14b8a6', goal = null } = {}) {
  const W = 360, H = height, padL = 30, padR = 10, padT = 12, padB = 24;
  if (!values.length) return emptyChart(height);
  const wrap = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', width: '100%', height });
  const hi = Math.max(...values.map((v) => v.value), goal || 0, 1);
  const yAt = (v) => padT + (H - padT - padB) * (1 - v / hi);
  const n = values.length;
  const bw = ((W - padL - padR) / n) * 0.62;

  for (let g = 0; g <= 2; g++) {
    const val = (hi * g) / 2;
    const y = yAt(val);
    wrap.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: 'rgba(255,255,255,.07)', 'stroke-width': 1 }));
    const t = svgEl('text', { x: 2, y: y + 3, fill: '#5C6A80', 'font-size': 9 });
    t.textContent = formatNum(val);
    wrap.appendChild(t);
  }
  if (goal != null) {
    const y = yAt(goal);
    wrap.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: '#ef4444', 'stroke-width': 1, 'stroke-dasharray': '4 3' }));
  }

  values.forEach((v, i) => {
    const cx = padL + ((i + 0.5) * (W - padL - padR)) / n;
    const y = yAt(v.value);
    const hgt = Math.max(0, H - padB - y);
    wrap.appendChild(svgEl('rect', { x: cx - bw / 2, y, width: bw, height: hgt, rx: 3, fill: v.color || color }));
    const step = Math.max(1, Math.ceil(n / 7));
    if (i % step === 0 || i === n - 1) {
      const t = svgEl('text', { x: cx, y: H - 8, fill: '#5C6A80', 'font-size': 9, 'text-anchor': 'middle' });
      t.textContent = shortLabel(v.label);
      wrap.appendChild(t);
    }
  });
  return wrap;
}

function emptyChart(height) {
  const wrap = svgEl('svg', { viewBox: '0 0 360 ' + height, width: '100%', height });
  const t = svgEl('text', { x: 180, y: height / 2, fill: '#5C6A80', 'font-size': 12, 'text-anchor': 'middle' });
  t.textContent = t2();
  wrap.appendChild(t);
  return wrap;
}

function t2() { return t('common.noData'); }

function shortLabel(s) {
  if (typeof s !== 'string') return String(s);
  // YYYY-MM-DD -> M/D
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${Number(m[1])}/${Number(m[2])}`;
  return s.length > 6 ? s.slice(0, 6) : s;
}

function formatNum(n) {
  if (Math.abs(n) >= 1000) return Math.round(n / 100) / 10 + 'k';
  return Math.round(n * 10) / 10;
}

// 凡例
export function legend(series) {
  const wrap = document.createElement('div');
  wrap.className = 'legend';
  for (const s of series) {
    const item = document.createElement('span');
    item.className = 'legend-item';
    const dot = document.createElement('span');
    dot.className = 'legend-dot';
    dot.style.background = s.color;
    item.appendChild(dot);
    item.appendChild(document.createTextNode(s.label));
    wrap.appendChild(item);
  }
  return wrap;
}
