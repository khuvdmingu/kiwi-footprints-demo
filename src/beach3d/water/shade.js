// beach3d/water/shade.js — ② 물 그리기: 바닥 층을 받아 물을 얹는다 (새 구조, 2026-11-23)
//  한 화소를 일곱 걸음으로 그린다: 1 물결 면의 기울기 → 2 바닥(젖은 모래) → 3 물의 몸(깊이에 따른 색) → 4 빛 → 5 거품 → 6 돌 → 7 날씨.
//  앞 구조와 다른 점:
//   · 모래와 물을 따로 그려 섞지 않는다. 바닥 하나에 물이 깊이만큼 얹히므로 물가선에서 색이 끊기지 않는다 (물막 밑 모래도 젖은 색)
//   · 빛을 「젖은 면의 비침」(물막·젖은 모래 공통)과 「물결 위의 반짝임」(물결 이는 물만)으로 가른다 → 물이 올라올 때 빛이 튀지 않는다
//   · (같은 날 뒤에) 빛을 광학 순서로 다시 세웠다: 물결 면 하나(surface.js) → 굴절 · 빛 그물(꺾인 빛이 모이는 자리) · 음영 · 큰 반사광.
//     잔 노이즈 기울기와 그려 넣은 빛 그물 무늬는 걷어냈다 — 빛이 자글거리고 만화처럼 보였다. 참고: Evan Wallace 의 WebGL Water(빛 그물 = 닿는 면적의 비)
//   · 거품은 여기서 만들지 않는다. 흐름에 실려 다닌 거품의 기억(foam.js)을 얹고, 잔무늬도 물가와 함께 움직인다
import { BEACH_GLSL } from '../model.js?v=v30.39.0-0299996';
import { FLOW_GLSL } from './flow.js?v=v30.39.0-0299996';
import { SURFACE_GLSL } from './surface.js?v=v30.39.0-0299996';

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
  // 워터 그래픽 모듈(water-gfx.js)의 물 성질 — 맵마다 다르다. 1 = 바다 기본
  uniform float uWFoam;        // 물가 거품 띠
  uniform float uWCrest;       // 물마루 거품
  uniform float uWLace;        // 남는 거품 자국
  uniform float uWClarity;     // 맑기
  uniform float uWDeep;        // 그려진 물빛으로 넘어가는 빠르기
  uniform vec3 uWTint;         // 물 자체의 색 배율
  uniform float uWRefract;     // 바닥이 일렁이는 정도
  uniform float uWSky;         // 하늘 비침
  uniform float uWSparkle;     // 빛길 밖 반짝임
  // 지형 모듈(terrain-gfx.js)의 돌·모래 성질 — 맵마다 다르다. 1 = 기본
  uniform float uTSoft;        // 돌 가장자리 부드러움
  uniform float uTFoam;        // 돌 둘레 거품 고리
  uniform float uTRipple;      // 돌에서 번지는 잔물결
  uniform float uTWet;         // 물에 닿는 돌 아랫부분이 젖는 정도
  uniform float uTShadow;      // 돌이 물에 드리우는 그늘
  uniform float uTSandWet;     // 젖은 모래가 짙어지는 정도
  uniform float uTSandMirror;  // 젖은 모래에 하늘이 비치는 정도
  uniform float uRain;         // 비 0~1
  uniform float uFog;          // 안개 0~1
  uniform vec3 uFogCol;
  ${BEACH_GLSL}
  ${FLOW_GLSL}
  ${SURFACE_GLSL}

  // 거품의 그물 무늬: 방울들이 맞닿은 금이 밝고 방울 한가운데는 비어 있다. 진짜 거품은 흰 얼룩이 아니라 그물이다
  //  (흰 얼룩이 켜졌다 꺼지면 만화 같아 보였다 — 사용자 2026-11-23 "거품이 애니메이션 같이 나와서 좀 더 자연스럽게")
  vec2 hash22(vec2 p) { vec3 a = fract(p.xyx * vec3(.1031, .1030, .0973)); a += dot(a, a.yzx + 33.33); return fract((a.xx + a.yz) * a.zy); }
  float foamWeb(vec2 p, float t) {   // 0 = 금 위 · 클수록 방울 한가운데
    vec2 i = floor(p), f = fract(p);
    float d1 = 8., d2 = 8.;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = .5 + .36 * sin(t * .55 + 6.2831853 * hash22(i + g));   // 방울이 천천히 자리를 옮긴다 → 그물이 살아 움직인다
      float dd = length(g + o - f);
      if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
    }
    return d2 - d1;
  }

  // 물결 면의 높이 — 빛과 굴절이 보는 면. 철썩임(물가선의 오르내림)은 넣지 않는다: 얇게 올라온 물막은 평평하다
  float surfH(vec2 P) { return swell(P, shoreD(P), uT) + ripple(P, uT); }

  void main() {
    vec2 P = vec2(vUv.x, 1. - vUv.y) * uPlate;
    vec2 q = P / uU;
    float d = shoreD(P);
    float hT = terrainH(P), hW = swash(q.x, uT) + swell(P, d, uT) + ripple(P, uT), D = hW - hT;   // D = 물 깊이 (h)
    float inW = smoothstep(0., .025, D), wd = clamp(D, 0., 4.);
    float body = smoothstep(.05, .55, D);   // 0 = 모래 위로 올라온 얇은 물막 · 1 = 물결이 이는 물. 빛은 이 값으로 갈린다
    float rock = rockAt(P), near = rockNear(P);
    vec2 st = .6 / vec2(textureSize(uSim, 0));   // 기억 그림은 화면보다 거칠다 — 네 점을 고르게 읽어 칸이 드러나지 않게
    vec4 sim = (texture(uSim, vUv + st) + texture(uSim, vUv - st) + texture(uSim, vUv + vec2(st.x, -st.y)) + texture(uSim, vUv + vec2(-st.x, st.y))) * .25;
    float clear = (1. - .85 * uRain) * (1. - .7 * uFog);   // 비·안개만큼 빛길·빛 그물·반짝임이 줄어든다

    // ── 1. 물결 면의 기울기 — 빛·굴절·빛 그물이 모두 이 하나를 본다
    //  큰 너울(높이의 차분) + 방향 물결 다섯 겹(surface.js — 기울기를 식으로 바로) + 돌에서 번지는 고리. 물막에서는 눕는다.
    //  잔 노이즈는 넣지 않는다: 화소보다 잔 기울기는 빛을 자글거리게 한다 (사용자 2026-11-23)
    float e = 1.5 * uU;
    float hx = surfH(P + vec2(e, 0.)) - surfH(P - vec2(e, 0.));
    float hy = surfH(P + vec2(0., e)) - surfH(P - vec2(0., e));
    float wn = vnoise(q / 23. + vec2(uT * .03, 0.));
    float chopK = uAmp * (.35 + .65 * min(uSwell, 1.));
    vec2 SL = vec2(hx, hy) / (2. * e) * uU * 26. + chopLongG(q, uT) * chopK;   // 긴 물결만 — 반사광이 본다
    vec2 S = SL + chopShortG(q, uT) * chopK;                                  // 전부 — 굴절·빛 그물·음영이 본다
    float eR = 4. * uU;
    vec2 toRock = vec2(rockNear(P + vec2(eR, 0.)) - rockNear(P - vec2(eR, 0.)), rockNear(P + vec2(0., eR)) - rockNear(P - vec2(0., eR)));
    float ringR = sin(near * 24. + uT * 1.9) * smoothstep(.04, .2, near) * (1. - smoothstep(.5, .85, near));
    S -= toRock * ringR * 1.3 * uTRipple; SL -= toRock * ringR * 1.3 * uTRipple;
    S *= mix(.15, 1., body); SL *= mix(.15, 1., body);
    vec3 N = normalize(vec3(-S.x, 1., -S.y)), Ns = normalize(vec3(-SL.x, 1., -SL.y));
    vec3 V = normalize(uCam - vec3(P.x, 0., P.y));
    vec3 Hh = normalize(uSunDir + V);

    // ── 2. 바닥: 굴절돼 보이는 젖은 모래 + 빛 그물
    //  축축함(m)은 foam.js 가 기억한다: 물이 닿으면 1, 높이 올라간 자리부터 마르고, 가장자리는 번진다. 물 밑은 늘 1 → 물가선에서 색이 이어진다
    float m = max(sim.r, inW);
    float dk = smoothstep(.04, .7, m) * (1. - rock);                    // 짙어지는 정도
    float gloss = max(smoothstep(.68, 1., sim.r), inW) * (1. - rock);   // 물기가 번들거리는 정도 — 물막과 막 젖은 자리만
    vec2 wob = (vec2(wn, vnoise(q / 19. - vec2(0., uT * .04))) - .5) * .25;   // 물속이 느리게 일렁임
    vec2 ro = (N.xz + wob) * min(wd, 1.5) * 10. * uWRefract * uU / uPlate;
    vec3 dry = texture(uGround, vUv).rgb;
    vec3 bed = texture(uGround, vUv + vec2(ro.x, -ro.y)).rgb;
    float wk = clamp(dk * uTSandWet, 0., 1.) * (1. - smoothstep(.15, .9, D));   // 깊어지면 물빛이 밝혀 준다
    bed = mix(vec3(dot(bed, vec3(.3, .59, .11))), bed, 1. + .14 * wk) * mix(vec3(1.), vec3(.72, .70, .71), wk);   // 젖은 모래는 짙고 색이 진하다
    //  빛 그물: 물결 면에서 꺾인 빛이 바닥의 어디에 닿는지 보고, 빛이 모이는 자리는 밝게 · 퍼지는 자리는 어둡게 한다 (닿는 면적의 비).
    //  무늬를 따로 그려 얹은 것이 아니라 물결에서 나온 것이라, 물결이 지나가는 대로 같이 움직인다
    float wdS = clamp(hW - sandH(d), 0., 2.);   // 돌을 뺀 깊이 (돌 가장자리에서 값이 튀지 않게)
    vec2 Lp = P - S * wdS * 6.5 * uU;
    float aP = abs(dFdx(P.x) * dFdy(P.y) - dFdx(P.y) * dFdy(P.x));
    float aL = abs(dFdx(Lp.x) * dFdy(Lp.y) - dFdx(Lp.y) * dFdy(Lp.x));
    float caus = clamp(aP / max(aL, aP * .28), .55, 2.2);   // 너무 가늘고 센 빛줄은 자글거린다 — 넓고 부드럽게
    bed *= 1. + (caus - 1.) * uCaus * .8 * clear * smoothstep(.03, .3, D) * exp(-wd * .8);

    // 거품의 무늬 (3·5 가 함께 쓴다): 잔무늬 fp 와 그물 lacy. 무늬도 물가와 함께 오르내린다 (멈춘 무늬가 비쳐 보이지 않게)
    float eNow = edgeNow(P.x);
    vec2 qf = q; qf.y -= .5 * (d < eNow ? d : eNow * surfK(d - eNow));   // 물 밖 자국은 제자리, 물속 무늬는 물가를 따라
    float fp = vnoise(qf / 6.5 + vec2(uT * .05, 0.)) * .65 + vnoise(qf / 3.1 - vec2(0., uT * .04)) * .35;
    vec2 qw = qf + (vec2(wn, vnoise(q / 17. + 4.)) - .5) * 6. + (vec2(vnoise(q / 6. + 1.3), vnoise(q / 6. + 8.1)) - .5) * 2.6;   // 그물 칸이 고르지 않게 크게·잘게 두 번 구부린다
    float clump = smoothstep(.3, .7, vnoise(q / 14. + vec2(uT * .03, 0.)));   // 군데군데는 성기고 군데군데는 메워진다 (온통 같은 그물이면 무늬처럼 보인다)
    float web = 1. - smoothstep(.02, .36, foamWeb(qw / 5.2, uT));
    float lacy = clamp(web + (fp - .5) * .7, 0., 1.);

    // ── 3. 물의 몸: 깊어질수록 붉은빛부터 사라지고 그려진 바다로 넘어간다 (깊이 0 이면 바닥 그대로)
    vec3 tr = exp(-wd * vec3(1.7, .62, .42) / uWClarity);
    vec3 col = bed * tr + uWaterCol * uWTint * (1. - tr.g) * .55;
    vec2 so = (N.xz + wob) * 6. * uWRefract * uU / uPlate;
    vec2 suv = vUv + vec2(so.x, -so.y);
    vec3 seaC = mix(mix(texture(uSeaD, suv).rgb, texture(uSeaW, suv).rgb, uArtW), texture(uSeaN, suv).rgb, uArtN);
    //  그려진 바다에는 거품이 납작한 흰 얼룩으로 그려져 있다 — 그 자리를 그물로 성기게 비워, 움직이는 거품과 같은 결로 보이게 한다
    float painted = smoothstep(.62, .85, min(seaC.r, min(seaC.g, seaC.b)));
    seaC = mix(seaC, col, painted * (1. - lacy) * .65 * clump);
    col = mix(col, seaC, 1. - exp(-wd * 1.5 * uWDeep));
    col *= mix(vec3(1.), uWTint, .4 * smoothstep(0., .3, D));   // 물빛 전체에도 색이 옅게 밴다 (늪의 초록, 빙하의 푸른빛)
    vec2 lgt = normalize(uSunDir.xz + vec2(1e-4)) * 9. * uU / uPlate;
    col *= 1. - .2 * uTShadow * smoothstep(.22, .7, texture(uRockSoft, vUv + vec2(lgt.x, -lgt.y)).r) * (1. - rock) * inW;   // 돌이 물에 드리우는 그늘

    // ── 4. 빛 — 세 겹
    //  (가) 젖은 면의 비침: 물막과 번들거리는 젖은 모래가 같은 식 → 물이 올라와도 빛이 튀지 않고 이어진다
    //  (나) 물결의 음영: 빛을 향한 물결 면은 밝고 등진 면은 어둡다 → 물결의 모양이 보인다
    //  (다) 반사광: 잔 점이 아니라 물결 면 하나하나에 맺히는 크고 느린 빛 조각. 심과 번짐 두 단으로 끊는다 (그림풍)
    float F = .02 + .98 * pow(1. - max(dot(N, V), 0.), 5.);
    col = mix(col, uSkyCol, clamp(mix(.16 * uTSandMirror, F * .5 * uWSky, body) * gloss, 0., 1.));
    vec3 Lk = normalize(vec3(-.45, .75, -.5));   // 물결의 음영을 보는 빛 (뭍 쪽 위에서 비스듬히)
    col *= 1. + clamp((dot(N, Lk) / Lk.y - 1.) * .5, -.14, .16) * body;
    float path = mix(pow(max(Hh.y, 0.), uPath), pow(max(dot(Ns, Hh), 0.), uPath), body);   // 빛길: 평평한 면 → 물결 면
    float sheen = path * uGlow * mix(1.2, .8, body) * gloss;
    float lobe = pow(max(dot(Ns, Hh), 0.), uShine);
    float core = smoothstep(.55, .88, lobe), halo = smoothstep(.2, .6, lobe);
    float calmW = .45 + .55 * min(uSwell, 1.);   // 잔잔한 물(호수·연못)은 빛 조각도 옅다
    col += uSunCol * ((core * .55 * calmW + halo * .16 * uWSparkle) * uSpec * body + sheen) * clear;

    // ── 5. 거품: 흐름에 실려 다닌 거품(① foam.js 의 기억)을 얹는다. 잔무늬도 물가와 함께 오르내린다 (멈춘 무늬가 비쳐 보이지 않게)
    //  물가선 바로 안쪽의 가는 띠 — 한결같은 흰 줄이 아니라, 올라올 때는 진하고 빠질 때는 옅게, 물가를 따라 군데군데 끊긴다
    float line = (1. - smoothstep(0., .07, D)) * inW * (.3 + .7 * smoothstep(.1, .6, sim.g)) * (.55 + .45 * vnoise(vec2(q.x / 8., uT * .25)));
    float rho = ((sim.g + line * .8) * mix(uWLace * .75, uWFoam, inW) + (sim.b * uWCrest + sim.a * uTFoam * (.35 + .65 * min(uWFoam, 1.))) * inW) * (1. - rock);
    //  거품의 두께(rho)에 따라 세 겹: 뿌연 물(공기가 섞인 옅은 겹) → 그물(방울이 맞닿은 금) → 두꺼운 곳은 구멍이 메워진다.
    //  스러질 때는 한꺼번에 옅어지지 않고 구멍이 커지며 가닥만 남다 사라진다
    float fill = smoothstep(.5, 1.05, rho);
    float haze = smoothstep(.06, .6, rho) * .26;
    float foam = smoothstep(.1, .55, rho * (.5 + .8 * fp)) * mix(lacy, 1., max(fill, (1. - clump) * .6));
    col = mix(col, mix(uFoamCol, col, .25), haze);
    col = mix(col, uFoamCol, foam * (.72 + .22 * fill));

    // 비: 물 위 곳곳에 빗방울 파문이 번갈아 퍼진다 (칸마다 하나, 저마다 다른 박자. 위에서 보므로 둥글다)
    if (uRain > 0.) {
      float rs = 30. * uU;
      for (int k = 0; k < 2; k++) {
        vec2 gp = P / rs + float(k) * vec2(.5, .37), gi = floor(gp);
        float h1 = hash21(gi + float(k) * 7.1), h2 = hash21(gi + 3.3 + float(k));
        vec2 c = (gi + .2 + .6 * vec2(h1, h2)) * rs - float(k) * vec2(.5, .37) * rs;
        float ph = fract(uT * (.55 + .4 * h1) + h2), r = ph * 11. * uU, dl = length(P - c);
        float ring = (1. - smoothstep(0., 1.3 * uU, abs(dl - r))) * (1. - ph) * step(.25, h1);
        float ring2 = (1. - smoothstep(0., uU, abs(dl - r * .55))) * (1. - ph) * .6 * step(.25, h1) * step(.3, ph);
        col += (ring + ring2) * .3 * uRain * uFoamCol * inW;
      }
    }

    // ── 6. 돌(지형 모듈): 가장자리를 부드럽게 다시 얹는다. 물에 닿는 아랫부분은 젖어 짙다
    float rawR = rockRaw(P), rk = smoothstep(.5 - .17 * uTSoft, .5 + .17 * uTSoft, rawR);
    float inSea = smoothstep(-.25, .1, hW - sandH(d));   // 돌이 없다고 쳤을 때 물에 잠기는 자리인가
    vec3 rockC = dry * (1. - clamp(.17 * uTWet, 0., .5) * inSea * (1. - smoothstep(.55, .95, rawR)));
    col = mix(col, rockC, rk);

    // ── 7. 날씨: 비 오는 날의 회청 톤 · 안개(천천히 흐르는 큰 무늬 두 겹, 물 쪽이 조금 더 짙다)
    if (uRain > 0.) col = mix(col, vec3(dot(col, vec3(.3, .59, .11))) * vec3(.9, .95, 1.02), .3 * uRain) * (1. - .12 * uRain);
    if (uFog > 0.) {
      float fz = vnoise(q / 90. + vec2(uT * .02, 0.)) * .6 + vnoise(q / 37. - vec2(uT * .035, uT * .01)) * .4;
      col = mix(col, uFogCol, uFog * clamp(.3 + .75 * fz + .2 * inW, 0., 1.) * .8);
    }
    if (uDebug == 1) col = D > 0. ? vec3(0., D * .35, .4 + D * .3) : vec3(.5 + D * .2);
    if (uDebug == 2) col = vec3(sim.r * .5 + sim.b, sim.g, inW * .4 + sim.a);
    gl_FragColor = vec4(col, 1.);
  }
`;
