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
  thanks: [],
  liked: [
    { id: 'frog-l1', t: '그 위에 앉아 노래했더니 비가 왔어요. 개굴, 고마워요.' },
  ],
};
