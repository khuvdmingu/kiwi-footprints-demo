// beach3d/water/flow.js — 물의 흐름: 물가선이 어디 있고, 얼마나 빨리 오르내리며, 그 둘레 물이 어느 쪽으로 움직이는가
//  사용자 2026-11-23: "물이 올라갈때 빛이나 파티클 모습도 어색해 … 아예 새로운 구조로 개편한다고 생각하고 레거시들에 너무 종속되지마."
//
//  앞 구조는 거품·빛·파티클이 저마다 "지금 물 깊이"만 보고 따로 그려졌다. 그래서 물이 올라올 때
//  거품 무늬는 제자리에 서 있고(움직이는 구멍으로 멈춘 무늬를 보는 꼴), 물방울은 위로 튀고, 얇은 물막에도 깊은 물의 반짝임이 얹혔다.
//  새 구조는 "흐름"을 먼저 세운다: 물가선의 자리(edgeNow)와 빠르기(runSpeed) → 물의 속도(flowVel).
//  거품은 이 흐름에 실려 다니고(foam.js), 빛은 물막과 물결 이는 물을 가르고(shade.js), 파티클도 물가와 함께 오르내린다(layers/particles.js).
//  참고한 구조: 물결의 "위상" 하나에서 물마루 앞·꼬리·되밀림 거품을 나눠 그리는 방식(스타일 물 셰이더들), 흐름에 무늬를 싣는 flow map.
import { M } from '../model.js?v=pv-0c2d246';

const f = (v) => { const s = String(v); return s.includes('.') ? s : s + '.'; };

// 물가에서 멀어질수록 철썩임을 덜 따른다 (rel = 지금 물가선에서 바다 쪽으로 몇 u). JS·GLSL 같은 식
export function surfK(rel) { return Math.exp(-Math.max(rel, 0) / M.SURF); }

// BEACH_GLSL 뒤에 붙인다
export const FLOW_GLSL = /* glsl */ `
  uniform float uDt;   // 앞 프레임과의 시간 차 (초)
  // 물 높이 → 물가선의 자리 (그려진 물가선에서 바다 쪽으로 몇 u — 뭍으로 올라오면 −). model.js 의 edgeD 와 같은 식
  float edgeFromH(float w) { return w >= 0. ? -w / ${f(M.SLOPE)} : (-1. + sqrt(1. + 4. * -w / ${f(M.SLOPE * M.DEEP)})) * .5 * ${f(M.DEEP)}; }
  float edgeNow(float px) { return uExt > .5 ? edgeExt(px) : edgeFromH(swash(px / uU, uT)); }
  float edgeWas(float px) { return uExt > .5 ? edgeExtPrev(px) : edgeFromH(swash(px / uU, uT - uDt)); }
  // 물가선이 올라오는 빠르기 (u/초, 뭍 쪽 +)
  float runSpeed(float px) { return clamp((edgeWas(px) - edgeNow(px)) / max(uDt, .004), -90., 90.); }
  float surfK(float rel) { return exp(-max(rel, 0.) / ${f(M.SURF)}); }
  // 물의 속도 (그림 px/초, y 는 바다 쪽이 +): 물가 가까이는 철썩임을 따라 오르내리고, 그 바깥은 뭍 쪽으로 천천히 밀리며, 물가를 따라 느리게 흐른다
  vec2 flowVel(vec2 P, float d) {
    float k = surfK(d - edgeNow(P.x));
    float along = (vnoise(P / uU / 70. + vec2(0., uT * .05)) - .5) * 7.;
    float inshore = 4. * (1. - k) * (1. - smoothstep(60., 160., d));
    return vec2(along, -(runSpeed(P.x) * k + inshore)) * uU;
  }
`;
