// halloween.js — v28.12 할로윈 (10-25 ~ 11-01)
//
//  그림(Higgsfield, 2026-10-22): assets/hw-bat · hw-pumpkin · hw-pumpkins · hw-basket · hw-ghost .webp
//  · 섬: 숲 가장자리에 호박 등불 · 유령 종이등 · 호박 둘과 초 · 사탕 바구니 (지은 것과 같은 줄, 밤엔 따뜻하게 빛남)
//  · 해 질 녘부터 박쥐가 한두 마리씩 숲 위를 팔랑팔랑 가로지른다
//  · 항해: 밤바다에 호박 등불이 떠내려와 배 옆을 지나간다
//  머리 장식 셋(마녀 모자 · 호박 모자 · 유령 머리핀)은 items.js · headwear.js 에.
//  기간이 아니어도 주소 ?halloween=1 로 미리 볼 수 있다 (?halloween=0 이면 기간에도 끔).

import { dropShadow } from './shadow.js?v=v29.25.1-44a30f8';
// v29.13 (사용자): 섬마다 늘어놓던 할로윈 장식은 뺀다 — 섬에 어울리게 다시 하거나(예: 할로윈 전용 섬) 다른 방식으로 보일 때까지.
//  날짜로 저절로 켜지지 않고 미리 보기 주소(?halloween=1)에서만. 머리 장식(마녀 모자 등) 옷은 그대로.
export const HALLOWEEN_AUTO = false;
export function isHalloween(now = new Date(), q = null) {
  if (q?.has('halloween')) return q.get('halloween') !== '0';
  if (!HALLOWEEN_AUTO) return false;
  const m = now.getMonth(), d = now.getDate();
  return (m === 9 && d >= 25) || (m === 10 && d === 1);
}

const FILES = ['bat', 'pumpkin', 'pumpkins', 'basket', 'ghost'];
// 숲 가장자리 자리: x = 화면 폭 비율, h = 짧은 변 비율 (지은 것은 0.07~0.2 — 그 사이·작게), glow = 밤에 빛나는 높이(그림 높이 비율)
const PROPS = [
  { k: 'pumpkin', x: 0.13, h: 0.075, glow: 0.45 },
  { k: 'ghost', x: 0.26, h: 0.08, glow: 0.5 },
  { k: 'pumpkins', x: 0.47, h: 0.065, glow: 0.35 },
  { k: 'basket', x: 0.68, h: 0.065 },
  { k: 'pumpkin', x: 0.86, h: 0.06, glow: 0.45 },
];

// v29.11 호박 등불·유령 그림엔 빛번짐이 반투명으로 구워져 있어 낮 모래 위에선 네모난 얼룩으로 보였다 →
//  읽을 때 한 번, 옅은 알파(160 아래)를 걷어 내고 나머지를 다시 펼친다. 밤 빛은 glow() 가 따로 그린다
const HALO = new Set(['pumpkin', 'ghost']), CUT = 160;
function dehalo(im) {
  try {
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] < CUT ? 0 : Math.round((d[i] - CUT) * 255 / (255 - CUT));
    g.putImageData(id, 0, 0); return c;
  } catch (e) { return im; }
}

export class Halloween {
  constructor(on) { this.on = on; this.im = {}; this.bats = []; this.next = 4; this.t = 0; this.sea = []; }
  load(base = 'assets/') {
    if (!this.on) return;
    for (const f of FILES) { const i = new Image(); i.onload = () => { this.im[f] = HALO.has(f) ? dehalo(i) : i; }; i.src = base + 'hw-' + f + '.webp?v=v29.25.1-44a30f8'; }
  }

  // 박쥐: 해 질 녘(night > 0.25)부터 숲 위 하늘 띠를 가로지른다
  update(dt, beach, night) {
    if (!this.on) return;
    this.t += dt;
    const { W, u } = beach;
    for (const b of this.bats) { b.x += b.vx * dt; b.y = b.y0 + Math.sin(this.t * b.wob + b.ph) * 18 * u; b.flap += dt * 11; }
    this.bats = this.bats.filter(b => b.x > -80 * u && b.x < W + 80 * u);
    if (night > 0.25 && this.t > this.next && this.bats.length < 3) {
      this.next = this.t + 6 + Math.random() * 10;
      const dir = Math.random() < 0.5 ? 1 : -1, n = Math.random() < 0.4 ? 2 : 1, top = beach.bushY, band = Math.max(30 * u, (beach.shoreY - beach.bushY) * 0.7);   // 숲 위는 너무 어두워 안 보인다 → 달빛 모래 위
      for (let i = 0; i < n; i++) {
        const y0 = top + Math.random() * band;
        this.bats.push({ x: dir > 0 ? -60 * u - i * 50 * u : W + 60 * u + i * 50 * u, y0, y: y0, vx: dir * (70 + Math.random() * 40) * u, flap: Math.random() * 6, ph: Math.random() * 6, wob: 1.5 + Math.random(), s: (40 + Math.random() * 12) * u });
      }
    }
  }

  // 숲 가장자리 장식 (지은 것 drawBuilds 와 같은 자리 계산 — 키위보다 먼저 그려 키위가 앞을 지나간다)
  drawIsland(ctx, beach, night) {
    if (!this.on) return;
    const { W, H } = beach, S = Math.min(W, H), t = this.t;
    for (const p of PROPS) {
      const im = this.im[p.k]; if (!im) continue;
      const x = W * p.x, y = beach.grass(x) + S * 0.05, h = S * p.h, w = h * im.width / im.height;
      if (!isFinite(x) || !isFinite(y)) continue;
      dropShadow(ctx, im, x, y, w, h, { alpha: 0.2, squash: 0.18, lean: 0.9 });   // v29.11 동그란 그림자 대신 모양 따라 눕는 그림자
      ctx.drawImage(im, x - w / 2, y - h, w, h);
      if (p.glow && night > 0.15) glow(ctx, x, y - h * p.glow, h * 1.5, night, t + p.x * 7);
    }
  }

  drawBats(ctx) {
    if (!this.on || !this.im.bat) return;
    const im = this.im.bat;
    for (const b of this.bats) {
      const fold = 0.45 + 0.55 * Math.abs(Math.cos(b.flap)), w = b.s * 1.2, h = w * im.height / im.width;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.sign(b.vx) * 0.12); ctx.scale(fold, 1);
      ctx.filter = 'brightness(1.35)'; ctx.drawImage(im, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  // 항해: 밤바다의 호박 등불 (voyage-scene 이 물·섬 다음, 배 앞에 부른다). speed = 화면 짧은 변/초 (물이 흐르는 빠르기)
  drawSea(c, W, H, u, t, night, speed) {
    if (!this.on || night < 0.2 || !this.im.pumpkin) return;
    const im = this.im.pumpkin;
    for (let i = 0; i < 4; i++) {
      const cyc = H + u * 0.6, y = ((t * speed * u + i * cyc / 4 + i * 97) % cyc) - u * 0.3;
      const x = W * (i % 2 ? 0.2 + 0.08 * Math.sin(i * 3.1) : 0.8 - 0.08 * Math.cos(i * 2.3)) + Math.sin(t * 0.6 + i) * u * 0.01;
      const h = u * 0.07, w = h * im.width / im.height, bob = Math.sin(t * 1.4 + i * 1.7) * u * 0.004;
      glow(c, x, y + bob, h * 2.2, night, t + i);
      c.save(); c.globalAlpha = Math.min(1, night * 1.5); c.drawImage(im, x - w / 2, y - h / 2 + bob, w, h); c.restore();
    }
  }
}

function glow(ctx, x, y, r, n, t) {
  const fl = 0.88 + 0.12 * Math.sin(t * 6.3) * Math.sin(t * 2.1);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * fl);
  g.addColorStop(0, `rgba(255,170,70,${0.55 * n})`); g.addColorStop(0.45, `rgba(255,140,50,${0.2 * n})`); g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * fl, 0, 6.29); ctx.fill();
  ctx.restore();
}
