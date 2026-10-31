// acts.js — 키위 동작 그림 (v27)
//
//  동작마다 짧은 영상을 Higgsfield(Kling 3.0, 시작·끝 프레임 = assets/kiwi.webp)로 만들고
//  tools/make-act.sh 가 움직이는 구간만 잘라 한 장 묶음(assets/kiwi-act-<id>.webp)으로 만든다.
//  처음·끝 프레임이 몸 그림과 같아서 걷기·멈춤과 이음새 없이 이어진다. 다리는 그대로 코드가 그린다.
//  ox·oy·w·h = 그 프레임이 kiwi.webp 픽셀 좌표에서 차지하는 상자 (kiwi.js 가 몸 그림과 같은 자리 맞춤에 얹는다).
//  옷 입은 키위: 머리 장식(모자·화관·안경 등, headwear.js)은 v28.7 부터 얹는 그림이라 함께 움직인다. 몸을 감싸는 옷은 아직 몸째 그린 그림이라 동작하지 않는다.

export const ACTS = {
  stretch: { file: 'kiwi-act-stretch.webp?v=v29.25.1-44a30f8', n: 53, cols: 8, fps: 15, fw: 334, fh: 293, ox: 25.6, oy: -87.1, w: 667.7, h: 585.2 },
  nibble: { file: 'kiwi-act-nibble.webp?v=v29.25.1-44a30f8', n: 69, cols: 8, fps: 15, fw: 271, fh: 191, ox: 81.1, oy: 141.9, w: 541.2, h: 381.9 },
  lookup: { file: 'kiwi-act-lookup.webp?v=v29.25.1-44a30f8', n: 71, cols: 8, fps: 15, fw: 266, fh: 204, ox: 81.1, oy: 83.6, w: 532.6, h: 408.9 },
  tilt: { file: 'kiwi-act-tilt.webp?v=v29.25.1-44a30f8', n: 41, cols: 8, fps: 15, fw: 258, fh: 167, ox: 81.1, oy: 157.5, w: 517.0, h: 334.9 },
  nod: { file: 'kiwi-act-nod.webp?v=v29.25.1-44a30f8', n: 58, cols: 8, fps: 15, fw: 258, fh: 201, ox: 81.1, oy: 157.5, w: 517.0, h: 401.8 },
  startle: { file: 'kiwi-act-startle.webp?v=v29.25.1-44a30f8', n: 49, cols: 8, fps: 15, fw: 278, fh: 224, ox: 55.5, oy: 55.1, w: 555.4, h: 447.3 },
  back: { file: 'kiwi-act-back.webp?v=v29.25.1-44a30f8', n: 75, cols: 8, fps: 15, fw: 284, fh: 199, ox: 78.2, oy: 100.6, w: 568.2, h: 397.5 },
  shiver: { file: 'kiwi-act-shiver.webp?v=v29.25.1-44a30f8', n: 60, cols: 8, fps: 15, fw: 287, fh: 173, ox: 79.6, oy: 156.1, w: 573.9, h: 346.3 },
  yawn: { file: 'kiwi-act-yawn.webp?v=v29.25.1-44a30f8', n: 55, cols: 8, fps: 15, fw: 270, fh: 185, ox: 81.1, oy: 123.4, w: 539.7, h: 369.1 },
  rest: { file: 'kiwi-act-rest.webp?v=v29.25.1-44a30f8', n: 85, cols: 8, fps: 15, fw: 286, fh: 170, ox: 81.1, oy: 157.5, w: 571.0, h: 339.2, legs: false },
  joy: { file: 'kiwi-act-joy.webp?v=v29.25.1-44a30f8', n: 69, cols: 8, fps: 15, fw: 312, fh: 337, ox: 56.9, oy: -81.4, w: 623.6, h: 674.8, legs: false },
  blink: { file: 'kiwi-act-blink.webp?v=v29.25.1-44a30f8', n: 74, cols: 8, fps: 15, fw: 266, fh: 175, ox: 68.3, oy: 149.0, w: 531.2, h: 350.6 },   // 숨 고르기 — 눈을 지그시 감았다 뜸 (rest 1차 영상)
  sniff: { file: 'kiwi-act-sniff.webp?v=v29.25.1-44a30f8', n: 67, cols: 8, fps: 15, fw: 316, fh: 184, ox: 79.6, oy: 156.1, w: 632.2, h: 367.6 },   // 킁킁 — 부리 끝을 땅에 대고 냄새
  probe: { file: 'kiwi-act-probe.webp?v=v29.25.1-44a30f8', n: 72, cols: 8, fps: 15, fw: 268, fh: 206, ox: 79.6, oy: 157.5, w: 536.9, h: 411.7 },   // 땅 파기 — 부리를 깊이 꽂았다 빼기
  lookaround: { file: 'kiwi-act-lookaround.webp?v=v29.25.1-44a30f8', n: 69, cols: 8, fps: 15, fw: 266, fh: 202, ox: 81.1, oy: 89.2, w: 531.2, h: 403.2 },   // 두리번 — 뒤돌아보고 정면도 한 번
  brace: { file: 'kiwi-act-brace.webp?v=v29.25.1-44a30f8', n: 72, cols: 8, fps: 15, fw: 282, fh: 186, ox: 81.1, oy: 126.2, w: 563.9, h: 371.9 },   // 바람 버티기 — 몸을 낮춰 바람 쪽으로 (SOLO=1 로 바람 줄기 걷어 냄)
  sneeze: { file: 'kiwi-act-sneeze.webp?v=v29.25.1-44a30f8', n: 45, cols: 8, fps: 15, fw: 286, fh: 241, ox: 79.6, oy: 58.0, w: 572.4, h: 482.8 },   // 재채기
  // 변형: variantOf 가 있으면 그 동작이 나올 때 무작위로 함께 고른다 (같은 상황·같은 사건, 모습만 다르게)
  sneezeB: { file: 'kiwi-act-sneeze-b.webp?v=v29.25.1-44a30f8', n: 58, cols: 8, fps: 15, fw: 295, fh: 259, ox: 81.1, oy: -11.7, w: 590.9, h: 518.4, variantOf: 'sneeze' },   // 재채기 뒤 눈이 동그래지고 입이 벌어지는 놀란 얼굴
  braceB: { file: 'kiwi-act-brace-b.webp?v=v29.25.1-44a30f8', n: 59, cols: 8, fps: 15, fw: 344, fh: 190, ox: -54.0, oy: 131.9, w: 687.6, h: 379.0, variantOf: 'brace' },   // 센 돌풍 — 깃털이 크게 날림
  // preen(깃털 고르기)은 뺌 — 목이 너무 길어짐(사용자 지적), 다시 뽑은 4편도 확대·배경 바뀜으로 실패 (후보는 _apps/kiwi-motion-lab)
  // v28.6 — 기존 동작과 겹치지 않는 것만 (인사≈꾸벅·안도의 숨≈앉아 쉬기·딸꾹≈깜짝·킥킥≈통통은 뺌, 후보는 stock/acts/hold)
  wiggle: { file: 'kiwi-act-wiggle.webp?v=v29.25.1-44a30f8', n: 68, cols: 8, fps: 15, fw: 287, fh: 179, ox: 71.1, oy: 137.6, w: 573.9, h: 357.7 },   // 살랑 춤 — 머리를 앞뒤로 까딱 리듬
  proud: { file: 'kiwi-act-proud.webp?v=v29.25.1-44a30f8', n: 71, cols: 8, fps: 15, fw: 338, fh: 338, ox: -8.5, oy: -139.7, w: 676.3, h: 676.3 },   // 뿌듯 — 풍선처럼 부풀며 부리를 하늘로
  hide: { file: 'kiwi-act-hide.webp?v=v29.25.1-44a30f8', n: 73, cols: 8, fps: 15, fw: 258, fh: 185, ox: 81.1, oy: 157.5, w: 515.6, h: 369.1 },   // 숨기 — 얼굴을 몸에 파묻어 털공 → 빼꼼
  wag: { file: 'kiwi-act-wag.webp?v=v29.25.1-44a30f8', n: 67, cols: 8, fps: 15, fw: 259, fh: 171, ox: 79.6, oy: 150.4, w: 518.4, h: 342.0 },   // 엉덩이 들썩 — 꼬리 없이 둥근 뒤가 푸딩처럼
  wobble: { file: 'kiwi-act-wobble.webp?v=v29.25.1-44a30f8', n: 71, cols: 8, fps: 15, fw: 276, fh: 231, ox: 59.7, oy: 45.2, w: 551.1, h: 461.5 },   // 오뚝이 — 뒤로 젖혔다 앞뒤로 흔들리며 잦아듦
  shake: { file: 'kiwi-act-shake.webp?v=v29.25.1-44a30f8', n: 58, cols: 8, fps: 15, fw: 270, fh: 182, ox: 59.7, oy: 129.1, w: 539.7, h: 364.8 },   // 빗물 털기 — 둥근 몸을 작게 흔듦 (Codex facility-rain shake-retry 영상, 빠른 털기 5편은 번져서 뺌)
};
//  legs: false = 그동안 코드 다리를 숨긴다 (몸이 바닥에서 뜨거나 주저앉는 동작)

// 멈춰 있을 때 고르는 동작 — 가중치는 상황(mood: night 0~1 · cold · wet · wind · petals(꽃잎·낙엽 바람) · fog 0~1)에 따라 바뀐다
//  lookup(하늘 보기)·startle(깜짝)·joy(기뻐하기)는 일이 있을 때 main.js 가 부른다 (별똥별·누름·집중 끝)
const WEIGHT = {
  stretch: m => 1,
  tilt: m => 1.2,
  nibble: m => 1.2,
  rest: m => 1 + m.night,
  blink: m => 1.2,
  back: m => 0.8,
  yawn: m => 0.4 + 1.6 * m.night,
  nod: m => 0.2 + 1.4 * m.night,
  shake: m => 0.3 + 3 * m.wet,
  shiver: m => (m.cold ? 2.5 : 0.1),
  lookup: m => 0.3 + 0.7 * m.night,
  // v27.2 — 킁킁·땅 파기는 먹이 찾기(밤에 더, 추우면 덜), 깃털 고르기는 비에, 바람 버티기는 센 바람에만, 재채기는 꽃잎·낙엽 바람과 안개에
  sniff: m => 1 + 0.6 * m.night,
  probe: m => (m.cold ? 0.3 : 0.9) + 0.5 * m.night,
  preen: m => 0.6 + 1.2 * m.wet,
  brace: m => 6 * Math.max(0, m.wind - 0.5),
  sneeze: m => 0.05 + 3 * m.petals + 1 * m.fog,
  lookaround: m => 0.7,
  // v28.6 — 춤·엉덩이 들썩은 낮에 더, 오뚝이는 바람에 더, 숨기는 밤·안개에 조금 더 (뿌듯은 집중 끝에 main.js 가 부른다)
  wiggle: m => 0.7 - 0.4 * m.night,
  wag: m => 0.7 - 0.3 * m.night,
  wobble: m => 0.4 + 1.5 * m.wind,
  hide: m => 0.4 + 0.4 * m.night + 0.6 * m.fog,
  proud: m => 0.15,
};
// v27.5 항해 중 배 위 키위(voyage-crew.webp 자세 6장) 동작 — 열쇠 = 자세 이름. ox·oy·w·h 는 그 자세 칸의 픽셀 좌표(칸 왼쪽 위가 0)
//  만들기: 자세 칸을 1024 초록 판에 1:1 로 놓고(작업장 voyage/offsets.txt) BX·BY 를 준 make-act.sh
//  voyage-scene.js 가 그 자세를 그릴 차례에 rest 초 쉬었다 한 번씩 되풀이한다 (키위마다 엇갈려서)
export const CREW_ACTS = {
  up: { file: 'kiwi-act-crew-up.webp?v=v29.25.1-44a30f8', n: 47, cols: 8, fps: 15, fw: 394, fh: 399, ox: -95.0, oy: -19.6, w: 787.2, h: 797.2, rest: 3 },   // 파도에 몸이 좌우로 기우뚱
  wave: { file: 'kiwi-act-crew-wave.webp?v=v29.25.1-44a30f8', n: 69, cols: 8, fps: 15, fw: 350, fh: 323, ox: -16.1, oy: -2.2, w: 699.0, h: 646.4, rest: 1.5 },   // 고래에게 날개 흔들며 짹
  sky: { file: 'kiwi-act-crew-sky.webp?v=v29.25.1-44a30f8', n: 55, cols: 8, fps: 15, fw: 371, fh: 475, ox: -3.9, oy: -168.0, w: 741.7, h: 950.8, rest: 2.5 },   // 별똥별 — 눈을 뜨고 따라봄
  sleep: { file: 'kiwi-act-crew-sleep.webp?v=v29.25.1-44a30f8', n: 23, cols: 8, fps: 15, fw: 362, fh: 305, ox: -5.2, oy: -16.1, w: 724.6, h: 610.8, rest: 1.2 },   // 뱃머리에서 조는 숨
};
// v28.12 배 위 동작 더 (2026-10-22, Kling 3.0 pro — 자세 칸을 1024 초록 판에 놓고 BX·BY make-act.sh) — 자세마다 CREW_ACTS 와 번갈아 고른다
//  깃털 부풀리기는 날개가 돋아 버림 (kiwi-motion-lab data/jobs.json)
export const CREW_MORE = {
  up: [
    { id: 'peek', file: 'kiwi-act-crew-peek.webp?v=v29.25.1-44a30f8', n: 66, cols: 8, fps: 15, fw: 417, fh: 389, ox: -5.4, oy: -5.2, w: 833.4, h: 778.7 },   // 뱃전 너머 물 들여다보기
    { id: 'yawn', file: 'kiwi-act-crew-yawn.webp?v=v29.25.1-44a30f8', n: 58, cols: 8, fps: 15, fw: 354, fh: 438, ox: -5.4, oy: -104.7, w: 709.0, h: 876.8 },   // 하품
    { id: 'hop', file: 'kiwi-act-crew-hop.webp?v=v29.25.1-44a30f8', n: 52, cols: 8, fps: 15, fw: 372, fh: 458, ox: -32.4, oy: -136.0, w: 743.1, h: 915.2 },   // 신나서 통통
    // v28.14 고개 좌우 보기 — 두 판을 무작위로(사용자 2026-10-24 "둘 다"): A = Codex 1차(crew-look), alt = Claude 2차 B(crew-look-v2/b, 얼굴 쪽으로 돌아 뒤통수가 안 솟음)
    { id: 'look', file: 'kiwi-act-crew-look.webp?v=v29.25.1-44a30f8', n: 57, cols: 8, fps: 15, fw: 325, fh: 401, ox: -8, oy: -26, w: 649, h: 801,
      alt: { id: 'lookB', file: 'kiwi-act-crew-look-b.webp?v=v29.25.1-44a30f8', n: 73, cols: 8, fps: 15, fw: 365, fh: 392, ox: -8, oy: -8, w: 729, h: 783 } },
  ],
  left: [
    { id: 'far', file: 'kiwi-act-crew-left-far.webp?v=v29.25.1-44a30f8', n: 47, cols: 8, fps: 15, fw: 442, fh: 308, ox: -14.6, oy: -8.4, w: 883.9, h: 615.1 },   // 멀리 실눈 뜨고 보기
    { id: 'peck', file: 'kiwi-act-crew-left-peck.webp?v=v29.25.1-44a30f8', n: 63, cols: 8, fps: 15, fw: 445, fh: 328, ox: -18.8, oy: -7.0, w: 889.6, h: 656.4 },   // 뱃바닥 콕콕
  ],
  right: [
    { id: 'far', file: 'kiwi-act-crew-right-far.webp?v=v29.25.1-44a30f8', n: 49, cols: 8, fps: 15, fw: 474, fh: 281, ox: -5.2, oy: -5.7, w: 947.2, h: 561.1 },
    { id: 'peck', file: 'kiwi-act-crew-right-peck.webp?v=v29.25.1-44a30f8', n: 49, cols: 8, fps: 15, fw: 450, fh: 312, ox: -5.2, oy: -2.9, w: 899.6, h: 623.6 },
  ],
};

// v27.6 기념사진 자세 — 프레임 번호(묶음 안). from 부터 재생해 셔터 순간에 hold 프레임에 멈춰 있게 (작업장 heads.json 으로 찾은 꼭짓점)
export const PHOTO_POSES = [
  { id: 'joy', hold: 55 },          // 가장 높이 뜬 순간
  { id: 'lookup', hold: 46 },       // 하늘로 고개를 가장 높이
  { id: 'tilt', hold: 14 },
  { id: 'stretch', hold: 37 },      // 가장 크게 뻗은 순간
  { id: 'startle', hold: 18 },      // 깃털이 부푼 채
  { id: 'yawn', hold: 40 },
  { id: 'lookaround', from: 40, hold: 52 },   // 카메라를 정면으로
];
// 쌍안경으로 오래 보면 그 키위가 알아채고 정면으로 쳐다본다 (두리번의 정면 구간 40~64 프레임)
export const GAZE = { id: 'lookaround', from: 40, hold: 52 };

// 이름 (테스트 탭 · 모션 작업장)
export const ACT_NAME = { stretch: '기지개', nibble: '콕콕', lookup: '하늘 보기', tilt: '갸웃', nod: '꾸벅', startle: '깜짝', back: '뒤돌기', shiver: '웅크림', yawn: '하품',
  rest: '앉아 쉬기', joy: '통통', blink: '숨 고르기', sniff: '킁킁', probe: '땅 파기', lookaround: '두리번', brace: '바람 버티기', sneeze: '재채기',
  braceB: '바람 버티기 B', sneezeB: '재채기 B', preen: '깃털 고르기', shake: '빗물 털기',
  wiggle: '살랑 춤', proud: '뿌듯', hide: '숨기', wag: '엉덩이 들썩', wobble: '오뚝이' };
export const WAKE_ACT = 'stretch';
// 동작 → 그 변형들 (kiwi.js act() 가 원래 것과 변형 중 무작위로 고른다)
export const VARIANTS = {};
for (const [id, a] of Object.entries(ACTS)) if (a.variantOf) (VARIANTS[a.variantOf] ??= []).push(id);

export function pickIdleAct(mood, rnd = Math.random) {
  const m = { night: 0, cold: false, wet: 0, wind: 0, petals: 0, fog: 0, ...mood };
  const ids = Object.keys(WEIGHT).filter(id => ACTS[id]);
  if (!ids.length) return null;
  const w = ids.map(id => Math.max(0, WEIGHT[id](m))), tot = w.reduce((a, b) => a + b, 0);
  let r = rnd() * tot;
  for (let i = 0; i < ids.length; i++) if ((r -= w[i]) <= 0) return ids[i];
  return ids[ids.length - 1];
}
