// sea.js — 바다 (Canvas 2D, 매 프레임)
//  v7 (사용자 그림 기준): 물가는 밝은 청록, 멀어질수록 깊은 파랑. 층마다 크고 유기적인 물결 경계가 서로 다른 박자로 출렁인다.
//   물가에는 하얀 레이스 거품과 물방울, 층 경계에도 옅은 거품 줄, 물속에 비치는 바위, 반짝이는 햇빛.
//  가장 위 층의 윗선은 해변의 해안선 식(beach.edge)과 같다 → 물에 잠긴 발자국을 정확히 지운다.

import { PAL } from './tokens.js?v=pv-d6ce35e';

const LAYERS = [
  // 해안선에서 얼마나 아래(u) · 색 · 불투명도 · 출렁임(u) · 속도 · 파장(1/u) · 위상 · 경계 거품
  { off: 0, col: PAL.seaShallow, a: 0.5, amp: 0, sp: 0, k: 0, ph: 0, foam: 0 },
  { off: 18, col: PAL.seaTeal, a: 0.72, amp: 12, sp: 0.3, k: 0.0075, ph: 0.6, foam: 0.75 },
  { off: 62, col: PAL.sea, a: 0.86, amp: 26, sp: 0.2, k: 0.0048, ph: 2.1, foam: 0.45 },
  { off: 128, col: PAL.seaMid, a: 0.92, amp: 32, sp: 0.15, k: 0.0036, ph: 4.0, foam: 0.15 },
  { off: 200, col: PAL.deep, a: 0.95, amp: 36, sp: 0.11, k: 0.003, ph: 1.2, foam: 0 },
  { off: 285, col: PAL.deeper, a: 0.96, amp: 38, sp: 0.09, k: 0.0025, ph: 5.1, foam: 0 },
];

export class Sea {
  constructor() { this.sparkles = []; this.rocks = []; this.snowPatches = null; }

  resize(beach) {
    const { W, H, u } = beach;
    this.sparkles = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random(), ph: Math.random() * 6.28, s: 0.8 + Math.random() * 1.4 }));
    // 물속 바위: 물가 쪽은 작게 머리를 내밀고, 깊은 곳은 어둡게 비친다
    this.rocks = Array.from({ length: 9 }, (_, i) => {
      const depth = Math.random(), R = (12 + Math.random() * 16) * u;
      const pts = Array.from({ length: 7 }, (_, k) => { const a = (k / 7) * 6.28 + Math.random() * 0.4, rr = R * (0.75 + Math.random() * 0.35); return [Math.cos(a) * rr, Math.sin(a) * rr * 0.75]; });
      return { x: Math.random() * W, d: 30 + depth * 260, R, pts, depth };
    });
    this.snowPatches = Array.from({ length: 22 }, () => {
      const cx = Math.random() * W, cy = beach.bushY + Math.random() * (beach.shoreY - beach.bushY), R = (40 + Math.random() * 90) * u;
      return Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * 6.28, k = 0.75 + Math.random() * 0.5; return [cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * 0.55 * k]; });
    });
  }

  layerTop(beach, L, x) {
    const { u, t } = beach;
    return beach.edge(x) + L.off * u + (L.amp ? L.amp * u * Math.sin(x * L.k / u + t * L.sp + L.ph) + L.amp * 0.4 * u * Math.sin(x * L.k * 2.4 / u - t * L.sp * 0.8 + L.ph * 2) : 0);
  }

  draw(ctx, beach) {
    const { W, H, u, t } = beach, step = Math.max(6, 8 * u);
    if (beach.snow > 0.02 && this.snowPatches) {
      ctx.save(); ctx.globalAlpha = Math.min(0.9, beach.snow * 1.1); ctx.fillStyle = '#F7F4EE';
      for (const pts of this.snowPatches) smoothFill(ctx, pts);
      ctx.restore();
    }
    // 젖은 모래
    ctx.beginPath();
    const cols = beach.wet.length, cw = W / (cols - 1);
    for (let i = 0; i < cols; i++) ctx.lineTo(i * cw, beach.wet[i] - 2 * u);
    for (let x = W + step; x >= -step; x -= step) ctx.lineTo(x, beach.edge(x));
    ctx.closePath();
    ctx.fillStyle = PAL.sandWet; ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1;

    // 물 층 (+ 깊은 층 사이에 바위를 끼워 넣어 물속에 비쳐 보이게)
    LAYERS.forEach((L, li) => {
      ctx.beginPath();
      for (let x = -step; x <= W + step; x += step) { const y = this.layerTop(beach, L, x); x === -step ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.lineTo(W + step, H + 10); ctx.lineTo(-step, H + 10); ctx.closePath();
      ctx.globalAlpha = L.a; ctx.fillStyle = L.col; ctx.fill();
      if (li === 2) this.drawRocks(ctx, beach);
    });
    ctx.globalAlpha = 1;

    // 층 경계의 옅은 거품 줄 (끊어졌다 이어진다)
    ctx.lineCap = 'round';
    for (const L of LAYERS) {
      if (!L.foam) continue;
      ctx.strokeStyle = PAL.foam; ctx.globalAlpha = L.foam; ctx.lineWidth = 2.4 * u;
      ctx.setLineDash([26 * u, 10 * u, 8 * u, 14 * u]); ctx.lineDashOffset = -t * 6 * u;
      ctx.beginPath();
      for (let x = -step; x <= W + step; x += step) { const y = this.layerTop(beach, L, x) + 1.5 * u; x === -step ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 물가 레이스 거품: 굵은 흰 띠 + 아래로 매달린 물방울
    ctx.globalAlpha = 0.92; ctx.strokeStyle = PAL.foam; ctx.lineWidth = 4.2 * u; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let x = -step; x <= W + step; x += step) { const y = beach.edge(x) + 1.5 * u; x === -step ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = PAL.foam;
    const bub = 7 * u;
    for (let x = 0; x <= W; x += bub) {
      const seed = Math.sin(x * 12.9898) * 43758.5453, rnd = seed - Math.floor(seed);
      const y = beach.edge(x) + (5 + rnd * 12) * u + Math.sin(t * 0.8 + x * 0.05) * 2 * u, R = (0.9 + rnd * 2.2) * u;
      ctx.globalAlpha = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.3 + rnd * 9));
      ctx.beginPath(); ctx.arc(x + rnd * bub, y, R, 0, 6.29); ctx.fill();
    }
    // 반짝이는 햇빛 (작은 별빛)
    for (const s of this.sparkles) {
      const top = beach.edge(s.x) + 20 * u, y = top + s.y * (H - top);
      const a = Math.max(0, Math.sin(t * 1.6 + s.ph)) * 0.75;
      if (a < 0.05) continue;
      ctx.globalAlpha = a; ctx.fillStyle = PAL.glint;
      ctx.beginPath(); ctx.arc(s.x, y, s.s * u, 0, 6.29); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawRocks(ctx, beach) {
    const { u, t } = beach;
    for (const rk of this.rocks) {
      const y = beach.edge(rk.x) + rk.d * u;
      ctx.save();
      ctx.translate(rk.x, y);
      ctx.globalAlpha = 0.75 - rk.depth * 0.3;
      ctx.fillStyle = PAL.rockWet;
      ctx.beginPath(); rk.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill();
      ctx.globalAlpha *= 0.6; ctx.fillStyle = PAL.rock;
      ctx.beginPath(); rk.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * 0.6 - rk.R * 0.15, py * 0.6 - rk.R * 0.15) : ctx.moveTo(px * 0.6 - rk.R * 0.15, py * 0.6 - rk.R * 0.15))); ctx.closePath(); ctx.fill();
      if (rk.depth < 0.25) {   // 얕은 바위 둘레의 거품 고리
        ctx.globalAlpha = 0.55; ctx.strokeStyle = PAL.foam; ctx.lineWidth = 1.4 * u;
        ctx.beginPath(); ctx.ellipse(0, 0, rk.R * (1.25 + 0.08 * Math.sin(t * 1.2 + rk.x)), rk.R * 0.9, 0, 0, 6.29); ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function smoothFill(ctx, pts) {
  const n = pts.length;
  ctx.beginPath();
  ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
  for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  ctx.fill();
}
