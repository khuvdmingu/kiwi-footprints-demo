// painted/gamewater.js — 게임용 「새 물」: 설정 › 화면 › 3D 그래픽의 맨 아래 그림 층(모래·물)을 대신 그린다. 키위·발자국 글씨·생물·날씨는 게임 2D 그대로
//  사용자 2026-11-25
//   "키위 글씨는 이전이랑 같게하고 바다랑 물가부분만 바꾸란건데"
//   "바다~해안선 부분 파도 형태가 너무 기계적이야. 바위도 3d나 2.5로 만들자"
//  해변 3D(src/beach3d)와 같은 약속으로 게임에 붙는다 (src/beach3d/game.js 가 부른다):
//   load() · ready · resize(W, H, dpr) · setHour · setWeatherNow · setGlitter · setEdge(d, x0, x1) · frame() · dispose() · u
//  · 그림이 화면을 꽉 채우게(cover) 위에서 내려다본다 — 게임의 2D 키위·글씨와 칸까지 겹쳐야 해서 시점은 기울이지 않는다
//  · 물은 공용 시뮬레이션(src/sandsim, 모래 고정)이 흐르게 하고, 게임이 넘긴 물가선 쪽으로 당긴다 → 글씨를 지우는 자리와 물이 맞다
//  · 바다 색은 그림에서 뽑은 얕은·중간·깊은 세 빛깔. 너울은 방향·길이·빠르기가 다른 세 갈래가 묶음(세트)으로 들쭉날쭉 온다 (기계적인 줄무늬 X)
//  · 바위 2.5D: 바위 있는 땅 ÷ 바위 없는 모래의 밝기 비율을 그림에 곱한다 (윗면·해 쪽 밝게, 반대쪽·드리운 그림자 짙게) + 들이치는 물의 물보라
import * as THREE from 'three';
import { Sim } from '../sandsim/sim.js?v=v30.40.0-bb99cd3';
import { makeWaveSlopes, WAVE_TEX } from '../beach3d/water/normals.js?v=v30.40.0-bb99cd3';
import { PB, gridOf, shoreFn, buildBase, pixelsOf, sandH } from './base.js?v=v30.40.0-bb99cd3';
import { buildRocks } from './rocks3d.js?v=v30.40.0-bb99cd3';
import { artAt } from '../atmos.js?v=v30.40.0-bb99cd3';        // 시간대 그림 가중치 — 2D 게임·해변 3D 와 같은 식
import { skyAt } from '../gfx3d/sky.js?v=v30.40.0-bb99cd3';    // 시간대의 밤·노을 정도

const ART = { day: '', sunset: '-sunset', night: '-night', dawn: '-dawn' };   // 시간대 그림 파일 꼬리표
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const SUN = new THREE.Vector3(0.45, 0.78, -0.45).normalize();   // 그림의 빛 (오른쪽 위에서)

const GRID_GLSL = (g) => /* glsl */`
  const vec2 GRID = vec2(${g.nx}., ${g.nz}.);
  const float CELL = ${g.cell};
  vec4 at(sampler2D t, ivec2 p) { return texelFetch(t, clamp(p, ivec2(0), ivec2(GRID) - 1), 0); }
  vec4 bilin(sampler2D t, vec2 uv) {
    vec2 q = uv * GRID - .5; ivec2 i = ivec2(floor(q)); vec2 r = q - floor(q);
    return mix(mix(at(t, i), at(t, i + ivec2(1, 0)), r.x), mix(at(t, i + ivec2(0, 1)), at(t, i + ivec2(1, 1)), r.x), r.y);
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  // 거품의 그물 무늬: 방울들이 맞닿은 금이 밝고 한가운데는 비어 있다 (0 = 금 위 · 클수록 방울 한가운데)
  vec2 hash22(vec2 p) { vec3 a = fract(p.xyx * vec3(.1031, .1030, .0973)); a += dot(a, a.yzx + 33.33); return fract((a.xx + a.yz) * a.zy); }
  float foamWeb(vec2 p, float t) {
    vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 c = vec2(float(x), float(y)), o = .5 + .36 * sin(t * .55 + 6.2831853 * hash22(i + c));
      float dd = length(c + o - f); if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
    }
    return d2 - d1;
  }
  //  너울 세 갈래 — 방향·길이·빠르기가 다르고, 갈래마다 느린 무늬로 세졌다 약해졌다 한다(파도 묶음). 바다 쪽(+z)에서 뭍 쪽으로 온다
  //  돌려주는 값: xy = 물 면 기울기, z = 높이 (-1~1 쯤)
  vec3 swells(vec2 xz, float t) {
    vec3 o = vec3(0.);
    vec2 D[3]; D[0] = normalize(vec2(.32, -1.)); D[1] = normalize(vec2(-.32, -1.)); D[2] = normalize(vec2(-.06, -1.));   // 왼쪽·오른쪽 비스듬히 대칭 + 거의 곧게 — 마루가 엇갈린다
    float K[3]; K[0] = 1.05; K[1] = 1.2; K[2] = .75;
    float S[3]; S[0] = 1.7; S[1] = 1.85; S[2] = 1.3;
    float A[3]; A[0] = .36; A[1] = .34; A[2] = .24;
    for (int i = 0; i < 3; i++) {
      float ph = dot(xz, D[i]) * K[i] - t * S[i] + float(i) * 2.1;
      float env = smoothstep(.2, .85, vnoise(vec2(dot(xz, vec2(D[i].y, -D[i].x)) * .07 + float(i) * 7.3, (dot(xz, D[i]) - t * S[i] / K[i]) * .045)));
      float a = A[i] * env;
      o.xy += a * K[i] * cos(ph) * D[i]; o.z += a * sin(ph);
    }
    return o;
  }
`;

//  땅·물 면은 높이를 가진다 (위에서 보면 모양은 같고, 3D 바위가 물 면보다 높은 부분만 보이게 깊이로 가린다)
const VERT = (g) => /* glsl */`
  uniform sampler2D uS; varying vec2 vUv;
  void main() { vUv = uv; ivec2 c = clamp(ivec2(floor(vec2(uv.x, 1. - uv.y) * vec2(${g.nx}., ${g.nz}.))), ivec2(0), ivec2(${g.nx - 1}, ${g.nz - 1}));
    vec4 st = texelFetch(uS, c, 0); vec3 p = position; p.y = st.r + (st.g > .002 ? st.g : 0.);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`;
const FRAG = (g) => GRID_GLSL(g) + /* glsl */`
  uniform sampler2D uS, uV, uBase, uDry, uWave, uRockM, uR25;   // uR25 = 물속 돌 2.5D 판 (1600px — R 돌 자리 · G 높이)
  uniform sampler2D uDryB, uArtB, uSeaPB; uniform float uMixB, uCaus;   // 시간대 그림: 지금 판(uDry·uArt·uSeaP)에 넘어가는 판(…B)을 uMixB 만큼 섞는다 (2026-11-28 — 노을·밤에도 새 물)
  vec4 dryT(vec2 uv) { vec4 a = texture(uDry, uv); return uMixB > .002 ? mix(a, texture(uDryB, uv), uMixB) : a; }
  uniform sampler2D uArt, uSeaP, uEdgeOff;   // 원래 그림 · 바위 지운 바다 판 · 칸 줄마다 물가선이 그려진 물가선에서 밀린 거리(세계, + = 바다 쪽)
  float edgeOff(float x) { float f = x * GRID.x - .5; int i = int(floor(f)); float r = f - floor(f);
    return mix(texelFetch(uEdgeOff, ivec2(clamp(i, 0, int(GRID.x) - 1), 0), 0).r, texelFetch(uEdgeOff, ivec2(clamp(i + 1, 0, int(GRID.x) - 1), 0), 0).r, r); }
  vec4 artT(vec2 uv) { vec4 a = texture(uArt, uv); return uMixB > .002 ? mix(a, texture(uArtB, uv), uMixB) : a; }
  //  바위 지운 바다 판은 낮 것만 원래 그림과 색이 맞다. 노을·밤 판은 색조가 달라(청록) 돌 둘레에 얼룩이 졌다 (2026-11-28)
  //  → 낮이 아닌 판은 그 시간의 원래 그림을 넓게 흐려 읽는다 (돌이 둘레 물빛에 섞여 옅은 그늘처럼 남는다 — 그 위에 3D 바위가 선다)
  uniform float uSeaOk, uSeaOkB;
  vec4 seaT(vec2 uv) {
    vec4 a = uSeaOk > .5 ? texture(uSeaP, uv) : texture(uArt, uv, 5.5);
    if (uMixB > .002) a = mix(a, uSeaOkB > .5 ? texture(uSeaPB, uv) : texture(uArtB, uv, 5.5), uMixB);
    return a;
  }
  uniform float uT, uRain, uFog, uRock3D;
  uniform vec3 uSun, uSunCol, uSky, uPalS, uPalM, uPalD, uFoamCol;
  varying vec2 vUv;
  float Ws(vec2 s) { vec4 v = bilin(uS, s); return v.r + v.g; }
  vec2 wave(vec2 uv, float b) { return (texture(uWave, uv, b).rg - .5) * 6.; }
  void main() {
    vec2 s = vec2(vUv.x, 1. - vUv.y);
    vec4 st = bilin(uS, s), vv = bilin(uV, s);
    float w = st.g, h0 = bilin(uBase, s).r;
    vec2 xz = s * GRID * CELL;
    vec3 col = dryT(vUv).rgb;
    //  바위 (사용자 2026-11-25 "바위가 화질이 되게 안좋네" → 원본 그림에서 선명하게): 물속 돌은 1600px 2.5D 판, 모래 위 바위는 바위 가림막으로 오린다
    //  (예전엔 물 계산 격자 384칸에서 빛·그림자를 구해 화면에서 뭉개졌다)
    vec4 r25 = texture(uR25, vUv);
    float rSea = smoothstep(.35, .65, r25.r);
    float rLand = smoothstep(.35, .65, texture(uRockM, vUv).a) * (1. - smoothstep(.05, .3, texture(uR25, vUv, 3.).r)) * smoothstep(-.15, -.02, h0);   // 넓은 가림막은 뭍에서만 — 물속에선 둘레의 그림 속 물까지 붙어 동그란 테두리가 생겼다
    float rockA = max(rSea, rLand);
    // 바위가 드리우는 그림자: 해 쪽으로 비낀 자리의 바위 틀 (바위 밖에만)
    vec2 toSun = normalize(vec2(uSun.x, -uSun.z)) * vec2(.006, .0107);
    float shd = max(smoothstep(.3, .7, texture(uR25, vUv + toSun, 1.).r), smoothstep(.3, .7, texture(uRockM, vUv + toSun, 1.).a) * (1. - smoothstep(.05, .3, texture(uR25, vUv + toSun, 3.).r)) * smoothstep(-.15, -.02, h0));
    col *= 1. - .28 * shd * (1. - rockA);
    //  젖은 모래의 가장자리: 물 계산 칸(384칸) 하나에 딱 끊겨 계단져 보였다 → 둘레 네 칸과 고르게 읽어 부드럽게 (2026-11-28)
    vec2 e1 = 1.3 / GRID;
    float wa = (st.a + bilin(uS, s + vec2(e1.x, 0.)).a + bilin(uS, s - vec2(e1.x, 0.)).a + bilin(uS, s + vec2(0., e1.y)).a + bilin(uS, s - vec2(0., e1.y)).a) * .2;
    float under = smoothstep(.0, .012, w), wet = max(smoothstep(.05, 1., min(wa, 1.)) * .85, under);
    col *= mix(vec3(1.), vec3(.7, .67, .66), wet);
    col = mix(col, col * .9 + uSky * .16, smoothstep(.75, 1., st.a) * (1. - under) * .7);   // 막 물이 빠진 자리의 번들거림
    float rockish = clamp(max(texture(uR25, vUv, 2.).r * 1.6, texture(uRockM, vUv, 2.).a * 1.2), 0., 1.);   // 돌 둘레 (조금 번진 틀) — 고요할 땐 흰 테두리 막기
    vec3 sw = swells(xz, uT);
    float shiftK = 1. - smoothstep(.12, .5, -h0);   // 그림 바다를 물가선만큼 미는 것은 물가 가까이만 — 깊은 바다는 제자리
    float deepK = smoothstep(.2, 1.1, max(w, -h0));
    if (w > .0015) {
      vec2 e = 1. / GRID;
      vec2 sl = vec2(Ws(s + vec2(e.x, 0.)) - Ws(s - vec2(e.x, 0.)), Ws(s + vec2(0., e.y)) - Ws(s - vec2(0., e.y))) / (2. * CELL);
      vec2 rp = (wave(xz / 11. + uT * vec2(.012, .03), 2.) * .6 + wave(mat2(.8, .6, -.6, .8) * xz / 7.5 + uT * vec2(-.02, .025), 2.) * .45) * .05 * smoothstep(.0, .25, w);   // 잔물결도 크고 부드럽게
      vec2 slope = sl * 2. + rp + sw.xy * deepK;
      vec3 n = normalize(vec3(-slope.x, 1., -slope.y));
      vec2 off = n.xz * min(w, .8) * .014;
      vec3 bed = dryT(vUv + vec2(off.x, -off.y)).rgb * vec3(.74, .71, .69);
      //  바닥 빛 그물 — 무늬를 크게 (사용자 "물에 빛이 자글자글한데, 좀 더 크게") · 부드럽게 읽는다
      vec2 cs = wave(xz / 9.5 + uT * vec2(.02, .035), 1.4) + wave(mat2(.8, .6, -.6, .8) * xz / 6.8 - uT * vec2(.028, .01), 1.4);
      bed *= 1. + .8 * uCaus * pow(max(0., 1. - length(cs) * .36), 3.) * (1. - smoothstep(.08, .9, w));   // 빛 그물은 해가 있을 때만
      //  물빛 = 원래 그림의 바다를 지금 물가선만큼 밀어 읽는다 → 그림 속 물가 거품 띠·청록 띠·붓결이 물가선을 따라 오르내린다
      //  (바위 자리는 바위 지운 판 — 바위는 바닥 그림으로 제자리에 비친다). 너울만큼 조금 일렁인다
      vec2 su = vec2(vUv.x, vUv.y + edgeOff(vUv.x) * shiftK / (GRID.y * CELL)) + sw.xy * deepK * vec2(.0025, -.0025) + vec2(off.x, -off.y) * .5;
      vec3 seaP = mix(artT(su).rgb, seaT(su).rgb, smoothstep(.15, .6, texture(uRockM, su).a));
      float op = 1. - exp(-w * 7.);                         // 조금 불투명하게 — 아주 얕은 물가에서만 모래가 비친다
      //  물속 돌 둘레: 돌의 밑동이 바닥을 높여 물이 얕게 잡히고, 그 자리로 모래가 비쳐 돌마다 희끄무레한 둥근 테가 생겼다.
      //  돌 바로 옆만 물빛으로 덮으면 그 바깥에 테가 남는다 → 넓게 번진 돌 틀(밑동이 닿는 데까지)로 덮는다 (2026-11-28)
      float skirt = max(smoothstep(.0, .35, texture(uR25, vUv, 2.).r), smoothstep(.015, .16, texture(uR25, vUv, 4.6).r));
      op = max(op, skirt * (1. - .5 * rSea));   // 돌 자리 가장자리에서 덮개가 끊기면 그 틈으로 바닥 그림의 모래색이 주황 테로 비친다 (밤에 특히) → 돌 자리 안쪽도 절반은 덮는다
      vec3 wc = mix(bed, seaP, .15 + .85 * op);
      wc *= clamp(1. + 1.6 * (dot(n, uSun) - uSun.y), .86, 1.16);   // 너울의 빛과 그늘은 살짝만 (그림 톤 지키기)
      wc += uSunCol * pow(max(reflect(-uSun, n).y, 0.), 45.) * .16 * (1. - .7 * rockish);   // 반짝임은 넓고 부드럽게 (잔 점으로 자글거리지 않게)
      col = mix(col, wc, smoothstep(.0015, .008, w));
    }
    // 바위를 원본 그림에서 선명하게 얹는다 + 고해상도 높이로 입체 빛 (해 쪽 밝게 · 반대쪽 짙게). 물이 덮으면 아래부터 잠긴다
    if (rockA > .002) {
      vec2 px = vec2(1. / 1600., 1. / 893.);
      float hL = texture(uRockM, vUv, 1.5).a * rLand;
      float hx = texture(uR25, vUv + vec2(px.x, 0.)).g - texture(uR25, vUv - vec2(px.x, 0.)).g + (texture(uRockM, vUv + vec2(px.x * 2., 0.), 1.5).a - texture(uRockM, vUv - vec2(px.x * 2., 0.), 1.5).a) * rLand;
      float hz = texture(uR25, vUv - vec2(0., px.y)).g - texture(uR25, vUv + vec2(0., px.y)).g + (texture(uRockM, vUv - vec2(0., px.y * 2.), 1.5).a - texture(uRockM, vUv + vec2(0., px.y * 2.), 1.5).a) * rLand;
      vec3 rn = normalize(vec3(-hx * 5., 1., -hz * 5.));
      float rlit = clamp((.55 + .6 * max(dot(rn, uSun), 0.)) / (.55 + .6 * uSun.y), .78, 1.22);
      vec3 rockC = artT(vUv).rgb * rlit;
      float top = max(r25.g, hL);
      float cover = smoothstep(.03, .3, w) * (1. - smoothstep(.55, .95, top));   // 꼭대기는 잘 안 잠긴다
      col = mix(col, rockC, (uRock3D > .5 ? rLand : rockA) * (1. - .85 * cover));   // 물속 돌은 3D 모델이 맡는다
    }
    // 파도가 빠진 자리: 그림 거품 띠가 있던 자리에 거품 자국이 옅게 남았다가 스민다 (사용자 "파도가 올라와서 다시 내려올때 뭔가 어색해 거품같은게")
    {
      vec2 su2 = vec2(vUv.x, vUv.y + edgeOff(vUv.x) * shiftK / (GRID.y * CELL));
      vec3 a2 = artT(su2).rgb;
      float white = smoothstep(.78, .93, dot(a2, vec3(.3, .59, .11))) * smoothstep(.55, .95, st.a) * (1. - under);
      col = mix(col, mix(col, uFoamCol * (uSky * .45 + uSunCol * .7), .55), white * smoothstep(.4, .75, vnoise(xz * 3.1 + 7.)));
    }
    // 거품: 흐름에 실린 레이스 + 물 가장자리 가는 줄 + 너울 마루가 물가 가까이서 부서지는 흰 물결 (들쭉날쭉) + 바위에 들이친 거품
    vec2 fw = xz + vv.rg * .1;
    float pat = vnoise(fw * 2.4 + uT * .1) * .55 + vnoise(fw * 7. - uT * .08) * .3 + vnoise(fw * 16.) * .15;
    float fa = clamp(vv.b, 0., 1.2) * (1. - smoothstep(.2, .5, w));   // 흐르는 물 거품은 얕은 물에서만 — 깊은 물에 하얀 구름처럼 떠다녔다 (사용자 2026-11-25)
    float brk = smoothstep(-.6, -.38, h0) * (1. - smoothstep(-.25, -.08, h0));
    //  물마루가 부서지는 거품은 따로 구한다: 덩어리로 칠하면 물 한가운데 흰 구름처럼 떴다 → 물마루를 따라 가는 줄로, 방울이 맞닿은 그물 결로
    float crest = smoothstep(.5, .85, sw.z) * brk * smoothstep(.4, .72, vnoise(xz * .35 + uT * .15)) * (1. - rockish);
    fa = max(fa, smoothstep(.2, .9, vv.a));
    float fm = smoothstep(.22, .6, fa * (.35 + .95 * pat)) * mix(.75, 1., under) * .65;   // 그림 속 거품 띠를 거든다
    fm = max(fm, (1. - smoothstep(.003, .018, w)) * under * smoothstep(.5, .72, pat) * .6 * (1. - rockish));
    fm *= 1. - .85 * rockish * (1. - smoothstep(.15, .7, vv.a));
    float web = 1. - smoothstep(.03, .34, foamWeb(fw * 2.3 + vnoise(fw * .9) * 1.4, uT));
    fm = max(fm, crest * mix(web, 1., smoothstep(.8, 1., crest)) * (.3 + .25 * pat));
    col = mix(col, uFoamCol * (uSky * .45 + uSunCol * .7), fm);
    // 날씨: 비는 회청 톤 · 안개는 옅게 (게임이 위에 날씨 층을 더 그린다)
    col = mix(col, vec3(dot(col, vec3(.3, .59, .11))) * vec3(.9, .95, 1.02), .3 * uRain) * (1. - .1 * uRain);
    col = mix(col, vec3(.86, .89, .9), .25 * uFog);
    gl_FragColor = vec4(col, 1.);
    #include <colorspace_fragment>
  }`;

// 물보라 — 위에서 내려다보므로 튀어 오르는 높이를 화면 위쪽(-z)으로 비껴 보인다 (그림이 비스듬히 그려진 시점에 맞춤)
const SPRAY_VERT = (g) => GRID_GLSL(g) + /* glsl */`
  uniform sampler2D uV; uniform float uT, uPx;
  attribute vec2 aEm; attribute vec2 aDir; attribute float aSeed;
  varying float vA;
  void main() {
    vec2 s = vec2(aEm.x / float(${g.wx}) + .5, aEm.y / float(${g.wz}) + .5);
    float hit = bilin(uV, s).a, vis = smoothstep(.08, .5, hit);
    float t = fract(uT * .85 + aSeed * 7.13), sp = .6 + fract(aSeed * 13.7) * .9;
    vec2 side = vec2(-aDir.y, aDir.x) * (fract(aSeed * 31.7) - .5) * 1.4;
    vec2 xz = aEm + (aDir * .7 + side) * t * sp;
    float y = max(0., 3.2 * sp * t - 3.6 * t * t);
    xz.y -= y * .55;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(xz.x, 1., xz.y, 1.);
    gl_PointSize = uPx * (.09 + .1 * fract(aSeed * 5.3)) * (1. - .45 * t) * step(.01, vis);
    vA = vis * (1. - t * t);
  }`;
const SPRAY_FRAG = /* glsl */`
  uniform vec3 uSky, uSunCol;
  varying float vA;
  void main() { float d = length(gl_PointCoord - .5); float a = (1. - smoothstep(.12, .5, d)) * vA; if (a < .01) discard;
    gl_FragColor = vec4(uSky * .45 + uSunCol * .8, a);
    #include <colorspace_fragment>
  }`;

export class SimWater {
  constructor(canvas, { base = 'assets/', map = 'beach', plate = null, game = true } = {}) {
    this.cv = canvas; this.base = base; this.mapId = map; this.plate = plate; this.game = game; this.ready = false; this.t = 0;
  }
  static supportsHour() { return true; }   // 2026-11-28: 노을·밤·새벽도 그 시간 그림 판으로 그린다 (앞에는 낮 7~17.5시만)
  async load() {
    const plate = this.plate; if (!plate) throw new Error('판(plate)이 없어요');
    this.pw = plate.pw; this.ph = plate.ph; this.u = plate.ph / 800;
    const g = this.g = gridOf(plate.pw, plate.ph);
    this.shoreZ = shoreFn(plate.shoreP, plate.pw, plate.ph, g);
    const loadImg = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = this.base + src; });
    const r25img = await loadImg((plate.name || 'plate') + '-rock25.webp?v=v30.40.0-bb99cd3').catch(() => null), rock25 = r25img ? pixelsOf(r25img, g.nx, g.nz) : null;
    const rockA = plate.rockArt ? pixelsOf(plate.rockArt, g.nx, g.nz) : null;
    this.baseArr = buildBase(g, this.shoreZ, { rock25, rockA });
    this.palette(pixelsOf(plate.img, g.nx, g.nz), rockA);
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true });   // 3D 바위의 가장자리가 계단지지 않게 (2026-11-28)
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.sim = new Sim(r, g, this.baseArr); this.sim.freezeSand(); this.sim.setFoam(1.1, 1.6);
    const tex = this.texOf = (im, mips = false) => { const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.generateMipmaps = mips; t.needsUpdate = true; return t; };
    const wt = this.waveTex = new THREE.DataTexture(makeWaveSlopes(), WAVE_TEX, WAVE_TEX);
    wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.generateMipmaps = true; wt.minFilter = THREE.LinearMipmapLinearFilter; wt.magFilter = THREE.LinearFilter; wt.needsUpdate = true;
    let r25t; if (r25img) { r25t = new THREE.Texture(r25img); r25t.generateMipmaps = true; r25t.minFilter = THREE.LinearMipmapLinearFilter; r25t.needsUpdate = true; } else { r25t = new THREE.DataTexture(new Uint8Array(4), 1, 1); r25t.needsUpdate = true; }
    let rm; if (plate.rockArt) { rm = new THREE.Texture(plate.rockArt); rm.generateMipmaps = true; rm.minFilter = THREE.LinearMipmapLinearFilter; rm.magFilter = THREE.LinearFilter; rm.needsUpdate = true; } else { rm = new THREE.DataTexture(new Uint8Array(4), 1, 1); rm.needsUpdate = true; }
    this.edgeOffTex = new THREE.DataTexture(new Float32Array(g.nx), g.nx, 1, THREE.RedFormat, THREE.FloatType); this.edgeOffTex.needsUpdate = true;
    const C = (v) => ({ value: v });
    this.uni = {
      uS: C(this.sim.state), uV: C(this.sim.vel), uBase: C(this.sim.baseTex), uDry: C(tex(plate.dry)), uWave: C(wt), uRockM: C(rm), uR25: C(r25t),
      uArt: C(tex(plate.img)), uSeaP: C(tex(plate.sea)), uEdgeOff: C(this.edgeOffTex),
      uDryB: C(null), uArtB: C(null), uSeaPB: C(null), uMixB: C(0), uSeaOk: C(1), uSeaOkB: C(1), uCaus: C(1), uTone: C(new THREE.Color(1, 1, 1)),
      uT: C(0), uRain: C(0), uFog: C(0), uPx: C(600), uRock3D: C(r25img ? 1 : 0),
      uSun: C(SUN.clone()), uSunCol: C(new THREE.Color(1.0, 0.97, 0.9)), uSky: C(new THREE.Color(0.78, 0.9, 0.95)),
      uPalS: C(this.pal[0]), uPalM: C(this.pal[1]), uPalD: C(this.pal[2]), uFoamCol: C(new THREE.Color(1, 1, 1)),
    };
    //  시간대 그림 벌: 낮은 게임이 준 그림 그대로. 노을·밤·새벽은 그 시간이 되면 읽는다 (setHour)
    this.sets = { day: { dry: this.uni.uDry.value, art: this.uni.uArt.value, sea: this.uni.uSeaP.value, seaOk: 1 } }; this.loadingSet = {};
    for (const k of ['uDryB', 'uArtB', 'uSeaPB']) this.uni[k].value = this.sets.day[k === 'uDryB' ? 'dry' : k === 'uArtB' ? 'art' : 'sea'];
    this.loadImg = loadImg;
    this.scene = new THREE.Scene();
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(g.wx, g.wz, g.nx - 1, g.nz - 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: VERT(g), fragmentShader: FRAG(g), uniforms: this.uni }));
    this.ground.frustumCulled = false;
    //  물속 바위는 3D 모델로 (그림 속 돌 자리·크기·색을 재서) — 2D 로 오려 얹던 물속 돌은 뺀다
    if (r25img) { this.rocks = buildRocks(r25img, plate.dry, g, this.uni); this.scene.add(this.rocks); }
    this.scene.add(this.ground);
    this.camera = new THREE.OrthographicCamera(-g.wx / 2, g.wx / 2, g.wz / 2, -g.wz / 2, 0.1, 100);
    this.camera.position.set(0, 50, 0); this.camera.up.set(0, 0, -1); this.camera.lookAt(0, 0, 0);
    this.makeSpray();
    this.levels = new Float32Array(g.nx); this.offLag = null; this.lastEdgeT = 0;
    this.timer = new THREE.Timer(); this.ready = true;
    if (this.hour != null) this.setHour(this.hour);
    return this;
  }
  palette(art, rockA) {
    const g = this.g, bands = [[2.6, 4.2], [6, 8.5], [12, 15]];
    this.pal = bands.map(([a, b]) => {
      const sum = [0, 0, 0]; let n = 0;
      for (let i = 0; i < g.nx; i += 2) {
        const x = (i + 0.5) * g.cell - g.wx / 2, z0 = this.shoreZ(x);
        for (let z = z0 + a; z < z0 + b; z += g.cell) {
          const j = Math.round((z + g.wz / 2) / g.cell - 0.5); if (j < 0 || j >= g.nz) continue;
          const k = (j * g.nx + i) * 4; if (rockA && rockA[k + 3] > 60) continue;
          sum[0] += art[k]; sum[1] += art[k + 1]; sum[2] += art[k + 2]; n++;
        }
      }
      const c = new THREE.Color().setRGB(sum[0] / Math.max(1, n) / 255, sum[1] / Math.max(1, n) / 255, sum[2] / Math.max(1, n) / 255, THREE.SRGBColorSpace), hsl = {};
      c.getHSL(hsl); return c.setHSL(hsl.h, Math.min(1, hsl.s * 1.35), hsl.l);
    });
  }
  makeSpray() {
    const g = this.g, B = this.baseArr, em = [];
    for (let j = 1; j < g.nz - 1; j += 2) for (let i = 1; i < g.nx - 1; i += 2) {
      const k = j * g.nx + i, gx = (B[k + 1] - B[k - 1]) / (2 * g.cell), gz = (B[k + g.nx] - B[k - g.nx]) / (2 * g.cell), gl = Math.hypot(gx, gz);
      const x = (i + 0.5) * g.cell - g.wx / 2, z = (j + 0.5) * g.cell - g.wz / 2;
      if (gl > 0.35 && B[k] < 0.75 && z > this.shoreZ(x) - 1.5) em.push([x, z, -gx / gl, -gz / gl]);
    }
    const per = 10, cnt = Math.min(em.length, 520), n = cnt * per;
    const aEm = new Float32Array(n * 2), aDir = new Float32Array(n * 2), aSeed = new Float32Array(n), step = em.length / Math.max(1, cnt);
    for (let q = 0; q < n; q++) { const e = em[Math.floor(Math.floor(q / per) * step)]; aEm.set([e[0], e[1]], q * 2); aDir.set([e[2], e[3]], q * 2); aSeed[q] = ((q * 0.6180339) % 1 + (q % per) * 0.137) % 1; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('aEm', new THREE.BufferAttribute(aEm, 2)); geo.setAttribute('aDir', new THREE.BufferAttribute(aDir, 2)); geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    this.spray = new THREE.Points(geo, new THREE.ShaderMaterial({ vertexShader: SPRAY_VERT(g), fragmentShader: SPRAY_FRAG, uniforms: this.uni, transparent: true, depthTest: false, depthWrite: false }));
    this.spray.frustumCulled = false; this.spray.renderOrder = 2; this.scene.add(this.spray);
  }
  // 그림이 화면을 꽉 채우게 (게임의 기본 그림과 같은 cover 맞춤: 판 px × s + ox)
  resize(W, H, dpr = 1) {
    this.W = W; this.H = H; this.renderer.setPixelRatio(Math.min(dpr, 2)); this.renderer.setSize(W, H, false);
    const g = this.g, s = Math.max(W / this.pw, H / this.ph), ox = (W - this.pw * s) / 2, oy = (H - this.ph * s) / 2;
    const wxOf = (px) => (px / this.pw - 0.5) * g.wx, wzOf = (py) => (py / this.ph - 0.5) * g.wz, c = this.camera;
    c.left = wxOf(-ox / s); c.right = wxOf((W - ox) / s); c.top = -wzOf(-oy / s); c.bottom = -wzOf((H - oy) / s); c.updateProjectionMatrix();
    this.uni.uPx.value = H * this.renderer.getPixelRatio() / (c.top - c.bottom);   // 세계 1 = 화면 몇 px
  }
  // 시간대: 그림 판을 그 시간 것으로 (낮 ↔ 노을·새벽 ↔ 밤, 넘어갈 때는 두 벌을 섞는다) + 빛·거품의 색
  setHour(h) {
    this.hour = h; if (!this.ready) return;
    const a = artAt(h);
    //  세 벌을 한꺼번에 섞지 않는다(그림 읽는 칸 수를 아낀다): 밤 기운이 있으면 「노을·새벽 → 밤」, 없으면 「낮 → 노을·새벽」
    let A = a.n > 0.001 ? a.kind : 'day', B = a.n > 0.001 ? 'night' : a.kind, k = a.n > 0.001 ? a.n : a.w;
    if (k > 0.998) { A = B; k = 0; } else if (k < 0.002) { B = A; k = 0; }
    this.want = { A, B, k }; this.needSet(A); this.needSet(B); this.applySets();
    const s = skyAt(h), n = s.night, warm = s.warm, u = this.uni;
    u.uSunCol.value.setRGB(...mix3(mix3([1, 0.97, 0.9], [1, 0.8, 0.5], warm), [0.8, 0.88, 1], n));
    u.uSky.value.setRGB(...mix3(mix3([0.78, 0.9, 0.95], [1, 0.72, 0.5], warm), [0.1, 0.16, 0.3], n));
    u.uFoamCol.value.setRGB(...mix3(mix3([1, 1, 1], [1, 0.9, 0.8], warm), [0.55, 0.66, 0.85], n));
    u.uTone.value.setRGB(...mix3(mix3([1, 1, 1], [1, 0.85, 0.75], warm), [0.32, 0.38, 0.6], n));   // 3D 바위의 평균색에 곱한다 (그림 밖 가장자리)
    u.uCaus.value = (1 - n) * (1 - 0.5 * warm);
  }
  //  그 시간대 그림 한 벌(물 뺀 판 · 원래 그림 · 바위 지운 바다)을 필요해질 때 읽는다. 읽는 동안은 지금 보이는 벌 그대로
  needSet(kind) {
    if (this.sets[kind] || this.loadingSet[kind]) return;
    const name = this.plate.name || 'plate', p = this.plate;
    if (kind === 'day') { this.sets.day = { dry: this.texOf(p.dry), art: this.texOf(p.img), sea: this.texOf(p.sea), seaOk: 1 }; return; }
    //  노을·밤·새벽은 두 장만 읽는다 (바위 지운 바다 판은 색이 안 맞아 쓰지 않는다 — 원래 그림을 흐려 읽으므로 밉맵을 만든다)
    this.loadingSet[kind] = Promise.all([this.loadImg(`${name}-dry${ART[kind]}.webp?v=v30.40.0-bb99cd3`), this.loadImg(`${name}${ART[kind]}.webp?v=v30.40.0-bb99cd3`)])
      .then(([dry, art]) => { if (this.ready) { const a = this.texOf(art, true); this.sets[kind] = { dry: this.texOf(dry), art: a, sea: a, seaOk: 0 }; } }, () => { this.missing = { ...(this.missing || {}), [kind]: true }; })
      .then(() => { delete this.loadingSet[kind]; if (this.ready) this.applySets(); });
  }
  applySets() {
    const w = this.want; if (!w) return;
    const u = this.uni, cur = this.sets[this.shown] || this.sets.day || Object.values(this.sets)[0];
    const A = this.sets[w.A] || (this.missing?.[w.A] ? cur : null), B = this.sets[w.B] || (this.missing?.[w.B] ? A : null);
    if (!A) return;   // 아직 읽는 중 — 지금 보이는 벌 그대로 둔다
    u.uDry.value = A.dry; u.uArt.value = A.art; u.uSeaP.value = A.sea; this.shown = w.A;
    const b = B || A; u.uDryB.value = b.dry; u.uArtB.value = b.art; u.uSeaPB.value = b.sea; u.uMixB.value = B && B !== A ? w.k : 0;
    u.uSeaOk.value = A.seaOk; u.uSeaOkB.value = b.seaOk;
    //  쓰지 않는 벌은 내려놓는다 (그림 한 장이 크다 — 폰 메모리)
    for (const kind of Object.keys(this.sets)) if (this.sets[kind] !== A && this.sets[kind] !== b) { for (const t of Object.values(this.sets[kind])) t.dispose?.(); delete this.sets[kind]; }
  }
  setWeatherNow(rain, fog) { this.uni.uRain.value = rain; this.uni.uFog.value = fog; }
  setGlitter() {}   // 게임이 2D 윤슬을 위에 그린다
  // 게임 물가선: d = 그려진 물가선에서의 거리(u) 128칸, x0~x1 = 그 값이 덮는 판 px → 칸 줄마다 그 자리 모래 높이(= 물이 닿을 수면)
  setEdge(d, x0, x1, dt) {
    const now = performance.now() / 1000; this.edgeDt = dt ?? (this.lastEdgeT ? Math.min(0.1, now - this.lastEdgeT) : 1 / 60); this.lastEdgeT = now;
    const g = this.g, n = d.length - 1, toW = g.wz / 800;   // u → 세계 (u = 판 높이 / 800)
    for (let i = 0; i < g.nx; i++) {
      const px = (i + 0.5) / g.nx * this.pw, f = Math.min(n, Math.max(0, (px - x0) / Math.max(1, x1 - x0) * n)), a = Math.floor(f), b = Math.min(n, a + 1);
      const dw = (d[a] + (d[b] - d[a]) * (f - a)) * toW;
      this.levels[i] = sandH(dw);
      //  그림 거품 띠를 미는 거리: 물이 올라오면(dw 작아짐) 바로 따라가고, 빠질 때는 천천히 — 띠가 통째로 미끄러져 내려가지 않게
      if (!this.offLag) this.offLag = new Float32Array(g.nx).fill(dw);
      const o = this.offLag[i]; this.offLag[i] = dw < o ? dw : o + (dw - o) * Math.min(1, this.edgeDt * 0.9);
      this.edgeOffTex.image.data[i] = this.offLag[i];
    }
    this.edgeOffTex.needsUpdate = true;
    this.sim.setEdgeLevels(this.levels);
  }
  frame(step) {
    if (!this.ready) return;
    this.timer.update();
    const dt = step ?? Math.min(0.05, this.timer.getDelta());
    this.t += dt; this.sim.step(dt);
    this.uni.uT.value = this.sim.t; this.uni.uS.value = this.sim.state; this.uni.uV.value = this.sim.vel;
    this.renderer.setRenderTarget(null); this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.ready = false; this.sim?.dispose(); this.waveTex?.dispose();
    for (const k of ['uRockM', 'uR25', 'uEdgeOff']) this.uni?.[k].value.dispose();
    for (const set of Object.values(this.sets || {})) for (const t of Object.values(set)) t.dispose?.();
    this.sets = {};
    this.ground?.geometry.dispose(); this.ground?.material.dispose(); this.rocks?.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); this.spray?.geometry.dispose(); this.spray?.material.dispose();
    this.renderer?.dispose();
  }
}
