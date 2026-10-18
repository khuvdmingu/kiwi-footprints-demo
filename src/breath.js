// breath.js — v21 쉬는 시간 호흡: 키위들이 모래 가운데 둥글게 서서 천천히 돌고,
//             들이쉴 때(4초) 원이 넓어지고 내쉴 때(6초) 좁아진다. 6번 = 1분.
//
//  · 모래 위 점선 원이 숨 크기를 보여 준다. 키위가 걷는 옅은 발자국은 평소처럼 금방 사라진다.
//  · 화면을 누르거나 글을 쓰면 그만둔다. 집중하는 동안에는 하지 않는다 (집중이 끝난 뒤에 권한다).
//  · 시간은 rAF(beach.t)로 잰다 — 화면이 숨으면 같이 멈춘다 (숨쉬기는 보고 있을 때만 의미가 있다).

export const INHALE = 4, EXHALE = 6, ROUNDS = 6;
export const CYCLE = INHALE + EXHALE;
const ease = x => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2;

// 숨 진행 e(초, 숨쉬기 시작부터) → { round, inhale, p(0 좁음 ~ 1 넓음), done }
export function breathAt(e) {
  if (e < 0) return { round: 0, inhale: true, p: 0, done: false };
  const round = Math.floor(e / CYCLE), f = e - round * CYCLE, inhale = f < INHALE;
  const p = inhale ? ease(f / INHALE) : 1 - ease((f - INHALE) / EXHALE);
  return { round, inhale, p, done: round >= ROUNDS };
}

// 원 위 i 번째 자리 (위에서 내려다본 해변이라 세로는 납작하게)
export const SQUASH = 0.55;
export function ringSpot(b, i, n, r, t) {
  const a = (i / n) * Math.PI * 2 + t * 0.06;   // 아주 천천히 돈다 (한 바퀴 ≈ 105초)
  return [b.cx + Math.cos(a) * r, b.cy + Math.sin(a) * r * SQUASH];
}
