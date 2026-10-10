// beach.js — 해변의 "사실"(물 높이·젖은 모래·발자국)과 발자국 그림
//  v8: 해변은 그림 판(plate.js)이다. 해안선·숲 가장자리를 그림에서 읽어 와 그 위에 파도를 얹는다.
//  · 해안선 식 edge(x) = 그려진 해안선 − 파도 높이 + 잔물결 → water.js 가 같은 값으로 바다를 움직인다
//  · 숲 가장자리 식 grass(x) = 그려진 숲 가장자리
//  · 큰 파도: surge(y) — 오르기 · 머물기 · 빠지기. 물이 지나간 자리는 한동안 젖어 있다(wet)
//  · 발자국: 'deep' 글씨 획 · 'faint' 오가는 길(곧 사라짐) · 'hole' 부리 자국
//  · 지우개(v18): 물가선 edge(x) 는 "발자국을 지우는 경계선"이다. 물이 아닌 장소(eraser 'rake' — 젠 가든)에서는
//    같은 줄이 잔물결·밀물 없이 가만히 있고, 지우기는 zen.js 가 발자국에 직접 표시한다(p.erase — 다시 긋는 갈퀴 줄)

import { clamp, easeOut, easeInOut } from './util.js?v=v18.1.2';
import { PAL } from './tokens.js?v=v18.1.2';

const RISE = 1.5, HOLD = 0.5, FALL = 3.2;
const FAINT = 0.22, FAINT_LIFE = 2.2;
// 그냥 콕 찍은 구멍(심심해서 콕 · 모래를 눌러 부른 콕 — 글자의 점이 아닌 것)은 잠시 남았다가 모래가 덮는다
const HOLE_LIFE = 10, HOLE_FADE = 4;

export class Beach {
  constructor(seed = 7) {
    this.seed = seed;
    this.t = 0;
    this.prints = [];
    this.bw = null;
    this.lvl = 0;
    this.wet = new Float32Array(128);
    this.amp = 1;     // 파도 높이 배율 (바람 부는 날 크게)
    this.snow = 0;    // 눈 쌓인 정도 0~1
  }

  resize(W, H, dpr, plate) {
    Object.assign(this, { W, H, dpr });
    this.snowGround = !!plate.snowGround;   // 눈밭: 발자국은 처음부터 푸르스름한 눈 그늘
    this.eraser = plate.opts.eraser || 'water';   // 무엇이 지우나: 물(파도) · 'rake'(갈퀴)
    this.still = this.eraser !== 'water';           // 물이 아니면 경계선이 출렁이지 않는다
    this.gravel = plate.opts.ground === 'gravel';
    this.u = Math.min(W, H) / 800;
    // 그림에서 읽은 해안선·숲 줄을 4px 간격으로 미리 재 둔다
    const n = Math.ceil(W / 4) + 2;
    this.shoreC = new Float32Array(n); this.grassC = new Float32Array(n);
    for (let i = 0; i < n; i++) { this.shoreC[i] = plate.shore(i * 4); this.grassC[i] = plate.forest(i * 4) + 6 * this.u; }
    // 물이 넘지 않는 바닥선: 숲 줄을 넓게 펴서(바위 자리의 급한 꺾임을 없애) 조금 아래로
    this.floorC = new Float32Array(n);
    for (let i = 0; i < n; i++) { let t = 0, c = 0; for (let k = -30; k <= 30; k++) { const j = i + k; if (j >= 0 && j < n) { t += this.grassC[j]; c++; } } this.floorC[i] = t / c + 30 * this.u; }
    // 대표값: 가운데 70% 구간의 평균 (숲 줄은 가장 낮은 곳)
    let sh = 0, gm = 0, sm = 0, c = 0;
    for (let x = W * 0.15; x <= W * 0.85; x += 4) { sh += this.shoreAt(x); gm = Math.max(gm, this.grass(x)); sm = Math.max(sm, this.shoreAt(x)); c++; }
    this.shoreY = sh / c; this.bushY = gm; this.shoreMax = sm;
    this.lvl = this.shoreY;
    for (let i = 0; i < this.wet.length; i++) this.wet[i] = this.shoreAt((i / (this.wet.length - 1)) * W);
  }
  lerpC(a, x) { const f = Math.max(0, Math.min(a.length - 1.001, x / 4)), i = Math.floor(f), t = f - i; return a[i] * (1 - t) + a[i + 1] * t; }
  shoreAt(x) { return this.lerpC(this.shoreC, x); }

  // ── 파도 ──
  surge(y) { this.bw = { t0: this.t, L: Math.max(0, this.shoreMax - y) }; return RISE; }
  get surging() { return !!this.bw; }

  level() {
    const t = this.t;
    let lift = this.still ? 0 : Math.pow(0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 7.3), 3) * this.H * 0.03 - this.H * 0.006;
    this.surgeK = 0;
    if (this.bw) {
      const e = t - this.bw.t0, L = this.bw.L;
      let f;
      if (e < RISE) f = easeOut(e / RISE);
      else if (e < RISE + HOLD) f = 1;
      else if (e < RISE + HOLD + FALL) f = 1 - easeInOut((e - RISE - HOLD) / FALL);
      else { f = 0; this.bw = null; }
      lift = Math.max(lift, L * f);
      this.surgeK = e < RISE + HOLD ? Math.min(1, e / 0.4) : f;
    }
    return this.shoreY - lift;
  }

  // 해안선: 그려진 해안선을 파도 높이만큼 올리고, 밀려왔다 빠지는 잔물결을 얹는다
  edge(x) {
    const u = this.u, t = this.t, big = this.still ? 0 : (this.bw ? 1.6 : 1) * this.amp;
    const y = this.shoreAt(x) - (this.shoreY - this.lvl) + u * big * (4.5 * Math.sin((x * 0.009) / u + t * 0.8) + 2.5 * Math.sin((x * 0.023) / u - t * 1.1) + 1.2 * Math.sin((x * 0.06) / u + t * 0.5));
    // 물은 숲 안까지 들어가지 않는다 — 부드러운 최댓값이라 닿는 자리에서도 꺾이지 않는다
    const f = this.lerpC(this.floorC, x), k = 18 * u;
    return 0.5 * (y + f + Math.sqrt((y - f) * (y - f) + k * k));
  }
  // 숲 가장자리 (그림에서 읽은 줄)
  grass(x) { return this.lerpC(this.grassC, x); }

  wet128() { return this.wet; }

  // ── 발자국 ──
  // tag = 몇 번째 글자의 발자국인지 (시계가 바뀐 글자만 지울 때 쓴다)
  addPrint(x, y, a, f, kind = 'deep', tag) {
    if (y > this.edge(x) - 2) return;
    if (kind === 'faint') f *= 0.8;
    this.prints.push({ x, y, a, f, kind, tag, born: this.t, alpha: kind === 'faint' ? FAINT : 1, wash: false });
    if (this.prints.length > 4000) this.prints.splice(0, this.prints.length - 4000);
  }
  // 초 발자국: 키위가 아니라 모래가 매초 스스로 눌린다 (born 이 미래면 그때 찍힌다)
  addSec(x, y, a, f, born) { this.prints.push({ x, y, a, f, kind: 'sec', born, alpha: 0, wash: false, die: 0 }); }
  // 글자 하나 지우기: 모래가 스르르 덮는다 (0.9초)
  erase(tags) { for (const p of this.prints) if (p.tag != null && tags.has(p.tag) && !p.erase) p.erase = this.t; }
  get printCount() { return this.prints.filter(p => p.kind === 'deep' && !p.wash).length; }

  update(dt) {
    this.t += dt;
    this.lvl = this.level();
    const step = this.W / 127, dry = this.H * 0.012 * dt;   // 젖은 모래는 화면 높이 기준으로 마른다 (작은 화면에서도 30초 남짓)
    for (let i = 0; i < 128; i++) {
      const e = this.edge(i * step);
      this.wet[i] = e < this.wet[i] ? e : Math.min(e, this.wet[i] + dry);
    }
    for (const p of this.prints) {
      if (!p.wash && p.y > this.edge(p.x) - 1) p.wash = true;
      if (p.erase) p.alpha = Math.min(p.alpha, clamp(1 - (this.t - p.erase) / 0.9, 0, 1));
      if (p.wash) p.alpha -= dt * 2.2;
      else if (p.kind === 'faint') p.alpha = FAINT * clamp(1 - (this.t - p.born) / FAINT_LIFE, 0, 1);
      else if (p.kind === 'hole' && p.tag == null) p.alpha = clamp(1 - (this.t - p.born - HOLE_LIFE) / HOLE_FADE, 0, 1);
      else if (p.kind === 'sec') p.alpha = clamp((this.t - p.born) / 0.1, 0, 1) * (p.die ? clamp(1 - (this.t - p.die) / 0.28, 0, 1) : 1);
    }
    this.prints = this.prints.filter(p => p.alpha > 0.01 || (p.kind === 'sec' && !p.die && !p.wash));
  }

  // ── 그리기 (2D 층) ──
  clipLand(ctx) {
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    for (let x = -10; x <= this.W + 10; x += 8) ctx.lineTo(x, this.edge(x) - 1);
    ctx.lineTo(this.W + 10, -10);
    ctx.closePath();
    ctx.clip();
  }
  drawPrints(ctx) {
    const groups = new Map();
    for (const p of this.prints) {
      const k = p.kind + Math.round(p.alpha * 8);
      if (!groups.has(k)) groups.set(k, { kind: p.kind, alpha: Math.round(p.alpha * 8) / 8, f: p.f, path: new Path2D() });
      const g = groups.get(k);
      if (p.kind === 'hole') { g.path.moveTo(p.x + p.f * 0.3, p.y); g.path.ellipse(p.x, p.y, p.f * 0.3, p.f * 0.22, 0, 0, Math.PI * 2); }
      else addFoot(g.path, p.x, p.y, p.a, p.f);
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 모래 위 발자국은 한 톤 짙은 모래색, 눈 위에서는 푸르스름한 그늘
    const sn = this.snow > 0.35 || this.snowGround;
    // 자갈(젠 가든) 위에서는 회갈색으로 눌린 홈
    const C = sn ? ['#BCC4CF', '#9AA6B6', '#B0BAC7', '#8C98AA'] : this.gravel ? ['rgba(104,96,84,0.5)', 'rgba(80,73,63,0.55)', 'rgba(104,96,84,0.55)', 'rgba(76,70,60,0.55)'] : ['rgba(150,96,48,0.55)', 'rgba(112,66,30,0.55)', 'rgba(150,96,48,0.6)', 'rgba(105,62,28,0.6)'];
    const LIT = sn ? 'rgba(255,255,255,0.7)' : this.gravel ? 'rgba(255,253,246,0.75)' : 'rgba(255,240,205,0.75)';
    for (const g of groups.values()) {
      ctx.globalAlpha = g.alpha;
      if (g.kind === 'hole') {
        ctx.save(); ctx.translate(g.f * 0.05, g.f * 0.07); ctx.fillStyle = LIT; ctx.fill(g.path); ctx.restore();
        ctx.fillStyle = C[2]; ctx.fill(g.path);
        ctx.save(); ctx.translate(0, -g.f * 0.07); ctx.fillStyle = C[3]; ctx.fill(g.path); ctx.restore();
        continue;
      }
      ctx.save(); ctx.translate(g.f * 0.06, g.f * 0.08); ctx.lineWidth = g.f * 0.4; ctx.strokeStyle = LIT; ctx.stroke(g.path); ctx.restore();
      ctx.lineWidth = g.f * 0.4;
      ctx.strokeStyle = C[0]; ctx.stroke(g.path);
      ctx.save(); ctx.translate(0, -g.f * 0.07); ctx.lineWidth = g.f * 0.26; ctx.strokeStyle = C[1]; ctx.stroke(g.path); ctx.restore();
    }
    ctx.restore();
  }
}

// 키위 발자국: 통통한 앞발가락 셋 + 짧은 뒷발가락. (x, y) = 발꿈치, a = 걷는 방향
function addFoot(path, x, y, a, f) {
  const toe = (da, len) => { path.moveTo(x, y); path.lineTo(x + Math.cos(a + da) * len, y + Math.sin(a + da) * len); };
  toe(-0.55, f);
  toe(0, f * 1.12);
  toe(0.55, f);
  toe(Math.PI, f * 0.3);
}
