// letters/ko/animals/fox.js — 여우 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'fox-v1', t: '발자국을 한 줄로 곧게 찍는 게 여우의 자랑이에요. 당신의 오늘도 곧았기를.' },
    { id: 'fox-v2', t: '눈 아래에서 들리는 작은 소리에 오래 귀 기울였어요. 조용한 것도 많은 걸 말해요.' },
    { id: 'fox-v3', t: '꼬리를 이불처럼 덮고 자면 따뜻해요. 오늘 밤 당신도 따뜻하게.' },
  ],
  thanks: [],
  liked: [
    { id: 'fox-l1', t: '눈 위에 놓으니 달빛을 받아 빛나요. 꼬리 옆에 두고 따뜻하게 지킬게요.' },
  ],
};
