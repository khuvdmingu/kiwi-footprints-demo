// sky/bits.js — v28.20 날씨 조각: 먼 번개 · 달무리 · 모래바람 · 마른 풀공 · 아침 안개 띠
//
//  atmos.js 가 매 프레임 update/draw 를 부른다 (#fx 층, 시간 빛 위). 그림: assets/weather-bits.webp (3×2 투명, 재고 stock/weather 2026-10-22)
//   1행 번개 · 갈래 번개 · 달무리 / 2행 모래바람 소용돌이 · 마른 풀공 · 아침 안개 띠
//  위에서 내려다보는 화면이라 하늘에 있는 것(번개·달)은 바다에 비친 모습으로 그린다.
//  · 번개: 비가 세게 올 때 20~45초에 한 번 — 화면이 한 번 번쩍하고 바다에 번개가 비친다 (onThunder 로 소리를 붙일 수 있다)
//  · 달무리: 흐린 밤, 바다에 달과 무리가 은은하게 비친다
//  · 모래바람·마른 풀공: 사막 오아시스에서 바람이 있을 때(맑음 포함 가끔) 모래 위를 가로지른다
//  · 아침 안개 띠: 5시~8시 반, 비·눈이 아니면 물가 위로 천천히 흘러간다

const FILE = 'assets/weather-bits.webp?v=v29.14.0';
const CELL = { bolt: 0, fork: 1, halo: 2, dust: 3, tumble: 4, mist: 5 };

export class SkyBits {
  constructor(rand = Math.random) { this.rand = rand; this.cells = undefined; this.t = 0; this.flash = 0; this.bolt = null; this.nextBolt = 12; this.rollers = []; this.nextRoll = 8; this.mist = []; this.onThunder = null; this.halo = 0; }

  sheet() {
    if (this.cells !== undefined || typeof Image === 'undefined') return this.cells || null;
    this.cells = null;
    const im = new Image();
    im.onload = () => {
      const cw = im.naturalWidth / 3, ch = im.naturalHeight / 2, list = [];
      for (let k = 0; k < 6; k++) { const cv = document.createElement('canvas'); cv.width = Math.round(cw); cv.height = Math.round(ch); cv.getContext('2d').drawImage(im, (k % 3) * cw, Math.floor(k / 3) * ch, cw, ch, 0, 0, cv.width, cv.height); list.push(cv); }
      this.cells = list;
    };
    im.src = FILE;
    return null;
  }

  update(dt, beach, v, mapId = 'beach', night = 0, hour = 12) {
    this.t += dt;
    const R = this.rand, W = beach.W, H = beach.H, u = beach.u;
    const top = beach.bushY ?? H * 0.25, bot = beach.shoreY ?? H * 0.6;
    if (!isFinite(top) || !isFinite(bot)) return;
    // 번개
    this.flash = Math.max(0, this.flash - dt * 3.2);
    if (this.bolt) { this.bolt.age += dt; if (this.bolt.age > 0.9) this.bolt = null; }
    if ((v.rain || 0) > 0.6 && this.t > this.nextBolt) {
      this.nextBolt = this.t + 20 + R() * 25;
      this.flash = 1;
      this.bolt = { x: W * (0.15 + R() * 0.7), y: bot + (H - bot) * (0.25 + R() * 0.45), cell: R() < 0.5 ? CELL.bolt : CELL.fork, age: 0, flip: R() < 0.5 };
      this.onThunder?.(0.8 + R() * 1.6);
    }
    // 달무리 (흐린 밤에 서서히)
    const wantHalo = night > 0.6 && (v.cloud || 0) > 0.45 && (v.rain || 0) < 0.3 ? 1 : 0;
    this.halo += (wantHalo - this.halo) * Math.min(1, dt * 0.4);
    // 모래바람 · 마른 풀공 (오아시스)
    const dusty = mapId === 'oasis' && (v.rain || 0) < 0.1 && (v.snow || 0) < 0.1;
    if (dusty && this.t > this.nextRoll && this.rollers.length < 2) {
      const windy = (v.wind || 0) > 0.12;
      this.nextRoll = this.t + (windy ? 8 : 25) + R() * (windy ? 12 : 30);
      const dir = R() < 0.5 ? 1 : -1, tumble = R() < 0.55;
      const y = top + (bot - top) * (0.3 + R() * 0.55);
      this.rollers.push({ cell: tumble ? CELL.tumble : CELL.dust, x: dir > 0 ? -80 * u : W + 80 * u, y, vx: dir * (tumble ? 70 + R() * 50 : 45 + R() * 25) * u, rot: 0, s: (tumble ? 46 + R() * 14 : 120 + R() * 40) * u, ph: R() * 6 });
    }
    for (const r of this.rollers) { r.x += r.vx * dt; r.rot += (r.cell === CELL.tumble ? r.vx / (r.s * 0.5) : 0) * dt; }
    this.rollers = this.rollers.filter(r => r.x > -200 * u && r.x < W + 200 * u);
    // 아침 안개 띠
    const morning = hour >= 5 && hour < 8.5 && (v.rain || 0) < 0.3 && (v.snow || 0) < 0.3 && mapId !== 'oasis';
    const nM = morning ? 2 : 0;
    while (this.mist.length < nM) this.mist.push({ x: R() * W, y: bot - (bot - top) * (0.1 + R() * 0.5), vx: (6 + R() * 8) * u, s: (300 + R() * 160) * u, a: 0 });
    for (const m of this.mist) { m.x += m.vx * dt; m.a = Math.min(1, m.a + dt * 0.2) * (morning ? 1 : 0.98); if (m.x - m.s / 2 > W) m.x = -m.s / 2; }
    if (!morning) this.mist = this.mist.filter(m => (m.a *= 0.97) > 0.02);
  }

  get busy() { return this.flash > 0 || this.bolt || this.halo > 0.01 || this.rollers.length || this.mist.length; }

  draw(ctx, beach) {
    if (!this.busy) return;
    const cells = this.sheet(); if (!cells) return;
    const W = beach.W, H = beach.H, u = beach.u, bot = beach.shoreY ?? H * 0.6;
    ctx.save();
    // 달무리: 바다에 비친 달 (오른쪽 위 바다)
    if (this.halo > 0.01) {
      const s = 150 * u, x = W * 0.72, y = bot + (H - bot) * 0.4 + Math.sin(this.t * 0.6) * 2 * u;
      ctx.globalAlpha = 0.45 * this.halo; ctx.globalCompositeOperation = 'lighter';
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62 + 0.03 * Math.sin(this.t * 1.3));   // 물에 비쳐 납작하게, 잔물결에 살짝 흔들림
      ctx.drawImage(cells[CELL.halo], -s / 2, -s / 2, s, s); ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }
    // 번개: 바다에 비친 번개 + 화면 번쩍
    if (this.bolt) {
      const b = this.bolt, s = 170 * u, k = b.age < 0.12 ? 1 : Math.max(0, 1 - (b.age - 0.12) / 0.6);
      ctx.globalAlpha = 0.75 * k; ctx.globalCompositeOperation = 'lighter';
      ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.flip ? -1 : 1, 0.7); ctx.drawImage(cells[b.cell], -s / 2, -s / 2, s, s); ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }
    if (this.flash > 0) { ctx.globalAlpha = 0.28 * this.flash * this.flash; ctx.fillStyle = '#eef3ff'; ctx.fillRect(0, 0, W, H); }
    // 모래바람 · 풀공
    for (const r of this.rollers) {
      ctx.globalAlpha = r.cell === CELL.dust ? 0.7 : 1;
      ctx.save(); ctx.translate(r.x, r.y + (r.cell === CELL.tumble ? -Math.abs(Math.sin(this.t * 4 + r.ph)) * 10 * u : 0));
      ctx.rotate(r.rot); if (r.vx < 0 && r.cell === CELL.dust) ctx.scale(-1, 1);
      ctx.drawImage(cells[r.cell], -r.s / 2, -r.s / 2, r.s, r.s); ctx.restore();
    }
    // 아침 안개 띠
    for (const m of this.mist) { ctx.globalAlpha = 0.5 * m.a; ctx.drawImage(cells[CELL.mist], m.x - m.s / 2, m.y - m.s * 0.3, m.s, m.s * 0.6); }
    ctx.restore();
  }
}
