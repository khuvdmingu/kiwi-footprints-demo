// 항해 바다 생물 (2026-10-24) — 바다 생물 비교(sea-lab.html)에서 사용자: "지울 건 없고 움직임 보완,
//  한 번에 다 나오지 말고 하나·둘·몇 가지가 같이, 같은 동물(A·B)은 동시에 안 나오고 무작위로"
//  · 생물 7종 × 판 2개(A = Claude 재고, B = Codex). 나올 때마다 판을 무작위로 고른다 — 같은 종은 화면에 하나뿐이라 A·B 가 겹치지 않는다.
//  · 묶음(=12~30fps 움직임)이 없는 정지 그림은 코드가 움직인다: 만타 날개 물결 · 고래 몸 물결+물 뿜기 ·
//    물고기 떼는 한 마리씩 오려 낸 조각이 따로 헤엄 · 플랑크톤은 알갱이마다 떠다니며 반짝 · B 물고기 떼·플랑크톤은 코드 그림.
//  · 그림은 나올 때만 읽고 최근 4장만 기억한다(묶음 하나가 풀면 수 MB — 폰 메모리).
//  재료: assets/life/ (tools/sea-life-assets.mjs). 미리 보기: ?life=turtle · ?life=turtle-b · ?life=school,manta
// 물 빠르기(SPEED)는 항해 장면이 draw 에 넘겨 준다 (voyage-scene 을 가져오지 않아 시험에서 가볍게 읽힌다)

// size = 화면 짧은 변 대비 크기, swim = 앞(위)으로 헤엄치는 빠르기(짧은 변/초) — 물이 SPEED 로 흐르니 SPEED 보다 크면 배를 앞지른다
export const LIFE = {
  turtle: { ko: '바다거북', w: 3, size: 0.2, swim: 0.02, sub: true, a: { atlas: 'claude-turtle' }, b: { atlas: 'codex-turtle' } },
  jelly: { ko: '해파리', w: 2, nightW: 4, size: 0.15, swim: 0.01, sub: true, glow: true, a: { atlas: 'claude-jelly' }, b: { atlas: 'codex-jelly', scale: 0.8, tentacles: true } },
  dolphins: { ko: '돌고래', w: 3, nightW: 1, size: 0.32, swim: 0.085, a: { atlas: 'claude-dolphins', spin: -0.42 }, b: { atlas: 'codex-dolphins', pod: 3 } },
  whale: { ko: '고래', w: 2, size: 0.34, swim: 0.012, a: { sprite: 'whale' }, b: { atlas: ['codex-whale', 'codex-whale-greet', 'codex-whale-tail'], scale: 1.3 } },
  manta: { ko: '만타가오리', w: 2, size: 0.22, swim: 0.02, sub: true, a: { atlas: 'claude-manta' }, b: { img: 'codex-manta', flap: true } },
  school: { ko: '작은 물고기 떼', w: 3, nightW: 1, size: 0.5, swim: 0.02, sub: true, a: { pieces: 'claude-school' }, b: { code: 'mill' } },
  plankton: { ko: '야광 플랑크톤', w: 0, nightW: 4, size: 0.55, swim: 0, glow: true, a: { pieces: 'claude-plankton' }, b: { code: 'glow' } },
};
export const LIFE_IDS = Object.keys(LIFE);

// 한 번에 나올 무리를 정한다 (그림과 상관없는 순수 함수 — 시험용)
//  ctx = { night 0~1, busy: 지금 화면에 있는 종 Set, skip: 이번엔 빼는 종(고래 사건 중엔 고래) }
//  → [{ id, v: 'a'|'b' }] 1~3종, 같은 종 없음
export function planGroup(rand, ctx = {}) {
  const night = (ctx.night ?? 0) > 0.5, busy = ctx.busy || new Set(), skip = ctx.skip || new Set();
  const n = rand() < 0.5 ? 1 : rand() < 0.7 ? 2 : 3;
  const pool = LIFE_IDS.filter(id => !busy.has(id) && !skip.has(id) && (night ? LIFE[id].nightW ?? LIFE[id].w : LIFE[id].w) > 0);
  const out = [];
  while (out.length < n && pool.length) {
    const ws = pool.map(id => (night ? LIFE[id].nightW ?? LIFE[id].w : LIFE[id].w)), sum = ws.reduce((a, b) => a + b, 0);
    let x = rand() * sum, k = 0; while (k < pool.length - 1 && (x -= ws[k]) >= 0) k++;
    const id = pool.splice(k, 1)[0];
    out.push({ id, v: (ctx.only?.[id]) || (rand() < 0.5 ? 'a' : 'b') });
  }
  return out;
}

const img = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

export class SeaLife {
  constructor(base = 'assets/life/') {
    this.base = base; this.cache = new Map(); this.list = []; this.next = 14 + Math.random() * 14; this.force = null;
  }
  // 미리 보기 (?life=turtle-b,school) — 그 무리만 곧바로, 끝나면 다시
  preview(spec) {
    const items = String(spec).split(',').map(s => s.trim()).filter(Boolean).map(s => { const [id, v] = s.split('-'); return LIFE[id] ? { id, v: v === 'a' || v === 'b' ? v : null } : null; }).filter(Boolean);
    if (items.length) { this.force = items; this.next = 0; }
  }
  // 테스트 탭: 지금 있는 것을 걷고 곧바로 한 무리 — 'random' 이면 평소처럼 고른 무리, 아니면 그 생물·판만 (한 번)
  show(spec) {
    this.list = []; this.pending = null; this.next = 0; this.force = null; this.announce = true;
    this.once = spec === 'random' ? null : String(spec).split(',').map(x => { const [id, v] = x.trim().split('-'); return LIFE[id] ? { id, v: v === 'a' || v === 'b' ? v : null } : null; }).filter(Boolean);
  }
  release() { this.cache.clear(); this.list = []; }
  // 그림 한 장 (json 묶음이면 칸 정보도). 실패하면 null 을 기억해 다시 안 부른다
  get(name) {
    if (this.cache.has(name)) { const v = this.cache.get(name); this.cache.delete(name); this.cache.set(name, v); return v; }
    const rec = { ready: false, im: null, m: null };
    this.cache.set(name, rec);
    const json = /claude-(turtle|dolphins|manta|jelly|school|plankton)|codex-(turtle|jelly|dolphins|whale)/.test(name) && name !== 'codex-manta';
    Promise.all([img(this.base + name + '.webp?v=v29.2.0'), json ? fetch(this.base + name + '.json').then(r => r.json()) : null])
      .then(([im, m]) => Object.assign(rec, { im, m, ready: true }), () => Object.assign(rec, { ready: true, bad: true }));
    while (this.cache.size > 6) { const k = this.cache.keys().next().value; if (this.list.some(c => c.art === k)) break; this.cache.delete(k); }
    return rec;
  }

  // 매 프레임 (항해 화면). scene = VoyageScene (고래 A 는 항해 그림의 고래·꼬리 칸을 쓴다)
  draw(c, W, H, u, t, n, scene, play, speed = 0.05) {
    this.speed = speed;
    if (t >= this.next && !this.pending) this.spawn(t, n, play);
    if (this.pending && this.pending.every(p => this.rec(p).ready)) { for (const p of this.pending) this.start(p, W, H, u, t); this.pending = null; }
    for (const cr of this.list) this.paint(c, cr, W, H, u, t, n, scene);
    const before = this.list.length;
    this.list = this.list.filter(cr => (cr.vy >= 0 ? cr.y(t) < H + u * 0.6 : cr.y(t) > -u * 0.6) && t - cr.t0 < cr.life);
    if (before && !this.list.length && !this.pending) this.next = t + (this.force ? 4 : 25 + Math.random() * 45);
  }
  rec(p) { return p.art ? this.get(p.art) : { ready: true }; }
  spawn(t, n, play) {
    const busy = new Set(this.list.map(c => c.id)), skip = new Set(play?.kind === 'whale' ? ['whale'] : []);
    const want = this.once || this.force; this.once = null;
    let group = want ? want.filter(f => !busy.has(f.id)).map(f => ({ id: f.id, v: f.v || (Math.random() < 0.5 ? 'a' : 'b') })) : planGroup(Math.random, { night: n, busy, skip });
    if (group.length && (want || this.announce)) this.onSpawn?.(group);   // 테스트로 부른 무리만 알린다
    this.announce = false;
    if (!group.length) { this.next = t + 10; return; }
    const flip = Math.random() < 0.5 ? 0 : 1;   // 무리 안에서는 왼쪽·오른쪽을 번갈아
    this.pending = group.map((g, i) => {
      const spec = LIFE[g.id][g.v], p = { ...g, spec, i, of: group.length, flip };
      if (spec.atlas) p.art = Array.isArray(spec.atlas) ? spec.atlas[Math.floor(Math.random() * spec.atlas.length)] : spec.atlas;
      else if (spec.img || spec.pieces) p.art = spec.img || spec.pieces;
      return p;
    });
    this.next = Infinity;
  }
  // 자리: 배(가운데)를 비켜 왼쪽·오른쪽 물길. 둘 이상이면 서로 다른 쪽·높이로
  start(p, W, H, u, t) {
    const L = LIFE[p.id], r = this.rec(p);
    if (r.bad) return;
    const tall = H > W, side = (p.i + p.flip) % 2 ? 1 : -1;
    const lane = (tall ? 0.3 + Math.random() * 0.06 : 0.25 + Math.random() * 0.12) + (p.id === 'whale' ? 0.07 : 0);   // 고래는 커서 배에서 더 멀리
    const x = W / 2 + side * W * lane, vy = (this.speed - L.swim) * u;   // 화면에서 아래로 가는 빠르기
    const size = L.size * u * (tall ? 0.72 : 1) * (0.9 + Math.random() * 0.2);   // 세로 화면은 폭이 좁아 작게
    let y0 = vy >= 0 ? -size * 0.7 - p.i * u * 0.1 : H + size * 0.7 + p.i * u * 0.1;   // 화면 바로 밖에서 들어온다
    let life = 120;
    // 고래는 화면 위쪽 물 밑에서 떠올라(서서히 보임) 한 바퀴 동작하고 잠수한다
    if (p.id === 'whale') { y0 = H * (tall ? 0.2 : 0.16); life = p.v === 'a' ? 21 : Math.max(9, r.m ? r.m.frames / r.m.fps * 2 : 12); }
    const cr = { id: p.id, v: p.v, spec: p.spec, art: p.art, x, size, t0: t, life, vy, seed: Math.random() * 100, side, y: tt => y0 + (tt - t) * vy };
    this.list.push(cr);
  }

  paint(c, cr, W, H, u, t, n, scene) {
    const L = LIFE[cr.id], s = cr.spec, age = t - cr.t0, y = cr.y(t), a = Math.max(0, Math.min(1, age / (cr.id === 'whale' ? 3 : 1.5), (cr.life - age) / 2));
    const sway = Math.sin(age * 0.6 + cr.seed) * cr.size * 0.25;   // 물길 안에서 좌우로 살짝
    const x = cr.x + sway, rot = Math.cos(age * 0.6 + cr.seed) * 0.12 * (L.swim > 0.05 ? 0.5 : 1);
    c.save();
    c.globalAlpha = a * (L.sub ? 0.86 : 0.95);
    if (s.code === 'mill') this.mill(c, x, y, cr.size, age, cr.seed, n);
    else if (s.code === 'glow') this.glow(c, x, y, cr.size, age, cr.seed);
    else if (s.pieces) this.pieces(c, cr, x, y, age);
    else if (s.sprite) this.whaleA(c, scene, x, y, cr.size, age, cr.side);
    else if (s.img) this.flap(c, cr, x, y, rot, age);
    else this.atlas(c, cr, x, y, rot, age, n);
    c.restore();
  }
  frame(m, age, rate = 1) { return Math.floor(age * m.fps * rate) % m.frames; }
  cell(c, im, m, f, w, h) { const fw = m.frameWidth, fh = m.frameHeight; c.drawImage(im, (f % m.cols) * fw, Math.floor(f / m.cols) * fh, fw, fh, -w / 2, -h / 2, w, h); }
  atlas(c, cr, x, y, rot, age, n) {
    const r = this.get(cr.art); if (!r.im || !r.m) return;
    const m = r.m, s = cr.spec, h = cr.size * (s.scale || 1), w = h * m.frameWidth / m.frameHeight;
    const pod = s.pod || 1;
    for (let k = 0; k < pod; k++) {
      // 무리(B 돌고래): 한 마리 묶음을 셋이 조금씩 늦게, 비스듬히 줄 지어
      const ox = (k - (pod - 1) / 2) * w * 0.9, oy = Math.abs(k - (pod - 1) / 2) * h * 0.35 + Math.sin(age * 1.7 + k * 2) * h * 0.04;
      // spin: 셋이 둥글게 놓인 묶음(A 돌고래)은 무리째 천천히 돌려 원을 그리며 헤엄치게 (그림 속 머리 방향 = 시계 반대)
      c.save(); c.translate(x + ox, y + oy); c.rotate(rot + (k - 1) * 0.05 * (pod > 1) + (s.spin ? age * s.spin + cr.seed : 0));
      if (cr.spec.tentacles || (LIFE[cr.id].glow && n > 0.3)) this.halo(c, w, h, n, age);
      if (cr.spec.tentacles) this.tentacles(c, w, h, age);
      this.cell(c, r.im, m, (this.frame(m, age) + k * 7) % m.frames, w, h);
      c.restore();
    }
  }
  // 해파리 B: 몸통 묶음 아래로 촉수 리본 (물에 끌리며 흔들림)
  tentacles(c, w, h, age) {
    c.save(); c.strokeStyle = 'rgba(214,236,255,0.42)'; c.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const x0 = (k / 6 - 0.5) * w * 0.62, len = h * (0.9 + (k % 3) * 0.25);
      c.lineWidth = Math.max(1, w * (k % 2 ? 0.018 : 0.03));
      c.beginPath(); c.moveTo(x0, h * 0.28);
      for (let j = 1; j <= 6; j++) { const q = j / 6; c.lineTo(x0 + Math.sin(age * 1.8 - q * 4 + k) * w * 0.09 * q, h * 0.28 + len * q); }
      c.stroke();
    }
    c.restore();
  }
  halo(c, w, h, n, age) {
    const r = Math.max(w, h) * 0.75, p = 0.75 + 0.25 * Math.sin(age * 1.6);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(170,230,255,${0.22 * (0.35 + n) * p})`); g.addColorStop(1, 'rgba(170,230,255,0)');
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.restore();
  }
  // 정지 그림 날개짓 (만타 B): 세로 띠로 잘라 가운데에서 먼 띠일수록 위아래로 크게 — 날개 끝으로 물결이 흐른다
  flap(c, cr, x, y, rot, age) {
    const r = this.get(cr.art); if (!r.im) return;
    const im = r.im, h = cr.size, w = h * im.width / im.height, N = 28, sw = im.width / N, ph = age * 2.4;
    c.translate(x, y); c.rotate(rot);
    const squeeze = 0.9 + 0.1 * Math.cos(ph);   // 날개를 올릴 때 폭이 조금 줄어든다
    for (let i = 0; i < N; i++) {
      const d = (i + 0.5) / N * 2 - 1, ad = Math.abs(d), dy = Math.sin(ph - ad * 1.6) * ad * ad * h * 0.16;
      const dx = d * w / 2 * squeeze, ww = w / N * squeeze + 0.8;
      c.drawImage(im, i * sw, 0, sw, im.height, dx - ww / 2, -h / 2 + dy, ww, h * (1 - ad * 0.04 * Math.cos(ph)));
    }
  }
  // 고래 A: 항해 그림의 고래 등(물 뿜기는 그림에 있다) — 몸을 가로 띠로 잘라 물결, 끝에 꼬리 내밀고 잠수
  whaleA(c, scene, x, y, size, age, side) {
    const b = scene?.cells?.whale, tb = scene?.cells?.tail, im = scene?.sheet; if (!b || !im) return;
    const dive = 16, h = size, w = h * b.w / b.h;
    if (age < dive) {
      c.translate(x, y); if (side < 0) c.scale(-1, 1);
      const N = 16, sh = b.h / N, up = Math.min(1, age / 2.5);
      c.globalAlpha *= 0.55 + 0.45 * up;   // 물 밑에서 떠오른다
      for (let i = 0; i < N; i++) {
        const q = i / N, dx = Math.sin(age * 1.3 - q * 3) * w * 0.035 * q;
        c.drawImage(im, b.x, b.y + i * sh, b.w, sh + 1, -w / 2 + dx, -h / 2 + i * h / N, w, h / N + 1);
      }
    } else if (tb) {
      const p = Math.min(1, (age - dive) / 5), th = h * 0.9, tw = th * tb.w / tb.h;
      c.globalAlpha *= Math.sin(Math.PI * p);
      c.translate(x, y + h * 0.1 - p * h * 0.15); c.rotate(Math.sin(p * Math.PI) * 0.08 * side);
      c.drawImage(im, tb.x, tb.y, tb.w, tb.h, -tw / 2, -th / 2, tw, th);
    }
  }
  // 오려 낸 조각 떼 (A 물고기 떼·플랑크톤): 조각마다 제 자리 둘레를 돌며 따로 움직인다
  pieces(c, cr, x, y, age) {
    const r = this.get(cr.art); if (!r.im || !r.m) return;
    const { size: [sw, sh], pieces } = r.m, S = cr.size, k = S / Math.max(sw, sh), glow = cr.id === 'plankton';
    const dir = cr.side > 0 ? -1 : 1;   // 물고기는 대부분 왼쪽을 본다 → 오른쪽 물길이면 왼쪽으로, 왼쪽 물길이면 뒤집어 오른쪽으로
    c.translate(x + (glow ? 0 : dir * Math.sin(age * 0.2) * S * 0.25), y);
    if (!glow) c.rotate(Math.sin(age * 0.23 + cr.seed) * 0.25);
    if (glow) { c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, 0, 0, 0, 0, S * 0.55); g.addColorStop(0, `rgba(90,220,230,${0.12 + 0.04 * Math.sin(age * 0.9)})`); g.addColorStop(1, 'rgba(90,220,230,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, S * 0.55, 0, Math.PI * 2); c.fill(); }   // 무리 전체의 은은한 빛
    pieces.forEach(([px, py, pw, ph, cx, cy], i) => {
      const q = i * 2.399 + cr.seed;
      let ox = Math.sin(age * 0.8 + q) * S * 0.05, oy = Math.cos(age * 0.65 + q * 1.3) * S * 0.035;
      if (glow) { ox += Math.sin(age * 0.15 + q) * S * 0.08; oy -= ((age * 0.01 * (1 + i % 3)) % 0.2) * S; }   // 천천히 피어오르듯
      const w = pw * k, h = ph * k;
      c.save(); c.translate(cx * sw * k + ox, cy * sh * k + oy);
      if (glow) c.globalAlpha *= 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(age * (1.2 + (i % 4) * 0.4) + q));   // 알갱이마다 다른 박자로 반짝
      else { if (dir < 0) c.scale(-1, 1); c.rotate(Math.cos(age * 0.8 + q) * 0.18); c.scale(1 + 0.07 * Math.sin(age * 9 + q), 1); }   // 몸 흔들기(꼬리질)
      c.drawImage(r.im, px, py, pw, ph, -w / 2, -h / 2, w, h);
      c.restore();
    });
    if (glow) this.sparks(c, S, age, cr.seed, 26);
  }
  // B 물고기 떼: 은빛 작은 물고기들이 둥글게 맴도는 떼 (bait ball)
  mill(c, x, y, S, age, seed, n) {
    c.translate(x, y);
    const N = 30;
    for (let i = 0; i < N; i++) {
      const ring = 0.25 + (i % 5) * 0.08, dirn = i % 7 === 0 ? -1 : 1, th = age * (0.9 / ring) * 0.35 * dirn + i * 2.399 + seed;
      const fx = Math.cos(th) * S * ring, fy = Math.sin(th) * S * ring * 0.55 + Math.sin(age + i) * S * 0.02;
      const head = th + Math.PI / 2 * dirn, L = S * (0.07 + (i % 3) * 0.012), wag = Math.sin(age * 12 + i) * 0.35;
      c.save(); c.translate(fx, fy); c.rotate(head);
      const silver = 200 - (i % 4) * 14 - n * 60;
      c.fillStyle = `rgb(${silver},${silver + 12},${silver + 20})`;
      c.beginPath(); c.ellipse(0, 0, L / 2, L * 0.15, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(-L * 0.45, 0); c.lineTo(-L * 0.68, L * (0.16 + wag * 0.2)); c.lineTo(-L * 0.68, -L * (0.16 - wag * 0.2)); c.closePath(); c.fill();
      if (Math.sin(age * 3 + i * 1.7) > 0.93) { c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(0, -L * 0.04, L * 0.3, L * 0.05, 0, 0, Math.PI * 2); c.fill(); }   // 비늘 반짝
      c.restore();
    }
  }
  // B 플랑크톤: 나선으로 도는 빛 알갱이 + 은은한 빛무리
  glow(c, x, y, S, age, seed) {
    c.translate(x, y); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, 0, 0, 0, 0, S * 0.6); g.addColorStop(0, 'rgba(90,220,230,0.16)'); g.addColorStop(1, 'rgba(90,220,230,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, S * 0.6, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 70; i++) {
      const arm = i % 3, q = (i * 0.618) % 1, th = arm * 2.094 + q * 4 + age * 0.25 + seed, rr = S * (0.08 + q * 0.5);
      const px = Math.cos(th) * rr, py = Math.sin(th) * rr * 0.7, tw = 0.4 + 0.6 * Math.max(0, Math.sin(age * (1.5 + (i % 5) * 0.3) + i));
      c.fillStyle = `rgba(150,255,240,${0.75 * tw})`; c.beginPath(); c.arc(px, py, S * (0.006 + (i % 4) * 0.003), 0, Math.PI * 2); c.fill();
    }
  }
  sparks(c, S, age, seed, N) {
    for (let i = 0; i < N; i++) {
      const q = i * 1.618 + seed, px = Math.sin(q * 3.1) * S * 0.45 + Math.sin(age * 0.3 + q) * S * 0.04, py = Math.cos(q * 2.3) * S * 0.4 - ((age * 0.02 + i * 0.03) % 0.3) * S;
      const tw = Math.max(0, Math.sin(age * 2 + q * 5));
      c.fillStyle = `rgba(160,255,245,${0.8 * tw})`; c.beginPath(); c.arc(px, py, S * 0.006, 0, Math.PI * 2); c.fill();
    }
  }
}
