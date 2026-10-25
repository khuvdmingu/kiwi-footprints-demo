// chart.js — v28 해도: 다녀온 항로가 종이 지도에 선으로 남고, 쌓인 바닷길만큼 안개가 걷힌다
//
//  장소는 세 층 (2026-10-21 사용자 결정 — "섬을 계속 늘리는 것"이 아니라 "지도 위에 사연 놓기"):
//   · 큰 섬    = maps.js 의 장소(v28.22 재고 24곳 포함). 전체 장면이 있다. 해도 위 자리는 고정(BIG).
//   · 작은 섬  = 해도에만 있다. 그림 한 칸 · 이름(사용자가 짓는다) · 일기 한 줄. 쌓인 해리가 문턱을 넘으면
//                 그 항해의 항로 옆에 나타난다(ISLETS — 순서·문턱만 정해 두고 자리는 발견할 때 정한다).
//   · 바다 위의 곳 = 산호초 · 해류 · 안개 띠 · 고래 길. 그림은 작은 표시만, 지나갈 때 일기·낚시가 달라진다(SPOTS).
//  기록은 이 기기에만 (localStorage 'chart'). 항해 기록(voyage.log)은 voyage.js 가 갖고, 여기는 발견·이름만 갖는다.
//  그리기: 그림 격자(assets/chart-sheet.webp, 4×4)가 있으면 칸을 잘라 쓰고, 없으면 코드로 그린다.

import { fitCell, roundCell } from './sheet.js?v=v29.9.0';

export const SHEET = 'chart-sheet.webp?v=v29.9.0';
// v28.19 해도 그림 B (사용자 2026-10-24 비교 페이지에서 고름): 양피지 종이(나침반 포함) + 새 아이콘 격자 4×4
//  새 격자 칸: 1행 화산·폭포 절벽·거북·등대 / 2행 환초·쌍둥이·빙산·떠 있는 꽃섬 / 3행 고래 꼬리·바다뱀·난파선·병 / 4행 X·닻·별 항로·바람 구름
//  그림 칸이 없던 섬·바다 표시만 새 칸으로 (나머지는 지금 격자 그대로)
// v28.20 격자 칸이 없는 큰 섬은 낱장 그림 (Codex 그림, 흰 바탕을 뺀 투명 webp)
import { STOCK_PLACES, STOCK_IDS } from './maps-stock.js?v=v29.9.0';
export const BIG_ART = { cherry: 'chart-isle-cherry.webp?v=v29.9.0', oasis: 'chart-isle-oasis.webp?v=v29.9.0' };
// v29.4 재고 새 장소 24곳의 해도 섬 그림 (Codex 그림, 4×4 격자 두 장 — 위 세 줄에 12곳씩, STOCK_PLACES 순서). 못 읽으면 코드 그림
export const STOCK_ISLE_SHEETS = ['chart-isles-a.webp?v=v29.9.0', 'chart-isles-b.webp?v=v29.9.0'];
export const stockIsleCell = id => { const i = STOCK_PLACES.findIndex(p => p.id === id); return i < 0 ? null : { sheet: Math.floor(i / 12), cell: i % 12 }; };
export const CHART_B = { paper: 'chart-paper.webp?v=v29.9.0', sheet: 'chart-sheet-2.webp?v=v29.9.0',
  islet: { 'i-twin': 5, 'i-lantern': 3, 'i-turtle': 2, 'i-end': 6 }, spot: { 's-reef': 4, 's-current': 15, 's-whale': 8 } };
// 격자 칸 (4×4): 0~4 큰 섬 · 5~12 작은 섬 · 13 나침반 · 14 배 표시 · 15 안개 덩이
export const CELL = { beach: 0, nz: 1, snow: 2, fall: 3, zen: 4, compass: 13, boat: 14, fog: 15 };

// 큰 섬 자리 (해도 0~1 좌표, 가로세로 같은 비율의 정사각 판 기준)
export const BIG = {
  beach: { x: 0.5, y: 0.56 },
  nz: { x: 0.24, y: 0.36 },
  snow: { x: 0.7, y: 0.2 },
  fall: { x: 0.8, y: 0.62 },
  zen: { x: 0.3, y: 0.8 },
  cherry: { x: 0.12, y: 0.62 },   // v28.17 — 격자 칸이 없어 낱장 그림(BIG_ART, v28.20 Codex) · 못 읽으면 코드 그림
  oasis: { x: 0.9, y: 0.4 },     // 오른쪽 아래는 나침반 자리
};
// v28.22 재고 새 장소 24곳 — 빈자리에 고르게(서로·기존 섬과 0.13 이상). 섬 그림이 없어 코드 그림(BIG_INK), 열린 곳만 해도에 보인다
for (const p of STOCK_PLACES) BIG[p.id] = { x: p.at[0], y: p.at[1] };

// 작은 섬 — need = 지금까지 바다 위에서 간 해리(누적). 25분 항해 = 2.5해리
export const ISLETS = [
  { id: 'i-moss', need: 1, cell: 5, ko: '이끼 바위섬', note: '바위 등에 이끼가 털처럼 덮였다.' },
  { id: 'i-palm', need: 2.5, cell: 6, ko: '야자 한 그루 섬', note: '나무가 한 그루뿐이라 그늘을 나눠 썼다.' },
  { id: 'i-shell', need: 4, cell: 7, ko: '조개 모래톱', note: '물이 빠지면 조개껍데기로 하얗게 빛난다.' },
  { id: 'i-arch', need: 6, cell: 8, ko: '구멍 바위', note: '바위 한가운데 구멍으로 바람이 지나간다.' },
  { id: 'i-bird', need: 8.5, cell: 9, ko: '새들의 섬', note: '갈매기들이 번갈아 망을 본다.' },
  { id: 'i-flower', need: 11, cell: 10, ko: '꽃 언덕섬', note: '작은 언덕이 통째로 노랗게 피었다.' },
  { id: 'i-hut', need: 14, cell: 11, ko: '빈 오두막 섬', note: '누가 살다 간 오두막. 문은 열려 있었다.' },
  { id: 'i-spring', need: 18, cell: 12, ko: '샘물 섬', note: '바다 한가운데서 단물이 솟는다.' },
  // 그림 칸이 없는 섬 — 격자 한 장을 더 뽑을 때까지 코드 그림 (cell null)
  { id: 'i-twin', need: 22, cell: null, xcell: 0, ko: '쌍둥이 섬', note: '똑같이 생긴 섬 둘이 마주 보고 있다.' },
  { id: 'i-lantern', need: 27, cell: null, xcell: 1, ko: '등불 섬', note: '해가 지면 바위 틈에서 불빛이 샌다.' },
  { id: 'i-turtle', need: 33, cell: null, xcell: 2, ko: '거북 등 섬', note: '가까이 가니 섬이 천천히 숨을 쉬었다.' },
  { id: 'i-end', need: 40, cell: null, xcell: 3, ko: '지도 끝 섬', note: '여기서부터는 아직 아무도 안 그렸다.' },
];
// 바다 위의 곳 — 지나가면 일기 한 줄 · 낚시가 달라진다 (fishing.js)
export const SPOTS = [
  { id: 's-reef', need: 3, xcell: 4, kind: 'reef', ko: '산호초', note: '물 밑이 분홍빛이다. 낚싯줄에 뭐가 더 잘 걸린다.', line: '산호초 위를 지났다. 물 밑이 분홍빛이었다.' },
  { id: 's-current', need: 7, xcell: 5, kind: 'current', ko: '따뜻한 해류', note: '배가 저절로 조금 빨리 간다.', line: '따뜻한 물살이 배를 밀어 주었다.' },
  { id: 's-fog', need: 12, xcell: 6, kind: 'fog', ko: '안개 띠', note: '늘 안개가 걸려 있는 바다.', line: '안개 띠를 지나는 동안 서로 이름을 불렀다.' },
  { id: 's-whale', need: 20, xcell: 7, kind: 'whale', ko: '고래 길', note: '고래들이 지나다니는 길이다.', line: '고래 길을 건넜다. 물이 깊게 울렸다.' },
];
export const ISLET = Object.fromEntries(ISLETS.map(i => [i.id, i]));
export const SPOT = Object.fromEntries(SPOTS.map(s => [s.id, s]));
export const PLACE_KIND = id => (BIG[id] ? 'big' : ISLET[id] ? 'islet' : SPOT[id] ? 'spot' : null);

export const toNm = ms => Math.round(ms / 60000 * 0.1 * 10) / 10;   // voyage.js NM_PER_MIN 과 같게
export const routeKey = (a, b) => [a, b].sort().join('~');

// 씨앗 난수 (voyage.js 와 같은 식)
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

// 발견한 곳의 자리: 그 항해의 항로 위(30~70%) + 옆으로 살짝. 다른 곳과 너무 붙지 않게 몇 번 다시 고른다
export function placeOnRoute(from, to, seed, taken = []) {
  const A = BIG[from] || BIG.beach, B = BIG[to] || BIG.nz, rand = seeded(seed);
  let best = null, bestD = -1;
  for (let i = 0; i < 14; i++) {
    const f = 0.2 + 0.6 * rand(), side = rand() < 0.5 ? -1 : 1, off = (0.06 + (0.08 + i * 0.012) * rand()) * side;   // 붙으면 점점 멀리
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
    const x = Math.min(0.94, Math.max(0.06, A.x + dx * f - dy / L * off)), y = Math.min(0.94, Math.max(0.06, A.y + dy * f + dx / L * off));
    const d = Math.min(1, ...[...Object.values(BIG), ...taken].map(p => Math.hypot(p.x - x, p.y - y)));
    if (d > 0.1) return { x, y };
    if (d > bestD) { bestD = d; best = { x, y }; }
  }
  return best;
}

export class Chart {
  constructor(load, save) {
    this.save = save;
    let s = {};
    try { s = JSON.parse(load() || '{}'); } catch (e) { s = {}; }
    // found: { id: { x, y, at, route, nm } } · names: { id: '사용자가 지은 이름' }
    this.found = {}; for (const [id, v] of Object.entries(s.found || {})) if ((ISLET[id] || SPOT[id]) && v && isFinite(v.x)) this.found[id] = v;
    this.names = {}; for (const [id, v] of Object.entries(s.names || {})) if (ISLET[id] && typeof v === 'string') this.names[id] = v.slice(0, 16);
    this.bonus = Math.max(0, +s.bonus || 0);   // 해리 덤 (병 속 지도 조각 — fishing.js)
  }
  store() { this.save(JSON.stringify({ found: this.found, names: this.names, bonus: this.bonus })); }
  has(id) { return !!this.found[id]; }
  // v29.4.7 (사용자 「이름은 알아서 지어져 있고, 원하면 눌러서 바꾸기」): 작은 섬의 기본 이름 = 그 섬을 찾은 항해의 집중 작업명, 없으면 미리 정한 이름(ko)
  autoName(id) { const t = String(this.found[id]?.task || '').trim(); return ISLET[id] && t ? t.slice(0, 16) : (ISLET[id]?.ko || SPOT[id]?.ko || ''); }
  name(id) { return this.names[id] || this.autoName(id); }
  rename(id, text) { const t = String(text || '').trim().slice(0, 16); if (!ISLET[id]) return; if (t) this.names[id] = t; else delete this.names[id]; this.store(); }
  named(id) { return !!this.names[id]; }
  // 지도 조각: 해리 덤 (다음 섬이 조금 빨리 나온다)
  addBonus(nm) { this.bonus = Math.round((this.bonus + nm) * 10) / 10; this.store(); }
  // 지금까지 해리(바다 위 시간 + 덤) — 안개를 걷는 기준
  total(sailedMs) { return Math.round((toNm(sailedMs) + this.bonus) * 10) / 10; }

  // 항해가 끝날 때 한 번: 문턱을 넘은 곳을 이 항로 옆에 놓는다 → [{ id, kind }] (새로 찾은 것)
  discover(sailedMs, trip, now = Date.now()) {
    const nmv = this.total(sailedMs), out = [], taken = Object.values(this.found);
    for (const p of [...ISLETS, ...SPOTS]) {
      if (this.found[p.id] || p.need > nmv) continue;
      const pos = placeOnRoute(trip.from || 'beach', trip.to, hash(p.id + trip.id), taken);
      this.found[p.id] = { ...pos, at: now, route: routeKey(trip.from || 'beach', trip.to), nm: nmv, task: String(trip.reason || '').trim().slice(0, 80) };
      taken.push(this.found[p.id]); out.push({ id: p.id, kind: ISLET[p.id] ? 'islet' : 'spot' });
    }
    if (out.length) this.store();
    return out;
  }
  // 다음 문턱 (해도 아래 안내 "다음 섬까지 1.2해리")
  next(sailedMs) { const nmv = this.total(sailedMs); const p = [...ISLETS, ...SPOTS].filter(q => !this.found[q.id]).sort((a, b) => a.need - b.need)[0]; return p ? { id: p.id, left: Math.max(0.1, Math.round((p.need - nmv) * 10) / 10), kind: ISLET[p.id] ? 'islet' : 'spot' } : null; }
  // 이 항로(왕복 같음) 위에 있는 곳 — 일기 한 줄·낚시에 쓴다
  onRoute(from, to) { const k = routeKey(from || 'beach', to); return Object.entries(this.found).filter(([, v]) => v.route === k).map(([id]) => id); }
  get islets() { return ISLETS.filter(i => this.found[i.id]); }
  get spots() { return SPOTS.filter(s => this.found[s.id]); }
}

// 항해 기록으로 센다: 섬마다 닿은 횟수(도장), 항로마다 다닌 횟수(선 굵기)
export function tally(log, home) {
  const visits = {}, routes = {};
  if (home) visits[home] = visits[home] || 0;
  for (const e of log || []) {
    if (!e || !e.to) continue;
    visits[e.to] = (visits[e.to] || 0) + 1;
    const k = routeKey(e.from || 'beach', e.to); routes[k] = (routes[k] || 0) + 1;
  }
  return { visits, routes };
}
// 도장 진하기: 1번 0.35 … 10번 이상 1
export const stampInk = n => (n <= 0 ? 0 : Math.min(1, 0.25 + 0.075 * n));

// 지나간 곳 일기 한 줄 (항로 위에 이름 있는 섬·바다 위의 곳이 있으면 하나)
export function routeLine(chart, from, to, seed) {
  const ids = chart.onRoute(from, to); if (!ids.length) return null;
  const id = ids[seed % ids.length];
  if (SPOT[id]) return { ko: SPOT[id].line, en: '' };
  return { ko: `${chart.name(id)}${josa(chart.name(id), '을', '를')} 지나며 손을 흔들었다.`, en: '' };
}
export function josa(w, a, b) { const c = (w || '').charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? a : b; }

// ── 그리기 ──
// 해도 한 장을 ctx 에 그린다. o = { chart, log, home, sailedMs, open(mapId)→bool, sheet(Image|null), builds(mapId)→0~6, t, theme }
export function drawChart(ctx, S, o) {
  const { chart, sheet } = o, t = o.t || 0, { visits, routes } = tally(o.log, o.home);
  // v29.4.5 o.spread = 섬 자리를 넓히는 배수: 그림·글자·선 굵기는 S 기준 그대로, 자리만 W = S × spread 위에 놓는다
  const W = S * (o.spread || 1), P = (p) => [p.x * W, p.y * W];
  ctx.save();
  // v29.4.5 o.frameless = 틀 없는 바탕 (해도 창: 끝까지 같은 색 + 물결 줄, 종이 가장자리·그늘 없음)
  if (o.frameless) {
    // v29.4.7 (사용자 「배경이 바닷물처럼」): 물빛 바탕 — 깊은 곳·얕은 곳 얼룩 + 흩어진 짧은 물결(가로줄 대신). 섬 그림의 옅은 하늘색 테두리와 이어지게
    // v29.4.8 그림 바다(o.sea, Codex 붓질 물)가 있으면 그걸 펴고 섬 그림 결에 맞춰 채도를 낮춘다 — 없으면(읽기 전·실패) 아래 코드 바다
    if (o.sea) {
      ctx.drawImage(o.sea, 0, 0, W, W);
      ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,0.42)'; ctx.fillRect(0, 0, W, W);
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(232,226,204,0.12)'; ctx.fillRect(0, 0, W, W); ctx.restore();   // 섬 그림처럼 살짝 따뜻하게
    } else {
    const g = ctx.createLinearGradient(0, 0, W * 0.3, W); g.addColorStop(0, '#9fd0d3'); g.addColorStop(0.5, '#8cc3c9'); g.addColorStop(1, '#7fb6c0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
    const rnd = seeded(77);
    for (let k = 0; k < Math.round(46 * (W / S) ** 2); k++) {   // 얕은 곳(밝게)·깊은 곳(어둡게) — 가장자리가 부드럽게 사라지는 둥근 얼룩
      const x = rnd() * W, y = rnd() * W, r = S * (0.1 + rnd() * 0.2), c = k % 3 ? '196,236,232' : '60,120,145', a = k % 3 ? 0.22 : 0.14;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`);
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62); ctx.translate(-x, -y); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill(); ctx.restore();
    }
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, S * 0.0026);
    for (let k = 0; k < Math.round(140 * (W / S) ** 2); k++) {   // 짧은 물결 「︶」 — 같은 넓이에 같은 수
      const x = rnd() * W, y = rnd() * W, w = S * (0.018 + rnd() * 0.022);
      ctx.strokeStyle = `rgba(240,252,250,${0.22 + rnd() * 0.2})`; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w / 2, y - w * 0.32, x, y); ctx.quadraticCurveTo(x + w / 2, y - w * 0.32, x + w, y); ctx.stroke();
    }
    }
  }
  // 종이 (v28.18 o.paper = 양피지 그림이 있으면 그걸로 — 비교 페이지 chart-lab.html)
  else if (o.paper) ctx.drawImage(o.paper, 0, 0, S, S);
  else {
    const g = ctx.createRadialGradient(S * 0.5, S * 0.45, S * 0.1, S * 0.5, S * 0.5, S * 0.75);
    g.addColorStop(0, '#f5ead2'); g.addColorStop(1, '#e2cfa6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // 바다 결 (가는 물결 줄)
    ctx.strokeStyle = 'rgba(80,110,130,0.13)'; ctx.lineWidth = Math.max(1, S * 0.0022);
    for (let r = 0; r < 14; r++) {
      const y0 = S * (0.05 + r * 0.068); ctx.beginPath();
      for (let x = 0; x <= S; x += S / 40) { const y = y0 + Math.sin(x / S * 9 + r * 1.7) * S * 0.006; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
  }
  const alt = o.alt;   // v28.18 { sheet, islet: { id: 칸 }, spot: { id: 칸 } } — 그 섬·바다 표시만 다른 격자 칸으로
  // 항로 (다닌 만큼 진하고 굵게) — v29.4.9 사용자 「소시지 같은 선 말고 동그란 점선」: 둥근 점을 같은 간격으로 찍는다
  for (const [k, n] of Object.entries(routes)) {
    const [a, b] = k.split('~'); if (!BIG[a] || !BIG[b]) continue;
    const [x1, y1] = P(BIG[a]), [x2, y2] = P(BIG[b]), mx = (x1 + x2) / 2 - (y2 - y1) * 0.12, my = (y1 + y2) / 2 + (x2 - x1) * 0.12;
    const r = S * (0.0032 + Math.min(0.003, n * 0.0004));
    ctx.fillStyle = `rgba(150,60,40,${Math.min(0.85, 0.4 + n * 0.08)})`; dotCurve(ctx, x1, y1, mx, my, x2, y2, r, r * 3.6);
  }
  // 바다 위의 곳 (작은 표시)
  for (const s of chart.spots) { const [x, y] = P(chart.found[s.id]); if (!cell(ctx, alt?.sheet, alt?.spot?.[s.id], x, y, S * 0.09) && !roundCell(ctx, o.extra, s.xcell, x, y, S * 0.1)) drawSpot(ctx, s, [x, y], S, t); }
  // 작은 섬
  for (const i of chart.islets) {
    const [x, y] = P(chart.found[i.id]), r = S * 0.045;
    if (!cell(ctx, alt?.sheet, alt?.islet?.[i.id], x, y, r * 2.1) && !cell(ctx, sheet, i.cell, x, y, r * 2.1) && !cell(ctx, o.extra, i.xcell, x, y, r * 2.1)) drawIslet(ctx, x, y, r, hash(i.id));
    if ('label' in o) continue;   // 해도 창: 이름은 누른 곳만 (아래 placeNames) — v29.4.7 이름이 늘 있으니 「?」 표시 없음
    if (chart.named(i.id)) label(ctx, chart.name(i.id), x, y + r * 1.05, S * 0.024, '#3d2b1c');   // 이름 지은 섬만 지도에 쓴다 (안 지은 섬은 아래 목록에)
    else label(ctx, '?', x + r * 0.9, y - r * 0.9, S * 0.022, 'rgba(150,60,40,0.75)');
  }
  // 큰 섬 + 도장 — 이름은 모아 두었다가 섬·안개를 다 그린 뒤 겹치지 않는 자리에 쓴다 (v29.4.2)
  const names = [], bodies = [];
  for (const [id, p] of Object.entries(BIG)) {
    const [x, y] = P(p), open = o.open ? o.open(id) : true, r = S * 0.062;   // v29.4.2 0.07 → 0.062: 섬 24곳이 늘며 서로 붙어 이름 자리가 없었다
    if (!open && STOCK_IDS.has(id) && !o.all) continue;   // 재고 새 장소는 열리기 전엔 안 그린다 (해도가 '?' 로 빽빽해지지 않게)
    // o.all (2026-10-24 해도 창): 잠긴 섬도 안개 밑에 흐리게 다 그린다 — 열린 섬만 맞춰 보다가 넓어지면 가장자리에서 드러난다
    if (!open) { ctx.globalAlpha = o.all ? 0.2 : 0.28; }
    const art = o.bigArt?.[id];
    if (art) { const s = r * 2.2 / Math.max(art.width, art.height); ctx.drawImage(art, x - art.width * s / 2, y - art.height * s / 2, art.width * s, art.height * s); }
    else if (!cell(ctx, sheet, CELL[id], x, y, r * 2.2)) { const sc = stockIsleCell(id); if (!(sc && cell(ctx, o.isles?.[sc.sheet], sc.cell, x, y, r * 2.2))) drawBig(ctx, id, x, y, r); }
    ctx.globalAlpha = 1;
    if (!open) { label(ctx, '?', x, y + r * 0.2, S * 0.05, 'rgba(61,43,28,0.45)'); continue; }
    bodies.push({ id, x, y, r: r * 0.95 });
    if (!('label' in o)) names.push({ id, text: o.placeName ? o.placeName(id) : id, x, y, r, rank: (id === o.home ? 1e6 : 0) + (visits[id] || 0) });
    const n = visits[id] || 0;
    if (n) stamp(ctx, x + r * 0.95, y - r * 0.75, S * 0.028, stampInk(n), n);
    const b = o.builds ? o.builds(id) : 0;
    if (b) for (let k = 0; k < b; k++) { ctx.fillStyle = '#7a4f2a'; ctx.beginPath(); ctx.arc(x - r * 0.5 + k * r * 0.2, y + r * 1.55, S * 0.0045, 0, 6.29); ctx.fill(); }
  }
  // 지금 있는 곳 (작은 배)
  // 바다에 나가 있으면(o.atSea) 배는 섬 옆이 아니라 항로 위에 (drawVoyageMark)
  if (o.home && BIG[o.home] && !o.atSea) { const [x, y] = P(BIG[o.home]); if (!cell(ctx, sheet, CELL.boat, x - S * 0.07, y - S * 0.06, S * 0.05)) drawBoat(ctx, x - S * 0.07, y - S * 0.055, S * 0.022, t); }
  // 안개: 찾은 곳 둘레만 걷힌다 (덩이를 깔고 둘레를 지운다)
  drawFog(ctx, W, o, t);
  for (const id of Object.keys(chart.found)) { const [x, y] = P(chart.found[id]); bodies.push({ id, x, y, r: S * 0.04 }); }   // 작은 섬·바다 위의 곳도 덮지 않게
  // v29.4.4 (사용자 2026-10-24 「처음엔 글자 없이 그림만, 누르면 글자」): o.label 을 주면 그 한 곳의 이름만 쓴다 (null = 하나도 안 씀)
  placeNames(ctx, names.sort((a, b) => b.rank - a.rank), bodies, S);
  // 나침반
  if (!o.paper && !cell(ctx, sheet, CELL.compass, W - S * 0.1, W - S * 0.1, S * 0.12)) drawCompass(ctx, W - S * 0.1, W - S * 0.1, S * 0.045);   // 양피지엔 나침반이 그려져 있다
  ctx.restore();
}

// v29.4.7 (사용자 「항해 중에 해도를 보면 내비게이션처럼 가고 있는 모습」): 지금 항해의 뱃길 + 배 자리.
//  뱃길은 해도 항로와 같은 휜 선(가운데에서 옆으로 0.12) — 온 길은 진하게, 남은 길은 점선, 닿을 섬엔 깃발, 배 둘레엔 퍼지는 물결.
export function voyagePoint(from, to, u, spread = 1, S = 1) {
  const W = S * spread, A = BIG[from] || BIG.beach, B = BIG[to]; if (!B) return null;
  const x1 = A.x * W, y1 = A.y * W, x2 = B.x * W, y2 = B.y * W, mx = (x1 + x2) / 2 - (y2 - y1) * 0.12, my = (y1 + y2) / 2 + (x2 - x1) * 0.12;
  const q = (a, b, c) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
  const dx = 2 * (1 - u) * (mx - x1) + 2 * u * (x2 - mx), dy = 2 * (1 - u) * (my - y1) + 2 * u * (y2 - my);
  return { x: q(x1, mx, x2), y: q(y1, my, y2), a: Math.atan2(dy, dx), x1, y1, x2, y2, mx, my };
}
// 곡선 위에 둥근 점을 같은 간격(gap px)으로 — 처음·끝 u0~u1 만 (항로·내비 뱃길)
export function dotCurve(ctx, x1, y1, mx, my, x2, y2, r, gap, u0 = 0, u1 = 1) {
  const at = u => [(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2, (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2];
  let [px, py] = at(u0), acc = gap / 2; const N = 240;
  ctx.beginPath();
  for (let i = 1; i <= N; i++) {
    const [x, y] = at(u0 + (u1 - u0) * i / N); acc += Math.hypot(x - px, y - py); px = x; py = y;
    if (acc >= gap) { acc -= gap; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.29); }
  }
  ctx.fill();
}
export const FOG_SEA = 'rgba(226,238,238,0.86)';   // 물빛 해도의 물안개 (해도 밖도 이 색으로 덮는다)
// 해도 밖 바다: 그림 바다를 채도 낮춰 한 장 만들어 둔다 (해도 안과 같은 색 · 안개 없음)
export function mutedSea(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d');
  x.drawImage(img, 0, 0); x.globalCompositeOperation = 'saturation'; x.fillStyle = 'rgba(128,128,128,0.42)'; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgba(232,226,204,0.12)'; x.fillRect(0, 0, c.width, c.height);
  return c;
}
export function drawVoyageMark(ctx, S, o) {
  const k = o.spread || 1, p = voyagePoint(o.from, o.to, Math.min(1, Math.max(0, o.frac)), k, S); if (!p) return;
  const t = o.t || 0, lw = Math.max(2, S * 0.006);
  ctx.save(); ctx.lineCap = 'round';
  // 남은 길 = 흰 동그란 점 · 온 길 = 빨간 동그란 점 (조금 크게)
  const f = Math.min(1, Math.max(0, o.frac));
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; dotCurve(ctx, p.x1, p.y1, p.mx, p.my, p.x2, p.y2, lw * 0.55, lw * 2.4, f, 1);
  if (f > 0) { ctx.fillStyle = '#c0442c'; dotCurve(ctx, p.x1, p.y1, p.mx, p.my, p.x2, p.y2, lw * 0.7, lw * 2.4, 0, f); }
  // 닿을 섬 깃발
  const fx = p.x2 + S * 0.03, fy = p.y2 - S * 0.07;
  ctx.strokeStyle = '#3d2b1c'; ctx.lineWidth = Math.max(1.5, S * 0.0035); ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy + S * 0.05); ctx.stroke();
  ctx.fillStyle = '#c0442c'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + S * 0.03, fy + S * 0.01 + Math.sin(t * 4) * S * 0.002); ctx.lineTo(fx, fy + S * 0.02); ctx.closePath(); ctx.fill();
  // 배 둘레 퍼지는 물결 (내 자리 표시)
  for (let j = 0; j < 2; j++) { const ph = (t * 0.6 + j / 2) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - ph)})`; ctx.lineWidth = Math.max(1.5, S * 0.004); ctx.beginPath(); ctx.ellipse(p.x, p.y, S * (0.025 + ph * 0.05), S * (0.016 + ph * 0.032), 0, 0, 6.29); ctx.stroke(); }
  // 배 (해도 격자 그림 — 없으면 코드 그림), 물결에 살짝 흔들림
  const bob = Math.sin(t * 2.2) * S * 0.003;
  // 배 그림은 위에서 본 모습(뱃머리가 위) — 가는 방향으로 돌린다 (v29.4.9 사용자 「배가 바라보는 방향」)
  ctx.save(); ctx.translate(p.x, p.y + bob); ctx.rotate(p.a + Math.PI / 2);
  const drawn = cell(ctx, o.sheet, CELL.boat, 0, 0, S * 0.062); ctx.restore();
  if (!drawn) drawBoat(ctx, p.x, p.y + bob, S * 0.026, t);
  // 배 위 알약: 어디로 · 남은 시간
  if (o.text) {
    const px = Math.max(12, Math.min(15, S * 0.017)); ctx.font = `600 ${px}px "Gowun Dodum", "Apple SD Gothic Neo", sans-serif`;
    const w = ctx.measureText(o.text).width + px * 1.2, h = px * 1.8, bx = p.x - w / 2, by = p.y - S * 0.065 - h;
    ctx.fillStyle = 'rgba(61,43,28,0.86)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, w, h, h / 2); else ctx.rect(bx, by, w, h); ctx.fill();
    ctx.fillStyle = '#fbf4e4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.text, p.x, by + h / 2 + 0.5);
  }
  ctx.restore();
}
// 누른 곳 이름 하나 (해도 창이 해도 그림 위에 따로 얹는다 — 끄는 동안엔 그림 한 장만 옮기므로)
export function drawChartLabel(ctx, S, o) {
  const l = o.label, p = l && (BIG[l.id] || o.chart.found[l.id]); if (!p) return;
  const W = S * (o.spread || 1);
  placeNames(ctx, [{ id: l.id, text: l.text, x: p.x * W, y: p.y * W, r: S * (BIG[l.id] ? 0.062 : 0.045), rank: 1e6 }], [], S);
}
const cell = (ctx, sheet, n, x, y, size) => fitCell(ctx, sheet, n, x, y, size);
// 섬 이름 자리 (v29.4.2 — 섬이 몰린 곳에서 이름이 이웃 섬 그림에 덮이던 것):
//  이름은 섬·안개를 다 그린 뒤 바탕을 깔고 맨 위에 쓴다(가려지지 않게). 자리는 제 섬 바로 아래가 기본이고,
//  다른 이름과 부딪칠 때만 위 → 오른쪽 → 왼쪽으로 옮긴다.
export function pickLabelSpot(box, cands, placed, bodies, selfId) {
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const cover = (a) => bodies.reduce((sum, c) => {
    if (c.id === selfId) return sum;
    const nx = Math.max(a.x, Math.min(c.x, a.x + a.w)), ny = Math.max(a.y, Math.min(c.y, a.y + a.h)), d = Math.hypot(c.x - nx, c.y - ny);
    return sum + Math.max(0, c.r - d);
  }, 0);
  let best = null, bestCost = Infinity;
  cands.forEach(([cx, top], i) => {
    const b = { x: cx - box.w / 2, y: top, w: box.w, h: box.h, blocked: placed.some(q => hit({ x: cx - box.w / 2, y: top, w: box.w, h: box.h }, q)), cover: 0 };
    b.cover = cover(b);
    // 「이름은 제 섬 바로 아래」가 기본 — 읽는 사람이 배우는 규칙이 하나라 헷갈리지 않는다. 다른 이름과 부딪칠 때만 다음 자리로
    const cost = (b.blocked ? 1e6 : 0) + i * 1e3 + b.cover;
    if (cost < bestCost) { bestCost = cost; best = b; }
  });
  return best;
}
function labelLines(ctx, text, px, maxWidth) {
  ctx.font = `600 ${Math.round(px)}px "Gowun Dodum", "Apple SD Gothic Neo", sans-serif`;
  const lines = []; let line = '';
  const words = String(text).split(' ');
  const byWord = maxWidth && words.length > 1 && words.every(w => ctx.measureText(w).width <= maxWidth);
  for (const part of byWord ? words : [...String(text)]) {
    const next = line + (byWord && line ? ' ' : '') + part;
    if (maxWidth && line && ctx.measureText(next).width > maxWidth) { lines.push(line.trim()); line = part; }
    else line = next;
  }
  lines.push(line.trim());
  return lines;
}
// v29.4.3 (사용자 폰 화면 2026-10-24): 다 물러서 보면 섬이 한 섬 너비 간격으로 붙어 있어 이름 31개가 들어갈 자리가 없다.
//  지도 앱처럼 — 글자는 화면 기준 크기(12~16px)로 고정하고, 지금 섬·많이 간 섬부터 자리를 주며, 깔끔히 안 들어가는 이름은 숨긴다.
//  확대하면 자리가 생겨 하나씩 나타나고, 섬을 누르면 카드에 이름이 나온다.
function placeNames(ctx, names, bodies, S) {
  const px = Math.max(12, Math.min(16, S * 0.0175)), lh = Math.round(px * 1.25), pad = px * 0.4, placed = [];
  for (const n of names) {
    const lines = labelLines(ctx, n.text, px, Math.max(px * 5.5, S * 0.12));
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + pad * 2, h = lines.length * lh + pad * 1.4, gap = n.r * 0.08;
    const cands = [[n.x, n.y + n.r * 1.05], [n.x, n.y - n.r * 1.05 - h], [n.x + n.r * 1.05 + w / 2, n.y - h / 2], [n.x - n.r * 1.05 - w / 2, n.y - h / 2]]
      .map(([x, y]) => [x, y + (y > n.y ? gap : -gap)]);
    const b = pickLabelSpot({ w, h }, cands, placed, bodies, n.id);
    if (b.blocked || (b.cover > h * 0.45 && n.rank < 1e6)) continue;   // 다른 이름과 겹치거나 이웃 섬을 많이 덮으면 이 배율에선 쓰지 않는다 (지금 섬은 늘 쓴다)
    placed.push(b);
    ctx.save();
    ctx.fillStyle = 'rgba(248,239,218,0.82)'; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, Math.min(b.h / 2, px * 0.8)); else ctx.rect(b.x, b.y, b.w, b.h);
    ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#3d2b1c';
    lines.forEach((l, i) => ctx.fillText(l, b.x + b.w / 2, b.y + pad * 0.7 + i * lh));
    ctx.restore();
  }
}
function label(ctx, text, x, y, px, color, maxWidth) {
  ctx.font = `600 ${Math.round(px)}px "Gowun Dodum", "Apple SD Gothic Neo", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  // 섬이 많아져도 긴 이름이 옆 섬 이름과 겹치지 않도록 줄바꿈한다.
  const lines = []; let line = '';
  const words = String(text).split(' ');
  const byWord = maxWidth && words.length > 1 && words.every(w => ctx.measureText(w).width <= maxWidth);
  for (const part of byWord ? words : [...String(text)]) {
    const next = line + (byWord && line ? ' ' : '') + part;
    if (maxWidth && line && ctx.measureText(next).width > maxWidth) { lines.push(line.trim()); line = part; }
    else line = next;
  }
  lines.push(line.trim());
  ctx.lineWidth = px * 0.25; ctx.strokeStyle = 'rgba(245,234,210,0.9)'; ctx.fillStyle = color;
  for (let i = 0; i < lines.length; i++) { const yy = y + i * Math.round(px * 1.25); ctx.strokeText(lines[i], x, yy); ctx.fillText(lines[i], x, yy); }
}
function stamp(ctx, x, y, r, ink, n) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25);
  ctx.globalAlpha = ink; ctx.strokeStyle = '#c0442c'; ctx.lineWidth = r * 0.16;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, 6.29); ctx.stroke();
  ctx.fillStyle = '#c0442c'; ctx.font = `700 ${Math.round(r * 0.85)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 0, r * 0.05);
  ctx.restore();
}
// 코드 그림 (격자 그림이 없을 때) — 수채 느낌으로 겹쳐 칠한다
function blob(ctx, x, y, r, seed, color, k = 0.18) {
  const rand = seeded(seed); ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i <= 18; i++) { const a = i / 18 * Math.PI * 2, rr = r * (1 - k + 2 * k * rand()); i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.72) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.72); }
  ctx.closePath(); ctx.fill();
}
const BIG_INK = { beach: ['#e7cf96', '#6f9a5b'], nz: ['#b9a074', '#3f6b48'], snow: ['#eef3f6', '#5f7f78'], fall: ['#d8b98a', '#c0662f'], cherry: ['#efdcc0', '#e7a7b8'], oasis: ['#e6c27a', '#5c8f54'], zen: ['#e9e3d4', '#8a8f7c'] };
for (const p of STOCK_PLACES) BIG_INK[p.id] = p.ink;
function drawBig(ctx, id, x, y, r) {
  const [sand, green] = BIG_INK[id] || BIG_INK.beach, s = hash(id);
  ctx.globalAlpha *= 0.9; blob(ctx, x, y + r * 0.08, r * 1.08, s, 'rgba(120,160,175,0.35)');
  blob(ctx, x, y, r, s + 1, sand); blob(ctx, x - r * 0.1, y - r * 0.12, r * 0.62, s + 2, green, 0.25);
  if (id === 'snow') blob(ctx, x - r * 0.12, y - r * 0.2, r * 0.32, s + 3, '#ffffff', 0.3);
  if (id === 'zen') { ctx.strokeStyle = 'rgba(120,110,90,0.5)'; ctx.lineWidth = r * 0.04; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(x + r * 0.3, y + r * 0.2, r * (0.18 + Math.abs(k) * 0.06), 0, 6.29); ctx.stroke(); } }
}
function drawIslet(ctx, x, y, r, s) {
  blob(ctx, x, y + r * 0.08, r * 1.12, s, 'rgba(120,160,175,0.32)');
  blob(ctx, x, y, r, s + 1, '#dcc392'); blob(ctx, x, y - r * 0.15, r * 0.55, s + 2, '#6f9a5b', 0.3);
}
function drawSpot(ctx, s, [x, y], S, t) {
  const r = S * 0.03; ctx.save(); ctx.lineWidth = S * 0.0035;
  if (s.kind === 'reef') { for (let k = 0; k < 5; k++) blob(ctx, x + Math.cos(k * 1.3) * r * 0.7, y + Math.sin(k * 1.3) * r * 0.5, r * 0.35, k + 7, 'rgba(230,120,130,0.55)'); }
  else if (s.kind === 'current') { ctx.strokeStyle = 'rgba(200,110,60,0.7)'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); for (let i = 0; i <= 12; i++) { const px = x - r * 1.4 + i * r * 0.23, py = y + k * r * 0.45 + Math.sin(i * 0.9 + t * 1.2) * r * 0.12; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); } }
  else if (s.kind === 'fog') { for (let k = 0; k < 4; k++) blob(ctx, x - r + k * r * 0.65, y + Math.sin(k) * r * 0.2, r * 0.5, k + 11, 'rgba(255,255,255,0.75)', 0.2); }
  else if (s.kind === 'whale') { ctx.strokeStyle = 'rgba(60,90,120,0.75)'; ctx.beginPath(); ctx.moveTo(x - r, y + r * 0.2); ctx.quadraticCurveTo(x, y - r * 0.6, x + r, y + r * 0.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + r, y + r * 0.2); ctx.lineTo(x + r * 1.35, y - r * 0.15); ctx.moveTo(x + r, y + r * 0.2); ctx.lineTo(x + r * 1.4, y + r * 0.45); ctx.stroke(); }
  ctx.restore();
}
function drawBoat(ctx, x, y, r, t) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 1.5) * r * 0.08);
  ctx.fillStyle = '#7a4f2a'; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.lineTo(r * 0.7, r * 0.45); ctx.lineTo(-r * 0.7, r * 0.45); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6f9a5b'; ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.quadraticCurveTo(r * 0.9, -r * 0.5, 0, -r * 0.05); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawCompass(ctx, x, y, r) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = 'rgba(80,55,35,0.6)'; ctx.fillStyle = 'rgba(150,60,40,0.65)'; ctx.lineWidth = r * 0.05;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.stroke();
  for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -r * 0.95); ctx.lineTo(r * 0.16, 0); ctx.lineTo(-r * 0.16, 0); ctx.closePath(); k % 2 ? ctx.stroke() : ctx.fill(); }
  ctx.fillStyle = 'rgba(80,55,35,0.8)'; ctx.font = `700 ${Math.round(r * 0.4)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('N', 0, -r * 1.02);
  ctx.restore();
}
// 안개: 판 전체를 옅은 크림 안개로 덮고, 연 큰 섬 · 찾은 곳 · 다닌 항로 둘레를 지운다. 밖은 아직 아무도 안 그린 바다
function drawFog(ctx, S, o, t) {
  const c = drawFog.cv || (drawFog.cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas'));
  const q = 0.5, w = Math.max(1, Math.round(S * q)); if (c.width !== w) { c.width = w; c.height = w; }
  const f = c.getContext('2d'); f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, w, w);
  f.fillStyle = o.frameless ? FOG_SEA : 'rgba(236,226,206,0.9)'; f.fillRect(0, 0, w, w);   // 물빛 바탕엔 바다 안개(흰 물안개) 색
  // 안개 결
  for (let k = 0; k < 26; k++) { const r = seeded(k * 97 + 3); blob(f, r() * w, r() * w, w * (0.06 + r() * 0.08), k + 40, 'rgba(255,252,244,0.35)', 0.25); }
  f.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => { const g = f.createRadialGradient(x * w, y * w, 0, x * w, y * w, r * w); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.65, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); f.fillStyle = g; f.beginPath(); f.arc(x * w, y * w, r * w, 0, 6.29); f.fill(); };
  const { routes } = tally(o.log, o.home), seen = new Set(o.home ? [o.home] : []);
  for (const k of Object.keys(routes)) for (const id of k.split('~')) seen.add(id);
  // 열린 섬은 방문 전에도 이름과 그림이 보인다. 잠긴 섬의 안개는 유지한다.
  for (const id of Object.keys(BIG)) if (o.open?.(id)) seen.add(id);
  for (const id of seen) if (BIG[id]) hole(BIG[id].x, BIG[id].y, 0.17);
  for (const k of Object.keys(routes)) {
    const [a, b] = k.split('~'); if (!BIG[a] || !BIG[b]) continue;
    for (let i = 1; i < 8; i++) { const u = i / 8, x = BIG[a].x + (BIG[b].x - BIG[a].x) * u - (BIG[b].y - BIG[a].y) * 0.12 * 4 * u * (1 - u) * 0.5, y = BIG[a].y + (BIG[b].y - BIG[a].y) * u + (BIG[b].x - BIG[a].x) * 0.12 * 4 * u * (1 - u) * 0.5; hole(x, y, 0.08); }
  }
  for (const v of Object.values(o.chart.found)) hole(v.x, v.y, 0.11);
  // v29.4.9 틀 없는 해도 (사용자 「해도 밖이 하늘색이라 잘린 느낌」): 해도 밖은 안개 없는 같은 바다다 —
  //  안개를 가장자리로 갈수록 옅게 지워 바깥 바다와 이음매 없이 잇는다
  if (o.frameless) {
    const e = w * 0.12;   // destination-out 그대로 — 가장자리 = 다 지움, 안쪽 e 에서 그대로
    for (const [x0, y0, x1, y1] of [[0, 0, e, 0], [w, 0, w - e, 0], [0, 0, 0, e], [0, w, 0, w - e]]) { const g = f.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); f.fillStyle = g; f.fillRect(0, 0, w, w); }
  }
  f.globalCompositeOperation = 'source-over';
  ctx.drawImage(c, 0, 0, S, S);
}
