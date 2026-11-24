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
import { Sim } from '../sandsim/sim.js?v=pv-7441cb8';
import { makeWaveSlopes, WAVE_TEX } from '../beach3d/water/normals.js?v=pv-7441cb8';
import { PB, gridOf, shoreFn, buildBase, pixelsOf, sandH, sandOnlyBase, rockLight } from './base.js?v=pv-7441cb8';

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

const VERT = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const FRAG = (g) => GRID_GLSL(g) + /* glsl */`
  uniform sampler2D uS, uV, uBase, uDry, uWave, uRockL, uRockM;
  uniform sampler2D uArt, uSeaP, uEdgeOff;   // 원래 그림 · 바위 지운 바다 판 · 칸 줄마다 물가선이 그려진 물가선에서 밀린 거리(세계, + = 바다 쪽)
  float edgeOff(float x) { float f = x * GRID.x - .5; int i = int(floor(f)); float r = f - floor(f);
    return mix(texelFetch(uEdgeOff, ivec2(clamp(i, 0, int(GRID.x) - 1), 0), 0).r, texelFetch(uEdgeOff, ivec2(clamp(i + 1, 0, int(GRID.x) - 1), 0), 0).r, r); }
  uniform float uT, uRain, uFog;
  uniform vec3 uSun, uSunCol, uSky, uPalS, uPalM, uPalD, uFoamCol;
  varying vec2 vUv;
  float Ws(vec2 s) { vec4 v = bilin(uS, s); return v.r + v.g; }
  vec2 wave(vec2 uv, float b) { return (texture(uWave, uv, b).rg - .5) * 6.; }
  void main() {
    vec2 s = vec2(vUv.x, 1. - vUv.y);
    vec4 st = bilin(uS, s), vv = bilin(uV, s);
    float w = st.g, h0 = bilin(uBase, s).r;
    vec2 xz = s * GRID * CELL;
    float rl = bilin(uRockL, s).r;                        // 바위 2.5D 빛 (그림자 포함)
    vec3 col = texture(uDry, vUv).rgb * rl;
    float under = smoothstep(.0, .012, w), wet = max(smoothstep(.05, 1., min(st.a, 1.)) * .85, under);
    col *= mix(vec3(1.), vec3(.7, .67, .66), wet);
    col = mix(col, col * .9 + uSky * .16, smoothstep(.75, 1., st.a) * (1. - under) * .7);   // 막 물이 빠진 자리의 번들거림
    float rockish = max(smoothstep(.15, .55, texture(uRockM, vUv, 3.).a), smoothstep(1.08, 1.25, rl) + 1. - smoothstep(.7, .85, rl));
    vec3 sw = swells(xz, uT);
    float deepK = smoothstep(.2, 1.1, max(w, -h0));
    if (w > .0015) {
      vec2 e = 1. / GRID;
      vec2 sl = vec2(Ws(s + vec2(e.x, 0.)) - Ws(s - vec2(e.x, 0.)), Ws(s + vec2(0., e.y)) - Ws(s - vec2(0., e.y))) / (2. * CELL);
      vec2 rp = (wave(xz / 6.5 + uT * vec2(.014, .04), 1.2) * .6 + wave(mat2(.8, .6, -.6, .8) * xz / 3.9 + uT * vec2(-.025, .03), 1.2) * .45) * .05 * smoothstep(.0, .25, w);
      vec2 slope = sl * 2. + rp + sw.xy * deepK;
      vec3 n = normalize(vec3(-slope.x, 1., -slope.y));
      vec2 off = n.xz * min(w, .8) * .014;
      vec3 bed = texture(uDry, vUv + vec2(off.x, -off.y)).rgb * bilin(uRockL, s + off * vec2(1., -1.)).r * vec3(.74, .71, .69);
      vec2 cs = wave(xz / 4.6 + uT * vec2(.03, .05), .6) + wave(mat2(.8, .6, -.6, .8) * xz / 3.1 - uT * vec2(.04, .015), .6);
      bed *= 1. + 1.1 * pow(max(0., 1. - length(cs) * .38), 3.) * (1. - smoothstep(.08, .9, w));   // 바닥 빛 그물
      //  물빛 = 원래 그림의 바다를 지금 물가선만큼 밀어 읽는다 → 그림 속 물가 거품 띠·청록 띠·붓결이 물가선을 따라 오르내린다
      //  (바위 자리는 바위 지운 판 — 바위는 바닥 그림으로 제자리에 비친다). 너울만큼 조금 일렁인다
      vec2 su = vec2(vUv.x, vUv.y + edgeOff(vUv.x) / (GRID.y * CELL)) + sw.xy * deepK * vec2(.0025, -.0025) + vec2(off.x, -off.y) * .5;
      vec3 seaP = mix(texture(uArt, su).rgb, texture(uSeaP, su).rgb, smoothstep(.15, .6, texture(uRockM, su).a));
      float op = 1. - exp(-w * 7.);                         // 조금 불투명하게 — 아주 얕은 물가에서만 모래가 비친다
      vec3 wc = mix(bed, seaP, .15 + .85 * op);
      wc *= clamp(1. + 1.6 * (dot(n, uSun) - uSun.y), .86, 1.16);   // 너울의 빛과 그늘은 살짝만 (그림 톤 지키기)
      wc += uSunCol * pow(max(reflect(-uSun, n).y, 0.), 160.) * .22 * (1. - .7 * rockish);
      col = mix(col, wc, smoothstep(.0015, .008, w));
    }
    // 거품: 흐름에 실린 레이스 + 물 가장자리 가는 줄 + 너울 마루가 물가 가까이서 부서지는 흰 물결 (들쭉날쭉) + 바위에 들이친 거품
    vec2 fw = xz + vv.rg * .1;
    float pat = vnoise(fw * 2.4 + uT * .1) * .55 + vnoise(fw * 7. - uT * .08) * .3 + vnoise(fw * 16.) * .15;
    float fa = clamp(vv.b, 0., 1.2);
    float brk = smoothstep(-.6, -.38, h0) * (1. - smoothstep(-.25, -.08, h0));
    fa = max(fa, smoothstep(.3, .7, sw.z) * brk * smoothstep(.35, .7, vnoise(xz * .35 + uT * .15)) * (1. - rockish));
    fa = max(fa, smoothstep(.2, .9, vv.a));
    float fm = smoothstep(.22, .6, fa * (.35 + .95 * pat)) * mix(.75, 1., under) * .65;   // 그림 속 거품 띠를 거든다
    fm = max(fm, (1. - smoothstep(.003, .018, w)) * under * smoothstep(.5, .72, pat) * .6 * (1. - rockish));
    fm *= 1. - .85 * rockish * (1. - smoothstep(.15, .7, vv.a));
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
  static supportsHour(h) { return h >= 7 && h <= 17.5; }   // 지금은 낮 그림만 — 노을·밤은 기본 그림으로 (그 시간 그림 판은 다음 차례)
  async load() {
    const plate = this.plate; if (!plate) throw new Error('판(plate)이 없어요');
    this.pw = plate.pw; this.ph = plate.ph; this.u = plate.ph / 800;
    const g = this.g = gridOf(plate.pw, plate.ph);
    this.shoreZ = shoreFn(plate.shoreP, plate.pw, plate.ph, g);
    const loadImg = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = this.base + src; });
    const rock25 = await loadImg((plate.name || 'plate') + '-rock25.webp?v=pv-7441cb8').then(im => pixelsOf(im, g.nx, g.nz)).catch(() => null);
    const rockA = plate.rockArt ? pixelsOf(plate.rockArt, g.nx, g.nz) : null;
    this.baseArr = buildBase(g, this.shoreZ, { rock25, rockA });
    const rl = rockLight(g, this.baseArr, sandOnlyBase(g, this.shoreZ), [SUN.x, SUN.y, SUN.z]);
    this.palette(pixelsOf(plate.img, g.nx, g.nz), rockA);
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.cv, antialias: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.sim = new Sim(r, g, this.baseArr); this.sim.freezeSand(); this.sim.setFoam(1.1, 1.6);
    const tex = (im) => { const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };
    const wt = this.waveTex = new THREE.DataTexture(makeWaveSlopes(), WAVE_TEX, WAVE_TEX);
    wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.generateMipmaps = true; wt.minFilter = THREE.LinearMipmapLinearFilter; wt.magFilter = THREE.LinearFilter; wt.needsUpdate = true;
    this.rlTex = new THREE.DataTexture(rl, g.nx, g.nz, THREE.RedFormat, THREE.FloatType); this.rlTex.needsUpdate = true;
    let rm; if (plate.rockArt) { rm = new THREE.Texture(plate.rockArt); rm.generateMipmaps = true; rm.minFilter = THREE.LinearMipmapLinearFilter; rm.needsUpdate = true; } else { rm = new THREE.DataTexture(new Uint8Array(4), 1, 1); rm.needsUpdate = true; }
    this.edgeOffTex = new THREE.DataTexture(new Float32Array(g.nx), g.nx, 1, THREE.RedFormat, THREE.FloatType); this.edgeOffTex.needsUpdate = true;
    const C = (v) => ({ value: v });
    this.uni = {
      uS: C(this.sim.state), uV: C(this.sim.vel), uBase: C(this.sim.baseTex), uDry: C(tex(plate.dry)), uWave: C(wt), uRockL: C(this.rlTex), uRockM: C(rm),
      uArt: C(tex(plate.img)), uSeaP: C(tex(plate.sea)), uEdgeOff: C(this.edgeOffTex),
      uT: C(0), uRain: C(0), uFog: C(0), uPx: C(600),
      uSun: C(SUN.clone()), uSunCol: C(new THREE.Color(1.0, 0.97, 0.9)), uSky: C(new THREE.Color(0.78, 0.9, 0.95)),
      uPalS: C(this.pal[0]), uPalM: C(this.pal[1]), uPalD: C(this.pal[2]), uFoamCol: C(new THREE.Color(1, 1, 1)),
    };
    this.scene = new THREE.Scene();
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(g.wx, g.wz).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG(g), uniforms: this.uni }));
    this.scene.add(this.ground);
    this.camera = new THREE.OrthographicCamera(-g.wx / 2, g.wx / 2, g.wz / 2, -g.wz / 2, 0.1, 100);
    this.camera.position.set(0, 50, 0); this.camera.up.set(0, 0, -1); this.camera.lookAt(0, 0, 0);
    this.makeSpray();
    this.levels = new Float32Array(g.nx);
    this.clock = new THREE.Clock(); this.ready = true;
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
  setHour(h) { this.hour = h; }
  setWeatherNow(rain, fog) { this.uni.uRain.value = rain; this.uni.uFog.value = fog; }
  setGlitter() {}   // 게임이 2D 윤슬을 위에 그린다
  // 게임 물가선: d = 그려진 물가선에서의 거리(u) 128칸, x0~x1 = 그 값이 덮는 판 px → 칸 줄마다 그 자리 모래 높이(= 물이 닿을 수면)
  setEdge(d, x0, x1) {
    const g = this.g, n = d.length - 1, toW = g.wz / 800;   // u → 세계 (u = 판 높이 / 800)
    for (let i = 0; i < g.nx; i++) {
      const px = (i + 0.5) / g.nx * this.pw, f = Math.min(n, Math.max(0, (px - x0) / Math.max(1, x1 - x0) * n)), a = Math.floor(f), b = Math.min(n, a + 1);
      const dw = (d[a] + (d[b] - d[a]) * (f - a)) * toW;
      this.levels[i] = sandH(dw); this.edgeOffTex.image.data[i] = dw;
    }
    this.edgeOffTex.needsUpdate = true;
    this.sim.setEdgeLevels(this.levels);
  }
  frame(step) {
    if (!this.ready) return;
    const dt = step ?? Math.min(0.05, this.clock.getDelta());
    this.t += dt; this.sim.step(dt);
    this.uni.uT.value = this.sim.t; this.uni.uS.value = this.sim.state; this.uni.uV.value = this.sim.vel;
    this.renderer.setRenderTarget(null); this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.ready = false; this.sim?.dispose(); this.waveTex?.dispose(); this.rlTex?.dispose();
    for (const k of ['uDry', 'uRockM', 'uArt', 'uSeaP', 'uEdgeOff']) this.uni?.[k].value.dispose();
    this.ground?.geometry.dispose(); this.ground?.material.dispose(); this.spray?.geometry.dispose(); this.spray?.material.dispose();
    this.renderer?.dispose();
  }
}
