// maps-stock.js — v28.22 재고 새 장소 24곳 (stock/places/new → assets/, tools/stock-places.py 로 판 맞춤)
//  그림: 낮 본판 Higgsfield GPT Image 2 (2026-10-22, 크레딧 마감 직전) + 물 뺀 판·바위 지운 판·카드 Codex (2026-10-23~24).
//  ⚠ 재고판 그대로다 — 나중에 그림 업데이트 필요 (stock/README.md 「places/new」 · docs/GRAPHICS.md):
//    ① 밤·노을·새벽 판이 없다 → art: false (코드 빛만). 장소마다 18장(6판 × 3시간대)을 다시 그려 night-align.py 로 맞추면 art 를 켠다
//    ② 물 뺀 판·바위 지운 판은 Codex 가 본판을 다시 그린 것이라 결이 조금 다르다 (위치는 alignFit 으로 맞춤, 최대 9px 이동)
//    ③ 해도 섬 그림이 없다 → 코드 그림(색만 ink)
//  바닥 색이 제각각이라 숲 줄은 색 규칙 대신 그 판의 바닥 색으로 찾는다 (plate.js opts.tone)
//
//  필드: ko·en 이름 · print = 발자국 색('sand' · 'gravel' 밝은 회색 바닥) · step = 장소 따라 발자국 녹음(sound.js)
//        shoreFix = 물가선을 못 읽는 판의 물가 높이(판 비율) · like = 손님이 들르는 닮은 기존 장소(guests.js) · ink = 해도 코드 그림 [바닥, 숲] · at = 해도 자리 · note = 상자 카드 글
export const STOCK_PLACES = [
  { id: 'bamboo', ko: '대숲 개울', en: 'the bamboo stream', print: 'sand', step: 'sand', like: 'nz', ink: ['#ecd29a', '#7da04a'], at: [0.48, 0.3], note: '대나무 숲 아래 고운 모래. 맑은 개울이 흘러요.' },
  { id: 'birch', ko: '자작나무 호숫가', en: 'the birch lake', print: 'sand', step: 'sand', like: 'fall', ink: ['#ecd29a', '#c9c46a'], at: [0.08, 0.43], note: '하얀 자작나무 아래 모래 둑. 물이 아주 맑아요.' },
  { id: 'lavender', ko: '라벤더 언덕', en: 'the lavender hill', print: 'sand', step: 'sand', like: 'cherry', ink: ['#e8c98e', '#9a86c4'], at: [0.39, 0.08], note: '보랏빛 라벤더 아래 모래. 바람에서 향이 나요.' },
  { id: 'sunflower', ko: '해바라기 강가', en: 'the sunflower riverbank', print: 'sand', step: 'sand', like: 'cherry', ink: ['#ecd29a', '#e6c234'], at: [0.65, 0.74], note: '해바라기가 줄지어 선 강가. 모두 해를 봐요.' },
  { id: 'tulip', ko: '튤립 운하', en: 'the tulip canal', print: 'sand', step: 'sand', like: 'cherry', ink: ['#ecd29a', '#e0607a'], at: [0.57, 0.92], note: '튤립 밭 아래 모래 둑. 물길이 반듯해요.' },
  { id: 'lotus', ko: '연꽃 연못', en: 'the lotus pond', print: 'sand', step: 'sand', like: 'zen', ink: ['#ead39c', '#7fa04a'], at: [0.3, 0.57], note: '연잎이 떠 있는 연못가. 개구리가 살 것 같아요.' },
  { id: 'paddy', ko: '다랑논 못', en: 'the terraced paddy pond', print: 'sand', step: 'sand', like: 'nz', ink: ['#e3c58c', '#9ab84a'], at: [0.21, 0.17], note: '층층이 논 아래 돌 축대 못. 하늘이 비쳐요.' },
  { id: 'pinecove', ko: '솔숲 바위 만', en: 'the pine cove', print: 'sand', step: 'sand', like: 'beach', ink: ['#e9cf96', '#5f7f46'], at: [0.92, 0.74], note: '구불구불 소나무 아래 작은 만. 바위가 둥글어요.' },
  { id: 'lagoon', ko: '산호 석호', en: 'the coral lagoon', print: 'sand', step: 'sand', like: 'beach', ink: ['#f3ead6', '#e88a6a'], at: [0.08, 0.92], note: '하얀 산호 모래와 옥빛 석호. 꽃이 붉어요.' },
  { id: 'pinksand', ko: '분홍 모래 해변', en: 'the pink sand beach', print: 'sand', step: 'sand', like: 'beach', ink: ['#f0c8bc', '#6f9a4a'], at: [0.48, 0.74], note: '분홍빛 모래 해변. 조개가 부서져 물들었대요.' },
  { id: 'ginkgo', ko: '은행나무 강가', en: 'the ginkgo riverbank', print: 'sand', step: 'sand', like: 'fall', ink: ['#ecd29a', '#e2c23a'], at: [0.88, 0.26], note: '노란 은행잎 아래 모래 둑. 가을이 길어요.' },
  { id: 'savanna', ko: '사바나 물웅덩이', en: 'the savanna waterhole', print: 'sand', step: 'sand', like: 'oasis', shoreFix: { tall: 0.67 }, ink: ['#d9a650', '#9a9a4a'], at: [0.92, 0.08], note: '우산 같은 나무 아래 마른 땅. 모두 물 마시러 와요.' },
  { id: 'canyon', ko: '붉은 협곡 개울', en: 'the red canyon creek', print: 'sand', step: 'sand', like: 'oasis', ink: ['#d98a4f', '#8a9a52'], at: [0.65, 0.57], note: '붉은 바위 협곡의 개울. 모래도 주홍빛이에요.' },
  { id: 'basalt', ko: '검은 모래 해변', en: 'the black sand beach', print: 'sand', step: 'sand', like: 'beach', ink: ['#4a4644', '#4f7a3f'], at: [0.08, 0.08], note: '화산이 만든 검은 모래. 발자국이 반짝여요.' },
  { id: 'hydrangea', ko: '수국 연못', en: 'the hydrangea pond', print: 'gravel', step: 'zengravel', like: 'zen', ink: ['#cfcabd', '#6f86c8'], at: [0.39, 0.43], note: '파란 수국 아래 회색 자갈 연못가. 비가 잘 어울려요.' },
  { id: 'wisteria', ko: '등나무 강가', en: 'the wisteria riverbank', print: 'gravel', step: 'zengravel', like: 'zen', ink: ['#cfccc4', '#9a7ac8'], at: [0.61, 0.3], note: '등꽃이 늘어진 강가. 바닥은 고운 자갈이에요.' },
  { id: 'maple', ko: '단풍 계곡', en: 'the maple valley', print: 'gravel', step: 'zengravel', like: 'fall', ink: ['#dcdcd6', '#d8503a'], at: [0.74, 0.88], note: '새빨간 단풍 아래 흰 자갈 계곡. 물이 푸르러요.' },
  { id: 'alpine', ko: '고산 호숫가', en: 'the alpine lake', print: 'gravel', step: 'zengravel', like: 'snow', ink: ['#c9c9b4', '#4f6b4a'], at: [0.57, 0.08], note: '침엽수 아래 회녹빛 자갈 둑. 차가운 산 호수.' },
  { id: 'fjord', ko: '피오르', en: 'the fjord', print: 'gravel', step: 'zengravel', like: 'snow', shoreFix: { tall: 0.62 }, ink: ['#d8dadb', '#7d8f8a'], at: [0.08, 0.26], note: '서리 내린 숲 아래 회색 자갈. 깊은 바닷물이 들어와요.' },
  { id: 'glacier', ko: '빙하 호숫가', en: 'the glacier lake', print: 'gravel', step: 'zengravel', like: 'snow', ink: ['#bdbcb6', '#d9dccf'], at: [0.35, 0.21], note: '빙하가 갈아 놓은 잿빛 자갈. 물빛이 우윳빛 옥색이에요.' },
  { id: 'heather', ko: '헤더 언덕 개울', en: 'the heather creek', print: 'sand', step: 'mud', like: 'nz', ink: ['#8a5a36', '#8a6a9a'], at: [0.12, 0.79], note: '보랏빛 헤더 아래 갈색 흙. 개울물이 찻빛이에요.' },
  { id: 'mangrove', ko: '맹그로브 갯벌', en: 'the mangrove flats', print: 'sand', step: 'mud', like: 'nz', ink: ['#a88a64', '#6f8a3e'], at: [0.7, 0.43], note: '뿌리가 다리처럼 선 숲 아래 갯벌. 물이 들고 나요.' },
  { id: 'rainforest', ko: '열대우림 강', en: 'the rainforest river', print: 'sand', step: 'mud', like: 'nz', ink: ['#c97a46', '#3f7a3a'], at: [0.39, 0.92], note: '큰 잎 숲 아래 붉은 흙. 강물이 초록빛이에요.' },
  { id: 'cypress', ko: '낙우송 늪', en: 'the cypress swamp', print: 'sand', step: 'mud', like: 'nz', shoreFix: { tall: 0.62 }, ink: ['#6b5a3c', '#4e5a32'], at: [0.21, 0.92], note: '이끼 늘어진 나무 아래 늪. 물속에 뿌리가 솟아요.' },
];
export const STOCK_IDS = new Set(STOCK_PLACES.map(p => p.id));
export const STOCK_STEPS0 = 80000, STOCK_STEP = 10000;   // 걸음 목표: 오아시스(70,000) 다음부터 1만 보씩
