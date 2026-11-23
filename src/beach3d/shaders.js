// beach3d/shaders.js — 그리는 식 셋: ① 젖음·거품 기억 ② 물 합성 ③ 입체 판
//  모두 "그림 좌표"(해변 그림의 픽셀, 왼쪽 위가 0,0)에서 계산한다. 모래 높이·물 높이 식은 model.js 의 BEACH_GLSL.
//  색은 그림의 값을 그대로 쓴다(색 공간 변환·톤 매핑 없음 — 그린 색이 바뀌지 않게, beach3d.js 의 렌더러 설정과 짝).
import { BEACH_GLSL, M } from './model.js?v=v30.37.0-65e8ff8';

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

// ① 젖음·거품 기억 (작은 버퍼를 번갈아 쓰며 앞 프레임 값을 이어 받는다)
//   r = 젖은 정도: 물에 잠기면 1, 물이 빠지면 DRY_SECS 에 걸쳐 마른다
//   g = 남은 거품: 물가 띠가 지나가면 채워지고 LACE_SECS 에 걸쳐 사라진다 → 물이 빠진 자리에 거품 자국이 남았다 스러진다
export const SIM_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform float uDt;
  uniform float uRain;
  ${BEACH_GLSL}
  void main() {
    vec2 P = vec2(vUv.x, 1. - vUv.y) * uPlate;
    float D = waterH(P, uT) - terrainH(P);
    vec4 prev = texture(uPrev, vUv);
    float under = step(0., D);
    float wet = max(max(prev.r - uDt / ${f(M.DRY_SECS)}, under), uRain * .9);   // 비가 오면 모래 전체가 젖는다
    float edge = (1. - smoothstep(0., .07, D)) * under;
    float lace = max(prev.g - uDt / ${f(M.LACE_SECS)}, edge * .95);
    gl_FragColor = vec4(wet, lace, 0., 1.);
  }
`;

// ② 물 합성: 바닥 층(모래 + 모래 위의 것)을 받아 물을 얹는다
export const WATER_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uGround;   // 바닥 층을 그린 그림 (모래 그림 + 발자국 등)
  uniform sampler2D uSeaD;     // 그려진 바다 (깊은 물의 색·물결 무늬) — 낮 · 따뜻한 판(새벽/노을) · 밤 세 장을 섞는다
  uniform sampler2D uSeaW;
  uniform sampler2D uSeaN;
  uniform float uArtW;         // 따뜻한 판 가중치
  uniform float uArtN;         // 밤 판 가중치
  uniform sampler2D uSim;      // ① 젖음·거품
  uniform vec3 uCam;           // 카메라 자리 (그림 x, 높이, 그림 y — px)
  uniform vec3 uSunDir;        // 빛이 오는 쪽 (x, 위, y)
  uniform vec3 uSunCol;
  uniform float uSpec;         // 반사광 세기
  uniform float uShine;        // 반짝임 하나하나의 또렷함 (클수록 작은 점)
  uniform float uPath;         // 빛길의 좁기 (클수록 좁다)
  uniform float uGlow;         // 빛길 안 은은한 광택
  uniform vec3 uSkyCol;        // 하늘빛 (물·젖은 모래에 비친다)
  uniform vec3 uWaterCol;      // 물 자체의 색 (얕은 물에 섞인다)
  uniform vec3 uFoamCol;
  uniform float uCaus;         // 빛 그물 세기 (낮에만)
  uniform int uDebug;          // 0 그림 · 1 물 깊이 · 2 젖음·거품
  uniform float uRain;         // 비 0~1
  uniform float uFog;          // 안개 0~1
  uniform vec3 uFogCol;
  ${BEACH_GLSL}

  // 잔물결의 기울기 (해석적 — 격자 없음)
  vec2 detailG(vec2 q, float t) {
    vec2 g = vec2(0.);
    g += .55 * cos(dot(q, vec2(.52, .85)) - t * 2.1) * vec2(.52, .85);
    g += .45 * cos(dot(q, vec2(-.9, .65)) - t * 2.6 + 1.7) * vec2(-.9, .65);
    g += .35 * cos(dot(q, vec2(1.28, -.38)) - t * 3.2 + .6) * vec2(1.28, -.38);
    g += .25 * cos(dot(q, vec2(.22, 1.7)) - t * 3.9 + 2.9) * vec2(.22, 1.7);
    return g;
  }
  // 빛 그물(커스틱): 서로 엇갈린 굽은 밝은 줄 두 벌
  float caustic(vec2 q, float t) {
    vec2 a = q / 9. + vec2(sin(q.y / 13. + t * .6), cos(q.x / 11. - t * .5)) * .9;
    vec2 b = q / 6.3 + vec2(cos(q.y / 8. - t * .7), sin(q.x / 9.5 + t * .55)) * .8 + 3.7;
    float n1 = pow(1. - abs(sin(a.x + sin(a.y))), 6.), n2 = pow(1. - abs(sin(b.y + sin(b.x))), 6.);
    return min(max(n1, n2) + n1 * n2, 1.3);
  }

  void main() {
    vec2 P = vec2(vUv.x, 1. - vUv.y) * uPlate;
    vec2 q = P / uU;
    float d = shoreD(P);
    float hT = terrainH(P), hW = waterH(P, uT), D = hW - hT;   // D = 물 깊이 (h)
    // 물 면의 기울기: 큰 물결(수치 미분) + 잔물결
    float e = 1.5 * uU;
    float hx = waterH(P + vec2(e, 0.), uT) - waterH(P - vec2(e, 0.), uT);
    float hy = waterH(P + vec2(0., e), uT) - waterH(P - vec2(0., e), uT);
    float wn = vnoise(q / 23. + vec2(uT * .03, 0.));
    //  Nb = 큰 물결만(굴절·빛길 자리) · N = 잔물결까지(반짝임). 잔물결을 굴절에 쓰면 그림이 빗금처럼 떨린다
    vec2 slopeB = vec2(hx, hy) / (2. * e) * uU * 26.;
    vec2 slope = slopeB + detailG(q + wn * 7., uT) * .3;
    vec3 Nb = normalize(vec3(-slopeB.x, 1., -slopeB.y)), N = normalize(vec3(-slope.x, 1., -slope.y));
    float inW = smoothstep(0., .025, D), wd = clamp(D, 0., 4.);
    float rock = rockAt(P);
    vec3 V = normalize(uCam - vec3(P.x, 0., P.y));
    vec3 Hh = normalize(uSunDir + V);
    float clear = (1. - .85 * uRain) * (1. - .7 * uFog);   // 비·안개만큼 빛길·빛 그물·반짝임이 줄어든다

    // 물 위 모래: 젖으면 짙어지고 하늘이 비친다 (마르면서 돌아온다)
    vec4 sim = texture(uSim, vUv);
    vec3 dry = texture(uGround, vUv).rgb;
    float wetK = sim.r * (1. - inW) * (1. - rock);
    vec3 sand = dry * mix(vec3(1.), vec3(.78, .76, .75), wetK);
    sand = mix(sand, uSkyCol, wetK * .16);
    float pathFlat = pow(max(Hh.y, 0.), uPath);   // 평평한 면(젖은 모래)에 맺히는 빛길
    sand += uSunCol * pathFlat * wetK * uGlow * 1.2 * clear;

    // 물 아래 바닥: 물결에 굴절돼 일렁이고, 얕은 곳엔 빛 그물, 깊어질수록 붉은빛부터 사라진다
    vec2 wob = (vec2(wn, vnoise(q / 19. - vec2(0., uT * .04))) - .5) * .25;   // 물속이 느리게 일렁임
    vec2 ro = (Nb.xz + wob) * min(wd, 1.5) * 10. * uU / uPlate;
    vec3 g = texture(uGround, vUv + vec2(ro.x, -ro.y)).rgb;
    g *= 1. + caustic(q + Nb.xz * 3., uT) * uCaus * clear * smoothstep(.02, .25, D) * exp(-wd * 1.1);
    vec3 tr = exp(-wd * vec3(1.7, .62, .42));
    vec3 shallow = g * tr + uWaterCol * (1. - tr.g) * .55;
    // 깊은 물: 그려진 바다 (물결 따라 살짝 일렁임)
    vec2 so = (Nb.xz + wob) * 6. * uU / uPlate;
    vec2 suv = vUv + vec2(so.x, -so.y);
    vec3 seaC = mix(mix(texture(uSeaD, suv).rgb, texture(uSeaW, suv).rgb, uArtW), texture(uSeaN, suv).rgb, uArtN);
    vec3 water = mix(shallow, seaC, 1. - exp(-wd * 1.5));
    // 하늘 비침 + 해·달 반사광 (잔물결마다 반짝)
    float F = .02 + .98 * pow(1. - max(dot(Nb, V), 0.), 5.);
    water = mix(water, uSkyCol, F * .5);
    //  빛길: 물 한가운데(빛이 되비치는 자리) 둘레에서만 잔물결마다 작게 반짝이고, 그 안에 은은한 광택
    float path = pow(max(dot(Nb, Hh), 0.), uPath);
    float glint = pow(max(dot(N, Hh), 0.), uShine);
    water += uSunCol * (glint * (.09 + 2.2 * path) * uSpec + path * uGlow) * clear;

    // 거품: 물가 띠 + 밀려오는 물마루
    float fn = vnoise(q / 3.1 + vec2(0., uT * .35)) * .6 + vnoise(q / 1.2 - vec2(uT * .2, 0.)) * .4;
    float edge = (1. - smoothstep(0., .11, D)) * inW;
    float crest = smoothstep(.78, 1., front(P, d, uT)) * smoothstep(6., 30., d) * (1. - smoothstep(70., 150., d)) * smoothstep(.42, .62, fn);
    float foam = clamp(edge * smoothstep(.2, .5, fn + edge * .45) + crest * .8, 0., 1.);
    water = mix(water, uFoamCol, foam);

    // 비: 물 위 곳곳에 빗방울 파문이 번갈아 퍼진다 (2D water.js 와 같은 방식 — 칸마다 하나, 저마다 다른 박자. 위에서 보므로 둥글다)
    if (uRain > 0.) {
      float rs = 30. * uU;
      for (int k = 0; k < 2; k++) {
        vec2 gp = P / rs + float(k) * vec2(.5, .37), gi = floor(gp);
        float h1 = hash21(gi + float(k) * 7.1), h2 = hash21(gi + 3.3 + float(k));
        vec2 c = (gi + .2 + .6 * vec2(h1, h2)) * rs - float(k) * vec2(.5, .37) * rs;
        float ph = fract(uT * (.55 + .4 * h1) + h2), r = ph * 11. * uU, dl = length(P - c);
        float ring = (1. - smoothstep(0., 1.3 * uU, abs(dl - r))) * (1. - ph) * step(.25, h1);
        float ring2 = (1. - smoothstep(0., uU, abs(dl - r * .55))) * (1. - ph) * .6 * step(.25, h1) * step(.3, ph);
        water += (ring + ring2) * .3 * uRain * uFoamCol;
      }
    }
    vec3 col = mix(sand, water, inW);
    // 물이 빠진 자리에 남은 거품 자국
    float lace = sim.g * (1. - inW) * (1. - rock) * smoothstep(.5, .68, fn);
    col = mix(col, uFoamCol, lace * .7);

    // 비 오는 날의 회청 톤 · 안개(천천히 흐르는 큰 무늬 두 겹, 물 쪽이 조금 더 짙다)
    if (uRain > 0.) col = mix(col, vec3(dot(col, vec3(.3, .59, .11))) * vec3(.9, .95, 1.02), .3 * uRain) * (1. - .12 * uRain);
    if (uFog > 0.) {
      float fz = vnoise(q / 90. + vec2(uT * .02, 0.)) * .6 + vnoise(q / 37. - vec2(uT * .035, uT * .01)) * .4;
      col = mix(col, uFogCol, uFog * clamp(.3 + .75 * fz + .2 * inW, 0., 1.) * .8);
    }
    if (uDebug == 1) col = D > 0. ? vec3(0., D * .35, .4 + D * .3) : vec3(.5 + D * .2);
    if (uDebug == 2) col = vec3(sim.r, sim.g, inW * .5);
    gl_FragColor = vec4(col, 1.);
  }
`;

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
