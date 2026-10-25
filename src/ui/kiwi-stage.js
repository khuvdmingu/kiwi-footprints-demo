// kiwi-stage.js — v29.7 꾸미기 › 키위 탭 미리보기 무대 (배·돛 탭의 배 미리보기처럼)
//
//  모래 한 자락 + 아래 물가(밀려왔다 빠지는 거품 줄)에 입혀 둔 옷마다 키위 한 마리씩(최대 4, 없으면 맨몸 하나).
//  머리 장식은 섬에서처럼 쉬는 키위(kiwi.webp, 640px 기준) 위에 HEADWEAR 자리로 얹고, 몸째 그린 옷은 그 그림을 쓴다.
//  키위는 숨 쉬듯 오르내리고, 방금 입힌 옷의 키위는 콩 뛴다. 탭이 보일 때만 움직인다(rAF), 닫으면 그림을 놓는다.
import { HEADWEAR } from '../headwear.js?v=v29.11.0';
import { PAL } from '../tokens.js?v=v29.11.0';
import { dropShadow } from '../shadow.js?v=v29.11.0';

const loadImage = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(src)); im.src = src; });
const MAX = 4;

// 입힌 옷 목록 → 무대에 세울 키위들 [{ id, name, body, head }] (파일 이름만, DOM 없이 — 시험에서 그대로 쓴다)
export function stageCast(worn) {
  const list = worn.slice(0, MAX).map(it => HEADWEAR[it.id]
    ? { id: it.id, name: it.name, body: 'kiwi.webp?v=v29.11.0', head: HEADWEAR[it.id] }
    : { id: it.id, name: it.name, body: it.img, head: null });
  return list.length ? list : [{ id: null, name: '맨몸', body: 'kiwi.webp?v=v29.11.0', head: null }];
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
  start() { if (this.raf) return; this.cv.width = 720; this.cv.height = 300; const loop = t => { this.draw(t); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  release() { this.stop(); this.sig = ''; this.cast = []; this.cache.clear(); this.cv.width = this.cv.height = 1; }
  draw(t) {
    // v29.11 배경(모래·물 띠)은 걷어 내고 키위만 — 창 바탕 위에 서 있게. 다리·발은 섬 키위(kiwi.js)와 같은 방식, 그림자는 모양 따라
    const c = this.cv.getContext('2d'), W = this.cv.width, H = this.cv.height, s = t / 1000;
    const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    c.clearRect(0, 0, W, H);
    const n = this.cast.length, size = Math.min(H * 0.8, (W * 0.9) / Math.max(1, n) * 1.1), gap = Math.min(size * 0.86, W * 0.88 / Math.max(1, n)), x0 = W / 2 - gap * (n - 1) / 2, ground = H * 0.9;
    this.cast.forEach((k, i) => {
      const geo = bodyGeom(k.bodyIm), kk = geo.span * size / 1.21;   // kiwi.js 의 k (꼬리~부리 = 1.21k)
      const breathe = reduce ? 0 : Math.sin(s * 2.1 + i * 1.7) * size * 0.008;
      const h0 = this.hops.get(k.id), u = h0 ? (t - h0) / 520 : 1, hop = !reduce && u < 1 ? Math.sin(u * Math.PI) * size * 0.16 : 0;
      if (h0 && u >= 1) this.hops.delete(k.id);
      const cx = x0 + gap * i, left = cx - size * geo.xb, foot = ground - hop;
      const top = foot - kk * 0.12 - geo.bot * size + breathe;   // 몸 바닥은 땅 위 0.12k
      dropShadow(c, k.bodyIm, cx + (0.5 - geo.xb) * size, top + size, size, size, { alpha: 0.18, squash: 0.2, lean: 0.7, lift: kk * 0.12 + hop, contact: 0.8 });
      legs(c, cx, foot, kk);
      c.drawImage(k.bodyIm, left, top, size, size);
      if (k.headIm) { const f = size / 640; c.drawImage(k.headIm, left + k.head.x * f, top + k.head.y * f, k.head.w * f, k.head.h * f); }
    });
  }
}

// 몸 그림의 꼬리~부리 폭·바닥 가운데·바닥 높이 (그림 비율, 한 번만 잰다)
const geoms = new WeakMap();
function bodyGeom(im) {
  if (geoms.has(im)) return geoms.get(im);
  let g = { span: 0.9, xb: 0.45, bot: 0.85 };
  try {
    const w = 160, h = Math.round(160 * im.naturalHeight / im.naturalWidth), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d'); x.drawImage(im, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data, on = (i, j) => d[(j * w + i) * 4 + 3] > 60;
    let x0 = w, x1 = 0, y1 = 0; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (on(i, j)) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y1 = Math.max(y1, j); }
    let sx = 0, m = 0; for (let j = y1 - 3; j <= y1; j++) for (let i = x0; i <= x1; i++) if (on(i, j)) { sx += i; m++; }
    if (x1 > x0) g = { span: (x1 - x0) / w, xb: (m ? sx / m : (x0 + x1) / 2) / w, bot: (y1 + 1) / h };
  } catch (e) { /* 그대로 */ }
  geoms.set(im, g); return g;
}
// 다리·발 (kiwi.js 와 같은 비율): 엉덩이 ±0.1k 에서 땅까지, 앞으로 펼친 세 발가락
function legs(c, x, foot, k) {
  c.save(); c.strokeStyle = PAL.beak; c.lineCap = 'round'; c.lineJoin = 'round';
  for (const hx of [-0.1, 0.1]) {
    const fx = x + hx * k;
    c.lineWidth = 0.035 * k; c.beginPath(); c.moveTo(fx, foot - 0.16 * k); c.lineTo(fx, foot); c.stroke();
    c.lineWidth = 0.045 * k; c.beginPath();
    for (const [tx, ty] of [[0.13, -0.005], [0.12, 0.04], [0.075, 0.072], [-0.03, 0.012]]) { c.moveTo(fx, foot); c.lineTo(fx + tx * k, foot + ty * k); }
    c.stroke();
  }
  c.restore();
}
