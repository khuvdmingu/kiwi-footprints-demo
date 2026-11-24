// beach3d/water/layers.js — 물을 겹(레이어)으로 나눈다: 겹마다 켜고 끄며 하나씩 맞춘다 (three.js·DOM 없이 값만)
//  사용자 2026-11-23: "레이어를 한번에 해결하려고 하지 않고, 나눠서 한다면?" → "어 나눠서 만들도록하고,
//  바위에 부딫치는 물까지 고려해야하니 바위까지도 만들자."
//
//  모든 겹을 끄면 원래 일러스트 그대로다 (모래 판 + 그려진 바다 판을 그려진 물가선에서 잇고, 바위는 가림막으로 얹음).
//  겹을 하나씩 켜며 2D 와 나란히 보고, 마음에 들어야 다음 겹으로 간다. 셰이더에는 uL[0..7] 로 넘긴다 (0 끔 ~ 1 켬).
export const LAYERS = [
  { key: 'shore', name: '물가선', desc: '물가선이 오르내리고 물이 모래 위로 올라온다' },
  { key: 'clear', name: '투명도', desc: '얕은 물에 바닥이 비치고 깊어질수록 물빛이 짙어진다' },
  { key: 'wet', name: '젖은 모래', desc: '물이 닿은 모래가 짙어지고 번들거리다 마른다' },
  { key: 'wave', name: '물결', desc: '너울·잔물결과 그에 따른 굴절(물속이 일렁임)' },
  { key: 'light', name: '빛', desc: '하늘 비침 · 빛길 · 반짝임 · 바닥의 빛 그물' },
  { key: 'foam', name: '거품', desc: '물가·물마루에서 생겨 흐름에 실려 다니는 거품' },
  { key: 'rock', name: '바위', desc: '바위가 물 위로 솟아 물이 감싸고, 부딪혀 거품·잔물결·그늘·젖은 띠·물방울' },
  { key: 'particles', name: '파티클', desc: '거품 알갱이 · 빛 알갱이 · 김' },
];
export const LAYER_INDEX = Object.fromEntries(LAYERS.map((l, i) => [l.key, i]));
export const ALL_ON = LAYERS.map(() => 1);

// 'all' · 'none' · '0' · 'shore,clear' · 'all-foam' (모두 켜고 거품만 끔) → [0|1 × 8]
export function parseLayers(str) {
  if (str == null || str === '' || str === 'all') return ALL_ON.slice();
  if (str === 'none' || str === '0') return LAYERS.map(() => 0);
  const out = str.startsWith('all-') ? ALL_ON.slice() : LAYERS.map(() => 0);
  const on = !str.startsWith('all-');
  for (const k of (on ? str : str.slice(4)).split(/[,+ ]+/)) if (k in LAYER_INDEX) out[LAYER_INDEX[k]] = on ? 1 : 0;
  return out;
}
export function layersToString(arr) {
  const on = LAYERS.filter((l, i) => arr[i] > 0.5).map(l => l.key);
  return on.length === LAYERS.length ? 'all' : on.length ? on.join(',') : 'none';
}
