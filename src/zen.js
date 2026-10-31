// zen.js — 젠 가든(모래 정원)의 지우개: 다시 긋는 갈퀴 줄 (v18.1)
//  도구는 보이지 않는다. 글씨가 있던 자리 위로 가로 갈퀴 줄이 한 줄씩 옆으로 스르르 다시 그어지고,
//  줄 끝이 지나간 자리의 발자국이 천천히 흐려진다. 진짜 갈퀴질처럼 줄 방향(가로)으로, 한 줄은 오른쪽 · 다음 줄은 왼쪽으로
//  번갈아 긋고, 위에서 아래로 내려온다. 키위는 쫓기지 않는다(main.js wash).
//  물 장소와 달리 물가선(beach.edge)은 움직이지 않는다 — 지우기는 여기서 발자국에 직접 표시한다(p.erase → beach.js 가 흐린다).
import { clamp } from './util.js?v=v29.26.0-99324d6';

const STAG = 0.16;   // 다음 줄이 시작하기까지 (위 → 아래)
const ROW = 2.4;     // 한 줄을 끝에서 끝까지 긋는 시간
const FADE = 8;      // 다 그은 줄이 그림 속 자갈 줄로 스며드는 시간

export class Rake {
  constructor() { this.sweep = null; this.ridge = null; }
  reset() { this.sweep = null; this.ridge = null; }

  // 그림 속 갈퀴 줄에 맞춘다 (v18.1.2): 판 가운데 세로 한 줄의 밝기에서 줄 간격(period, 판 px)의 위상을 읽어
  //  밝은 턱이 오는 판 y 를 하나 찾아 둔다. 새 줄을 그 자리에 그어야 그림 줄과 겹쳐 스며든다(간격이 다르면 주사선처럼 보였다)
  setPlate(plate, period) { this.plate = plate; this.period = period; this.ridge = null; }
  measure() {
    const p = this.plate, P = this.period;
    if (!p || !P) return null;
    const x = Math.round(p.pw / 2), y0 = Math.round(p.ph * 0.25), n = Math.round(p.ph * 0.3);
    const c = document.createElement('canvas'); c.width = 5; c.height = n;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(p.img, x - 2, y0, 5, n, 0, 0, 5, n);
    const d = g.getImageData(0, 0, 5, n).data, L = new Float32Array(n);
    let mean = 0;
    for (let y = 0; y < n; y++) { let s = 0; for (let k = 0; k < 5; k++) { const i = (y * 5 + k) * 4; s += d[i] + d[i + 1] + d[i + 2]; } L[y] = s; mean += s / n; }
    let C = 0, S = 0;
    for (let y = 0; y < n; y++) { const a = 2 * Math.PI * y / P; C += (L[y] - mean) * Math.cos(a); S += (L[y] - mean) * Math.sin(a); }
    return y0 + ((Math.atan2(S, C) / (2 * Math.PI) * P) % P + P) % P;   // 밝은 턱이 오는 판 y 하나
  }

  // 지우기 시작: 지울 발자국이 있는 높이부터 쉬는 줄까지. 다 긋는 데 걸리는 시간을 돌려준다
  start(beach) {
    const { u, t } = beach, m = this.plate && this.plate.map;
    if (this.ridge == null) this.ridge = this.measure();
    // 줄 간격·자리: 그림 줄에 맞춘 화면 값 (재지 못하면 7u 고정 간격)
    const gap = m && this.ridge != null ? this.period * m.s : 7 * u, r0 = m && this.ridge != null ? m.oy + this.ridge * m.s : 0;
    let top = beach.shoreY;
    for (const p of beach.prints) if (p.y < top) top = p.y;
    top = r0 - gap / 2 + Math.floor((top - gap - (r0 - gap / 2)) / gap) * gap;   // 줄(밝은 턱)이 칸 한가운데 오게
    const bottom = beach.shoreY, rows = Math.max(1, Math.ceil((bottom - top) / gap));
    this.sweep = { t0: t, top, gap, rows, dir0: Math.random() < 0.5 ? 1 : -1 };
    return (rows - 1) * STAG + ROW;
  }

  // 줄 k 의 끝이 지금 어디까지 왔나 (0 ~ 1) · 방향
  row(k, t) {
    const s = this.sweep, f = clamp((t - s.t0 - k * STAG) / ROW, 0, 1);
    return { f: f * f * (3 - 2 * f), dir: k % 2 ? -s.dir0 : s.dir0 };
  }

  update(beach) {
    const s = this.sweep;
    if (!s) return;
    const { W, t } = beach;
    if (t - s.t0 > (s.rows - 1) * STAG + ROW + FADE) { this.sweep = null; return; }
    for (const p of beach.prints) {
      if (p.erase || p.wash || p.born >= s.t0) continue;           // 지우기 뒤에 찍힌 새 글씨는 그대로
      const k = clamp(Math.floor((p.y - s.top) / s.gap), 0, s.rows - 1), r = this.row(k, t);
      const tip = r.dir > 0 ? r.f * W : W - r.f * W;
      if (r.f > 0 && (r.dir > 0 ? p.x <= tip : p.x >= tip)) p.erase = t;
    }
  }

  // 숲(정원 가장자리) 아래만 — 덤불 위에 줄이 그어지지 않게
  clip(ctx, beach) {
    ctx.beginPath(); ctx.moveTo(-10, beach.H + 10);
    for (let x = -10; x <= beach.W + 10; x += 12) ctx.lineTo(x, beach.grass(x) + 10 * beach.u);
    ctx.lineTo(beach.W + 10, beach.H + 10); ctx.closePath(); ctx.clip();
  }

  draw(ctx, beach) {
    const s = this.sweep;
    if (!s) return;
    const { W, u, t } = beach, step = 24 * u;
    const lines = new Map(), tips = [];
    for (let k = 0; k < s.rows; k++) {
      const r = this.row(k, t);
      if (r.f <= 0) continue;
      const done = s.t0 + k * STAG + ROW, a = t > done ? clamp(1 - (t - done) / FADE, 0, 1) : 1;
      if (a < 0.03) continue;
      const y = s.top + (k + 0.5) * s.gap, ph = y * 0.037, x0 = r.dir > 0 ? -10 : W + 10, x1 = r.dir > 0 ? r.f * W : W - r.f * W;
      const key = Math.round(a * 10);
      if (!lines.has(key)) lines.set(key, new Path2D());
      const path = lines.get(key), wav = x => y + Math.sin(x * 0.004 / u + ph) * 0.9 * u;
      path.moveTo(x0, wav(x0));
      for (let x = x0 + r.dir * step; r.dir > 0 ? x < x1 : x > x1; x += r.dir * step) path.lineTo(x, wav(x));
      path.lineTo(x1, wav(x1));
      if (r.f < 1) tips.push([x1, wav(x1)]);
    }
    ctx.save();
    this.clip(ctx, beach);
    ctx.lineCap = 'round';
    // 굵기는 줄 간격에 맞춘다 — 그림 속 턱(밝은 띠)과 홈(그늘)과 같은 비율이라 다 그은 뒤 그림 줄에 그대로 묻힌다
    for (const [key, path] of lines) {
      const a = key / 10;
      ctx.lineWidth = s.gap * 0.22; ctx.strokeStyle = `rgba(110,98,82,${(0.18 * a).toFixed(3)})`;   // 홈의 그늘
      ctx.save(); ctx.translate(0, s.gap * 0.36); ctx.stroke(path); ctx.restore();
      ctx.lineWidth = s.gap * 0.3; ctx.strokeStyle = `rgba(255,244,224,${(0.32 * a).toFixed(3)})`;   // 밀려 올라온 턱의 빛
      ctx.stroke(path);
    }
    // 줄 끝: 자갈이 막 밀리는 자리 — 작고 흐린 빛 한 점 (도구는 그리지 않는다)
    ctx.fillStyle = 'rgba(255,250,236,0.55)';
    for (const [x, y] of tips) { ctx.beginPath(); ctx.ellipse(x, y, 3.2 * u, 1.6 * u, 0, 0, 6.29); ctx.fill(); }
    ctx.restore();
  }
}
