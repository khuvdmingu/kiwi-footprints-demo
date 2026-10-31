// letters/ko/animals/gerbil.js — 날쥐 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'gerbil-v1', t: '뒷다리가 길어서 한 번에 멀리 뛰어요. 오늘은 열 번만 뛰고 쉬었어요.' },
    { id: 'gerbil-v2', t: '씨앗 하나를 볼에 넣고 왔어요. 키위들 몫으로 하나 두고 갈게요.' },
    { id: 'gerbil-v3', t: '모래 목욕을 하면 털이 보송해져요. 당신도 따뜻한 물에 오래 씻어요.' },
  ],
  thanks: [
    { id: 'gerbil-t1', t: '{gift.eul} 볼에 쏙 넣어 왔어요! 볼이 빵빵해서 인사를 제대로 못 했어요.' },
    { id: 'gerbil-t2', t: '{gift.eul} 굴 안쪽 제일 푹신한 데 두었어요. 오늘 밤 같이 잘 거예요.' },
    { id: 'gerbil-t3', t: '뒷발로 서서 {gift.eul} 한참 봤어요. 날쥐는 놀라면 이렇게 서요.' },
    { id: 'gerbil-t4', t: '{gift.iga} 있어서 굴을 하나 더 팠어요. 보물 방이에요.' },
  ],
  liked: [
    { id: 'gerbil-l1', key: 'f:palmfiber', t: '볼에 쏙 넣어 왔어요! 굴에 푹신하게 깔고 낮잠 잘게요.' },
    { id: 'gerbil-l2', key: 'f:dateseed', t: '대추야자 씨를 볼 가득 넣었어요. 겨울 내내 먹을 수 있어요.' },
    { id: 'gerbil-l3', key: 'f:sandstone', t: '사암 조약돌로 굴 입구를 막았어요. 이제 바람이 안 들어와요.' },
  ],
};
