// sky/place-weather.js — v30.31 물가 두 곳의 장소 날씨 (2026-10-25 Codex `feature/map-weather` 를 최신 판에 맞춰 되살림)
//  · 수국 꽃해변: 비·보슬비가 오면 숲 가장자리 잎 끝에서 물방울이 떨어진다
//  · 대나무 작은 만: 잎 천장에 옅은 안개가 흐르고(비·안개일수록 짙게), 젖으면 물방울이 떨어진다
//  옛 판의 나머지는 이미 다른 곳에 있어 뺐다 — 온천 수증기는 sky/extra.js 「김 바람」, 라벤더 꽃가루는 「라벤더 꽃잎」,
//  물 위 빗방울 고리는 atmos.js 비(모든 장소), 한강 버들솜은 sky/drift.js 홀씨·버들솜 층으로 옮김 (docs/PLACE_WEATHER.md).
//  고른 날씨는 바꾸지 않는다 — 이 효과는 지금 날씨를 따라 덧붙기만 한다.
import { clamp } from '../util.js?v=pv-b0a0e55';

export const PLACE_WEATHER = Object.freeze({ 'hydrangea-cove': 'leaf-drip', 'bamboo-bay': 'bamboo-mist' });
const TAU = Math.PI * 2;

export class PlaceWeather {
  constructor(rand = Math.random) {
    this.rand = rand; this.map = ''; this.size = ''; this.t = 0;
    this.particles = []; this.credit = 0; this.strength = 0;
  }
  update(dt, b, v, map, night = 0) {
    const size = `${b.W}/${b.H}/${b.u}`;
    if (map !== this.map || size !== this.size) {   // 장소가 바뀌거나 화면이 돌면 옛 좌표를 버린다
      this.particles.length = 0; this.credit = 0; this.strength = 0;
      this.map = map; this.size = size;
    }
    const kind = PLACE_WEATHER[map];
    if (!kind || !(b.W > 0 && b.H > 0 && b.u > 0) || typeof b.grass !== 'function') return;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1); this.t += dt;
    const wet = clamp(Math.max(v.rain || 0, v.drizzle || 0), 0, 1);
    const snow = clamp(v.snow || 0, 0, 1), wind = clamp(v.wind || 0, 0, 1), fog = clamp(v.fog || 0, 0, 1);
    const target = kind === 'leaf-drip' ? wet * (1 - snow) : (0.4 + 0.6 * Math.max(wet, fog)) * (1 - snow * 0.7);
    this.strength += (target - this.strength) * Math.min(1, dt * 1.8);
    const density = clamp(Math.sqrt(b.W * b.H / 600000), 0.6, 1.8);
    const rate = kind === 'leaf-drip' ? 5 : 1.8;
    this.credit = Math.min(2, this.credit + dt * rate * density * this.strength);
    while (this.credit >= 1 && this.particles.length < 64) { this.credit--; this.spawn(kind, b, wet, wind); }
    for (const p of this.particles) {
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'bamboo-mist') p.x += Math.sin(this.t * 1.2 + p.phase) * b.u * dt * 3;
    }
    this.particles = this.particles.filter(p => p.age < p.life && p.x > -100 * b.u && p.x < b.W + 100 * b.u);
  }
  spawn(kind, b, wet, wind) {
    const R = this.rand, u = b.u, x = R() * b.W, grass = b.grass(x);
    if (!Number.isFinite(grass)) return;
    const drip = { kind: 'drip', x, y: grass - 30 * u, age: 0, life: 1.1, vx: 0, vy: 100 * u, r: 2 * u, phase: R() * TAU };
    if (kind === 'leaf-drip') { this.particles.push(drip); return; }
    if (wet > 0.15 && R() < wet * 0.65) { this.particles.push(drip); return; }
    this.particles.push({ kind: 'bamboo-mist', x, y: grass - (10 + R() * 65) * u, age: 0, life: 6 + R() * 3,
      vx: (5 + wind * 12) * u, vy: -u, r: (55 + R() * 60) * u, phase: R() * TAU });
  }
  get busy() { return this.particles.length > 0; }
  // 숲 가장자리 위쪽(잎 천장)만 — 그때그때의 숲 줄을 따른다
  clip(ctx, b) {
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let x = 0; x < b.W + 16; x += 16) { const xx = Math.min(x, b.W); ctx.lineTo(xx, b.grass(xx) + 6 * b.u); }
    ctx.lineTo(b.W, 0); ctx.closePath(); ctx.clip();
  }
  draw(ctx, b) {
    if (!this.busy) return;
    ctx.save(); this.clip(ctx, b);
    for (const p of this.particles) {
      const k = p.age / p.life, fade = Math.sin(Math.PI * k) * this.strength;
      if (fade < 0.005) continue;
      if (p.kind === 'bamboo-mist') {
        const r = p.r * (0.6 + k * 0.9);
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1.9, 0.65);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, `rgba(231,244,238,${fade * 0.16})`);
        g.addColorStop(0.6, `rgba(231,244,238,${fade * 0.06})`);
        g.addColorStop(1, 'rgba(231,244,238,0)');
        ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
      } else {
        ctx.strokeStyle = `rgba(220,240,244,${fade * 0.8})`;
        ctx.lineWidth = Math.max(0.8, b.u); ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + b.u, p.y + 8 * b.u); ctx.stroke();
      }
    }
    ctx.restore();
  }
}
