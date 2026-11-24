// seed/finds.js — 주운 것 도감 (저장 이름: finds)
//
//  보이는 곳: 모은 것 › 주운 것 (도감 칸·개수·희귀도).
//  · 거의 다: 16종 중 13종 (흔한 건 여러 개, 전설은 하나만, 3종은 빈칸으로 남겨 "?" 칸 확인)
//  · 조금: 흔한 것 3종
//  ⚠ id 는 src/shore.js FINDS 와 맞춰야 한다 (test/seed.test.mjs 가 확인).

export const COUNTS = { scallop: 14, snail: 9, pebble: 22, glassG: 6, feather: 5, drift: 7, glassB: 3, star: 2, heart: 1, urchin: 2, glow: 1, ice: 1, pearl: 1 };
const FEW = { scallop: 2, pebble: 3, snail: 1 };

export function build(now = Date.now(), variant = 'rich') {
  if (variant === 'none') return { finds: null };
  const n = variant === 'few' ? FEW : COUNTS;
  return { finds: JSON.stringify({ n, seen: Object.keys(n) }) };
}

export default {
  id: 'finds', label: '주운 것 도감', where: '모은 것 › 주운 것',
  keys: ['finds'],
  variants: { rich: '13/16종', few: '3종', none: '비우기' },
  build,
};
