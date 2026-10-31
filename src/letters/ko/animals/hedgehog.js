// letters/ko/animals/hedgehog.js — 고슴도치 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'hedgehog-v1', t: '천천히 왔다가 천천히 가요. 가시는 무섭게 생겼지만 마음은 동글동글해요.' },
    { id: 'hedgehog-v2', t: '낙엽 밑에서 한숨 잤어요. 쉬는 것도 일이라고 키위가 그러던데요.' },
    { id: 'hedgehog-v3', t: '몸을 동그랗게 말면 걱정도 작아져요. 한번 해 보세요.' },
  ],
  thanks: [
    { id: 'hedgehog-t1', t: '{gift.eul} 가시에 꽂고 천천히 걸어왔어요. 떨어뜨리지 않으려고 더 천천히요.' },
    { id: 'hedgehog-t2', t: '{gift.eul} 품에 안고 동그랗게 몸을 말았어요. 따뜻하게 지켜 줄게요.' },
    { id: 'hedgehog-t3', t: '낙엽 침대 옆에 {gift.eul} 두었어요. 자기 전에 한 번씩 보고 잘 거예요.' },
    { id: 'hedgehog-t4', t: '{gift.iga} 있어서 오늘은 낮잠을 조금 늦게 잤어요. 고마워요.' },
  ],
  liked: [
    { id: 'hedgehog-l1', key: 'f:heartpetal', t: '가시 위에 꽂고 다니니까 다들 예쁘대요. 동글동글한 마음이 더 동글해졌어요.' },
    { id: 'hedgehog-l2', key: 'f:berry', t: '가시 끝에 버찌를 꽂고 다녔더니 다들 사과나무냐고 물어요. 기분 좋은 오해예요.' },
    { id: 'hedgehog-l3', key: 'f:willowleaf', t: '버들잎 이불을 덮으니 가시가 부드러워진 것 같아요. 오늘 밤 푹 잘게요.' },
  ],
};
