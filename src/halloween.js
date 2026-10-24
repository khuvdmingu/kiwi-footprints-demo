// halloween.js — v28.12 할로윈 (10-25 ~ 11-01)
//
//  그림(Higgsfield, 2026-10-22): assets/hw-bat · hw-pumpkin · hw-pumpkins · hw-basket · hw-ghost .webp
//  · 섬: 숲 가장자리에 호박 등불 · 유령 종이등 · 호박 둘과 초 · 사탕 바구니 (지은 것과 같은 줄, 밤엔 따뜻하게 빛남)
//  · 해 질 녘부터 박쥐가 한두 마리씩 숲 위를 팔랑팔랑 가로지른다
//  · 항해: 밤바다에 호박 등불이 떠내려와 배 옆을 지나간다
//  머리 장식 셋(마녀 모자 · 호박 모자 · 유령 머리핀)은 items.js · headwear.js 에.
//  기간이 아니어도 주소 ?halloween=1 로 미리 볼 수 있다 (?halloween=0 이면 기간에도 끔).

export function isHalloween(now = new Date(), q = null) {
  if (q?.has('halloween')) return q.get('halloween') !== '0';
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

export class Halloween {
  constructor(on) { this.on = on; this.im = {}; this.bats = []; this.next = 4; this.t = 0; this.sea = []; }
  load(base = 'assets/') {
    if (!this.on) return;
    for (const f of FILES) { const i = new Image(); i.onload = () => { this.im[f] = i; }; i.src = base + 'hw-' + f + '.webp?v=v28.19.0'; }
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
      ctx.fillStyle = 'rgba(40,30,20,0.16)'; ctx.beginPath(); ctx.ellipse(x, y, w * 0.42, h * 0.08, 0, 0, 6.29); ctx.fill();
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
