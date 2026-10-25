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
];
export const WATER_IDS = new Set(WATER_PLACES.map(p => p.id));
// Continue after the original 24 stock goals (80,000–310,000); never shift their goals.
export const WATER_STEPS0 = 320000, WATER_STEP = 10000;
