// letters/ko/animals/egret.js — 백로 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'egret-v1', t: '한 발로 오래 서 있는 건 기다리는 연습이에요. 서두르면 물고기가 달아나요.' },
    { id: 'egret-v2', t: '하얀 깃털이 젖지 않게 조심조심 걸었어요. 발자국만 깊게 남았네요.' },
    { id: 'egret-v3', t: '물 위에 비친 내 모습이 마음에 들었어요. 당신도 오늘 거울 한번 봐 줘요.' },
  ],
  thanks: [
    { id: 'egret-t1', t: '한 발로 서서 {gift.eul} 오래 바라봤어요. 기다리는 건 제가 잘하는 일이에요.' },
    { id: 'egret-t2', t: '{gift.eul} 하얀 깃털 옆에 두었어요. 서로 더 하얘 보여요.' },
    { id: 'egret-t3', t: '물가에서 {gift.eul} 발견하고 목을 길게 뺐어요. 놀라면 목이 길어져요.' },
    { id: 'egret-t4', t: '{gift.iga} 있어서 오늘은 물고기보다 더 좋은 걸 찾은 날이에요.' },
  ],
  liked: [
    { id: 'egret-l1', key: 'f:pearl', t: '하얀 깃털 옆에 두니 더 하얘 보여요. 한 발로 서서 오래 바라봤어요.' },
    { id: 'egret-l2', key: 'f:scallop', t: '가리비 무늬가 물결 같아요. 고요한 날에도 물결을 볼 수 있게 됐어요.' },
    { id: 'egret-l3', key: 'c:coral', t: '산호 가지가 제 다리처럼 가늘고 길어요. 둘이 나란히 서 있으니 쌍둥이 같아요.' },
  ],
};
