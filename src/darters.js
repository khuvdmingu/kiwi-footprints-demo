// darters.js — v30.26 물 위 잠자리 떼 (고추잠자리 · 파란 실잠자리)
//  사용자 2026-11-22: "다른 맵들도 이런 생물체가 돌아다니면 · 해변 말고 바다 쪽에 · 작은 고추잠자리 떼"
//  갈매기(gulls.js)는 화면을 가로질러 지나가고, 잠자리는 물 위 한 곳을 맴돈다:
//   · 떼(4~8마리)가 물 위 한 점 둘레에 모여 0.3~1.2초 멈춰 떠 있다가 짧게 휙 옮겨 간다.
//   · 날개는 접었다 펴지 않고 두 칸(펼침·날갯짓)을 빠르게 바꿔 투명하게 떨린다.
//   · 가끔 꼬리로 물을 톡 찍으면 동그란 물결이 번진다 (병·낙엽 물결과 같은 흰 타원).
//   · 떼는 25~40초 머물다 화면 밖으로 흘러가고, 잠시 뒤 다른 자리에 새 떼가 온다. 밤·비에는 오지 않는다.
//  자리: 물가선(beach.edge) 아래 띠에서만 — 글씨 쓰는 바닥은 가리지 않는다.
//  그림: assets/darters.webp 4×1 칸 (0 고추 펼침 · 1 고추 날갯짓 · 2 실잠자리 펼침 · 3 실잠자리 날갯짓), 머리가 위를 본다.
//        (Codex image_gen 한 장 4×2 격자 — 아래 줄 4칸은 다음 단계 생물 재고, stock/critters-2026-11-22)

import { LIGHT } from './tokens.js?v=v30.40.0-bb99cd3';

export const DARTER_KINDS = {
  red: { cell: 0, size: 38, n: [5, 8], few: [3, 5], dip: 0.12, shade: 0.18 },    // 고추잠자리: 크고, 가끔 물 찍기
  blue: { cell: 2, size: 34, n: [4, 7], few: [3, 4], dip: 0.05, shade: 0.3 },   // 실잠자리: 가늘다 · 청록 물에 묻히지 않게 그림자를 짙게
};

const rnd = (a, b) => a + Math.random() * (b - a);
const ease = k => k * k * (3 - 2 * k);

export class Darters {
  constructor(load) { this.load = load; this.cells = null; this.loading = false; this.list = []; this.rings = []; this.swarm = null; this.next = 4; this.t = 0; }

  // 4×1 그림을 칸별 캔버스로 자르고, 물에 비칠 그림자(검은 흐린 실루엣)를 한 번만 만들어 둔다 — 매 프레임 filter 를 쓰지 않게
  setSheet(im) {
    if (typeof document === 'undefined') return;
    const cw = im.naturalWidth / 4, ch = im.naturalHeight;
    this.cells = [0, 1, 2, 3].map(i => {
      const c = document.createElement('canvas'); c.width = Math.round(cw); c.height = Math.round(ch);
      c.getContext('2d').drawImage(im, i * cw, 0, cw, ch, 0, 0, cw, ch);
      const s = document.createElement('canvas'); s.width = c.width; s.height = c.height;
      const g = s.getContext('2d'); g.filter = `brightness(0) blur(${Math.round(cw * 0.025)}px)`; g.drawImage(c, 0, 0);
      return { img: c, shadow: s };
    });
  }

  reset() { this.list = []; this.rings = []; this.swarm = null; this.next = 3; }
  get busy() { return this.list.length > 0 || this.rings.length > 0; }

  // 물 위 띠: 물가선 아래 30u ~ 화면 아래 70u (맨 아래 입력 칸과 겹치지 않게 · 물가선이 화면 밖이면 띠가 없다)
  band(beach, x) {
    const u = beach.u, top = beach.edge(x) + 30 * u, bot = beach.H - 70 * u;
    return bot - top > 30 * u ? [top, bot] : null;
  }

  // opt = { kind: 'red'|'blue'|undefined, few, night 0~1, rain 0~1, wind 0~1 }
  update(dt, beach, opt = {}) {
    this.t += dt;
    const k = DARTER_KINDS[opt.kind];
    if (!k) { if (this.list.length) this.reset(); return; }
    if (!this.cells && !this.loading && this.load) {
      this.loading = true;
      this.load().then(im => this.setSheet(im)).catch(() => {}).finally(() => { this.loading = false; });
    }
    const { W, u } = beach, quiet = (opt.night || 0) > 0.5 || (opt.rain || 0) > 0.4;

    // 떼가 없으면 잠시 뒤 새 떼
    if (!this.swarm && !this.list.length && !quiet && this.cells && this.t > this.next) {
      const x = rnd(0.15, 0.85) * W, b = this.band(beach, x);
      if (b) {
        const [lo, hi] = opt.few ? k.few : k.n, n = Math.round(rnd(lo, hi + 0.99) - 0.49);
        const y = rnd(b[0] + 20 * u, b[1] - 20 * u), from = Math.random() < 0.5 ? -1 : 1;
        this.swarm = { x, y, vx: rnd(-6, 6) * u, vy: 0, life: rnd(25, 40), age: 0, r: rnd(55, 95) * u, kind: opt.kind };
        for (let i = 0; i < n; i++) {
          // 화면 옆에서 날아 들어와 떼 자리로 모인다
          const sx = from < 0 ? -30 * u - i * 18 * u : W + 30 * u + i * 18 * u, sy = y + rnd(-40, 40) * u;
          this.list.push({ x: sx, y: sy, fx: sx, fy: sy, tx: x + rnd(-1, 1) * 60 * u, ty: y + rnd(-1, 1) * 30 * u,
            state: 'dart', k: 0, dur: rnd(0.9, 1.6), hold: 0, head: from < 0 ? Math.PI / 2 : -Math.PI / 2, ph: Math.random() * 9, s: k.size * u * rnd(0.88, 1.08) });
        }
      }
    }

    const sw = this.swarm;
    if (sw) {
      sw.age += dt;
      // 떼 가운데는 천천히 떠돌고 바람에 밀린다 · 떠날 때가 되면 한쪽으로 흘러 나간다
      const leaving = sw.age > sw.life || quiet;
      if (leaving && !sw.leave) sw.leave = sw.x < W / 2 ? -1 : 1;
      sw.vx += (rnd(-1, 1) * 10 * u - sw.vx * 0.3) * dt + (opt.wind || 0) * 12 * u * dt;
      if (sw.leave) sw.vx = sw.leave * 70 * u;
      sw.x += sw.vx * dt;
      const b = this.band(beach, Math.max(0, Math.min(W, sw.x)));
      if (b) sw.y = Math.max(b[0] + 15 * u, Math.min(b[1] - 15 * u, sw.y + Math.sin(this.t * 0.3) * 4 * u * dt));
    }

    for (const d of this.list) {
      if (d.state === 'hover') {
        d.hold -= dt;
        if (d.hold <= 0) {   // 다음 자리로 휙
          const cx = sw ? sw.x : d.x, cy = sw ? sw.y : d.y, r = sw ? sw.r : 60 * u;
          let tx = cx + rnd(-1, 1) * r, ty = cy + rnd(-1, 1) * r * 0.55;
          if (sw?.leave) tx = d.x + sw.leave * rnd(120, 200) * u;
          const b = this.band(beach, Math.max(0, Math.min(W, tx)));
          if (b) ty = Math.max(b[0], Math.min(b[1], ty));
          Object.assign(d, { state: 'dart', fx: d.x, fy: d.y, tx, ty, k: 0, dur: rnd(0.15, 0.35) });
        }
      } else {
        d.k = Math.min(1, d.k + dt / d.dur);
        const e = ease(d.k), nx = d.fx + (d.tx - d.fx) * e, ny = d.fy + (d.ty - d.fy) * e;
        if (Math.hypot(nx - d.x, ny - d.y) > 0.3) d.head = Math.atan2(nx - d.x, -(ny - d.y));   // 위(머리) = 0
        d.x = nx; d.y = ny;
        if (d.k >= 1) {
          d.state = 'hover'; d.hold = rnd(0.3, 1.2);
          // 가끔 물을 톡 찍는다 → 동그란 물결
          if (!sw?.leave && Math.random() < k.dip) this.rings.push({ x: d.x, y: d.y + d.s * 0.4, age: 0, life: 1.1, r: d.s * 0.5 });
        }
      }
    }
    // 화면 밖으로 나간 것은 지운다 (떠나는 중일 때만)
    if (sw?.leave) this.list = this.list.filter(d => d.x > -60 * u && d.x < W + 60 * u);
    if (sw && !this.list.length) { this.swarm = null; this.next = this.t + rnd(6, 15); }
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter(r => r.age < r.life);
  }

  draw(ctx, beach) {
    const u = beach.u, [lx, ly] = LIGHT.dir;
    ctx.save();
    for (const r of this.rings) {
      const a = 1 - r.age / r.life, g = r.age / r.life;
      ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.1 * u;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * (0.4 + g * 1.6), r.r * (0.18 + g * 0.7), 0, 0, 6.29); ctx.stroke();
    }
    ctx.restore();
    if (!this.cells) return;
    const kd = DARTER_KINDS[this.swarm?.kind || 'red'], base = kd.cell;
    for (const d of this.list) {
      // 날갯짓: 떠 있을 땐 조금 느리게, 휙 갈 땐 빠르게 두 칸을 바꾼다
      const f = Math.floor(this.t * (d.state === 'dart' ? 34 : 22) + d.ph) % 2, cell = this.cells[base + f];
      const wob = d.state === 'hover' ? Math.sin(this.t * 7 + d.ph) * 0.06 : 0;
      const bob = d.state === 'hover' ? Math.sin(this.t * 5 + d.ph) * 1.2 * u : 0;
      const s = d.s, one = (im, x, y, a) => {
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(d.head + wob);
        ctx.drawImage(im, -s / 2, -s / 2, s, s); ctx.restore();
      };
      one(cell.shadow, d.x + lx * 9 * u, d.y + ly * 12 * u, kd.shade);   // 낮게 나니 그림자가 가깝다
      one(cell.img, d.x, d.y + bob, 1);
    }
  }
}
