// glass-bottle.js — v30.24 떠내려오는 유리병을 코드로 그린다 (사용자 2026-11-22 「병 디자인을 새롭게 — 벡터 + 이미지 기반」)
//  예전 그림(bottle*.webp)은 유리까지 칠해진 한 장이라 바닥·물빛·밤낮에 맞출 수 없었다. 여기서는
//  내용물(두루마리·밀랍 도장·별 쪽지) → 반투명 유리(색·두께감) → 테두리·하이라이트 → 코르크 순으로 겹쳐 그리고,
//  밤(night 0~1)엔 색이 가라앉고 하이라이트가 달빛 색, 물에 뜬 병은 물속 부분이 물빛에 잠기고(water),
//  물가에 묻힌 병은 모래선 아래가 가려지며 그늘만 진다(bury). 그림 파일 없이 어느 섬 바닥에도 맞는다.
//  좌표: 병 길이 s, (x, y) = 병 가운데, angle = 기울기(라디안, 0 = 목이 위)

export const BOTTLE_KINDS = {
  // body = 몸 폭(길이 비) · ys = 어깨 · yn = 목 시작 · neck = 목 폭(몸 폭 비) · r = 바닥 둥글기
  bottle: { glass: [196, 226, 236], edge: [92, 132, 150], body: 0.36, ys: -0.04, yn: -0.27, neck: 0.48, r: 0.3, tint: 1 },   // 맑은 병 — 날씬 · 두루마리 + 빨간 끈
  mine: { glass: [200, 118, 38], edge: [112, 56, 18], body: 0.5, ys: -0.16, yn: -0.31, neck: 0.36, r: 0.5, tint: 4.2 },         // 호박색 병 — 어깨 둥근 약병 · 밀랍 도장
  cheer: { glass: [132, 196, 150], edge: [52, 104, 72], body: 0.54, ys: -0.02, yn: -0.22, neck: 0.38, r: 0.42, tint: 2.6, rope: true },   // 초록 병 — 통통 · 별 쪽지 · 목에 끈
};

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const NIGHT = [36, 52, 84];       // 밤에 섞는 남색
const MOON = [206, 222, 255];     // 밤 하이라이트

// 병 몸 외곽 (목이 위, 가운데 0,0) — 둥근 바닥, 어깨, 목, 입구 테
function outline(p, s, K) {
  const w = s * K.body / 2, nw = w * (K.neck ?? 0.42), yb = s * 0.5, ys = s * (K.ys ?? -0.1), yn = s * (K.yn ?? -0.3), yt = -s * 0.44, r = w * (K.r ?? 0.32);
  p.moveTo(-nw, yt);
  p.lineTo(-nw, yn);
  p.bezierCurveTo(-nw, yn + s * 0.1, -w, ys - s * 0.04, -w, ys + s * 0.04);
  p.lineTo(-w, yb - r);
  p.quadraticCurveTo(-w, yb, -w + r, yb);
  p.lineTo(w - r, yb);
  p.quadraticCurveTo(w, yb, w, yb - r);
  p.lineTo(w, ys + s * 0.04);
  p.bezierCurveTo(w, ys - s * 0.04, nw, yn + s * 0.1, nw, yn);
  p.lineTo(nw, yt);
  p.closePath();
  return { w, nw, yb, ys, yn, yt };
}

function contents(c, kind, s, g, night) {
  const paper = mix([243, 230, 200], NIGHT, night * 0.5), shade = mix([205, 182, 140], NIGHT, night * 0.5);
  c.save();
  if (kind === 'cheer') {
    // 접힌 쪽지 한 장 (별 도장)
    c.rotate(-0.18);
    const pw = g.w * 0.78, ph = s * 0.26;   // v30.24 내용물을 줄여 유리 너머가 보이게
    c.fillStyle = rgba(paper, 1); c.beginPath(); c.rect(-pw / 2, -ph * 0.2, pw, ph); c.fill();
    c.fillStyle = rgba(shade, 0.8); c.beginPath(); c.moveTo(-pw / 2, -ph * 0.2); c.lineTo(pw / 2, -ph * 0.2); c.lineTo(0, ph * 0.18); c.closePath(); c.fill();
    c.strokeStyle = rgba(mix([120, 96, 60], NIGHT, night * 0.5), 0.9); c.lineWidth = s * 0.012;
    const R = pw * 0.16, cx = 0, cy = ph * 0.48; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.45 : R; c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    c.closePath(); c.stroke();
  } else {
    // 말린 두루마리 (원통) — 기울여 넣는다
    c.rotate(0.22);
    const rw = g.w * 0.56, rh = s * 0.5, top = -s * 0.12;   // 가는 두루마리 — 둘레로 유리 너머가 비친다
    const grd = c.createLinearGradient(-rw / 2, 0, rw / 2, 0);
    grd.addColorStop(0, rgba(shade, 1)); grd.addColorStop(0.35, rgba(paper, 1)); grd.addColorStop(1, rgba(shade, 1));
    c.fillStyle = grd; c.beginPath(); c.rect(-rw / 2, top, rw, rh); c.fill();
    c.fillStyle = rgba(mix([226, 206, 166], NIGHT, night * 0.5), 1); c.beginPath(); c.ellipse(0, top, rw / 2, rw * 0.16, 0, 0, 6.29); c.fill();
    c.strokeStyle = rgba(shade, 1); c.lineWidth = s * 0.01; c.stroke();
    if (kind === 'mine') {
      // 밀랍 도장
      const R = rw * 0.42, cy = top + rh * 0.52;
      c.fillStyle = rgba(mix([178, 34, 30], NIGHT, night * 0.45), 1); c.beginPath();
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, rr = R * (i % 2 ? 0.92 : 1); c.lineTo(Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      c.closePath(); c.fill();
      c.fillStyle = rgba(mix([214, 70, 58], NIGHT, night * 0.45), 0.9); c.beginPath(); c.arc(-R * 0.15, cy - R * 0.15, R * 0.55, 0, 6.29); c.fill();
    } else {
      // 빨간 끈
      c.fillStyle = rgba(mix([200, 40, 44], NIGHT, night * 0.45), 1);
      const by = top + rh * 0.48; c.beginPath(); c.rect(-rw / 2, by, rw, s * 0.035); c.fill();
      c.strokeStyle = c.fillStyle; c.lineWidth = s * 0.016; c.beginPath(); c.moveTo(0, by + s * 0.02); c.quadraticCurveTo(rw * 0.3, by + s * 0.09, rw * 0.15, by + s * 0.13); c.stroke();
    }
  }
  c.restore();

}

// 병을 덮는 모래 둔덕의 윗선: 병 자리에서 살짝 솟은 완만한 곡선 (점 목록)
function sandLine(x, y, s) {
  const pts = [];
  for (let i = -12; i <= 12; i++) { const t = i / 12, dx = t * s * 0.75; pts.push([x + dx, y - s * 0.13 * Math.exp(-t * t * 3.2) + s * 0.015 * Math.sin(i * 1.7)]); }
  return pts;
}
// 수면: 잔물결 선
function waterLine(x, y, s, ph = 0) {
  const pts = [];
  for (let i = -12; i <= 12; i++) { const t = i / 12; pts.push([x + t * s * 0.9, y + s * 0.02 * Math.sin(t * 9 + ph)]); }
  return pts;
}
// 점 목록 위쪽 전체 / 아래쪽 전체 영역
function above(pts) { const p = new Path2D(); p.moveTo(pts[0][0] - 1e5, pts[0][1]); for (const [x, y] of pts) p.lineTo(x, y); p.lineTo(pts.at(-1)[0] + 1e5, pts.at(-1)[1]); p.lineTo(pts.at(-1)[0] + 1e5, -1e5); p.lineTo(pts[0][0] - 1e5, -1e5); p.closePath(); return p; }
function below(pts) { const p = new Path2D(); p.moveTo(pts[0][0] - 1e5, pts[0][1]); for (const [x, y] of pts) p.lineTo(x, y); p.lineTo(pts.at(-1)[0] + 1e5, pts.at(-1)[1]); p.lineTo(pts.at(-1)[0] + 1e5, 1e5); p.lineTo(pts[0][0] - 1e5, 1e5); p.closePath(); return p; }

/**
 * @param {CanvasRenderingContext2D} c
 * @param {{kind?: string, x: number, y: number, s: number, angle?: number, night?: number,
 *          water?: number|null, bury?: number|null, alpha?: number}} o
 *   water = 수면의 화면 y (그 아래는 물에 잠겨 보인다) · bury = 모래선의 화면 y (그 아래는 안 그린다)
 */
export function drawBottle(c, o) {
  const K = BOTTLE_KINDS[o.kind] || BOTTLE_KINDS.bottle, s = o.s, nightRaw = Math.max(0, Math.min(1, o.night || 0));
  // sceneTint: 앱처럼 화면 전체에 밤 색조를 덮는 곳에선 병 색을 따로 어둡게 하지 않는다 (두 번 어두워져 검은 실루엣이 됐다) — 하이라이트만 달빛
  const night = o.sceneTint ? 0 : nightRaw;
  const glass = mix(K.glass, NIGHT, night * 0.55), edge = mix(K.edge, NIGHT, night * 0.4), hi = nightRaw > 0.5 ? MOON : [255, 255, 255];
  c.save();
  c.globalAlpha *= o.alpha ?? 1;
  if (o.bury != null) { c.clip(above(sandLine(o.x, o.bury, s))); }   // 모래 둔덕 위만 (곧은 선으로 잘리지 않게)
  c.translate(o.x, o.y); c.rotate(o.angle || 0);
  const p = new Path2D(), g = outline(p, s, K);
  // 1) 내용물 (유리 뒤)
  c.save(); c.clip(p); contents(c, o.kind, s, g, night); c.restore();
  // 2) 유리: 가장자리는 진하고 가운데는 비치게 (두께감), 바닥은 두꺼운 유리
  const gl = c.createLinearGradient(-g.w, 0, g.w, 0);
  const tn = K.tint ?? 1, ga = v => Math.min(0.8, v * tn);   // 색 유리(호박·초록)는 진하게, 맑은 병만 맑게
  gl.addColorStop(0, rgba(glass, ga(0.42))); gl.addColorStop(0.18, rgba(glass, ga(0.1))); gl.addColorStop(0.7, rgba(glass, ga(0.06))); gl.addColorStop(1, rgba(glass, ga(0.34)));
  c.fillStyle = gl; c.fill(p);
  c.fillStyle = rgba(glass, 0.28); c.beginPath(); c.ellipse(0, g.yb - s * 0.03, g.w * 0.86, s * 0.045, 0, 0, 6.29); c.fill();
  // 3) 테두리 + 안쪽 테(빛) + 하이라이트
  c.lineJoin = 'round';
  // v30.24 테두리를 부드럽게: 옅고 넓은 테 + 가는 선, 유리 안쪽 가장자리는 굴절 그늘 (칠한 그림과 어울리게)
  c.save(); c.clip(p); c.strokeStyle = rgba(edge, 0.2); c.lineWidth = s * 0.1; c.stroke(p); c.restore();
  c.strokeStyle = rgba(edge, 0.18); c.lineWidth = s * 0.045; c.stroke(p);
  c.strokeStyle = rgba(edge, 0.55); c.lineWidth = Math.max(1, s * 0.015); c.stroke(p);
  c.save(); c.clip(p);
  c.strokeStyle = rgba(hi, nightRaw > 0.5 ? 0.35 : 0.5); c.lineWidth = s * 0.03; c.translate(s * 0.012, 0); c.stroke(p);
  c.restore();
  c.strokeStyle = rgba(hi, nightRaw > 0.5 ? 0.55 : 0.85); c.lineCap = 'round'; c.lineWidth = s * 0.04;
  c.beginPath(); c.moveTo(-g.w * 0.6, g.ys + s * 0.06); c.lineTo(-g.w * 0.6, g.yb - s * 0.14); c.stroke();
  c.lineWidth = s * 0.022; c.beginPath(); c.moveTo(-g.nw * 0.45, g.yt + s * 0.03); c.lineTo(-g.nw * 0.45, g.yn + s * 0.02); c.stroke();
  c.fillStyle = rgba(hi, nightRaw > 0.5 ? 0.5 : 0.9); c.beginPath(); c.arc(g.w * 0.45, g.ys + s * 0.1, s * 0.025, 0, 6.29); c.fill();
  // 4) 입구 테 + 코르크 (+ 초록 병은 목에 끈)
  c.fillStyle = rgba(mix(K.glass, [255, 255, 255], 0.25), 0.55); c.strokeStyle = rgba(edge, 0.7); c.lineWidth = Math.max(1, s * 0.016);
  c.beginPath(); c.roundRect(-g.nw * 1.22, g.yt - s * 0.025, g.nw * 2.44, s * 0.05, s * 0.02); c.fill(); c.stroke();
  const cork = mix([176, 122, 70], NIGHT, night * 0.5), corkD = mix([128, 84, 44], NIGHT, night * 0.5), ct = g.yt - s * 0.13;
  const cg = c.createLinearGradient(-g.nw, 0, g.nw, 0); cg.addColorStop(0, rgba(corkD, 1)); cg.addColorStop(0.45, rgba(cork, 1)); cg.addColorStop(1, rgba(corkD, 1));
  c.fillStyle = cg; c.beginPath(); c.roundRect(-g.nw * 1.02, ct, g.nw * 2.04, s * 0.12, s * 0.025); c.fill();
  c.strokeStyle = rgba(corkD, 0.9); c.lineWidth = Math.max(0.8, s * 0.01);
  c.beginPath(); c.moveTo(-g.nw * 0.4, ct + s * 0.03); c.lineTo(-g.nw * 0.2, ct + s * 0.09); c.moveTo(g.nw * 0.35, ct + s * 0.02); c.lineTo(g.nw * 0.5, ct + s * 0.07); c.stroke();
  if (K.rope) {
    c.strokeStyle = rgba(mix([196, 160, 104], NIGHT, night * 0.75), 1); c.lineWidth = s * 0.02;
    c.beginPath(); c.moveTo(-g.nw * 1.1, g.yn - s * 0.02); c.lineTo(g.nw * 1.1, g.yn - s * 0.04); c.stroke();
    c.beginPath(); c.ellipse(g.nw * 1.5, g.yn - s * 0.07, s * 0.045, s * 0.03, 0.5, 0, 6.29); c.ellipse(g.nw * 1.6, g.yn + s * 0.0, s * 0.04, s * 0.028, -0.4, 0, 6.29); c.stroke();
  }
  // 밤: 병 전체(몸·입구·코르크·끈)를 남색으로 한 번 더 눌러 주변보다 밝게 뜨지 않게
  if (night > 0) {
    const dim = new Path2D(p); dim.roundRect(-g.nw * 1.02, ct, g.nw * 2.04, s * 0.12, s * 0.025); dim.roundRect(-g.nw * 1.22, g.yt - s * 0.025, g.nw * 2.44, s * 0.05, s * 0.02);   // 몸·코르크·입구 테 모양만
    c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = rgba(mix([255, 255, 255], [150, 162, 196], night), 1); c.fill(dim); c.restore();
  }
  c.restore();
  // 5) 물에 잠긴 부분: 수면 아래를 물빛으로 덮고 수면에 흰 선
  if (o.water != null) {
    const wl = waterLine(o.x, o.water, s, o.phase || 0);
    c.save(); c.globalAlpha *= o.alpha ?? 1;
    c.save(); c.clip(below(wl));
    c.translate(o.x, o.y); c.rotate(o.angle || 0);
    const q = new Path2D(); outline(q, s, K);
    c.fillStyle = night > 0.5 ? 'rgba(14,34,58,0.32)' : 'rgba(40,130,160,0.24)'; c.fill(q);   // 물속 부분: 물빛이 살짝 덮일 뿐 비친다
    c.restore();
    // 병에 닿은 수면의 흰 선 (병 몸 안쪽만)
    c.save(); const q2 = new Path2D(); outline(q2, s * 1.04, K); c.clip(q2pathAt(q2, o)); c.strokeStyle = night > 0.5 ? 'rgba(190,210,240,0.45)' : 'rgba(255,255,255,0.7)'; c.lineWidth = Math.max(1, s * 0.025);
    c.beginPath(); wl.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    c.restore();
    c.restore();
  }
  // 6) 묻힌 자리: 둔덕 윗선을 따라 그늘(아래)과 볕(위) — 모래 색 없이 음영만이라 어느 바닥에도 맞는다
  if (o.bury != null) {
    const sl = sandLine(o.x, o.bury, s);
    c.save(); c.globalAlpha *= o.alpha ?? 1; c.lineCap = 'round'; c.lineJoin = 'round';
    const line = dy => { c.beginPath(); sl.slice(4, -4).forEach(([x, y], i) => (i ? c.lineTo(x, y + dy) : c.moveTo(x, y + dy))); c.stroke(); };
    // 넓고 흐린 그늘 띠 (실처럼 보이지 않게 넓은 것부터 겹쳐 번지게)
    for (const [w, a, dy] of [[0.16, 0.05, 0.06], [0.1, 0.07, 0.045], [0.05, 0.09, 0.03]]) { c.strokeStyle = `rgba(52,36,20,${a * (1 - night * 0.3)})`; c.lineWidth = s * w; line(s * dy); }
    c.strokeStyle = `rgba(255,248,230,${0.12 * (1 - night * 0.8)})`; c.lineWidth = s * 0.04; line(-s * 0.015);
    c.restore();
  }
}
// 회전한 병 외곽을 화면 좌표 Path2D 로 (clip 용)
function q2pathAt(local, o) {
  const m = new DOMMatrix().translate(o.x, o.y).rotate((o.angle || 0) * 180 / Math.PI);
  const p = new Path2D(); p.addPath(local, m); return p;
}

// 물가에 묻힌 자리의 그늘 (모래 색 없이 어둡게만 — 어느 섬 바닥이든 그 색이 비친다)
export function drawBuryShade(c, x, y, s, night = 0, kind = null, angle = 0) {
  const g = c.createRadialGradient(x, y, 0, x, y, s * 0.55);
  const a = 0.32 * (1 - night * 0.3);
  g.addColorStop(0, `rgba(46,32,18,${a})`); g.addColorStop(0.55, `rgba(46,32,18,${a * 0.45})`); g.addColorStop(1, 'rgba(46,32,18,0)');
  c.save(); c.fillStyle = g; c.translate(x, y); c.scale(1, 0.3); c.translate(-x, -y);
  c.beginPath(); c.arc(x, y, s * 0.55, 0, 6.29); c.fill(); c.restore();
  if (kind) drawCaustic(c, { kind, x: x - s * 0.05, y: y - s * 0.12, s: s * 0.8, night, angle });
}

// 유리를 지난 햇빛이 바닥·물에 떨어뜨리는 병 색의 밝은 무늬 (빛 방향 = 오른쪽 아래, tokens LIGHT.dir 와 같은 쪽)
//  호박색 병은 주황빛, 초록 병은 초록빛, 맑은 병은 흰빛 — 밤에는 아주 옅게 (달빛)
export function drawCaustic(c, o) {
  const K = BOTTLE_KINDS[o.kind] || BOTTLE_KINDS.bottle, s = o.s, night = Math.max(0, Math.min(1, o.night || 0)), A = (o.alpha ?? 1) * (1 - night * 0.8);
  if (A <= 0.01) return;
  const col = mix(K.glass, [255, 250, 230], 0.45), cx = o.x + s * 0.34, cy = o.y + s * 0.22, t = o.t || 0;
  c.save(); c.globalCompositeOperation = 'screen';
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, s * 0.42);
  g.addColorStop(0, rgba(col, 0.55 * A)); g.addColorStop(0.35, rgba(col, 0.3 * A)); g.addColorStop(1, rgba(col, 0));
  c.translate(cx, cy); c.rotate((o.angle || 0) + Math.PI / 2); c.scale(1, 0.42); c.translate(-cx, -cy);
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, s * 0.42, 0, 6.29); c.fill();
  // 가운데 가는 빛줄 (유리가 모은 빛) — 물 위에선 살짝 일렁인다
  c.strokeStyle = rgba(mix(col, [255, 255, 255], 0.5), 0.5 * A); c.lineWidth = s * 0.03; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - s * 0.22, cy + Math.sin(t * 2) * s * 0.02); c.quadraticCurveTo(cx, cy - s * 0.05, cx + s * 0.22, cy + Math.cos(t * 2) * s * 0.02); c.stroke();
  c.restore();
}

// 물에 뜬 병 둘레 (병보다 먼저 그린다): 부드러운 그림자 + 세 겹 파문 + 병 닿는 자리 거품 테
//  파문은 고리마다 조금 일그러지고, 앞쪽(화면 아래 반)은 밝게 · 뒤쪽은 옅게 어둡게 — 물결의 결이 보이게
export function drawRipples(c, o) {
  const { x, y, s } = o, t = o.t || 0, ph = o.phase || 0, night = Math.max(0, Math.min(1, o.night || 0)), A = o.alpha ?? 1;
  const lay = 0.62 + 0.38 * Math.abs(Math.sin(o.angle || 0));   // 병이 눕힌 만큼 가로로 길게
  const lit = night > 0.5 ? [196, 214, 245] : [255, 255, 255], dk = night > 0.5 ? [4, 14, 30] : [8, 46, 66];
  c.save();
  // 그림자 (물에 비친 어두운 덩이 — 번지게)
  const sh = c.createRadialGradient(x + s * 0.04, y + s * 0.08, 0, x + s * 0.04, y + s * 0.08, s * 0.6 * lay);
  sh.addColorStop(0, `rgba(${dk},${0.3 * A})`); sh.addColorStop(1, `rgba(${dk},0)`);
  c.save(); c.translate(x, y + s * 0.08); c.scale(1, 0.4); c.translate(-x, -(y + s * 0.08));
  c.fillStyle = sh; c.beginPath(); c.arc(x + s * 0.04, y + s * 0.08, s * 0.6 * lay, 0, 6.29); c.fill(); c.restore();
  // 세 겹 파문
  const ring = (rx, ry, wob, from, to) => {
    c.beginPath();
    for (let j = 0; j <= 48; j++) {
      const a = from + (to - from) * j / 48, w = 1 + wob * (0.5 * Math.sin(3 * a + t * 1.1 + ph) + 0.35 * Math.sin(5 * a - t * 1.7 + ph * 2));
      const px = x + Math.cos(a) * rx * w, py = y + s * 0.05 + Math.sin(a) * ry * w;
      j ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke();
  };
  c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.32 + i / 3 + ph) % 1, f = Math.pow(1 - k, 1.6) * Math.min(1, k * 6);   // 생겨나 퍼지며 옅어짐
    const rx = s * (0.5 + 0.75 * k) * lay, ry = s * (0.17 + 0.26 * k), wob = 0.05 + 0.04 * k;
    c.lineWidth = Math.max(0.8, s * (0.024 * (1 - k) + 0.007));
    c.strokeStyle = `rgba(${lit},${0.9 * f * A * (night > 0.5 ? 0.6 : 1)})`; ring(rx, ry, wob, 0.15, Math.PI - 0.15);     // 앞쪽: 빛
    // 고리 위 반짝이는 점 두셋 (물결 마루에 맺힌 빛)
    c.fillStyle = `rgba(${lit},${0.85 * f * A * (night > 0.5 ? 0.5 : 1)})`;
    for (const a of [0.7 + i * 0.4, 1.9 - i * 0.3]) { c.beginPath(); c.arc(x + Math.cos(a) * rx, y + s * 0.05 + Math.sin(a) * ry, Math.max(0.8, s * 0.014 * (1 - k)), 0, 6.29); c.fill(); }
    c.strokeStyle = `rgba(${dk},${0.22 * f * A})`; c.lineWidth *= 0.8; ring(rx, ry * 0.96, wob, Math.PI + 0.2, 2 * Math.PI - 0.2);   // 뒤쪽: 그늘
  }
  if (o.kind) drawCaustic(c, { kind: o.kind, x, y: y + s * 0.06, s, night, angle: o.angle, t, alpha: A * 0.8 });
  // 병 닿는 자리 거품 테 (끊긴 조각)
  c.strokeStyle = `rgba(${lit},${0.55 * A * (night > 0.5 ? 0.6 : 1)})`; c.lineWidth = Math.max(1, s * 0.022);
  for (let j = 0; j < 7; j++) {
    const a0 = j / 7 * 6.283 + Math.sin(t * 0.8 + j + ph) * 0.2, len = 0.45 + 0.25 * Math.sin(j * 2.3 + ph);
    c.beginPath(); c.ellipse(x, y + s * 0.04, s * 0.46 * lay, s * 0.15, 0, a0, a0 + len); c.stroke();
  }
  c.restore();
}

// 목록·카드에 쓰는 작은 병 그림 (밝은 종이 위에 비스듬히) — 한 번 그려 dataURL 로 기억해 둔다
const ICONS = {};
export function bottleIcon(kind = 'bottle', px = 128) {
  const key = kind + ':' + px;
  if (ICONS[key]) return ICONS[key];
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas'); c.width = c.height = px;
  drawBottle(c.getContext('2d'), { kind, x: px / 2, y: px * 0.52, s: px * 0.86, angle: -0.62 });
  return (ICONS[key] = c.toDataURL('image/png'));
}
