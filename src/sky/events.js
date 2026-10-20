// sky/events.js — v23 가끔만 보이는 하늘: 별똥별 · 무지개
//
//  별똥별: 맑은 밤(구름·비·안개 없음)에만, 기본 35~110초에 한 번 화면을 비스듬히 가로지른다 (1초 남짓).
//          지나가는 동안 머리 근처를 누르면 hit() 가 참 — main.js 가 키위들을 하늘 보게 한다(연결 단계).
//  무지개: 비(보슬비 포함)가 그친 순간이 낮이면 바다 위에 75초쯤 떴다가 사라진다. 밤이 되면 빨리 걷힌다.
//  둘 다 atmos.js 가 갖고 update/draw 를 부른다.

import { clamp } from '../util.js?v=v27.4.0';

export class Meteors {
  constructor({ rand = Math.random, first = 20, gap = [35, 110] } = {}) {
    this.rand = rand; this.gap = gap; this.list = []; this.t = 0; this.next = first;
  }
  can(v, night) {
    return night > 0.7 && v.cloud < 0.3 && v.rain < 0.05 && (v.drizzle || 0) < 0.05 && v.fog < 0.2 && v.snow < 0.3;
  }
  // 이번 프레임에 하나 떨어졌으면 그 별똥별을 돌려준다
  update(dt, beach, v, night) {
    this.t += dt;
    for (const m of this.list) m.age += dt;
    this.list = this.list.filter(m => m.age < m.life);
    if (!this.can(v, night)) { this.next = Math.max(this.next, this.t + 8); return null; }   // 맑아진 직후엔 조금 기다렸다가
    if (this.t < this.next) return null;
    this.next = this.t + this.gap[0] + this.rand() * (this.gap[1] - this.gap[0]);
    return this.spawn(beach);
  }
  spawn(beach) {
    const R = this.rand, W = beach.W, H = beach.H, L = Math.min(W, H) * (0.4 + R() * 0.2);
    const dir = R() < 0.5 ? 1 : -1, ang = (0.32 + R() * 0.28) * dir;   // 오른쪽 아래 또는 왼쪽 아래로
    const m = { x: W * (0.15 + R() * 0.7), y: H * (0.04 + R() * 0.4), dx: Math.sin(ang) * L, dy: Math.cos(ang) * L * 0.55, age: 0, life: 0.9 + R() * 0.5 };
    this.list.push(m);
    return m;
  }
  head(m) { const p = this.ease(m.age / m.life); return [m.x + m.dx * p, m.y + m.dy * p]; }
  ease(k) { return 1 - Math.pow(1 - clamp(k, 0, 1), 2); }
  hit(x, y, u = 1) {
    return this.list.some(m => { const [hx, hy] = this.head(m); return Math.hypot(hx - x, hy - y) < 70 * u; });
  }
  draw(ctx, beach) {
    if (!this.list.length) return;
    const u = beach.u;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const m of this.list) {
      const k = m.age / m.life, a = Math.sin(Math.PI * clamp(k, 0, 1));   // 켜졌다 꺼진다
      const [hx, hy] = this.head(m), tail = 0.55, p0 = Math.max(0, this.ease(k) - tail);
      const tx = m.x + m.dx * p0, ty = m.y + m.dy * p0;
      const g = ctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, 'rgba(200,220,255,0)'); g.addColorStop(1, `rgba(255,250,235,${0.85 * a})`);
      ctx.strokeStyle = g; ctx.lineWidth = Math.max(2, 3.2 * u);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.lineWidth = Math.max(1, 1.2 * u); ctx.stroke();   // 가운데 밝은 심
      const r = 16 * u, gl = ctx.createRadialGradient(hx, hy, 0, hx, hy, r);
      gl.addColorStop(0, `rgba(255,252,240,${0.9 * a})`); gl.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(hx - r, hy - r, r * 2, r * 2);
    }
    ctx.restore();
  }
}

const wet = w => w === 'rain' || w === 'drizzle';
const BANDS = ['#ff6b5e', '#ffa64d', '#ffe46b', '#86d98f', '#62c3ee', '#7387e6', '#b08ad0'];   // 바깥(빨강) → 안(보라)

export class Rainbow {
  constructor() { this.age = -1; this.life = 0; }
  get on() { return this.age >= 0; }
  weatherChanged(prev, next, night) { if (wet(prev) && !wet(next) && night < 0.5) this.start(); }
  start(life = 75) { this.age = 0; this.life = life; }
  update(dt, night) {
    if (this.age < 0) return;
    this.age += dt * (night > 0.6 ? 6 : 1);   // 저물면 빨리 걷힌다
    if (this.age > this.life) this.age = -1;
  }
  get alpha() { return this.age < 0 ? 0 : clamp(Math.min(this.age / 6, (this.life - this.age) / 10), 0, 1); }
  // 바다 위에 걸치는 큰 호: 꼭대기는 물가 조금 아래, 양 끝은 화면 아래로.
  //  띠를 한 번에 따로 그려(반 해상도·살짝 흐리게) 두고 매 프레임 투명도만 바꿔 얹는다 — 조각으로 그리면 이음새 줄이 보였다
  draw(ctx, beach) {
    const a = this.alpha;
    if (a <= 0.01) return;
    const W = beach.W, H = beach.H, shore = Number.isFinite(beach.shoreY) ? beach.shoreY : H * 0.6;
    const key = `${W}x${H}x${Math.round(shore)}`;
    if (this.key !== key) { this.key = key; this.img = this.paint(W, H, shore); }
    if (!this.img) return;
    ctx.save(); ctx.globalAlpha = a; ctx.drawImage(this.img, 0, 0, W, H); ctx.restore();
  }
  paint(W, H, shore) {
    if (typeof document === 'undefined') return null;
    const k = 0.5, cv = document.createElement('canvas'); cv.width = Math.ceil(W * k); cv.height = Math.ceil(H * k);
    const g = cv.getContext('2d'); g.scale(k, k);
    const top = shore + (H - shore) * 0.1, R = Math.max(W * 0.62, (H - top) * 0.9), cx = W * 0.5, cy = top + R;
    const band = Math.max(4, R * 0.016);
    g.filter = `blur(${Math.max(1, band * 0.35)}px)`;
    g.globalAlpha = 0.42;
    BANDS.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = band; g.beginPath(); g.arc(cx, cy, R - (i + 0.5) * band, Math.PI, Math.PI * 2); g.stroke(); });
    // 양 끝은 옅게: 가운데만 남기는 가로 그라데이션으로 깎는다
    g.filter = 'none'; g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in';
    const fade = g.createLinearGradient(cx - R, 0, cx + R, 0);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.22, 'rgba(0,0,0,0.85)'); fade.addColorStop(0.5, 'rgba(0,0,0,1)'); fade.addColorStop(0.78, 'rgba(0,0,0,0.85)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade; g.fillRect(0, 0, W, H);
    return cv;
  }
}
