// zen.js — 젠 가든(모래 정원)의 지우개: 다시 긋는 갈퀴 줄 (v18.1)
//  도구는 보이지 않는다. 글씨가 있던 자리 위로 가로 갈퀴 줄이 한 줄씩 옆으로 스르르 다시 그어지고,
//  줄 끝이 지나간 자리의 발자국이 천천히 흐려진다. 진짜 갈퀴질처럼 줄 방향(가로)으로, 한 줄은 오른쪽 · 다음 줄은 왼쪽으로
//  번갈아 긋고, 위에서 아래로 내려온다. 키위는 쫓기지 않는다(main.js wash).
//  물 장소와 달리 물가선(beach.edge)은 움직이지 않는다 — 지우기는 여기서 발자국에 직접 표시한다(p.erase → beach.js 가 흐린다).
import { clamp } from './util.js?v=v18.1.1';

const STAG = 0.16;   // 다음 줄이 시작하기까지 (위 → 아래)
const ROW = 2.4;     // 한 줄을 끝에서 끝까지 긋는 시간
const FADE = 8;      // 다 그은 줄이 그림 속 자갈 줄로 스며드는 시간

export class Rake {
  constructor() { this.sweep = null; }
  reset() { this.sweep = null; }

  // 지우기 시작: 지울 발자국이 있는 높이부터 쉬는 줄까지. 다 긋는 데 걸리는 시간을 돌려준다
  start(beach) {
    const { u, t } = beach, gap = 7 * u;
    let top = beach.shoreY;
    for (const p of beach.prints) if (p.y < top) top = p.y;
    top = Math.floor((top - gap) / gap) * gap;                    // 화면에 고정된 간격 — 여러 번 그어도 줄이 겹친다
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
    for (const [key, path] of lines) {
      const a = key / 10;
      ctx.lineWidth = 1.6 * u; ctx.strokeStyle = `rgba(88,82,72,${(0.28 * a).toFixed(3)})`;   // 홈의 그늘
      ctx.save(); ctx.translate(0, 1.4 * u); ctx.stroke(path); ctx.restore();
      ctx.lineWidth = 1.2 * u; ctx.strokeStyle = `rgba(255,252,243,${(0.6 * a).toFixed(3)})`;   // 밀려 올라온 턱의 빛
      ctx.stroke(path);
    }
    // 줄 끝: 자갈이 막 밀리는 자리 — 작고 흐린 빛 한 점 (도구는 그리지 않는다)
    ctx.fillStyle = 'rgba(255,250,236,0.55)';
    for (const [x, y] of tips) { ctx.beginPath(); ctx.ellipse(x, y, 3.2 * u, 1.6 * u, 0, 0, 6.29); ctx.fill(); }
    ctx.restore();
  }
}
