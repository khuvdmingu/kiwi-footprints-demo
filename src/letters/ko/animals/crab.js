// letters/ko/animals/crab.js — 게 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'crab-v1', t: '옆으로 걷다 보니 여기까지 왔어요. 앞으로 가는 것만 길은 아니더라고요.' },
    { id: 'crab-v2', t: '파도가 오기 전에 얼른 다녀갔어요. 바쁜 날엔 옆걸음도 괜찮아요.' },
    { id: 'crab-v3', t: '모래 속 작은 구멍이 우리 집이에요. 놀러 오면 집게로 인사할게요.' },
  ],
  thanks: [
    { id: 'crab-t1', t: '{gift.eul} 옆으로 끌고 집까지 왔어요. 조금 오래 걸렸지만 괜찮았어요.' },
    { id: 'crab-t2', t: '집게로 조심조심 {gift.eul} 들어 올렸어요. 떨어뜨리지 않았어요. 고마워요.' },
    { id: 'crab-t3', t: '구멍 입구에 {gift.eul} 세워 두었어요. 이제 우리 집 찾기가 쉬워졌어요.' },
    { id: 'crab-t4', t: '{gift.iga} 놓인 걸 보고 거품을 뽀글뽀글 냈어요. 게가 기쁠 때 하는 인사예요.' },
  ],
  liked: [
    { id: 'crab-l1', key: 'f:snail', t: '딱 맞는 새 집이에요! 집게로 꼭 안고 잤어요. 이사 축하해 줄래요?' },
    { id: 'crab-l2', key: 'f:pebble', t: '하얀 돌을 집 앞에 놓으니 밤에도 문이 보여요. 이제 길을 안 잃어요.' },
    { id: 'crab-l3', key: 'c:seahorse', t: '해마 무늬가 저처럼 옆으로 누워 있어요. 친구가 생긴 것 같아요.' },
  ],
};
