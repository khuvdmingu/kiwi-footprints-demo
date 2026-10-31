// letters/ko/animals/hoopoe.js — 후투티 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'hoopoe-v1', t: '머리 깃을 부채처럼 펴면 다들 놀라요. 사실은 저도 좀 놀라요.' },
    { id: 'hoopoe-v2', t: '긴 부리로 모래 속 씨앗을 찾았어요. 키위들이랑 부리 자랑을 했답니다.' },
    { id: 'hoopoe-v3', t: '훗훗훗, 하고 울어서 이름이 후투티예요. 이름이 우는 소리면 외우기 쉽죠.' },
  ],
  thanks: [
    { id: 'hoopoe-t1', t: '머리 깃을 활짝 펴고 {gift.eul} 받았어요. 훗훗, 기분이 좋을 때 나는 소리예요.' },
    { id: 'hoopoe-t2', t: '긴 부리로 {gift.eul} 조심조심 집어 들었어요. 부리 자랑할 일이 또 생겼어요.' },
    { id: 'hoopoe-t3', t: '{gift.eul} 둥지 입구에 장식했어요. 지나가는 새들이 다 쳐다봐요.' },
    { id: 'hoopoe-t4', t: '{gift.iga} 있어서 머리 깃을 접을 틈이 없었어요. 하루 종일 펴고 다녔어요.' },
  ],
  liked: [
    { id: 'hoopoe-l1', key: 'f:gold', t: '머리 깃을 활짝 폈어요. 훗훗훗, 이렇게 기분 좋은 건 처음이에요.' },
    { id: 'hoopoe-l2', key: 'f:feather', t: '다른 새 깃털을 머리 깃 옆에 꽂았어요. 왕관이 더 높아졌어요.' },
    { id: 'hoopoe-l3', key: 'f:bluebead', t: '파란 구슬을 부리 끝에 얹고 균형을 잡았어요. 묘기 연습 중이에요.' },
  ],
};
