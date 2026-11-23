// beach3d/terrain-gfx.js — 지형 모듈: 돌과 모래의 성질을 맵마다 조절한다 (three.js·DOM 없이 값만 — 시험에서 그대로 부른다)
//  사용자 2026-11-23: "물 외에 돌같은 것들도 상호작용이 가능하도록 해변 돌 부분도 지형 모듈로 만들고 물 모듈이랑 같이 적용해보자."
//  워터 그래픽 모듈(water-gfx.js)과 짝이다. 물은 "물이 어떻게 보이나", 지형은 "물이 돌·모래와 만나 어떻게 되나".
//
//  돌은 그림(물 뺀 판)에 그려져 있고, 자리와 모양은 바위 가림막(<판>-rock.webp)에서 읽는다. 이 모듈이 하는 일:
//   · 돌 가장자리를 부드럽게 다시 얹는다 (가림막 해상도와 상관없이 — 계단진 가장자리가 안 보이게)
//   · 돌 둘레의 물: 얕아지고, 잔물결이 번지고, 거품 고리가 생기고, 그늘이 진다
//   · 물에 닿는 돌 아랫부분이 젖어 짙어지고, 물결이 부딪히면 물방울이 튄다
//   · 돌을 누르면 물이 튀고 파문이 번진다 (시험 페이지 — 게임에서는 게임이 누르기를 받는다)
//  쓰는 법은 물 모듈과 같다: terrainFor(맵) → beach.setTerrain(값), tuneTerrain(값, 배율).
//  값은 모두 "기본 대비 배율"이다. 1 = 그대로, 0 = 없음.

export const TERRAIN_DEFAULT = {
  // 돌
  rockHeight: 1,   // 돌이 수면 위로 솟는 높이 — 낮추면 큰 물결이 돌을 넘는다
  rockSoft: 1,     // 돌 가장자리의 부드러움
  rockFoam: 1,     // 돌 둘레 거품 고리
  rockRipple: 1,   // 돌에서 번지는 잔물결
  rockWet: 1,      // 물에 닿는 돌 아랫부분이 젖어 짙어지는 정도
  rockShadow: 1,   // 돌이 물에 드리우는 그늘
  rockSplash: 1,   // 돌에 부딪혀 튀는 물방울 (파티클)
  // 모래
  sandWet: 1,      // 젖은 모래가 짙어지는 정도
  sandMirror: 1,   // 젖은 모래에 하늘이 비치는 정도
};

// 바닥의 종류별 기본값 (기본과 다른 것만)
export const TERRAIN_KINDS = {
  sand: {},                                                                                   // 모래 해변
  rocky: { rockFoam: 1.4, rockSplash: 1.5, rockRipple: 1.2, rockWet: 1.2 },                    // 바위 많은 바닷가: 거품·물방울이 세다
  lakeshore: { rockFoam: 0.35, rockSplash: 0.2, rockRipple: 0.8, sandMirror: 1.3 },            // 호숫가: 잔잔, 젖은 모래가 거울 같다
  riverbank: { rockFoam: 0.6, rockSplash: 0.4, rockRipple: 1.1 },                              // 강가·개울: 물이 돌을 감아 돈다
  pond: { rockFoam: 0.08, rockSplash: 0, rockRipple: 0.6, rockShadow: 1.3, sandMirror: 1.4 },  // 연못: 고요, 그늘이 또렷
  mud: { rockFoam: 0, rockSplash: 0, rockRipple: 0.4, sandWet: 1.35, sandMirror: 0.6 },        // 늪·갯벌: 진흙은 짙게 젖고 덜 비친다
  ice: { rockFoam: 0.3, rockSplash: 0.2, rockWet: 0.4, sandWet: 0.5, sandMirror: 1.5 },        // 눈·얼음 물가: 덜 젖어 보이고 많이 비친다
};

// 맵 → 바닥의 종류 (+ 그 맵만의 덮어쓰기). 여기 없는 맵은 모래(sand)
export const TERRAIN_BY_MAP = {
  beach: { kind: 'sand' }, pinksand: { kind: 'sand' }, lagoon: { kind: 'sand', rockFoam: 0.7 }, 'shell-cove': { kind: 'sand' }, 'sand-point': { kind: 'sand' },
  'hydrangea-cove': { kind: 'sand', rockFoam: 0.8 }, 'lavender-sandbar': { kind: 'sand', rockFoam: 0.6 },
  pinecove: { kind: 'rocky' }, basalt: { kind: 'rocky', rockWet: 1.4 }, 'bamboo-bay': { kind: 'rocky', rockFoam: 1, rockSplash: 0.8 },
  fall: { kind: 'lakeshore' }, birch: { kind: 'lakeshore' }, hangang: { kind: 'lakeshore' },
  cherry: { kind: 'riverbank' }, sunflower: { kind: 'riverbank' }, tulip: { kind: 'riverbank', rockRipple: 0.6 }, ginkgo: { kind: 'riverbank' }, wisteria: { kind: 'riverbank' },
  lavender: { kind: 'riverbank' }, rainforest: { kind: 'riverbank' }, nz: { kind: 'riverbank', rockFoam: 0.8 }, bamboo: { kind: 'riverbank' }, canyon: { kind: 'riverbank' },
  maple: { kind: 'riverbank', rockFoam: 0.8 }, heather: { kind: 'riverbank' },
  lotus: { kind: 'pond' }, paddy: { kind: 'pond' }, hydrangea: { kind: 'pond' }, oasis: { kind: 'pond' }, savanna: { kind: 'pond', sandWet: 1.2 }, 'hot-spring': { kind: 'pond', rockWet: 1.3 },
  mangrove: { kind: 'mud' }, cypress: { kind: 'mud' },
  snow: { kind: 'ice' }, alpine: { kind: 'ice', rockWet: 0.7 }, glacier: { kind: 'ice' }, fjord: { kind: 'ice', rockFoam: 0.6, rockSplash: 0.5 },
};

const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export function mergeTerrain(...parts) {
  const out = { ...TERRAIN_DEFAULT };
  for (const p of parts) for (const [k, v] of Object.entries(p || {})) if (k in TERRAIN_DEFAULT && typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  return out;
}
export function terrainFor(mapId) {
  const m = TERRAIN_BY_MAP[mapId] || { kind: 'sand' };
  return { ...mergeTerrain(TERRAIN_KINDS[m.kind] || {}, m), kind: TERRAIN_KINDS[m.kind] ? m.kind : 'sand' };
}
export function terrainOfKind(kind) { return { ...mergeTerrain(TERRAIN_KINDS[kind] || {}), kind: TERRAIN_KINDS[kind] ? kind : 'sand' }; }
// 배율로 손보기 (범위는 0~3 으로 자른다)
export function tuneTerrain(base, mult = {}) {
  const out = mergeTerrain(base);
  for (const [k, v] of Object.entries(mult)) if (k in TERRAIN_DEFAULT && typeof v === 'number' && Number.isFinite(v)) out[k] = out[k] * v;
  for (const k of Object.keys(TERRAIN_DEFAULT)) out[k] = clampN(out[k], 0, 3);
  if (base && base.kind) out.kind = base.kind;
  return out;
}
export const TERRAIN_KIND_NAME = { sand: '모래 해변', rocky: '바위 바닷가', lakeshore: '호숫가', riverbank: '강가·개울', pond: '연못', mud: '늪·갯벌', ice: '눈·얼음 물가' };

// 바위 가림막(작은 격자의 밝기 0~255)에서 "물에 잠긴 돌의 가장자리" 점들을 고른다 — 물방울이 튀는 자리
//  data = 한 줄씩 늘어놓은 밝기, gw·gh = 격자 크기, inWater(gx, gy) = 그 칸이 물 쪽인가. 돌려주는 것: [[gx, gy], …] (최대 max 개)
export function rockEdgePoints(data, gw, gh, inWater, max = 240) {
  const pts = [];
  for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
    const v = data[y * gw + x];
    if (v < 96 || v > 176) continue;   // 가장자리 띠만
    if (inWater(x, y)) pts.push([x, y]);
  }
  if (pts.length <= max) return pts;
  const step = pts.length / max, out = [];
  for (let i = 0; i < max; i++) out.push(pts[Math.floor(i * step)]);
  return out;
}
