// album.js — v20 집중 사진: 집중을 끝까지 하면 키위들이 이유와 날짜를 모래에 쓰고, 그 순간을 한 장 남긴다
//
//  · 찍기: #world 안의 그림 층(판·물·숲·구름·빛·효과)을 화면에 보이는 순서와 섞는 방식(곱하기 등) 그대로 한 장에 겹친다.
//    물(WebGL)은 그린 직후에만 읽을 수 있어서, 프레임을 그린 바로 뒤에 찍는다 (main.js frame).
//  · 버튼·입력창은 #world 밖에 있어서 사진에 안 들어간다. 확대·시점 이동과 상관없이 해변 전체가 찍힌다.
//  · 저장: 이 기기 IndexedDB (사진은 localStorage 에 넣기엔 크다). 가로 최대 1600px webp.

import { tintSnapshot } from './tint.js?v=v29.10.0';

const DB = 'kiwi-footprints', STORE = 'shots', MAXW = 1600;

function open() {
  return new Promise((res, rej) => {
    if (!('indexedDB' in window)) { rej(new Error('IndexedDB 없음')); return; }
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), st = t.objectStore(STORE);
    const out = fn(st);
    t.oncomplete = () => { db.close(); res(out && 'result' in out ? out.result : out); };
    t.onerror = () => { db.close(); rej(t.error); };
  });
}

// version: 이 창에서 사진을 넣거나 지울 때마다 올라간다 → 앨범 화면은 바뀌었을 때만 다시 읽는다 (O4, 2026-10-19)
const write = fn => fn().finally(() => { Album.version++; });
export const Album = {
  version: 0,
  add: shot => write(() => tx('readwrite', st => st.put(shot))),
  remove: id => write(() => tx('readwrite', st => st.delete(id))),
  async all() { const list = await tx('readonly', st => st.getAll()); return (list || []).sort((a, b) => b.at - a.at); },
  // 장수만 필요할 때: 사진(Blob)을 읽지 않고 센다
  count: () => tx('readonly', st => st.count()),
};

const BLEND = { multiply: 'multiply', 'soft-light': 'soft-light', screen: 'screen', overlay: 'overlay', normal: 'source-over' };

// world: #world 요소, W·H: 화면 크기(CSS px) → Promise<Blob>
export function capture(world, W, H, finish) {
  const sc = Math.min(MAXW / W, 2), c = document.createElement('canvas');
  c.width = Math.round(W * sc); c.height = Math.round(H * sc);
  const g = c.getContext('2d');
  g.fillStyle = '#0b2b3a'; g.fillRect(0, 0, c.width, c.height);
  for (const el of world.children) {
    const cs = getComputedStyle(el), op = +cs.opacity;
    if (cs.display === 'none' || cs.visibility === 'hidden' || !(op > 0.01)) continue;
    g.globalAlpha = op; g.globalCompositeOperation = BLEND[cs.mixBlendMode] || 'source-over';
    const image = el instanceof HTMLCanvasElement ? el : el.id === 'tint' ? tintSnapshot(el) : null;
    if (image) {
      if (!image.width || !image.height) continue;
      try { g.drawImage(image, 0, 0, c.width, c.height); } catch (e) { /* 읽을 수 없는 층은 건너뛴다 */ }
    } else if (el.id === 'glow') {
      // 골든아워 빛(CSS 그라데이션)을 같은 모양으로 다시 칠한다
      const r = g.createRadialGradient(c.width * 0.1, c.height * 0.04, 0, c.width * 0.1, c.height * 0.04, Math.max(c.width * 0.7, c.height * 0.6) * 0.7);
      r.addColorStop(0, 'rgba(247,214,154,0.75)'); r.addColorStop(1, 'rgba(247,214,154,0)');
      g.fillStyle = r; g.fillRect(0, 0, c.width, c.height);
    }
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  // 밤의 multiply 색조가 글씨까지 다시 어둡게 하지 않도록 최종 합성 후 보정한다.
  if (finish) { g.save(); g.scale(sc, sc); finish(g); g.restore(); }
  return new Promise(res => c.toBlob(b => res(b), 'image/webp', 0.86));
}

// 사진 날짜는 여행 엽서처럼 "18 OCT 2026". UTC로 바꾸지 않고 기기의 현지 시각을 쓴다.
export const PHOTO_MONTHS = Object.freeze(['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']);
export const photoDate = (ms = Date.now()) => { const d = new Date(ms); return `${d.getDate()} ${PHOTO_MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const photoTime = (ms = Date.now()) => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return `${p(d.getHours())}:${p(d.getMinutes())}`; };
export const stamp = (ms = Date.now()) => `${photoDate(ms)} ${photoTime(ms)}`;
// '/'는 layoutText의 줄바꿈. 날짜·시간을 나눠 세로 화면에서도 충분한 글씨 크기를 확보한다.
export const sandDate = (ms = Date.now()) => `${photoDate(ms)}/${photoTime(ms)}`;
export const longDate = stamp;

// 항해 하나 = 앨범 기록 하나. 도착 사진이 준비되면 같은 id에 표지만 갱신한다.
export function voyageAlbumEntry(e, scenes = []) {
  return {
    id: `voyage-${e.id}`, reason: shortReason(e.reason) || `항해 ${e.min}분`, letter: e.reason || '',
    min: e.min, steps: 0, nm: Math.round(e.min * 0.1 * 10) / 10, at: e.at, diary: e.text.ko,
    journey: { from: e.from, to: e.to, sights: e.sights.map(s => ({ ...s, blob: scenes.find(p => p.ts === s.ts && p.kind === s.kind)?.blob || null })) },
    blob: scenes.find(p => p.blob)?.blob || null,
  };
}

// 앨범에서는 한 기록으로 묶고, 일괄 내려받기에는 안쪽의 사건 사진도 포함한다.
export function albumPhotos(list) {
  return list.flatMap(s => [s, ...(s.journey?.sights || []).filter(e => e.blob).map((e, i) => ({ at: e.ts, reason: `${s.reason} - ${e.kind} ${i + 1}`, blob: e.blob }))]);
}

// 집중 이유 → 모래에 쓸 짧은 한 줄 (첫 줄, 14자 안팎에서 띄어쓰기 자리로 자른다)
export function shortReason(text, max = 14) {
  const first = String(text || '').split(/\n/)[0].replace(/[\/]/g, ' ').replace(/\s+/g, ' ').trim();
  if ([...first].length <= max) return first;
  const ch = [...first], cut = ch.slice(0, max + 1).join('').lastIndexOf(' ');
  return (cut >= Math.floor(max * 0.5) ? ch.slice(0, cut).join('') : ch.slice(0, max).join('')).trim() + '..';   // 말줄임표(…)는 발자국 글씨에 없다
}
