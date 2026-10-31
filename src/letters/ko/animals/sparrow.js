// letters/ko/animals/sparrow.js — 참새 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'sparrow-v1', t: '갈퀴 줄 위로 콩콩 뛰어 봤어요. 정원지기 몰래요.' },
    { id: 'sparrow-v2', t: '작은 부스러기 하나로도 하루가 행복해요. 오늘 당신의 부스러기는 뭐였나요?' },
    { id: 'sparrow-v3', t: '친구들이랑 수다 떨다 늦었어요. 짹짹, 또 올게요.' },
  ],
  thanks: [],
  liked: [
    { id: 'sparrow-l1', t: '짹! 친구들한테 자랑하느라 하루가 다 갔어요. 다들 부러워해요.' },
  ],
};
