// seed/away.js — 자리 비움 (저장 이름: seen = 마지막으로 화면을 본 시각)
//
//  보이는 곳: 다시 열었을 때 손님 발자국(15분 넘게 비웠으면) · 키위들이 반김 · 돌아온 병.
//  손님 수: 2시간 안 1마리 · 8시간 안 2마리 · 그 넘으면 3마리 (src/guests.js guestCount).
//  ⚠ 한 번 열면 seen 이 지금으로 바뀐다 → 다시 보려면 다시 채운다. 주소 ?away=분 으로도 같은 시험이 된다.

export function build(now = Date.now(), variant = 'mid') {
  if (variant === 'none') return {};   // 안 바꿈
  const min = { short: 30, mid: 180, long: 600 }[variant] ?? 180;
  return { seen: String(now - min * 60000) };
}

export default {
  id: 'away', label: '자리 비움 (손님 오게)', where: '열 때 손님 발자국 · 키위 반김',
  keys: ['seen'],
  variants: { mid: '3시간 비움 (손님 2)', short: '30분 (손님 1)', long: '10시간 (손님 3)', none: '안 바꿈' },
  defaultOff: true,   // 한 번 열면 사라지는 일회성이라 기본은 꺼 둔다
  build,
};
