// maps.js — 골라 쓰는 장소(맵)
import { STOCK_PLACES, STOCK_STEPS0, STOCK_STEP, TIME_ART } from './maps-stock.js?v=v30.15.0-1ded26c';
import { WATER_PLACES, WATER_STEPS0, WATER_STEP } from './maps-water.js?v=v30.15.0-1ded26c';
//  장소마다 그림 판 한 벌(가로 wide · 세로 tall, 각각 본판·-dry·-sea 세 장)과 그 장소의 성격을 정한다.
//  구조는 모두 같다: 위는 숲(키위가 숨었다 나온다), 가운데는 글씨를 쓰는 바닥, 아래는 물(불어나서 글씨를 지운다).

export const MAPS = {
  beach: {
    name: '바닷가',
    wide: 'plate', tall: 'tall',
    gulls: true,                     // 바다 위를 지나가는 갈매기
    shoreFrom: 0.4,                  // 물가선을 이 높이(화면 비율) 아래에서 찾는다
    rockFill: true,                  // 물속 돌을 통째로 (밝은 면·잠긴 돌까지, 2026-10-24 plate.js)
  },
  nz: {
    name: '뉴질랜드 숲',              // 키위가 실제로 사는 곳: 은고사리 숲 아래 강가 흙, 개울이 불어나 지운다
    wide: 'nz', tall: 'nz-tall',
    gulls: false,
    stones: true,                    // 개울 바닥 조약돌: 밝은 회색 돌도 물이 불어날 때 제자리
    shoreFrom: 0.5,                  // 가장자리 통나무·고사리가 낮게 내려와 있어 조금 더 아래에서 찾는다
  },
  snow: {
    name: '눈밭',                     // 눈 덮인 침엽수 숲 아래 빈 눈밭, 차가운 산 호수가 불어나 지운다
    wide: 'snow', tall: 'snow-tall',
    gulls: false,
    ground: 'snow',                  // 바닥이 하얀 눈: 판 읽기(땅 색)·발자국 색이 눈 기준
    shoreFrom: 0.5,
    unlock: 'map-snow',              // 물에서 떠내려온 상자를 열거나
    steps: 3000,                     // 걸음(켜 두기·집중)이 이만큼 쌓이면 고를 수 있다 (v13 · v30.2 5,000 → 3,000: 첫날에)
  },
  fall: {
    name: '가을 호숫가',               // 단풍·은행 숲 아래 옅은 모래 둑, 잔잔한 호수가 불어나 지운다 (v17, 그림은 Codex·ChatGPT 플랜)
    wide: 'fall', tall: 'fall-tall',
    gulls: false,
    shoreFrom: 0.45,
    leaves: true,                    // 물 위 단풍은 그림이 아니라 따로 떠다닌다 (leaves.js)
    moss: true,                      // 이끼 낀 바위: 물과 밝기가 같아 붉은 기로 찾고, 붉은 기 없는 물속 그림자 덩어리는 버린다 (plate.js)
    // 밤·노을·새벽 그림 판 18장 (v28.3, Higgsfield GPT Image 2 — 그 전에는 코드 빛만)
    unlock: 'map-fall',
    steps: 10000,                    // 큰 걸음 목표: 눈밭(3,000) 다음 (v30.2 첫 주 해금 — 2만 → 1만)
  },
  zen: {
    name: '모래 정원',                 // 젠 가든: 정원 가장자리 아래 갈퀴 줄 그은 흰 자갈, 바위 섬. 물이 아니라 갈퀴가 쓸어 올려 지운다 (v18)
    wide: 'zen', tall: 'zen-tall',
    gulls: false,
    eraser: 'rake',                  // 지우개: 물(파도) 대신 갈퀴 (beach.js · zen.js) — 판은 한 장(물 뺀·바위 지운 판 없음)
    rest: 0.58,                      // 갈퀴가 쉬는 줄(판 높이 비율). 그 아래 바위 섬에는 글씨를 쓰지 않는다
    lineGap: 26.5,                   // 그림 속 가로 갈퀴 줄 간격(판 px, 가로·세로 판 모두 실측) — 다시 긋는 줄을 여기에 맞춘다
    ground: 'gravel',                // 숲 줄 찾기·발자국 색이 자갈 기준
    finds: ['pebble', 'heart', 'gold', 'pearl'],   // 물가 물건 중 정원에 어울리는 것만
    // 밤·노을·새벽 그림 판 6장 (v28.3) — 판이 한 장이라 시간대도 한 장씩 (plate.js loadSet)
    unlock: 'map-zen',
    steps: 20000,   // v30.2 3만 5천 → 2만
  },
  // v28.17 재고 장소 2곳 (그림 Higgsfield GPT Image 2 4k, 2026-10-21 — 낮 판 6 + 밤·노을·새벽 18 씩, stock/places)
  cherry: {
    name: '벚꽃 강변',                 // 벚꽃·연둣빛 잎 숲 아래 옅은 모래 둑, 맑은 강이 불어나 지운다
    wide: 'cherry', tall: 'cherry-tall',
    gulls: false,
    shoreFrom: 0.45,                 // 가을 호숫가와 같은 구도
    unlock: 'map-cherry',
    steps: 30000,   // v30.2 5만 → 3만
  },
  oasis: {
    name: '사막 오아시스',              // 대추야자·관목 아래 금빛 사막 모래, 청록 웅덩이가 불어나 지운다
    wide: 'oasis', tall: 'oasis-tall',
    gulls: false,
    shoreFrom: 0.45,
    unlock: 'map-oasis',
    steps: 45000,   // v30.2 7만 → 4만 5천
  },
};
// v28.22 재고 새 장소 24곳 (maps-stock.js) — 밤·노을·새벽 판은 v30.14 (TIME_ART), 물가 5곳은 v30.15
STOCK_PLACES.forEach((p, i) => {
  MAPS[p.id] = {
    name: p.ko, wide: p.id, tall: p.id + '-tall',
    gulls: false,
    shoreFrom: 0.45,                 // 벚꽃 강변과 같은 구도(위 숲 · 가운데 바닥 · 아래 물)
    tone: true,                      // 바닥 색이 장소마다 달라 숲 줄을 그 판의 바닥 색으로 찾는다 (plate.js)
    ...(p.print === 'gravel' ? { ground: 'gravel' } : {}),   // 회색 자갈 바닥: 발자국 색
    ...(TIME_ART.has(p.id) ? {} : { art: false }),   // v30.14 시간대 판이 있으면 읽는다
    like: p.like,
    ...(p.film ? { film: p.film } : {}),   // v30.12 찻빛·흙빛 물 — 큰 파도 물 막 색 (water.js)
    ...(p.shoreFix ? { shoreFix: p.shoreFix } : {}),   // 물가선을 못 읽는 판은 그림에서 잰 높이                    // 손님은 닮은 장소의 동물이 온다
    stock: true,                     // 설정 창엔 열린 것만 보인다
    unlock: 'map-' + p.id,
    steps: STOCK_STEPS0 + i * STOCK_STEP,
  };
});
WATER_PLACES.forEach((p, i) => {
  MAPS[p.id] = {
    name: p.ko, wide: p.plate, tall: p.plate + '-tall',
    gulls: false, stones: true, moss: !!p.moss, shoreFrom: 0.48,
    like: p.like, stock: true,                       // v30.15 밤·노을·새벽 판 있음 (<판>-night/-sunset/-dawn)
    unlock: 'map-' + p.id, steps: WATER_STEPS0 + i * WATER_STEP,
  };
});
export const MAP_IDS = Object.keys(MAPS);
