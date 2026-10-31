// letters/ko/animals/cat.js — 고양이 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'cat-v1', t: '여긴 내 자리예요. …라고 하고 싶지만 당신 자리이기도 하니까 반씩 나눠요.' },
    { id: 'cat-v2', t: '햇볕 드는 자리에서 실컷 자고 갔어요. 당신도 오늘은 좀 늘어져도 돼요.' },
    { id: 'cat-v3', t: '키위들이 쓴 글씨를 꾹꾹 밟고 싶었지만 참았어요. 칭찬해 줘요.' },
  ],
  thanks: [],
  liked: [
    { id: 'cat-l1', t: '…앞발로 굴려 보니 아주 마음에 들어요. 이 자리는 이제 다 당신 거예요.' },
  ],
};
