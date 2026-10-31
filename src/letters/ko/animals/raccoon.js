// letters/ko/animals/raccoon.js — 너구리 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'raccoon-v1', t: '물가에서 손을 씻는 버릇이 있어요. 깨끗한 손으로 편지를 썼어요.' },
    { id: 'raccoon-v2', t: '눈 주위가 까매서 다들 장난꾸러기인 줄 알아요. 반은 맞아요.' },
    { id: 'raccoon-v3', t: '밤 산책이 제일 좋아요. 키위들이랑 마주치면 서로 깜짝 놀라요.' },
  ],
  thanks: [],
  liked: [
    { id: 'raccoon-l1', t: '물가에서 깨끗이 씻어서 간직했어요. 밤 산책 갈 때마다 만져 봐요.' },
  ],
};
