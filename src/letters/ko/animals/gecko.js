// letters/ko/animals/gecko.js — 도마뱀붙이 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'gecko-v1', t: '벽에도 천장에도 붙을 수 있어요. 그래도 모래 위는 좀 미끄러웠어요.' },
    { id: 'gecko-v2', t: '꼬리를 놓고 간 게 아니라 잠깐 맡겨 둔 거예요. 금방 다시 자라요.' },
    { id: 'gecko-v3', t: '밤에 불빛 근처에 가면 반딧불 친구들이 놀러 와요. 오늘은 별빛 아래로 왔어요.' },
  ],
  thanks: [],
  liked: [
    { id: 'gecko-l1', t: '벽에 붙여 두니 밤마다 반짝여요. 별빛 아래서 꼬리를 흔들었어요.' },
  ],
};
