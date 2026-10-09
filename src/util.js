// util.js — 작은 수학 도우미와 경로(폴리라인 길이 매개화)

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// 시드 고정 난수 (mulberry32) — 같은 ?seed= 면 같은 해변
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 폴리라인을 길이로 따라가기: at(s) → { x, y, a(진행 방향) }
export class Path {
  constructor(pts) {
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
    this.len = this.cum[this.cum.length - 1];
  }
  at(s) {
    const p = this.pts;
    if (p.length === 1) return { x: p[0][0], y: p[0][1], a: 0 };
    s = clamp(s, 0, this.len);
    let i = 1;
    while (i < p.length - 1 && this.cum[i] < s) i++;
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    const t = (s - this.cum[i - 1]) / seg;
    const [x0, y0] = p[i - 1], [x1, y1] = p[i];
    return { x: lerp(x0, x1, t), y: lerp(y0, y1, t), a: Math.atan2(y1 - y0, x1 - x0) };
  }
}
