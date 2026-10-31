// letters/ko/animals/gull.js — 갈매기 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'gull-v1', t: '모래 위에 글씨가 있길래 내려앉아 봤어요. 읽을 줄은 모르지만, 예쁜 모양이었어요.' },
    { id: 'gull-v2', t: '오늘 바다는 조금 짰어요. 늘 짜지만요. 당신 쪽은 어땠나요?' },
    { id: 'gull-v3', t: '높이 날면 키위들 발자국이 별자리처럼 보여요. 다음에도 위에서 볼게요.' },
  ],
  thanks: [],
  liked: [
    { id: 'gull-l1', t: '이건 바다에서만 나는 보물이에요. 둥지 가장 높은 데 올려 두고, 날다가 내려다볼게요.' },
  ],
};
