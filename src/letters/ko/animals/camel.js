// letters/ko/animals/camel.js — 아기 낙타 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'camel-v1', t: '엄마 따라 먼 길 가다가 잠깐 들렀어요. 발이 커서 모래에 안 빠져요.' },
    { id: 'camel-v2', t: '혹에는 물이 아니라 힘이 들어 있대요. 오늘 당신의 혹은 든든했나요?' },
    { id: 'camel-v3', t: '천천히 걸어도 끝까지 가요. 낙타는 원래 그래요.' },
  ],
  thanks: [],
  liked: [
    { id: 'camel-l1', t: '엄마한테 보여 줬더니 혹이 든든해 보인대요. 먼 길도 끄떡없어요.' },
  ],
};
