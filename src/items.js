// items.js — v10: 물에서 떠내려오는 유리병·상자, 그 안의 것(편지 · 키위 옷)
//
//  흐름: 가끔 물 위(바다·개울) 먼 쪽에서 유리병이나 나무 상자가 출렁이며 다가와 물가에 닿는다(종소리).
//        누르면 열리고 안에 든 것이 카드로 나온다 → 이 기기에 저장(모은 것). 옷은 키위에게 입혀 볼 수 있다.
//  순서: 편지(유리병)와 옷(상자)을 번갈아. 처음 하나는 금방, 그 뒤로는 몇 분에 한 번 — 글을 쓸수록 조금 빨리.
//  다 모으면 더는 떠내려오지 않는다 (다음 묶음·새 장소는 여기 목록에 더하면 된다).
//  v14: 가만히 두면 편지(유리병) → 소리(소라 껍데기)가 가끔 온다.
//  v12: 가만히 두면 편지(유리병)만 가끔 온다. 옷·장소(상자)는 집중 모드를 끝까지 하면 선물로 온다 (focus.js)
//  v11: 장소도 상자에서 나온다 (kind 'map' — 열면 설정 창 「장소」에서 고를 수 있다. maps.js 의 unlock 과 짝)

import { trackItems } from './tracks/index.js?v=v29.32.0-c49194c';
import { STOCK_PLACES } from './maps-stock.js?v=v29.32.0-c49194c';
import { WATER_PLACES } from './maps-water.js?v=v29.32.0-c49194c';

export const ITEMS = [
  { id: 'letter1', kind: 'letter', box: 'bottle', title: '첫 번째 편지', text: '파도가 글씨를 가져가도, 쓰고 싶었던 마음은 모래 속에 남아요.' },
  { id: 'hat', kind: 'wear', box: 'crate', name: '밀짚모자', img: 'kiwi-hat.webp?v=v29.32.0-c49194c', note: '햇볕 좋은 날 산책용.' },
  { id: 'letter2', kind: 'letter', box: 'bottle', title: '두 번째 편지', text: '키위는 날지 못해서 천천히 걸어요. 천천히 가도 결국 도착해요.' },
  { id: 'scarf', kind: 'wear', box: 'crate', name: '빨간 목도리', img: 'kiwi-scarf.webp?v=v29.32.0-c49194c', note: '밤바람이 차가울 때.' },
  { id: 'letter3', kind: 'letter', box: 'bottle', title: '세 번째 편지', text: '작은 발자국도 모이면 글자가 돼요. 오늘 찍은 한 걸음도요.' },
  { id: 'crown', kind: 'wear', box: 'crate', name: '꽃 화관', img: 'kiwi-crown.webp?v=v29.32.0-c49194c', note: '숲 가장자리에서 엮었대요.' },
  { id: 'letter4', kind: 'letter', box: 'bottle', title: '네 번째 편지', text: '지워진 자리는 다음 문장을 위한 빈 모래예요.' },
  { id: 'glasses', kind: 'wear', box: 'crate', name: '동그란 안경', img: 'kiwi-glasses.webp?v=v29.32.0-c49194c', note: '글씨를 더 반듯하게 쓰고 싶어서.' },
  { id: 'letter5', kind: 'letter', box: 'bottle', title: '다섯 번째 편지', text: '여기까지 걸어온 당신에게. — 키위 일동' },
  { id: 'backpack', kind: 'wear', box: 'crate', name: '작은 배낭', img: 'kiwi-backpack.webp?v=v29.32.0-c49194c', note: '다음 장소로 떠날 준비.' },
  { id: 'map-snow', kind: 'map', box: 'crate', map: 'snow', name: '눈밭', img: 'snow-card.webp?v=v29.32.0-c49194c', note: '눈 덮인 숲 아래 호숫가. 발자국이 또렷하게 남아요.' },
  // v11.1 겨울 옷 (두 번째 묶음 — 눈밭을 연 뒤에 떠내려온다)
  { id: 'beanie', kind: 'wear', box: 'crate', name: '방울 털모자', img: 'kiwi-beanie.webp?v=v29.32.0-c49194c', note: '눈밭 산책 필수품.' },
  { id: 'earmuffs', kind: 'wear', box: 'crate', name: '분홍 귀마개', img: 'kiwi-earmuffs.webp?v=v29.32.0-c49194c', note: '호수 바람이 찰 때.' },
  { id: 'sweater', kind: 'wear', box: 'crate', name: '눈꽃 스웨터', img: 'kiwi-sweater.webp?v=v29.32.0-c49194c', note: '눈송이 무늬 두꺼운 니트.' },
  { id: 'blanket', kind: 'wear', box: 'crate', name: '체크 담요', img: 'kiwi-blanket.webp?v=v29.32.0-c49194c', note: '글씨 쓰다 쉬어 갈 때 두르는 망토.' },
  { id: 'santa', kind: 'wear', box: 'crate', name: '산타 모자', img: 'kiwi-santa.webp?v=v29.32.0-c49194c', note: '12월이 오면.' },
  { id: 'vest', kind: 'wear', box: 'crate', name: '패딩 조끼', img: 'kiwi-vest.webp?v=v29.32.0-c49194c', note: '털 깃이 달린 따뜻한 조끼.' },
  // v28.12 할로윈 머리 장식 (상자에 담겨 온다)
  { id: 'witch', kind: 'wear', box: 'crate', name: '마녀 모자', img: 'head-witch.webp?v=v29.32.0-c49194c', note: '끝이 살짝 꺾인 보라 모자.' },
  { id: 'pumpkin', kind: 'wear', box: 'crate', name: '호박 모자', img: 'head-pumpkin.webp?v=v29.32.0-c49194c', note: '웃는 얼굴을 새긴 작은 호박.' },
  { id: 'ghostpin', kind: 'wear', box: 'crate', name: '유령 머리핀', img: 'head-ghostpin.webp?v=v29.32.0-c49194c', note: '눈만 콕콕, 겁 안 나는 유령.' },
  // v28.14 재고 옷 4 (stock/outfits, 2026-10-21) — 머리핀·선글라스는 머리 장식(headwear.js)이라 동작도 한다, 망토·스카프는 몸째 그린 그림
  { id: 'hairpin', kind: 'wear', box: 'crate', name: '벚꽃 머리핀', img: 'kiwi-hairpin.webp?v=v29.32.0-c49194c', note: '강가에 떨어진 꽃잎 두 장으로.' },
  { id: 'cape', kind: 'wear', box: 'crate', name: '꽃잎 망토', img: 'kiwi-cape.webp?v=v29.32.0-c49194c', note: '바람이 불면 꽃잎이 살랑.' },
  { id: 'desertscarf', kind: 'wear', box: 'crate', name: '사막 스카프', img: 'kiwi-desertscarf.webp?v=v29.32.0-c49194c', note: '모래바람을 막아 주는 줄무늬 천.' },
  { id: 'sunglasses', kind: 'wear', box: 'crate', name: '동그란 선글라스', img: 'kiwi-sunglasses.webp?v=v29.32.0-c49194c', note: '햇볕 쨍한 물가에서.' },
  // v28.15 행사 머리 장식 (재고 stock/events, 장식만 그린 그림이라 카드에도 장식 그림)
  { id: 'antlers', kind: 'wear', box: 'crate', name: '루돌프 뿔', img: 'head-antlers.webp?v=v29.32.0-c49194c', note: '방울이 달린 갈색 뿔 머리띠.' },
  { id: 'knit', kind: 'wear', box: 'crate', name: '귀덮개 니트 모자', img: 'head-knit.webp?v=v29.32.0-c49194c', note: '귀까지 폭 덮는 빨간 모자.' },
  { id: 'holly', kind: 'wear', box: 'crate', name: '호랑가시 핀', img: 'head-holly.webp?v=v29.32.0-c49194c', note: '빨간 열매 셋, 겨울 숲에서.' },
  { id: 'starband', kind: 'wear', box: 'crate', name: '별 머리띠', img: 'head-starband.webp?v=v29.32.0-c49194c', note: '스프링 끝에서 별이 통통.' },
  { id: 'bokgeon', kind: 'wear', box: 'crate', name: '복건', img: 'head-bokgeon.webp?v=v29.32.0-c49194c', note: '설날 아침에 쓰는 색동 모자.' },
  { id: 'melonpin', kind: 'wear', box: 'crate', name: '수박 핀', img: 'head-melonpin.webp?v=v29.32.0-c49194c', note: '한 입 베어 물고 싶은 여름.' },
  { id: 'map-fall', kind: 'map', box: 'crate', map: 'fall', name: '가을 호숫가', img: 'fall-card.webp?v=v29.32.0-c49194c', note: '단풍 숲 아래 잔잔한 호수. 낙엽이 떠다녀요.' },
  { id: 'map-zen', kind: 'map', box: 'crate', map: 'zen', name: '모래 정원', img: 'zen-card.webp?v=v29.32.0-c49194c', note: '갈퀴 줄 그은 흰 자갈 정원. 파도 대신 갈퀴가 쓸어 지워요.' },
  { id: 'map-cherry', kind: 'map', box: 'crate', map: 'cherry', name: '벚꽃 강변', img: 'cherry-card.webp?v=v29.32.0-c49194c', note: '벚꽃 숲 아래 맑은 강. 둑에 꽃잎이 내려앉아요.' },
  { id: 'map-oasis', kind: 'map', box: 'crate', map: 'oasis', name: '사막 오아시스', img: 'oasis-card.webp?v=v29.32.0-c49194c', note: '대추야자 그늘 아래 청록 웅덩이. 모래가 금빛이에요.' },
  // v28.22 재고 새 장소 24곳 (maps-stock.js, 카드 = 가로 낮 판 가운데 480×300)
  ...STOCK_PLACES.map(p => ({ id: 'map-' + p.id, kind: 'map', box: 'crate', map: p.id, name: p.ko, img: p.id + '-card.webp?v=v29.32.0-c49194c', note: p.note })),
  ...WATER_PLACES.map(p => ({ id: 'map-' + p.id, kind: 'map', box: 'crate', map: p.id, name: p.ko, img: p.plate + '-card.webp?v=v29.32.0-c49194c', note: p.note })),
  // v14 소리 (소라 껍데기에 담겨 온다 — 켜 두기만 해도, 편지 다음 순서). group: step = 발자국 소리, nature = 자연 배경 (sound.js)
  { id: 's-snow', kind: 'sound', box: 'conch', group: 'step', pack: 'snow', name: '눈 밟는 소리', note: '발자국마다 뽀드득 — 녹음 BigSoundBank (CC0).' },
  { id: 'n-birds', kind: 'sound', box: 'conch', group: 'nature', pack: 'birds', name: '숲 새소리', note: '숲속 새와 바람 — 녹음 BigSoundBank (CC0).' },
  { id: 's-leaves', kind: 'sound', box: 'conch', group: 'step', pack: 'leaves', name: '낙엽 밟는 소리', note: '발자국마다 바스락 — 녹음 BigSoundBank (CC0).' },
  { id: 'n-fire', kind: 'sound', box: 'conch', group: 'nature', pack: 'fire', name: '모닥불', note: '타닥타닥 — 녹음 BigSoundBank (CC0).' },
  { id: 's-gravel', kind: 'sound', box: 'conch', group: 'step', pack: 'gravel', name: '자갈 밟는 소리', note: '발자국마다 자박자박 — 녹음 BigSoundBank (CC0).' },
  { id: 'n-frogs', kind: 'sound', box: 'conch', group: 'nature', pack: 'frogs', name: '개구리 합창', note: '연못가 개구리들 — 녹음 BigSoundBank (CC0).' },
  { id: 's-splash', kind: 'sound', box: 'conch', group: 'step', pack: 'splash', name: '물웅덩이 소리', note: '발자국마다 찰박.' },
  { id: 'n-chime', kind: 'sound', box: 'conch', group: 'nature', pack: 'chime', name: '풍경 소리', note: '처마 끝 쇠 종이 바람에 딸랑.' },   // v15.1 고래 노래 대신 (사람 목소리 같다는 피드백)
  // v18 직접 만든 생성 곡 4 (곡 후보 듣기에서 사용자가 고름, 2026-10-11) — 파일 없음, music.js SONGS 가 연주한다
  { id: 'm-mist', kind: 'sound', box: 'conch', group: 'music', pack: 'mist', name: '새벽 물안개', note: '직접 만든 생성 앰비언트 — 유리 소리가 드물게, 낮은 드론 위로.' },
  { id: 'm-shell', kind: 'sound', box: 'conch', group: 'music', pack: 'shell', name: '소라 속 바다', note: '직접 만든 생성 앰비언트 — 반짝이는 높은 음이 오래 남는다.' },
  { id: 'm-moss', kind: 'sound', box: 'conch', group: 'music', pack: 'moss', name: '이끼 숲', note: '직접 만든 생성 앰비언트 — 숨소리 섞인 플루트, 어두운 도리아.' },
  { id: 'm-forest', kind: 'sound', box: 'conch', group: 'music', pack: 'forest', name: '숲속 아침', note: '직접 만든 생성 곡 — 플루트 선율, 8마디 진행.' },
  // v24.5 직접 만든 생성 곡 10 (2026-10-18, 사용자 "아까 만든 곡이랑 지금 것까지") — 유플로리아풍 4 · 화음만 3 · 포근한 선율 3
  { id: 'm-eu-meander', kind: 'sound', box: 'conch', group: 'music', pack: 'eu-meander', name: '굽이 씨앗길', note: '직접 만든 생성 곡 — 유플로리아풍: 맑은 결정 소리의 짧은 주제가 옥타브·거꾸로·느리게 변주되며 메아리친다.' },
  { id: 'm-eu-open', kind: 'sound', box: 'conch', group: 'music', pack: 'eu-open', name: '열린 하늘', note: '직접 만든 생성 곡 — 유플로리아풍: 높은 반짝임 세 음과 긴 메아리, 넓은 단조.' },
  { id: 'm-eu-grove', kind: 'sound', box: 'conch', group: 'music', pack: 'eu-grove', name: '씨앗 정원', note: '직접 만든 생성 곡 — 유플로리아풍: 조금 밝게, 퉁기는 소리가 주제를 연주.' },
  { id: 'm-eu-drift', kind: 'sound', box: 'conch', group: 'music', pack: 'eu-drift', name: '떠도는 섬', note: '직접 만든 생성 곡 — 유플로리아풍: 두 화음만 아주 길게, 반복과 길이로.' },
  { id: 'm-eu-bloom', kind: 'sound', box: 'conch', group: 'music', pack: 'eu-bloom', name: '피어나는 화음', note: '직접 만든 생성 곡 — 화음만: 위쪽 띵 소리는 키위 발자국이 낸다.' },
  { id: 'm-eu-tide', kind: 'sound', box: 'conch', group: 'music', pack: 'eu-tide', name: '느린 물결 화음', note: '직접 만든 생성 곡 — 화음만, 단조로 물결처럼.' },
  { id: 'm-eu-field', kind: 'sound', box: 'conch', group: 'music', pack: 'eu-field', name: '구름 위 들판', note: '직접 만든 생성 곡 — 화음만, 열린 화음 셋이 하나에 40초씩.' },
  { id: 'm-cozy-wait', kind: 'sound', box: 'conch', group: 'music', pack: 'cozy-wait', name: '기다리는 오후', note: '직접 만든 생성 곡 — 포근한 선율: 피아노가 천천히 묻고 답한다.' },
  { id: 'm-cozy-where', kind: 'sound', box: 'conch', group: 'music', pack: 'cozy-where', name: '어디쯤이었지', note: '직접 만든 생성 곡 — 포근한 선율: 플루트가 세 음을 묻는 가벼운 고리.' },
  { id: 'm-cozy-tea', kind: 'sound', box: 'conch', group: 'music', pack: 'cozy-tea', name: '찻잔 위 김', note: '직접 만든 생성 곡 — 포근한 선율: 느린 유리 소리 세 음.' },
  // v13.1 바꾸기: 물가에서 주운 것으로 만든다 (craft = 필요한 개수, shore.js 의 id). 떠내려오지 않는다
  { id: 'necklace', kind: 'wear', name: '조개 목걸이', img: 'kiwi-necklace.webp?v=v29.32.0-c49194c', note: '주운 조개를 꿰어 만들었어요.', craft: { scallop: 4, snail: 4 } },
  { id: 'plume', kind: 'wear', name: '깃털 머리띠', img: 'kiwi-plume.webp?v=v29.32.0-c49194c', note: '깃털과 유목을 엮었어요.', craft: { feather: 5, drift: 2 } },
  { id: 'pendant', kind: 'wear', name: '바다 유리 펜던트', img: 'kiwi-pendant.webp?v=v29.32.0-c49194c', note: '초록·파랑 바다 유리를 은실로 감았어요.', craft: { glassG: 4, glassB: 2 } },
  { id: 'starpin', kind: 'wear', name: '불가사리 머리핀', img: 'kiwi-starpin.webp?v=v29.32.0-c49194c', note: '하트 돌 구슬을 달았어요.', craft: { star: 2, heart: 1 } },
];
// v16 곡(녹음)·새로 붙인 녹음 소리는 카탈로그(src/tracks/)에서 저절로 온다 — 소라 순서상 손으로 적은 소리 다음
for (const it of trackItems()) if (!ITEMS.some(o => o.id === it.id)) ITEMS.push(it);
export const ITEM = Object.fromEntries(ITEMS.map(it => [it.id, it]));

// 모은 것: 이 기기에만 저장 (localStorage)
export class Collection {
  constructor(load, save, all = false) {
    this.save = save; this.all = all;   // all = 테스트: 전부 가진 것으로 (config.js UNLOCK_ALL)
    let s = {};
    try { s = JSON.parse(load() || '{}'); } catch (e) { s = {}; }
    this.found = (s.found || []).filter(id => ITEM[id]);
    this.wear = (s.wear || []).filter(id => ITEM[id] && this.owns(id));
  }
  store() { this.save(JSON.stringify({ found: this.found, wear: this.wear })); }
  has(id) { return this.found.includes(id); }        // 실제로 찾았나 (떠내려오기 순서·카드에 쓴다)
  owns(id) { return this.all || this.has(id); }      // 쓸 수 있나 (입기·장소·소리·곡 고르기에 쓴다)
  add(id) { if (!this.has(id)) { this.found.push(id); this.store(); } }
  wearing(id) { return this.wear.includes(id); }
  setWear(id, on) { this.wear = this.wear.filter(w => w !== id); if (on && this.owns(id)) this.wear.push(id); this.store(); }
  next(ok = () => true) { return ITEMS.find(it => !it.craft && !this.has(it.id) && ok(it)) || null; }   // 만드는 것은 떠내려오지 않는다
  get count() { return this.found.length; }
}

// 떠내려오는 것 (v20: 호박색 병 mine = 돌아온 내 글 · 초록 병 cheer = 응원 쪽지 — 크기·기울기는 유리병과 같다)
const isBottle = b => b === 'bottle' || b === 'mine' || b === 'cheer';
export class Drifters {
  constructor() { this.list = []; this.nextAt = 35; this.imgs = {}; this.paused = false; this.gap = 180; this.max = 3; }   // gap = 다음 것까지 평균 초 (테스트 탭에서 조절, v19.2)
  setSprites(imgs) { this.imgs = imgs; }
  setSunk(imgs) { this.sunk = imgs; }   // v28.20 물가에 닿은 뒤 모래에 반쯤 묻힌 그림 (상자 종류별)
  reset() { this.list = []; }
  wrote(t) { this.nextAt = Math.max(t + 15, this.nextAt - 35); }   // 글을 쓸수록 조금 빨리 (그래도 적어도 15초 뒤)

  update(dt, beach, col, onArrive) {
    const { W, H, u, t } = beach;
    // 가만히 둘 때는 편지만 (집중 중에는 아무것도 띄우지 않는다 — 선물은 집중이 끝날 때 send 로)
    // v29.30 물 위에 떠 있는 건 하나씩, 물가에 닿아 안 연 병·상자는 max 개까지 쌓인다 (편지 오는 길 — mail.js)
    if (!this.paused && this.room() && t > this.nextAt) {
      const it = col.next(it => it.kind === 'letter' || it.kind === 'sound');   // v14: 편지 다음엔 소리 소라
      if (it) {
        const x = this.freeX(W, u, 0.22, 0.56);
        this.list.push({ it, x, y: H + 30 * u, vx: (Math.random() - 0.5) * 8 * u, ph: Math.random() * 6, born: t, ashore: false, size: Math.max(isBottle(it.box) ? 44 : 40, (isBottle(it.box) ? 78 : 66) * u) });
      } else this.nextAt = Infinity;
    }
    for (const d of this.list) {
      const edge = beach.edge(d.x), rest = edge + 7 * u;
      // 물 없는 장소(모래 정원 v18): 떠내려오지 않고 바위 섬 앞 쉬는 줄에 놓여 있다 (스르르 나타난다)
      if (!d.ashore && beach.still) { d.y = rest; d.ashore = true; onArrive && onArrive(d); }
      if (!d.ashore) {
        // 물결을 타고 천천히 다가온다 (20초 남짓)
        d.y -= Math.max(10 * u, (d.y - rest) * 0.09) * dt;
        d.x = Math.min(W - 40 * u, Math.max(40 * u, d.x + d.vx * dt + Math.sin(t * 0.7 + d.ph) * 4 * u * dt));
        if (d.y <= rest) { d.ashore = true; onArrive && onArrive(d); }
      } else if (!beach.still) d.y += (rest - d.y) * Math.min(1, dt * 3);   // 물가선을 따라 (큰 파도가 오면 같이 밀려 올라간다) — 모래 정원에서는 놓인 자리 그대로
    }
  }

  sparkle(ctx, d, t, u) {
    const g = Math.max(0, Math.sin(t * 2.4 + d.ph));
    ctx.save(); ctx.translate(d.x, d.y); ctx.globalAlpha = g * 0.9; ctx.fillStyle = '#fffbe6';
    const s = (2 + g * 3) * u, sx = d.size * 0.18, sy = -d.size * 0.22;
    ctx.beginPath(); ctx.moveTo(sx, sy - s * 2); ctx.lineTo(sx + s * 0.4, sy); ctx.lineTo(sx, sy + s * 2); ctx.lineTo(sx - s * 0.4, sy); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - s * 2, sy); ctx.lineTo(sx, sy + s * 0.4); ctx.lineTo(sx + s * 2, sy); ctx.lineTo(sx, sy - s * 0.4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  draw(ctx, beach) {
    const { u, t } = beach;
    for (const d of this.list) {
      const im = this.imgs[d.it.box];
      if (!im) continue;
      // v28.20 물가에 닿고 1초가 지나면 모래에 반쯤 묻힌 그림으로 (그림이 있는 병·상자만, 물 없는 장소 제외)
      if (d.ashore && d.landT == null) d.landT = t;
      const sk = !beach.still && d.ashore && t - d.landT > 1.1 ? this.sunk?.[d.it.box] : null;
      if (sk) { const s = d.size * 1.3, h = s * sk.height / sk.width; ctx.save(); ctx.globalAlpha = Math.min(1, (t - d.landT - 1.1) / 0.5); ctx.drawImage(sk, d.x - s / 2, d.y - h * 0.62, s, h); ctx.restore(); }
      if (sk && t - d.landT > 1.6) { this.sparkle(ctx, d, t, u); continue; }
      const dryG = beach.still, show = dryG ? Math.min(1, (t - d.born) / 0.8) : 1;   // 물 없는 장소: 까딱이지 않고, 물결 없이 스르르 나타난다
      const bob = dryG ? 0 : Math.sin(t * 1.8 + d.ph) * 2.2 * u, tilt = (dryG ? 0.1 : Math.sin(t * 1.3 + d.ph) * 0.12) + (isBottle(d.it.box) ? -0.5 : 0);
      ctx.save();
      // 물에 뜬 자리의 동그란 물결
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.3 * u;
      if (!dryG) for (let k = 0; k < 2; k++) {
        const ph = ((t * 0.5 + k * 0.5 + d.ph) % 1);
        ctx.globalAlpha = (1 - ph) * 0.8;
        ctx.beginPath(); ctx.ellipse(d.x, d.y + 4 * u, d.size * (0.5 + ph * 0.5), d.size * (0.22 + ph * 0.2), 0, 0, 6.29); ctx.stroke();
      }
      // 물에 비친 어두운 그림자 (투명한 유리병도 물빛에 묻히지 않게)
      ctx.globalAlpha = 0.28 * show; ctx.fillStyle = dryG ? '#3a3226' : '#0b2b3a';
      ctx.beginPath(); ctx.ellipse(d.x + 4 * u, d.y + 6 * u, d.size * 0.42, d.size * 0.2, 0, 0, 6.29); ctx.fill();
      ctx.globalAlpha = show;
      ctx.translate(d.x, d.y + bob); ctx.rotate(tilt);
      ctx.drawImage(im, -d.size / 2, -d.size / 2, d.size, d.size);
      ctx.restore();
      // 눈길을 끄는 반짝임 (물가에 닿은 뒤)
      if (d.ashore) this.sparkle(ctx, d, t, u);
    }
  }

  // 바로 띄우기 (집중 선물 · 내 편지): 이미 떠 있는 것과 겹치지 않게 옆으로
  // v29.30 새로 띄울 자리가 있나: 떠 있는 게 없고, 물가에 쌓인 게 max 개보다 적을 때
  room() { return !this.list.some(d => !d.ashore) && this.list.length < this.max; }
  // 쌓인 병·상자와 겹치지 않는 가로 자리
  freeX(W, u, a = 0.3, b = 0.4) {
    const taken = this.list.map(d => d.x);
    let x = W * (a + Math.random() * b);
    for (let k = 0; k < 10 && taken.some(o => Math.abs(o - x) < 110 * u); k++) x = W * (0.14 + Math.random() * 0.72);
    return x;
  }
  // v29.30 새로고침해도 물가에 남게: 안 연 것만 { it, rx } 로 (it 은 저장 가능한 모양 — 모은 것은 id 만)
  snapshot(W) { return this.list.filter(d => d.ashore).map(d => ({ it: d.it.kind === 'mine' || d.it.kind === 'cheer' ? d.it : { id: d.it.id }, rx: d.x / Math.max(1, W) })); }
  restore(saved, beach, lookup) {
    const { W, u } = beach;
    for (const s of saved || []) {
      const it = s.it?.kind === 'mine' || s.it?.kind === 'cheer' ? s.it : lookup(s.it?.id);
      if (!it || this.list.length >= this.max) continue;
      const x = Math.max(40 * u, Math.min(W - 40 * u, (s.rx || 0.5) * W));
      this.list.push({ it, x, y: beach.edge(x) + 7 * u, vx: 0, ph: Math.random() * 6, born: beach.t - 5, ashore: true, landT: beach.t - 3, size: Math.max(isBottle(it.box) ? 44 : 40, (isBottle(it.box) ? 78 : 66) * u) });
    }
  }

  send(it, beach) {
    const { W, H, u } = beach;
    const x = this.freeX(W, u);
    this.list.push({ it, x, y: H + 30 * u, vx: (Math.random() - 0.5) * 6 * u, ph: Math.random() * 6, born: beach.t, ashore: false, size: Math.max(isBottle(it.box) ? 44 : 40, (isBottle(it.box) ? 78 : 66) * u) });
  }

  hit(x, y, u) { return this.list.find(d => Math.hypot(d.x - x, d.y - y) < d.size * 0.75 + 10 * u) || null; }
  open(d, t) { this.list = this.list.filter(o => o !== d); this.nextAt = t + this.gap * (0.67 + Math.random() * 0.66); }
}
