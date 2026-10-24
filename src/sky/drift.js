// sky/drift.js — v28.15 날리는 것: 나비 · 민들레 홀씨·버들솜 · 헬리콥터 씨앗·은행잎
//
//  atmos.js 가 매 프레임 update/draw 를 부른다 (#fx 층, 시간 빛 위). 그림은 4×2 격자(칸 256px, 투명 — 재고 stock/drift, 2026-10-22):
//   assets/drift-butterflies.webp  1행 흰나비 날갯짓 4장(펼침·반·접힘·반) · 2행 노랑나비 같은 4장 — 칸을 차례로 돌리면 날갯짓
//   assets/drift-fluff.webp        1행 민들레 홀씨 4 · 2행 버들솜 4
//   assets/drift-seeds.webp        1행 단풍 헬리콥터 씨앗 4각도(돌리면 빙글) · 2행 은행잎 4
//  (꽃잎·낙엽의 앞뒷면 짝 drift-flip.webp 는 sky/extra.js 의 꽃잎 바람이 쓴다)
//  나타나는 때: 맑은 낮(비·눈·짙은 안개 아님) — 나비는 눈밭 빼고 어디서나 · 홀씨는 바닷가·모래 정원·벚꽃 강변·오아시스 · 씨앗은 가을 호숫가

const FILES = { bf: 'assets/drift-butterflies.webp?v=v28.19.0', fluff: 'assets/drift-fluff.webp?v=v28.19.0', seeds: 'assets/drift-seeds.webp?v=v28.19.0' };
const FLUFF_MAPS = new Set(['beach', 'zen', 'cherry', 'oasis']);
const WING = [0, 1, 2, 3, 2, 1];   // 날갯짓 칸 차례 (펼침 → 접힘 → 펼침)

export class Drift {
  constructor(rand = Math.random) { this.rand = rand; this.sheets = {}; this.bfs = []; this.fluff = []; this.seeds = []; this.t = 0; this.nextBf = 6; }

  // 4×2 격자를 처음 필요할 때 읽어 칸마다 잘라 둔다
  sheet(k) {
    if (this.sheets[k] !== undefined || typeof Image === 'undefined') return this.sheets[k] || null;
    this.sheets[k] = null;
    const im = new Image();
    im.onload = () => {
      const cw = im.naturalWidth / 4, ch = im.naturalHeight / 2, list = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        const cv = document.createElement('canvas'); cv.width = Math.round(cw); cv.height = Math.round(ch);
        cv.getContext('2d').drawImage(im, c * cw, r * ch, cw, ch, 0, 0, cv.width, cv.height);
        list.push(cv);
      }
      this.sheets[k] = list;
    };
    im.src = FILES[k];
    return null;
  }

  update(dt, beach, v, mapId = 'beach', night = 0) {
    this.t += dt;
    const W = beach.W, H = beach.H, u = beach.u, R = this.rand;
    const fair = (v.rain || 0) < 0.05 && (v.snow || 0) < 0.05 && (v.drizzle || 0) < 0.05 && (v.fog || 0) < 0.3;
    const day = night < 0.35;
    const top = beach.bushY ?? H * 0.25, bot = beach.shoreY ?? H * 0.6;
    if (!isFinite(top) || !isFinite(bot)) return;

    // 나비: 하나둘씩 가로질러 날아가고, 가끔 모래에 앉아 날개를 천천히 접었다 편다
    if (fair && day && mapId !== 'snow' && this.t > this.nextBf && this.bfs.length < 2) {
      this.nextBf = this.t + 14 + R() * 26;
      const dir = R() < 0.5 ? 1 : -1, y0 = top + (bot - top) * (0.2 + R() * 0.6);
      this.bfs.push({ x: dir > 0 ? -30 * u : W + 30 * u, y0, y: y0, vx: dir * (38 + R() * 22) * u, row: R() < 0.5 ? 0 : 1, ph: R() * 6, wob: 1.4 + R(), f: R() * 6, rest: 0, restAt: 3 + R() * 8, s: (50 + R() * 14) * u });
    }
    for (const b of this.bfs) {
      if (b.rest > 0) { b.rest -= dt; b.f += dt * 2.2; continue; }   // 앉아서 천천히
      b.x += b.vx * dt; b.y = b.y0 + Math.sin(this.t * b.wob + b.ph) * 26 * u + Math.sin(this.t * 3.1 + b.ph) * 6 * u;
      b.f += dt * 14;
      b.restAt -= dt; if (b.restAt <= 0) { b.rest = 1.5 + R() * 2.5; b.restAt = 6 + R() * 10; }
    }
    this.bfs = this.bfs.filter(b => b.x > -60 * u && b.x < W + 60 * u);
    if (!fair || !day) for (const b of this.bfs) { b.rest = 0; b.vx = Math.sign(b.vx || 1) * 90 * u; }   // 비가 오거나 저물면 서둘러 떠난다

    // 홀씨·버들솜: 천천히 떠오르며 옆으로 흘러간다
    const nF = fair && night < 0.6 && FLUFF_MAPS.has(mapId) ? 5 : 0;
    while (this.fluff.length < nF) this.fluff.push(this.newFluff(W, H, u, top, bot, this.fluff.length < 2));
    for (const p of this.fluff) {
      p.x += p.vx * dt; p.y -= p.up * dt; p.y += Math.sin(this.t * p.wob + p.ph) * 4 * u * dt; p.rot += p.spin * dt;
      if (p.y < top - 60 * u || p.x > W + 30 * u || p.x < -30 * u) Object.assign(p, nF ? this.newFluff(W, H, u, top, bot, false) : { gone: true });
    }
    this.fluff = this.fluff.filter(p => !p.gone);

    // 헬리콥터 씨앗(빙글)·은행잎(팔랑): 가을 호숫가 숲에서 떨어진다
    const nS = fair && mapId === 'fall' ? 6 : 0;
    while (this.seeds.length < nS) this.seeds.push(this.newSeed(W, u, top, true));
    for (const p of this.seeds) {
      p.y += p.fall * dt; p.x += (p.drift + Math.sin(this.t * p.wob + p.ph) * 16) * u * dt; p.f += p.spinSp * dt;
      if (p.y > bot + 30 * u) Object.assign(p, nS ? this.newSeed(W, u, top, false) : { gone: true });
    }
    this.seeds = this.seeds.filter(p => !p.gone);
  }

  newFluff(W, H, u, top, bot, anywhere) {
    const R = this.rand;
    return { x: R() * W, y: anywhere ? top + R() * (bot - top) : bot + R() * 40 * u, vx: (8 + R() * 18) * u * (R() < 0.8 ? 1 : -1), up: (6 + R() * 8) * u,
      wob: 0.8 + R(), ph: R() * 6, rot: R() * 6.28, spin: (R() - 0.5) * 0.6, cell: Math.floor(R() * 8), s: (30 + R() * 16) * u };
  }
  newSeed(W, u, top, anywhere) {
    const R = this.rand, heli = R() < 0.55;
    return { x: R() * W, y: anywhere ? top + R() * 200 * u : top - 30 * u - R() * 80 * u, heli, fall: (heli ? 46 + R() * 20 : 22 + R() * 14) * u,
      drift: (R() - 0.3) * 14, wob: 1 + R(), ph: R() * 6, f: R() * 4, spinSp: heli ? 10 + R() * 6 : 2 + R() * 2, cell: heli ? 0 : 4 + Math.floor(R() * 4), s: (heli ? 40 : 38) * u * (0.85 + R() * 0.3) };
  }

  get busy() { return this.bfs.length || this.fluff.length || this.seeds.length; }

  draw(ctx, beach) {
    if (!this.busy) return;
    ctx.save();
    const bf = this.bfs.length ? this.sheet('bf') : null;
    if (bf) for (const b of this.bfs) {
      const cell = b.row * 4 + WING[Math.floor(b.f) % WING.length], im = bf[cell];
      // 위에서 본 그림(머리가 위) — 날 땐 머리를 가는 쪽으로, 앉으면 그대로
      ctx.save(); ctx.translate(b.x, b.y); if (b.rest <= 0) ctx.rotate((b.vx > 0 ? 1 : -1) * Math.PI / 2 + Math.sin(this.t * 2 + b.ph) * 0.15);
      ctx.drawImage(im, -b.s / 2, -b.s / 2, b.s, b.s); ctx.restore();
    }
    const fl = this.fluff.length ? this.sheet('fluff') : null;
    if (fl) { ctx.globalAlpha = 0.92; for (const p of this.fluff) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.drawImage(fl[p.cell], -p.s / 2, -p.s / 2, p.s, p.s); ctx.restore(); } ctx.globalAlpha = 1; }
    const sd = this.seeds.length ? this.sheet('seeds') : null;
    if (sd) for (const p of this.seeds) {
      ctx.save(); ctx.translate(p.x, p.y);
      if (p.heli) ctx.drawImage(sd[Math.floor(p.f) % 4], -p.s / 2, -p.s / 2, p.s, p.s);   // 네 각도를 돌려 빙글빙글
      else { ctx.rotate(Math.sin(p.f) * 0.6); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.f))); ctx.drawImage(sd[p.cell], -p.s / 2, -p.s / 2, p.s, p.s); }
      ctx.restore();
    }
    ctx.restore();
  }
}

export const DRIFT_MAPS = { fluff: FLUFF_MAPS };
