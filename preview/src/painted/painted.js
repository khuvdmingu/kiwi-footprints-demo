// painted/painted.js — 그림 모드: 모래·뭍은 일러스트 그대로, 키위는 발자국으로 글씨를 쓰고, 물만 새로 그린다
//  사용자 2026-11-25
//   "2d와 3d를 절묘하게 조합" → "새로운 모드처럼" → "한번 만들어보자"
//   → "키위 발자국은 이전처럼 하되, 물 퀄리티만 높이는 방향" → "내가 줫던 레퍼런스처럼 느낌이잇어야해"
//  레퍼런스(해변 샌드박스 게임 영상)의 물: 얕은 물이 아주 맑아 모래 바닥과 빛 그물이 또렷하고, 깊어질수록 청록 → 짙은 파랑,
//  너울이 빛을 받아 밝고 어두운 띠로 밀려오며, 앞머리에 굵고 흰 거품, 빠진 자리엔 젖어 번들거리는 모래와 가는 거품 줄.
//
//  나눈 일
//   · 모래 · 뭍 · 바위 = 그림(물 뺀 판). 모래 높이는 그림에서 만들어 고정 (src/painted/base.js) — 물이 그 모양을 따라 흐른다
//   · 물 = 공용 시뮬레이션(src/sandsim, 모래 고정)으로 흐르고, 색은 그림에서 뽑은 얕은·중간·깊은 물 세 빛깔로 새로 그린다
//     (그림 속 바다를 그대로 붙이면 너울·거품이 그림에 박혀 움직이지 않는다)
//   · 발자국 = 찍힌 자국 그림(marks) — 물이 닿은 자리부터 스러진다. 해 쪽으로 눌린 자국의 그늘만 더한다
import * as THREE from 'three';
import { Sim } from '../sandsim/sim.js?v=pv-7441cb8';
import { loadPlate } from '../plate.js?v=pv-7441cb8';
import { MAPS } from '../maps.js?v=pv-7441cb8';
import { makeWaveSlopes, WAVE_TEX } from '../beach3d/water/normals.js?v=pv-7441cb8';
import { layoutText, strokesOf } from '../hangul.js?v=pv-7441cb8';
import { PB, gridOf, shoreFn, buildBase, pixelsOf, sandH } from './base.js?v=pv-7441cb8';

const VERT = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const GRID_GLSL = (g) => /* glsl */`
  const vec2 GRID = vec2(${g.nx}., ${g.nz}.);
  const float CELL = ${g.cell};
  vec4 at(sampler2D t, ivec2 p) { return texelFetch(t, clamp(p, ivec2(0), ivec2(GRID) - 1), 0); }
  vec4 bilin(sampler2D t, vec2 uv) {
    vec2 q = uv * GRID - .5; ivec2 i = ivec2(floor(q)); vec2 r = q - floor(q);
    return mix(mix(at(t, i), at(t, i + ivec2(1, 0)), r.x), mix(at(t, i + ivec2(0, 1)), at(t, i + ivec2(1, 1)), r.x), r.y);
  }
`;

//  공간감 (사용자 2026-11-25 "해변에서 물부분부터 공간감을 넣어서 … 돌이나 이런것도 부딫치잖아 레퍼는"):
//  판을 높이 있는 면으로 — 모래·바위는 처음 땅 높이만큼, 물은 물 면 + 너울 높이만큼 솟고, 카메라는 비스듬히 내려다본다
const SWELL_GLSL = /* glsl */`
  float swellPh(vec2 xz, float t) { return xz.y * 1.15 + t * 1.9 + .6 * sin(xz.x * .17 + t * .2) + .3 * sin(xz.x * .41 - 1.3); }
`;
const DISP_VERT = (g) => GRID_GLSL(g) + SWELL_GLSL + /* glsl */`
  uniform sampler2D uS; uniform float uT, uHS;
  varying vec2 vUv;
  void main() {
    vUv = uv; vec2 s = vec2(uv.x, 1. - uv.y); vec4 st = bilin(uS, s); vec2 xz = s * GRID * CELL;
    float h = st.r;
    if (st.g > .002) h += st.g + .28 * sin(swellPh(xz, uT)) * smoothstep(.25, 1.2, st.g);
    vec3 p = position; p.y = h * uHS;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  }`;

// 물보라: 바위 면(처음 땅이 가파르게 솟는 곳) 둘레의 점마다 알갱이 몇 개 — 물이 들이치는 세기(V.a)만큼 튀어 올랐다 떨어진다
const SPRAY_VERT = (g) => GRID_GLSL(g) + /* glsl */`
  uniform sampler2D uS, uV; uniform float uT, uHS, uPx;
  attribute vec2 aEm; attribute vec2 aDir; attribute float aSeed;
  varying float vA;
  void main() {
    vec2 s = vec2(aEm.x / float(${g.wx}) + .5, aEm.y / float(${g.wz}) + .5);
    float hit = bilin(uV, s).a, vis = smoothstep(.08, .5, hit);
    float t = fract(uT * .85 + aSeed * 7.13), sp = .6 + fract(aSeed * 13.7) * .9;
    vec2 side = vec2(-aDir.y, aDir.x) * (fract(aSeed * 31.7) - .5) * 1.4;
    vec2 xz = aEm + (aDir * .8 + side) * t * sp;
    vec4 st = bilin(uS, s);
    float y = (st.r + st.g + .05) * uHS + (3.4 * sp * t - 3.6 * t * t) * uHS;
    vec4 mv = modelViewMatrix * vec4(xz.x, y, xz.y, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPx * (.3 + .35 * fract(aSeed * 5.3)) * (1. - .45 * t) / -mv.z * step(.01, vis);
    vA = vis * (1. - t * t);
  }`;
const SPRAY_FRAG = /* glsl */`
  uniform vec3 uSky, uSunCol;
  varying float vA;
  void main() { float d = length(gl_PointCoord - .5); float a = (1. - smoothstep(.12, .5, d)) * vA; if (a < .01) discard;
    gl_FragColor = vec4(uSky * .45 + uSunCol * .8, a);
    #include <colorspace_fragment>
  }`;

// 발자국 그림: 지난 자국 × (물이 닿으면 스러짐) + 새로 찍은 자국
const MARKS_FRAG = (g) => GRID_GLSL(g) + /* glsl */`
  uniform sampler2D uPrev, uStamp, uS; uniform float uDt;
  varying vec2 vUv;
  void main() {
    float w = bilin(uS, vec2(vUv.x, 1. - vUv.y)).g;
    float m = texture(uPrev, vUv).r * exp(-uDt * 7. * smoothstep(.003, .02, w));
    gl_FragColor = vec4(max(m, texture(uStamp, vUv).a), 0., 0., 1.);
  }`;

const FRAG = (g) => GRID_GLSL(g) + SWELL_GLSL + /* glsl */`
  uniform sampler2D uS, uV, uDry, uWave, uArt, uMarks, uBase, uRockM;
  uniform float uT, uShowArt, uArtDeep;
  uniform vec2 uMarkPx;
  uniform vec3 uSun, uSunCol, uSky, uPalS, uPalM, uPalD, uFoamCol;
  varying vec2 vUv;
  float Ws(vec2 s) { vec4 v = bilin(uS, s); return v.r + v.g; }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  vec2 wave(vec2 uv, float b) { return (texture(uWave, uv, b).rg - .5) * 6.; }
  void main() {
    if (uShowArt > .5) { gl_FragColor = vec4(texture(uArt, vUv).rgb, 1.);
      #include <colorspace_fragment>
      return; }
    vec2 s = vec2(vUv.x, 1. - vUv.y);   // 격자 칸 (첫 줄 = 판 위쪽 = 뭍)
    vec4 st = bilin(uS, s), vv = bilin(uV, s);
    float w = st.g;
    vec2 xz = s * GRID * CELL;
    // ── 모래 (그림 그대로) + 발자국 + 젖음
    vec3 col = texture(uDry, vUv).rgb;
    vec2 toSun = normalize(vec2(uSun.x, -uSun.z) + 1e-4) * uMarkPx;
    float mk = texture(uMarks, vUv).r, mkS = texture(uMarks, vUv + toSun * 1.4).r;
    col *= 1. - .22 * mk - .38 * max(mkS - mk, 0.) + .16 * max(mk - mkS, 0.);   // 눌린 자국: 해 쪽 벽은 그늘, 반대쪽 벽은 빛
    float under = smoothstep(.0, .012, w), wet = max(smoothstep(.05, 1., min(st.a, 1.)) * .85, under);
    col *= mix(vec3(1.), vec3(.7, .67, .66), wet);
    float fresh = smoothstep(.75, 1., st.a) * (1. - under);   // 막 물이 빠진 자리 — 하늘이 비쳐 번들거린다
    col = mix(col, col * .9 + uSky * .16, fresh * .7);
    // ── 물
    //  돌 둘레: 번진 바위 가림막 + 처음 땅이 가파르게 솟는 곳 (모래 비탈은 완만하다) — 흰 테두리처럼 보이던 거품·하늘 비침을 줄인다
    float bs = 0.; vec2 e2 = 2.5 / GRID;
    for (int k = 0; k < 5; k++) { vec2 o = k == 0 ? vec2(0.) : k == 1 ? vec2(e2.x, 0.) : k == 2 ? vec2(-e2.x, 0.) : k == 3 ? vec2(0., e2.y) : vec2(0., -e2.y);
      vec2 q = s + o, ee = 1. / GRID; bs = max(bs, length(vec2(bilin(uBase, q + vec2(ee.x, 0.)).r - bilin(uBase, q - vec2(ee.x, 0.)).r, bilin(uBase, q + vec2(0., ee.y)).r - bilin(uBase, q - vec2(0., ee.y)).r)) / (2. * CELL)); }
    float rockish = max(smoothstep(.15, .55, texture(uRockM, vUv, 3.).a), smoothstep(.18, .45, bs));
    vec2 e = 1. / GRID;
    vec2 sl = vec2(Ws(s + vec2(e.x, 0.)) - Ws(s - vec2(e.x, 0.)), Ws(s + vec2(0., e.y)) - Ws(s - vec2(0., e.y))) / (2. * CELL);
    vec2 rp = (wave(xz / 6.5 + uT * vec2(.014, .04), 1.2) * .6 + wave(mat2(.8, .6, -.6, .8) * xz / 3.9 + uT * vec2(-.025, .03), 1.2) * .45) * .055 * smoothstep(.0, .25, w);
    // 바다에서 밀려오는 너울 띠 (깊은 물일수록) — 레퍼런스처럼 물마루가 빛을 받아 밝고 어두운 띠로 다가온다
    float deepK = smoothstep(.25, 1.2, w);
    float ph = swellPh(xz, uT);
    vec2 swell = vec2(.06 * cos(xz.x * .17 + uT * .2) * cos(ph), -cos(ph)) * .32 * deepK;
    vec2 slope = sl * 2.2 + rp + swell;
    vec3 n = normalize(vec3(-slope.x, 1., -slope.y));
    if (w > .0015) {
      vec2 off = n.xz * min(w, .8) * .014;
      vec3 bed = texture(uDry, vUv + vec2(off.x, -off.y)).rgb * vec3(.74, .71, .69);
      float mb = texture(uMarks, vUv + vec2(off.x, -off.y)).r; bed *= 1. - .25 * mb;
      // 바닥의 빛 그물 — 얕을수록 또렷하다 (레퍼런스의 맑은 물)
      vec2 cs = wave(xz / 4.6 + uT * vec2(.03, .05), .6) + wave(mat2(.8, .6, -.6, .8) * xz / 3.1 - uT * vec2(.04, .015), .6);
      float caus = pow(max(0., 1. - length(cs) * .38), 3.);
      bed *= 1. + 1.1 * caus * (1. - smoothstep(.08, .9, w));
      // 깊이 빛깔: 얕은 → 중간 → 깊은 (그림에서 뽑은 세 빛깔)
      //  물빛은 지금 물 깊이와 그림의 바다 깊이(물가선에서 멀어질수록 깊다 = 처음 땅이 낮다) 중 깊은 쪽을 따른다
      float dc = max(w, -bilin(uBase, s).r * 1.4);
      vec3 body = mix(mix(uPalS, uPalM, smoothstep(.05, .45, dc)), uPalD, smoothstep(.5, 1.7, dc));
      float op = 1. - exp(-w * 2.3);                       // 얕은 물은 맑다
      vec3 wc = mix(bed, body, .28 + .72 * op);   // 맑은 얕은 물: 바닥 위에 물빛을 덮는다 (곱하면 주황 모래 × 청록 = 올리브)
      wc = mix(wc, texture(uArt, vUv).rgb, uArtDeep * smoothstep(1.1, 1.7, w));   // 아주 깊은 곳엔 그림 붓결을 조금
      // 너울의 빛과 그늘 · 비탈에 비친 하늘 · 해 반짝임 (위에서 내려다본다)
      wc *= clamp(1. + 3. * (dot(n, uSun) - uSun.y), .66, 1.42);   // 빛 쪽 비탈은 밝고 반대쪽은 짙다 (너무 까매지지 않게 묶는다)
      wc += uSky * .1 * smoothstep(.35, .9, length(sl * 2.2 + rp)) * (1. - rockish);   // 가파르게 선 물마루에만 하늘이 비친다 (너울 띠는 빼고 — 물 전체가 허옇게 됐다)
      vec3 R = reflect(-uSun, n);
      wc += uSunCol * pow(max(R.y, 0.), 140.) * .45 * (1. - .7 * rockish);
      col = mix(col, wc, smoothstep(.0015, .008, w));
    }
    // ── 거품: 흐름에 실린 거품(레이스 · 구멍 숭숭) — 물이 빠진 모래 위에도 잠깐 줄로 남는다
    vec2 fw = xz + vv.rg * .1;
    float pat = vnoise(fw * 2.4 + uT * .1) * .55 + vnoise(fw * 7. - uT * .08) * .3 + vnoise(fw * 16.) * .15;
    float fa = clamp(vv.b, 0., 1.2);
    //  부서지는 물마루: 물가 가까운 얕은 바다(처음 땅 -0.25 ~ -0.9)에서 너울 마루가 흰 줄로 부서지며 밀려온다 (레퍼런스)
    float h0 = bilin(uBase, s).r, brk = smoothstep(-.62, -.4, h0) * (1. - smoothstep(-.26, -.1, h0));
    float crest = smoothstep(.86, .995, sin(ph)) * smoothstep(.35, .7, vnoise(vec2(xz.x * .45, ph * .3)));   // 가늘고, 군데군데 끊긴다
    fa = max(fa, crest * brk * .6 * (1. - rockish));
    fa = max(fa, smoothstep(.2, .9, vv.a));   // 연하게 — 구멍 난 거품 무늬가 비치도록
    float fm = smoothstep(.22, .6, fa * (.35 + .95 * pat));
    fm *= mix(.75, 1., under);
    fm = max(fm, (1. - smoothstep(.003, .018, w)) * under * smoothstep(.5, .72, pat) * .6 * (1. - rockish));   // 물 가장자리 가는 줄
    fm *= 1. - .85 * rockish * (1. - smoothstep(.15, .7, vv.a));   // 고요할 땐 흰 테두리를 막고, 물이 바위로 들이칠 땐 거품이 감긴다 (레퍼런스)
    col = mix(col, uFoamCol * (uSky * .45 + uSunCol * .7), fm);
    gl_FragColor = vec4(col, 1.);
    #include <colorspace_fragment>
  }`;

export class Painted {
  constructor(canvas, { base = 'assets/', map = 'beach' } = {}) {
    this.base = base; this.mapId = map;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x1d2228);
    this.tool = 'walk'; this.path = []; this.t = 0; this.frameN = 0; this.paused = false; this.stepLeft = 0; this.side = 1;
  }
  async load() {
    const m = MAPS[this.mapId], loadImg = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = this.base + src; });
    const plate = this.plate = await loadPlate(this.base, m.wide, { stones: !!m.stones, shoreFrom: m.shoreFrom, ground: m.ground, tone: !!m.tone, shoreFix: m.shoreFix?.wide, moss: !!m.moss, art: m.art !== false, rockFill: !!m.rockFill, rockArt: m.rockArt !== false, curve: !!m.curve });
    const g = this.g = gridOf(plate.pw, plate.ph);
    this.shoreZ = shoreFn(plate.shoreP, plate.pw, plate.ph, g);
    const rock25 = await loadImg(m.wide + '-rock25.webp?v=pv-7441cb8').then(im => pixelsOf(im, g.nx, g.nz)).catch(() => null);
    const rockA = plate.rockArt ? pixelsOf(plate.rockArt, g.nx, g.nz) : null;
    this.baseArr = buildBase(g, this.shoreZ, { rock25, rockA });
    this.palette(pixelsOf(plate.img, g.nx, g.nz), rockA);
    this.sim = new Sim(this.renderer, g, this.baseArr); this.sim.freezeSand(); this.sim.setFoam(1.1, 1.6);
    const tex = (im) => { const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };
    const wt = this.waveTex = new THREE.DataTexture(makeWaveSlopes(), WAVE_TEX, WAVE_TEX);
    wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.generateMipmaps = true; wt.minFilter = THREE.LinearMipmapLinearFilter; wt.magFilter = THREE.LinearFilter; wt.needsUpdate = true;
    this.makeMarks();
    const C = (c) => ({ value: c });
    this.u = {
      uS: C(this.sim.state), uV: C(this.sim.vel), uBase: C(this.sim.baseTex), uRockM: C(this.rockTex(plate)), uDry: C(tex(plate.dry)), uArt: C(tex(plate.img)), uWave: C(wt), uMarks: C(this.marks[0].texture),
      uT: C(0), uShowArt: C(0), uArtDeep: C(0.25), uMarkPx: C(new THREE.Vector2(1 / this.MW, 1 / this.MH)),
      uSun: C(new THREE.Vector3(0.45, 0.78, -0.45).normalize()), uSunCol: C(new THREE.Color(1.0, 0.97, 0.9)), uSky: C(new THREE.Color(0.78, 0.9, 0.95)),
      uPalS: C(this.pal[0]), uPalM: C(this.pal[1]), uPalD: C(this.pal[2]), uFoamCol: C(new THREE.Color(1, 1, 1)),
    };
    this.u.uHS = C(1.6);   // 높이 배율 — 공간감 (그림이 그려진 시점에 맞춰 너무 크지 않게)
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(g.wx, g.wz, g.nx - 1, g.nz - 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: DISP_VERT(g), fragmentShader: FRAG(g), uniforms: this.u }));
    this.ground.frustumCulled = false; this.scene.add(this.ground);
    this.camera = new THREE.PerspectiveCamera(26, 16 / 9, 1, 400); this.tilt = 0.5;   // 비스듬히 (수직에서 약 29°)
    this.makeSpray();
    this.makeKiwi();
    return this;
  }
  rockTex(plate) {   // 바위 가림막 (번지게 읽으려고 밉맵)
    if (!plate.rockArt) { const t = new THREE.DataTexture(new Uint8Array(4), 1, 1); t.needsUpdate = true; return t; }
    const t = new THREE.Texture(plate.rockArt); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t;
  }
  // 그림 속 바다에서 세 빛깔 뽑기: 물가선 아래 얕은 띠 · 중간 띠 · 깊은 띠의 평균 (바위 자리는 뺀다)
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
      const c = new THREE.Color().setRGB(sum[0] / n / 255, sum[1] / n / 255, sum[2] / n / 255, THREE.SRGBColorSpace), hsl = {};
      c.getHSL(hsl); return c.setHSL(hsl.h, Math.min(1, hsl.s * 1.35), hsl.l);   // 그림 빛깔 그대로에 채도만 조금 (레퍼런스의 선명한 청록)
    });
  }
  // 발자국: 2D 캔버스에 찍고(새 자국만) → 그래픽 카드의 자국 그림에 더한다. 물이 닿은 자국은 거기서 스러진다
  makeMarks() {
    const g = this.g; this.MW = 2048; this.MH = Math.round(2048 * g.wz / g.wx);
    const rt = () => new THREE.WebGLRenderTarget(this.MW, this.MH, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    this.marks = [rt(), rt()];
    this.stampCv = document.createElement('canvas'); this.stampCv.width = this.MW; this.stampCv.height = this.MH;
    this.stampG = this.stampCv.getContext('2d'); this.stampTex = new THREE.CanvasTexture(this.stampCv); this.stampTex.flipY = true; this.stampDirty = true;
    this.markMat = new THREE.ShaderMaterial({ vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`, fragmentShader: MARKS_FRAG(g),
      uniforms: { uPrev: { value: null }, uStamp: { value: this.stampTex }, uS: { value: null }, uDt: { value: 0 } }, depthTest: false, depthWrite: false });
    this.markScene = new THREE.Scene(); this.markScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.markMat)); this.markCam = new THREE.Camera();
  }
  // 키위 발자국 하나: 앞으로 뻗은 세 발가락 + 짧은 뒤꿈치 (세계 좌표 · 걷는 방향 ang)
  print(x, z, ang) {
    const g = this.g, c = this.stampG, k = this.MW / g.wx, px = (x / g.wx + 0.5) * this.MW, pz = (z / g.wz + 0.5) * this.MH, L = 0.2 * k;
    c.save(); c.translate(px, pz); c.rotate(ang); c.strokeStyle = 'rgba(0,0,0,1)'; c.lineCap = 'round'; c.lineWidth = 0.055 * k;
    c.beginPath();
    for (const a of [-0.55, 0, 0.55]) { c.moveTo(0, 0); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); }
    c.moveTo(0, 0); c.lineTo(-L * 0.35, 0);
    c.stroke(); c.restore(); this.stampDirty = true;
  }
  // 걸은 길을 따라 발자국을 번갈아 찍는다
  stepAlong(x0, z0, x1, z1) {
    const d = Math.hypot(x1 - x0, z1 - z0); if (d < 1e-4) return;
    const ux = (x1 - x0) / d, uz = (z1 - z0) / d, ang = Math.atan2(uz, ux), gap = 0.24;
    let t = this.stepLeft;
    while (t <= d) { this.side = -this.side; this.print(x0 + ux * t - uz * 0.07 * this.side, z0 + uz * t + ux * 0.07 * this.side, ang); t += gap; }
    this.stepLeft = t - d;
  }
  makeKiwi() {
    const tex = new THREE.TextureLoader().load(this.base + 'kiwi.webp?v=pv-7441cb8', t => { t.colorSpace = THREE.SRGBColorSpace; this.kiwi.scale.set(2.3 * t.image.width / t.image.height, 2.3, 1); });
    this.kiwi = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    this.kiwi.center.set(0.5, 0.12); this.kiwi.scale.set(2.3, 2.3, 1); this.kiwi.renderOrder = 3;
    this.kiwiShadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a2a1a, transparent: true, opacity: 0.25, depthTest: false }));
    this.kiwiShadow.scale.set(1.4, 1, 0.6); this.kiwiShadow.renderOrder = 2;
    this.scene.add(this.kiwi, this.kiwiShadow);
    this.kp = new THREE.Vector2(-this.g.wx * 0.3, this.shoreZ(-this.g.wx * 0.3) - 5); this.kdir = 1; this.kwalk = 0;
  }
  // 물보라 점: 바위 면 둘레 칸 (처음 땅이 가파르게 솟고, 물가선 바다 쪽)
  makeSpray() {
    const g = this.g, B = this.baseArr, em = [];
    for (let j = 1; j < g.nz - 1; j += 2) for (let i = 1; i < g.nx - 1; i += 2) {
      const k = j * g.nx + i, gx = (B[k + 1] - B[k - 1]) / (2 * g.cell), gz = (B[k + g.nx] - B[k - g.nx]) / (2 * g.cell), gl = Math.hypot(gx, gz);
      const x = (i + 0.5) * g.cell - g.wx / 2, z = (j + 0.5) * g.cell - g.wz / 2;
      if (gl > 0.35 && B[k] < 0.75 && z > this.shoreZ(x) - 1.5) em.push([x, z, -gx / gl, -gz / gl]);
    }
    const per = 10, cnt = Math.min(em.length, 520), n = cnt * per, pos = new Float32Array(n * 3), aEm = new Float32Array(n * 2), aDir = new Float32Array(n * 2), aSeed = new Float32Array(n);
    const step = em.length / Math.max(1, cnt);
    for (let q = 0; q < n; q++) { const e = em[Math.floor(Math.floor(q / per) * step)]; aEm.set([e[0], e[1]], q * 2); aDir.set([e[2], e[3]], q * 2); aSeed[q] = ((q * 0.6180339) % 1 + (q % per) * 0.137) % 1; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aEm', new THREE.BufferAttribute(aEm, 2));
    geo.setAttribute('aDir', new THREE.BufferAttribute(aDir, 2)); geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    this.u.uPx = { value: 600 };
    this.spray = new THREE.Points(geo, new THREE.ShaderMaterial({ vertexShader: SPRAY_VERT(this.g), fragmentShader: SPRAY_FRAG, uniforms: this.u, transparent: true, depthWrite: false }));
    this.spray.frustumCulled = false; this.spray.renderOrder = 4; this.scene.add(this.spray); this.sprayN = em.length;
  }
  baseAt(x, z) { const g = this.g, i = Math.max(0, Math.min(g.nx - 1, Math.floor(x / g.cell + g.nx / 2))), j = Math.max(0, Math.min(g.nz - 1, Math.floor(z / g.cell + g.nz / 2))); return this.baseArr[j * g.nx + i]; }
  setWave(k) { this.sim.u.uWave.value = 0.75 * k; }
  showArt(on) { this.u.uShowArt.value = on ? 1 : 0; }
  reset() { this.sim.reset(); this.path = []; const r = this.renderer.getRenderTarget(); for (const t of this.marks) { this.renderer.setRenderTarget(t); this.renderer.clear(); } this.renderer.setRenderTarget(r); }
  // 키위가 발자국으로 글씨를 쓴다 — 물가선 조금 위 마른 모래에
  write(text, { size = 3.2 } = {}) {
    const lay = layoutText(text, { maxWidth: this.g.wx * 0.7 / size }), z = this.shoreZ(0) - 3.8;
    const strokes = strokesOf(lay, { x: -lay.width * size / 2, y: z - lay.height * size / 2, size });
    for (const s of strokes) { this.path.push({ dig: false, pts: [s.pts[0]] }); this.path.push({ dig: true, pts: s.pts }); }
    this.path.push({ dig: false, pts: [[lay.width * size / 2 + 3, z + 1]] });
  }
  walk(dt) {
    let left = (this.path[0]?.dig ? 3.4 : 6.5) * dt; const p = this.kp;
    while (left > 0 && this.path.length) {
      const seg = this.path[0], tgt = seg.pts[0], dx = tgt[0] - p.x, dz = tgt[1] - p.y, d = Math.hypot(dx, dz);
      if (Math.abs(dx) > 0.02) this.kdir = dx > 0 ? 1 : -1;
      if (d <= left) { if (seg.dig && seg.started) this.stepAlong(p.x, p.y, tgt[0], tgt[1]); else this.stepLeft = 0; p.set(tgt[0], tgt[1]); left -= d; seg.started = true; seg.pts.shift(); if (!seg.pts.length) this.path.shift(); }
      else { const nx = p.x + dx / d * left, nz = p.y + dz / d * left; if (seg.dig && seg.started) this.stepAlong(p.x, p.y, nx, nz); p.set(nx, nz); left = 0; }
    }
    this.kwalk = this.path.length ? this.kwalk + dt : 0;
  }
  bind(cv) {
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const pick = (e) => {   // 화면 점 → 판 위 점 (높이 있는 면이라 몇 번 맞춘다)
      const b = cv.getBoundingClientRect(); ndc.set((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera); const o = ray.ray.origin, d = ray.ray.direction; let y = 0, x = 0, z = 0;
      for (let i = 0; i < 5; i++) { const t = (y - o.y) / d.y; x = o.x + d.x * t; z = o.z + d.z * t; y = Math.max(0, this.baseAt(x, z)) * this.u.uHS.value; }
      return Math.abs(x) < this.g.wx / 2 && Math.abs(z) < this.g.wz / 2 ? [x, z] : null;
    };
    let drag = null;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); const p = pick(e); if (!p) return; drag = { p }; this.stepLeft = 0; });
    cv.addEventListener('pointermove', e => { if (!drag) return; const p = pick(e); if (!p) return; if (Math.hypot(p[0] - drag.p[0], p[1] - drag.p[1]) < 0.05) return;
      this.stepAlong(drag.p[0], drag.p[1], p[0], p[1]); drag.p = p; });
    const up = () => { drag = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }
  // 비스듬히 내려다보는 카메라 — 판 전체가 화면에 들어오게 거리를 잡는다
  resize(w, h, dpr) {
    if (dpr) this.renderer.setPixelRatio(dpr); this.renderer.setSize(w, h, false);
    const c = this.camera, g = this.g; c.aspect = w / h; c.updateProjectionMatrix();
    const tv = Math.tan(c.fov * Math.PI / 360), th = tv * c.aspect;
    const D = Math.max(g.wx / 2 / th, (g.wz / 2) * Math.cos(this.tilt) / tv + (g.wz / 2) * Math.sin(this.tilt)) * 1.02;
    c.position.set(0, D * Math.cos(this.tilt), 0.6 + D * Math.sin(this.tilt)); c.lookAt(0, 0, 0.6);
    this.u.uPx.value = h * this.renderer.getPixelRatio() / (2 * tv);
  }
  frame(dt) {
    this.t += dt; this.frameN++;
    if (!this.paused) this.sim.step(dt);
    this.walk(dt);
    // 자국 그림: 지난 자국을 물에 스러지게 하고 새 자국을 더한다
    const mm = this.markMat.uniforms; mm.uPrev.value = this.marks[0].texture; mm.uS.value = this.sim.state; mm.uDt.value = this.paused ? 0 : dt;
    if (this.stampDirty) { this.stampTex.needsUpdate = true; }
    this.renderer.setRenderTarget(this.marks[1]); this.renderer.render(this.markScene, this.markCam); this.marks.reverse();
    if (this.stampDirty) { this.stampG.clearRect(0, 0, this.MW, this.MH); this.stampDirty = false; this.stampClear = true; }
    else if (this.stampClear) { this.stampTex.needsUpdate = true; this.stampClear = false; }
    const bob = this.kwalk ? Math.abs(Math.sin(this.kwalk * 11)) * 0.12 : 0;
    this.kiwi.position.set(this.kp.x, Math.max(0, this.baseAt(this.kp.x, this.kp.y)) * this.u.uHS.value + bob, this.kp.y); this.kiwi.scale.x = Math.abs(this.kiwi.scale.x) * (this.kdir < 0 ? -1 : 1);
    this.kiwiShadow.position.set(this.kp.x + 0.2, Math.max(0, this.baseAt(this.kp.x, this.kp.y)) * this.u.uHS.value + 0.03, this.kp.y + 0.05);
    this.u.uT.value = this.sim.t; this.u.uS.value = this.sim.state; this.u.uV.value = this.sim.vel; this.u.uMarks.value = this.marks[0].texture;
    this.renderer.setRenderTarget(null); this.renderer.render(this.scene, this.camera);
  }
  start() { let last = performance.now(), acc = 0, n = 0; const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; this.frame(dt); acc += dt; n++; if (acc > 1) { this.fps = Math.round(n / acc); acc = 0; n = 0; } this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  stop() { cancelAnimationFrame(this.raf); }
}
export { sandH, PB };
