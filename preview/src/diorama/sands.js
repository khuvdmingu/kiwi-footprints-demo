// diorama/sands.js — 갈아 끼우는 모래 색 · 물 색 (땅 모양·물 흐름은 그대로)
//  영상: 흰 모래 · 검은 화산 모래 · 감람석(초록) 모래 · 분홍 모래, 물 색 바꾸기 (사용자 2026-11-24 "딱 이느낌")
export const SANDS = {
  white:  { name: '흰 모래',     a: '#efe2c4', b: '#dfcca4', wet: [0.66, 0.62, 0.58], side: '#a88f6c' },
  gold:   { name: '금빛 모래',   a: '#ecca8e', b: '#d9ad6e', wet: [0.64, 0.58, 0.52], side: '#9c7448' },
  pink:   { name: '분홍 모래',   a: '#f2cfc2', b: '#e2aea0', wet: [0.7, 0.6, 0.6],    side: '#a87a6e' },
  black:  { name: '검은 화산 모래', a: '#565250', b: '#3c3937', wet: [0.62, 0.62, 0.64], side: '#2c2927' },
  olivine:{ name: '감람석 모래', a: '#97a36b', b: '#76814f', wet: [0.66, 0.68, 0.62], side: '#545c37' },
};
export const WATERS = {
  teal:    { name: '청록',     shallow: '#7fe0d2', deep: '#0f6f85' },
  tropic:  { name: '열대 바다', shallow: '#a4f0ff', deep: '#1767c4' },
  deep:    { name: '짙은 바다', shallow: '#6fbdb4', deep: '#0d4a5c' },
  lagoon:  { name: '석호',     shallow: '#c3f2d8', deep: '#3a9f8e' },
};
