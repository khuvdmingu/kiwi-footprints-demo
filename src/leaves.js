// leaves.js — 물 위에 떠다니는 잎 (가을 호숫가 v17 → v30.0 단풍형 다섯 곳)
//  그림 판에서는 물 위 낙엽을 지우고, 낱장 그림을 따로 띄운다.
//   assets/leaves.webp      4×2 칸: 0·1·2·6·7 단풍 · 3·4 은행 · 5 참나무
//   assets/drift-seeds.webp 4×2 칸: 1행 단풍 헬리콥터 씨앗 4각도 · 2행 은행잎 4
//  떠내려오는 병·상자(items.js Drifters)와 같은 문법: 물가선(beach.edge)을 기준으로 떠 있고, 위아래로 까딱이며, 동그란 물결을 낸다.
//  잎마다 "물가선 아래 깊이"(d)가 있어서, 파도가 밀려오면 물가 쪽 잎일수록 많이 밀려 올라갔다가 물이 빠지면 같이 끌려 내려간다.
//
//  v30.0 날씨 (사용자: 단풍숲 바람에 낙엽이 날리고 바다에 떠다니는 게 좋았다 → 단풍형 섬들로 넓힘)
//   · 바람: 하늘에서 날리던 잎(atmos.js AirLeaves)이 물에 내려앉아 물 위 잎이 늘어난다(평소의 최대 2.5배). 바람이 그치면
//           늘어난 잎은 화면 밖으로 흘러가며 하나씩 빠진다 — 그친 뒤에도 한동안 남는다.
//   · 비:   물 위 잎이 절반까지 줄며 천천히 가라앉듯 옅어진다. 눈: 물살이 느려진다. 안개: 흐릿하게.

// 장소 → 쓰는 칸. tint = 그림 색을 이 색 쪽으로 바꿈(밝기는 유지) · size = 크기 비율 · seeds = 하늘에 헬리콥터 씨앗도
//  ⚠ 자작나무·낙우송은 그 잎 그림이 아직 없어 참나무 잎 색을 바꿔 쓴다 — 그림이 오면 칸만 바꾼다(docs/WORKSTREAMS.md 백로그).
export const LEAF_PLACES = {
  fall: { cells: [0, 1, 2, 3, 4, 5, 6, 7] },
  maple: { cells: [0, 1, 2, 6, 7], seeds: true },
  ginkgo: { cells: [3, 4], ginkgo: true },
  birch: { cells: [5], tint: [232, 192, 64], size: 0.62 },
  cypress: { cells: [5], tint: [190, 96, 44], size: 0.5 },
};
export const leafPlace = mapId => LEAF_PLACES[mapId] || null;

export const WIND_MORE = 2.5;   // 바람 부는 동안 물 위 잎은 평소의 최대 이만큼

// 4×2 격자 → 칸 캔버스 8장
export function cut(im) {
  const cw = im.naturalWidth / 4, ch = im.naturalHeight / 2, out = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    cv.getContext('2d').drawImage(im, c * cw, r * ch, cw, ch, 0, 0, cw, ch);
    out.push(cv);
  }
  return out;
}
// 색 바꾸기: 밝기는 두고 색만 rgb 쪽으로 (휴대폰 Safari 는 ctx.filter 가 없어 픽셀로)
export function tintPx(data, rgb) {
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const l = (data[i] * 0.3 + data[i + 1] * 0.55 + data[i + 2] * 0.15) / 160;
    for (let j = 0; j < 3; j++) data[i + j] = Math.max(0, Math.min(255, Math.round(rgb[j] * l)));
  }
  return data;
}
function tinted(cv, rgb) {
  const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height;
  const g = o.getContext('2d'); g.drawImage(cv, 0, 0);
  const d = g.getImageData(0, 0, o.width, o.height); tintPx(d.data, rgb); g.putImageData(d, 0, 0);
  return o;
}
// 장소에 맞는 낱장들 → { water: [...], air: [...], seeds: [...], size }
export function spritesFor(mapId, sheets) {
  const p = leafPlace(mapId);
  if (!p || !sheets.leaves) return null;
  let water = p.cells.map(i => sheets.leaves[i]);
  if (p.ginkgo && sheets.seeds) water = water.concat(sheets.seeds.slice(4));
  if (p.tint) water = water.map(cv => tinted(cv, p.tint));
  const seeds = p.seeds && sheets.seeds ? sheets.seeds.slice(0, 4) : [];
  return { water, air: water, seeds, size: p.size || 1 };
}

export class Leaves {
  constructor() { this.list = []; this.sprites = []; this.size = 1; this.base = 0; this.on = false; }

  // 장소 그림 고르기 (main.js 가 장소를 옮길 때마다)
  setSprites(set) { this.sprites = set ? set.water : []; this.size = set ? set.size : 1; }

  reset(beach, on) {
    this.list = []; this.on = on; this.base = 0;
    if (!on) return;
    const { W, u } = beach, n = Math.round(Math.max(5, Math.min(12, W / (110 * u))));
    this.base = n;
    for (let i = 0; i < n; i++) this.list.push(this.make(beach, (i + Math.random() * 0.8) * W / n));
  }

  make(beach, x) {
    const u = beach.u, r = Math.random;
    return {
      x, y: null, d: 0.05 + r() * 0.85, s: Math.floor(r() * 8),   // 깊이는 고르게 (물가에 한 줄로 늘어서지 않게)
      size: (34 + r() * 22) * u * this.size, rot: r() * 6.28, vr: (r() - 0.5) * 0.08,
      vx: (1.5 + r() * 3) * u, ph: r() * 6.28, a: 1, fade: 0,
    };
  }

  // 하늘에서 내려앉은 잎 (atmos.js AirLeaves → main.js). 평소엔 평소 수까지(비에 줄었던 것을 채움), 바람 부는 동안만 그보다 늘어난다.
  cap() { return Math.round(this.base * (1 + (WIND_MORE - 1) * Math.min(1, this.wind || 0))); }
  land(beach, x, s) {
    if (!this.on || this.list.length >= this.cap()) return false;
    const f = this.make(beach, x);
    f.d = 0.04 + Math.random() * 0.5; f.a = 0; f.fade = 1;   // 물가 가까이에 퐁 — 서서히 나타난다
    if (s != null) f.s = s;
    this.list.push(f);
    return true;
  }

  // 놓일 자리: 물가선 바로 아래(병·상자처럼 7u) ~ 화면 아래 끝 사이, 깊이 비율 d 만큼
  home(beach, f) {
    const top = beach.edge(f.x) + 7 * beach.u + f.size * 0.35;
    return top + f.d * Math.max(0, beach.H + f.size - top);
  }

  // wx: 숫자면 바람만(예전 호출) · { wind, rain, snow, fog }
  update(dt, beach, wx = 0) {
    const w = typeof wx === 'number' ? { wind: wx } : (wx || {});
    const wind = w.wind || 0, rain = w.rain || 0, snow = w.snow || 0;
    this.wind = wind;
    const { W, t, u } = beach;
    // 비 오면 절반까지 가라앉는다 (뒤쪽 잎부터 천천히 옅어짐)
    const keep = rain > 0.5 ? Math.ceil(this.base * 0.5) : this.list.length;
    let alive = 0;
    for (const f of this.list) {
      if (f.fade > 0) { f.a = Math.min(1, f.a + dt / 1.2); if (f.a >= 1) f.fade = 0; }
      else if (f.fade < 0) f.a = Math.max(0, f.a - dt / 6);
      else if (alive >= keep) f.fade = -1;
      if (f.fade >= 0) alive++;
      // 옆으로: 느린 물살 + 바람, 그리고 물결 따라 좌우로 살랑 (눈 오면 물살이 느려진다)
      f.x += (f.vx * (1 + wind * 2.5) * (1 - snow * 0.7) + Math.sin(t * 0.35 + f.ph) * 2.5 * u) * dt;
      // 위아래: 물을 따라간다 — 물이 밀려오면 바로, 빠질 때는 조금 늦게 끌려간다(물에 젖은 잎의 끌림)
      const want = this.home(beach, f);
      if (f.y === null) f.y = want;
      const dy = want - f.y, k = dy < 0 ? 6 : 2.2;
      const vy = dy * Math.min(1, dt * k) / Math.max(dt, 1e-3);
      f.y += dy * Math.min(1, dt * k);
      // 움직이는 만큼 살짝 돈다 (밀려올 때 잎이 비틀린다) + 아주 느린 자전
      f.rot += (f.vr + vy * 0.0012 / u * Math.sign(Math.sin(f.ph))) * dt;
    }
    // 화면 밖으로 나간 잎: 평소 수(비 오면 절반)까지만 왼쪽에서 다시 — 바람에 늘었던 잎은 이렇게 하나씩 빠진다
    const room = rain > 0.5 ? Math.ceil(this.base * 0.5) : this.base;
    this.list = this.list.filter(f => !(f.fade < 0 && f.a <= 0));
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      if (f.x <= W + f.size) continue;
      if (this.list.length > room) this.list.splice(i, 1);
      else Object.assign(f, this.make(beach, -f.size));
    }
  }

  draw(ctx, beach, fog = 0) {
    if (!this.sprites.length) return;
    const { H, u, t } = beach, dim = 1 - Math.min(1, fog) * 0.45;
    for (const f of this.list) {
      if (f.y === null || f.y - f.size > H || f.a <= 0) continue;
      const bob = Math.sin(t * 1.8 + f.ph) * 2.2 * u, tilt = Math.sin(t * 1.3 + f.ph) * 0.1;
      const im = this.sprites[f.s % this.sprites.length], k = f.size / Math.max(im.width, im.height) * 1.25;
      const A = f.a * dim;
      ctx.save();
      // 동그란 물결 두 겹 (병·상자와 같은 박자, 잎이라 조금 옅게)
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.1 * u;
      for (let j = 0; j < 2; j++) {
        const ph = (t * 0.45 + j * 0.5 + f.ph) % 1;
        ctx.globalAlpha = (1 - ph) * 0.45 * A;
        ctx.beginPath(); ctx.ellipse(f.x, f.y + 3 * u, f.size * (0.42 + ph * 0.45), f.size * (0.2 + ph * 0.18), 0, 0, 6.29); ctx.stroke();
      }
      // 물에 비친 그림자 — 까딱일 때 잎만 뜨고 그림자는 물에 남는다
      ctx.globalAlpha = 0.22 * A; ctx.fillStyle = '#0b2b3a';
      ctx.beginPath(); ctx.ellipse(f.x + 3 * u, f.y + 5 * u, f.size * 0.36, f.size * 0.22, f.rot, 0, 6.29); ctx.fill();
      ctx.globalAlpha = A;
      ctx.translate(f.x, f.y + bob); ctx.rotate(f.rot + tilt);
      ctx.scale(k, k * (1 - Math.abs(Math.sin(t * 1.3 + f.ph)) * 0.06));   // 기울 때 살짝 납작 (물결에 얹힌 느낌)
      ctx.drawImage(im, -im.width / 2, -im.height / 2);
      ctx.restore();
    }
  }
}

// 하늘에서 날리는 잎 (단풍형 장소만 — 다른 곳은 atmos.js 의 작은 잎 점 그대로)
//  맑음·흐림: 가끔 한두 장이 비스듬히 천천히 떨어진다 · 바람: 많이·빠르게 옆으로, 물 위를 지나면 가끔 내려앉는다
//  비: 젖어서 거의 곧장 떨어진다 · 눈: 없음 · 안개: 가까이서만(옅게). 물 위로 떨어진 잎은 onLand(x, 칸) 으로 물 위 잎이 된다.
export class AirLeaves {
  constructor(rand = Math.random) { this.rand = rand; this.list = []; this.set = null; this.t = 0; this.onLand = null; }
  setSprites(set) { this.set = set && set.air.length ? set : null; this.list = []; }
  get busy() { return this.list.length > 0; }

  want(v, area) {
    if (!this.set || (v.snow || 0) > 0.3) return 0;
    const wind = v.wind || 0, rain = v.rain || 0;
    if (rain > 0.3) return Math.round(2 * Math.sqrt(area * 2));
    return Math.round((1.5 + wind * 16) * Math.sqrt(area * 2));
  }

  spawn(W, H, u, v, first) {
    const R = this.rand, set = this.set, seed = set.seeds.length && R() < 0.3;
    const wind = v.wind || 0, rain = v.rain || 0;
    const blown = wind > 0.3 && rain < 0.3;
    return {
      seed, s: Math.floor(R() * (seed ? set.seeds.length : set.air.length)),
      x: blown ? -30 * u - R() * W * (first ? 1 : 0.3) : R() * W,
      y: blown ? R() * H * 0.9 : -30 * u - (first ? R() * H : 0),
      vx: blown ? (100 + R() * 110) * u : (8 + R() * 22) * u * (rain > 0.3 ? 0.3 : 1),
      vy: blown ? (R() - 0.3) * 18 * u : (rain > 0.3 ? 120 + R() * 60 : 22 + R() * 18) * u,
      size: (seed ? 20 : 24 + R() * 10) * u * set.size,
      rot: R() * 6.28, spin: (R() - 0.5) * (seed ? 14 : 4), ph: R() * 6.28,
    };
  }

  update(dt, beach, v) {
    this.t += dt;
    if (!this.set) { this.list.length = 0; return; }
    const { W, H, u } = beach, area = (W * H) / (1280 * 800), R = this.rand;
    const n = this.want(v, area);
    while (this.list.length < n) this.list.push(this.spawn(W, H, u, v, true));
    if (this.list.length > n) this.list.length = n;
    const wind = v.wind || 0;
    for (let i = 0; i < this.list.length; i++) {
      const l = this.list[i];
      l.x += (l.vx + wind * 40 * u) * dt;
      l.y += (l.vy + Math.sin(this.t * 1.7 + l.ph) * 14 * u) * dt;
      l.rot += l.spin * dt;
      const edge = beach.edge ? beach.edge(l.x) : Infinity;
      const overWater = l.y > edge + 14 * u;
      // 물 위로 떨어진 잎: 떨어지는 중이면 늘, 바람에 날리는 중이면 가끔 내려앉는다 (씨앗은 내려앉지 않는다 — 물 위엔 잎만)
      const lands = overWater && !l.seed && (l.vy > 30 * u || R() < dt * 0.5);
      if (lands && this.onLand) this.onLand(l.x, l.s);
      if (lands || overWater && l.seed || l.x > W + 40 * u || l.y > H + 40 * u) this.list[i] = this.spawn(W, H, u, v, false);
    }
  }

  draw(ctx, fog = 0) {
    if (!this.set) return;
    const A = 1 - Math.min(1, fog) * 0.6;
    for (const l of this.list) {
      const im = (l.seed ? this.set.seeds : this.set.air)[l.s];
      if (!im) continue;
      const k = l.size / Math.max(im.width, im.height);
      ctx.save(); ctx.globalAlpha = A;
      ctx.translate(l.x, l.y); ctx.rotate(l.rot);
      const c = Math.cos(this.t * 2.4 + l.ph), flip = l.seed ? 1 : (c < 0 ? -1 : 1) * (0.25 + Math.abs(c) * 0.75);   // 잎은 뒤집히듯 팔랑
      ctx.scale(k * flip, k);
      ctx.drawImage(im, -im.width / 2, -im.height / 2);
      ctx.restore();
    }
  }
}
