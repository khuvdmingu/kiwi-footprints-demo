// terrain.js — 고정 지형을 SVG 벡터로 짓는다 (해상도가 달라도 선명하다)
//  v7 (사용자 그림 docs/v7-reference.png 기준): 밝은 낮의 열대 해변
//  #terrain (키위 아래): 금빛 모래 · 잎 그림자 얼룩 · 숲 뒷층 · 면이 나뉜 바위 · 새싹 · 불가사리 · 조개 · 조약돌 · 유목
//  #canopy  (키위 위)  : 숲 앞줄 덤불 덩어리 + 부채꼴 야자잎 — 키위가 이 아래에서 걸어 나온다
//  흔들리는 것(.sway)은 CSS 애니메이션, 덩어리마다 주기·시작이 다르다. 외곽선은 쓰지 않는다.

import { PAL, LIGHT, MOTION } from './tokens.js?v=pv-d6ce35e';
import { rng } from './util.js?v=pv-d6ce35e';

const f1 = v => Math.round(v * 10) / 10;
const P = ([x, y]) => `${f1(x)},${f1(y)}`;

function smoothClosed(pts) {
  const n = pts.length;
  let d = `M${P(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${P(p2)}`;
  }
  return d + 'Z';
}
function smoothOpen(pts) {
  let d = `M${P(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${P(p2)}`;
  }
  return d;
}
function blob(cx, cy, rx, ry, r, n = 9, jag = 0.16, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2, k = 1 + (r() - 0.5) * 2 * jag; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return pts;
}
// 잎 덤불 윤곽: 가장자리가 잎사귀처럼 몽글몽글 (원 여러 개의 바깥선)
function bushPath(cx, cy, R, r) {
  const n = 9 + Math.floor(r() * 4), pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2, k = i % 2 ? 0.82 + r() * 0.06 : 1 + (r() - 0.5) * 0.14;
    pts.push([cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k * 0.86]);
  }
  return smoothClosed(pts);
}
const sway = r => `style="--d:${f1(MOTION.swayMin + r() * (MOTION.swayMax - MOTION.swayMin))}s;--delay:-${f1(r() * 10)}s"`;

// 덤불 하나: 그늘색 바탕 → 바탕색(빛 반대쪽으로 비켜 겹침) → 왼쪽 위 밝은 잎 덩어리 → 노란 빛 몇 장
function bush(cx, cy, R, r, id) {
  const shape = bushPath(cx, cy, R, r);
  let s = `<clipPath id="${id}"><path d="${shape}"/></clipPath><path d="${shape}" fill="${PAL.leafDark}"/>`;
  s += `<g clip-path="url(#${id})"><path d="${bushPath(cx - R * 0.12, cy - R * 0.16, R * 0.92, r)}" fill="${PAL.leaf}"/>`;
  s += `<path d="${bushPath(cx - R * 0.3, cy - R * 0.32, R * 0.55, r)}" fill="${PAL.leafLight}"/>`;
  for (let i = 0; i < 5; i++) {   // 잎 결: 작은 타원 몇 장 (빛 쪽에 노란빛)
    const a = -2.4 + r() * 1.6, d = R * (0.25 + r() * 0.45), lx = cx + Math.cos(a) * d, ly = cy + Math.sin(a) * d;
    s += `<ellipse cx="${f1(lx)}" cy="${f1(ly)}" rx="${f1(R * 0.16)}" ry="${f1(R * 0.08)}" transform="rotate(${f1(r() * 180)} ${f1(lx)} ${f1(ly)})" fill="${i % 2 ? PAL.leafGlow : PAL.leafLight}" opacity="0.85"/>`;
  }
  for (let i = 0; i < 4; i++) {   // 그늘 쪽 잎 결
    const a = 0.3 + r() * 1.4, d = R * (0.35 + r() * 0.4), lx = cx + Math.cos(a) * d, ly = cy + Math.sin(a) * d;
    s += `<ellipse cx="${f1(lx)}" cy="${f1(ly)}" rx="${f1(R * 0.14)}" ry="${f1(R * 0.07)}" transform="rotate(${f1(r() * 180)} ${f1(lx)} ${f1(ly)})" fill="${PAL.leafShade}" opacity="0.6"/>`;
  }
  return s + '</g>';
}
// 부채꼴 야자잎: 한 점에서 아래로 펼쳐진 긴 쐐기 잎들
function palmFan(cx, cy, R, a0, spread, r) {
  const n = 9 + Math.floor(r() * 4);
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = a0 - spread / 2 + (spread * (i + 0.5)) / n, w = (spread / n) * 0.45, L = R * (0.82 + r() * 0.22);
    const tip = [cx + Math.cos(a) * L, cy + Math.sin(a) * L];
    const l = [cx + Math.cos(a - w) * L * 0.92, cy + Math.sin(a - w) * L * 0.92], rr = [cx + Math.cos(a + w) * L * 0.92, cy + Math.sin(a + w) * L * 0.92];
    s += `<path d="M${P([cx, cy])} Q${P([(cx + l[0]) / 2 + Math.cos(a - w) * R * 0.08, (cy + l[1]) / 2])} ${P(l)} L${P(tip)} L${P(rr)} Q${P([(cx + rr[0]) / 2, (cy + rr[1]) / 2 + Math.sin(a + w) * R * 0.08])} ${P([cx, cy])}Z" fill="${i % 3 === 0 ? PAL.palmDark : i % 3 === 1 ? PAL.palm : PAL.leafLight}"/>`;
    s += `<path d="M${P([cx, cy])} L${P([cx + Math.cos(a) * L * 0.9, cy + Math.sin(a) * L * 0.9])}" stroke="${PAL.leafGlow}" stroke-width="${f1(R * 0.012)}" opacity="0.6"/>`;
  }
  return s;
}
// 면이 나뉜 바위: 꼭대기 한 점과 둘레 점들을 이은 삼각면, 빛을 향한 면일수록 밝게
function facetRock(cx, cy, R, r, lx, ly) {
  const n = 7, pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r() * 0.3; pts.push([cx + Math.cos(a) * R * (0.85 + r() * 0.25), cy + Math.sin(a) * R * 0.72 * (0.85 + r() * 0.25)]); }
  const peak = [cx - R * 0.18, cy - R * 0.28];
  const mix = (a, b, t) => { const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`; };
  let s = `<ellipse cx="${f1(cx + lx * R * 1.1)}" cy="${f1(cy + ly * R * 0.75)}" rx="${f1(R * 1.7)}" ry="${f1(R * 0.62)}" transform="rotate(${f1(Math.atan2(ly, lx) * 57.3 * 0.5)} ${f1(cx)} ${f1(cy)})" fill="rgb(${PAL.shadow})" opacity="0.26" filter="url(#softS)"/>`;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], mx = (a[0] + b[0]) / 2 - peak[0], my = (a[1] + b[1]) / 2 - peak[1], m = Math.hypot(mx, my) || 1;
    const lit = Math.max(0, Math.min(1, 0.5 - (mx / m) * lx * 0.6 - (my / m) * ly * 0.6));
    const col = lit > 0.5 ? mix(PAL.rock, PAL.rockLight, (lit - 0.5) * 2) : mix(PAL.rockDark, PAL.rock, lit * 2);
    s += `<path d="M${P(peak)} L${P(a)} L${P(b)}Z" fill="${col}" stroke="${col}" stroke-width="0.6" stroke-linejoin="round"/>`;
  }
  return s;
}

export function buildTerrain({ W, H, u, grass, shoreY, bushY, seed = 7 }) {
  const r = rng(seed * 101 + 9);
  const [lx, ly] = LIGHT.dir;
  const S = [], C = [];
  const inText = (x, y) => x > W * 0.14 && x < W * 0.86 && y > bushY + 50 * u && y < shoreY - 50 * u;   // 글씨 자리는 비워 둔다

  S.push(`<defs>
    <radialGradient id="sunWarm" cx="0.15" cy="0.05" r="1.1"><stop offset="0" stop-color="#FFF1C8" stop-opacity="0.75"/><stop offset="0.6" stop-color="#FFF1C8" stop-opacity="0"/></radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${f1(5 * u)}"/></filter>
    <filter id="softS" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${f1(3 * u)}"/></filter>
  </defs>`);

  // 모래: 넓은 금빛 + 밝은 얼룩·짙은 얼룩 몇 개 + 왼쪽 위 빛
  S.push(`<rect width="${W}" height="${H}" fill="${PAL.sand}"/>`);
  for (let i = 0; i < 7; i++) {
    const cx = r() * W, cy = bushY + 40 * u + r() * (shoreY - bushY - 40 * u), rx = (100 + r() * 150) * u;
    S.push(`<path d="${smoothClosed(blob(cx, cy, rx, rx * (0.3 + r() * 0.2), r, 8, 0.2))}" fill="${i % 2 ? PAL.sandDeep : PAL.sandLight}" opacity="${i % 2 ? 0.3 : 0.55}"/>`);
  }
  S.push(`<rect width="${W}" height="${H}" fill="url(#sunWarm)"/>`);

  // 숲 위치: 덤불·야자 자리를 먼저 정한다 (그림자와 실물이 같은 자리를 쓴다)
  const bushes = [], palms = [];
  for (let x = -30 * u; x < W + 40 * u; x += (40 + r() * 34) * u) {
    const R = (30 + r() * 26) * u;
    bushes.push([x + r() * 12 * u, grass(x) - R * 0.5 - r() * 14 * u, R]);
  }
  for (let x = W * (0.05 + r() * 0.1); x < W; x += W * (0.22 + r() * 0.14)) palms.push([x, -10 * u - r() * 30 * u, (90 + r() * 50) * u, Math.PI / 2 + (r() - 0.5) * 0.7]);

  // 잎 그림자: 덤불과 야자잎을 오른쪽 아래로 비켜 흐릿하게 (모래 위 얼룩)
  const sh = [];
  for (const [x, y, R] of bushes) sh.push(`<path d="${bushPath(x + lx * R * 1.3, y + ly * R * 1.1, R * 1.05, rng(seed + Math.round(x)))}"/>`);
  for (const [x, y, R, a] of palms) sh.push(`<g transform="translate(${f1(lx * R * 0.55)} ${f1(ly * R * 0.65)})">${palmFan(x, y, R * 1.05, a, 2.2, rng(seed * 3 + Math.round(x)))}</g>`);
  S.push(`<g fill="rgb(${PAL.shadow})" opacity="0.3" filter="url(#softS)" style="fill:rgb(${PAL.shadow})">${sh.join('').replace(/fill="[^"]*"/g, '').replace(/stroke="[^"]*"/g, '')}</g>`);

  // 숲 뒷층: 짙은 띠 + 덤불 한 겹 (키위 아래)
  const edge = [];
  for (let x = -40 * u; x <= W + 40 * u; x += 30 * u) edge.push([x, grass(x) - 16 * u + (r() - 0.5) * 10 * u]);
  S.push(`<g class="forest"><path d="${smoothOpen(edge)}L${f1(W + 60 * u)},${f1(-60 * u)}L${f1(-60 * u)},${f1(-60 * u)}Z" fill="${PAL.forest}"/>`);
  for (let x = -20 * u, i = 0; x < W + 30 * u; x += (60 + r() * 30) * u, i++) {
    const R = (38 + r() * 20) * u;
    S.push(bush(x, grass(x) - R * 1.15, R, r, `bb${i}`));
  }
  S.push('</g>');

  // 모래 위 소품: 글씨 자리를 피해 가장자리·물가에
  const spot = (minY, maxY) => {
    for (let i = 0; i < 30; i++) { const x = r() * W, y = minY + r() * (maxY - minY); if (!inText(x, y)) return [x, y]; }
    return [r() < 0.5 ? W * 0.06 : W * 0.94, (minY + maxY) / 2];
  };
  // 바위 (면이 나뉜 회청색)
  const rocks = [[W * (0.06 + r() * 0.06), bushY + 70 * u, 34], [W * (0.88 + r() * 0.06), bushY + 60 * u, 40], [W * 0.05, shoreY - 110 * u, 30], [W * 0.93, shoreY - 70 * u, 34]];
  rocks.forEach(([x, y, R]) => { S.push(facetRock(x, y, R * u, r, lx, ly)); S.push(facetRock(x + R * u * 1.05, y + R * u * 0.45, R * u * 0.42, r, lx, ly)); });
  // 새싹 (둥근 잎 몇 장)
  for (let i = 0; i < 6; i++) {
    const [x, y] = spot(bushY + 20 * u, shoreY - 60 * u), n = 4 + Math.floor(r() * 3), h = (12 + r() * 8) * u;
    let leaves = '';
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.55, L = h * (0.75 + r() * 0.35), tx = Math.cos(a) * L, ty = Math.sin(a) * L;
      leaves += `<path d="M0,0 Q${f1(tx * 0.2 - ty * 0.35)},${f1(ty * 0.2 + tx * 0.35)} ${f1(tx)},${f1(ty)} Q${f1(tx * 0.2 + ty * 0.35)},${f1(ty * 0.2 - tx * 0.35)} 0,0Z" fill="${k % 2 ? PAL.sprout : PAL.sproutLight}"/>`;
    }
    S.push(`<g transform="translate(${f1(x)} ${f1(y)})"><ellipse cx="${f1(lx * h * 0.7)}" cy="${f1(h * 0.15)}" rx="${f1(h * 0.9)}" ry="${f1(h * 0.25)}" fill="rgb(${PAL.shadow})" opacity="0.18"/><g class="sway" ${sway(r)}>${leaves}</g></g>`);
  }
  // 불가사리
  for (let i = 0; i < 3; i++) {
    const [x, y] = spot(bushY + 80 * u, shoreY - 20 * u), R = (8 + r() * 4) * u, rot = r() * 6.28, pts = [];
    for (let k = 0; k < 10; k++) { const a = rot + (k / 10) * 6.28, rr = k % 2 ? R * 0.45 : R; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    S.push(`<ellipse cx="${f1(x + lx * R * 0.4)}" cy="${f1(y + ly * R * 0.4)}" rx="${f1(R)}" ry="${f1(R * 0.7)}" fill="rgb(${PAL.shadow})" opacity="0.2"/>`);
    S.push(`<path d="${smoothClosed(pts)}" fill="${PAL.star}"/><circle cx="${f1(x - R * 0.12)}" cy="${f1(y - R * 0.12)}" r="${f1(R * 0.22)}" fill="${PAL.starLight}"/>`);
  }
  // 조개 · 조약돌
  for (let i = 0; i < 7; i++) {
    const [x, y] = spot(shoreY - 120 * u, shoreY - 12 * u), s = (4 + r() * 2.5) * u;
    if (i % 3 === 2) { S.push(`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(s)}" ry="${f1(s * 0.75)}" fill="${PAL.pebble}"/>`); continue; }
    S.push(`<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(r() * 360)})"><ellipse cx="${f1(s * 0.4)}" cy="${f1(s * 0.4)}" rx="${f1(s * 1.2)}" ry="${f1(s * 0.6)}" fill="rgb(${PAL.shadow})" opacity="0.16"/><path d="M0,${f1(s * 0.6)} L${f1(-s)},${f1(-s * 0.15)} Q0,${f1(-s * 1.3)} ${f1(s)},${f1(-s * 0.15)}Z" fill="${i % 2 ? PAL.shellPink : PAL.shell}"/><path d="M0,${f1(s * 0.5)} L${f1(-s * 0.45)},${f1(-s * 0.55)} M0,${f1(s * 0.5)} L0,${f1(-s * 0.7)} M0,${f1(s * 0.5)} L${f1(s * 0.45)},${f1(-s * 0.55)}" stroke="#D9B8A8" stroke-width="${f1(0.7 * u)}"/></g>`);
  }
  // 유목: 오른쪽 물가
  {
    const x = W * 0.9, y = shoreY - 150 * u, L = 80 * u, w = 11 * u, a = -0.5;
    S.push(`<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a * 57.3)})"><rect x="${f1(-L / 2 + lx * 6 * u)}" y="${f1(-w / 2 + ly * 8 * u)}" width="${f1(L)}" height="${f1(w)}" rx="${f1(w / 2)}" fill="rgb(${PAL.shadow})" opacity="0.22" filter="url(#softS)"/><rect x="${f1(-L / 2)}" y="${f1(-w / 2)}" width="${f1(L)}" height="${f1(w)}" rx="${f1(w / 2)}" fill="${PAL.wood}"/><rect x="${f1(-L / 2)}" y="${f1(w * 0.05)}" width="${f1(L)}" height="${f1(w * 0.45)}" rx="${f1(w * 0.22)}" fill="${PAL.woodDark}" opacity="0.6"/><path d="M${f1(-L * 0.35)},${f1(-w * 0.15)} L${f1(L * 0.3)},${f1(-w * 0.2)}" stroke="#A88566" stroke-width="${f1(1.2 * u)}" stroke-linecap="round"/></g>`);
  }

  // 숲 앞줄 (키위 위): 덤불 덩어리 + 야자잎
  C.push('<g class="forest">');
  bushes.forEach(([x, y, R], i) => C.push(`<g class="sway soft" ${sway(r)}>${bush(x, y, R, rng(seed * 31 + i), `fb${i}`)}</g>`));
  palms.forEach(([x, y, R, a], i) => C.push(`<g class="sway soft" ${sway(r)}>${palmFan(x, y, R, a, 2.2, rng(seed * 3 + Math.round(x)))}</g>`));
  C.push('</g>');

  const svg = parts => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${parts.join('')}</svg>`;
  return { terrain: svg(S), canopy: svg(C) };
}
