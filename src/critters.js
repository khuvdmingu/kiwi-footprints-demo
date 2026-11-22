// critters.js — v30.26 물가 작은 생물 (잠자리 떼는 darters.js, 갈매기는 gulls.js)
//  사용자 2026-11-22: "다른 맵들도 이런 생물체가 돌아다니면 · 해변 말고 바다 쪽에"
//   → 처음 3·4단계(고니·백로·물범…)는 "그림체가 너무 실사스럽고 위에서 본 시점이 안 맞는다 · 키위보다 작은 생물로"
//   → "몇몇 물가는 아주 작은 물고기들 · 해변 물가 아주 근처를 돌아다니는 작은 게"
//  그래서 모두 키위보다 작고, 손님 동물과 같은 그림체(둥글고 단순한 붓 그림)다.
//  한 장소에 여러 종이 함께 나올 수 있다 (maps.js critters 배열 — 예: 산호 석호 = 게 + 열대어).
//  자리: 물가선(beach.edge) 아래 물 위·물속. 게·짱뚱어만 물가선 바로 앞 젖은 모래까지 (글씨 쓰는 곳까지는 안 올라간다).
//   움직임:
//    diver    물 위에 떠 있다가 쏙 잠수, 조금 떨어진 곳에서 뿅 (논병아리 · 퍼핀) — 옆모습, 가는 쪽을 본다
//    peek     청개구리 머리가 떴다 잠긴다 (diver 와 같은 문법)
//    line     아기 오리가 한 줄로 졸졸 (첫째를 나머지가 따라간다)
//    swim     아기 거북이 천천히 헤엄 (위에서 본 그림, line 과 같은 문법)
//    hopper   짱뚱어가 물가선에서 톡톡 뛴다
//    whirl    물맴이 떼가 빙글빙글
//    skate    소금쟁이가 톡 밀고 미끄러진다
//    crab     작은 게가 물가 젖은 모래에서 옆걸음 — 바다·땅·비스듬히 저마다 다른 쪽을 보고, 쉬다가 몸을 돌린다.
//             파도가 덮치면 모래 속으로 쏙 파고들었다가 물이 다 빠지면 톡 나온다 (사용자 2026-11-22)
//    school   아주 작은 물고기 떼가 물속에서 맴돌다가 다 같이 휙 (흐리게, 물에 잠겨)
//    hermit   소라게가 물가 젖은 모래를 느릿느릿 — 키위가 가까이 오면 껍데기 속으로 쏙,
//             파도가 덮치면 껍데기째 물 위에 둥둥 떠 흔들리다가 물이 빠지면 다시 걷는다
//    snail    달팽이가 숲 가장자리 아래를 기어가며 반짝이는 자국을 남긴다 — 비 오는 동안과 그친 뒤 4분만
//  층: 모두 무대 층(시간 빛·밤이 함께 입혀진다). 밤·비에는 새로 오지 않는다 — 게·물고기·청개구리는 밤에도 온다.
//  크기(size)는 보이는 몸 크기(u) — 키위가 약 45u. 그림: assets/critters.webp 4×4 칸 256px(칸마다 몸에 꼭 맞게 잘림) — Codex image_gen(손님 그림을 그림체 참고로) + 소금쟁이(첫 장)
//   0 논병아리 · 1 퍼핀 · 2 아기 오리 · 3 아기 오리(뒤돌아봄) · 4 짱뚱어 · 5 아기 거북(위) · 6 청개구리 머리 · 7 물맴이(위)
//   8 모래색 게(위) · 9 분홍 게(위) · 10 송사리(위) · 11 열대어(위) · 12 소금쟁이(위)
//   17 소라게 걷기 · 18 소라게 걷기(다른 발) · 19 소라게 숨음 · 20 달팽이 늘어남 · 21 달팽이 움츠림 (옆모습, 4×6)
//   13 송사리 지느러미 접음 · 14 같은 송사리 몸 구부림 · 15 열대어 지느러미 접음 · 16 같은 열대어 몸 구부림 (4×5)
//   물고기 떼는 지느러미가 거의 안 보이는 모습이 기본이고(사용자: "원래 지느러미가 잘 안 보이는 경우가 많으니"),
//   곧은 몸 → 구부림 → 곧은 몸 → 반대로 구부림 을 번갈아 꼬리를 흔든다. 지느러미가 보이는 그림은 4마리 중 1마리꼴.
//   옆모습(side)은 오른쪽을 보고, 위에서 본 것은 머리가 위를 본다.

export const CRITTERS = {
  grebe:      { ko: '논병아리', mode: 'diver', cells: [0], size: 40, n: [1, 2] },
  puffin:     { ko: '퍼핀', mode: 'diver', cells: [1], size: 42, n: [1, 3] },
  duckling:   { ko: '아기 오리', mode: 'line', cells: [2, 3], size: 28, n: [4, 6], speed: 10, gap: [10, 20] },
  mudskipper: { ko: '짱뚱어', mode: 'hopper', cells: [4], size: 32, n: [2, 4] },
  turtle:     { ko: '아기 거북', mode: 'swim', cells: [5], size: 32, n: [1, 1], speed: 6, gap: [8, 16] },
  frog:       { ko: '청개구리', mode: 'peek', cells: [6], size: 34, n: [1, 2], night: true, gap: [5, 12] },
  whirligig:  { ko: '물맴이', mode: 'whirl', cells: [7], size: 13, n: [6, 10] },
  strider:    { ko: '소금쟁이', mode: 'skate', cells: [12], size: 42, n: [4, 7] },
  crab:       { ko: '작은 게', mode: 'crab', cells: [8, 9], size: 24, n: [2, 4], night: true, rain: true },
  minnow:     { ko: '송사리', mode: 'school', cells: [10], swim: [13, 14], size: 18, n: [10, 16], night: true, rain: true },
  hermit:     { ko: '소라게', mode: 'hermit', cells: [17, 18, 19], size: 30, n: [1, 3], night: true },
  snail:      { ko: '달팽이', mode: 'snail', cells: [20, 21], size: 26, n: [1, 3], wet: true, rain: true },   // 사용자 "소라게나 달팽이" (2026-11-22)
  tropical:   { ko: '열대어', mode: 'school', cells: [11], swim: [15, 16], size: 19, n: [8, 12], night: true, rain: true },
};

const rnd = (a, b) => a + Math.random() * (b - a);
const pickN = ([lo, hi]) => Math.floor(rnd(lo, hi + 1));
const ease = k => k * k * (3 - 2 * k);
const clamp01 = v => Math.max(0, Math.min(1, v));
const turn = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;   // 짧은 쪽으로 돌기
const crabFace = () => (Math.random() < 0.5 ? 0 : Math.PI) + rnd(-0.6, 0.6);   // 땅 쪽·바다 쪽 ±35° (옆걸음이 물가선을 따라가게)
// 물이 들어오지 않았을 때의 물가선 (그림에 그려진 줄) — 게·소라게는 이 줄 바로 위 젖은 모래에 산다
const restShore = (beach, x) => (beach.shoreAt ? beach.shoreAt(x) : beach.edge(x));

// 물 위 띠: 물가선 아래 pad ~ 화면 아래 70u (맨 아래 「여기에 문장을 써 보세요」 입력 칸·안내 글자와 겹치지 않게)
export const BOTTOM_PAD = 70;
function band(beach, x, pad) {
  const u = beach.u, top = beach.edge(Math.max(0, Math.min(beach.W, x))) + pad * u, bot = beach.H - BOTTOM_PAD * u;
  return bot - top > 24 * u ? [top, bot] : null;
}

// 한 종의 움직임
class Track {
  constructor(kind, ring) { this.kind = kind; this.k = CRITTERS[kind]; this.ring = ring; this.list = []; this.group = null; this.t = 0; this.next = rnd(0.5, 2.5); this.first = true; this.dryT = Infinity; }

  update(dt, beach, opt) {
    const k = this.k;
    this.t += dt;
    this.dryT = opt.wet ? 0 : this.dryT + dt;   // 비가 그친 뒤 지난 시간
    const quiet = ((opt.night || 0) > 0.55 && !k.night) || ((opt.rain || 0) > 0.4 && !k.rain) || (k.wet && this.dryT > 240);   // 달팽이: 비 오는 동안과 그친 뒤 4분
    if (!this.list.length && !this.group && !quiet && this.t > this.next) this.spawn(beach);
    this[k.mode](dt, beach, quiet, opt);
    // 무리 둘레로 퍼진 것도 아래 입력 칸 위에서 멈춘다 (물가선에 붙어 사는 게·짱뚱어는 빼고)
    if (!['crab', 'hopper', 'hermit', 'snail'].includes(k.mode)) {
      const low = beach.H - BOTTOM_PAD * beach.u;
      for (const c of this.list) if (c.y > low) { c.y = low; if (c.vy > 0) c.vy = -c.vy; if (c.oy > low) c.oy = low; }
    }
    if (!this.list.length && this.group) { this.group = null; this.next = this.t + rnd(...(k.gap || [6, 14])); }
  }

  spawn(beach) {
    const k = this.k, { W, u } = beach, first = this.first, dir = Math.random() < 0.5 ? 1 : -1;
    this.first = false;
    const n = k.n ? pickN(k.n) : 1, cx = rnd(0.15, 0.85) * W;
    this.group = { age: 0, dir, x: cx, life: rnd(45, 80) };
    const cell = () => k.cells[Math.floor(Math.random() * k.cells.length)], s = () => k.size * u * rnd(0.9, 1.08);
    if (k.mode === 'crab' || k.mode === 'hopper') {
      for (let i = 0; i < n; i++) this.list.push({ x: rnd(0.08, 0.92) * W, off: rnd(-8, 8) * u, s: s(), cell: cell(), ph: Math.random() * 9,
        wait: rnd(0.3, 2), vx: 0, run: 0, rot: 0, face: Math.random() < 0.5 ? 1 : -1, hop: 0, a: 0, y: 0, st: 'up', k: 0 });
      for (const c of this.list) {
        c.rot = c.trot = crabFace();
        if (k.mode === 'crab') c.off = rnd(-24, -10) * u;   // 물가선 바로 위 젖은 모래 (작은 물결은 안 닿고 큰 파도만 덮친다)
        c.y = (k.mode === 'crab' ? restShore(beach, c.x) : beach.edge(c.x)) + c.off;
      }
      return;
    }
    if (k.mode === 'hermit') {
      for (let i = 0; i < n; i++) this.list.push({ x: rnd(0.08, 0.92) * W, off: rnd(-22, -8) * u, s: s(), cell: k.cells[0], ph: Math.random() * 9, a: 0,
        walk: false, wait: rnd(0.5, 2), face: Math.random() < 0.5 ? 1 : -1, hide: 0, pop: 0, float: false, bub: 0, y: 0 });
      for (const c of this.list) c.y = restShore(beach, c.x) + c.off;
      return;
    }
    if (k.mode === 'snail') {
      const grass = x => (beach.grass ? beach.grass(x) : beach.edge(x) - 200 * u);
      for (let i = 0; i < n; i++) {
        const x = rnd(0.1, 0.9) * W, off = rnd(12, 30) * u;
        this.list.push({ x, off, y: grass(x) + off, s: s(), cell: k.cells[0], ph: Math.random() * 9, a: 0, face: Math.random() < 0.5 ? 1 : -1, v: rnd(3, 6) * u, trail: [], lx: x });
      }
      return;
    }
    const b = band(beach, cx, k.mode === 'school' ? 34 : 44);
    if (!b) { this.group = null; this.next = this.t + 3; return; }
    const cy = rnd(b[0] + 12 * u, b[1] - 12 * u);
    Object.assign(this.group, { y: cy, r: (k.mode === 'whirl' ? 50 : k.mode === 'school' ? 46 : 90) * u });
    if (k.mode === 'line' || k.mode === 'swim') {
      // 처음 온 장소에서는 이미 물 위에 있다 (느려서 들어오기를 기다리지 않게)
      const x0 = first ? rnd(0.25, 0.6) * W : dir > 0 ? -50 * u : W + 50 * u;
      for (let i = 0; i < n; i++) this.list.push({ x: x0 - dir * i * k.size * u * 0.75, y: cy, y0: cy, vx: dir * k.speed * u, s: s() * (i ? 0.92 : 1),
        cell: k.cells[0], ph: Math.random() * 9, look: rnd(3, 7), wake: 0, head: dir > 0 ? Math.PI / 2 : -Math.PI / 2 });
    } else if (k.mode === 'diver' || k.mode === 'peek') {
      for (let i = 0; i < n; i++) {
        const x = Math.max(30 * u, Math.min(W - 30 * u, cx + rnd(-1, 1) * 90 * u)), bb = band(beach, x, 44) || b;
        const y = Math.max(bb[0], Math.min(bb[1], cy + rnd(-1, 1) * 30 * u));
        this.list.push({ x, y, s: s(), cell: cell(), ph: Math.random() * 9, st: 'up', a: 0, timer: rnd(5, 11), dives: pickN([2, 4]),
          vx: rnd(-1, 1) * 4 * u, face: Math.random() < 0.5 ? 1 : -1 });
        this.ring(x, y, k.size * u * 0.45, 1.3);
      }
    } else {   // whirl · skate · school: 한 무리
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * this.group.r, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.6;
        this.list.push({ x, y, vx: 0, vy: 0, head: Math.random() * 6.28, s: s(), cell: cell(), ph: Math.random() * 9, wait: rnd(0.2, 2), fade: 0, finny: !k.swim || Math.random() < 0.25,
          orbit: a, rad: d, ox: x, oy: y, spin: rnd(2.5, 5) * (Math.random() < 0.5 ? 1 : -1), sr: rnd(5, 16) * u });
      }
    }
  }

  // ── 논병아리 · 퍼핀 · 청개구리: 떠오름 → 떠 있음 → 잠수 → 물속 → 다른 곳에서 뿅 (몇 번 하고 떠난다)
  diver(dt, beach, quiet) {
    const u = beach.u;
    for (const c of this.list) {
      c.timer -= dt;
      if (c.st === 'up') { c.a = Math.min(1, c.a + dt / 0.5); if (c.a >= 1) c.st = 'float'; }
      else if (c.st === 'float') {
        c.x += c.vx * dt; if (Math.abs(c.vx) > 0.5) c.face = Math.sign(c.vx);
        if (c.timer < 0 || quiet) { c.st = 'dive'; this.ring(c.x, c.y, c.s * 0.4, 1.2); }
      } else if (c.st === 'dive') {
        c.a -= dt / 0.35;
        if (c.a <= 0) { c.a = 0; c.dives--; c.st = c.dives > 0 && !quiet ? 'under' : 'gone'; c.timer = rnd(1.5, 3.5); }
      } else if (c.st === 'under' && c.timer < 0) {
        c.x = Math.max(30 * u, Math.min(beach.W - 30 * u, c.x + rnd(-1, 1) * 120 * u));
        const b = band(beach, c.x, 44); if (b) c.y = Math.max(b[0], Math.min(b[1], c.y + rnd(-1, 1) * 40 * u));
        c.st = 'up'; c.timer = rnd(5, 11); c.vx = rnd(-1, 1) * 4 * u; this.ring(c.x, c.y, c.s * 0.4, 1.3);
      }
      // 물가선이 밀려와도 물 위에 있게
      const b = band(beach, c.x, 40); if (b && c.y < b[0]) c.y = b[0];
    }
    this.list = this.list.filter(c => c.st !== 'gone');
  }
  peek(dt, beach, quiet) { this.diver(dt, beach, quiet); }

  // ── 아기 오리 줄 · 아기 거북: 첫째가 가고 나머지가 그 자리를 따라간다
  line(dt, beach, quiet) {
    const { W, u } = beach, k = this.k;
    this.list.forEach((c, i) => {
      if (i === 0) {
        c.x += c.vx * dt;
        c.y = c.y0 + Math.sin(this.t * 0.3 + c.ph) * 16 * u;
        if ((c.wake -= dt) < 0) { c.wake = 0.8; this.ring(c.x - Math.sign(c.vx) * c.s * 0.3, c.y + c.s * 0.15, c.s * 0.35, 1.5, 0.35); }
      } else {
        const p = this.list[i - 1], gap = k.size * u * 0.7, dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
        if (d > gap) { const m = (1 - gap / d) * Math.min(1, dt * 3); c.x += dx * m; c.y += dy * m; }
        if (Math.abs(dx) > 1) c.vx = dx;
      }
      const b = band(beach, c.x, 44); if (b) c.y = Math.max(b[0], Math.min(b[1], c.y));
      if (k.cells.length > 1 && (c.look -= dt) < 0) { const back = c.cell === k.cells[1]; c.look = back ? rnd(4, 8) : rnd(0.8, 1.4); c.cell = back ? k.cells[0] : k.cells[1]; }
      if (Math.abs(c.vx) > 0.1) c.head = Math.sign(c.vx) * Math.PI / 2;
    });
    const lead = this.list[0], tail = this.list.length * k.size * u;
    if (lead && (lead.vx > 0 ? lead.x > W + 60 * u + tail : lead.x < -60 * u - tail)) this.list = [];
  }
  swim(dt, beach, quiet) { this.line(dt, beach, quiet); }

  // ── 짱뚱어: 물가선에 붙어 있다가 톡 뛴다
  hopper(dt, beach, quiet) {
    const g = this.group, u = beach.u;
    if (g) { g.age += dt; if (g.age > g.life || quiet) g.leave = true; }
    for (const c of this.list) {
      c.a = g?.leave ? c.a - dt / 1.2 : Math.min(1, c.a + dt / 0.8);
      if (c.hop > 0) {
        c.hop -= dt / 0.5; c.x = Math.max(10 * u, Math.min(beach.W - 10 * u, c.x + c.vx * dt));
        if (c.hop <= 0) { c.hop = 0; this.ring(c.x, beach.edge(c.x) + c.off * 0.5 + 6 * u, c.s * 0.3, 0.9, 0.4); }
      } else if ((c.wait -= dt) < 0) { c.wait = rnd(1.2, 4); c.hop = 1; c.face = Math.random() < 0.5 ? 1 : -1; c.vx = c.face * rnd(40, 80) * u; }
      c.y = beach.edge(c.x) + 4 * u + c.off * 0.5 - (c.hop > 0 ? Math.sin(Math.PI * (1 - c.hop)) * 14 * u : 0);
    }
    this.list = this.list.filter(c => c.a > 0 || !g?.leave);
  }

  // ── 작은 게: 물가선을 따라 옆걸음 · 파도와 함께 오르내림
  crab(dt, beach, quiet) {
    const g = this.group, { W, u } = beach;
    if (g) { g.age += dt; if (g.age > g.life || quiet) g.leave = true; }
    for (const c of this.list) {
      c.a = g?.leave ? c.a - dt / 1.5 : Math.min(1, c.a + dt);
      c.y = restShore(beach, c.x) + c.off;
      const e = beach.edge(c.x), covered = e < c.y - 4 * u, dry = e > c.y + 6 * u;   // 물가선이 게보다 위 = 물에 잠김
      if (c.st === 'up' && covered) { c.st = 'dig'; c.k = 0; c.run = 0; }   // 파도가 덮치면 모래 속으로
      if (c.st === 'dig') { c.k += dt / 0.35; if (c.k >= 1) { c.st = 'under'; c.k = 0; c.out = rnd(0.5, 1.6); } }
      else if (c.st === 'under') { if (dry && (c.out -= dt) < 0) { c.st = 'pop'; c.k = 0; this.ring(c.x, c.y, c.s * 0.35, 0.7, 0.35); } }   // 물이 다 빠지면 하나씩 톡
      else if (c.st === 'pop') { c.k += dt / 0.3; if (c.k >= 1) c.st = 'up'; }
      else if (c.run > 0) {
        c.run -= dt; c.x += c.vx * dt;
        if (c.x < 10 * u || c.x > W - 10 * u) { c.vx = -c.vx; c.x = Math.max(10 * u, Math.min(W - 10 * u, c.x)); }
      } else if ((c.wait -= dt) < 0) {
        if (Math.random() < 0.35) { c.trot = crabFace(); c.wait = rnd(0.6, 1.6); }   // 가끔 그 자리에서 몸을 돌린다
        else {
          c.wait = rnd(0.5, 2.2); c.run = rnd(0.25, 0.8); c.vx = (Math.random() < 0.5 ? -1 : 1) * rnd(55, 110) * u;
          // 다른 게와 겹쳐 있으면 그 반대쪽으로 걷는다
          const near = this.list.find(o => o !== c && Math.abs(o.x - c.x) < c.s * 1.4);
          if (near) c.vx = Math.sign(c.x - near.x || 1) * Math.abs(c.vx);
        }
      }
      c.rot = turn(c.rot, c.trot, Math.min(1, dt * 5));
    }
    this.list = this.list.filter(c => c.a > 0 || !g?.leave);
  }

  // ── 물맴이: 저마다 작은 원을 빠르게 돌고, 원의 가운데는 천천히 떠돈다
  whirl(dt, beach, quiet) {
    const g = this.group, u = beach.u;
    if (g) { g.age += dt; if (g.age > g.life || quiet) g.leave = true; }
    for (const c of this.list) {
      c.fade = g?.leave ? c.fade - dt / 1.5 : Math.min(1, c.fade + dt / 1.2);
      c.orbit += c.spin * dt;
      c.ox += Math.sin(this.t * 0.4 + c.ph) * 10 * u * dt; c.oy += Math.cos(this.t * 0.33 + c.ph) * 6 * u * dt;
      if (g && Math.hypot(c.ox - g.x, (c.oy - g.y) / 0.6) > g.r) { c.ox += (g.x - c.ox) * dt * 0.5; c.oy += (g.y - c.oy) * dt * 0.5; }
      const b = band(beach, c.ox, 40); if (b) c.oy = Math.max(b[0] + c.sr, Math.min(b[1], c.oy));
      const nx = c.ox + Math.cos(c.orbit) * c.sr, ny = c.oy + Math.sin(c.orbit) * c.sr * 0.7;
      c.head = Math.atan2(nx - c.x, -(ny - c.y)); c.x = nx; c.y = ny;
      if ((c.wait -= dt) < 0) { c.wait = rnd(0.25, 0.6); this.ring(c.x, c.y, c.s * 0.5, 0.7, 0.3); }
    }
    this.list = this.list.filter(c => c.fade > 0 || !g?.leave);
  }

  // ── 소금쟁이: 가만히 → 톡 밀고 미끄러짐
  skate(dt, beach, quiet) {
    const g = this.group, u = beach.u;
    if (g) { g.age += dt; if (g.age > g.life || quiet) g.leave = true; }
    for (const c of this.list) {
      c.fade = g?.leave ? c.fade - dt / 1.5 : Math.min(1, c.fade + dt / 1.2);
      c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= Math.exp(-dt * 2.6); c.vy *= Math.exp(-dt * 2.6);
      if ((c.wait -= dt) < 0) {
        c.wait = rnd(0.6, 2.4);
        let a = Math.random() * 6.28;
        if (g && Math.hypot(c.x - g.x, (c.y - g.y) / 0.6) > g.r) a = Math.atan2(g.y - c.y, g.x - c.x) + rnd(-0.6, 0.6);
        const v = rnd(60, 120) * u; c.vx = Math.cos(a) * v; c.vy = Math.sin(a) * v * 0.7;
        c.head = Math.atan2(c.vx, -c.vy);
        this.ring(c.x, c.y, c.s * 0.25, 0.8, 0.45);
      }
      const b = band(beach, c.x, 40); if (b && c.y < b[0]) { c.y = b[0]; c.vy = Math.abs(c.vy); }
    }
    this.list = this.list.filter(c => c.fade > 0 || !g?.leave);
  }

  // ── 아주 작은 물고기 떼: 한곳을 맴돌다가 가끔 다 같이 휙 옮겨 간다
  school(dt, beach, quiet) {
    const g = this.group, u = beach.u;
    if (g) {
      g.age += dt; if (g.age > g.life || quiet) g.leave = true;
      if (!g.leave && Math.random() < dt * 0.12) g.x = Math.max(60 * u, Math.min(beach.W - 60 * u, g.x + rnd(-1, 1) * 160 * u)), g.y += rnd(-1, 1) * 50 * u;   // 휙
      const b = band(beach, g.x, 34); if (b) g.y = Math.max(b[0] + 10 * u, Math.min(b[1] - 10 * u, g.y));
    }
    for (const c of this.list) {
      c.fade = g?.leave ? c.fade - dt / 2 : Math.min(1, c.fade + dt / 1.5);
      c.orbit += dt * (0.5 + (c.ph % 1) * 0.4);
      const tx = (g?.x ?? c.x) + Math.cos(c.orbit) * (c.rad + Math.sin(this.t * 0.9 + c.ph) * 8 * u);
      const ty = (g?.y ?? c.y) + Math.sin(c.orbit) * (c.rad * 0.6);
      const dx = tx - c.x, dy = ty - c.y;
      c.x += dx * Math.min(1, dt * 2.4); c.y += dy * Math.min(1, dt * 2.4);
      if (Math.hypot(dx, dy) > 0.3) c.head = Math.atan2(dx, -dy);
    }
    this.list = this.list.filter(c => c.fade > 0 || !g?.leave);
  }

  // ── 소라게: 느릿느릿 걷다 쉬다 · 키위가 가까이 오거나 파도가 밀려오면 껍데기 속으로
  hermit(dt, beach, quiet, opt = {}) {
    const g = this.group, { W, u } = beach;
    if (g) { g.age += dt; if (g.age > g.life || quiet) g.leave = true; }
    for (const c of this.list) {
      c.a = g?.leave ? c.a - dt / 1.5 : Math.min(1, c.a + dt);
      c.y = restShore(beach, c.x) + c.off;
      const e = beach.edge(c.x), covered = e < c.y - 4 * u;
      if (covered && !c.float) { c.float = true; c.pop = 0.25; this.ring(c.x, c.y, c.s * 0.4, 1, 0.4); }   // 파도가 덮치면 껍데기째 둥둥
      else if (c.float && e > c.y + 6 * u) c.float = false;                                            // 물이 빠지면 내려앉는다
      if (c.float) {
        c.hide = Math.max(c.hide, 1.2); c.walk = false;
        c.x = Math.max(15 * u, Math.min(W - 15 * u, c.x + Math.sin(this.t * 0.9 + c.ph) * 10 * u * dt));
        if ((c.bub -= dt) < 0) { c.bub = rnd(0.6, 1.2); this.ring(c.x, c.y + c.s * 0.25, c.s * 0.35, 1, 0.3); }
      }
      const near = (opt.kiwis || []).some(k => Math.hypot(k.x - c.x, k.y - c.y) < 70 * u);
      if (near) { if (c.hide <= 0) c.pop = 0.25; c.hide = Math.max(c.hide, rnd(2.5, 5)); c.walk = false; }
      if (c.hide > 0) { if (!near && !c.float) c.hide -= dt; }
      else if ((c.wait -= dt) < 0) {
        c.walk = !c.walk; c.wait = c.walk ? rnd(1.5, 4) : rnd(1, 3);
        if (c.walk) { const o = this.list.find(o => o !== c && Math.abs(o.x - c.x) < c.s * 1.5); c.face = o ? Math.sign(c.x - o.x || 1) : (Math.random() < 0.5 ? 1 : -1); }
      }
      if (c.walk) {
        c.x += c.face * 18 * u * dt;
        if (c.x < 15 * u || c.x > W - 15 * u) { c.face = -c.face; c.x = Math.max(15 * u, Math.min(W - 15 * u, c.x)); }
      }
      if (c.pop > 0) c.pop -= dt;
    }
    this.list = this.list.filter(c => c.a > 0 || !g?.leave);
  }

  // ── 달팽이: 숲 가장자리 아래를 늘었다 줄었다 기어가며 반짝이는 자국을 남긴다 (자국은 25초에 걸쳐 마른다)
  snail(dt, beach, quiet) {
    const g = this.group, { W, u } = beach, grass = x => (beach.grass ? beach.grass(x) : beach.edge(x) - 200 * u);
    if (g) { g.age += dt; if (g.age > g.life * 1.5 || quiet) g.leave = true; }
    for (const c of this.list) {
      c.a = g?.leave ? c.a - dt / 2 : Math.min(1, c.a + dt / 1.5);
      c.stretch = Math.sin(this.t * 1.3 + c.ph) > 0;   // 늘어날 때만 앞으로
      if (c.stretch) c.x += c.face * c.v * dt;
      if (c.x < 15 * u || c.x > W - 15 * u) { c.face = -c.face; c.x = Math.max(15 * u, Math.min(W - 15 * u, c.x)); }
      c.y = grass(c.x) + c.off;
      if (Math.abs(c.x - c.lx) > 4 * u) { c.trail.push({ x: c.x - c.face * c.s * 0.35, y: c.y + c.s * 0.3, age: 0 }); c.lx = c.x; }
      for (const p of c.trail) p.age += dt;
      c.trail = c.trail.filter(p => p.age < 25);
    }
    this.list = this.list.filter(c => c.a > 0 || !g?.leave);
  }

  draw(ctx, beach, cells, blit) {
    const k = this.k, u = beach.u;
    for (const c of this.list) {
      const cell = cells[c.cell];
      if (!cell) continue;
      if (k.mode === 'diver' || k.mode === 'peek') {
        const a = ease(clamp01(c.a)), bob = Math.sin(this.t * 1.5 + c.ph) * 1.5 * u, sink = (1 - a) * c.s * 0.25;
        blit(ctx, cell.shadow, c.x + 2 * u, c.y + 4 * u, 0, c.s, 0.18 * a, c.face);
        blit(ctx, cell.img, c.x, c.y + bob + sink, 0, c.s, a, c.face);
      } else if (k.mode === 'line') {
        const bob = Math.sin(this.t * 2 + c.ph) * 1.2 * u, face = c.vx >= 0 ? 1 : -1;
        blit(ctx, cell.shadow, c.x + 2 * u, c.y + 4 * u, 0, c.s, 0.18, face);
        blit(ctx, cell.img, c.x, c.y + bob, 0, c.s, 1, face);
      } else if (k.mode === 'swim') {
        const paddle = 1 + Math.sin(this.t * 3 + c.ph) * 0.02;
        blit(ctx, cell.shadow, c.x + 3 * u, c.y + 5 * u, c.head, c.s, 0.25);
        blit(ctx, cell.img, c.x, c.y, c.head, c.s * paddle, 0.9);
      } else if (k.mode === 'hopper') {
        const a = clamp01(c.a), base = beach.edge(c.x) + 4 * u + c.off * 0.5;
        blit(ctx, cell.shadow, c.x + 2 * u, base + 3 * u, 0, c.s * (c.hop > 0 ? 0.8 : 1), 0.22 * a, c.face);
        blit(ctx, cell.img, c.x, c.y, 0, c.s, a, c.face);
      } else if (k.mode === 'crab') {
        if (c.st === 'under') continue;   // 모래 속
        const dig = c.st === 'dig' ? c.k : c.st === 'pop' ? 1 - c.k : 0;   // 파고들기·나오기: 작아지며 흐려진다
        const a = clamp01(c.a) * (1 - dig), wob = c.run > 0 ? Math.sin(this.t * 30 + c.ph) * 0.08 : c.st === 'dig' ? Math.sin(this.t * 40) * 0.15 : 0, sc = c.s * (1 - dig * 0.35);
        blit(ctx, cell.shadow, c.x + 3 * u, c.y + 4 * u + dig * 2 * u, c.rot + wob, sc, 0.3 * a);
        blit(ctx, cell.img, c.x, c.y + dig * 2 * u, c.rot + wob, sc, a);
      } else if (k.mode === 'hermit') {
        const a = clamp01(c.a), id = c.hide > 0 ? k.cells[2] : c.walk ? k.cells[Math.floor(this.t * 6 + c.ph) % 2] : k.cells[0];
        const im = cells[id] || cell, pop = c.pop > 0 ? 1 - c.pop * 0.4 : 1;
        const bob = c.float ? Math.sin(this.t * 2.6 + c.ph) * 2.5 * u - 2 * u : 0, tilt = c.float ? Math.sin(this.t * 1.7 + c.ph) * 0.18 : 0;   // 둥둥
        blit(ctx, im.shadow, c.x + 2 * u, c.y + 3 * u, 0, c.s, (c.float ? 0.12 : 0.25) * a, c.face);
        blit(ctx, im.img, c.x, c.y + bob, tilt, c.s * pop, a, c.face);
      } else if (k.mode === 'snail') {
        const a = clamp01(c.a);
        if (c.trail.length > 1) {   // 반짝이는 자국
          ctx.save(); ctx.lineWidth = 2.2 * u; ctx.lineCap = 'round'; ctx.strokeStyle = '#fff';
          for (let i = 1; i < c.trail.length; i++) {
            const p = c.trail[i - 1], q = c.trail[i]; if (Math.abs(q.x - p.x) > 12 * u) continue;
            ctx.globalAlpha = 0.35 * a * (1 - q.age / 25);
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
          ctx.restore();
        }
        const im = cells[c.stretch ? k.cells[0] : k.cells[1]] || cell;
        blit(ctx, im.shadow, c.x + 2 * u, c.y + 3 * u, 0, c.s, 0.22 * a, c.face);
        blit(ctx, im.img, c.x, c.y, 0, c.s, a, c.face);
      } else if (k.mode === 'school') {
        // 물에 잠겨 보이게: 흐리게, 그림자는 바닥에 조금 떨어져 · 꼬리 흔들기: 곧음 → 구부림 → 곧음 → 반대로 구부림
        const a = clamp01(c.fade), f = Math.floor(this.t * 7 + c.ph) % 4;
        const im = c.finny ? cell : cells[k.swim[f % 2]] || cell, flip = f === 3 ? -1 : 1;
        blit(ctx, im.shadow, c.x + 4 * u, c.y + 7 * u, c.head, c.s, 0.3 * a, flip);
        blit(ctx, im.img, c.x, c.y, c.head, c.s, 0.82 * a, flip);
      } else {   // whirl · skate
        const a = clamp01(c.fade);
        blit(ctx, cell.shadow, c.x + 4 * u, c.y + 6 * u, c.head, c.s * 1.05, (k.mode === 'skate' ? 0.42 : 0.3) * a);
        blit(ctx, cell.img, c.x, c.y, c.head, c.s, a);
      }
    }
  }
}

export class Critters {
  constructor(load) { this.load = load; this.cells = null; this.loading = false; this.reset(); }

  reset() { this.tracks = []; this.rings = []; this.key = ''; }
  get list() { return this.tracks.flatMap(t => t.list); }

  // 4열 그림(칸은 정사각)을 칸별 캔버스로 자르고, 그림자(검은 흐린 실루엣)를 한 번만 만든다 — 매 프레임 filter 를 쓰지 않게
  setSheet(im) {
    if (typeof document === 'undefined') return;
    const cw = im.naturalWidth / 4, rows = Math.round(im.naturalHeight / cw), ch = im.naturalHeight / rows;
    this.cells = Array.from({ length: rows * 4 }, (_, i) => {
      const c = document.createElement('canvas'); c.width = Math.round(cw); c.height = Math.round(ch);
      c.getContext('2d').drawImage(im, (i % 4) * cw, Math.floor(i / 4) * ch, cw, ch, 0, 0, cw, ch);
      const s = document.createElement('canvas'); s.width = c.width; s.height = c.height;
      const g = s.getContext('2d'); g.filter = `brightness(0) blur(${Math.round(cw * 0.03)}px)`; g.drawImage(c, 0, 0);
      return { img: c, shadow: s };
    });
  }

  ring(x, y, r, life = 1.2, a = 0.5) { this.rings.push({ x, y, r, age: 0, life, a }); }

  // opt = { kinds: ['crab', …] | 'crab' | undefined, night 0~1, rain 0~1 }
  update(dt, beach, opt = {}) {
    const kinds = [].concat(opt.kinds || []).filter(k => CRITTERS[k]), key = kinds.join(',');
    if (key !== this.key) { this.tracks = kinds.map(k => new Track(k, (...a) => this.ring(...a))); this.rings = []; this.key = key; }
    if (!kinds.length) return;
    if (!this.cells && !this.loading && this.load) {
      this.loading = true;
      this.load().then(im => this.setSheet(im)).catch(() => {}).finally(() => { this.loading = false; });
    }
    if (this.cells) for (const t of this.tracks) t.update(dt, beach, opt);
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter(r => r.age < r.life);
  }

  // 무대 층: 물결 → 물속 물고기 → 물 위·물가 생물 (시간 빛이 함께 입혀진다)
  drawWater(ctx, beach) {
    const u = beach.u;
    if (this.rings.length) {
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.1 * u;
      for (const r of this.rings) {
        const g = r.age / r.life; ctx.globalAlpha = r.a * (1 - g);
        ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * (0.5 + g * 1.5), r.r * (0.22 + g * 0.65), 0, 0, 6.29); ctx.stroke();
      }
      ctx.restore();
    }
    if (!this.cells) return;
    const order = [...this.tracks].sort((a, b) => (b.k.mode === 'school') - (a.k.mode === 'school'));   // 물고기는 맨 아래
    for (const t of order) t.draw(ctx, beach, this.cells, this.blit);
  }

  // face: 옆모습을 좌우로 뒤집기 (1 오른쪽 · -1 왼쪽)
  blit(ctx, im, x, y, rot, s, a, face = 1) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(face, 1);
    ctx.drawImage(im, -s / 2, -s / 2, s, s); ctx.restore();
  }
}
