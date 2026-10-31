// letters/ko/animals/whiteeye.js — 동박새 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'whiteeye-v1', t: '꽃 속 꿀을 먹다가 부리에 꽃가루가 잔뜩 묻었어요. 노랗게 웃고 갑니다.' },
    { id: 'whiteeye-v2', t: '눈가 흰 테두리는 화장이 아니에요. 태어날 때부터 웃는 얼굴이에요.' },
    { id: 'whiteeye-v3', t: '작은 몸이라 바람에 자꾸 밀려요. 그래도 꼭 다시 날아와요.' },
  ],
  thanks: [
    { id: 'whiteeye-t1', t: '{gift.eul} 꽃 사이에 두었더니 꽃이 하나 더 핀 것 같아요.' },
    { id: 'whiteeye-t2', t: '노란 얼굴로 {gift.eul} 한참 들여다봤어요. 눈 둘레가 더 하얘진 기분이에요.' },
    { id: 'whiteeye-t3', t: '{gift.eul} 물고 이 가지 저 가지로 옮겨 다녔어요. 어디에 둘지 정하기 어려웠어요.' },
    { id: 'whiteeye-t4', t: '{gift.iga} 있어서 오늘은 꿀보다 그게 더 달았어요. 고마워요.' },
  ],
  liked: [
    { id: 'whiteeye-l1', key: 'f:blossom', t: '부리에 꽃가루가 또 묻었어요. 노란 얼굴로 고맙다고 웃고 가요.' },
    { id: 'whiteeye-l2', key: 'f:heartpetal', t: '하트 꽃잎을 둥지에 두었어요. 짝이 보고 오래 노래해 줬어요.' },
    { id: 'whiteeye-l3', key: 'f:berry', t: '버찌를 콕콕 쪼아 먹으며 생각했어요. 달콤한 건 나눌수록 좋아요.' },
  ],
};
