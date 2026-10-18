// sky/kiwi-react.js — v23 날씨에 반응하는 키위
//
//  비(보슬비는 약하게): 키위마다 성격이 있어 절반쯤은 큰 잎을 우산처럼 펴 들고, 나머지는 가끔 한 마리씩 덤불 밑으로 비를 피하러 간다.
//                     그치면 잎을 접는다.
//  바람(꽃잎 바람도 약하게): 키위마다 다른 박자로 바람 쪽(오른쪽)으로 기우뚱, 가끔 센 돌풍에 크게 휘청 · 깃털이 한 올씩 날아간다.
//  main.js 는 매 프레임 update(dt, kiwis, atmos.v, beach) 를 부르고, 그릴 때 drawLeaning(ctx, k, () => k.draw(ctx)) 로 감싸고
//  drawUmbrella(ctx, k) · drawFeathers(ctx, u) 를 키위 위에 얹는다. 키위 그림(kiwi.js)은 건드리지 않는다.

import { clamp } from '../util.js?v=v23.1.0';

export const UMB_SHARE = 0.45;   // 우산을 드는 성격의 비율
const approach = (a, b, d) => (a < b ? Math.min(b, a + d) : Math.max(b, a - d));

export class KiwiWeather {
  constructor({ rand = Math.random } = {}) { this.rand = rand; this.feathers = []; this.t = 0; this.shelterAt = 4; }
  static wetness(v) { return clamp((v.rain || 0) + (v.drizzle || 0) * 0.6, 0, 1); }
  static windiness(v) { return clamp((v.wind || 0) + (v.blossom || 0) * 0.5, 0, 1); }

  update(dt, kiwis, v, beach) {
    this.t += dt;
    const wet = KiwiWeather.wetness(v), wind = KiwiWeather.windiness(v), u = beach.u || 1, R = this.rand;
    for (const k of kiwis) {
      if (k.gone) continue;
      if (k.umbPick == null) k.umbPick = R();
      const want = wet > 0.35 && k.umbPick < UMB_SHARE && !k.asleep;
      k.umb = approach(k.umb || 0, want ? 1 : 0, dt * (want ? 1.4 : 2));
      // 기우뚱: 잔 흔들림 + 키위마다 다른 때 오는 돌풍(세제곱이라 가끔만 크게)
      const gust = Math.pow(Math.max(0, Math.sin(this.t * 0.55 + k.id * 1.7)), 3);
      const goal = k.asleep ? 0 : wind * (0.045 * Math.sin(this.t * 3.1 + k.id) + 0.17 * gust);
      k.lean = (k.lean || 0) + (goal - (k.lean || 0)) * Math.min(1, dt * 5);
      if (wind > 0.3 && !k.asleep && (k.vis ?? 1) > 0.9 && gust > 0.5 && R() < dt * 0.6 * wind) {
        this.feathers.push({ x: k.x - 0.1 * k.k, y: k.y - 0.45 * k.k, vx: (40 + R() * 40) * u, vy: (-20 - R() * 25) * u, rot: R() * 6, spin: (R() - 0.5) * 5, age: 0, life: 2.2 + R(), s: 0.09 * k.k });
      }
    }
    // 비 피하기: 우산이 없는 성격의 한가한 키위를 몇 초에 하나씩 숲 가장자리(덤불 밑)로
    if (wet > 0.35 && this.t >= this.shelterAt && beach.grass) {
      this.shelterAt = this.t + 6 + R() * 8;
      const c = kiwis.filter(k => !k.gone && !k.job && !k.focus && !k.asleep && (k.state === 'idle' || k.state === 'free') && k.umbPick >= UMB_SHARE && !k.sheltered);
      if (c.length) {
        const k = c[Math.floor(R() * c.length)], x = clamp(k.x + (R() - 0.5) * 120 * u, 30, beach.W - 30);
        k.sheltered = true; k.wanderTo(x, beach.grass(x) + (6 + R() * 10) * u);
      }
    }
    if (wet < 0.2) for (const k of kiwis) k.sheltered = false;
    for (const f of this.feathers) { f.age += dt; f.x += (f.vx + wind * 60 * u) * dt; f.y += (f.vy + Math.sin(f.age * 4) * 18 * u) * dt; f.vy += 14 * u * dt; f.rot += f.spin * dt; }
    this.feathers = this.feathers.filter(f => f.age < f.life);
  }

  // 발밑을 축으로 기울여 그린다
  drawLeaning(ctx, k, draw) {
    const a = k.lean || 0;
    if (Math.abs(a) < 0.003) { draw(); return; }
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(a); ctx.translate(-k.x, -k.y); draw(); ctx.restore();
  }

  // 잎 우산: 부리 쪽에서 올라온 줄기 끝에 큰 잎 — 펼 때 커지며 나타난다
  drawUmbrella(ctx, k) {
    const m = k.umb || 0;
    if (m < 0.02 || k.vis === 0 || k.asleep) return;
    const s = k.k, f = k.face || 1, open = 0.45 + 0.55 * m;
    const bob = Math.sin((k.clock || 0) * 2.2 + k.id) * 0.01 * s;
    ctx.save();
    ctx.globalAlpha = m * (k.vis ?? 1);
    ctx.translate(k.x, k.y - (k.hopY ? k.hopY() : 0) + bob);
    ctx.rotate((k.lean || 0) * 1.4);
    ctx.scale(f, 1);
    const sx = 0.3 * s, sy = -0.5 * s, lx = 0.04 * s, ly = -1.02 * s;   // 줄기 아래(부리 근처) → 잎 가운데
    ctx.strokeStyle = '#4a6b2e'; ctx.lineWidth = Math.max(1, 0.03 * s); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 0.02 * s, (sy + ly) / 2, lx + 0.08 * s, ly + 0.08 * s); ctx.stroke();
    ctx.translate(lx, ly); ctx.rotate(-0.12); ctx.scale(open, open);
    const w = 0.56 * s, h = 0.22 * s;
    ctx.fillStyle = '#5c9a42';
    ctx.beginPath(); ctx.moveTo(-w, h * 0.35); ctx.quadraticCurveTo(-w * 0.2, -h * 1.5, w, h * 0.1); ctx.quadraticCurveTo(0, h * 0.95, -w, h * 0.35); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.moveTo(-w * 0.7, h * 0.05); ctx.quadraticCurveTo(-w * 0.1, -h * 1.05, w * 0.7, -h * 0.05); ctx.quadraticCurveTo(0, -h * 0.35, -w * 0.7, h * 0.05); ctx.fill();
    ctx.strokeStyle = '#3c6a2a'; ctx.lineWidth = Math.max(0.8, 0.018 * s);
    ctx.beginPath(); ctx.moveTo(-w * 0.9, h * 0.33); ctx.quadraticCurveTo(0, -h * 0.4, w * 0.92, h * 0.1); ctx.stroke();
    ctx.restore();
  }

  drawFeathers(ctx) {
    if (!this.feathers.length) return;
    ctx.save();
    for (const f of this.feathers) {
      ctx.globalAlpha = Math.min(1, (f.life - f.age) / 0.6);
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.fillStyle = '#7a5532';
      ctx.beginPath(); ctx.ellipse(0, 0, f.s, f.s * 0.28, 0, 0, 6.29); ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,20,0.6)'; ctx.lineWidth = Math.max(0.5, f.s * 0.08);
      ctx.beginPath(); ctx.moveTo(-f.s * 1.2, 0); ctx.lineTo(f.s, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}
