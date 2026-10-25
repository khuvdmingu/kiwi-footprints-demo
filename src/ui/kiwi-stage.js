// kiwi-stage.js — v29.7 꾸미기 › 키위 탭 미리보기 무대 (배·돛 탭의 배 미리보기처럼)
//
//  모래 한 자락 + 아래 물가(밀려왔다 빠지는 거품 줄)에 입혀 둔 옷마다 키위 한 마리씩(최대 4, 없으면 맨몸 하나).
//  머리 장식은 섬에서처럼 쉬는 키위(kiwi.webp, 640px 기준) 위에 HEADWEAR 자리로 얹고, 몸째 그린 옷은 그 그림을 쓴다.
//  키위는 숨 쉬듯 오르내리고, 방금 입힌 옷의 키위는 콩 뛴다. 탭이 보일 때만 움직인다(rAF), 닫으면 그림을 놓는다.
import { HEADWEAR } from '../headwear.js?v=v29.7.1';

const loadImage = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(src)); im.src = src; });
const MAX = 4;

// 입힌 옷 목록 → 무대에 세울 키위들 [{ id, name, body, head }] (파일 이름만, DOM 없이 — 시험에서 그대로 쓴다)
export function stageCast(worn) {
  const list = worn.slice(0, MAX).map(it => HEADWEAR[it.id]
    ? { id: it.id, name: it.name, body: 'kiwi.webp?v=v29.7.1', head: HEADWEAR[it.id] }
    : { id: it.id, name: it.name, body: it.img, head: null });
  return list.length ? list : [{ id: null, name: '맨몸', body: 'kiwi.webp?v=v29.7.1', head: null }];
}

export class KiwiStage {
  constructor(canvas, note, { load = loadImage, base = new URL('../../assets/', import.meta.url).href } = {}) {
    this.cv = canvas; this.note = note; this.load = load; this.base = base;
    this.cache = new Map(); this.cast = []; this.hops = new Map(); this.raf = 0; this.t0 = 0; this.sig = '';
  }
  img(f) { if (!this.cache.has(f)) this.cache.set(f, this.load(this.base + f).catch(e => { this.cache.delete(f); throw e; })); return this.cache.get(f); }
  async show(worn) {
    const cast = stageCast(worn), sig = cast.map(k => k.id).join(',');
    const fresh = cast.filter(k => k.id && !this.cast.some(o => o.id === k.id));
    if (sig !== this.sig) {
      this.sig = sig;
      try {
        const ready = await Promise.all(cast.map(async k => ({ ...k, bodyIm: await this.img(k.body), headIm: k.head ? await this.img(k.head.file) : null })));
        if (sig !== this.sig) return;
        this.cast = ready;
        const now = performance.now(); for (const k of fresh) this.hops.set(k.id, now);
        this.note.textContent = cast[0].id ? cast.map(k => k.name).join(' · ') : '아직 입힌 옷이 없어요 — 아래에서 골라 보세요';
        this.cv.setAttribute('aria-label', `미리보기: ${cast.map(k => k.id ? k.name + ' 입은 키위' : '맨몸 키위').join(', ')}`);
      } catch { this.sig = ''; this.note.textContent = '미리보기를 불러오지 못했어요'; }
    }
    this.start();
  }
  start() { if (this.raf) return; this.cv.width = 640; this.cv.height = 240; const loop = t => { this.draw(t); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  release() { this.stop(); this.sig = ''; this.cast = []; this.cache.clear(); this.cv.width = this.cv.height = 1; }
  draw(t) {
    const c = this.cv.getContext('2d'), W = this.cv.width, H = this.cv.height, s = t / 1000;
    const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // 모래 → 젖은 모래 → 물 (물가는 천천히 밀려왔다 빠진다)
    const shore = H * (0.8 + (reduce ? 0 : Math.sin(s * 0.7) * 0.025));
    const sand = c.createLinearGradient(0, 0, 0, H); sand.addColorStop(0, '#efdcb4'); sand.addColorStop(1, '#d9bf8f');
    c.fillStyle = sand; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(150, 120, 80, 0.18)'; c.fillRect(0, shore - H * 0.07, W, H * 0.07);
    const sea = c.createLinearGradient(0, shore, 0, H); sea.addColorStop(0, '#9fd3d0'); sea.addColorStop(1, '#4f9fb0');
    c.fillStyle = sea; c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) c.lineTo(x, shore + Math.sin(x / 50 + s * 1.3) * 3);
    c.lineTo(W, H); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 3; c.beginPath();
    for (let x = 0; x <= W; x += 16) c[x ? 'lineTo' : 'moveTo'](x, shore + Math.sin(x / 50 + s * 1.3) * 3);
    c.stroke();
    // 키위들: 가운데 모아 세우고, 숨 쉬듯 오르내림 + 방금 입힌 키위는 콩
    const n = this.cast.length, size = Math.min(H * 0.86, (W * 0.9) / Math.max(1, n) * 1.15), gap = Math.min(size * 0.8, W * 0.86 / Math.max(1, n)), x0 = W / 2 - gap * (n - 1) / 2, foot = H * 0.8;
    this.cast.forEach((k, i) => {
      const ph = s * 2.1 + i * 1.7, breathe = reduce ? 0 : Math.sin(ph) * size * 0.012;
      const h0 = this.hops.get(k.id), u = h0 ? (t - h0) / 520 : 1, hop = !reduce && u < 1 ? Math.sin(u * Math.PI) * size * 0.16 : 0;
      if (h0 && u >= 1) this.hops.delete(k.id);
      const x = x0 + gap * i, y = foot - size * 0.86 - hop + breathe;
      c.fillStyle = 'rgba(70, 50, 25, 0.22)'; c.beginPath(); c.ellipse(x, foot - size * 0.05, size * 0.26 * (1 - hop / size), size * 0.05, 0, 0, Math.PI * 2); c.fill();
      c.drawImage(k.bodyIm, x - size / 2, y, size, size);
      if (k.headIm) { const f = size / 640; c.drawImage(k.headIm, x - size / 2 + k.head.x * f, y + k.head.y * f, k.head.w * f, k.head.h * f); }
    });
  }
}
