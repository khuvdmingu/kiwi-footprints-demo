// letters/ko/animals/squirrel.js — 다람쥐 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'squirrel-v1', t: '도토리를 묻어 둔 자리를 또 잊어버렸어요. 그래도 내년 봄엔 나무가 날 거예요.' },
    { id: 'squirrel-v2', t: '꼬리를 크게 흔들면 기분도 커져요. 오늘 한 번 해 보세요.' },
    { id: 'squirrel-v3', t: '나무 위에서 보니 키위들 글씨가 작은 길 같았어요. 따라 걸어 봤어요.' },
  ],
  thanks: [
    { id: 'squirrel-t1', t: '{gift.eul} 볼에 넣으려다 너무 커서 품에 안고 왔어요.' },
    { id: 'squirrel-t2', t: '이번엔 {gift.eul} 묻지 않았어요. 묻으면 또 잊어버리니까요.' },
    { id: 'squirrel-t3', t: '나무 꼭대기에 {gift.eul} 올려 두었어요. 거기서 보면 키위들 글씨가 다 보여요.' },
    { id: 'squirrel-t4', t: '{gift.iga} 있어서 꼬리를 크게 세 번 흔들었어요. 다람쥐식 고마워요예요.' },
  ],
  liked: [
    { id: 'squirrel-l1', key: 'f:dateseed', t: '이건 묻지 않고 꼭 쥐고 다닐 거예요. 이번엔 잊어버리지 않게요.' },
    { id: 'squirrel-l2', key: 'f:berry', t: '버찌를 나뭇가지에 걸어 두니 우리 나무가 열매 나무가 됐어요.' },
    { id: 'squirrel-l3', key: 'f:amber', t: '호박 속 꽃을 보며 생각했어요. 묻어 둔 도토리도 언젠가 꽃이 되겠죠.' },
  ],
};
