// letters/ko/animals/deer.js — 사슴 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'deer-v1', t: '조심조심 걸어왔어요. 큰 소리가 나면 달아나지만, 여기는 조용해서 좋아요.' },
    { id: 'deer-v2', t: '아침 안개 속을 걸으면 세상이 잠깐 멈춘 것 같아요. 당신의 아침도 그랬기를.' },
    { id: 'deer-v3', t: '뿔이 자라는 데는 시간이 걸린대요. 서두르지 않아도 돼요.' },
  ],
  thanks: [],
  liked: [
    { id: 'deer-l1', t: '오래된 숲 냄새가 나요. 아침 안개 속에서 한참 들여다봤어요.' },
  ],
};
