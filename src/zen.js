// zen.js — 젠 가든(모래 정원)의 지우개: 갈퀴 (v18)
//  물 대신 긴 대나무 갈퀴가 바위 섬 앞(쉬는 줄)에서 위로 쓸어 올라간다. 경계선은 beach.edge(x) 그대로라
//  발자국이 지워지는 규칙·병·물건 자리는 물 장소와 같고, 여기서는 그림만 다르다:
//   · drawLines — 갈퀴가 지나간 자리에 새로 그은 가로 홈(밝은 턱 + 그늘)이 또렷했다가 FADE 초에 걸쳐 그림 속 자갈 줄로 스며든다
//   · drawBar   — 오르는 동안 갈퀴(대나무 자루 + 이빨), 다 오르면 들어 올리듯 떠오르며 사라진다
import { clamp, easeOut } from './util.js?v=v18.0.0';

const RISE = 1.5;   // beach.js 의 오르는 시간과 같다
const FADE = 7;     // 새 갈퀴 줄이 그림에 스며드는 시간
const LIFT = 0.7;   // 다 오른 갈퀴가 들려 사라지는 시간

export class Rake {
  constructor() { this.passes = []; }
  reset() { this.passes = []; }

  update(beach) {
    const bw = beach.bw;
    if (bw && !this.passes.some(p => p.t0 === bw.t0)) this.passes.push({ t0: bw.t0, L: bw.L, y0: beach.shoreY });
    this.passes = this.passes.filter(p => beach.t - p.t0 < RISE + FADE + 1);
  }

  // 갈퀴 앞줄이 높이 y 를 지난 시각 (beach.level 의 easeOut 을 거꾸로 푼 것)
  passedAt(p, y) {
    const f = (p.y0 - y) / p.L;
    if (f <= 0) return p.t0;
    if (f >= 1) return Infinity;
    return p.t0 + RISE * (1 - Math.cbrt(1 - f));
  }

  // 숲(정원 가장자리) 아래만 — 덤불 위에 갈퀴 줄이 그어지지 않게
  clip(ctx, beach) {
    ctx.beginPath(); ctx.moveTo(-10, beach.H + 10);
    for (let x = -10; x <= beach.W + 10; x += 12) ctx.lineTo(x, beach.grass(x) + 10 * beach.u);
    ctx.lineTo(beach.W + 10, beach.H + 10); ctx.closePath(); ctx.clip();
  }

  drawLines(ctx, beach) {
    if (!this.passes.length) return;
    const { W, u, t } = beach, gap = 7 * u, step = 24 * u;
    // 투명도 단계별로 한 경로에 모아 그린다 (줄이 많아도 그리기 호출은 몇 번뿐)
    const buckets = new Map();
    for (const p of this.passes) {
      const top = p.y0 - p.L, bottom = p.y0 + 3 * u;
      for (let y = Math.ceil(top / gap) * gap; y < bottom; y += gap) {   // 화면에 고정된 간격 — 여러 번 쓸어도 줄이 겹친다
        const ta = this.passedAt(p, y);
        if (ta > t) continue;
        const a = clamp(1 - (t - ta) / FADE, 0, 1) * clamp((t - ta) / 0.12, 0, 1);
        if (a < 0.03) continue;
        const k = Math.round(a * 10);
        if (!buckets.has(k)) buckets.set(k, new Path2D());
        const path = buckets.get(k), ph = y * 0.037;
        path.moveTo(-10, y);
        for (let x = step - 10; x <= W + step; x += step) path.lineTo(x, y + Math.sin(x * 0.004 / u + ph) * 0.9 * u);
      }
    }
    if (!buckets.size) return;
    ctx.save();
    this.clip(ctx, beach);
    ctx.lineCap = 'round';
    for (const [k, path] of buckets) {
      const a = k / 10;
      ctx.lineWidth = 1.6 * u;
      ctx.strokeStyle = `rgba(88,82,72,${(0.3 * a).toFixed(3)})`;      // 홈의 그늘
      ctx.save(); ctx.translate(0, 1.4 * u); ctx.stroke(path); ctx.restore();
      ctx.lineWidth = 1.2 * u;
      ctx.strokeStyle = `rgba(255,252,243,${(0.6 * a).toFixed(3)})`;   // 밀려 올라온 턱의 빛
      ctx.stroke(path);
    }
    ctx.restore();
  }

  drawBar(ctx, beach) {
    const p = this.passes[this.passes.length - 1];
    if (!p) return;
    const { W, u, t } = beach, e = t - p.t0;
    if (e > RISE + LIFT) return;
    const lift = Math.max(0, e - RISE) / LIFT;                       // 0 = 자갈에 닿아 있음 → 1 = 들려서 사라짐
    const y = p.y0 - p.L * easeOut(Math.min(1, e / RISE)) - lift * 26 * u;
    const alpha = 1 - lift * lift, sh = (5 + lift * 14) * u;
    const th = 10 * u, tooth = 13 * u, gapT = 17 * u;
    ctx.save();
    ctx.globalAlpha = alpha;
    // 앞에 밀려 쌓이는 자갈 턱 (닿아 있을 때만)
    if (lift < 0.2) {
      const g = ctx.createLinearGradient(0, y - 16 * u, 0, y);
      g.addColorStop(0, 'rgba(90,84,74,0)'); g.addColorStop(1, `rgba(90,84,74,${(0.2 * (1 - lift * 5)).toFixed(3)})`);
      ctx.fillStyle = g; ctx.fillRect(-10, y - 16 * u, W + 20, 16 * u);
    }
    // 그림자 (들릴수록 멀어지고 옅어진다)
    ctx.fillStyle = `rgba(40,32,22,${(0.24 * (1 - lift * 0.6)).toFixed(3)})`;
    ctx.fillRect(-10 + sh, y + sh * 1.2, W + 20, th);
    for (let x = gapT / 2; x < W + 10; x += gapT) ctx.fillRect(x - 1.3 * u + sh, y + th + sh * 1.2, 2.6 * u, tooth);
    // 이빨 (자루 뒤, 아래쪽 = 지나온 쪽)
    ctx.fillStyle = '#8F6C40';
    for (let x = gapT / 2; x < W + 10; x += gapT) ctx.fillRect(x - 1.3 * u, y + th * 0.6, 2.6 * u, tooth);
    // 대나무 자루: 몸통 · 위쪽 빛 · 아래쪽 그늘 · 마디
    ctx.fillStyle = '#C8A26A'; ctx.fillRect(-10, y, W + 20, th);
    ctx.fillStyle = '#E7CD97'; ctx.fillRect(-10, y + th * 0.12, W + 20, th * 0.22);
    ctx.fillStyle = '#9A7444'; ctx.fillRect(-10, y + th * 0.78, W + 20, th * 0.22);
    ctx.fillStyle = 'rgba(110,80,44,0.7)';
    for (let x = 90 * u; x < W; x += 140 * u) ctx.fillRect(x, y, 2 * u, th);
    ctx.restore();
  }
}
