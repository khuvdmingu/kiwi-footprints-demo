// build.js — v28 섬에서 쌓이는 것: 키위들이 섬마다 하나씩 지어 간다
//
//  · 그 섬에서 끝까지 한 집중(섬에서 보기)·그 섬에 닿은 항해의 분 수가 공사가 된다. 낚아 온 재료는 하나에 15분어치.
//  · 지을 것 여섯 가지가 순서대로 (깃발 15분 → … → 등대 400분). 시들거나 무너지지 않는다 (벌점 없음).
//  · 모래 정원은 등대 대신 석등.
//  · 숲 가장자리(beach.grass) 양 끝에 선다 — 가운데는 글씨 쓰는 자리라 비워 둔다.
//  · 다 지은 등대·석등·모닥불은 밤에 불을 켠다.
//  그림: assets/catch-sheet.webp 의 10~15 칸 (fishing.js 와 같은 장). 없으면 코드 그림.
//  기록은 이 기기에만 (localStorage 'builds').

import { standCell } from './sheet.js?v=v29.15.1';

export const BUILDS = [
  { id: 'flag', min: 15, cell: 10, ko: '깃발', note: '여기 우리가 있었다는 표시.', x: 0.17, h: 0.11 },
  { id: 'bench', min: 45, cell: 11, ko: '나무 벤치', note: '글씨 쓰다 앉아 쉬는 자리.', x: 0.8, h: 0.09 },
  { id: 'post', min: 90, cell: 12, ko: '우체통', note: '떠내려온 편지를 넣어 두는 곳.', x: 0.26, h: 0.12 },
  { id: 'fire', min: 160, cell: 13, ko: '모닥불 자리', note: '밤이면 다 같이 둘러앉는다.', x: 0.7, h: 0.08, glow: 0.7 },
  { id: 'hut', min: 260, cell: 14, ko: '오두막', note: '비 오는 날 다 같이 들어간다.', x: 0.93, h: 0.2 },
  { id: 'light', min: 400, cell: 15, ko: '등대', note: '밤바다로 나간 배가 돌아올 길.', x: 0.07, h: 0.24, glow: 1 },
];
export const BUILD = Object.fromEntries(BUILDS.map(b => [b.id, b]));
// 장소마다 바꿔 세우는 것 (v28.3 — extra-sheet.webp 칸). sheet: 'extra' 면 보충 격자에서 그린다
export const VARIANTS = {
  zen: {
    light: { ko: '석등', note: '자갈 정원을 밝히는 돌 등.', h: 0.16, sheet: 'extra', cell: 8 },
    hut: { ko: '찻집', note: '자갈 소리를 들으며 차를 마신다.', sheet: 'extra', cell: 9 },
    fire: { ko: '물확', note: '대나무 대롱에서 물이 똑똑 떨어진다.', h: 0.09, sheet: 'extra', cell: 10, glow: 0 },
    bench: { ko: '돌 벤치', note: '햇볕에 데워진 납작한 돌.', sheet: 'extra', cell: 11 },
  },
  snow: {
    hut: { ko: '통나무집', note: '지붕에 눈이 두툼하게 쌓였다.', sheet: 'extra', cell: 12 },
    flag: { ko: '눈사람', note: '빨간 목도리를 둘렀다.', h: 0.12, sheet: 'extra', cell: 13 },
  },
  fall: { hut: { ko: '단풍 오두막', note: '지붕을 단풍잎으로 덮었다.', sheet: 'extra', cell: 14 } },
  nz: { hut: { ko: '고사리 오두막', note: '고사리 잎을 엮어 지붕을 얹었다.', sheet: 'extra', cell: 15 } },
  // v28.20 벚꽃 강변 · 오아시스 (build-sheet-2.webp — 재고 stock/kit 격자, sheet: 'kit')
  cherry: {
    flag: { ko: '벚꽃 깃발', note: '꽃잎 무늬 천을 가지에 달았다.', sheet: 'kit', cell: 12 },
    bench: { ko: '꽃잎 벤치', note: '앉으면 꽃잎이 내려앉는다.', sheet: 'kit', cell: 15 },
    fire: { ko: '소풍 담요', note: '찻잔을 놓고 꽃 구경을 한다.', sheet: 'kit', cell: 13, glow: 0 },
    hut: { ko: '벚꽃 정자', note: '지붕 위로 꽃이 쌓인다.', sheet: 'kit', cell: 9 },
    light: { ko: '석등', note: '강물에 불빛이 흔들린다.', h: 0.16, sheet: 'kit', cell: 11 },
  },
  oasis: {
    flag: { ko: '줄무늬 천막', note: '한낮의 해를 가린다.', sheet: 'kit', cell: 7 },
    bench: { ko: '야자 섬유 벤치', note: '야자 섬유를 엮어 만들었다.', sheet: 'kit', cell: 6 },
    fire: { ko: '주전자 모닥불', note: '밤 사막은 춥다. 차를 끓인다.', sheet: 'kit', cell: 14 },
    hut: { ko: '야자잎 오두막', note: '모래바람이 들지 않게 촘촘히.', sheet: 'kit', cell: 4 },
    light: { ko: '사암 망루', note: '멀리 사막 길을 비춘다.', sheet: 'kit', cell: 8 },
  },
};
export const buildFor = (b, map) => (VARIANTS[map]?.[b.id] ? { ...b, ...VARIANTS[map][b.id] } : b);

export class Builds {
  constructor(load, save) {
    this.save = save;
    let s = {};
    try { s = JSON.parse(load() || '{}'); } catch (e) { s = {}; }
    this.m = {}; for (const [k, v] of Object.entries(s.m || {})) if (v > 0) this.m[k] = Math.round(v);
    this.fresh = s.fresh || {};   // 새로 다 지은 것 (처음 보일 때 뿅 하고 서는 효과용) { map: id }
  }
  store() { this.save(JSON.stringify({ m: this.m, fresh: this.fresh })); }
  minutes(map) { return this.m[map] || 0; }
  level(map) { const m = this.minutes(map); return BUILDS.filter(b => m >= b.min).length; }
  // 공사 더하기 → 새로 다 지은 것 [build]
  add(map, min) {
    if (!map || !(min > 0)) return [];
    const was = this.level(map); this.m[map] = this.minutes(map) + Math.round(min);
    const done = BUILDS.slice(was, this.level(map)).map(b => buildFor(b, map));
    if (done.length) this.fresh[map] = done[done.length - 1].id;
    this.store();
    return done;
  }
  // 다음 것까지 { build, left(분), frac } · 다 지었으면 null
  next(map) {
    const m = this.minutes(map), i = this.level(map); if (i >= BUILDS.length) return null;
    const b = buildFor(BUILDS[i], map), from = i ? BUILDS[i - 1].min : 0;
    return { build: b, left: b.min - m, frac: (m - from) / (b.min - from) };
  }
  seenFresh(map) { if (this.fresh[map]) { delete this.fresh[map]; this.store(); } }
}

// 공사 안내 한 줄 ("오두막까지 37분")
export function nextText(builds, map) {
  const n = builds.next(map); if (!n) return '다 지었어요';
  return `${n.build.ko}까지 ${n.left}분`;
}

// 섬 위에 그리기 (main.js draw — 물가 물건 다음, 키위 그림자 앞). pop = { id, t0 } 새로 선 것의 뿅 효과
export function drawBuilds(ctx, beach, map, level, sheets, night = 0, pop = null) {
  if (!level) return;
  const { W, H, t } = beach, S = Math.min(W, H);
  for (let i = 0; i < level; i++) {
    const b = buildFor(BUILDS[i], map), x = W * b.x, y = beach.grass(x) + S * 0.055, h = S * b.h;   // 숲 가장자리보다 조금 앞(잎 그늘에 꼭대기가 묻히지 않게)
    if (!isFinite(x) || !isFinite(y) || !(h > 0)) continue;   // 판을 읽는 중·창 크기를 바꾸는 순간엔 숲 가장자리가 아직 없다
    let k = 1; if (pop && pop.id === b.id) { const a = (t - pop.t0) / 0.6; k = a >= 1 ? 1 : Math.max(0, a) < 0.7 ? Math.max(0.01, a / 0.7 * 1.12) : 1.12 - (a - 0.7) / 0.3 * 0.12; }
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    // 바닥 그림자
    ctx.fillStyle = 'rgba(40,30,20,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, h * 0.42, h * 0.08, 0, 0, 6.29); ctx.fill();
    if (standCell(ctx, sheets?.[b.sheet || 'catch'], b.cell, 0, h * 0.04, h)) { /* 그림 격자 */ }
    else drawCode(ctx, b.id, h, t, map);
    ctx.restore();
    if (b.glow && night > 0.2) glow(ctx, b, x, y, h, night, t);
  }
}
function glow(ctx, b, x, y, h, n, t) {
  const fl = 0.9 + 0.1 * Math.sin(t * 6.1) * Math.sin(t * 2.3);
  const gy = b.id === 'light' ? y - h * 0.86 : b.id === 'fire' ? y - h * 0.25 : y - h * 0.6, r = (b.id === 'light' ? h * 0.9 : h * 1.4) * fl;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, gy, 0, x, gy, r);
  g.addColorStop(0, `rgba(255,214,140,${0.8 * n})`); g.addColorStop(0.4, `rgba(255,180,90,${0.28 * n})`); g.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, gy, r, 0, 6.29); ctx.fill();
  if (b.id === 'light') {   // 천천히 도는 불빛 줄기
    const a = t * 0.6, len = h * 3.2;
    for (const s of [1, -1]) {
      const dir = a + (s < 0 ? Math.PI : 0), vis = Math.max(0, Math.cos(dir)); if (vis < 0.05) continue;
      ctx.fillStyle = `rgba(255,230,170,${0.12 * n * vis})`; ctx.beginPath(); ctx.moveTo(x, gy);
      ctx.lineTo(x + Math.sin(dir) * len * 1, gy - len * 0.08); ctx.lineTo(x + Math.sin(dir) * len, gy + len * 0.08); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}
// 코드 그림 — 그림 격자가 오기 전까지 (따뜻한 나무·흰 회벽·종이 그림 톤)
function drawCode(ctx, id, h, t, map) {
  const wood = '#8a5a34', dark = '#5b3a22', line = 'rgba(50,32,20,0.55)';
  ctx.lineWidth = Math.max(1, h * 0.025); ctx.strokeStyle = line; ctx.lineJoin = 'round';
  const R = (x, y, w, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, hh); ctx.strokeRect(x, y, w, hh); };
  if (id === 'flag') {
    R(-h * 0.02, -h, h * 0.04, h, dark);
    const wv = Math.sin(t * 3) * h * 0.04;
    ctx.fillStyle = '#d4553a'; ctx.beginPath(); ctx.moveTo(h * 0.02, -h * 0.98); ctx.quadraticCurveTo(h * 0.22, -h * 0.92 + wv, h * 0.4, -h * 0.86); ctx.quadraticCurveTo(h * 0.22, -h * 0.8 - wv, h * 0.02, -h * 0.72); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (id === 'bench') {
    R(-h * 0.5, -h * 0.5, h, h * 0.13, wood); R(-h * 0.5, -h * 0.85, h, h * 0.12, wood);
    R(-h * 0.42, -h * 0.37, h * 0.08, h * 0.37, dark); R(h * 0.34, -h * 0.37, h * 0.08, h * 0.37, dark);
    R(-h * 0.42, -h * 0.85, h * 0.06, h * 0.35, dark); R(h * 0.36, -h * 0.85, h * 0.06, h * 0.35, dark);
  } else if (id === 'post') {
    R(-h * 0.04, -h * 0.55, h * 0.08, h * 0.55, dark);
    ctx.fillStyle = '#c94a36'; ctx.beginPath(); ctx.moveTo(-h * 0.22, -h * 0.55); ctx.lineTo(-h * 0.22, -h * 0.85); ctx.arc(0, -h * 0.85, h * 0.22, Math.PI, 0); ctx.lineTo(h * 0.22, -h * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
    R(-h * 0.12, -h * 0.82, h * 0.24, h * 0.05, '#3b2416');
  } else if (id === 'fire') {
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.29; ctx.fillStyle = '#9b958a'; ctx.beginPath(); ctx.ellipse(Math.cos(a) * h * 0.38, Math.sin(a) * h * 0.1 - h * 0.05, h * 0.1, h * 0.07, 0, 0, 6.29); ctx.fill(); ctx.stroke(); }
    R(-h * 0.3, -h * 0.2, h * 0.6, h * 0.08, wood);
    const fl = Math.sin(t * 9) * h * 0.03;
    ctx.fillStyle = '#f2a33a'; ctx.beginPath(); ctx.moveTo(-h * 0.16, -h * 0.15); ctx.quadraticCurveTo(-h * 0.05, -h * 0.6 + fl, 0, -h * 0.75 + fl); ctx.quadraticCurveTo(h * 0.08, -h * 0.5, h * 0.16, -h * 0.15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(-h * 0.07, -h * 0.15); ctx.quadraticCurveTo(0, -h * 0.45 - fl, h * 0.07, -h * 0.15); ctx.closePath(); ctx.fill();
  } else if (id === 'hut') {
    R(-h * 0.4, -h * 0.55, h * 0.8, h * 0.55, map === 'snow' ? '#c9b49a' : '#b4895c');
    ctx.fillStyle = map === 'snow' ? '#f4f6f8' : '#c9a256'; ctx.beginPath(); ctx.moveTo(-h * 0.52, -h * 0.5); ctx.lineTo(0, -h * 0.98); ctx.lineTo(h * 0.52, -h * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    R(-h * 0.1, -h * 0.32, h * 0.2, h * 0.32, dark); R(h * 0.17, -h * 0.42, h * 0.14, h * 0.12, '#f3dc97');
  } else if (id === 'light') {
    if (map === 'zen') {   // 석등
      const st = '#a9a596'; R(-h * 0.06, -h * 0.45, h * 0.12, h * 0.45, st); R(-h * 0.25, -h * 0.5, h * 0.5, h * 0.08, st);
      R(-h * 0.16, -h * 0.72, h * 0.32, h * 0.22, '#f1dc9a');
      ctx.fillStyle = st; ctx.beginPath(); ctx.moveTo(-h * 0.32, -h * 0.72); ctx.lineTo(0, -h * 0.95); ctx.lineTo(h * 0.32, -h * 0.72); ctx.closePath(); ctx.fill(); ctx.stroke();
      return;
    }
    ctx.fillStyle = '#f2ece0'; ctx.beginPath(); ctx.moveTo(-h * 0.14, 0); ctx.lineTo(-h * 0.09, -h * 0.78); ctx.lineTo(h * 0.09, -h * 0.78); ctx.lineTo(h * 0.14, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c94a36'; for (const y of [0.18, 0.48]) { ctx.beginPath(); ctx.moveTo(-h * (0.14 - y * 0.06), -h * y); ctx.lineTo(-h * (0.14 - (y + 0.12) * 0.06), -h * (y + 0.12)); ctx.lineTo(h * (0.14 - (y + 0.12) * 0.06), -h * (y + 0.12)); ctx.lineTo(h * (0.14 - y * 0.06), -h * y); ctx.closePath(); ctx.fill(); }
    R(-h * 0.08, -h * 0.92, h * 0.16, h * 0.14, '#f3dc97');
    ctx.fillStyle = '#c94a36'; ctx.beginPath(); ctx.moveTo(-h * 0.12, -h * 0.92); ctx.lineTo(0, -h * 1.02); ctx.lineTo(h * 0.12, -h * 0.92); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
