// bubbles.js — v28.21 키위 머리 위 감정 표시 · 잠든 키위의 꿈 말풍선
//
//  그림(재고 stock/moments, 2026-10-22): assets/emotes.webp (4×4) · assets/dreams.webp (4×2)
//   감정 칸: 0 하트 · 1 하트들 · 2 ! · 3 ? · 4 땀 · 5 화남 · 6 반짝 · 7 음표 · 8 꿈 구름 · 9 전구 · 10 비구름 · 11 해 · 12 볼 홍조 · 13 어지러움 · 14 꽃 · 15 별
//   꿈 칸: 1 구름 위 나는 키위 · 2 조개 더미 · 3 고래 · 4 별밤 · 5 알 둥지 · 6 꽃밭 · 7 왕관 키위  (0 지렁이는 쓰지 않는다 — 벌레는 반딧불·나비만)
//  · 동작을 시작할 때 그 동작에 맞는 표시가 1.6초 떠올랐다 사라진다 (ACT_EMOTE)
//  · 잠든 키위는 9~20초마다 꿈 말풍선이 3.5초 — 한 번에 둘까지

export const ACT_EMOTE = { startle: 2, tilt: 3, joy: 6, wiggle: 7, proud: 15, hide: 12, lookup: 15, sneeze: 13, shake: 4, nibble: 14, yawn: 8 };
const DREAMS = [1, 2, 3, 4, 5, 6, 7];

// 쓰는 칸만 잘라 둔다 (2026-11-22) — 감정 표시는 ACT_EMOTE 에 있는 칸, 꿈은 DREAMS 칸만 그린다.
//  예전엔 안 쓰는 7칸도 잘라 캔버스 약 7.5MB 를 늘 쥐고 있었다. 자르는 방식은 그대로라 그림은 같다
const EMOTE_USED = new Set(Object.values(ACT_EMOTE)), DREAM_USED = new Set(DREAMS);
function cut(src, cols, rows, used) {
  return new Promise(ok => {
    const im = new Image();
    im.onload = () => {
      const cw = im.naturalWidth / cols, ch = im.naturalHeight / rows, list = new Array(cols * rows);
      for (let k = 0; k < cols * rows; k++) { if (!used.has(k)) continue; const cv = document.createElement('canvas'); cv.width = Math.round(cw); cv.height = Math.round(ch); cv.getContext('2d').drawImage(im, (k % cols) * cw, Math.floor(k / cols) * ch, cw, ch, 0, 0, cv.width, cv.height); list[k] = cv; }
      ok(list);
    };
    im.onerror = () => ok(null);
    im.src = src;
  });
}

export class Bubbles {
  constructor(rand = Math.random) { this.rand = rand; this.list = []; this.emotes = null; this.dreams = null; this.dreamAt = new Map(); }
  load(base = 'assets/') { cut(base + 'emotes.webp?v=pv-7441cb8', 4, 4, EMOTE_USED).then(l => { this.emotes = l; }); cut(base + 'dreams.webp?v=pv-7441cb8', 4, 2, DREAM_USED).then(l => { this.dreams = l; }); }
  emote(kw, cell, t, life = 1.6) {
    if (cell == null) return;
    this.list = this.list.filter(b => b.kw !== kw);   // 한 키위에 하나만
    this.list.push({ kw, cell, dream: false, t0: t, life });
  }
  // 잠든 키위 꿈: kiwis 전체를 훑어 차례가 된 키위에 하나
  update(t, kiwis) {
    this.list = this.list.filter(b => t - b.t0 < b.life && !b.kw.gone && (!b.dream || b.kw.asleep));
    if (this.list.filter(b => b.dream).length >= 2) return;
    for (const kw of kiwis) {
      if (!kw.asleep || kw.gone) { this.dreamAt.delete(kw); continue; }
      if (!this.dreamAt.has(kw)) { this.dreamAt.set(kw, t + 4 + this.rand() * 8); continue; }
      if (t > this.dreamAt.get(kw) && !this.list.some(b => b.kw === kw)) {
        this.list.push({ kw, cell: DREAMS[Math.floor(this.rand() * DREAMS.length)], dream: true, t0: t, life: 3.5 });
        this.dreamAt.set(kw, t + 9 + this.rand() * 11);
        if (this.list.filter(b => b.dream).length >= 2) break;
      }
    }
  }
  draw(ctx, t) {
    for (const b of this.list) {
      const sheet = b.dream ? this.dreams : this.emotes; if (!sheet) continue;
      const kw = b.kw, age = (t - b.t0) / b.life;
      const a = Math.min(1, age / 0.15, (1 - age) / 0.2) * Math.min(1, kw.vis ?? 1);
      if (!(a > 0)) continue;
      const s = kw.k * (b.dream ? 1.7 : 1.4) * (b.dream ? 1 : 0.85 + 0.15 * Math.min(1, age / 0.2));
      const x = kw.x + (b.dream ? kw.k * 0.55 : 0), y = kw.y - kw.k * (b.dream ? 1.85 : 1.6) - age * kw.k * 0.25;
      ctx.save(); ctx.globalAlpha = a;
      const im = sheet[b.cell], h = s * im.height / im.width;
      ctx.drawImage(im, x - s / 2, y - h / 2, s, h);
      ctx.restore();
    }
  }
}
