// letters/ko/animals/weka.js — 웨카 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'weka-v1', t: '키위네 먼 친척 웨카예요. 우리도 날지 못하지만 걷는 건 자신 있어요.' },
    { id: 'weka-v2', t: '반짝이는 걸 보면 그만 가져가고 싶어져요. 이번엔 꾹 참고 편지만 두고 가요.' },
    { id: 'weka-v3', t: '숲 냄새가 좋은 날이었어요. 당신도 잠깐 창문을 열어 봐요.' },
  ],
  thanks: [],
  liked: [
    { id: 'weka-l1', t: '반짝이는 거 가져가고 싶다고 했던 거, 기억해 줬군요. 이번엔 정말 내 거예요!' },
  ],
};
