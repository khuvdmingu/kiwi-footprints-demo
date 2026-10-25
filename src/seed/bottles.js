// seed/bottles.js — 내 글 병 · 응원 쪽지 (저장 이름: bottles)
//
//  보이는 곳: 모은 것 › 편지(내 글이 돌아온 것) · 물에 떠내려오는 호박색 병.
//  · 내 글 12개: 집중 전에 쓴 것 / 모래에 쓴 것 섞음. 7개는 이미 돌아옴(back), 5개는 2일 넘게 지나 곧 돌아올 차례
//    → 열고 조금 있으면 "N일 전의 너에게서" 병이 떠내려옴. 오늘 쓴 1개는 아직 안 돌아옴(2일 규칙 확인)
//  · 응원 쪽지 20개 읽음 (c01~c20) → 남은 것부터 나옴

import { at } from './util.js?v=v29.14.0';

const MINE = [
  ['오늘은 한 줄만 써도 된다', 'focus', 40, 1], ['바다 보러 가고 싶다', 'write', 33, 1], ['보고서 끝내면 치킨', 'focus', 28, 1],
  ['잘하고 있어 진짜로', 'write', 21, 1], ['이번 주는 쉬엄쉬엄', 'focus', 15, 1], ['키위야 고마워', 'write', 10, 1], ['포트폴리오 첫 장 완성', 'focus', 8, 1],
  ['내일의 나에게 맡긴다', 'write', 6, 0], ['물 마셨니?', 'focus', 4, 0], ['아무것도 안 해도 괜찮은 날', 'write', 3, 0],
  ['산책 다녀오기', 'focus', 3, 0], ['마흔 글자쯤 되는 긴 문장도 병 카드에서 줄바꿈이 잘 되는지 확인하는 글', 'write', 5, 0],
  ['오늘 쓴 글은 아직 안 돌아와요', 'write', 0, 0],
];

export function build(now = Date.now(), variant = 'rich') {
  if (variant === 'none') return { bottles: null };
  const mine = MINE.map(([t, src, ago, back]) => {
    const a = Math.min(at(now, ago, 21, 0), now - 60000);
    return back ? { t, at: a, src, back: a + Math.ceil(2.5 * 864e5) } : { t, at: a, src };
  }).filter(m => !m.back || m.back < now);
  const seen = Array.from({ length: 20 }, (_, i) => 'c' + String(i + 1).padStart(2, '0'));
  return { bottles: JSON.stringify({ mine, seen, day: '', today: 0, sinceMine: 2 }) };
}

export default {
  id: 'bottles', label: '내 글 병·응원 쪽지', where: '모은 것 › 편지 · 떠내려오는 병',
  keys: ['bottles'],
  variants: { rich: '내 글 13 (돌아옴 7 · 곧 돌아옴 5)', none: '비우기' },
  build,
};
