// letters/ko/animals/rabbit.js — 산토끼 편지 (규칙: letters/index.js · docs/LETTERS.md)
//  visit  모래에 두고 가는 편지 — 순서대로 1통, 2통, 3통… (번호 = 읽은 순서, 바꾸지 않는다)
//  thanks 보통 선물 고마움 — 비어 있으면 모두가 쓰는 글(common.js). {gift} {gift.eul} {gift.iga} 자리에 선물 이름
//  liked  좋아하는 것을 맞혔을 때 — key 가 있으면 그 물건 전용, 없으면 좋아하는 것 전부

export default {
  visit: [
    { id: 'rabbit-v1', t: '깡충깡충, 너무 신나서 발자국이 엉망이에요. 그래도 즐거웠어요!' },
    { id: 'rabbit-v2', t: '귀를 세우면 먼 데 소리까지 들려요. 당신을 부르는 소리도 들렸어요.' },
    { id: 'rabbit-v3', t: '당근은 없었지만 바람이 달았어요. 다음엔 같이 뛰어요.' },
  ],
  thanks: [
    { id: 'rabbit-t1', t: '{gift.eul} 보자마자 깡충 뛰었어요. 너무 높이 뛰어서 발자국이 하나도 안 남았어요.' },
    { id: 'rabbit-t2', t: '귀를 쫑긋 세우고 {gift.eul} 들고 왔어요. 오는 내내 신이 났어요.' },
    { id: 'rabbit-t3', t: '{gift.eul} 굴 입구에 두었더니 형제들이 다 나와서 구경했어요.' },
    { id: 'rabbit-t4', t: '{gift.iga} 있던 자리에서 열 번 뛰고 왔어요. 고마움을 뛰는 걸로 말하는 게 토끼 방식이에요.' },
  ],
  liked: [
    { id: 'rabbit-l1', t: '너무 좋아서 깡충깡충 열 번 뛰었어요. 발자국이 또 엉망이 됐어요!' },
    { id: 'rabbit-l2', key: 'f:heartpetal', t: '하트 꽃잎을 귀에 꽂았어요. 깡충거릴 때마다 살랑거려서 자꾸 뛰고 싶어요.' },
    { id: 'rabbit-l3', key: 'f:blossom', t: '벚꽃 냄새가 당근보다 달아요. 이건 먹지 않고 오래 맡을 거예요.' },
    { id: 'rabbit-l4', key: 'f:berry', t: '버찌를 반으로 나눠서 동생이랑 먹었어요. 둘 다 입이 빨개졌어요.' },
  ],
};
