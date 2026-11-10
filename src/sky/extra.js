// sky/extra.js — v23 날씨 둘 더: 보슬비 · 꽃잎/낙엽 바람
//
//  atmos.js 가 이 파일의 값(EXTRA_PARAM)을 날씨 표에 합치고, 매 프레임 SkyExtra.update/draw 를 부른다 — main.js 는 모른다.
//  보슬비: 굵은 빗줄기(atmos 의 rain)는 조금만 섞고(0.15), 여기서 가늘고 짧은 실비를 촘촘히 뿌린다. 물 위엔 아주 작은 고리.
//  꽃잎 바람: 바람은 약하게(0.2), 여기서 꽃잎이 팔랑이며 흘러간다. 숲 장소(뉴질랜드 숲 · 가을 호숫가)에선 꽃잎 대신 낙엽.
//           그림: 낙엽은 가을 호숫가 물 위 단풍과 같은 낱장(assets/leaves.webp 4×2), 꽃잎은 assets/petals.webp(4×2, Higgsfield v23).
//           그림을 아직 못 읽었거나(첫 순간·시험) 없으면 선으로 그린 잎으로 대신한다.

import { clamp } from '../util.js?v=v30.16.0-9b21603';

export const EXTRA_WEATHERS = ['drizzle', 'blossom', 'storm'];
// atmos 의 날씨 값 열쇠(cloud·windK·amp·rain·snow·fog·wind·grey)에 drizzle·blossom 두 칸이 더 붙는다
export const EXTRA_KEYS = { drizzle: 0, blossom: 0, storm: 0 };   // v30.1 storm = 천둥번개 (번개는 이것만)
export const EXTRA_PARAM = {
  drizzle: { cloud: 0.5, windK: 1.15, amp: 1.05, rain: 0.15, snow: 0, fog: 0.16, wind: 0.06, grey: 0.45, drizzle: 1, blossom: 0, storm: 0 },
  blossom: { cloud: 0.12, windK: 2.0, amp: 1.25, rain: 0, snow: 0, fog: 0, wind: 0.2, grey: 0, drizzle: 0, blossom: 1, storm: 0 },
  // v30.1 천둥번개: 비보다 어둡고 바람이 세며, 번개가 자주 친다 (예전엔 「비」가 세게 오면 가끔 번개 — 이제 비는 비만)
  storm: { cloud: 0.92, windK: 2.4, amp: 1.5, rain: 1, snow: 0, fog: 0.12, wind: 0.55, grey: 0.95, drizzle: 0, blossom: 0, storm: 1 },
};
export const leafy = mapId => ['fall', 'nz', 'maple', 'ginkgo', 'birch', 'cypress'].includes(mapId);   // v30.0 단풍형 섬도 「낙엽 바람」
// v30.8 섬마다 다른 바람 (v30.0 단풍형 다음 묶음 — 사용자 승인 2026-11-02): 「꽃잎 바람」 날씨에 섬마다 날리는 것이 다르다
//  petal = 꽃잎(tint 로 섬 꽃 색) · blade = 풀잎·대잎·솔잎(코드 그림) · dust = 모래먼지 · spray = 물보라 · ice = 눈가루 · steam = 김
//  여기 없는 섬은 예전처럼 분홍 꽃잎
const WIND = {
  cherry: { kind: 'petal' }, lotus: { kind: 'petal', tint: [238, 150, 178] },
  lavender: { kind: 'petal', tint: [168, 132, 214], small: 1 }, 'lavender-sandbar': { kind: 'petal', tint: [168, 132, 214], small: 1 },
  heather: { kind: 'petal', tint: [196, 120, 178], small: 1 }, wisteria: { kind: 'petal', tint: [178, 150, 226] },
  hydrangea: { kind: 'petal', tint: [140, 160, 232] }, 'hydrangea-cove': { kind: 'petal', tint: [150, 150, 230] },
  sunflower: { kind: 'petal', tint: [246, 196, 52] }, tulip: { kind: 'petal', tint: [236, 92, 84] },
  bamboo: { kind: 'blade', pal: ['#7FA65A', '#93B86A', '#6A9150', '#A9C77E'], name: '대잎 바람' },
  'bamboo-bay': { kind: 'blade', pal: ['#7FA65A', '#93B86A', '#6A9150', '#A9C77E'], name: '대잎 바람' },
  rainforest: { kind: 'blade', pal: ['#4E8A4A', '#5F9D52', '#3F7442', '#78AE5E'], wide: 1, name: '잎사귀 바람' },
  mangrove: { kind: 'blade', pal: ['#5E8E52', '#77A060', '#4F7C47'], wide: 1, name: '잎사귀 바람' },
  hangang: { kind: 'blade', pal: ['#9DBF6A', '#B5CF82', '#F4F1E4', '#F7F5EC'], name: '버들 바람' },
  paddy: { kind: 'blade', pal: ['#D8B65A', '#C9A247', '#E3C878', '#9DB86A'], name: '볏잎 바람' },
  pinecove: { kind: 'blade', pal: ['#4F6E46', '#5D7D50', '#7A6A44'], needle: 1, name: '솔잎 바람' },
  oasis: { kind: 'dust', pal: ['#E2C48A', '#D7B577', '#EBD3A2'], name: '모래바람' },
  savanna: { kind: 'dust', pal: ['#D9B271', '#C99E5E', '#E3C48C'], name: '흙먼지 바람' },
  canyon: { kind: 'dust', pal: ['#C9784C', '#B8663E', '#D99368'], name: '붉은 모래바람' },
  zen: { kind: 'dust', pal: ['#E0D6BE', '#D4C8AC', '#EAE2CE'], name: '모래바람' },
  basalt: { kind: 'dust', pal: ['#55504B', '#6A645E', '#3F3B37'], name: '검은 모래바람' },
  pinksand: { kind: 'dust', pal: ['#EBBDB6', '#E3A9A2', '#F2D2CC'], name: '분홍 모래바람' },
  beach: { kind: 'spray', name: '물보라 바람' }, lagoon: { kind: 'spray', name: '물보라 바람' },
  snow: { kind: 'ice', name: '눈가루 바람' }, alpine: { kind: 'ice', name: '눈가루 바람' },
  fjord: { kind: 'ice', name: '눈가루 바람' }, glacier: { kind: 'ice', name: '얼음가루 바람' },
  'hot-spring': { kind: 'steam', name: '김 바람' },
};
export const windOf = mapId => (leafy(mapId) ? { kind: 'leaf' } : WIND[mapId] || { kind: 'petal' });
export const blossomName = mapId => (leafy(mapId) ? '낙엽 바람' : windOf(mapId).name || '꽃잎 바람');
const COUNT = { petal: 1, leaf: 1, blade: 1.6, dust: 4, spray: 2.4, ice: 3.4, steam: 0.3 };   // v30.15 풀잎·눈가루는 화면에서 너무 옅어(낙엽의 1/5) 더 많이

const PETAL = ['#F6C9D3', '#F2B6C6', '#FBE3E8', '#EFA9BD', '#FFF1F3'];
const LEAF = ['#C8582B', '#D9822B', '#E3A23A', '#A8442A', '#B86A2E', '#E8B04A'];

const SHEETS = { leaf: 'assets/leaves.webp?v=v30.16.0-9b21603', petal: 'assets/petals.webp?v=v30.16.0-9b21603', flip: 'assets/drift-flip.webp?v=v30.16.0-9b21603' };
// v28.15 앞뒷면 짝(drift-flip.webp 4×2): 팔랑이다 가장 납작해지는 순간 앞↔뒤로 바꿔 끼워 진짜 뒤집히는 것처럼
//  꽃잎은 말린 꽃잎 짝(2·3)만 — 1행 1·2칸은 모양이 짝이 아니다(stock/README drift) · 낙엽은 단풍(4·5)·둥근 낙엽(6·7)
const FLIP = { petal: [[2, 3]], leaf: [[4, 5], [6, 7]] };

export class SkyExtra {
  constructor(rand = Math.random) { this.sprites = {}; this.rand = rand; this.mist = []; this.dots = []; this.petals = []; this.kind = 'petal'; this.wind = { kind: 'petal' }; this.map = null; this.t = 0; }

  update(dt, beach, v, mapId = 'beach') {
    this.t += dt;
    const W = beach.W, H = beach.H, u = beach.u, area = (W * H) / 1e6, R = this.rand;
    // 보슬비: 화면 위에서 거의 곧게(살짝 비스듬히) 빠르게 — 다 내려오면 다시 위로
    const nMist = Math.round(clamp(v.drizzle || 0, 0, 1) * 420 * area);
    while (this.mist.length < nMist) this.mist.push(this.newMist(W, H, u, true));
    if (this.mist.length > nMist) this.mist.length = nMist;
    for (const m of this.mist) {
      m.y += m.sp * dt; m.x += m.sp * 0.16 * dt;
      if (m.y > H + 10 || m.x > W + 10) {
        // 물 위에 떨어진 것만 아주 작은 고리 (모래는 젖은 색으로 이미 충분)
        if (this.dots.length < 80 && R() < 0.35) { const x = R() * W, y = R() * H; if (beach.edge && y > beach.edge(x)) this.dots.push({ x, y, age: 0 }); }
        Object.assign(m, this.newMist(W, H, u, false));
      }
    }
    for (const d of this.dots) d.age += dt;
    this.dots = this.dots.filter(d => d.age < 0.7);
    // 꽃잎 · 낙엽
    const wind = windOf(mapId), kind = wind.kind;
    if (mapId !== this.map) { this.map = mapId; this.kind = kind; this.wind = wind; this.petals.length = 0; }
    const nP = Math.round(clamp(v.blossom || 0, 0, 1) * 46 * Math.sqrt(area * 2) * COUNT[kind] * (wind.small ? 1.5 : 1));
    while (this.petals.length < nP) this.petals.push(this.newPetal(W, H, u, true));
    if (this.petals.length > nP) this.petals.length = nP;
    for (const p of this.petals) {
      p.x += p.sp * dt;
      p.y += (p.fall + Math.sin(this.t * p.wob + p.ph) * 22) * u * dt;
      if (p.life !== undefined) { p.age += dt; if (p.age > p.life) Object.assign(p, this.newPetal(W, H, u, false)); }
      p.rot += p.spin * dt; p.flap += p.flapSp * dt;
      if (p.x > W + 20 || p.y > H + 20) Object.assign(p, this.newPetal(W, H, u, false));
    }
  }

  // 섬 꽃 색으로 바꾼 낱장 (밝기는 두고 색만 — 한 번 만들어 둔다)
  tinted(kind, rgb) {
    const base = this.sheet(kind); if (!base || !rgb) return base;
    const key = kind + ':' + rgb.join(',');
    if (this.sprites[key]) return this.sprites[key];
    return (this.sprites[key] = base.map(cv => {
      const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height;
      const g = o.getContext('2d'); g.drawImage(cv, 0, 0);
      const d = g.getImageData(0, 0, o.width, o.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const l = (a[i] * 0.3 + a[i + 1] * 0.55 + a[i + 2] * 0.15) / 205; for (let j = 0; j < 3; j++) a[i + j] = Math.max(0, Math.min(255, Math.round(rgb[j] * l))); }
      g.putImageData(d, 0, 0); return o;
    }));
  }
  // 낱장 그림을 처음 필요할 때 읽어 칸마다 잘라 둔다
  sheet(kind) {
    if (this.sprites[kind] !== undefined || typeof Image === 'undefined') return this.sprites[kind] || null;
    this.sprites[kind] = null;
    const im = new Image();
    im.onload = () => {
      const cw = im.naturalWidth / 4, ch = im.naturalHeight / 2, list = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        const cv = document.createElement('canvas'); cv.width = Math.round(cw); cv.height = Math.round(ch);
        cv.getContext('2d').drawImage(im, c * cw, r * ch, cw, ch, 0, 0, cv.width, cv.height);
        list.push(cv);
      }
      this.sprites[kind] = list;
    };
    im.src = SHEETS[kind];
    return null;
  }

  newMist(W, H, u, anywhere) {
    const R = this.rand;
    return { x: R() * W * 1.1 - W * 0.1, y: anywhere ? R() * H : -10 - R() * 40, len: (5 + R() * 5) * u, sp: (280 + R() * 120) * u, a: 0.16 + R() * 0.14 };
  }
  newPetal(W, H, u, anywhere) {
    const R = this.rand, w = this.wind, k = this.kind;
    if (k === 'dust' || k === 'spray' || k === 'ice') {   // 작은 알갱이 — 빠르게 옆으로, 가끔 뭉쳐 휘도는 것
      const fast = k === 'dust' ? 1.6 : k === 'spray' ? 1.3 : 0.9, pal = w.pal || (k === 'spray' ? ['#FFFFFF', '#EAF6F8', '#D8EEF2'] : ['#FFFFFF', '#F1F6FB', '#E3EEF8']);
      return { x: anywhere ? R() * W : -20 - R() * W * 0.3, y: k === 'spray' ? H * (0.35 + R() * 0.6) : R() * H * 0.95,
        sp: (90 + R() * 120) * fast * u, fall: k === 'ice' ? 10 + R() * 18 : k === 'spray' ? -4 + R() * 10 : 2 + R() * 6,
        wob: 1.5 + R() * 2.5, ph: R() * 6.28, rot: 0, spin: 0, flap: R() * 6.28, flapSp: 4 + R() * 6,
        s: (k === 'dust' ? 1.5 + R() * 2.2 : k === 'spray' ? 1.4 + R() * 2.4 : 1.4 + R() * 2.2) * u, c: pal[Math.floor(R() * pal.length)],
        a: k === 'dust' ? 0.5 + R() * 0.4 : 0.6 + R() * 0.4, streak: k !== 'ice' && R() < 0.5 };
    }
    if (k === 'steam') {   // 온천 김 — 크고 흐린 덩이가 위로 오르며 흩어진다
      return { x: anywhere ? R() * W : -60 - R() * W * 0.2, y: H * (0.3 + R() * 0.7), sp: (18 + R() * 26) * u, fall: -(10 + R() * 14),
        wob: 0.4 + R() * 0.5, ph: R() * 6.28, rot: 0, spin: 0, flap: 0, flapSp: 0, s: (28 + R() * 40) * u, c: '#FFFFFF', age: anywhere ? R() * 6 : 0, life: 7 + R() * 6 };
    }
    if (k === 'blade') {   // 풀잎·대잎·솔잎 — 가늘고 길게, 팔랑이며
      const pal = w.pal;
      return { x: anywhere ? R() * W : -20 - R() * W * 0.3, y: R() * H * 0.9,
        sp: (60 + R() * 70) * u, fall: 6 + R() * 12, wob: 1.2 + R() * 1.4, ph: R() * 6.28,
        rot: R() * 6.28, spin: (R() - 0.5) * 3.4, flap: R() * 6.28, flapSp: 3 + R() * 4,
        s: (w.needle ? 8 + R() * 3.5 : w.wide ? 10.5 + R() * 5 : 12 + R() * 6) * u, c: pal[Math.floor(R() * pal.length)] };
    }
    const leaf = k === 'leaf', pal = leaf ? LEAF : PETAL;
    return {
      x: anywhere ? R() * W : -20 - R() * W * 0.3, y: R() * H * 0.9,
      sp: (55 + R() * 70) * u, fall: 6 + R() * 14, wob: 1.2 + R() * 1.4, ph: R() * 6.28,
      rot: R() * 6.28, spin: (R() - 0.5) * 3, flap: R() * 6.28, flapSp: 3 + R() * 4,
      s: (leaf ? 5 + R() * 3 : 3.2 + R() * 1.8) * u, c: pal[Math.floor(R() * pal.length)],
      img: Math.floor(R() * 8), size: (leaf ? 26 + R() * 14 : (w.small ? 23 + R() * 8 : 28 + R() * 12)) * u,   // 그림으로 그릴 때의 칸 크기 (꽃잎은 칸의 40% 쯤만 차 있다)
      pair: R() < 0.4 ? FLIP[leaf ? 'leaf' : 'petal'][Math.floor(R() * FLIP[leaf ? 'leaf' : 'petal'].length)] : null,   // 열에 넷은 앞뒷면 짝으로
    };
  }

  get busy() { return this.mist.length || this.dots.length || this.petals.length; }

  draw(ctx, beach) {
    const u = beach.u;
    ctx.save();
    if (this.mist.length) {
      ctx.strokeStyle = 'rgb(230,236,242)'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.6, 0.8 * u);
      ctx.globalAlpha = 0.36;
      ctx.beginPath();
      for (const m of this.mist) { ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + m.len * 0.16, m.y + m.len); }
      ctx.stroke();
    }
    if (this.dots.length) {
      ctx.lineWidth = Math.max(0.6, 0.7 * u);
      for (const d of this.dots) {
        const k = d.age / 0.7;
        ctx.globalAlpha = 0.4 * (1 - k); ctx.strokeStyle = 'rgb(236,246,250)';
        ctx.beginPath(); ctx.ellipse(d.x, d.y, (1 + k * 5) * u, (0.5 + k * 2.4) * u, 0, 0, 6.29); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    const k = this.kind;
    if (this.petals.length && (k === 'dust' || k === 'spray' || k === 'ice' || k === 'steam')) { this.drawGrains(ctx, u); ctx.restore(); return; }
    const sk = k === 'leaf' ? 'leaf' : 'petal', tint = this.wind.tint;
    const spr = this.petals.length && k !== 'blade' ? this.tinted(sk, tint) : null, flip = this.petals.length && k !== 'blade' ? this.tinted('flip', tint) : null;
    for (const p of this.petals) {
      // 팔랑임: 한 축으로 납작해졌다 펴졌다 (뒤집히는 것처럼)
      const fl = 0.3 + 0.7 * Math.abs(Math.cos(p.flap));
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, fl);
      if (p.pair && flip) { const im = flip[Math.cos(p.flap) >= 0 ? p.pair[0] : p.pair[1]], s = p.size * 0.8; ctx.drawImage(im, -s / 2, -s / 2, s, s); ctx.restore(); continue; }
      if (spr) { const im = spr[p.img % spr.length]; ctx.drawImage(im, -p.size / 2, -p.size / 2, p.size, p.size); ctx.restore(); continue; }
      ctx.fillStyle = p.c;
      if (k === 'blade') {
        // 가는 잎: 길쭉한 잎 (솔잎은 선 두 가닥)
        if (this.wind.needle) { ctx.strokeStyle = p.c; ctx.lineWidth = Math.max(0.6, 0.7 * u); ctx.beginPath(); ctx.moveTo(-p.s, -p.s * 0.1); ctx.lineTo(p.s, 0); ctx.moveTo(-p.s, p.s * 0.1); ctx.lineTo(p.s * 0.9, p.s * 0.22); ctx.stroke(); }
        else { const h = p.s * (this.wind.wide ? 0.42 : 0.2); ctx.beginPath(); ctx.moveTo(-p.s, 0); ctx.quadraticCurveTo(0, -h, p.s, 0); ctx.quadraticCurveTo(0, h, -p.s, 0); ctx.fill();
          ctx.strokeStyle = 'rgba(40,60,30,0.3)'; ctx.lineWidth = Math.max(0.4, 0.4 * u); ctx.beginPath(); ctx.moveTo(-p.s * 0.9, 0); ctx.lineTo(p.s * 0.8, 0); ctx.stroke(); }
      } else if (this.kind === 'leaf') {
        // 낙엽: 끝이 뾰족한 잎 + 가운데 잎맥
        ctx.beginPath(); ctx.moveTo(-p.s, 0); ctx.quadraticCurveTo(0, -p.s * 0.62, p.s, 0); ctx.quadraticCurveTo(0, p.s * 0.62, -p.s, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(90,40,20,0.45)'; ctx.lineWidth = Math.max(0.5, 0.5 * u);
        ctx.beginPath(); ctx.moveTo(-p.s * 1.25, 0); ctx.lineTo(p.s * 0.85, 0); ctx.stroke();
      } else {
        // 꽃잎: 끝이 살짝 파인 둥근 잎
        ctx.beginPath(); ctx.moveTo(0, p.s * 0.55);
        ctx.bezierCurveTo(-p.s, p.s * 0.3, -p.s * 0.8, -p.s * 0.7, -p.s * 0.15, -p.s * 0.6);
        ctx.lineTo(0, -p.s * 0.4); ctx.lineTo(p.s * 0.15, -p.s * 0.6);
        ctx.bezierCurveTo(p.s * 0.8, -p.s * 0.7, p.s, p.s * 0.3, 0, p.s * 0.55); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // 모래먼지 · 물보라 · 눈가루 · 김 (그림 없이)
  drawGrains(ctx, u) {
    const k = this.kind;
    if (k === 'steam') {
      for (const p of this.petals) {
        const f = Math.sin(Math.PI * Math.min(1, p.age / p.life)), r = p.s * (0.6 + 0.6 * p.age / p.life);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, `rgba(250,250,248,${0.4 * f})`); g.addColorStop(1, 'rgba(250,250,248,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.29); ctx.fill();
      }
      return;
    }
    ctx.lineCap = 'round';
    for (const p of this.petals) {
      ctx.globalAlpha = p.a * (k === 'ice' ? 0.7 + 0.3 * Math.sin(this.t * p.flapSp + p.ph) : 1);
      if (p.streak) { ctx.strokeStyle = p.c; ctx.lineWidth = p.s; ctx.beginPath(); ctx.moveTo(p.x - p.sp * 0.12, p.y - p.fall * 0.12 * u); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      else { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.29); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
}
