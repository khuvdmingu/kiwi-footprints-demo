// dock.js — 바닷가에 배를 대고 키위가 타고 내린다 (2026-11-02, 부두 영상 cut-board·cut-arrive 대신)
//
//  사용자: 「영상으로 부두에서 내리는 장면은 현실성이 떨어진다 — 바닷가에 배가 오고 키위들이 내리는 모습으로」
//  그림은 항해 장면(voyage-scene.js)의 배·돛·배 위 키위를 섬 화면 위에 그대로 그린다 — 고른 배·돛·키위 수가 그대로 보인다.
//  배는 위에서 본 그림(뱃머리가 위)이라 섬 화면의 바다(물가선 아래)에서 올라와 뱃머리를 모래에 댄다.
//  · 도착 arrive: 아래에서 들어와 닿고 → 한 마리씩 자리에서 모래로 뛰어내려(onLand → after) → 돌아서 바다로
//  · 출항 board: 들어와 닿고 → 섬 키위가 뱃머리로 걸어와 한 마리씩 자리로 뛰어오른다 → 돌아서 바다로 → 끝나면 바다 장면(main.js)
//  v30.6.1 (사용자 「속도가 너무 일정하고 기계 같다 · 키위도 점프해서 들어가면」):
//   배는 늘 물결에 실려 출렁이고(겹친 사인 — 같은 박자로 되풀이되지 않게) 옆으로 조금씩 흘러가며 뱃머리가 좌우로 흔들린다.
//   다가올 땐 물결이 밀어 주듯 빨라졌다 느려지고, 모래에 닿으면 한 번 물러났다 가라앉고, 떠날 땐 천천히 돌아 서서히 빨라진다.
//   키위는 섬 키위 그대로(옷·이름) 포물선으로 뛰어 자리에 앉거나 모래에 내려선다 — 그림자는 땅에 남는다.
//  키위를 만들고 지우는 일은 main.js 가 준 함수로 — 여기는 배의 움직임·뛰기와 그림만.

const IN = 4.2, SETTLE = 1.1, GAP = 0.55, JUMP = 0.62, WAIT = 0.7, TURN = 2.6, OUT = 3.6;
const clamp01 = x => Math.min(1, Math.max(0, x));
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOut = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const easeIn = x => Math.pow(clamp01(x), 2.2);

export class Dock {
  constructor(scene) { this.scene = scene; this.run = null; this.idle = Promise.resolve(); this.foam = []; }
  get busy() { return !!this.run; }
  // 도착: 배에서 키위가 다 내리면 resolve (배는 그 뒤 혼자 바다로 떠난다 — 다 떠나면 idle)
  arrive(o) { return this.start({ ...o, kind: 'arrive', crew: o.n }); }
  // 출항: 고른 키위가 다 타고 배가 화면 밖으로 나가면 resolve
  board(o) { return this.start({ ...o, kind: 'board', crew: 0 }); }
  start(o) {
    this.stop();
    const sc = this.scene, seats = sc.seatCount?.() ?? 10;
    o = { ...o, n: Math.min(o.n ?? 0, seats), max: Math.min(o.max ?? 10, seats) };   // 고른 배 자리만큼만 타고 내린다
    if (o.kind === 'arrive') o.crew = o.n;
    // 크기: 배 위 키위(나무 보트 폭의 0.43)가 섬 키위 키와 비슷하게
    const kh = o.k * 1.05, hb = sc.hullBox, refW = kh / 0.43;
    const bh = hb ? refW * hb.h / hb.w / 0.78 : o.k * 4;
    const alt = hb ? sc.alt : null, len = alt ? bh * alt.h : hb ? bh * 0.78 : bh;
    const bx = Math.min(o.W - len * 0.6, Math.max(len * 0.6, o.x ?? o.W * 0.5));
    const shore = o.beach.shoreAt(bx), dockY = shore + len * 0.44, outY = Math.max(o.H, shore) + len * 0.9;
    const seed = Math.random() * 100;   // 장면마다 물결 박자가 다르게
    return new Promise(res => {
      let ended;
      this.idle = new Promise(r => { ended = r; });
      this.run = { ...o, bh, len, bx, dockY, outY, seed, clock: 0, t: 0, phase: 'in', res, ended, walkers: [], jumps: [], landed: 0, base: outY, side: Math.random() < 0.5 ? -1 : 1 };
    });
  }
  stop() {
    const r = this.run; if (!r) return;
    for (const j of r.jumps) { j.kw.flying = false; j.kw.lift = 0; if (j.kind === 'on') j.kw.gone = true; }
    this.run = null; r.res(false); r.ended();
  }
  // 물결: 출렁임(위아래)·흘러감(옆)·뱃머리 흔들림. calm = 모래에 얹혀 있을 땐 작게
  sway(r, calm) {
    const c = r.clock + r.seed, L = r.len, a = calm ? 0.35 : 1;
    return {
      dy: a * L * (0.022 * Math.sin(c * 1.17) + 0.012 * Math.sin(c * 0.53 + 1.3) + 0.006 * Math.sin(c * 2.9 + 0.4)),
      dx: a * L * (0.05 * Math.sin(c * 0.31 + 0.8) + 0.02 * Math.sin(c * 0.83)),
      yaw: a * (0.045 * Math.sin(c * 0.62 + 2.1) + 0.02 * Math.sin(c * 1.41)),
    };
  }
  // 지금 배의 자리(물결 포함)
  pose(r = this.run) {
    const calm = ['settle', 'off', 'on', 'wait'].includes(r.phase), s = this.sway(r, calm);
    return { x: r.bx + s.dx + (r.drift || 0), y: r.base + s.dy, rot: (r.turn || 0) + s.yaw + (r.lean || 0) };
  }
  // 뱃머리 바로 앞 모래 (물가선보다 조금 위)
  bow(r = this.run) { const p = this.pose(r); return { x: p.x, y: r.dockY - r.len * 0.46 - r.k * 0.3 }; }
  // i 번째 자리의 발 자리 (화면 좌표)
  seat(i, r = this.run) {
    const p = this.pose(r), [sx, sy] = this.scene.seatAt?.(i, r.bh) ?? [0, 0], c = Math.cos(p.rot), s = Math.sin(p.rot);
    return { x: p.x + sx * c - sy * s, y: p.y + sx * s + sy * c };
  }
  // 포물선 뛰기: 땅 위 자리(x, y)는 곧게, 높이(lift)는 위로 볼록 — 그림자는 땅에 남는다
  jump(kw, from, to, kind, i) {
    kw.flying = true; kw.job = null; kw.v = 0;
    kw.face = to().x >= from.x ? 1 : -1;
    this.run.jumps.push({ kw, from, to, kind, i, t: 0 });
  }
  update(dt) {
    const r = this.run; if (!r) return;
    if (!this.scene.ready) { this.stop(); return; }   // 항해 그림을 놓아 버렸으면 조용히 끝
    r.t += dt; r.clock += dt;
    const go = phase => { r.phase = phase; r.t = 0; };
    if (r.phase === 'in') {
      // 물결에 밀려 오듯: 큰 흐름은 점점 느려지고, 그 위에 밀었다 놓는 작은 숨이 얹힌다
      const p = easeOut(r.t / IN), surge = Math.sin(r.t * 2.1) * (1 - p) * 0.035;
      r.base = r.outY + (r.dockY - r.outY) * clamp01(p + surge * p);
      r.drift = r.side * r.len * 0.18 * (1 - p);   // 비스듬히 들어오다 똑바로
      r.lean = r.side * -0.16 * (1 - p) * (1 - p);
      if (r.t >= IN) go('settle');
    } else if (r.phase === 'settle') {
      // 모래에 닿아 살짝 밀려 올라갔다 물러나며 가라앉는다
      r.base = r.dockY - Math.exp(-3.2 * r.t) * Math.sin(r.t * 5.2) * r.len * 0.035;
      r.drift = 0; r.lean = 0;
      if (r.t >= SETTLE) {
        if (r.kind === 'arrive') go('off');
        else { r.walkers = (r.pick?.(this.bow(), r.k, r.max) || []).slice(0, r.max); go(r.walkers.length ? 'on' : 'wait'); }
      }
    } else if (r.phase === 'off') {
      r.base = r.dockY;
      // 한 마리씩: 뒷자리부터 자리를 비우고 모래로 뛰어내린다
      while (r.landed < r.n && r.t >= r.landed * GAP) {
        const i = r.n - 1 - r.landed, from = this.seat(i);
        r.landed++; r.crew = r.n - r.landed;
        const b = this.bow(), side = (r.landed % 2 ? 1 : -1) * (0.3 + 0.35 * Math.random());
        const land = { x: b.x + side * r.k, y: b.y - r.k * (0.4 + Math.random() * 0.35) };
        const kw = r.onLand?.(from.x, from.y, r.landed - 1);
        if (kw) this.jump(kw, from, () => land, 'off', r.landed - 1);
      }
      if (r.landed >= r.n && !r.jumps.length) { r.res(true); go('wait'); }
    } else if (r.phase === 'on') {
      r.base = r.dockY;
      const b = this.bow();
      for (const w of r.walkers) {
        if (w.boarded) continue;
        if (r.t - (r.lastOn ?? -9) < GAP) break;   // 한 번에 한 마리씩
        const near = Math.hypot(w.kw.x - b.x, w.kw.y - b.y) < r.k * 0.95;
        if (near || r.t > 7 || w.kw.gone) {
          r.lastOn = r.t; w.boarded = true;
          if (w.kw.gone) continue;
          const i = r.taken ?? 0, from = { x: w.kw.x, y: w.kw.y };
          r.taken = i + 1;
          this.jump(w.kw, from, () => this.seat(i), 'on', i);
        }
      }
      if (r.walkers.every(w => w.boarded) && !r.jumps.length) go('wait');
    } else if (r.phase === 'wait') {
      r.base = r.dockY;
      if (r.t >= WAIT) go('turn');
    } else if (r.phase === 'turn') {
      // 뒤로 밀려나며 천천히 뱃머리를 바다 쪽으로
      const p = easeInOut(r.t / TURN);
      r.turn = Math.PI * p * r.side;
      r.base = r.dockY + r.len * 0.42 * easeIn(r.t / TURN);
      r.drift = r.side * r.len * 0.12 * Math.sin(p * Math.PI);
      if (r.t >= TURN) { r.y0 = r.base; go('out'); }
    } else if (r.phase === 'out') {
      // 바람을 받아 서서히 빨라지며 먼바다로 (조금 비스듬히)
      const p = easeIn(r.t / OUT);
      r.turn = Math.PI * r.side + r.side * 0.08 * Math.sin(r.t * 0.7);
      r.base = r.y0 + (r.outY + r.len - r.y0) * p;
      r.drift = r.side * r.len * 0.25 * p;
      if (r.t >= OUT) {
        this.run = null;
        if (r.kind === 'board') r.res(true);
        r.ended();
      }
    }
    // 뛰는 키위
    for (const j of r.jumps) {
      j.t += dt;
      const p = clamp01(j.t / JUMP), to = j.to(), e = easeInOut(p), kw = j.kw;
      kw.x = j.from.x + (to.x - j.from.x) * e;
      kw.y = j.from.y + (to.y - j.from.y) * e;
      kw.lift = Math.sin(Math.PI * p) * r.k * 1.1;
      if (p >= 1) {
        j.done = true; kw.flying = false; kw.lift = 0;
        if (j.kind === 'on') { kw.gone = true; r.crew = Math.min(r.max ?? 10, r.crew + 1); r.onBoard?.(kw); }
        else r.after?.(kw, j.i);
      }
    }
    r.jumps = r.jumps.filter(j => !j.done);
    r.y = r.base;
    // 배 뒤 물거품: 움직이는 동안 고물 쪽에 하나씩 퍼진다
    const moving = r.phase === 'in' || r.phase === 'turn' || r.phase === 'out';
    r.foamT = (r.foamT || 0) + dt;
    if (moving && r.foamT > 0.14 + Math.random() * 0.1) {
      r.foamT = 0;
      // 고물 양옆에 물살 한 쌍 — 배 옆으로 벌어지며 흐려져 V 자 물길이 된다
      const ps = this.pose(r), back = r.len * 0.42, sx = Math.cos(ps.rot), sy = Math.sin(ps.rot);
      const cx = ps.x - sy * back, cy = ps.y + sx * back, sp = r.len * (0.16 + Math.random() * 0.06);
      for (const k of [-1, 1]) this.foam.push({ x: cx + sx * k * r.len * 0.12, y: cy + sy * k * r.len * 0.12, vx: sx * k * sp, vy: sy * k * sp + sx * sp * 0.25, t: 0, s: r.len * (0.7 + Math.random() * 0.3), rot: ps.rot });
    }
    for (const f of this.foam) { f.t += dt; f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; }
    this.foam = this.foam.filter(f => f.t < 1.6);
  }
  draw(c, beach, st) {
    const r = this.run;
    for (const f of this.foam) {
      const a = (1 - f.t / 1.6) * 0.3, w = f.s * (0.06 + f.t * 0.09);
      if (f.y < beach.shoreAt(f.x) - 2) continue;   // 모래 위엔 거품을 그리지 않는다
      c.fillStyle = `rgba(255,255,255,${a * 0.6})`;
      c.beginPath(); c.ellipse(f.x, f.y, w, w * 0.35, f.rot || 0, 0, Math.PI * 2); c.fill();
    }
    if (!r || r.base == null || !this.scene.ready) return;
    const p = this.pose(r);
    c.save();
    c.translate(p.x, p.y); c.rotate(p.rot);
    try {
      // 배는 drawBoat 가 (0,0) 가운데에 그린다 · 시간은 장면 내내 이어지게(단계마다 0 으로 돌아가면 툭 끊긴다)
      this.scene.drawBoat(c, 0, 0, r.bh, { ...st, crew: r.crew, side: 1 }, null, r.clock + r.seed);
    } catch (e) { this.stop(); console.warn('바닷가 배를 끕니다:', e); }
    c.restore();
  }
}
