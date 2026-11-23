// beach3d/shaders.js — 그리는 식 셋: ① 젖음·거품 기억 ② 물 합성 ③ 입체 판
//  모두 "그림 좌표"(해변 그림의 픽셀, 왼쪽 위가 0,0)에서 계산한다. 모래 높이·물 높이 식은 model.js 의 BEACH_GLSL.
//  색은 그림의 값을 그대로 쓴다(색 공간 변환·톤 매핑 없음 — 그린 색이 바뀌지 않게, beach3d.js 의 렌더러 설정과 짝).
import { BEACH_GLSL, M } from './model.js?v=v30.39.0-0299996';

const f = (v) => { const s = String(v); return s.includes('.') ? s : s + '.'; };

// 화면을 덮는 사각형 (FullScreenQuad 용)
export const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// 바닥 층의 모래 그림: 시간대 그림 세 장(낮 · 새벽/노을 · 밤)을 2D 게임과 같은 가중치로 섞는다 — 시각이 바뀌어도 뚝 끊기지 않는다
export const SAND_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uDryD;
  uniform sampler2D uDryW;
  uniform sampler2D uDryN;
  uniform float uArtW;
  uniform float uArtN;
  void main() { gl_FragColor = vec4(mix(mix(texture(uDryD, vUv).rgb, texture(uDryW, vUv).rgb, uArtW), texture(uDryN, vUv).rgb, uArtN), 1.); }
`;

// ①·② 젖음·거품의 기억과 물 그리기는 water/ 로 옮겼다 (2026-11-23 새 구조): water/flow.js 흐름 · water/foam.js 거품의 기억 · water/shade.js 물 그리기
export { FOAM_SIM_FRAG as SIM_FRAG } from './water/foam.js?v=v30.39.0-0299996';
export { WATER_FRAG } from './water/shade.js?v=v30.39.0-0299996';

// ③ 입체 판: 합성한 그림을 입힌 판이 모래·바위·물 높이만큼 실제로 솟는다 (비스듬히 보면 입체가 보인다)
export const RELIEF_VERT = /* glsl */ `
  varying vec2 vUv;
  uniform float uRelief;   // 높이 1h 가 몇 칸 솟는가 (월드 단위)
  ${BEACH_GLSL}
  void main() {
    vUv = uv;
    vec2 P = vec2(uv.x, 1. - uv.y) * uPlate;
    float h = max(terrainH(P), waterH(P, uT));
    vec3 p = position; p.z += h * uRelief;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
export const RELIEF_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uComp;
  void main() { gl_FragColor = vec4(texture(uComp, vUv).rgb, 1.); }
`;

// 물 파티클 (물방울 · 빛 알갱이 · 김): 둥글고 가장자리가 부드러운 점. 크기는 월드 단위 → 화면 px
export const PARTICLE_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;
  uniform float uScale;   // 화면 높이(px) / (2 × tan(시야각 / 2))
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(1., aSize * uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
export const PARTICLE_FRAG = /* glsl */ `
  varying float vAlpha;
  uniform vec3 uColor;
  void main() {
    float d = length(gl_PointCoord - .5) * 2.;
    float a = exp(-d * d * 3.4) * vAlpha;   // 가운데서 가장자리로 부드럽게 옅어진다 (또렷한 원반은 픽셀 점처럼 보였다)
    if (a < .004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;
