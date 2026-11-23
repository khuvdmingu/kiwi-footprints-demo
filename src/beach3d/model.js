// beach3d/model.js — 해변 모형: 모래 높이와 물 높이 (three.js 없이 계산만 — 시험에서 그대로 부른다)
//  사용자 2026-11-23: "해변가에서 물에 집중한 three js 한번 만들어봐 구조부터 아예 다시 세우는 브랜치로"
//
//  지금 2D 해변(water.js)은 "그려진 물가선을 위아래로 민다"는 화면 식이다. 여기서는 물리 모형으로 다시 세운다:
//   · 모래는 물가선에서 멀어질수록 뭍 쪽은 높고 바다 쪽은 깊은 비탈(sandH) + 물속 바위는 솟은 높이
//   · 물은 높이를 가진 면(waterH) = 철썩이는 물(swash) + 먼바다에서 밀려오는 너울(swell) + 누른 자리 파문(ripple)
//   · 물 깊이 = 물 높이 − 모래 높이. 깊이가 0인 곳이 물가선이고, 얕으면 모래가 비치고 깊으면 바다색이 된다
//  같은 식을 JS(물가선 위치 — 발자국 지우기·생물이 쓴다)와 GLSL(그리기)이 함께 쓴다. 상수는 M 한 곳에서.
//  단위: 가로·세로는 u(화면 짧은 변의 1/800, 게임과 같은 단위), 높이는 h(비탈 1h = 가로 50u).
//  JS 와 GLSL 의 값이 어긋나지 않게 물가선에 영향을 주는 식에는 해시 노이즈를 쓰지 않는다(사인만).

export const M = {
  SLOPE: 0.02,      // 모래 비탈 (h / u)
  DEEP: 300,        // 바다 쪽으로 갈수록 가팔라지는 정도 (u)
  ROCK: 0.8,        // 물속 바위 꼭대기 — 잔잔한 수면 위로 이만큼 솟는다 (h). 큰 물결은 바위 가장자리를 넘는다
  T_SWASH: 7.3,     // 철썩임 주기 (초) — 2D 해변 beach.js 의 큰 물결 주기와 같다
  SWASH_UP: 0.62,   // 철썩임이 올라오는 높이 (h) → 물가선이 약 26u 올라온다
  SWASH_REST: 0.1,  // 쉬는 동안 물가선이 그려진 물가선보다 조금 아래
  DRY_SECS: 16,     // 젖은 모래가 마르는 시간
  LACE_SECS: 4,     // 물러난 자리에 남은 거품이 사라지는 시간
  FOAM_SECS: 2.6,   // 물 위 거품이 스러지는 시간 (water/foam.js)
  SURF: 42,         // 물가에서 이만큼(u) 멀어지면 철썩임을 따르는 정도가 1/e 로 준다 (water/flow.js)
};

const TAU = Math.PI * 2;

// 모래 높이 (d = 물가선에서의 거리 u, 바다 쪽이 +)
export function sandH(d) { return d < 0 ? -d * M.SLOPE : -d * M.SLOPE * (1 + d / M.DEEP); }
// 바위가 있는 자리의 높이 (rock = 가림막 0~1): 바닥에서 수면 위 꼭대기까지 솟는다 → 바위 둘레는 물이 얕아져 거품이 인다
export function terrainH(d, rock = 0) { const s = sandH(d); return s + (Math.max(s, 0) + M.ROCK - s) * rock; }

// 철썩이는 물 높이 (xu = 가로 위치 u, t 초, amp 세기 0~2)
//  물가를 따라 도착 시각이 조금씩 다르고(한쪽부터 비스듬히 밀려옴) 물결마다 크기가 다르다
export function swash(xu, t, amp = 1) {
  const ph = t / M.T_SWASH + 0.16 * Math.sin(xu / 260 + 1.7) + 0.1 * Math.sin(xu / 97 + t * 0.05);
  const c = 0.5 - 0.5 * Math.cos(TAU * ph), lift = c * c * c;   // 오래 쉬다가 훅 올라왔다 빠진다
  const big = 0.74 + 0.26 * Math.sin(Math.floor(ph) * 2.399 + 0.6);
  return (lift * big * M.SWASH_UP - M.SWASH_REST) * amp;
}

// 너울: 물가선과 나란한 물마루가 뭍 쪽으로 다가온다 (물가에서는 0 — 물가선은 철썩임이 정한다)
export function swellFront(xu, d, t) {
  const bend = 16 * Math.sin(xu / 150 + 0.8) + 9 * Math.sin(xu / 61 + 2.9);
  return { bend, main: Math.sin((d + bend) / 22 + t * 1.1) };
}
export function swell(xu, d, t, amp = 1) {
  const { bend, main } = swellFront(xu, d, t);
  const a = smooth(0, 60, d) * amp;
  return a * (0.10 * main + 0.06 * Math.sin((d - bend * 0.6) / 13 + t * 1.6 + xu / 90) + 0.03 * Math.sin(d / 7 + t * 2.3 - xu / 40));
}
function smooth(a, b, x) { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); }

// 물가선: 그려진 물가선에서 얼마나 올라와(−) 있거나 내려가(+) 있는가 (u). 너울은 물가에서 0이라 철썩임만으로 푼다
export function edgeD(xu, t, amp = 1) {
  const w = swash(xu, t, amp);
  if (w >= 0) return -w / M.SLOPE;
  return (-1 + Math.sqrt(1 + 4 * -w / (M.SLOPE * M.DEEP))) / 2 * M.DEEP;
}

// 게임이 준 물가선 값을 16비트 두 바이트로 담는다 (d = u 단위, ±1000). out = Uint8Array(n*4)
export function packEdge(arr, out) {
  for (let i = 0; i < arr.length; i++) { const v = Math.round(Math.min(1, Math.max(0, arr[i] / 2000 + 0.5)) * 65535); out[i * 4] = v >> 8; out[i * 4 + 1] = v & 255; out[i * 4 + 3] = 255; }
  return out;
}

// 같은 식의 GLSL. uShore = 물가선(가로 800칸, 16비트로 나눠 담음) · uRock = 바위 가림막 · uPlate = 그림 크기(px) · uU = u 한 칸(px)
const f = (v) => { const s = String(v); return s.includes('.') ? s : s + '.'; };
export const BEACH_GLSL = /* glsl */ `
  uniform sampler2D uShore;
  uniform sampler2D uRock;      // 바위 가림막 (또렷한 판)
  uniform sampler2D uRockSoft;  // 바위 가림막을 넓게 번지게 한 판 — 돌 둘레(얕아짐·잔물결·거품 고리)
  uniform float uTRock;         // 돌이 솟는 높이 배율 (지형 모듈)
  uniform vec2 uPlate;
  uniform float uU;
  uniform float uT;
  uniform float uAmp;
  uniform float uSwell;   // 너울 크기 배율 (워터 그래픽 모듈 — 호수·연못은 잔잔하게)
  uniform vec4 uRip[6];   // 누른 자리 파문: (그림 x, 그림 y, 시작 시각, 세기)
  uniform sampler2D uEdge;   // 게임 연결: 게임이 정한 물가선 (그려진 물가선에서의 거리 u, 가로 128칸 · 16비트)
  uniform float uExt;        // 1 이면 철썩임 식 대신 uEdge 를 따른다
  uniform vec2 uEdgeX;       // uEdge 가 덮는 가로 범위 (그림 px)

  float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * f * (f * (f * 6. - 15.) + 10.);   // 5차 보간 — 칸 경계가 줄·네모로 드러나지 않게
    return mix(mix(hash21(i), hash21(i + vec2(1., 0.)), f.x), mix(hash21(i + vec2(0., 1.)), hash21(i + vec2(1., 1.)), f.x), f.y);
  }
  float shoreY(float px) {
    float fx = clamp(px / uPlate.x, 0., 1.) * 799.;
    float i = floor(fx);
    vec4 a = texelFetch(uShore, ivec2(int(i), 0), 0), b = texelFetch(uShore, ivec2(int(min(i + 1., 799.)), 0), 0);
    float ya = (a.r * 65280. + a.g * 255.) / 65535., yb = (b.r * 65280. + b.g * 255.) / 65535.;
    return mix(ya, yb, fx - i) * uPlate.y;
  }
  float shoreD(vec2 P) { return (P.y - shoreY(P.x)) / uU; }
  float rockRaw(vec2 P) { return texture(uRock, vec2(P.x / uPlate.x, 1. - P.y / uPlate.y)).r; }
  float rockAt(vec2 P) { return smoothstep(.36, .64, rockRaw(P)); }
  float rockNear(vec2 P) { return texture(uRockSoft, vec2(P.x / uPlate.x, 1. - P.y / uPlate.y)).r; }   // 0 멀다 ~ 1 돌 한가운데
  float sandH(float d) { return d < 0. ? -d * ${f(M.SLOPE)} : -d * ${f(M.SLOPE)} * (1. + d / ${f(M.DEEP)}); }
  float terrainH(vec2 P) {   // 돌 둘레는 바닥이 얕아지고(물이 감싸며 거품이 인다) 돌 자리는 수면 위로 솟는다
    float s = sandH(shoreD(P));
    s = mix(s, max(s, -.22), smoothstep(.12, .5, rockNear(P)));
    return mix(s, max(s, 0.) + ${f(M.ROCK)} * uTRock, rockAt(P));
  }
  float edgeRow(float px, int row) {   // row 0 = 지금 · 1 = 앞 프레임 (물가선의 빠르기를 구한다 — water/flow.js)
    float fx = clamp((px - uEdgeX.x) / max(uEdgeX.y - uEdgeX.x, 1.), 0., 1.) * 127.;
    float i = floor(fx);
    vec4 a = texelFetch(uEdge, ivec2(int(i), row), 0), b = texelFetch(uEdge, ivec2(int(min(i + 1., 127.)), row), 0);
    float da = (a.r * 65280. + a.g * 255.) / 65535., db = (b.r * 65280. + b.g * 255.) / 65535.;
    return (mix(da, db, fx - i) - .5) * 2000.;
  }
  float edgeExt(float px) { return edgeRow(px, 0); }
  float edgeExtPrev(float px) { return edgeRow(px, 1); }
  float swash(float xu, float t) {
    if (uExt > .5) return sandH(edgeExt(xu * uU));   // 물가선이 그 자리에 오도록 하는 물 높이
    float ph = t / ${f(M.T_SWASH)} + .16 * sin(xu / 260. + 1.7) + .1 * sin(xu / 97. + t * .05);
    float c = .5 - .5 * cos(6.2831853 * ph), lift = c * c * c;
    float big = .74 + .26 * sin(floor(ph) * 2.399 + .6);
    return (lift * big * ${f(M.SWASH_UP)} - ${f(M.SWASH_REST)}) * uAmp;
  }
  float swellBend(float xu) { return 16. * sin(xu / 150. + .8) + 9. * sin(xu / 61. + 2.9); }
  // 물마루가 곳에 따라 간격·높이가 달라지게 하는 느린 일렁임 (사인파만 쓰면 나란한 줄무늬가 반복돼 보였다 — 사용자 2026-11-23).
  //  너울은 물가에서 0 이라 이 노이즈는 물가선을 건드리지 않는다. JS 쪽 swell() 은 이 일렁임 없이 평균값만 낸다.
  float swellWarp(vec2 P, float t) { return (vnoise(P / uU / 46. + vec2(3.1, t * .02)) - .5) * 30.; }
  float front(vec2 P, float d, float t) { return sin((d + swellBend(P.x / uU) + swellWarp(P, t)) / 22. + t * 1.1); }
  float swell(vec2 P, float d, float t) {
    float xu = P.x / uU, bend = swellBend(xu), wp = swellWarp(P, t);
    float a = smoothstep(0., 60., d) * uAmp * uSwell * (.5 + vnoise(P / uU / 85. + vec2(t * .012, 0.)));
    return a * (.10 * sin((d + bend + wp) / 22. + t * 1.1) + .06 * sin((d - bend * .6 - wp * .7) / 13. + t * 1.6 + xu / 90.) + .03 * sin((d + wp * .4) / 7. + t * 2.3 - xu / 40.));
  }
  float ripple(vec2 P, float t) {
    float s = 0.;
    for (int i = 0; i < 6; i++) {
      vec4 r = uRip[i]; float age = t - r.z;
      if (r.w > 0. && age > 0. && age < 5.) {
        float x = length(P - r.xy) / uU - age * 26.;
        s += r.w * .16 * exp(-age * .9) * sin(x / 2.6) * exp(-x * x / 60.);
      }
    }
    return s;
  }
  float waterH(vec2 P, float t) { return swash(P.x / uU, t) + swell(P, shoreD(P), t) + ripple(P, t); }
`;
