// sky/extra.js — v23 날씨 둘 더: 보슬비 · 꽃잎/낙엽 바람
//
//  atmos.js 가 이 파일의 값(EXTRA_PARAM)을 날씨 표에 합치고, 매 프레임 SkyExtra.update/draw 를 부른다 — main.js 는 모른다.
//  보슬비: 굵은 빗줄기(atmos 의 rain)는 조금만 섞고(0.15), 여기서 가늘고 짧은 실비를 촘촘히 뿌린다. 물 위엔 아주 작은 고리.
//  꽃잎 바람: 바람은 약하게(0.2), 여기서 꽃잎이 팔랑이며 흘러간다. 숲 장소(뉴질랜드 숲 · 가을 호숫가)에선 꽃잎 대신 낙엽.
//           그림: 낙엽은 가을 호숫가 물 위 단풍과 같은 낱장(assets/leaves.webp 4×2), 꽃잎은 assets/petals.webp(4×2, Higgsfield v23).
//           그림을 아직 못 읽었거나(첫 순간·시험) 없으면 선으로 그린 잎으로 대신한다.

import { clamp } from '../util.js?v=v27.2.0';

export const EXTRA_WEATHERS = ['drizzle', 'blossom'];
// atmos 의 날씨 값 열쇠(cloud·windK·amp·rain·snow·fog·wind·grey)에 drizzle·blossom 두 칸이 더 붙는다
export const EXTRA_KEYS = { drizzle: 0, blossom: 0 };
export const EXTRA_PARAM = {
  drizzle: { cloud: 0.5, windK: 1.15, amp: 1.05, rain: 0.15, snow: 0, fog: 0.16, wind: 0.06, grey: 0.45, drizzle: 1, blossom: 0 },
  blossom: { cloud: 0.12, windK: 2.0, amp: 1.25, rain: 0, snow: 0, fog: 0, wind: 0.2, grey: 0, drizzle: 0, blossom: 1 },
};
export const leafy = mapId => mapId === 'fall' || mapId === 'nz';
export const blossomName = mapId => (leafy(mapId) ? '낙엽 바람' : '꽃잎 바람');

const PETAL = ['#F6C9D3', '#F2B6C6', '#FBE3E8', '#EFA9BD', '#FFF1F3'];
const LEAF = ['#C8582B', '#D9822B', '#E3A23A', '#A8442A', '#B86A2E', '#E8B04A'];

const SHEETS = { leaf: 'assets/leaves.webp?v=v27.2.0', petal: 'assets/petals.webp?v=v27.2.0' };

export class SkyExtra {
  constructor(rand = Math.random) { this.sprites = {}; this.rand = rand; this.mist = []; this.dots = []; this.petals = []; this.kind = 'petal'; this.t = 0; }

  update(dt, beach, v, mapId = 'beach') {
    this.t += dt;
    const W = beach.W, H = beach.H, u = beach.u, area = (W * H) / 1e6, R = this.rand;
    // 보슬비: 화면 위에서 거의 곧게(살짝 비스듬히) 빠르게 — 다 내려오면 다시 위로
    const nMist = Math.round(clamp(v.drizzle || 0, 0, 1) * 420 * area);
    while (this.mist.length < nMist) this.mist.push(this.newMist(W, H, u, true));
    if (this.mist.length > nMist) this.mist.length = nMist;
    for (const m of this.mist) {
      m.y += m.sp * dt; m.x += m.sp * 0.16 * dt;
      if (m.y > H + 10 || m.x > W + 10) {
        // 물 위에 떨어진 것만 아주 작은 고리 (모래는 젖은 색으로 이미 충분)
        if (this.dots.length < 80 && R() < 0.35) { const x = R() * W, y = R() * H; if (beach.edge && y > beach.edge(x)) this.dots.push({ x, y, age: 0 }); }
        Object.assign(m, this.newMist(W, H, u, false));
      }
    }
    for (const d of this.dots) d.age += dt;
    this.dots = this.dots.filter(d => d.age < 0.7);
    // 꽃잎 · 낙엽
    const kind = leafy(mapId) ? 'leaf' : 'petal';
    if (kind !== this.kind) { this.kind = kind; this.petals.length = 0; }
    const nP = Math.round(clamp(v.blossom || 0, 0, 1) * 46 * Math.sqrt(area * 2));
    while (this.petals.length < nP) this.petals.push(this.newPetal(W, H, u, true));
    if (this.petals.length > nP) this.petals.length = nP;
    for (const p of this.petals) {
      p.x += p.sp * dt;
      p.y += (p.fall + Math.sin(this.t * p.wob + p.ph) * 22) * u * dt;
      p.rot += p.spin * dt; p.flap += p.flapSp * dt;
      if (p.x > W + 20 || p.y > H + 20) Object.assign(p, this.newPetal(W, H, u, false));
    }
  }

  // 낱장 그림을 처음 필요할 때 읽어 칸마다 잘라 둔다
  sheet(kind) {
    if (this.sprites[kind] !== undefined || typeof Image === 'undefined') return this.sprites[kind] || null;
    this.sprites[kind] = null;
    const im = new Image();
    im.onload = () => {
      const cw = im.naturalWidth / 4, ch = im.naturalHeight / 2, list = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        const cv = document.createElement('canvas'); cv.width = Math.round(cw); cv.height = Math.round(ch);
        cv.getContext('2d').drawImage(im, c * cw, r * ch, cw, ch, 0, 0, cv.width, cv.height);
        list.push(cv);
      }
      this.sprites[kind] = list;
    };
    im.src = SHEETS[kind];
    return null;
  }

  newMist(W, H, u, anywhere) {
    const R = this.rand;
    return { x: R() * W * 1.1 - W * 0.1, y: anywhere ? R() * H : -10 - R() * 40, len: (5 + R() * 5) * u, sp: (280 + R() * 120) * u, a: 0.16 + R() * 0.14 };
  }
  newPetal(W, H, u, anywhere) {
    const R = this.rand, leaf = this.kind === 'leaf', pal = leaf ? LEAF : PETAL;
    return {
      x: anywhere ? R() * W : -20 - R() * W * 0.3, y: R() * H * 0.9,
      sp: (55 + R() * 70) * u, fall: 6 + R() * 14, wob: 1.2 + R() * 1.4, ph: R() * 6.28,
      rot: R() * 6.28, spin: (R() - 0.5) * 3, flap: R() * 6.28, flapSp: 3 + R() * 4,
      s: (leaf ? 5 + R() * 3 : 3.2 + R() * 1.8) * u, c: pal[Math.floor(R() * pal.length)],
      img: Math.floor(R() * 8), size: (leaf ? 26 + R() * 14 : 28 + R() * 12) * u,   // 그림으로 그릴 때의 칸 크기 (꽃잎은 칸의 40% 쯤만 차 있다)
    };
  }

  get busy() { return this.mist.length || this.dots.length || this.petals.length; }

  draw(ctx, beach) {
    const u = beach.u;
    ctx.save();
    if (this.mist.length) {
      ctx.strokeStyle = 'rgb(230,236,242)'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.6, 0.8 * u);
      ctx.globalAlpha = 0.36;
      ctx.beginPath();
      for (const m of this.mist) { ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + m.len * 0.16, m.y + m.len); }
      ctx.stroke();
    }
    if (this.dots.length) {
      ctx.lineWidth = Math.max(0.6, 0.7 * u);
      for (const d of this.dots) {
        const k = d.age / 0.7;
        ctx.globalAlpha = 0.4 * (1 - k); ctx.strokeStyle = 'rgb(236,246,250)';
        ctx.beginPath(); ctx.ellipse(d.x, d.y, (1 + k * 5) * u, (0.5 + k * 2.4) * u, 0, 0, 6.29); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    const spr = this.petals.length ? this.sheet(this.kind) : null;
    for (const p of this.petals) {
      // 팔랑임: 한 축으로 납작해졌다 펴졌다 (뒤집히는 것처럼)
      const fl = 0.3 + 0.7 * Math.abs(Math.cos(p.flap));
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, fl);
      if (spr) { const im = spr[p.img % spr.length]; ctx.drawImage(im, -p.size / 2, -p.size / 2, p.size, p.size); ctx.restore(); continue; }
      ctx.fillStyle = p.c;
      if (this.kind === 'leaf') {
        // 낙엽: 끝이 뾰족한 잎 + 가운데 잎맥
        ctx.beginPath(); ctx.moveTo(-p.s, 0); ctx.quadraticCurveTo(0, -p.s * 0.62, p.s, 0); ctx.quadraticCurveTo(0, p.s * 0.62, -p.s, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(90,40,20,0.45)'; ctx.lineWidth = Math.max(0.5, 0.5 * u);
        ctx.beginPath(); ctx.moveTo(-p.s * 1.25, 0); ctx.lineTo(p.s * 0.85, 0); ctx.stroke();
      } else {
        // 꽃잎: 끝이 살짝 파인 둥근 잎
        ctx.beginPath(); ctx.moveTo(0, p.s * 0.55);
        ctx.bezierCurveTo(-p.s, p.s * 0.3, -p.s * 0.8, -p.s * 0.7, -p.s * 0.15, -p.s * 0.6);
        ctx.lineTo(0, -p.s * 0.4); ctx.lineTo(p.s * 0.15, -p.s * 0.6);
        ctx.bezierCurveTo(p.s * 0.8, -p.s * 0.7, p.s, p.s * 0.3, 0, p.s * 0.55); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }
}
