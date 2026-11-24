// mail.js — v29.30 편지 오는 길: 땅에 놓이는 쪽지 자리
//
//  · 바다로 오는 것(병·상자 — 내 글 · 이야기 편지 · 소라 · 집중 선물)과 땅에 놓이는 것(쪽지 — 키위 응원 · 손님 편지 · 고마움)을 나눈다.
//  · 안 열면 쌓인다 — 물가 병 SHORE_MAX · 땅 쪽지 GROUND_MAX. 꽉 차면 새로 오지 않는다(화면이 쪽지로 덮이지 않게).
//  · 땅 쪽지 자리는 저장하지 않고 그릴 때마다 정한다: 글씨 칸(box)·선물 줄·위 버튼·아래 입력 줄을 피해 숲 가장자리 띠에,
//    화면 양끝부터 안쪽으로. 가로 화면은 글씨 칸 양옆 여백도 쓴다. 글이 바뀌어도 늘 글씨를 비켜 간다.

export const GROUND_MAX = 5;
export const SHORE_MAX = 3;
// v29.30 켜 둔 채로도 손님: 아무도 안 건드려 키위들이 졸 때 그 틈에 살짝 다녀간다. 「쪽지·편지」 빈도를 따른다 (초 [최소, 최대] · 하루 최대)
export const IDLE_GUEST = {
  fast: { gap: [180, 300], cap: 999 },     // v29.31 테스트 기간 전용 「아주 자주」 3~5분
  often: { gap: [2400, 4200], cap: 8 },     // 40~70분
  normal: { gap: [4800, 8400], cap: 5 },    // 80~140분
  rare: { gap: [10800, 14400], cap: 2 },    // 3~4시간
};

const hitRect = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

// n 개 자리 → [{ x, y }] (쪽지 아래 끝 기준 — 그림은 y - 0.62s ~ y + 0.2s)
//  env = { s 쪽지 크기, grass(x), shore(x), box 글씨 칸 {x0,y0,x1,y1} | null, avoid [{x,y,r}] 선물 등,
//          view 보이는 세계 영역 {x0,x1,y0,y1} (버튼 줄·입력 줄 뺀 것), wide 가로 화면 }
export function mailSlots(n, env) {
  const { s, grass, shore, avoid = [], view, wide } = env;
  const box = env.box ? { x0: env.box.x0 - s * 0.25, y0: env.box.y0 - s * 0.25, x1: env.box.x1 + s * 0.25, y1: env.box.y1 + s * 0.25 } : null;
  const out = [];
  const rectAt = (x, y) => ({ x0: x - s * 0.5, y0: y - s * 0.68, x1: x + s * 0.5, y1: y + s * 0.24 });
  const free = (x, y) => {
    const r = rectAt(x, y);
    if (r.x0 < view.x0 || r.x1 > view.x1 || r.y0 < view.y0 || r.y1 > view.y1) return false;
    if (y > shore(x) - s * 0.15) return false;                       // 물에 빠지지 않게
    if (box && hitRect(r, box)) return false;
    if (avoid.some(a => Math.hypot(a.x - x, a.y - y) < a.r + s * 0.5)) return false;
    return !out.some(o => Math.abs(o.x - x) < s * 0.95 && Math.abs(o.y - y) < s * 0.85);
  };
  const cands = [];
  // ① 숲 가장자리 띠 — 글씨 칸 위쪽 끝보다 위로 (칸이 높이 올라와 있으면 풀숲에 반쯤 걸쳐서)
  const step = s * 1.05;
  for (let x = view.x0 + s * 0.6; x <= view.x1 - s * 0.6; x += step) {
    const g = grass(x);
    let y = g + s * 0.62;
    if (box && x > box.x0 - s * 0.5 && x < box.x1 + s * 0.5) y = Math.min(y, box.y0 - s * 0.26);
    y = Math.max(y, g + s * 0.1);
    cands.push({ x, y, edge: Math.min(x - view.x0, view.x1 - x) });
    // 한 줄이 모자라면 그 아래 둘째 줄 (반 칸 비켜서, 글씨 칸에 닿으면 free 가 거른다)
    const x2 = x + step / 2;
    if (x2 <= view.x1 - s * 0.6) cands.push({ x: x2, y: grass(x2) + s * 1.55, edge: Math.min(x2 - view.x0, view.x1 - x2) + s * 2 });
  }
  // ② 가로 화면: 글씨 칸 양옆 여백 (위에서 아래로)
  if (wide && box) {
    for (const x of [box.x0 - s * 0.62, box.x1 + s * 0.62]) {
      for (let y = grass(x) + s * 1.5; y < shore(x) - s * 0.3; y += s * 0.95) cands.push({ x, y, edge: Math.min(x - view.x0, view.x1 - x) + s * 0.4 });
    }
  }
  cands.sort((a, b) => a.edge - b.edge);   // 화면 양끝부터 — 가운데(글씨)에서 먼 데로
  for (const c of cands) { if (out.length >= n) break; if (free(c.x, c.y)) out.push({ x: c.x, y: c.y }); }
  // 자리가 모자라면(아주 좁은 화면) 숲 가장자리 풀숲에 겹쳐 놓는다 — 글씨는 끝까지 비켜 간다
  for (let i = 0; out.length < n && i < cands.length; i++) {
    const c = cands[i], y = grass(c.x) + s * 0.1;
    if (!out.some(o => Math.abs(o.x - c.x) < s * 0.7) && !(box && hitRect(rectAt(c.x, y), box)) && !avoid.some(a => Math.hypot(a.x - c.x, a.y - y) < a.r + s * 0.5)) out.push({ x: c.x, y });
  }
  return out;
}
