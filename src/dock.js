// dock.js — 바닷가에 배를 대고 키위가 타고 내린다 (2026-11-02, 부두 영상 cut-board·cut-arrive 대신)
//
//  사용자: 「영상으로 부두에서 내리는 장면은 현실성이 떨어진다 — 바닷가에 배가 오고 키위들이 내리는 모습으로」
//  그림은 항해 장면(voyage-scene.js)의 배·돛·배 위 키위를 섬 화면 위에 그대로 그린다 — 고른 배·돛·키위 수가 그대로 보인다.
//  배는 위에서 본 그림(뱃머리가 위)이라 섬 화면의 바다(물가선 아래)에서 올라와 뱃머리를 모래에 댄다.
//  · 도착 arrive: 아래에서 들어와 닿고 → 한 마리씩 폴짝 내려(onLand) → 돌아서 바다로
//  · 출항 board: 들어와 닿고 → 섬 키위가 뱃머리로 걸어와 하나씩 탄다 → 돌아서 바다로 → 끝나면 바다 장면(main.js)
//  키위를 만들고 지우는 일은 main.js 가 준 함수로 — 여기는 배의 움직임과 그림만.

const IN = 2.6, SETTLE = 0.45, HOP = 0.42, WAIT = 0.5, TURN = 1.3, OUT = 2.6;
const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const easeIn = x => Math.pow(Math.min(1, Math.max(0, x)), 2);

export class Dock {
  constructor(scene) { this.scene = scene; this.run = null; this.idle = Promise.resolve(); this.foam = []; }
  get busy() { return !!this.run; }
  // 도착: 배에서 키위가 다 내리면 resolve (배는 그 뒤 혼자 바다로 떠난다 — 다 떠나면 whenIdle)
  arrive(o) { return this.start({ ...o, kind: 'arrive', crew: o.n }); }
  // 출항: 고른 키위가 다 타고 배가 화면 밖으로 나가면 resolve
  board(o) { return this.start({ ...o, kind: 'board', crew: 0 }); }
  start(o) {
    this.stop();
    const sc = this.scene, seats = sc.seatCount?.() ?? 10;
    o = { ...o, n: Math.min(o.n ?? 0, seats), max: Math.min(o.max ?? 10, seats) };   // 고른 배 자리만큼만 타고 내린다
    // 크기: 배 위 키위(나무 보트 폭의 0.43)가 섬 키위 키와 비슷하게
    const kh = o.k * 1.05, hb = sc.hullBox, refW = kh / 0.43;
    const bh = hb ? refW * hb.h / hb.w / 0.78 : o.k * 4;
    const alt = hb ? sc.alt : null, len = alt ? bh * alt.h : hb ? bh * 0.78 : bh;
    const bx = Math.min(o.W - len * 0.6, Math.max(len * 0.6, o.x ?? o.W * 0.5));
    const shore = o.beach.shoreAt(bx), dockY = shore + len * 0.44, outY = Math.max(o.H, shore) + len * 0.9;
    return new Promise(res => {
      let ended;
      this.idle = new Promise(r => { ended = r; });
      this.run = { ...o, bh, len, bx, dockY, outY, t: 0, phase: 'in', res, ended, walkers: [], landed: 0 };
    });
  }
  stop() {
    const r = this.run; if (!r) return;
    this.run = null; r.res(false); r.ended();
  }
  bow(r = this.run) { return { x: r.bx, y: r.y - r.len * 0.46 - r.k * 0.3 }; }   // 뱃머리 바로 앞 모래 (물가선보다 조금 위)
  update(dt) {
    const r = this.run; if (!r) return;
    if (!this.scene.ready) { this.stop(); return; }   // 항해 그림을 놓아 버렸으면 조용히 끝
    r.t += dt;
    const go = phase => { r.phase = phase; r.t = 0; };
    if (r.phase === 'in') {
      r.y = r.outY + (r.dockY - r.outY) * ease(r.t / IN); r.turn = 0;
      if (r.t >= IN) go('settle');
    } else if (r.phase === 'settle') {
      r.y = r.dockY + Math.sin(r.t / SETTLE * Math.PI) * r.len * 0.03;   // 모래에 닿으며 한 번 출렁
      if (r.t >= SETTLE) {
        if (r.kind === 'arrive') go('off');
        else { r.walkers = (r.pick?.(this.bow(), r.k, r.max) || []).slice(0, r.max); go(r.walkers.length ? 'on' : 'wait'); }
      }
    } else if (r.phase === 'off') {
      r.y = r.dockY;
      // 한 마리씩: 자리에서 사라지고 뱃머리 앞 모래에 폴짝
      while (r.landed < r.n && r.t >= r.landed * HOP) {
        r.landed++; r.crew = r.n - r.landed;
        const b = this.bow(), side = (r.landed % 2 ? 1 : -1) * (0.15 + 0.25 * Math.random());
        r.onLand?.(b.x + side * r.k, b.y - r.k * (0.35 + Math.random() * 0.25), r.landed - 1);
      }
      if (r.landed >= r.n && r.t >= r.n * HOP + 0.2) { r.res(true); go('wait'); }
    } else if (r.phase === 'on') {
      r.y = r.dockY;
      const b = this.bow();
      for (const w of r.walkers) {
        if (w.boarded) continue;
        const near = Math.hypot(w.kw.x - b.x, w.kw.y - b.y) < r.k * 0.95;
        if (r.t - (r.lastOn ?? -9) < HOP) break;   // 한 번에 한 마리씩
        if (near || r.t > 7 || w.kw.gone) {
          r.lastOn = r.t;
          // 뱃머리에 닿으면 폴짝 — 배 위 자리 하나가 찬다 (늦어도 7초면 태운다)
          if (!w.kw.gone) { w.kw.gone = true; r.onBoard?.(w.kw); }
          w.boarded = true; r.crew = Math.min(r.max ?? 10, r.crew + 1);
        }
      }
      if (r.walkers.every(w => w.boarded)) go('wait');
    } else if (r.phase === 'wait') {
      r.y = r.dockY;
      if (r.t >= WAIT) go('turn');
    } else if (r.phase === 'turn') {
      // 뱃머리를 바다 쪽으로 돌리며 살짝 물러난다
      r.turn = Math.PI * ease(r.t / TURN);
      r.y = r.dockY + r.len * 0.35 * easeIn(r.t / TURN);
      if (r.t >= TURN) { r.y0 = r.y; go('out'); }
    } else if (r.phase === 'out') {
      r.turn = Math.PI;
      r.y = r.y0 + (r.outY + r.len - r.y0) * easeIn(r.t / OUT);
      if (r.t >= OUT) {
        this.run = null;
        if (r.kind === 'board') r.res(true);
        r.ended();
      }
    }
    // 배 뒤 물거품: 움직이는 동안 고물 쪽에 하나씩 퍼진다
    const moving = r.phase === 'in' || r.phase === 'turn' || r.phase === 'out';
    r.foamT = (r.foamT || 0) + dt;
    if (moving && r.foamT > 0.16) {
      r.foamT = 0;
      const back = Math.cos(r.turn || 0);   // 1 = 뱃머리가 위 → 고물은 아래
      this.foam.push({ x: r.bx + (Math.random() - 0.5) * r.len * 0.2, y: r.y + back * r.len * 0.45, t: 0, s: r.len });
    }
    for (const f of this.foam) f.t += dt;
    this.foam = this.foam.filter(f => f.t < 1.4);
  }
  draw(c, beach, st) {
    const r = this.run;
    for (const f of this.foam) {
      const a = (1 - f.t / 1.4) * 0.35, w = f.s * (0.12 + f.t * 0.22);
      if (f.y < beach.shoreAt(f.x) - 2) continue;   // 모래 위엔 거품을 그리지 않는다
      c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = Math.max(1, f.s * 0.012);
      c.beginPath(); c.ellipse(f.x, f.y, w, w * 0.45, 0, 0, Math.PI * 2); c.stroke();
    }
    if (!r || r.y == null || !this.scene.ready) return;
    const t = r.t + (r.phase === 'in' ? 0 : 3);
    c.save();
    c.translate(r.bx, r.y); c.rotate(r.turn || 0);
    try {
      // 배는 drawBoat 가 (0,0) 가운데에 그린다 — 출렁임은 drawBoat 안의 rock 이 맡는다
      this.scene.drawBoat(c, 0, 0, r.bh, { ...st, crew: r.crew, side: 1 }, null, t);
    } catch (e) { this.stop(); console.warn('바닷가 배를 끕니다:', e); }
    c.restore();
  }
}
