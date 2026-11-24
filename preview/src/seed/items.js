// seed/items.js — 모은 것(편지·옷·장소·소리) 해금 기록 (저장 이름: items)
//
//  ⚠ 테스트 기간에는 config.js UNLOCK_ALL 이 켜져 있어 전부 가진 것처럼 보인다.
//    이 더미가 화면에 드러나려면 주소에 ?all=0 을 붙여 연다 (잠긴 칸·떠내려오는 순서 확인용).
//  · 중간: 편지 3 · 옷 4(2개 입음) · 장소 1(눈밭) · 소리 4 → 다음 상자는 편지4/옷 순서대로
//  · 처음: 아무것도 없음

export const FOUND = ['letter1', 'hat', 'letter2', 'scarf', 'letter3', 'crown', 'map-snow', 'beanie', 's-snow', 'n-birds', 'm-mist', 'k-sand'];

export function build(now = Date.now(), variant = 'rich') {
  if (variant === 'none') return { items: null };
  return { items: JSON.stringify({ found: FOUND, wear: ['hat', 'scarf'] }) };
}

export default {
  id: 'items', label: '해금 기록 (편지·옷·장소·소리)', where: '모은 것 — ?all=0 으로 열어야 보임',
  keys: ['items'],
  variants: { rich: '중간까지 모음 (12개)', none: '처음부터' },
  build,
};
