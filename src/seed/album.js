// seed/album.js — 집중 사진 앨범 (IndexedDB 'kiwi-footprints' › shots)
//
//  보이는 곳: 모은 것 › 집중 사진 (격자·크게 보기·이유·날짜·지우기).
//  · 사진은 진짜 화면을 찍는 대신 캔버스로 그린 더미 그림(모래·바다·이유·날짜)이다. 가로/세로 섞음.
//  · 날짜·이유는 seed/focus.js sessions() 의 "끝까지 한" 기록과 같다 → 달력과 앨범이 맞는다.
//  · 더미 사진에는 seed: true 를 달아 둔다 → 비우기·되돌리기는 더미만 지우고 진짜 사진은 그대로 둔다.

import { Album } from '../album.js?v=v29.27.0-d80d58b';
import { sessions, REASONS } from './focus.js?v=v29.27.0-d80d58b';
import { at, rng, pickOf } from './util.js?v=v29.27.0-d80d58b';

const SIZES = [[1600, 1000], [900, 1600], [1600, 1000], [1600, 1200]];

// 브라우저에서만 (캔버스 필요)
function paint(s, i) {
  const [w, h] = SIZES[i % SIZES.length], c = document.createElement('canvas');
  c.width = w / 2; c.height = h / 2;   // 더미는 절반 크기로 (저장 용량 아끼기)
  const g = c.getContext('2d'), W = c.width, H = c.height, shore = H * (0.55 + (i % 3) * 0.06);
  let gr = g.createLinearGradient(0, 0, 0, shore);
  gr.addColorStop(0, ['#e8d3a6', '#d9c49a', '#c9b48e'][i % 3]); gr.addColorStop(1, '#f2e2bd');
  g.fillStyle = gr; g.fillRect(0, 0, W, shore);
  gr = g.createLinearGradient(0, shore, 0, H); gr.addColorStop(0, '#7cc7c2'); gr.addColorStop(1, '#1f6f8b');
  g.fillStyle = gr; g.fillRect(0, shore, W, H - shore);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, shore - 3, W, 6);
  g.fillStyle = '#5b4a35'; g.textAlign = 'center';
  g.font = `600 ${Math.round(W / 14)}px sans-serif`; g.fillText(s.reason, W / 2, shore * 0.45);
  const d = new Date(s.at);
  g.font = `${Math.round(W / 22)}px sans-serif`; g.fillText(`${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`, W / 2, shore * 0.62);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.font = `${Math.round(W / 30)}px sans-serif`; g.fillText(`더미 사진 ${i + 1}`, W / 2, H - 16);
  return new Promise(res => c.toBlob(b => res(b), 'image/webp', 0.8));
}

export async function clearSeed() {
  const list = await Album.all();
  for (const s of list) if (s.seed) await Album.remove(s.id);
}

// v23.2 앨범 묶음·200장 알림 시험용: 달력 기록에 더해 1년 넘게 이틀에 한 번꼴로 채워 210장
function huge(now, done, n = 210) {
  const out = done.slice(), used = new Set(out.map(s => s.at)), r = rng(210);
  for (let d = 1; out.length < n && d < 900; d += 1 + Math.floor(r() * 3)) {
    const t = at(now, d, 7 + Math.floor(r() * 14), Math.floor(r() * 60));
    if (t >= now || used.has(t)) continue;
    used.add(t); out.push({ at: t, min: pickOf(r, [15, 25, 25, 50]), reason: pickOf(r, REASONS), letter: '' });
  }
  return out.sort((a, b) => b.at - a.at).slice(0, n);
}

export async function apply(now = Date.now(), variant = 'rich') {
  await clearSeed();
  if (variant === 'none') return 0;
  const done = sessions(now, 'rich').filter(s => s.done).reverse();   // 최근 것부터
  const pick = variant === 'huge' ? huge(now, done) : done.slice(0, variant === 'few' ? 3 : variant === 'many' ? 40 : 14);
  for (let i = 0; i < pick.length; i++) {
    const s = pick[i], blob = await paint(s, i);
    await Album.add({ id: 'shot-seed-' + s.at, reason: s.reason, letter: s.letter, min: s.min, steps: s.min * 100, at: s.at, blob, seed: true });
  }
  return pick.length;
}

export default {
  id: 'album', label: '집중 사진 앨범', where: '모은 것 › 집중 사진',
  keys: [],   // localStorage 가 아니라 IndexedDB
  variants: { rich: '14장 (가로·세로 섞음)', few: '3장', many: '40장 (스크롤·용량)', huge: '210장 (달별 묶음·200장 알림)', none: '더미 사진 지우기' },
  apply, clearSeed,
};
