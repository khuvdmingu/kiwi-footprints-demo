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
  thanks: [],
  liked: [
    { id: 'gerbil-l1', t: '볼에 쏙 넣어 왔어요! 굴에 푹신하게 깔고 낮잠 잘게요.' },
  ],
};
