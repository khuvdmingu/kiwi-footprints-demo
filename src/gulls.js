// gulls.js — 바다 위를 천천히 가로지르는 갈매기
//  v8: 몸은 그림(assets/gull.webp, 위에서 본 갈매기 — 사용자 그림과 같은 붓 그림체)을 돌려 쓴다.
//      날갯짓은 날개 방향으로 그림을 접었다 펴는 것, 물 위에는 흐린 그림자가 빛 방향으로 비켜 따라간다.
//  한두 마리가 바다 위를 지나가고, 다 지나가면 잠시 뒤 다시 온다. 지나갈 때 가끔 운다(onCall).

import { LIGHT, MOTION } from './tokens.js?v=v16.2.2';

const HEAD = 0.654;      // 그림 속 갈매기가 향한 각 (오른쪽 위로 −0.654 rad) → 이만큼 돌리면 오른쪽을 본다
const PIVOT = [0.478, 0.488];

export class Gulls {
  constructor() { this.list = []; this.next = 3; this.t = 0; this.img = null; }
  setSprite(img) { this.img = img; }
  resize(beach) { this.list = []; this.next = 2; }

  update(dt, beach, onCall) {
    this.t += dt;
    const { W, H, u } = beach;
    for (const g of this.list) {
      g.x += g.vx * dt; g.y += Math.sin(this.t * 0.4 + g.ph) * 6 * u * dt;
      g.flap += dt * (Math.sin(this.t * 0.3 + g.ph) > 0.1 ? 4.2 : 0);   // 퍼덕이다 미끄러진다
      if (!g.called && Math.random() < dt * 0.06) { g.called = true; onCall && onCall(g.x); }
    }
    this.list = this.list.filter(g => g.x > -120 * u && g.x < W + 120 * u);
    if (this.t > this.next && this.list.length < 2) {
      this.next = this.t + 9 + Math.random() * 14;
      const dir = Math.random() < 0.5 ? 1 : -1, n = Math.random() < 0.5 ? 2 : 1;
      const top = beach.shoreY + 70 * u, y0 = top + Math.random() * Math.max(10, H - top - 80 * u);
      for (let i = 0; i < n; i++) this.list.push({ x: dir > 0 ? -90 * u - i * 70 * u : W + 90 * u + i * 70 * u, y: Math.min(H - 40 * u, y0 + i * 55 * u), vx: dir * MOTION.gull * u * (0.9 + Math.random() * 0.25), flap: Math.random() * 6, ph: Math.random() * 6, s: (62 + Math.random() * 14) * u, tilt: (Math.random() - 0.5) * 0.5, called: false });
    }
  }

  draw(ctx, beach) {
    if (!this.img) return;
    const [lx, ly] = LIGHT.dir, u = beach.u, im = this.img;
    for (const g of this.list) {
      const fold = 0.62 + 0.38 * Math.abs(Math.cos(g.flap));   // 날개를 접었다 편다
      const head = (g.vx > 0 ? 0 : Math.PI) + g.tilt * 0.3 + Math.sin(this.t * 0.5 + g.ph) * 0.08;
      const one = (x, y, shadow) => {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(head); ctx.scale(1, fold); ctx.rotate(HEAD);
        if (shadow) { ctx.globalAlpha = 0.16; ctx.filter = `brightness(0) blur(${(2.5 * u).toFixed(1)}px)`; }
        ctx.drawImage(im, -PIVOT[0] * g.s, -PIVOT[1] * g.s, g.s, g.s);
        ctx.restore();
      };
      one(g.x + lx * 30 * u, g.y + ly * 40 * u, true);
      one(g.x, g.y, false);
    }
  }
}
