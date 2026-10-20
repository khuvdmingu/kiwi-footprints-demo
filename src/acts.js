// acts.js — 키위 동작 그림 (v27)
//
//  동작마다 짧은 영상을 Higgsfield(Kling 3.0, 시작·끝 프레임 = assets/kiwi.webp)로 만들고
//  tools/make-act.sh 가 움직이는 구간만 잘라 한 장 묶음(assets/kiwi-act-<id>.webp)으로 만든다.
//  처음·끝 프레임이 몸 그림과 같아서 걷기·멈춤과 이음새 없이 이어진다. 다리는 그대로 코드가 그린다.
//  ox·oy·w·h = 그 프레임이 kiwi.webp 픽셀 좌표에서 차지하는 상자 (kiwi.js 가 몸 그림과 같은 자리 맞춤에 얹는다).
//  옷 입은 키위는 아직 동작하지 않는다 (옷이 몸째 그린 그림이라서 — 얹는 액세서리로 바꾸면 함께 움직인다).

export const ACTS = {
  stretch: { file: 'kiwi-act-stretch.webp?v=v27.2.1', n: 53, cols: 8, fps: 15, fw: 334, fh: 293, ox: 25.6, oy: -87.1, w: 667.7, h: 585.2 },
  nibble: { file: 'kiwi-act-nibble.webp?v=v27.2.1', n: 69, cols: 8, fps: 15, fw: 271, fh: 191, ox: 81.1, oy: 141.9, w: 541.2, h: 381.9 },
  lookup: { file: 'kiwi-act-lookup.webp?v=v27.2.1', n: 71, cols: 8, fps: 15, fw: 266, fh: 204, ox: 81.1, oy: 83.6, w: 532.6, h: 408.9 },
  tilt: { file: 'kiwi-act-tilt.webp?v=v27.2.1', n: 41, cols: 8, fps: 15, fw: 258, fh: 167, ox: 81.1, oy: 157.5, w: 517.0, h: 334.9 },
  nod: { file: 'kiwi-act-nod.webp?v=v27.2.1', n: 58, cols: 8, fps: 15, fw: 258, fh: 201, ox: 81.1, oy: 157.5, w: 517.0, h: 401.8 },
  startle: { file: 'kiwi-act-startle.webp?v=v27.2.1', n: 49, cols: 8, fps: 15, fw: 278, fh: 224, ox: 55.5, oy: 55.1, w: 555.4, h: 447.3 },
  back: { file: 'kiwi-act-back.webp?v=v27.2.1', n: 75, cols: 8, fps: 15, fw: 284, fh: 199, ox: 78.2, oy: 100.6, w: 568.2, h: 397.5 },
  shiver: { file: 'kiwi-act-shiver.webp?v=v27.2.1', n: 60, cols: 8, fps: 15, fw: 287, fh: 173, ox: 79.6, oy: 156.1, w: 573.9, h: 346.3 },
  yawn: { file: 'kiwi-act-yawn.webp?v=v27.2.1', n: 55, cols: 8, fps: 15, fw: 270, fh: 185, ox: 81.1, oy: 123.4, w: 539.7, h: 369.1 },
  rest: { file: 'kiwi-act-rest.webp?v=v27.2.1', n: 85, cols: 8, fps: 15, fw: 286, fh: 170, ox: 81.1, oy: 157.5, w: 571.0, h: 339.2, legs: false },
  joy: { file: 'kiwi-act-joy.webp?v=v27.2.1', n: 69, cols: 8, fps: 15, fw: 312, fh: 337, ox: 56.9, oy: -81.4, w: 623.6, h: 674.8, legs: false },
  blink: { file: 'kiwi-act-blink.webp?v=v27.2.1', n: 74, cols: 8, fps: 15, fw: 266, fh: 175, ox: 68.3, oy: 149.0, w: 531.2, h: 350.6 },   // 숨 고르기 — 눈을 지그시 감았다 뜸 (rest 1차 영상)
  sniff: { file: 'kiwi-act-sniff.webp?v=v27.2.1', n: 67, cols: 8, fps: 15, fw: 316, fh: 184, ox: 79.6, oy: 156.1, w: 632.2, h: 367.6 },   // 킁킁 — 부리 끝을 땅에 대고 냄새
  probe: { file: 'kiwi-act-probe.webp?v=v27.2.1', n: 72, cols: 8, fps: 15, fw: 268, fh: 206, ox: 79.6, oy: 157.5, w: 536.9, h: 411.7 },   // 땅 파기 — 부리를 깊이 꽂았다 빼기
  lookaround: { file: 'kiwi-act-lookaround.webp?v=v27.2.1', n: 69, cols: 8, fps: 15, fw: 266, fh: 202, ox: 81.1, oy: 89.2, w: 531.2, h: 403.2 },   // 두리번 — 뒤돌아보고 정면도 한 번
  brace: { file: 'kiwi-act-brace.webp?v=v27.2.1', n: 72, cols: 8, fps: 15, fw: 282, fh: 186, ox: 81.1, oy: 126.2, w: 563.9, h: 371.9 },   // 바람 버티기 — 몸을 낮춰 바람 쪽으로 (SOLO=1 로 바람 줄기 걷어 냄)
  sneeze: { file: 'kiwi-act-sneeze.webp?v=v27.2.1', n: 45, cols: 8, fps: 15, fw: 286, fh: 241, ox: 79.6, oy: 58.0, w: 572.4, h: 482.8 },   // 재채기
  // preen(깃털 고르기)은 뺌 — 목이 너무 길어짐(사용자 지적), 다시 뽑은 4편도 확대·배경 바뀜으로 실패 (후보는 _apps/kiwi-motion-lab)
  // shake 는 보류 — 빠른 털 끝이 초록 배경과 섞여 분홍·노랑으로 번진다 (후보는 _apps/kiwi-motion-lab)
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
};
export const WAKE_ACT = 'stretch';

export function pickIdleAct(mood, rnd = Math.random) {
  const m = { night: 0, cold: false, wet: 0, wind: 0, petals: 0, fog: 0, ...mood };
  const ids = Object.keys(WEIGHT).filter(id => ACTS[id]);
  if (!ids.length) return null;
  const w = ids.map(id => Math.max(0, WEIGHT[id](m))), tot = w.reduce((a, b) => a + b, 0);
  let r = rnd() * tot;
  for (let i = 0; i < ids.length; i++) if ((r -= w[i]) <= 0) return ids[i];
  return ids[ids.length - 1];
}
