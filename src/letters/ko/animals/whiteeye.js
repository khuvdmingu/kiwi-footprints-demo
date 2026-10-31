// letters/ko/animals/whiteeye.js — 동박새 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  bond   사이 단계 — 준 선물이 3·7·15번째가 된 날 한 번씩 (BOND_AT)
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'whiteeye-v1', t: '꽃 속 꿀을 먹다가 부리에 꽃가루가 잔뜩 묻었어요. 노랗게 웃고 갑니다.' },
    { id: 'whiteeye-v2', t: '눈가 흰 테두리는 화장이 아니에요. 태어날 때부터 웃는 얼굴이에요.' },
    { id: 'whiteeye-v3', t: '작은 몸이라 바람에 자꾸 밀려요. 그래도 꼭 다시 날아와요.' },
    { id: 'whiteeye-v4', t: '꽃이 지면 꽃이 피는 곳으로 옮겨 가요. 곧 조금 먼 곳으로 떠나요.' },
    { id: 'whiteeye-v5', t: '가는 길에 동백꽃이 한창인 숲을 지났어요. 얼굴이 온통 노래졌어요.' },
    { id: 'whiteeye-v6', t: '떠나 있는 동안에도 이 해변 생각을 했어요. 키위들 글씨가 꽃잎처럼 떠올랐어요.' },
    { id: 'whiteeye-v7', t: '다시 돌아왔어요! 여기도 꽃이 피기 시작했어요. 딱 맞춰 왔네요.' },
    { id: 'whiteeye-v8', t: '짝이랑 같이 왔어요. 우리는 나란히 앉아서 서로 깃털을 골라 줘요.' },
    { id: 'whiteeye-v9', t: '가지 위에 여럿이 꼭 붙어 앉는 걸 동박새 줄이라고 해요. 오늘은 키위들도 끼워 주고 싶었어요.' },
    { id: 'whiteeye-v10', t: '떠났다가 돌아오는 게 제 삶이에요. 그래도 돌아올 곳이 있으니 떠나는 게 무섭지 않아요.' },
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
  bond: [
    { id: 'whiteeye-b1', t: '선물 세 번이요. 먼 곳에 가 있을 때도 당신 생각이 꽃향기처럼 나요.' },
    { id: 'whiteeye-b2', t: '일곱 번째예요. 짝이랑 둥지를 지을 때 당신이 준 걸 맨 아래에 깔았어요.' },
    { id: 'whiteeye-b3', t: '열다섯 번이나요. 어디로 떠나도 돌아올 곳은 이 해변이에요. 꼭 다시 와요.' },
  ],
};
