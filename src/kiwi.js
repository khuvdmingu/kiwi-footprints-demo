// kiwi.js — 키위 한 마리: 걸음·할 일 + 그림
//
// 키위는 날지 못한다. 그래서 걸어서 온다.
//  상태: free(할 일 기다림) · go(목표로 걷기) · write(획을 따라 걸으며 깊은 발자국) · peck(부리로 콕)
//        wander(어슬렁) · idle(멈춰 두리번) · flee(파도를 피해 숲으로 뛰기) — 숲에 닿으면 gone
//  그림(v4 = v2.3 의 레퍼런스 4번을 동숲풍 뉴트럴 톤으로 살짝 누름, 움직임은 느긋하게): 늘 옆모습(좌우만 뒤집는다). 큰 원 몸통 + 작은 원 머리,
//        외곽선 없는 평평한 갈색 + 종이 같은 자잘한 얼룩, 또렷한 검은 점 눈, 겨자색 굵은 부리(아래로 휨),
//        겨자색 굵은 다리와 부채꼴 세 발가락. 볼터치·깃털 결·큰 반짝 눈·정면은 쓰지 않는다.
//  v8: 몸은 그림(assets/kiwi.webp — 사용자 그림과 같은 붓 그림체로 Higgsfield 가 그린 몸통)을 쓰고, 다리만 코드로 그린다.
//      그림을 처음 읽을 때 알파를 훑어 부리 끝·몸 바닥을 찾아 크기·콕 각도를 맞춘다 (setKiwiSprite).
//  (x, y) = 발이 땅에 닿는 점. k = 몸 크기 단위 (꼬리 −0.41k ~ 부리 끝 +0.8k, 머리 꼭대기 −0.86k)

import { angleDiff, clamp, dist, Path } from './util.js?v=v15.2.0';
import { PAL as T, LIGHT } from './tokens.js?v=v15.2.0';

let ID = 0;
export let REACH = 0.8;             // 몸을 숙였을 때 부리 끝이 땅에 닿는 가로 거리 (k 배수) — 그림에서 다시 잰다
const HOP = 0.42;                   // 폴짝 한 번 (초) — v4: 느긋하게
let PECK_TILT = 0.39;               // 콕: 엉덩이를 축으로 몸을 숙이는 각 (부리 끝이 땅에 닿는 값) — 그림에서 다시 잰다
const HIP = [0.02, -0.15];          // 몸을 숙이는 축 (k 배수)
// v6: 디자인 토큰 색. 몸은 빛 받는 색을 먼저 깔고 바탕색을 빛 반대쪽으로 비켜 겹쳐, 왼쪽 위 테두리만 금빛으로 남긴다
const PAL = { body: T.kiwi, lit: T.kiwiLit, beak: T.beak, leg: T.beak, eye: T.eye, line: '#5A3A22', notes: T.kiwi };   // v7: 주황 부리·다리

// ── 몸 그림 ──
let SPR = null;
// v10 옷 입은 몸 그림: 같은 키위 그림을 편집해 만들어 자리·크기가 원본과 같다 → 원본의 자리 맞춤을 그대로 쓴다
const SKINS = {};
export function setKiwiSkins(map) { Object.assign(SKINS, map); }
export function setKiwiSprite(img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const a = g.getImageData(0, 0, w, h).data, on = (x, y) => a[(y * w + x) * 4 + 3] > 60;
  let x0 = w, x1 = 0, y0 = h, y1 = 0, tipY = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) { if (x < x0) x0 = x; if (x > x1) { x1 = x; tipY = y; } if (y < y0) y0 = y; if (y > y1) y1 = y; }
  let sx = 0, n = 0;
  for (let y = y1 - Math.round(h * 0.02); y <= y1; y++) for (let x = x0; x <= x1; x++) if (on(x, y)) { sx += x; n++; }
  const xb = n ? sx / n : (x0 + x1) / 2;
  const sc = 1.21 / (x1 - x0);                 // 꼬리~부리 끝 = 1.21k (예전 그림과 같은 크기)
  const BOT = -0.12;                           // 몸 바닥이 닿는 높이 (다리 윗부분을 덮는다)
  SPR = { img, x: -xb * sc, y: BOT - y1 * sc, w: w * sc, h: h * sc };
  // 부리 끝 (엉덩이 축 기준) → 땅에 닿는 숙임 각과 그때 부리 끝의 가로 거리
  const bx = (x1 - xb) * sc - HIP[0], by = BOT - (y1 - tipY) * sc - HIP[1];
  const R = Math.hypot(bx, by), phi = Math.atan2(-by, bx);
  PECK_TILT = Math.asin(Math.min(0.95, -HIP[1] / R)) + phi;
  REACH = HIP[0] + bx * Math.cos(PECK_TILT) - by * Math.sin(PECK_TILT);
}

export class Kiwi {
  constructor(x, y, a, k) {
    Object.assign(this, { x, y, a, k });
    this.id = ++ID;
    this.v = 0;
    this.phase = Math.random() * 6.28;
    this.foot = 0;
    this.stepAcc = 0;
    this.state = 'free';
    this.job = null;
    this.path = null;
    this.s = 0;
    this.goal = null;
    this.peck = 0;
    this.peckT = 0;
    this.timer = 0;
    this.gone = false;
    this.pace = 0.85 + Math.random() * 0.3;
    this.dir = 'side';       // 늘 옆모습 (콕 할 때 쓰는 값)
    this.face = 1;           // 옆모습 방향 (1 오른쪽, −1 왼쪽)
    this.clock = 0;
    this.still = 0;
    this.alertT = 0; this.alertDelay = 0;
    this.hop0 = -9; this.hops = 0;
    this.blinkAt = 1 + Math.random() * 3;
  }

  get busy() { return this.state === 'write' || this.state === 'peck' || (this.state === 'go' && this.job); }

  take(job) { this.job = job; this.path = new Path(job.pts); this.s = 0; this.state = 'go'; }
  wanderTo(x, y, then = 'idle', hole = null) { this.goal = { x, y }; this.after = then; this.hole = hole; this.job = null; this.state = 'wander'; }
  // (x, y) 를 부리로 콕: 옆에 서서 찍는다
  digAt(x, y) { const f = this.x <= x ? 1 : -1; this.wanderTo(x - f * REACH * this.k, y, 'dig', [x, y]); }
  flee(y) { this.goal = { x: this.x + (Math.random() - 0.5) * 60, y }; this.job = null; this.state = 'flee'; this.alert(Math.random() * 0.25); }
  alert(delay = 0) { this.alertDelay = delay; this.alertT = 0.9 + delay; }
  hop(n = 1, delay = 0) { this.hop0 = this.clock + delay; this.hops = n; }
  startle() { this.alert(); this.hop(1); }
  hopY() {
    const e = this.clock - this.hop0;
    if (e < 0 || e > this.hops * HOP) return 0;
    return Math.sin(Math.PI * ((e % HOP) / HOP)) * 0.3 * this.k;
  }

  walk(tx, ty, speed, dt, W, avoid = true) {
    let dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    if (avoid) {
      let ax = 0, ay = 0;
      const R = this.k * 0.8;
      for (const o of W.kiwis) {
        if (o === this || o.gone) continue;
        const ox = this.x - o.x, oy = this.y - o.y, od = Math.hypot(ox, oy);
        if (od > 0 && od < R) { const w = ((R - od) / R) * (o.state === 'write' ? 2.2 : 1); ax += (ox / od) * w; ay += (oy / od) * w; }
      }
      dx += ax * 1.4; dy += ay * 1.4;
    }
    const want = Math.atan2(dy, dx);
    const turn = angleDiff(this.a, want);
    this.a += clamp(turn, -5 * dt, 5 * dt);
    const target = speed * this.pace * Math.max(0.15, Math.cos(turn)) * Math.min(1, d / (this.k * 0.6) + 0.25);
    this.v += (target - this.v) * Math.min(1, dt * 5);
    const m = Math.min(this.v * dt, d);
    this.x += Math.cos(this.a) * m;
    this.y += Math.sin(this.a) * m;
    return m;
  }

  step(moved, W, kind) {
    if (!(W.stride > 0)) return;   // 안전장치: 보폭이 0 이하면 아래 반복이 끝나지 않는다
    this.phase += (moved / W.stride) * Math.PI;
    this.stepAcc += moved;
    while (this.stepAcc >= W.stride) {
      this.stepAcc -= W.stride;
      this.foot ^= 1;
      const side = this.foot ? 1 : -1;
      const lat = kind === 'deep' ? W.stride * 0.24 : this.k * 0.12;
      const px = this.x - Math.sin(this.a) * side * lat, py = this.y + Math.cos(this.a) * side * lat;
      W.beach.addPrint(px, py, this.a, W.foot, kind, kind === 'deep' && this.job ? this.job.item : undefined);
      // 글씨 획 위 발자국은 음 하나 (v5 발자국 음악) — 소리가 났으면 작은 ♪ 를 띄운다
      if (kind === 'deep' && W.sound.step(px, py) && W.onNote) W.onNote(px, py);
      else if (kind === 'faint' && W.sound.walkStep) W.sound.walkStep(px);   // v15.1 걷는 발자국에도 고른 소리를 작게
    }
  }

  beginPeck(n, holeAt, face) {
    this.state = 'peck'; this.peckT = 0; this.pecks = n; this.holeAt = holeAt; this.lastPeck = -1;
    this.dir = 'side'; this.face = face;
  }

  update(dt, W) {
    this.clock += dt;
    if (this.alertT > 0) this.alertT -= dt;
    switch (this.state) {
      case 'free':
        this.v *= Math.pow(0.02, dt);
        break;

      case 'go': {
        if (this.job.kind === 'peck') {
          const [px, py] = this.job.pts[0];
          const f = this.x <= px ? 1 : -1, sx = px - f * REACH * this.k;
          if (dist(this.x, this.y, sx, py) < W.stride * 0.5) { this.x = sx; this.y = py; this.beginPeck(2, [px, py], f); break; }
          this.step(this.walk(sx, py, W.speed, dt, W), W, 'faint');
          break;
        }
        const p = this.path.at(0);
        if (dist(this.x, this.y, p.x, p.y) < W.stride * 0.6) { this.state = 'write'; this.s = 0; break; }
        this.step(this.walk(p.x, p.y, W.speed, dt, W), W, 'faint');
        break;
      }

      case 'write': {
        const ahead = this.path.at(Math.min(this.path.len, this.s + W.stride * 0.8));
        const turn = angleDiff(this.a, ahead.a);
        this.a += clamp(turn, -10 * dt, 10 * dt);
        const go = Math.abs(turn) < 0.9 ? W.writeSpeed * this.pace * dt : 0;
        const prev = this.path.at(this.s);
        this.s = Math.min(this.path.len, this.s + go);
        const p = this.path.at(this.s);
        const moved = dist(prev.x, prev.y, p.x, p.y);
        this.x = p.x; this.y = p.y;
        this.v = moved / Math.max(dt, 1e-3);
        this.step(moved, W, 'deep');
        if (this.s >= this.path.len - 1e-6) {
          W.beach.addPrint(p.x, p.y, this.a, W.foot, 'deep', this.job.item);
          this.job.done = true; this.job = null; this.state = 'free';
        }
        break;
      }

      case 'peck': {
        this.v *= Math.pow(0.02, dt);
        const T = 0.42;
        this.peckT += dt;
        const n = Math.floor(this.peckT / T), f = (this.peckT % T) / T;
        this.peck = n < this.pecks ? Math.sin(Math.PI * f) : 0;
        if (n < this.pecks && f > 0.5 && this.lastPeck !== n) {
          this.lastPeck = n;
          const hx = this.holeAt ? this.holeAt[0] : this.x + this.face * REACH * this.k;
          const hy = this.holeAt ? this.holeAt[1] : this.y;
          W.beach.addPrint(hx, hy, 0, W.foot * (this.job ? 2.4 : this.holeAt ? 1.5 : 0.9), 'hole', this.job ? this.job.item : undefined);
          W.sound.peck(hx);
        }
        if (n >= this.pecks) {
          this.peck = 0;
          if (this.job) { this.job.done = true; this.job = null; }
          this.state = 'free';
        }
        break;
      }

      case 'wander': {
        if (dist(this.x, this.y, this.goal.x, this.goal.y) < this.k * 0.15 + 1) {
          if (this.after === 'dig' && this.hole) { this.beginPeck(2, this.hole, this.hole[0] >= this.x ? 1 : -1); this.hole = null; }
          else { this.state = 'idle'; this.timer = 0.6 + Math.random() * 2.2; }
          break;
        }
        this.step(this.walk(this.goal.x, this.goal.y, W.speed * (this.after === 'dig' ? 1 : 0.6), dt, W), W, 'faint');
        break;
      }

      case 'idle':
        this.v *= Math.pow(0.02, dt);
        this.timer -= dt;
        if (this.timer <= 0) {
          if (Math.random() < 0.45) this.beginPeck(1 + (Math.random() < 0.4), null, Math.random() < 0.5 ? 1 : -1);
          else this.state = 'free';
        }
        break;

      case 'flee': {
        if (this.alertT > 0.9) break;   // "!" 뜨는 동안 잠깐 멈칫
        this.step(this.walk(this.goal.x, this.goal.y, W.speed * 1.7, dt, W, false), W, 'faint');
        if (this.y < this.goal.y + this.k * 0.3) this.gone = true;
        break;
      }
    }

    // 보는 쪽: 왼쪽·오른쪽 중 걷는 쪽 (위아래로 걸을 땐 바꾸지 않는다 — 깜빡임 방지)
    if (this.state !== 'peck' && this.v > 3) {
      const c = Math.cos(this.a);
      if (Math.abs(c) > 0.3) this.face = c > 0 ? 1 : -1;
    }
  }

  // ── 그리기 ──
  drawShadow(ctx) {
    if (this.vis === 0) return;
    const k = this.k, h = this.hopY() / k;
    // 골든아워의 긴 그림자: 빛 방향(오른쪽 아래)으로 늘어진 부드러운 타원
    const [lx, ly] = LIGHT.dir, L = 0.55 * k * LIGHT.long * (1 + h * 0.8);
    const cx = this.x + lx * L * 0.75, cy = this.y + ly * L * 0.3;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, L * 1.1);
    g.addColorStop(0, `rgba(${T.shadow},${0.26 * (1 - h * 0.5)})`); g.addColorStop(1, `rgba(${T.shadow},0)`);
    ctx.save(); ctx.globalAlpha = this.vis ?? 1; ctx.translate(cx, cy); ctx.rotate(Math.atan2(ly, lx) * 0.5); ctx.scale(1, 0.32); ctx.translate(-cx, -cy);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, L * 1.1, 0, 6.29); ctx.fill();
    ctx.restore();
  }

  draw(ctx) {
    const k = this.k, moving = this.v > 3;
    if (this.vis === 0) return;
    ctx.globalAlpha = this.vis ?? 1;   // 숲 덤불 속에서는 안 보이다가 가장자리를 나서며 서서히 드러난다
    if (this.shade != null && this.shade < 0.97) ctx.filter = `brightness(${this.shade.toFixed(2)})`;
    const st = moving ? Math.sin(this.phase) : 0;
    const bob = moving ? Math.abs(st) * 0.035 * k : Math.sin(this.clock * 2.2 + this.id) * 0.006 * k;
    ctx.save();
    ctx.translate(this.x, this.y - this.hopY());
    ctx.scale(this.face, 1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // 다리·발: 겨자색 굵은 막대 + 앞으로 부채처럼 펼친 세 발가락
    ctx.strokeStyle = PAL.leg;
    for (const [hx, sgn] of [[-0.1, -1], [0.1, 1]]) {
      const sw = moving ? sgn * st * 0.09 * k : 0;
      const lift = moving ? Math.max(0, sgn * st) * 0.05 * k : 0;
      const fx = hx * k + sw, fy = -lift;
      ctx.lineWidth = 0.035 * k;
      ctx.beginPath(); ctx.moveTo(hx * k, -0.16 * k - bob); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.lineWidth = 0.045 * k;
      ctx.beginPath();
      for (const [tx, ty] of [[0.13, -0.005], [0.12, 0.04], [0.075, 0.072], [-0.03, 0.012]]) { ctx.moveTo(fx, fy); ctx.lineTo(fx + tx * k, fy + ty * k); }
      ctx.stroke();
    }

    // 몸 (콕 할 땐 엉덩이를 축으로 앞으로 숙인다): 큰 원 몸통 + 작은 원 머리, 외곽선 없이 평평하게
    ctx.translate(0, -bob);
    if (this.peck) { ctx.translate(HIP[0] * k, HIP[1] * k); ctx.rotate(this.peck * PECK_TILT); ctx.translate(-HIP[0] * k, -HIP[1] * k); }
    if (SPR) {
      // 걸을 때 몸이 살짝 앞뒤로 기우뚱 (그림 한 장이 살아 보이게)
      if (moving && !this.peck) { ctx.translate(0, -0.15 * k); ctx.rotate(st * 0.035); ctx.translate(0, 0.15 * k); }
      ctx.drawImage((this.skin && SKINS[this.skin]) || SPR.img, SPR.x * k, SPR.y * k, SPR.w * k, SPR.h * k);
    } else {
      const s = kiwiShape(k);
      ctx.fillStyle = PAL.body; ctx.fill(s.body);
      ctx.fillStyle = PAL.beak; ctx.fill(s.beak);
    }
    ctx.restore();

    ctx.filter = 'none';
    if (this.alertT > 0 && this.alertT <= 0.9) this.drawAlert(ctx, k, Math.max(1, k * 0.032));
    if (this.hops > 1 && this.clock - this.hop0 < this.hops * HOP + 0.6) this.drawNotes(ctx, k);
    ctx.globalAlpha = 1;
  }

  drawAlert(ctx, k, lw) {
    const age = 0.9 - this.alertT;
    const s = Math.min(1, age / 0.12) * (age < 0.12 ? 1.15 : 1);
    ctx.save();
    ctx.translate(this.x + this.face * 0.15 * k, this.y - this.hopY() - 1.12 * k);
    ctx.scale(s, s);
    const r = 0.17 * k;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 6.29);
    ctx.fillStyle = '#fffaf0'; ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = PAL.line; ctx.stroke();
    ctx.fillStyle = '#e0573f';
    ctx.beginPath(); ctx.roundRect(-0.024 * k, -0.11 * k, 0.048 * k, 0.12 * k, 0.024 * k); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0.075 * k, 0.027 * k, 0, 6.29); ctx.fill();
    ctx.restore();
  }

  // 신나서 폴짝일 때 머리 위로 떠오르는 음표
  drawNotes(ctx, k) {
    const e = this.clock - this.hop0;
    ctx.save();
    ctx.fillStyle = ctx.strokeStyle = PAL.body;
    ctx.lineWidth = Math.max(1, k * 0.028);
    for (let i = 0; i < 2; i++) {
      const t = e - i * 0.25;
      if (t < 0) continue;
      ctx.globalAlpha = Math.max(0, 1 - t / 1.2);
      const x = this.x + this.face * (0.3 + i * 0.22) * k, y = this.y - (1.05 + t * 0.5 + i * 0.12) * k;
      ctx.beginPath(); ctx.ellipse(x, y, 0.055 * k, 0.04 * k, -0.4, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 0.05 * k, y); ctx.lineTo(x + 0.05 * k, y - 0.2 * k); ctx.lineTo(x + 0.12 * k, y - 0.15 * k); ctx.stroke();
    }
    ctx.restore();
  }
}

// 몸·머리·부리·얼룩 경로 (크기마다 한 번 만들어 둔다, 오른쪽을 본다)
const SHAPE_CACHE = new Map();
function kiwiShape(k) {
  const key = Math.round(k * 10);
  if (SHAPE_CACHE.has(key)) return SHAPE_CACHE.get(key);
  const body = new Path2D();
  body.arc(-0.04 * k, -0.46 * k, 0.37 * k, 0, 6.29);           // 몸통
  body.moveTo(0.45 * k, -0.66 * k);
  body.arc(0.25 * k, -0.66 * k, 0.2 * k, 0, 6.29);             // 머리 (등과 사이가 살짝 들어간다)
  const beak = new Path2D();
  beak.moveTo(0.36 * k, -0.72 * k);
  beak.quadraticCurveTo(0.63 * k, -0.65 * k, 0.785 * k, -0.33 * k);
  beak.arc(0.765 * k, -0.322 * k, 0.026 * k, -0.4, 2.4);
  beak.quadraticCurveTo(0.56 * k, -0.565 * k, 0.37 * k, -0.6 * k);
  beak.closePath();
  // 얼룩: 몸 안 자잘한 점 (고정된 자리 — 키위마다 같다)
  const grainDark = new Path2D(), grainLight = new Path2D();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) {
    const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 0.33;
    const x = (-0.04 + Math.cos(a) * d) * k, y = (-0.46 + Math.sin(a) * d) * k, r = (0.006 + rnd() * 0.008) * k;
    const g = i % 2 ? grainDark : grainLight;
    g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.29);
  }
  const s = { body, beak, grainDark, grainLight };
  SHAPE_CACHE.set(key, s);
  return s;
}
