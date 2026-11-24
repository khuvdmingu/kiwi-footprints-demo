// tokens.js — 디자인 토큰
//  v7 (2026-10-10): 사용자가 보낸 그림(docs/v7-reference.png) 기준 — 밝은 낮의 열대 해변.
//   연두~초록 덤불과 야자잎, 금빛 모래 위 잎 그림자, 면이 나뉜 회청색 바위, 청록에서 깊은 파랑으로 겹치는 바다, 하얀 레이스 거품.
//  색·빛·그림자·움직임은 여기서만 정한다. CSS 쪽 같은 값은 style.css :root 변수에 있다.

export const PAL = {
  sand: '#F4D08E', sandLight: '#F8DFA8', sandDeep: '#EBC27C', sandWet: '#DDB06E',
  sunset: '#E39A5A',
  // 숲: 그늘 → 바탕 → 빛 → 노란 빛
  leafDark: '#2E6A3C', leaf: '#4C8F3F', leafLight: '#7DB446', leafGlow: '#B9D45A', leafShade: '#235733',
  palm: '#86BD48', palmDark: '#5E9A3C',
  forest: '#24563A',
  // 바다: 물가 → 먼 바다
  seaShallow: '#5ED6C6', seaTeal: '#2CC0BF', sea: '#1FA2B6', seaMid: '#1B80AA', deep: '#1A5C91', deeper: '#174879',
  foam: '#FFFFFF', glint: '#FFFFFF',
  rockLight: '#9BA2B2', rock: '#737A8C', rockDark: '#525868', rockWet: '#2D5E6C',
  shell: '#F6E8DC', shellPink: '#F2C9C0', star: '#E8634D', starLight: '#F29A7E', pebble: '#B9B2A6',
  wood: '#8F6B4D', woodDark: '#6E5039',
  sprout: '#5DA44A', sproutLight: '#8CC85A',
  kiwi: '#8C5A35', kiwiLit: '#AE7A48', beak: '#E8972E', eye: '#1E140E',
  print: '#C99560', printDeep: '#AE7C47',
  shadow: '104,72,36',   // rgb — 모래 위 그림자는 따뜻한 갈색 (검정·남색 대신)
  // (v6 이름 호환)
  forestMid: '#2E6A3C', forestNear: '#4C8F3F', forestLit: '#7DB446', kiwiLit2: '#AE7A48',
};

// 해가 왼쪽 위 높지 않은 곳 → 그림자는 오른쪽 아래로 길게
export const LIGHT = { dir: [0.78, 0.62], shadowAlpha: 0.22, long: 1.0 };

// 완료 사진의 글씨: 밤에는 달빛에 드러난 밝은 모래 가장자리, 홈의 깊이는 유지.
export const PHOTO_PRINT = { edge: [255, 244, 216, 0.98], ridge: [236, 227, 197, 0.98], hole: [247, 236, 205, 0.98], shadow: [111, 135, 168, 0.85] };
// 야간 일반 글씨: 바닥별 깊은 홈. 산책/손님 자국에는 적용하지 않는다.
export const NIGHT_PRINT = {
  sand: [[27, 32, 49, 0.98], [11, 18, 34, 0.98], [23, 29, 43, 0.98], [9, 16, 30, 0.98]],
  snow: [[45, 61, 84, 1], [22, 37, 60, 1], [35, 51, 75, 1], [19, 33, 55, 1]],
  gravel: [[34, 37, 43, 0.98], [17, 22, 31, 0.98], [29, 33, 40, 0.98], [14, 19, 27, 0.98]],
  rim: [165, 182, 209, 0.45],
};

// 움직임: 느리고, 반복 주기가 서로 어긋나게
export const MOTION = { swayMin: 5.5, swayMax: 10, cloudDrift: 5, glintDrift: 3, gull: 26 };

export const LAYERS = ['plate(webgl: 그림 판·바다)', 'stage(canvas: 발자국·키위)', 'canopy(canvas: 그림에서 오린 숲 잎)', 'clouds(canvas)', 'tint', 'fx(canvas: 갈매기·날씨·♪)', 'glow', 'grain'];
