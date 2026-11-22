// 2026-10-23 water plates, integrated without replacing the existing stock places.
// IDs are persistent save keys. Keep the stock hydrangea/bamboo/lavender IDs intact.
export const WATER_PLACES = [
  { id: 'hydrangea-cove', ko: '수국 꽃해변', en: 'the hydrangea cove', plate: 'hydrangea-water',
    step: 'sand', like: 'cherry', isleLike: 'hydrangea', at: [0.92, 0.55], ink: ['#e9d9b8', '#889fc2'],
    note: '수국 연못과는 다른 밝은 모래 해변. 옥빛 파도가 밀려와요.' },
  { id: 'hot-spring', ko: '화산 온천', en: 'the volcanic hot spring', plate: 'hot-spring-water',
    step: 'zengravel', like: 'zen', isleLike: 'basalt', at: [0.77, 0.08], ink: ['#c8c2ab', '#77986b'], moss: true,
    note: '화산 바위 아래 맑은 온천. 물가의 돌들이 따뜻해요.' },
  { id: 'hangang', ko: '한강 버드나무 둔치', en: 'the willow riverbank', plate: 'hangang-water',
    step: 'sand', like: 'nz', isleLike: 'ginkgo', at: [0.55, 0.43], ink: ['#eadab7', '#739a68'],
    note: '버드나무 그늘 아래 넓은 둔치. 강물이 천천히 밀려와요.' },
  { id: 'bamboo-bay', ko: '대나무 작은 만', en: 'the bamboo bay', plate: 'bamboo-water',
    step: 'sand', like: 'nz', isleLike: 'bamboo', at: [0.78, 0.75], ink: ['#e5d7ac', '#739866'],
    note: '대숲 개울 너머의 작은 만. 잎 그늘 아래 넓은 모래와 옥빛 물.' },
  { id: 'lavender-sandbar', ko: '라벤더 모래톱', en: 'the lavender sandbar', plate: 'lavender-water',
    step: 'sand', like: 'cherry', isleLike: 'lavender', at: [0.23, 0.69], ink: ['#ecdbbc', '#a496c5'],
    note: '라벤더 언덕을 내려오면 만나는 밝은 모래톱. 꽃 아래 바다가 반짝여요.' },
  // v30.28 굽은 물가 2곳 (2026-11-22 사용자: "물이 일자거나 비스듬한 경우가 많은데 해안선이 볼록하거나 오목한 버전도")
  //  curve: 물가선이 크게 굽어 있다 — 판 읽기에서 「중앙값에서 10% 넘게 벗어난 칸 메우기」를 하지 않는다 (plate.js)
  //  shoreFrom: 물가선을 찾기 시작하는 높이 — 모래곶은 양옆 물이 화면 40% 까지 올라온다
  { id: 'shell-cove', ko: '초승달 조개 만', en: 'the crescent shell cove', plate: 'shellcove-water',
    step: 'sand', like: 'beach', isleLike: 'pinksand', at: [0.19, 0.5], ink: ['#f1e3c4', '#7f9f6a'], curve: true, shoreFrom: 0.42,
    note: '바다가 모래 쪽으로 둥글게 파고든 작은 만. 양 끝 갯바위가 초승달 뿔 같아요.' },
  { id: 'sand-point', ko: '둥근 모래곶', en: 'the round sand point', plate: 'sandpoint-water',
    step: 'sand', like: 'beach', isleLike: 'lagoon', at: [0.94, 0.94], ink: ['#ecd39a', '#7fa35a'], curve: true, shoreFrom: 0.3,
    note: '모래가 바다 쪽으로 둥글게 튀어나온 곶. 끝에는 작은 물웅덩이 바위가 있어요.' },
];
export const WATER_IDS = new Set(WATER_PLACES.map(p => p.id));
// Continue after the 24 stock goals (55,000–239,000, v30.2 낮춤); keep water goals after them.
export const WATER_STEPS0 = 250000, WATER_STEP = 10000;
