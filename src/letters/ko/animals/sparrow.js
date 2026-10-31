// letters/ko/animals/sparrow.js — 참새 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'sparrow-v1', t: '갈퀴 줄 위로 콩콩 뛰어 봤어요. 정원지기 몰래요.' },
    { id: 'sparrow-v2', t: '작은 부스러기 하나로도 하루가 행복해요. 오늘 당신의 부스러기는 뭐였나요?' },
    { id: 'sparrow-v3', t: '친구들이랑 수다 떨다 늦었어요. 짹짹, 또 올게요.' },
  ],
  thanks: [
    { id: 'sparrow-t1', t: '짹! {gift.eul} 발견했어요. 친구들한테 자랑하느라 목이 쉬었어요.' },
    { id: 'sparrow-t2', t: '{gift.eul} 물고 콩콩 뛰어서 갔어요. 정원지기한테 들킬까 봐 조금 서둘렀어요.' },
    { id: 'sparrow-t3', t: '작은 부리로 {gift.eul} 옮기느라 세 번 쉬었어요. 그래도 끝까지 가져갔어요.' },
    { id: 'sparrow-t4', t: '{gift.iga} 있어서 오늘 수다 주제는 하루 종일 당신이었어요. 짹짹.' },
  ],
  liked: [
    { id: 'sparrow-l1', t: '짹! 친구들한테 자랑하느라 하루가 다 갔어요. 다들 부러워해요.' },
    { id: 'sparrow-l2', key: 'f:dateseed', t: '대추야자 씨는 겨울까지 아껴 먹을 거예요. 한 알이 하루를 든든하게 해요.' },
    { id: 'sparrow-l3', key: 'f:berry', t: '버찌 하나로 친구 셋이 배불렀어요. 작은 게 제일 큰 선물이에요.' },
    { id: 'sparrow-l4', key: 'f:eggshell', t: '깨진 알껍데기를 둥지에 깔았어요. 언젠가 태어날 아기들 자리예요.' },
  ],
};
