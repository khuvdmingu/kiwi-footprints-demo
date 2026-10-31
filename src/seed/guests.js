// seed/guests.js — 손님 방명록 · 편지 (저장 이름: guests)
//
//  보이는 곳: 모은 것 › 방명록 (동물별 횟수·처음 온 날·읽은 편지) · 모래 위 안 읽은 쪽지.
//  · 여럿: 10종 중 8종 다녀감(횟수 1~9), 편지 0~3통 읽음(다 읽은 동물 포함), 모래 위에 안 읽은 쪽지 2장
//  · 조금: 2종만, 쪽지 1장
//  ⚠ 동물 id 는 src/guests.js 의 GUESTS 와 맞춰야 한다 (test/seed.test.mjs 가 확인).

import { at, dayKey } from './util.js?v=v29.25.1-44a30f8';

export const IDS = ['gull', 'crab', 'weka', 'hedgehog', 'duck', 'fox', 'rabbit', 'deer', 'sparrow', 'cat'];
const LETTERS = 3;   // 동물마다 편지 수

export function build(now = Date.now(), variant = 'rich') {
  if (variant === 'none') return { guests: null };
  const plan = variant === 'few'
    ? [['gull', 2, 5, 1], ['crab', 1, 2, 0]]
    // [id, 온 횟수, 처음 온 날(며칠 전), 읽은 편지]
    : [['gull', 9, 60, 3], ['crab', 4, 40, 1], ['weka', 3, 33, 2], ['hedgehog', 1, 2, 0], ['duck', 6, 50, 3], ['fox', 2, 12, 1], ['rabbit', 5, 25, 2], ['cat', 1, 1, 0]];
  const count = {}, first = {}, read = {};
  for (const [id, c, ago, r] of plan) { count[id] = c; first[id] = dayKey(at(now, ago)); read[id] = r; }
  // 모래 위 쪽지: 다음 편지가 남은 동물만 (n = 읽은 수 = 다음 편지 번호)
  const left = plan.filter(([id]) => read[id] < LETTERS).map(([id]) => id);
  const pending = left.slice(0, variant === 'few' ? 1 : 2).map((id, i) => ({ id, n: read[id], rx: 0.3 + i * 0.35, ry: 0.5 }));
  return { guests: JSON.stringify({ count, first, read, pending }) };
}

export default {
  id: 'guests', label: '손님 방명록·편지', where: '모은 것 › 방명록 · 모래 위 쪽지',
  keys: ['guests'],
  variants: { rich: '8종 · 쪽지 2장', few: '2종 · 쪽지 1장', none: '비우기' },
  build,
};
