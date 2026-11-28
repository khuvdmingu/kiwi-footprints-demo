// diorama/ground.js — 해변 디오라마의 처음 땅 모양 (JS 와 GLSL 이 같은 식). three.js·DOM 없음
//  사용자 2026-11-24: 해변 샌드박스 게임 영상 네 편을 보내며 "딱 이느낌을 원해" → "시험적으로 해볼까?"
//  그림 판 위에 물을 덧입히던 방식(src/beach3d)과 달리, 여기서는 모래가 처음부터 높이를 가진다.
//  물은 그 높이 위를 흐르고(sim.js), 모래를 깎아 나르며, 키위가 판 글씨 홈을 메운다.
//
//  좌표: 세계 x(가로) · z(앞뒤, +z 가 화면 아래 = 바다) · y(높이, 0 = 잔잔한 바다 수면). 한 변 SIZE 칸.

export const SIZE = 40;          // 디오라마 한 변 (세계 단위)
export const N = 256;            // 시뮬레이션 격자 한 변 (칸)
export const CELL = SIZE / N;    // 한 칸 크기
export const SEA_Z = 15.5;       // 이 줄보다 앞(바다 쪽)은 파도가 물 높이를 정한다 (바다에서 밀려오는 물결의 근원)

export const G = {
  slope: 0.055,   // 물가 경사 (세계 단위당 높이)
  deep: -1.9,     // 바다 바닥 가장 깊은 곳
  dune: 0.75,     // 뒤쪽 둔덕 높이
  shore: 2.4,     // 물가선이 지나는 z (가운데)
};

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// 물가선이 굽이치는 모양 — 곧은 줄이면 장난감 같다
export function shoreZ(x) { return G.shore + 2.4 * Math.sin(x * 0.14 + 0.4) + 0.9 * Math.sin(x * 0.37 + 1.3); }

// 처음 모래 높이
export function groundH(x, z) {
  let h = Math.max(-(z - shoreZ(x)) * G.slope, G.deep);
  h += G.dune * sstep(-8, -18, z);                                       // 뒤쪽 둔덕
  h += 0.05 * Math.sin(x * 0.9 + z * 0.4) * Math.sin(z * 0.7 - x * 0.3); // 잔 기복
  h += 0.18 * sstep(9, 3, Math.hypot(x + 11, z - 7.5));                 // 물속 모래톱 하나 (파도가 부서지는 자리)
  return h;
}

const f = v => (Number.isInteger(v) ? v + '.' : String(v));
export const GROUND_GLSL = /* glsl */`
  #define SIZE ${f(SIZE)}
  #define CELL ${f(CELL)}
  #define SEA_Z ${f(SEA_Z)}
  float shoreZ(float x) { return ${f(G.shore)} + 2.4 * sin(x * .14 + .4) + .9 * sin(x * .37 + 1.3); }
  float groundH(vec2 p) {
    float h = max(-(p.y - shoreZ(p.x)) * ${f(G.slope)}, ${f(G.deep)});
    h += ${f(G.dune)} * (1. - smoothstep(-18., -8., p.y));
    h += .05 * sin(p.x * .9 + p.y * .4) * sin(p.y * .7 - p.x * .3);
    h += .18 * (1. - smoothstep(3., 9., length(vec2(p.x + 11., p.y - 7.5))));
    return h;
  }
  vec2 toUv(vec2 p) { return (p + SIZE * .5) / SIZE; }
  vec2 toXZ(vec2 uv) { return uv * SIZE - SIZE * .5; }
`;
