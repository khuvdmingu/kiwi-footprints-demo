// fishing.js — v28 낚싯줄: 출항할 때 키위가 배 뒤로 줄을 드리우고, 도착하면 걸려 올라온 것이 하나 나온다
//
//  · 무엇이 걸릴지는 출발 시각(항해 id)이 씨앗이라 정해져 있다 — 다시 열어도·이어 가도 같은 것.
//  · 오래 갈수록 드문 것이 잘 걸린다 (25분 = 기준, 50분이면 드문 쪽이 두 배쯤). 산호초를 지나면 한 단계 더.
//  · 벌점은 없다: 짧게 가도 해초 리본 하나는 걸린다.
//  · 재료(유목 묶음·낡은 밧줄·배 판자)는 도착한 섬에 내려 섬 짓기를 앞당긴다 (build.js — 하나에 15분어치).
//  · 병 속 지도 조각은 해도에 해리 덤을 준다 (chart.js addBonus) — 다음 작은 섬이 조금 빨리 보인다.
//  그림: assets/catch-sheet.webp 4×4 (0~9 낚은 것 · 10~15 섬 짓기, build.js 와 같은 장). 없으면 코드 그림.
//  기록은 이 기기에만 (localStorage 'catch').

import { RARITY } from './shore.js?v=v29.16.2-water-e3e6f61';
import { fitCell } from './sheet.js?v=v29.16.2-water-e3e6f61';

export const SHEET = 'catch-sheet.webp?v=v29.16.2-water-e3e6f61';
export const CATCHES = [
  { id: 'kelp', r: 0, cell: 0, ko: '해초 리본', en: 'a kelp ribbon', note: '길고 반짝이는 해초. 키위들이 목에 감고 놀았다.' },
  { id: 'driftb', r: 0, cell: 1, ko: '유목 묶음', en: 'a bundle of driftwood', note: '잘 마른 나뭇가지 한 아름.', material: true },
  { id: 'rope', r: 0, cell: 2, ko: '낡은 밧줄', en: 'an old rope', note: '어느 배에서 풀려 나온 밧줄.', material: true },
  { id: 'buoy', r: 1, cell: 3, ko: '유리 부표', en: 'a glass float', note: '초록 유리 공. 그물에서 떨어져 나왔다.' },
  { id: 'coral', r: 1, cell: 4, ko: '산호 가지', en: 'a sprig of coral', note: '분홍 산호 한 가지.' },
  { id: 'plank', r: 1, cell: 5, ko: '배 판자', en: 'a ship plank', note: '페인트가 반쯤 벗겨진 판자.', material: true },
  { id: 'compass', r: 2, cell: 6, ko: '낡은 나침반', en: 'an old compass', note: '바늘이 늘 바다 쪽을 가리킨다.' },
  { id: 'mapbit', r: 2, cell: 7, ko: '병 속 지도 조각', en: 'a map scrap in a bottle', note: '누가 그린 해도 한 귀퉁이. 해도 안개가 조금 더 걷힌다.', bonus: 1.5 },
  { id: 'seahorse', r: 2, cell: 8, ko: '해마 모양 조개', en: 'a seahorse-shaped shell', note: '꼬리가 말린 작은 조개.' },
  { id: 'starsand', r: 3, cell: 9, ko: '별모래 병', en: 'a bottle of star sand', note: '모래알이 하나하나 별 모양이다.' },
];
export const CATCH = Object.fromEntries(CATCHES.map(c => [c.id, c]));
const WEIGHT = [10, 4, 1.2, 0.3];
export const MATERIAL_MIN = 15;   // 재료 하나 = 섬 짓기 15분어치

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

// 걸릴 확률 무게: 드문 등급일수록 오래 갈 때 더 무거워진다. reef = 산호초를 지났나
export function weights(min, { reef = false } = {}) {
  const k = Math.max(0.2, Math.min(4, min / 25)) * (reef ? 1.6 : 1);
  return CATCHES.map(c => WEIGHT[c.r] * (c.r === 0 ? 1 : Math.pow(k, c.r * 0.8)));
}
// 이 항해에 걸린 것 (항해 id 가 씨앗)
export function rollCatch(tripId, min, opt) {
  const w = weights(min, opt), sum = w.reduce((a, b) => a + b, 0);
  let x = seeded(hash('catch:' + tripId))() * sum;
  for (let i = 0; i < CATCHES.length; i++) if ((x -= w[i]) < 0) return CATCHES[i];
  return CATCHES[0];
}
// 일기 한 줄
const LINES = [
  { ko: c => `줄을 걷어 보니 ${c.ko}${josa(c.ko)} 걸려 있었다.`, en: c => `When we pulled in the line, there was ${c.en}.` },
  { ko: c => `낚싯줄이 툭 당겼다. ${c.ko}${josa(c.ko) === '이' ? '이었다' : '였다'}.`, en: c => `The line tugged once. It was ${c.en}.` },
];
const josa = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '이' : '가'; };
export function catchLine(c, tripId) { const L = LINES[hash(tripId) % LINES.length]; return { ko: L.ko(c), en: L.en(c) }; }

export class Catches {
  constructor(load, save) {
    this.save = save;
    let s = {};
    try { s = JSON.parse(load() || '{}'); } catch (e) { s = {}; }
    this.n = {}; for (const c of CATCHES) if (s.n?.[c.id] > 0) this.n[c.id] = s.n[c.id];
    this.seen = new Set((s.seen || []).filter(id => CATCH[id]));
    this.trips = new Set((s.trips || []).slice(-200));   // 한 항해에 한 번만 (도착이 두 번 불려도)
  }
  store() { this.save(JSON.stringify({ n: this.n, seen: [...this.seen], trips: [...this.trips] })); }
  // → { item, fresh } · 이미 받은 항해면 null
  take(tripId, item) {
    if (this.trips.has(tripId)) return null;
    const fresh = !this.seen.has(item.id);
    this.trips.add(tripId); this.seen.add(item.id); this.n[item.id] = (this.n[item.id] || 0) + 1; this.store();
    return { item, fresh };
  }
  has(id) { return this.seen.has(id); }
  count(id) { return this.n[id] || 0; }
  give(id) { if (!(this.n[id] > 0)) return false; this.n[id]--; this.store(); return true; }   // v29.6 답장 선물로 내준다
  get kinds() { return this.seen.size; }
}
export { RARITY };

// 그리기 ─ 칸 하나(그림이 없으면 코드로)
export function drawCatch(ctx, sheet, c, x, y, size) {
  if (fitCell(ctx, sheet, c.cell, x, y, size * 0.82)) return;
  const r = size * 0.3, col = ['#5f9a62', '#a0784c', '#b89a6a', '#7cc0a4', '#e48a92', '#9c7650', '#c9a14a', '#d9c8a0', '#e9b48a', '#9fb4e8'][c.cell] || '#999';
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(60,40,25,0.6)'; ctx.lineWidth = size * 0.03;
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.75, -0.4, 0, 6.29); ctx.fill(); ctx.stroke();
  ctx.restore();
}
// 항해 중 배 뒤로 드리운 줄과 찌 (voyage-scene 위에 2D 로). bx,by = 배 가운데, bw = 배 너비, u = 화면 단위, t = 초
export function drawLine(c, { bx, by, bw, bh, u, t, night = 0 }) {
  // 위에서 본 배(뱃머리가 위) — 고물(아래쪽) 왼편에서 줄이 물살 옆으로 끌려 간다
  const sx = bx - bw * 0.2, sy = by + bh * 0.36;
  const fx = bx - bw * 0.62 + Math.sin(t * 0.6) * u * 0.01, fy = by + bh * 0.66 + Math.sin(t * 1.7) * u * 0.005;
  c.save();
  c.strokeStyle = night > 0.5 ? 'rgba(230,235,245,0.6)' : 'rgba(60,45,30,0.6)'; c.lineWidth = Math.max(1, u * 0.0022);
  c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(sx - bw * 0.1, sy + bh * 0.22, fx, fy); c.stroke();
  // 찌 (빨강·흰색 반반) + 퍼지는 물결
  const r = Math.max(2.5, u * 0.008);
  c.fillStyle = '#d4553a'; c.beginPath(); c.arc(fx, fy, r, Math.PI, 0); c.fill();
  c.fillStyle = '#f4efe4'; c.beginPath(); c.arc(fx, fy, r, 0, Math.PI); c.fill();
  const ph = (t * 0.5) % 1; c.strokeStyle = `rgba(255,255,255,${0.35 * (1 - ph)})`; c.lineWidth = 1;
  c.beginPath(); c.ellipse(fx, fy + r * 0.6, r * (1.5 + ph * 3), r * (0.5 + ph), 0, 0, 6.29); c.stroke();
  c.restore();
}
