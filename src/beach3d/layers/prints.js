// beach3d/layers/prints.js — 발자국 글씨: 글 → 모래 위 발자국 자리 (three.js·DOM 없이 계산만 — 시험에서 그대로 부른다)
//  글자를 획으로 바꾸는 것은 2D 게임과 같은 hangul.js (layoutText · strokesOf). 여기서는 획을 따라 한 걸음씩 발자국 자리를 놓는다.
//  좌표는 해변 그림의 픽셀(왼쪽 위 0,0). 그리기와 지우기는 beach3d.js 의 바닥 층(발자국 캔버스)이 한다.
import { layoutText, strokesOf } from '../../hangul.js?v=v30.40.0-bb99cd3';

// 글씨 쓸 모래 구역: 숲 줄 아래 ~ 그려진 물가선 위 (가로는 가운데 76%). forest·shore = 가로로 늘어놓은 y 값 배열(px)
export function sandArea(forest, shore, pw, u) {
  const pick = (arr, f, a, b) => { let v = f === Math.max ? -Infinity : Infinity; for (let i = Math.floor(arr.length * a); i < arr.length * b; i++) v = f(v, arr[i]); return v; };
  const y0 = pick(forest, Math.max, 0.12, 0.88) + 34 * u, y1 = pick(shore, Math.min, 0.12, 0.88) - 44 * u;   // 물이 올라오는 자리(약 26칸)보다 위
  return { x0: pw * 0.12, x1: pw * 0.88, y0, y1: Math.max(y1, y0 + 60 * u) };
}

// 글 → 발자국 목록 [{ x, y, rot, r, item }] (쓰는 순서). 구역에 맞게 크기를 정하고, 한 줄이 너무 작아지면 줄을 나눈다
export function layoutPrints(text, area, u) {
  const maxW = area.x1 - area.x0, maxH = area.y1 - area.y0, cap = 120 * u;
  const fit = (L) => Math.min(maxW / Math.max(L.width, 0.01), maxH / Math.max(L.height, 0.01), cap);
  let L = layoutText(text), S = fit(L);
  if (!L.lines.length) return { prints: [], size: 0 };
  if (S < 60 * u) for (const k of [0.62, 0.45, 0.34]) { const c = layoutText(text, { maxWidth: L.width * k }), s = fit(c); if (s > S) { L = c; S = s; } }
  const x = (area.x0 + area.x1) / 2 - L.width * S / 2, y = (area.y0 + area.y1) / 2 - L.height * S / 2;
  const stride = S * 0.085, side0 = S * 0.022, r = S * 0.047, prints = [];
  for (const st of strokesOf(L, { x, y, size: S })) {
    if (st.pts.length === 1) { prints.push({ x: st.pts[0][0], y: st.pts[0][1], rot: 0, r: r * 0.8, item: st.item, dot: true }); continue; }
    let carry = 0, side = 1;
    for (let i = 1; i < st.pts.length; i++) {
      const [ax, ay] = st.pts[i - 1], [bx, by] = st.pts[i], len = Math.hypot(bx - ax, by - ay);
      if (len < 1e-6) continue;
      const dx = (bx - ax) / len, dy = (by - ay) / len, rot = Math.atan2(dy, dx) + Math.PI / 2;   // 발가락이 걷는 쪽을 본다
      let d = carry;
      for (; d <= len; d += stride) { prints.push({ x: ax + dx * d - dy * side * side0, y: ay + dy * d + dx * side * side0, rot, r, item: st.item }); side = -side; }
      carry = d - len;
    }
  }
  return { prints, size: S };
}

// 물이 이 발자국을 지나갔는가 (edgeY = 그 가로 자리의 지금 물가선 y)
export function washed(p, edgeY, u) { return p.y > edgeY - 2 * u; }
