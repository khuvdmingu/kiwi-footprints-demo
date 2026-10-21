// sky/kiwi-react.js — v23 날씨에 반응하는 키위
//
//  비(보슬비는 약하게): 키위마다 성격이 있어 절반쯤은 큰 잎을 우산처럼 부리에 물고(assets/umbrellas.webp 2×2, Higgsfield v23 —
//                     토란잎·열대 잎 / 가을 장소는 단풍·은행잎), 걸음마다 같이 들썩이고 용수철처럼 한 박자 늦게 흔들린다.
//                     글씨를 쓰는(부리로 콕 찍는) 동안엔 잠깐 내려놓는다. 그 밖엔 나머지는 가끔 한 마리씩 덤불 밑으로 비를 피하러 간다.
//                     그치면 잎을 접는다.
//  바람(꽃잎 바람도 약하게): 키위마다 다른 박자로 바람 쪽(오른쪽)으로 기우뚱, 가끔 센 돌풍에 크게 휘청 · 깃털이 한 올씩 날아간다.
//  main.js 는 매 프레임 update(dt, kiwis, atmos.v, beach) 를 부르고, 그릴 때 drawLeaning(ctx, k, () => k.draw(ctx)) 로 감싸고
//  drawUmbrella(ctx, k) · drawFeathers(ctx, u) 를 키위 위에 얹는다. 키위 그림(kiwi.js)은 건드리지 않는다.

import { clamp } from '../util.js?v=v28.6.0';
import { headPose } from '../kiwi.js?v=v28.6.0';

export const UMB_SHARE = 0.45;   // 우산을 드는 성격의 비율
const SHEET = 'assets/umbrellas.webp?v=v28.6.0';
const HOODS = 'assets/hoods.webp?v=v28.6.0';   // v27.7 머리에 얹는 잎 2×2 (Higgsfield nano_banana_pro: 토란잎 · 몬스테라 / 바나나잎 · 연잎, 옆에서 본 둥근 지붕 모양)
const HOOD_SHARE = 0.5;               // 우산을 드는 키위 가운데 머리에 얹는 성격의 비율
const GREEN = [1, 1, 0], AUTUMN = [2, 3];   // 칸: 0 토란잎 · 1 열대 잎(양산 모양이라 더 자주) / 2 단풍 · 3 은행잎
// 키위 그림 기준(k 배수, 오른쪽을 볼 때): 부리 끝 (0.79, −0.48) · 머리 꼭대기 (−0.07, −0.89) — kiwi.webp 에서 잰 값
const BITE = [0.64, -0.5];        // 줄기를 무는 자리 (부리 60% 쯤)
const STEM = ['#5f8a3e', '#4f7a3a', '#c4552c', '#d9a035'];   // 칸마다 줄기 색 (그림에서 고름)
// v27.6 잎을 더 뒤로 눕히고 길게 받쳐 등까지 덮는 양산처럼 (예전 −0.5 · 0.42 · 1.2 는 머리 앞에 깃발처럼 섰다)
const TILT = -0.78, EXT = 0.5, SIZE = 1.38;
const approach = (a, b, d) => (a < b ? Math.min(b, a + d) : Math.max(b, a - d));

export class KiwiWeather {
  constructor({ rand = Math.random } = {}) { this.rand = rand; this.feathers = []; this.drips = []; this.wet = 0; this.hoods = null; this.t = 0; this.shelterAt = 4; this.mapId = 'beach'; this.sprites = null; }   // mapId: 합칠 때 main.js 가 알려 준다
  static wetness(v) { return clamp((v.rain || 0) + (v.drizzle || 0) * 0.6, 0, 1); }
  static windiness(v) { return clamp((v.wind || 0) + (v.blossom || 0) * 0.5, 0, 1); }

  update(dt, kiwis, v, beach) {
    this.t += dt;
    const wet = KiwiWeather.wetness(v), wind = KiwiWeather.windiness(v), u = beach.u || 1, R = this.rand;
    this.wet = wet;
    for (const k of kiwis) {
      if (k.gone) continue;
      if (k.umbPick == null) k.umbPick = R();
      // 글씨를 쓰러 가거나 콕 찍는 중엔 내려놓는다 (부리가 바쁘다)
      const writing = k.busy || k.state === 'peck' || k.state === 'dig';
      const want = wet > 0.35 && k.umbPick < UMB_SHARE && !k.asleep && !writing;
      k.umb = approach(k.umb || 0, want ? 1 : 0, dt * (want ? 1.1 : 3));
      if (k.umbStyle == null) { k.umbStyle = R() < HOOD_SHARE ? 'hood' : 'beak'; k.hoodKind = Math.floor(R() * 4); }   // v27.7 부리에 물기 / 머리에 얹기
      if (k.umbKind == null || k.umbMap !== this.mapId) { const set = this.mapId === 'fall' ? AUTUMN : GREEN; k.umbKind = set[Math.floor(R() * set.length)]; k.umbMap = this.mapId; }
      // 흔들림(용수철): 걸으면 잎이 뒤로 젖혀지고 걸음마다 까딱, 바람은 바람 쪽으로 — 한 박자 늦게 따라와 출렁인다
      if (k.umb > 0) {
        const moving = (k.v || 0) > 3, f = k.face || 1;
        const goal = (moving ? -0.16 - Math.sin(k.phase || 0) * 0.05 : 0) + (k.lean || 0) * 1.8 * f;
        k.umbV = (k.umbV || 0) + ((goal - (k.umbA || 0)) * 38 - (k.umbV || 0) * 5.5) * dt;
        k.umbA = (k.umbA || 0) + k.umbV * dt;
        // v27.6 잎 끝(등 뒤쪽)에서 빗물이 똑똑 — 비가 셀수록 자주, 걷는 중엔 덜
        if (k.umb > 0.9 && wet > 0.35 && R() < dt * (moving ? 0.6 : 1.6) * wet) {
          const sz = k.k, back = -f * (0.32 + R() * 0.18) * sz;
          this.drips.push({ x: k.x + back, y: k.y - (0.95 + R() * 0.1) * sz, gy: k.y - 0.02 * sz, v: 0, age: 0, s: 0.028 * sz, splash: 0 });
        }
      }
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
    for (const d of this.drips) { d.age += dt; if (d.splash) d.splash += dt; else { d.v += 900 * u * dt; d.y += d.v * dt; if (d.y >= d.gy) { d.y = d.gy; d.splash = 0.001; } } }
    this.drips = this.drips.filter(d => d.age < 2 && d.splash < 0.35);
    for (const f of this.feathers) { f.age += dt; f.x += (f.vx + wind * 60 * u) * dt; f.y += (f.vy + Math.sin(f.age * 4) * 18 * u) * dt; f.vy += 14 * u * dt; f.rot += f.spin * dt; }
    this.feathers = this.feathers.filter(f => f.age < f.life);
  }

  // 발밑을 축으로 기울여 그린다
  //  잎 우산은 키위보다 먼저(뒤 층에) 그린다 — 들고 있어도 얼굴이 늘 보이게. 부리를 가로지르는 줄기 한 토막만 drawUmbrella 가 앞에 얹는다
  drawLeaning(ctx, k, draw) {
    const a = k.lean || 0, lean = Math.abs(a) >= 0.003;
    if (lean) { ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(a); ctx.translate(-k.x, -k.y); }
    this.umbrella(ctx, k, 'back');
    draw();
    if (lean) ctx.restore();
  }

  // 잎 우산 낱장: 처음 필요할 때 읽어 칸마다 자르고, 줄기 끝(가장 아래 불투명 점)과 잎 폭을 재 둔다
  sheet() {
    if (this.sprites !== null || typeof Image === 'undefined') return this.sprites || null;
    this.sprites = false;
    const im = new Image();
    im.onload = () => {
      const cw = Math.round(im.naturalWidth / 2), ch = Math.round(im.naturalHeight / 2), list = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
        const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
        const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(im, c * cw, r * ch, cw, ch, 0, 0, cw, ch);
        const a = g.getImageData(0, 0, cw, ch).data, on = (x, y) => a[(y * cw + x) * 4 + 3] > 80;
        let x0 = cw, x1 = 0, y0 = ch, y1 = 0;
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (on(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        let sx = 0, n = 0;
        for (let y = y1 - 6; y <= y1; y++) for (let x = x0; x <= x1; x++) if (on(x, y)) { sx += x; n++; }
        list.push({ cv, ax: n ? sx / n : (x0 + x1) / 2, ay: y1, w: x1 - x0, h: y1 - y0 });
      }
      this.sprites = list;
    };
    im.src = SHEET;
    return null;
  }

  // 부리에 문 자리: 줄기 한 토막을 키위 위에 얹어 "물고 있는" 모양으로 (잎은 drawLeaning 이 뒤 층에 이미 그렸다)
  drawUmbrella(ctx, k) { this.umbrella(ctx, k, 'front'); }

  // 잎 우산: 키위 그림과 똑같이 움직이는 몸 좌표(위치·깡총·방향·걸음 들썩)에서, 부리에 문 줄기 끝을 축으로 그린다
  //  layer 'back' = 잎 + 줄기 전체 · 'front' = 부리 근처 줄기 한 토막
  umbrella(ctx, k, layer) {
    const m = k.umb || 0;
    if (m < 0.02 || k.vis === 0 || k.asleep) return;
    const s = k.k, f = k.face || 1, moving = (k.v || 0) > 3, st = moving ? Math.sin(k.phase || 0) : 0;
    const bob = moving ? Math.abs(st) * 0.035 * s : Math.sin((k.clock || 0) * 2.2 + (k.id || 0)) * 0.006 * s;
    // 펼칠 때 톡 커지며(살짝 넘쳤다 돌아옴) 나타나고, 내려놓을 땐 작아진다
    const pop = m >= 1 ? 1 : 1 + 2.4 * Math.pow(m - 1, 3) + 1.4 * Math.pow(m - 1, 2);
    const sp = this.sheet();
    ctx.save();
    if (layer === 'front' && Math.abs(k.lean || 0) >= 0.003) { ctx.translate(k.x, k.y); ctx.rotate(k.lean); ctx.translate(-k.x, -k.y); }   // 뒤 층은 drawLeaning 안에서 이미 기울었다
    ctx.globalAlpha = Math.min(1, m * 1.6) * (k.vis ?? 1);
    ctx.translate(k.x, k.y - (k.hopY ? k.hopY() : 0));
    ctx.scale(f, 1);
    ctx.translate(0, -bob);
    if (moving) { ctx.translate(0, -0.15 * s); ctx.rotate(st * 0.035); ctx.translate(0, 0.15 * s); }
    // v27.6 동작 중엔 머리를 따라간다 (콕콕·킁킁에 숙이면 잎도 같이, 두리번에 돌면 같이) — 머리를 단단한 몸으로 보고 무는 자리째 옮기고 돌린다
    const hp = headPose(k);
    if (k.umbStyle === 'hood') { const hs = this.hoodSheet(); if (hs) { this.hood(ctx, k, layer, hs, s, hp); ctx.restore(); return; } }   // 그림을 아직 못 읽었으면 부리에 물기로
    if (hp) { ctx.translate((hp.hx + hp.dx) * s, (hp.hy + hp.dy) * s); ctx.rotate(hp.a); ctx.translate(-hp.hx * s, -hp.hy * s); }
    ctx.translate(BITE[0] * s, BITE[1] * s);
    ctx.rotate(TILT + (k.umbA || 0) - (hp ? hp.a * 0.6 : 0));   // 줄기는 머리를 따라 돌되 잎은 하늘 쪽을 조금 지킨다 (물고 있는 잎이 물구나무서지 않게)   // 줄기를 뒤로 눕혀 잎이 머리·등 위로 온다
    ctx.scale(pop, pop);
    if (layer === 'front') {
      ctx.strokeStyle = STEM[k.umbKind] || '#4f7a3a'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.2, 0.034 * s);
      ctx.beginPath(); ctx.moveTo(0, 0.05 * s); ctx.lineTo(0.004 * s, -0.07 * s); ctx.stroke();
    } else if (sp && sp[k.umbKind]) {
      // 부리에서 위로 줄기를 조금 더 그려 잎을 머리 위로 띄운다 (그림 속 줄기와 같은 색, 끝은 가늘게)
      //  잎 폭 ≈ 키위 몸 길이 · 위에서 내려다보는 화면이라 세로로 조금 눌러 양산처럼 펼쳐 보이게
      const c = sp[k.umbKind], sc = (SIZE * s) / c.w, sy = sc * 0.8, ext = EXT * s;
      ctx.strokeStyle = STEM[k.umbKind]; ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.2, 0.034 * s);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.03 * s, -ext * 0.5, 0, -ext - 2); ctx.stroke();
      ctx.drawImage(c.cv, -c.ax * sc, -ext - c.ay * sy, c.cv.width * sc, c.cv.height * sy);
    } else {
      // 그림을 읽기 전: 선으로 그린 잎 (줄기 + 잎)
      ctx.strokeStyle = '#4a6b2e'; ctx.lineWidth = Math.max(1, 0.03 * s); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -0.5 * s); ctx.stroke();
      ctx.fillStyle = '#5c9a42';
      ctx.beginPath(); ctx.ellipse(0, -0.62 * s, 0.55 * s, 0.2 * s, 0, 0, 6.29); ctx.fill();
    }
    ctx.restore();
  }

  // 머리에 얹는 잎 낱장: 칸마다 잘라 잎의 상자(줄기 포함)를 재 둔다
  hoodSheet() {
    if (this.hoods !== null || typeof Image === 'undefined') return this.hoods || null;
    this.hoods = false;
    const im = new Image();
    im.onload = () => {
      const cw = Math.round(im.naturalWidth / 2), ch = Math.round(im.naturalHeight / 2), list = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
        const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
        const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(im, c * cw, r * ch, cw, ch, 0, 0, cw, ch);
        const a = g.getImageData(0, 0, cw, ch).data;
        let x0 = cw, x1 = 0, y0 = ch, y1 = 0;
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (a[(y * cw + x) * 4 + 3] > 80) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        list.push({ cv, x0, x1, y0, y1 });
      }
      this.hoods = list;
    };
    im.src = HOODS;
    return null;
  }

  // v27.7 머리에 얹기: 둥근 잎을 머리·등 위에 지붕처럼 — 키위 앞 층(덮고 있으니까), 줄기는 부리 쪽으로 늘어진다.
  //  머리를 반쯤만 따라간다(숙이면 앞으로 미끄러지듯, 고개를 젖혀도 등에 남는다)
  hood(ctx, k, layer, hs, s, hp) {
    if (layer !== 'front') return;
    const c = hs[k.hoodKind ?? 0]; if (!c) return;
    if (hp) { ctx.translate(hp.dx * 0.45 * s, hp.dy * 0.45 * s); ctx.rotate(hp.a * 0.2); }
    ctx.rotate((k.umbA || 0) * 0.35);
    const w = c.x1 - c.x0, h = c.y1 - c.y0, sc = (1.02 * s) / w;   // 줄기까지 몸 길이쯤
    // 잎 상자의 가로 가운데를 등 가운데 조금 앞(머리 쪽)에, 상자 위에서 62% 높이를 몸 윗선에 맞춘다
    const ax = 0.04 * s, ay = -0.66 * s;
    ctx.drawImage(c.cv, ax - (c.x0 + w / 2) * sc, ay - (c.y0 + h * 0.62) * sc, c.cv.width * sc, c.cv.height * sc);
  }

  drawFeathers(ctx) {
    // v27.6 잎에서 떨어지는 빗물: 떨어지는 동안 짧은 줄, 땅에 닿으면 작은 고리로 번진다
    if (this.drips.length) {
      ctx.save(); ctx.lineCap = 'round';
      for (const d of this.drips) {
        if (!d.splash) { ctx.strokeStyle = 'rgba(215,232,245,0.85)'; ctx.lineWidth = d.s; ctx.beginPath(); ctx.moveTo(d.x, d.y - d.s * 2.2); ctx.lineTo(d.x, d.y); ctx.stroke(); }
        else { const p = d.splash / 0.35; ctx.strokeStyle = `rgba(215,232,245,${0.7 * (1 - p)})`; ctx.lineWidth = Math.max(0.6, d.s * 0.5); ctx.beginPath(); ctx.ellipse(d.x, d.y, d.s * (1.5 + 5 * p), d.s * (0.5 + 1.6 * p), 0, 0, 6.29); ctx.stroke(); }
      }
      ctx.restore();
    }
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
