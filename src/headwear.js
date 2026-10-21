// headwear.js — v28.7 머리에 얹는 장식 (옷 입은 키위도 동작하게)
//
//  v10~v13 의 머리 장식 옷은 키위 몸째 그린 그림(kiwi-hat.webp 등)이라 동작 묶음을 재생할 수 없었다.
//  이제 같은 옷을 "장식만" 그린 그림(Higgsfield, 2026-10-22)으로 몸 그림·동작 프레임 위에 얹고,
//  동작 중에는 머리 기준점(act-heads.js)을 따라 옮기고 돌린다. 몸째 그린 옷 그림은 모은 것 카드에만 쓴다.
//  x·y·w·h = 쉬는 키위(kiwi.webp 640 픽셀)에서의 자리 — 만든 곳: kiwi-motion-lab tools/heads-sheet.mjs → assets/heads/place.json
//  몸을 감싸는 옷(목도리·스웨터·담요·조끼·배낭·목걸이·펜던트)은 아직 몸째 그린 그림 그대로라 동작하지 않는다.

export const HEADWEAR = {
  hat: { file: 'head-hat.webp?v=v28.7.0', x: 256.2, y: 126.9, w: 290, h: 226.3 },
  crown: { file: 'head-crown.webp?v=v28.7.0', x: 290, y: 134.7, w: 190, h: 118.8 },
  glasses: { file: 'head-glasses.webp?v=v28.7.0', x: 224.2, y: 224.6, w: 210, h: 101 },
  beanie: { file: 'head-beanie.webp?v=v28.7.0', x: 285, y: 20.4, w: 200, h: 225.6 },
  earmuffs: { file: 'head-earmuffs.webp?v=v28.7.0', x: 300.1, y: 98, w: 135, h: 245.3 },
  santa: { file: 'head-santa.webp?v=v28.7.0', x: 172.5, y: 40.1, w: 290, h: 234.9 },
  plume: { file: 'head-plume.webp?v=v28.7.0', x: 267, y: 69.8, w: 175, h: 169.6 },
  starpin: { file: 'head-starpin.webp?v=v28.7.0', x: 336.3, y: 190.9, w: 85, h: 48.2 },
};

// 이 동작 동안은 장식을 흐리게 한다 — 머리를 몸에 파묻거나(hide) 몸이 1.5배로 부풀어(proud) 머리 따라가기로 못 맞춘다
export const HEADWEAR_FADE = new Set(['hide', 'proud']);
