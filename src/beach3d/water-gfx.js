// beach3d/water-gfx.js — 워터 그래픽 모듈: 물의 성질을 맵마다 조절한다 (three.js·DOM 없이 값만 — 시험에서 그대로 부른다)
//  사용자 2026-11-23: "거품이나 파티클, 빛의 비침, 물의 투명도 등 물의 성질을 맵에 따라 조절 가능하도록 모듈 만들어놔줘. 워터 그래픽 모듈이라고 하자."
//
//  쓰는 법
//   · 맵의 물 성질 읽기:  waterFor('fall')            → 성질 값 한 벌 (종류 기본값 + 그 맵만의 덮어쓰기)
//   · 손으로 조절:        tuneWater(값, { foam: 0.5 }) → 배율을 곱한 새 값 (시험 페이지의 막대가 쓴다)
//   · 그리기에 넣기:      beach.setWater(값)           (beach3d.js — 해변 3D 가 셰이더·파티클에 반영)
//   · 새 맵을 더할 때:    WATER_BY_MAP 에 { kind: '종류', …덮어쓸 값 } 한 줄. 없으면 바다(sea).
//  값은 모두 "기본(바다) 대비 배율"이다. 1 = 그대로, 0 = 없음.

// 성질 하나하나의 뜻 (기본값 = 바다)
export const WATER_DEFAULT = {
  // 거품
  foam: 1,        // 물가 거품 띠
  crest: 1,       // 밀려오는 물마루 거품
  lace: 1,        // 물이 빠진 자리에 남는 거품 자국
  // 투명도·색
  clarity: 1,     // 맑기: 클수록 깊은 곳까지 바닥이 비친다 (0.3 흙탕 ~ 2 수정처럼 맑음)
  deep: 1,        // 그려진 물빛으로 넘어가는 빠르기: 클수록 얕은 데서부터 물빛이 짙다
  tint: [1, 1, 1],// 물 자체의 색 배율 (빨강, 초록, 파랑) — 늪은 초록, 빙하는 푸른 우윳빛
  refract: 1,     // 물결에 바닥이 일렁이는 정도
  caustics: 1,    // 얕은 물 바닥의 빛 그물
  // 빛의 비침
  shine: 1,       // 해·달 반사광 세기 (빛길·반짝임)
  sparkle: 1,     // 빛길 밖에서도 반짝이는 정도
  path: 1,        // 빛길의 폭: 클수록 넓게 퍼진다
  glow: 1,        // 빛길 안의 은은한 광택 (젖은 모래에 비치는 빛 포함)
  sky: 1,         // 수면에 하늘이 비치는 정도
  // 물결
  swell: 1,       // 먼 물에서 밀려오는 너울의 크기 (호수·연못은 잔잔하게)
  // 파티클
  particles: 'spray',   // 'spray' 물가에서 튀는 물방울 · 'motes' 물 위에 떠다니는 빛 알갱이 · 'steam' 김 · 'none'
  particleAmount: 1,    // 파티클 양
};

// 물의 종류별 기본값 (바다 대비 달라지는 것만 적는다)
export const WATER_KINDS = {
  sea: {},
  lagoon: { clarity: 1.9, deep: 0.6, caustics: 1.5, foam: 0.7, crest: 0.5, swell: 0.6, tint: [0.9, 1.08, 1.05], sparkle: 1.3 },   // 산호 석호: 아주 맑고 잔잔
  lake: { foam: 0.35, crest: 0, lace: 0.5, clarity: 1.2, swell: 0.35, caustics: 0.8, sky: 1.5, path: 1.3, particles: 'motes', particleAmount: 0.6 },   // 호수: 잔잔하고 하늘이 많이 비친다
  glacier: { foam: 0.25, crest: 0, lace: 0.4, clarity: 0.75, deep: 1.3, swell: 0.3, tint: [0.82, 1.02, 1.12], caustics: 0.5, sky: 1.6, shine: 1.2, particles: 'motes', particleAmount: 0.4 },   // 빙하 호수: 푸른 우윳빛
  river: { foam: 0.5, crest: 0.25, lace: 0.6, clarity: 0.9, swell: 0.5, sky: 1.2, particles: 'motes', particleAmount: 0.5 },   // 강: 넓고 느린 물
  stream: { foam: 0.6, crest: 0.15, lace: 0.5, clarity: 1.6, deep: 0.7, swell: 0.4, caustics: 1.4, refract: 1.3, sparkle: 1.4, particles: 'spray', particleAmount: 0.5 },   // 개울: 얕고 맑게 반짝
  pond: { foam: 0.1, crest: 0, lace: 0.2, clarity: 0.7, deep: 1.2, swell: 0.15, caustics: 0.5, refract: 0.6, sky: 1.7, shine: 0.8, particles: 'motes', particleAmount: 0.8 },   // 연못: 고요한 거울
  swamp: { foam: 0.05, crest: 0, lace: 0.1, clarity: 0.35, deep: 1.6, swell: 0.1, tint: [0.85, 1.0, 0.72], caustics: 0.15, refract: 0.4, sky: 1.3, shine: 0.6, sparkle: 0.4, particles: 'motes', particleAmount: 1 },   // 늪·갯벌: 탁한 초록빛
  hotspring: { foam: 0.2, crest: 0, lace: 0.3, clarity: 0.6, swell: 0.15, tint: [0.92, 1.04, 1.06], caustics: 0.4, sky: 1.2, particles: 'steam', particleAmount: 1 },   // 온천: 김이 오른다
};

// 맵 → 물의 종류 (+ 그 맵만의 덮어쓰기). 여기 없는 맵은 바다(sea)
export const WATER_BY_MAP = {
  beach: { kind: 'sea' }, pinecove: { kind: 'sea', foam: 1.15 }, pinksand: { kind: 'sea', clarity: 1.2 }, basalt: { kind: 'sea', foam: 1.3, clarity: 0.85 },
  'shell-cove': { kind: 'sea', swell: 0.7 }, 'sand-point': { kind: 'sea' }, 'hydrangea-cove': { kind: 'sea', swell: 0.7, foam: 0.8 }, 'bamboo-bay': { kind: 'sea', swell: 0.6, foam: 0.7 },
  lagoon: { kind: 'lagoon' }, fjord: { kind: 'glacier', clarity: 0.9, swell: 0.5, foam: 0.5 },
  fall: { kind: 'lake' }, birch: { kind: 'lake' }, alpine: { kind: 'lake', clarity: 1.6 }, snow: { kind: 'lake', clarity: 1.4 }, glacier: { kind: 'glacier' },
  cherry: { kind: 'river' }, sunflower: { kind: 'river' }, tulip: { kind: 'river', swell: 0.2 }, ginkgo: { kind: 'river' }, wisteria: { kind: 'river' },
  hangang: { kind: 'river', clarity: 0.7 }, rainforest: { kind: 'river', clarity: 0.6, tint: [0.9, 1.0, 0.82] }, lavender: { kind: 'river' }, 'lavender-sandbar': { kind: 'river', clarity: 1.2 },
  nz: { kind: 'stream' }, bamboo: { kind: 'stream' }, canyon: { kind: 'stream', tint: [1.06, 0.98, 0.9] }, maple: { kind: 'stream' }, heather: { kind: 'stream', clarity: 1.2 },
  lotus: { kind: 'pond' }, paddy: { kind: 'pond', clarity: 0.5 }, hydrangea: { kind: 'pond' }, oasis: { kind: 'pond', clarity: 1.3, tint: [0.9, 1.06, 1.0] }, savanna: { kind: 'pond', clarity: 0.4, tint: [1.05, 0.98, 0.82] },
  mangrove: { kind: 'swamp' }, cypress: { kind: 'swamp' },
  'hot-spring': { kind: 'hotspring' },
};

const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// 한 벌로 합친다 (뒤의 것이 덮어쓴다). kind 같은 설명용 값은 뺀다
export function mergeWater(...parts) {
  const out = { ...WATER_DEFAULT, tint: [...WATER_DEFAULT.tint] };
  for (const p of parts) for (const [k, v] of Object.entries(p || {})) { if (k === 'kind' || !(k in WATER_DEFAULT) || v == null) continue; out[k] = Array.isArray(v) ? [...v] : v; }
  return out;
}
// 그 맵의 물 성질
export function waterFor(mapId) {
  const m = WATER_BY_MAP[mapId] || { kind: 'sea' };
  return { ...mergeWater(WATER_KINDS[m.kind] || {}, m), kind: WATER_KINDS[m.kind] ? m.kind : 'sea' };
}
// 종류 이름으로 (시험 페이지의 「물 성질」 고르기)
export function waterOfKind(kind) { return { ...mergeWater(WATER_KINDS[kind] || {}), kind: WATER_KINDS[kind] ? kind : 'sea' }; }
// 배율로 손보기: 숫자 값에는 곱하고, 색(tint)·파티클 종류는 바꿔 끼운다. 결과는 안전한 범위로 자른다
export function tuneWater(base, mult = {}) {
  const out = mergeWater(base);
  for (const [k, v] of Object.entries(mult)) {
    if (!(k in WATER_DEFAULT) || v == null) continue;
    if (typeof WATER_DEFAULT[k] === 'number') out[k] = out[k] * v; else out[k] = Array.isArray(v) ? [...v] : v;
  }
  for (const k of Object.keys(WATER_DEFAULT)) if (typeof out[k] === 'number') out[k] = clampN(out[k], 0, k === 'clarity' ? 3 : 4);
  out.clarity = Math.max(0.15, out.clarity);   // 0 이면 색 흡수 식이 무한대가 된다
  if (base.kind) out.kind = base.kind;
  return out;
}
export const WATER_KIND_NAME = { sea: '바다', lagoon: '석호', lake: '호수', glacier: '빙하 호수', river: '강', stream: '개울', pond: '연못', swamp: '늪', hotspring: '온천' };
