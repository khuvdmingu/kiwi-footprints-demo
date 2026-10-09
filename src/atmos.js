// atmos.js — 하루의 빛(시계)과 날씨
//
//  시간 빛: 실제 시각(또는 ?hour=)에 따라 장면 전체에 곱해지는 색(#tint, mix-blend-mode: multiply).
//           새벽 분홍 → 아침 살구 → 낮 그대로 → 노을 주황 → 해 질 녘 보라 → 밤 푸른 어둠. night 0~1 은 반딧불이·야광·귀뚜라미의 세기.
//  날씨: 맑음 · 흐림 · 비 · 눈 · 안개 · 바람. 바꾸면 값이 몇 초에 걸쳐 부드럽게 넘어간다.
//        구름 양·흐름 속도·파도 높이는 셰이더/해변에 넘기고, 빗줄기·물방울 고리·눈송이·나뭇잎·안개·반딧불이·야광은 여기서 #fx 캔버스에 그린다.
//        눈은 시간이 지날수록 땅(셰이더 uSnow)과 나무에 쌓이고, 그치면 천천히 녹는다.

import { clamp, lerp } from './util.js?v=v10.0.1';

export const WEATHERS = ['clear', 'cloudy', 'rain', 'snow', 'fog', 'wind'];
export const WEATHER_NAME = { clear: '맑음', cloudy: '흐림', rain: '비', snow: '눈', fog: '안개', wind: '바람' };
const PARAM = {
  clear: { cloud: 0.06, windK: 1, amp: 1, rain: 0, snow: 0, fog: 0, wind: 0, grey: 0 },
  cloudy: { cloud: 0.6, windK: 1.3, amp: 1.1, rain: 0, snow: 0, fog: 0, wind: 0.15, grey: 0.35 },
  rain: { cloud: 0.72, windK: 1.6, amp: 1.25, rain: 1, snow: 0, fog: 0.1, wind: 0.3, grey: 0.7 },
  snow: { cloud: 0.5, windK: 0.6, amp: 0.85, rain: 0, snow: 1, fog: 0.15, wind: 0.05, grey: 0.25 },
  fog: { cloud: 0.15, windK: 0.5, amp: 0.8, rain: 0, snow: 0, fog: 1, wind: 0, grey: 0.3 },
  wind: { cloud: 0.35, windK: 3.4, amp: 1.65, rain: 0, snow: 0, fog: 0, wind: 1, grey: 0.1 },
};

// 시각 → 곱하는 색, 밤 정도 (사이는 보간)
const KEYS = [
  [0, [116, 132, 184], 1], [4.5, [122, 134, 182], 1], [5.5, [201, 178, 196], 0.5], [6.5, [243, 220, 203], 0.1],
  [8, [255, 255, 255], 0], [16.5, [255, 255, 255], 0], [17.5, [250, 236, 222], 0], [18.5, [236, 214, 206], 0.15],   // v6: 모래가 이미 금빛이라 노을은 살짝만
  [19.3, [176, 172, 202], 0.6], [20.3, [118, 134, 184], 1], [24, [116, 132, 184], 1],
];
export function timeLight(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const [h0, c0, n0] = KEYS[i], [h1, c1, n1] = KEYS[i + 1];
  const t = clamp((h - h0) / (h1 - h0), 0, 1);
  return { tint: c0.map((v, j) => lerp(v, c1[j], t)), night: lerp(n0, n1, t) };
}

export class Atmos {
  constructor(weather = 'clear') {
    this.weather = WEATHERS.includes(weather) ? weather : 'clear';
    this.v = { ...PARAM[this.weather] };
    this.night = 0;
    this.tint = [255, 255, 255];
    this.drops = []; this.rings = []; this.flakes = []; this.leaves = []; this.fogs = []; this.flies = []; this.plankton = [];
    this.t = 0;
  }
  setWeather(w) { this.weather = w; }
  get cloud() { return this.v.cloud; }
  get windK() { return this.v.windK; }

  update(dt, beach, hour) {
    this.t += dt;
    const target = PARAM[this.weather], f = Math.min(1, dt * 0.6);
    for (const k in this.v) this.v[k] = lerp(this.v[k], target[k], f);
    const L = timeLight(hour);
    this.night = L.night;
    // 날씨가 색을 조금 바꾼다: 흐리고 비 오면 회청색으로, 눈 오면 차갑고 밝게
    const grey = [206, 212, 222], cool = [236, 242, 252];
    const wet = [176, 188, 204];   // 비: 회청색으로 한 번 더 누른다 (밝은 한낮 그림이 맑은 날처럼 보이지 않게)
    this.tint = L.tint.map((c, i) => c * lerp(1, grey[i] / 255, this.v.grey) * lerp(1, wet[i] / 255, this.v.rain) * lerp(1, cool[i] / 255, this.v.snow * 0.6));
    beach.amp = this.v.amp;
    beach.snow = clamp(beach.snow + (this.v.snow > 0.5 ? dt / 45 : -dt / 30), 0, 1);

    const W = beach.W, H = beach.H, u = beach.u, area = (W * H) / 1e6;
    // 비: 짧은 빗줄기 → 떨어진 자리에 고리
    const nRain = this.v.rain * 260 * area * dt * 10;
    for (let i = 0; i < nRain; i++) if (Math.random() < 0.1) { const x = Math.random() * W, y = Math.random() * H; this.drops.push({ x, y, life: 0.26 + Math.random() * 0.14, age: 0, len: (16 + Math.random() * 10) * u, water: y > beach.edge(x) }); }
    for (const d of this.drops) {
      d.age += dt;
      if (d.age >= d.life && !d.done) { d.done = true; this.rings.push({ x: d.x + d.len * 0.4, y: d.y + d.len, age: 0, water: d.y + d.len > beach.edge(d.x) }); }
    }
    this.drops = this.drops.filter(d => !d.done);
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter(r => r.age < 0.9);
    // 눈송이: 천천히 흩날린다
    const nSnow = Math.round(this.v.snow * 170 * area);
    while (this.flakes.length < nSnow) this.flakes.push({ x: Math.random() * W, y: Math.random() * H, r: (1.4 + Math.random() * 2.2) * u, ph: Math.random() * 6.28, sp: (10 + Math.random() * 14) * u });
    if (this.flakes.length > nSnow) this.flakes.length = nSnow;
    for (const s of this.flakes) {
      s.y += s.sp * dt; s.x += (Math.sin(this.t * 0.8 + s.ph) * 12 + this.v.wind * 40) * u * dt;
      if (s.y > H + 5) { s.y = -5; s.x = Math.random() * W; }
      if (s.x > W + 5) s.x = -5;
    }
    // 나뭇잎: 바람 부는 날
    const nLeaf = Math.round(this.v.wind * 26 * Math.sqrt(area * 2));
    while (this.leaves.length < nLeaf) this.leaves.push({ x: -20 - Math.random() * W * 0.5, y: Math.random() * H, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 6, sp: (90 + Math.random() * 90) * u, c: Math.random() < 0.6 ? '#5E7F68' : '#D9A960', s: (4 + Math.random() * 3) * u });
    if (this.leaves.length > nLeaf) this.leaves.length = nLeaf;
    for (const l of this.leaves) {
      l.x += l.sp * dt; l.y += Math.sin(this.t * 2 + l.rot) * 20 * u * dt; l.rot += l.spin * dt;
      if (l.x > W + 20) { l.x = -20; l.y = Math.random() * H; }
    }
    // 안개 덩어리
    const nFog = Math.round(this.v.fog * 9);
    while (this.fogs.length < nFog) this.fogs.push({ x: Math.random() * W, y: Math.random() * H, r: (0.25 + Math.random() * 0.2) * Math.max(W, H), sp: (6 + Math.random() * 8) * u });
    if (this.fogs.length > nFog) this.fogs.length = nFog;
    for (const g of this.fogs) { g.x += g.sp * dt; if (g.x - g.r > W) g.x = -g.r; }
    // 밤: 반딧불이(풀밭 가장자리 둘레) · 야광 플랑크톤(물가)
    const glowOK = this.night * (1 - this.v.rain) * (1 - this.v.snow);
    const nFly = Math.round(glowOK * 16);
    while (this.flies.length < nFly) {
      const x = Math.random() * W;
      this.flies.push({ x, y: beach.grass(x) + (Math.random() - 0.3) * 120 * u, ph: Math.random() * 6.28, vx: 0, vy: 0 });
    }
    if (this.flies.length > nFly) this.flies.length = nFly;
    for (const fl of this.flies) {
      fl.vx += (Math.random() - 0.5) * 60 * u * dt; fl.vy += (Math.random() - 0.5) * 60 * u * dt;
      fl.vx *= 0.97; fl.vy *= 0.97;
      fl.x = clamp(fl.x + fl.vx * dt, 0, W); fl.y = clamp(fl.y + fl.vy * dt, beach.bushY - 90 * u, beach.shoreY - 40 * u);
    }
    if (glowOK > 0.3 && Math.random() < dt * 30 * glowOK) {
      const x = Math.random() * W;
      this.plankton.push({ x, y: beach.edge(x) + Math.random() * 14 * u, age: 0, life: 1 + Math.random() * 1.5 });
    }
    for (const p of this.plankton) p.age += dt;
    this.plankton = this.plankton.filter(p => p.age < p.life);
  }

  tintCSS() {
    const [r, g, b] = this.tint.map(Math.round);
    const c = `rgb(${r},${g},${b})`;
    // 밤에는 가운데를 조금 밝게 (달빛)
    const lift = this.night * 0.18, [r2, g2, b2] = [r, g, b].map(v => Math.round(v + (255 - v) * lift));
    return `radial-gradient(ellipse 80% 70% at 55% 45%, rgb(${r2},${g2},${b2}), ${c})`;
  }

  // #fx 캔버스 (시간 빛 위에 그린다 — 빛나는 것들이 어둡게 눌리지 않게)
  draw(ctx, beach) {
    const u = beach.u, W = beach.W, H = beach.H;
    ctx.save();
    // 안개: 전체에 옅은 흰 막 + 흘러가는 덩어리
    if (this.v.fog > 0.01) {
      ctx.fillStyle = `rgba(236,238,240,${0.16 * this.v.fog})`;
      ctx.fillRect(0, 0, W, H);
      for (const g of this.fogs) {
        const gr = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
        gr.addColorStop(0, `rgba(240,242,244,${0.34 * this.v.fog})`);
        gr.addColorStop(1, 'rgba(240,242,244,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
      }
    }
    // 빗줄기 · 물방울 고리
    if (this.drops.length || this.rings.length) {
      // 빗줄기: 비스듬히 떨어지며 부드럽게 나타났다 사라진다 (물 위 파문은 water.js 셰이더가 그린다)
      ctx.lineWidth = Math.max(1, 1.2 * u);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgb(232,238,244)';
      for (const d of this.drops) {
        const k = d.age / d.life;
        ctx.globalAlpha = Math.sin(Math.PI * k) * (d.water ? 0.32 : 0.45);
        ctx.beginPath();
        ctx.moveTo(d.x + d.len * 0.4 * k, d.y + d.len * k);
        ctx.lineTo(d.x + d.len * 0.4 * (k + 0.5), d.y + d.len * (k + 0.5));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const r of this.rings) {
        if (r.water) continue;   // 물 위 파문은 셰이더 몫 — 모래 위에는 작은 젖은 자국만
        const k = r.age / 0.9, a = Math.sin(Math.PI * Math.min(1, k * 1.6 + 0.08)) * (1 - k);
        ctx.strokeStyle = r.water ? `rgba(236,246,250,${0.55 * a})` : `rgba(150,130,100,${0.3 * a})`;
        ctx.lineWidth = Math.max(0.7, 1 * u);
        ctx.beginPath(); ctx.ellipse(r.x, r.y, (1.5 + k * (r.water ? 11 : 4)) * u, (0.8 + k * (r.water ? 5.5 : 2)) * u, 0, 0, 6.29); ctx.stroke();
        if (r.water && k > 0.25) {   // 안쪽 두 번째 고리
          ctx.strokeStyle = `rgba(236,246,250,${0.3 * a})`;
          ctx.beginPath(); ctx.ellipse(r.x, r.y, (k - 0.25) * 9 * u, (k - 0.25) * 4.5 * u, 0, 0, 6.29); ctx.stroke();
        }
      }
    }
    // 눈송이
    if (this.flakes.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      for (const s of this.flakes) { ctx.moveTo(s.x + s.r, s.y); ctx.arc(s.x, s.y, s.r, 0, 6.29); }
      ctx.fill();
    }
    // 나뭇잎
    for (const l of this.leaves) {
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot);
      ctx.fillStyle = l.c;
      ctx.beginPath(); ctx.ellipse(0, 0, l.s, l.s * 0.45, 0, 0, 6.29); ctx.fill();
      ctx.restore();
    }
    // 밤의 빛: 반딧불이 · 야광 플랑크톤 (더하기 합성)
    if (this.flies.length || this.plankton.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const fl of this.flies) {
        const a = Math.max(0, Math.sin(this.t * 2.2 + fl.ph)) * this.night;
        if (a < 0.02) continue;
        const R = 9 * u;
        const gr = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, R);
        gr.addColorStop(0, `rgba(240,255,170,${0.9 * a})`);
        gr.addColorStop(0.25, `rgba(200,240,110,${0.45 * a})`);
        gr.addColorStop(1, 'rgba(160,220,80,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(fl.x - R, fl.y - R, R * 2, R * 2);
      }
      for (const p of this.plankton) {
        const k = 1 - p.age / p.life;
        ctx.fillStyle = `rgba(110,240,220,${0.7 * k * this.night})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, (1.2 + k) * u, 0, 6.29); ctx.fill();
      }
    }
    ctx.restore();
  }
}
