// beach3d/layers/actors.js — 모래 위를 돌아다니는 키위의 움직임 (three.js·DOM 없이 계산만 — 시험에서 그대로 부른다)
//  좌표는 해변 그림의 픽셀. 모래 구역 안에서 목표점을 잡아 천천히 걷다 쉬고, 물가선이 발밑 가까이 오면 뭍 쪽으로 종종걸음으로 피한다.
//  화면에 세우는 것(카메라를 보는 판·그림자)은 beach3d.js 가 한다.

export const KIWI = { WALK: 24, RUN: 95, KEEP: 22, SIZE: 68 };   // 걷는·피하는 빠르기(u/초) · 물가선과 두는 거리(u) · 키(u)

export function makeActor(area, rnd = Math.random) {
  const x = area.x0 + (area.x1 - area.x0) * rnd(), y = area.y0 + (area.y1 - area.y0) * rnd();
  return { x, y, tx: x, ty: y, rest: rnd() * 2.5, dir: rnd() < 0.5 ? 1 : -1, moving: false, flee: false, ph: rnd() * 6.28 };
}

// 한 걸음. env = { area: {x0,x1,y0,y1}, edgeY(x) 지금 물가선, u, rnd }
export function stepActor(a, dt, { area, edgeY, u, rnd = Math.random }) {
  const e = edgeY(a.x);
  if (!a.flee && a.y > e - KIWI.KEEP * u) {   // 물이 발밑까지 왔다 → 뭍 쪽으로
    a.flee = true; a.rest = 0;
    a.tx = Math.min(area.x1, Math.max(area.x0, a.x + (rnd() - 0.5) * 50 * u));
    a.ty = Math.max(area.y0, e - (62 + rnd() * 50) * u);
  }
  if (a.rest > 0) {
    a.rest -= dt; a.moving = false;
    if (a.rest <= 0) {   // 다음 목표: 구역 안, 그 자리 물가선보다 넉넉히 위
      a.tx = area.x0 + (area.x1 - area.x0) * rnd();
      const low = Math.min(area.y1 + 24 * u, edgeY(a.tx) - 32 * u);
      a.ty = area.y0 + Math.max(0, low - area.y0) * rnd();
    }
    return a;
  }
  const dx = a.tx - a.x, dy = a.ty - a.y, dist = Math.hypot(dx, dy), step = (a.flee ? KIWI.RUN : KIWI.WALK) * u * dt;
  if (dist <= step + 0.5) { a.x = a.tx; a.y = a.ty; a.moving = false; a.flee = false; a.rest = 1.2 + rnd() * 3; }
  else { a.x += dx / dist * step; a.y += dy / dist * step; a.moving = true; if (Math.abs(dx) > 0.5) a.dir = dx > 0 ? 1 : -1; }
  a.x = Math.min(area.x1, Math.max(area.x0, a.x));
  return a;
}
