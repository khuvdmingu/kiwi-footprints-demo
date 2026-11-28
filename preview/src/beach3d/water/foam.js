// beach3d/water/foam.js — ① 젖음과 거품의 기억: 거품은 "생기는 자리"에서 생겨 물의 흐름에 실려 다니다 스러진다
//  한 장의 그림(앞 프레임 → 이번 프레임)에 네 가지를 담는다:
//   r 젖은 모래 (물이 닿으면 1, 천천히 마른다)
//   g 물가 거품 — 올라오는 물의 앞머리에서 생겨 물막에 실려 오르내리고, 물이 빠지면 모래에 남아(자국) 사라진다
//   b 물마루 거품 — 부서지는 물결에서 생겨 꼬리처럼 뒤에 남는다
//   a 돌 둘레 거품
//  세기(맵마다 다른 배율)는 여기서 곱하지 않는다 — 그릴 때(shade.js) 물·지형 모듈의 값을 곱한다.
import { M, BEACH_GLSL } from '../model.js?v=pv-d6ce35e';
import { FLOW_GLSL } from './flow.js?v=pv-d6ce35e';

const f = (v) => { const s = String(v); return s.includes('.') ? s : s + '.'; };

export const FOAM_SIM_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform float uRain;
  ${BEACH_GLSL}
  ${FLOW_GLSL}
  void main() {
    vec2 P = vec2(vUv.x, 1. - vUv.y) * uPlate, q = P / uU;
    float d = shoreD(P);
    float D = waterH(P, uT) - terrainH(P);
    //  물에 잠겼는가 — 칸 하나에 딱 끊기지 않게 두세 칸에 걸쳐 넘어간다 (끊기면 젖은 자리·거품의 가장자리가 계단진다)
    float under = smoothstep(-.05, .05, D), inW = smoothstep(0., .03, D);
    vec4 here = texture(uPrev, vUv);
    //  젖은 모래 (r): 앞에는 "물이 닿은 자리 = 1, 어디서나 같은 빠르기로 마름"이라 물이 올라갔던 선이 또렷한 띠로 남았다가 한꺼번에 옅어졌다
    //  (사용자 2026-11-23 "모래 젖는게 좀 어색해"). 이제는: 높이 올라간 자리부터 먼저 마르고(곳마다 조금씩 다르게), 가장자리는 모래에 스미듯 번지고,
    //  물가 바로 위는 늘 축축하다.
    float rise = clamp(-d / 40., 0., 1.6);   // 그려진 물가선에서 뭍 쪽으로 얼마나 올라왔나
    float dryRate = (.5 + 2.2 * rise) * (.7 + .6 * vnoise(q / 13. + 3.)) / ${f(M.DRY_SECS)};
    vec2 tx = 1.5 / vec2(textureSize(uPrev, 0));
    float around = (texture(uPrev, vUv + vec2(tx.x, 0.)).r + texture(uPrev, vUv - vec2(tx.x, 0.)).r + texture(uPrev, vUv + vec2(0., tx.y)).r + texture(uPrev, vUv - vec2(0., tx.y)).r) * .25;
    float damp = .5 * smoothstep(-24., -3., d);
    float wet = max(max(mix(here.r, around, .2) - uDt * dryRate, under), max(damp, uRain * .9));   // 비가 오면 모래 전체가 젖는다

    // 실어 나르기: 이 자리의 물은 조금 전 어디에 있었나 → 그 자리의 거품을 가져온다. 물 밖 모래의 거품은 제자리에 남는다
    vec2 vel = flowVel(P, d);
    vec4 from = texture(uPrev, vUv - vec2(vel.x, -vel.y) * uDt / uPlate);
    vec3 foam = mix(vec3(here.g, 0., 0.), from.gba, inW);
    foam.x *= exp(-uDt / mix(${f(M.LACE_SECS * 0.55)}, ${f(M.FOAM_SECS)}, inW));
    foam.yz *= exp(-uDt / vec2(${f(M.FOAM_SECS * 0.8)}, ${f(M.FOAM_SECS * 0.55)}));

    // 생기는 자리 — 무늬(pat)를 곱해 덩어리지게 낸다. 그 덩어리가 실려 다니며 늘어나고 흩어진다
    float pat = vnoise(q / 9. + vec2(uT * .06, 0.)) * .6 + vnoise(q / 5. + 7.) * .4;   // 기억 그림의 칸(약 2u)보다 넉넉히 굵게 — 잔무늬는 그릴 때 얹는다
    //  물가: 올라올 때 앞머리에서 많이, 빠질 때는 조금
    float up = clamp(runSpeed(P.x) / 28., 0., 1.);
    float band = (1. - smoothstep(0., .09 + .3 * up, D)) * under;
    foam.x = max(foam.x, band * (.4 + .6 * up) * smoothstep(.2, .65, pat + band * .55));
    //  물마루: 물결마다, 물가를 따라 군데군데만 부서진다 (n = 그 물결의 번호 — 물마루가 다가오는 동안 그대로다)
    float th = (d + swellBend(q.x) + swellWarp(P, uT)) / 22. + uT * 1.1;
    float n = floor((th - 1.5707963) / 6.2831853 + .5);
    float brk = smoothstep(.38, .62, vnoise(vec2(q.x / 70., n * 3.7)));
    float crest = smoothstep(.55, 1., sin(th)) * smoothstep(14., 40., d) * (1. - smoothstep(70., 150., d)) * brk * min(uSwell * 2.5, 1.) * inW;
    foam.y = max(foam.y, crest * smoothstep(.3, .75, pat + crest * .25));
    //  돌 둘레: 일었다 스러진다
    float near = rockNear(P);
    float ring = smoothstep(.3, .55, near) * (1. - rockAt(P)) * inW * smoothstep(.34, .72, pat + .2 * sin(uT * .9 + near * 7. + q.x / 37.));
    foam.z = max(foam.z, ring * .8);

    gl_FragColor = vec4(wet, foam);
  }
`;
