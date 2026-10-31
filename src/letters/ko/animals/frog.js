// letters/ko/animals/frog.js — 청개구리 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'frog-v1', t: '비 오기 전엔 목이 간질간질해요. 오늘 저녁엔 조금 내릴 것 같아요.' },
    { id: 'frog-v2', t: '반대로만 하는 개구리 얘기는 오해예요. 저는 꽤 말을 잘 들어요.' },
    { id: 'frog-v3', t: '물가에서 폴짝, 모래에서 폴짝. 발이 끈적해서 미끄러지진 않았어요.' },
  ],
  thanks: [
    { id: 'frog-t1', t: '개굴, {gift.eul} 받았어요. 연잎 위에 올려놓고 노래했어요.' },
    { id: 'frog-t2', t: '{gift.eul} 물가에 두었더니 비가 왔어요. 개구리 생각엔 좋은 징조예요.' },
    { id: 'frog-t3', t: '{gift.iga} 놓인 걸 보고 너무 반가워서 높이 뛰었어요. 착지는 첨벙.' },
    { id: 'frog-t4', t: '{gift.eul} 등에 업고 돌아가는데 몸 색이 조금 바뀌었어요. 기뻐서 그래요.' },
  ],
  liked: [
    { id: 'frog-l1', t: '그 위에 앉아 노래했더니 비가 왔어요. 개굴, 고마워요.' },
    { id: 'frog-l2', key: 'f:riverstone', t: '강돌 위에 앉아 노래하면 소리가 더 멀리 가요. 오늘 밤 연주회를 열게요.' },
    { id: 'frog-l3', key: 'f:glassG', t: '초록 유리 뒤에 숨으면 아무도 저를 못 찾아요. 숨바꼭질 대장이 됐어요.' },
    { id: 'frog-l4', key: 'c:buoy', t: '유리 부표 위에 올라탔더니 작은 배가 됐어요. 연못을 한 바퀴 돌았어요.' },
  ],
};
