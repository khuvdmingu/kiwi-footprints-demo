// maps.js — 골라 쓰는 장소(맵)
//  장소마다 그림 판 한 벌(가로 wide · 세로 tall, 각각 본판·-dry·-sea 세 장)과 그 장소의 성격을 정한다.
//  구조는 모두 같다: 위는 숲(키위가 숨었다 나온다), 가운데는 글씨를 쓰는 바닥, 아래는 물(불어나서 글씨를 지운다).

export const MAPS = {
  beach: {
    name: '바닷가',
    wide: 'plate', tall: 'tall',
    gulls: true,                     // 바다 위를 지나가는 갈매기
    shoreFrom: 0.4,                  // 물가선을 이 높이(화면 비율) 아래에서 찾는다
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
    steps: 5000,                     // 걸음(켜 두기·집중)이 이만큼 쌓이면 고를 수 있다 (v13)
  },
};
export const MAP_IDS = Object.keys(MAPS);
