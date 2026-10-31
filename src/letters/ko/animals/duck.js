// letters/ko/animals/duck.js — 청둥오리 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'duck-v1', t: '잠깐 쉬어 갔어요. 물 위에선 느긋해 보여도 발은 바쁘게 젓고 있답니다.' },
    { id: 'duck-v2', t: '비 오는 날이 제일 좋아요. 당신이 싫어하는 날에도 누군가는 신나 있어요.' },
    { id: 'duck-v3', t: '아기 오리들에게 줄 맞춰 걷는 법을 가르치는 중이에요. 키위들 글씨 줄이 부러워요.' },
  ],
  thanks: [
    { id: 'duck-t1', t: '{gift.eul} 등에 얹고 물 위를 미끄러져 왔어요. 겉으론 느긋해 보였겠지만 발은 바빴어요.' },
    { id: 'duck-t2', t: '{gift.eul} 둥지 옆에 두고 밤새 지켰어요. 오리도 보물은 지킬 줄 알아요.' },
    { id: 'duck-t3', t: '{gift.eul} 물가 갈대 사이에 숨겨 두었어요. 우리 가족 보물이에요.' },
    { id: 'duck-t4', t: '비 오는 날 {gift.iga} 놓여 있어서 두 배로 신났어요.' },
  ],
  liked: [
    { id: 'duck-l1', t: '아기 오리들이 줄 맞춰 구경하러 왔어요. 다들 꽥꽥 고맙대요.' },
    { id: 'duck-l2', key: 'c:kelp', t: '해초 리본을 목에 둘렀더니 아기 오리들이 저를 대장이라고 불러요.' },
    { id: 'duck-l3', key: 'f:riverstone', t: '매끈한 강돌 위에 앉아 깃털을 골랐어요. 물가에서 제일 좋은 자리가 생겼어요.' },
    { id: 'duck-l4', key: 'f:willowleaf', t: '버들잎을 물에 띄우고 아기들이랑 따라 헤엄쳤어요. 줄이 처음으로 반듯했어요.' },
  ],
};
