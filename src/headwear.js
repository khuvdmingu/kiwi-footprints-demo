// headwear.js — v28.7 머리에 얹는 장식 (옷 입은 키위도 동작하게)
//
//  v10~v13 의 머리 장식 옷은 키위 몸째 그린 그림(kiwi-hat.webp 등)이라 동작 묶음을 재생할 수 없었다.
//  이제 같은 옷을 "장식만" 그린 그림(Higgsfield, 2026-10-22)으로 몸 그림·동작 프레임 위에 얹고,
//  동작 중에는 머리 기준점(act-heads.js)을 따라 옮기고 돌린다. 몸째 그린 옷 그림은 모은 것 카드에만 쓴다.
//  x·y·w·h = 쉬는 키위(kiwi.webp 640 픽셀)에서의 자리 — 만든 곳: kiwi-motion-lab tools/heads-sheet.mjs → assets/heads/place.json
//  몸을 감싸는 옷(목도리·스웨터·담요·조끼·배낭·목걸이·펜던트)은 아직 몸째 그린 그림 그대로라 동작하지 않는다.

export const HEADWEAR = {
  hat: { file: 'head-hat.webp?v=v29.4.0', x: 220.8, y: 130, w: 360, h: 280.9 },
  crown: { file: 'head-crown.webp?v=v29.4.0', x: 314, y: 154.9, w: 172, h: 107.5 },
  glasses: { file: 'head-glasses.webp?v=v29.4.0', x: 324.9, y: 241.9, w: 96, h: 46.1 },
  beanie: { file: 'head-beanie.webp?v=v29.4.0', x: 318, y: 61.7, w: 168, h: 189.5 },
  earmuffs: { file: 'head-earmuffs.webp?v=v29.4.0', x: 278.3, y: 137.2, w: 118, h: 214.5 },
  santa: { file: 'head-santa.webp?v=v29.4.0', x: 223.8, y: 68.2, w: 262, h: 212.2 },
  plume: { file: 'head-plume.webp?v=v29.4.0', x: 245, y: 78.9, w: 215, h: 208.4 },
  starpin: { file: 'head-starpin.webp?v=v29.4.0', x: 336.3, y: 190.9, w: 85, h: 48.2 },
  // v28.12 할로윈 (자리는 쉬는 키위에 겹쳐 보며 손으로)
  witch: { file: 'head-witch.webp?v=v29.4.0', x: 262, y: 70, w: 252, h: 191 },
  pumpkin: { file: 'head-pumpkin.webp?v=v29.4.0', x: 320, y: 100, w: 150, h: 141 },
  ghostpin: { file: 'head-ghostpin.webp?v=v29.4.0', x: 316, y: 178, w: 108, h: 68 },
  // v28.14 재고 옷 (자리는 작업장 assets/heads/place.json)
  hairpin: { file: 'head-hairpin.webp?v=v29.4.0', x: 336.1, y: 189.5, w: 95, h: 51 },
  sunglasses: { file: 'head-sunglasses.webp?v=v29.4.0', x: 304.8, y: 241.2, w: 120, h: 49.6 },
  // v28.15 행사 머리 장식 (자리는 쉬는 키위에 겹쳐 보며 손으로 — 그림이 앞모습에 가까워 옆으로 조금 눕혀 보이게 작게)
  antlers: { file: 'head-antlers.webp?v=v29.4.0', x: 315, y: 62, w: 150, h: 180 },
  knit: { file: 'head-knit.webp?v=v29.4.0', x: 316, y: 50, w: 160, h: 229 },
  holly: { file: 'head-holly.webp?v=v29.4.0', x: 330, y: 168, w: 95, h: 66 },
  starband: { file: 'head-starband.webp?v=v29.4.0', x: 335, y: 78, w: 120, h: 176 },
  bokgeon: { file: 'head-bokgeon.webp?v=v29.4.0', x: 300, y: 98, w: 170, h: 160 },
  melonpin: { file: 'head-melonpin.webp?v=v29.4.0', x: 338, y: 182, w: 80, h: 58 },
};

// 이 동작 동안은 장식을 흐리게 한다 — 머리를 몸에 파묻거나(hide) 몸이 1.5배로 부풀어(proud) 머리 따라가기로 못 맞춘다
export const HEADWEAR_FADE = new Set(['hide', 'proud']);
