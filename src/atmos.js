// atmos.js — 하루의 빛(시계)과 날씨
//
//  시간 빛: 실제 시각(또는 ?hour=)에 따라 장면 전체에 곱해지는 색(#tint, mix-blend-mode: multiply).
//           새벽 분홍 → 아침 살구 → 낮 그대로 → 노을 주황 → 해 질 녘 보라 → 밤 푸른 어둠. night 0~1 은 반딧불이·야광·귀뚜라미의 세기.
//  날씨: 맑음 · 흐림 · 비 · 눈 · 안개 · 바람. 바꾸면 값이 몇 초에 걸쳐 부드럽게 넘어간다.
//        구름 양·흐름 속도·파도 높이는 셰이더/해변에 넘기고, 빗줄기·물방울 고리·눈송이·나뭇잎·안개·반딧불이·야광은 여기서 #fx 캔버스에 그린다.
//        눈은 시간이 지날수록 땅(셰이더 uSnow)과 나무에 쌓이고, 그치면 천천히 녹는다.

import { clamp, lerp } from './util.js?v=v28.7.0';
import { EXTRA_KEYS, EXTRA_PARAM, SkyExtra, blossomName } from './sky/extra.js?v=v28.7.0';   // v23 보슬비 · 꽃잎/낙엽 바람
import { Meteors, Rainbow } from './sky/events.js?v=v28.7.0';                                 // v23 별똥별 · 무지개

export const WEATHERS = ['clear', 'cloudy', 'drizzle', 'rain', 'snow', 'fog', 'wind', 'blossom'];
export const WEATHER_NAME = { clear: '맑음', cloudy: '흐림', drizzle: '보슬비', rain: '비', snow: '눈', fog: '안개', wind: '바람', blossom: '꽃잎 바람' };   // blossom 은 장소 따라 '낙엽 바람'
const BASE = {
  clear: { cloud: 0.06, windK: 1, amp: 1, rain: 0, snow: 0, fog: 0, wind: 0, grey: 0 },
  cloudy: { cloud: 0.6, windK: 1.3, amp: 1.1, rain: 0, snow: 0, fog: 0, wind: 0.15, grey: 0.35 },
  rain: { cloud: 0.72, windK: 1.6, amp: 1.25, rain: 1, snow: 0, fog: 0.1, wind: 0.3, grey: 0.7 },
  snow: { cloud: 0.5, windK: 0.6, amp: 0.85, rain: 0, snow: 1, fog: 0.15, wind: 0.05, grey: 0.25 },
  fog: { cloud: 0.15, windK: 0.5, amp: 0.8, rain: 0, snow: 0, fog: 1, wind: 0, grey: 0.3 },
  wind: { cloud: 0.35, windK: 3.4, amp: 1.65, rain: 0, snow: 0, fog: 0, wind: 1, grey: 0.1 },
};
// 원래 날씨에도 v23 칸(drizzle·blossom = 0)을 붙이고 새 날씨 둘을 합친다 — 값을 섞을 때 모든 날씨가 같은 열쇠를 가져야 한다
const PARAM = { ...Object.fromEntries(Object.entries(BASE).map(([k, v]) => [k, { ...v, ...EXTRA_KEYS }])), ...EXTRA_PARAM };

// 시각 → 곱하는 색, 밤 정도 (사이는 보간)
const KEYS = [
  // v16.4: 시간대마다 느낌이 확실히 갈리게 — 진짜 어두운 한밤(달빛 웅덩이만 남는다) · 짙은 새벽 분홍 · 노을 주황 · 해 질 녘 보라
  //  (예전 v6 은 "모래가 이미 금빛이라 노을은 살짝만", 밤도 푸른 회색 정도였다)
  [0, [36, 46, 92], 1], [3.4, [36, 46, 92], 1],                      // 한밤: 가장자리는 거의 깜깜, 달빛 웅덩이만
  [4.6, [92, 100, 156], 0.9],                                          // 새벽 전 푸른빛
  [5.5, [214, 168, 196], 0.45], [6.5, [250, 214, 196], 0.08],          // 새벽 분홍 → 해 뜰 녘 살구
  [7.6, [238, 244, 255], 0], [9, [244, 248, 255], 0], [11, [255, 255, 255], 0], [14, [255, 255, 255], 0], [16.3, [255, 238, 210], 0],   // 아침은 맑고 살짝 차갑게 · 한낮은 그대로 · 오후는 금빛
  [17.6, [255, 220, 180], 0], [18.4, [248, 190, 152], 0.06],          // 늦은 오후 금빛 → 노을 주황
  [19.2, [168, 140, 188], 0.45], [20.3, [100, 112, 168], 0.85],       // 해 질 녘 보라 → 저녁 푸른 어둠
  [21.8, [64, 76, 128], 1], [23.2, [38, 48, 94], 1], [24, [36, 46, 92], 1],   // 밤 → 한밤
];
// 시간대 그림을 섞는 비율 (v16.6): n = 밤 그림 · w = 따뜻한 빛 그림(아침 쪽은 새벽, 저녁 쪽은 노을) · n + w ≤ 1
//  한밤 —(4.4~5.4)→ 새벽 —(6.4~7.6)→ 낮 —(16.6~17.8)→ 노을 —(18.8~20)→ 밤
const ss = (a, b, h) => { const t = clamp((h - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function artAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h < 12) { const up = ss(4.4, 5.4, h); return { n: 1 - up, w: up * (1 - ss(6.4, 7.6, h)), kind: 'dawn' }; }
  const dn = ss(18.8, 20, h); return { n: dn, w: ss(16.6, 17.8, h) * (1 - dn), kind: 'sunset' };
}

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
    this.holes = []; this.wisps = [];   // v16.2 안개 구멍 · 흩어지는 안개 조각
    this.t = 0;
    this._map = 'beach';                // v23 꽃잎/낙엽을 고르려고 main.js 가 알려 준다 (mapId)
    this.extra = new SkyExtra(); this.meteors = new Meteors(); this.rainbow = new Rainbow();
    this.onMeteor = null;               // 별똥별이 떨어질 때 (main.js 가 소리·키위 반응을 붙인다)
  }
  get mapId() { return this._map; }
  set mapId(m) { this._map = m; WEATHER_NAME.blossom = blossomName(m); }
  setWeather(w) { if (!WEATHERS.includes(w)) return; const prev = this.weather; this.weather = w; this.rainbow.weatherChanged(prev, w, this.night); }
  // v16.2 안개 뚫기: (x, y)에 둥근 구멍 — 퍽 하고 열렸다가(0.35초) 잠시 머물고(3.5초) 천천히 다시 찬다(5초). big = 누르기, 아니면 문지르기
  punchFog(x, y, u, big = true) {
    if (this.v.fog < 0.2) return false;
    const R = (big ? 95 : 55) * u;
    this.holes.push({ x, y, R, age: 0, hold: big ? 3.5 : 2.5 });
    if (this.holes.length > 60) this.holes.shift();
    for (let i = 0; i < (big ? 9 : 3); i++) {   // 밀려난 안개 조각이 바깥으로 흩어진다
      const a = Math.random() * 6.28, sp = (big ? 90 : 50) * u * (0.6 + Math.random() * 0.8);
      this.wisps.push({ x: x + Math.cos(a) * R * 0.4, y: y + Math.sin(a) * R * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: (18 + Math.random() * 22) * u, age: 0, life: 0.9 + Math.random() * 0.6 });
    }
    return true;
  }
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
    // 안개 구멍: 안개와 함께 조금 흘러가며 다시 찬다 · 흩어진 조각은 느려지며 옅어진다
    for (const h of this.holes) { h.age += dt; h.x += 8 * u * dt; }
    this.holes = this.holes.filter(h => h.age < h.hold + 5 && this.v.fog > 0.05);
    for (const w of this.wisps) { w.age += dt; w.x += w.vx * dt; w.y += w.vy * dt; w.vx *= 0.94; w.vy *= 0.94; w.r *= 1 + dt * 0.8; }
    this.wisps = this.wisps.filter(w => w.age < w.life);
    // 밤: 반딧불이(풀밭 가장자리 둘레) · 야광 플랑크톤(물가)
    const glowOK = this.night * (1 - this.v.rain) * (1 - this.v.snow);
    // 그림을 아직 읽기 전(첫 프레임)에는 숲 줄이 없어 위치가 NaN이 된다 — 그때는 만들지 않고, 혹시 깨진 것은 버린다
    const laid = !!(beach.grassC && beach.W > 0 && isFinite(beach.bushY) && isFinite(beach.shoreY));
    const nFly = laid ? Math.round(glowOK * 16) : 0;
    this.flies = this.flies.filter(f => isFinite(f.x) && isFinite(f.y));
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
    if (laid && !beach.still && glowOK > 0.3 && Math.random() < dt * 30 * glowOK) {   // 야광 플랑크톤은 물가에만
      const x = Math.random() * W;
      this.plankton.push({ x, y: beach.edge(x) + Math.random() * 14 * u, age: 0, life: 1 + Math.random() * 1.5 });
    }
    for (const p of this.plankton) p.age += dt;
    this.plankton = this.plankton.filter(p => p.age < p.life);
    // v23: 보슬비·꽃잎 바람 · 별똥별 · 무지개
    this.extra.update(dt, beach, this.v, this.mapId);
    if (laid) { const m = this.meteors.update(dt, beach, this.v, this.night); if (m && this.onMeteor) this.onMeteor(m); }
    this.rainbow.update(dt, this.night);
  }

  // n·w: 밤 · 노을/새벽 그림이 섞인 정도 — 그림이 이미 그 빛이라 그만큼 시간 빛을 옅게 씌운다
  //  (밤은 35%만 옅게 — 한밤은 그래도 더 어둡게 누른다 · 노을/새벽은 75% 옅게 — 색이 두 번 겹치지 않게)
  //  모양: 가로 75% · 세로 62% 타원, 중심 (55%, 45%), 색 [가운데, 55% 지점, 가장자리] — tintStops 가 색, main.js paintTint 가 그린다
  tintStops(n = 0, w = 0) {
    const k = 1 - 0.35 * n - 0.75 * w;
    const c = this.tint.map(v => Math.round(255 - (255 - v) * k));
    // 밤에는 가운데를 밝게 (달빛 웅덩이) — 한밤일수록 가장자리는 더 어둡고 글씨 쓰는 가운데는 읽힐 만큼 남는다
    const lift = this.night * 0.3, c2 = c.map(v => Math.round(v + (255 - v) * lift));
    const mid = c.map((v, i) => Math.round((v + c2[i]) / 2));
    return [c2, mid, c];
  }
  tintCSS(n = 0, w = 0) {
    const [c2, mid, c] = this.tintStops(n, w);
    return `radial-gradient(ellipse 75% 62% at 55% 45%, rgb(${c2}), rgb(${mid}) 55%, rgb(${c}))`;
  }

  // 이번 프레임에 그릴 것이 있는가 (없으면 #fx 층을 건드리지 않는다 — main.js)
  get busy() {
    return this.extra.busy || this.meteors.list.length || this.rainbow.on || this.v.fog > 0.01 || this.drops.length || this.rings.length || this.flakes.length || this.leaves.length || this.flies.length || this.plankton.length || this.wisps.length;
  }

  // #fx 캔버스 (시간 빛 위에 그린다 — 빛나는 것들이 어둡게 눌리지 않게)
  draw(ctx, beach) {
    const u = beach.u, W = beach.W, H = beach.H;
    ctx.save();
    this.rainbow.draw(ctx, beach);   // v23 무지개는 비·안개 아래
    // 안개: 전체에 옅은 흰 막 + 흘러가는 덩어리
    // v16.2: 안개만 따로(반 해상도) 그린 뒤 구멍을 뚫어 얹는다 — 같은 캔버스의 비·반딧불이까지 지우지 않게
    if (this.v.fog > 0.01) {
      const k = 0.5, fc = (this.fogCanvas ||= document.createElement('canvas'));
      const fw = Math.ceil(W * k), fh = Math.ceil(H * k);
      if (fc.width !== fw || fc.height !== fh) { fc.width = fw; fc.height = fh; }
      const g = fc.getContext('2d');
      g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, W, H);
      g.fillStyle = `rgba(236,238,240,${0.16 * this.v.fog})`;
      g.fillRect(0, 0, W, H);
      for (const f of this.fogs) {
        const gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        gr.addColorStop(0, `rgba(240,242,244,${0.34 * this.v.fog})`);
        gr.addColorStop(1, 'rgba(240,242,244,0)');
        g.fillStyle = gr;
        g.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      }
      if (this.holes.length) {
        g.globalCompositeOperation = 'destination-out';
        for (const h of this.holes) {
          const open = 1 - Math.pow(1 - Math.min(1, h.age / 0.35), 3);              // 퍽: 빠르게 열리고
          const a = h.age < h.hold ? 1 : Math.max(0, 1 - (h.age - h.hold) / 5);   // 천천히 다시 찬다
          const r = h.R * (0.3 + 0.7 * open) * (1 + 0.15 * (1 - a));
          const gr = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
          gr.addColorStop(0, `rgba(0,0,0,${0.95 * a})`); gr.addColorStop(0.55, `rgba(0,0,0,${0.8 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(h.x, h.y, r, 0, 6.29); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
      }
      for (const w of this.wisps) {
        const a = (1 - w.age / w.life) * 0.4 * this.v.fog, gr = g.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.r);
        gr.addColorStop(0, `rgba(244,246,248,${a})`); gr.addColorStop(1, 'rgba(244,246,248,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(w.x, w.y, w.r, 0, 6.29); g.fill();
      }
      ctx.drawImage(fc, 0, 0, W, H);
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
    this.extra.draw(ctx, beach);     // v23 실비 · 꽃잎/낙엽
    this.meteors.draw(ctx, beach);   // v23 별똥별
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
