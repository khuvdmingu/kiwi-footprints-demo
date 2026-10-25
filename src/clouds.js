// clouds.js — v6 구름: 셀 구름 대신 부드러운 빛안개 덩어리 + 오른쪽 아래로 길게 드리우는 그림자 (Canvas 2D)
//  천천히 흘러가고, 누르면 덩어리가 작은 조각으로 흩어져 사라졌다가 화면 왼쪽에서 새로 생긴다.
//  amount(0~1)·windK 는 날씨가 정한다.

import { PAL, LIGHT, MOTION } from './tokens.js?v=v29.14.0';

export class Clouds {
  constructor() { this.list = []; this.bits = []; this.amount = 0.24; this.windK = 1; this.t = 0; }

  resize(W, H, u) {
    Object.assign(this, { W, H, u });
    this.list = [];
    for (let i = 0; i < this.target(); i++) this.list.push(this.make(Math.random() * W));
  }
  target() { return Math.round(this.amount * 8); }   // 맑은 날은 0~1 개

  make(x) {
    const { H, u } = this, R = (50 + Math.random() * 50) * u;
    const puffs = Array.from({ length: 4 + Math.floor(Math.random() * 3) }, (_, i) => ({ dx: (i - 2) * R * 0.55 + (Math.random() - 0.5) * R * 0.4, dy: (Math.random() - 0.5) * R * 0.5, r: R * (0.55 + Math.random() * 0.45) }));
    return { x, y: Math.random() * H * 0.95, puffs, a: 0, sp: (0.7 + Math.random() * 0.6) };
  }

  update(dt) {
    this.t += dt;
    const { W, u } = this, v = MOTION.cloudDrift * u * this.windK;
    for (const c of this.list) { c.x += v * c.sp * dt; c.a = Math.min(1, c.a + dt * 0.25); }
    this.list = this.list.filter(c => c.x - 200 * u < W);
    while (this.list.length < this.target()) this.list.push(this.make(-160 * u - Math.random() * 120 * u));
    for (const b of this.bits) { b.x += (b.vx + v) * dt; b.y += b.vy * dt; b.vx *= 0.985; b.vy *= 0.985; b.age += dt; }
    this.bits = this.bits.filter(b => b.age < b.life);
  }

  hit(x, y) {
    return this.list.find(c => c.puffs.some(p => Math.hypot(x - (c.x + p.dx), y - (c.y + p.dy)) < p.r * 0.75));
  }
  // 누른 자리에서 바깥으로 흩어진다
  scatter(c, x, y) {
    const { u } = this;
    for (const p of c.puffs) for (let k = 0; k < 3; k++) {
      const px = c.x + p.dx + (Math.random() - 0.5) * p.r * 0.6, py = c.y + p.dy + (Math.random() - 0.5) * p.r * 0.6;
      const dx = px - x, dy = py - y, d = Math.hypot(dx, dy) || 1, s = (30 + Math.random() * 50) * u;
      this.bits.push({ x: px, y: py, r: p.r * (0.35 + Math.random() * 0.25), vx: (dx / d) * s, vy: (dy / d) * s, age: 0, life: 2.4 + Math.random() * 1.6, a: c.a });
    }
    this.list.splice(this.list.indexOf(c), 1);
  }

  draw(ctx) {
    const { u } = this, [lx, ly] = LIGHT.dir, off = 90 * u * LIGHT.long;
    const puff = (x, y, r, rgba) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(1)); g.addColorStop(0.6, rgba(0.55)); g.addColorStop(1, rgba(0));
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const shade = a => k => `rgba(${PAL.shadow},${0.12 * a * k})`;
    const mist = a => k => `rgba(255,244,224,${0.3 * a * k})`;
    // 그림자 먼저 (길게: 빛 방향으로 비켜서 조금 늘린다)
    for (const c of this.list) for (const p of c.puffs) puff(c.x + p.dx + lx * off, c.y + p.dy + ly * off, p.r * 1.15, shade(c.a));
    for (const b of this.bits) { const k = 1 - b.age / b.life; puff(b.x + lx * off, b.y + ly * off, b.r, shade(b.a * k)); }
    for (const c of this.list) for (const p of c.puffs) puff(c.x + p.dx, c.y + p.dy, p.r, mist(c.a));
    for (const b of this.bits) { const k = 1 - b.age / b.life; puff(b.x, b.y, b.r * (1 + (1 - k) * 0.4), mist(b.a * k)); }
  }
}
