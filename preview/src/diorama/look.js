// diorama/look.js — 디오라마 그리기: 모래(빛·그늘·젖음·빛 그물) · 물(맑은 얕은 물·거품·반짝임) · 옆면 · 자갈 · 덤불
//  모래 색과 물 색은 갈아 끼운다 (sands.js) — 땅 모양·물 흐름은 그대로 (영상: 흰 모래 · 검은 화산 모래 · 감람석 · 분홍 모래)
import * as THREE from 'three';
import { N, SIZE, CELL, GROUND_GLSL, groundH } from './ground.js?v=pv-d6ce35e';

const COMMON = /* glsl */`
  #define NI ${N}
  ${GROUND_GLSL}
  uniform sampler2D uS, uV, uWave;
  uniform float uT;
  uniform vec3 uSun, uSunCol, uSky;
  vec4 at(sampler2D t, ivec2 p) { return texelFetch(t, clamp(p, ivec2(0), ivec2(NI - 1)), 0); }
  vec4 bilin(sampler2D t, vec2 uv) {
    vec2 q = uv * float(NI) - .5; ivec2 i = ivec2(floor(q)); vec2 r = q - floor(q);
    return mix(mix(at(t, i), at(t, i + ivec2(1, 0)), r.x), mix(at(t, i + ivec2(0, 1)), at(t, i + ivec2(1, 1)), r.x), r.y);
  }
  float B(vec2 xz) { return bilin(uS, toUv(xz)).r; }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  ivec2 vertCell(vec2 xz) { return ivec2(floor((xz + SIZE * .5) / SIZE * float(NI - 1) + .5)); }
`;

// ── 모래
const SAND_VERT = COMMON + /* glsl */`
  varying vec3 vW;
  void main() { vec3 p = position; p.y = at(uS, vertCell(p.xz)).r; vW = (modelMatrix * vec4(p, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }`;
const WAVE_FN = `
  vec2 wave(vec2 uv, float bias) { return (texture(uWave, uv, bias).rg - .5) * 6.; }   // bias 가 크면 부드럽게 (멀리서 자글거리지 않게)
`;   // 픽셀 셰이더에서만 (bias 는 꼭짓점 셰이더에서 못 쓴다)
const SAND_FRAG = COMMON + WAVE_FN + /* glsl */`
  uniform vec3 uSandA, uSandB, uWet;
  uniform float uShadowSteps;
  varying vec3 vW;
  void main() {
    vec2 xz = vW.xz; vec4 st = bilin(uS, toUv(xz)); float e = CELL;
    vec3 n = normalize(vec3(B(xz - vec2(e, 0.)) - B(xz + vec2(e, 0.)), 2. * e, B(xz - vec2(0., e)) - B(xz + vec2(0., e))));
    // 모래 결: 큰 얼룩 · 중간 결 · 알갱이
    float big = vnoise(xz * .16), mid = vnoise(xz * 1.4 + 3.1), grain = hash(floor(xz * 60.));
    vec3 alb = mix(uSandA, uSandB, smoothstep(.2, .8, big)) * (.93 + .09 * mid + .07 * (grain - .5));
    float under = smoothstep(.0, .015, st.g), wet = max(st.a > 1.05 ? .45 : smoothstep(.05, 1., st.a) * .9, under);   // 1 넘는 젖음 = 다진 모래(모래성) — 덜 짙게
    alb *= mix(vec3(1.), uWet, wet);
    // 해 쪽으로 높이 그림을 걸어 보며 가려지는지 (부드러운 그늘)
    float sh = 1.; vec3 q = vec3(xz.x, st.r + .03, xz.y);
    for (int i = 1; i <= 28; i++) { if (float(i) > uShadowSteps) break; q += uSun * .2; if (q.y > 3.2) break; sh = min(sh, clamp((q.y - B(q.xz)) / (.035 * float(i)) + .1, 0., 1.)); }
    float avg = (B(xz + vec2(.45, 0.)) + B(xz - vec2(.45, 0.)) + B(xz + vec2(0., .45)) + B(xz - vec2(0., .45))) * .25;
    float ao = clamp(1. - (avg - st.r) * 3.2, .45, 1.12);   // 홈 바닥은 어둡고 둑 위는 밝다
    float dif = max(dot(n, uSun), 0.) * sh;
    vec3 col = alb * (uSky * ao + uSunCol * dif);
    vec3 V = normalize(cameraPosition - vW);
    col += uSunCol * pow(max(dot(reflect(-uSun, n), V), 0.), 36.) * wet * (1. - under) * .3 * sh;   // 막 젖은 모래의 번들거림
    if (st.g > .002) {   // 얕은 물 밑의 빛 그물
      vec2 s = wave(xz / 5.5 + uT * vec2(.02, .035), 1.) + wave(mat2(.8, .6, -.6, .8) * xz / 3.7 - uT * vec2(.03, .01), 1.);
      float c = pow(max(0., 1. - length(s) * .4), 3.);   // 빛이 모이는 곳 — 굵고 부드럽게
      col += alb * uSunCol * c * .7 * smoothstep(.0, .06, st.g) * (1. - smoothstep(.3, 1.2, st.g)) * sh;   // 빛은 모래 색에 곱해진다 (검은 모래 위에선 어둡다)
    }
    gl_FragColor = vec4(col, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

// ── 물
const WATER_VERT = COMMON + /* glsl */`
  varying vec3 vW;
  void main() { vec3 p = position; vec4 s = at(uS, vertCell(p.xz)); p.y = s.g > .002 ? s.r + s.g : s.r - .06; vW = (modelMatrix * vec4(p, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }`;
const WATER_FRAG = COMMON + WAVE_FN + /* glsl */`
  uniform vec3 uShallow, uDeep, uSkyRef, uFoam;
  varying vec3 vW;
  float Hs(vec2 xz) { vec4 s = bilin(uS, toUv(xz)); return s.r + s.g; }
  void main() {
    vec2 xz = vW.xz; vec4 st = bilin(uS, toUv(xz)); float w = st.g;
    if (w < .002) discard;
    vec4 vv = bilin(uV, toUv(xz)); float e = CELL;
    vec3 n0 = normalize(vec3(Hs(xz - vec2(e, 0.)) - Hs(xz + vec2(e, 0.)), 2. * e, Hs(xz - vec2(0., e)) - Hs(xz + vec2(0., e))));
    vec2 rs = (wave(xz / 7. + uT * vec2(.012, .03), 2.) * .6 + wave(mat2(.8, .6, -.6, .8) * xz / 4.2 + uT * vec2(-.02, .025), 2.) * .45) * .035 * smoothstep(.0, .12, w);
    vec3 n = normalize(n0 + vec3(-rs.x, 0., -rs.y));
    vec3 V = normalize(cameraPosition - vW);
    float fres = .02 + .98 * pow(1. - max(dot(n, V), 0.), 5.);
    float dk = 1. - exp(-w * 1.5);
    vec3 col = mix(uShallow, uDeep, dk) * (uSky * .9 + uSunCol * .35);
    float a = mix(.1, .96, 1. - exp(-w * 2.2));
    col = mix(col, uSkyRef, fres * .4); a = max(a, fres * .5);
    vec3 ns = normalize(n0 + vec3(-rs.x, 0., -rs.y) * .5);   // 반짝임은 잔물결을 덜 본다 — 물 전체에 흰 점이 자글거리지 않게
    float spec = pow(max(dot(reflect(-uSun, ns), V), 0.), 90.) * .45;
    col += uSunCol * spec; a = min(1., a + spec);
    // 거품: 흐름에 실린 거품(V.b) + 얇은 물 앞머리, 구멍 난 레이스 무늬로
    vec2 fw = xz + vv.rg * .15;
    float pat = vnoise(fw * 2.3 + uT * .15) * .6 + vnoise(fw * 6.5 - uT * .1) * .4;
    float fm = smoothstep(.3, .8, clamp(vv.b, 0., 1.) * (.3 + 1. * pat)) * .92;   // 구멍 난 레이스
    fm = max(fm, (1. - smoothstep(.003, .02, w)) * smoothstep(.55, .75, pat) * .55);   // 물 가장자리 가는 거품 줄
    col = mix(col, uFoam * (uSky + uSunCol * .85), fm); a = mix(a, .97, fm);
    a *= smoothstep(.002, .01, w);
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

// ── 옆면 (디오라마 단면): 위는 모래·물 높이, 아래는 흙 층
const SIDE_VERT = COMMON + /* glsl */`
  attribute float aTop; attribute vec2 aCell;
  varying float vY; varying float vTop; varying vec3 vW; varying float vWater;
  void main() { vec3 p = position; vec4 s = at(uS, ivec2(aCell)); float top = (aTop > 1.5 && aTop < 2.5) ? s.r + s.g : s.r;
    p.y = aTop > .5 ? top : -3.4; vWater = aTop > 1.5 ? 1. : 0.; vTop = top; vY = p.y; vW = (modelMatrix * vec4(p, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }`;
const SIDE_FRAG = COMMON + /* glsl */`
  uniform vec3 uSandA, uSandB, uShallow, uDeep, uSide;
  varying float vY; varying float vTop; varying vec3 vW; varying float vWater;
  void main() {
    if (vWater > .5) { gl_FragColor = vec4(mix(uShallow, uDeep, .6) * (uSky + uSunCol * .3), .55);
    } else {
      float d = vTop - vY, band = vnoise(vec2((vW.x + vW.z) * .6, vY * 5.));
      vec3 c = mix(mix(uSandB, uSandA, .4), uSide, smoothstep(.05, 1.8, d)) * (.9 + .15 * band);
      gl_FragColor = vec4(c * (uSky * .9 + uSunCol * .25) * (.85 - .1 * smoothstep(0., 3., d)), 1.);
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

// ── 자갈 · 덤불 (같은 모양 여럿 — 높이 그림을 읽어 모래 위에 앉는다)
const BITS_VERT = COMMON + /* glsl */`
  attribute vec3 aCol; uniform float uSink;
  varying vec3 vN; varying vec3 vC; varying vec3 vW;
  void main() { vec4 c = modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.); vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.);
    wp.y += B(c.xz) - uSink; vW = wp.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vC = aCol; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const BITS_FRAG = COMMON + /* glsl */`
  varying vec3 vN; varying vec3 vC; varying vec3 vW;
  void main() { vec3 n = normalize(vN); float w = bilin(uS, toUv(vW.xz)).g;
    vec3 col = vC * (uSky * (.75 + .25 * n.y) + uSunCol * max(dot(n, uSun), 0.)) * mix(1., .75, smoothstep(0., .1, w));
    gl_FragColor = vec4(col, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function sideGeometry() {   // 네 옆면: 칸마다 위(모래 · 물) 와 아래 점
  const pos = [], top = [], cell = [], idx = [];
  const edge = (fx, fz, cx, cz) => {
    const base = pos.length / 3;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), [x, z] = [fx(t), fz(t)], [ci, cj] = [cx(i), cz(i)];
      for (const k of [0, 1, 2, 3]) { pos.push(x, 0, z); top.push(k); cell.push(ci, cj); }   // 0 아래 · 1 모래 위 · 2 물 위 · 3 모래 위(물 띠용)
    }
    for (let i = 0; i < N - 1; i++) {
      const a = base + i * 4, b = a + 4;
      idx.push(a, b, a + 1, b, b + 1, a + 1);               // 흙 (아래 → 모래 위)
      idx.push(a + 3, b + 3, a + 2, b + 3, b + 2, a + 2);   // 물 (모래 위 → 물 위)
    }
  };
  const h = SIZE / 2, L = N - 1;
  edge(t => -h + t * SIZE, () => h, i => i, () => L);     // 앞 (바다)
  edge(t => h - t * SIZE, () => -h, i => L - i, () => 0); // 뒤
  edge(() => -h, t => -h + t * SIZE, () => 0, i => i);     // 왼
  edge(() => h, t => h - t * SIZE, () => L, i => L - i);  // 오른
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1));
  g.setAttribute('aCell', new THREE.Float32BufferAttribute(cell, 2)); g.setIndex(idx);
  return g;
}

function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class Look {
  constructor(scene, sim, waveTex) {
    this.sim = sim;
    const U = this.u = {
      uS: { value: sim.state }, uV: { value: sim.vel }, uWave: { value: waveTex }, uT: { value: 0 },
      uSun: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() }, uSunCol: { value: new THREE.Color(1, 0.95, 0.85) }, uSky: { value: new THREE.Color(0.45, 0.5, 0.58) },
      uSandA: { value: new THREE.Color() }, uSandB: { value: new THREE.Color() }, uWet: { value: new THREE.Color() }, uSide: { value: new THREE.Color() },
      uShallow: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() }, uSkyRef: { value: new THREE.Color(0.75, 0.85, 0.95) }, uFoam: { value: new THREE.Color(1, 1, 1) },
      uShadowSteps: { value: 24 }, uSink: { value: 0 },
    };
    const mat = (v, f, extra = {}) => new THREE.ShaderMaterial({ vertexShader: v, fragmentShader: f, uniforms: U, ...extra });
    const plane = new THREE.PlaneGeometry(SIZE, SIZE, N - 1, N - 1).rotateX(-Math.PI / 2);
    this.sand = new THREE.Mesh(plane, mat(SAND_VERT, SAND_FRAG));
    this.water = new THREE.Mesh(plane, mat(WATER_VERT, WATER_FRAG, { transparent: true, depthWrite: false }));
    this.water.renderOrder = 2;
    this.side = new THREE.Mesh(sideGeometry(), mat(SIDE_VERT, SIDE_FRAG, { transparent: true, side: THREE.DoubleSide }));
    this.side.renderOrder = 1;
    [this.sand, this.water, this.side].forEach(m => { m.frustumCulled = false; scene.add(m); });
    this.bits = []; this.scatter(scene);
  }
  // 자갈(물가·물속) · 조개 · 덤불(뒤쪽 둔덕)
  scatter(scene) {
    const r = rnd(7), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    const make = (geo, n, place, sink = 0) => {
      const cols = new Float32Array(n * 3), mesh = new THREE.InstancedMesh(geo, null, n);
      for (let i = 0; i < n; i++) { const [x, z, sc, col, sy] = place(i); e.set(r() * 3, r() * 6, r() * 3); q.setFromEuler(e); v.set(x, 0, z); s.set(sc, sc * (sy || 0.6), sc * (0.8 + r() * 0.4)); m.compose(v, q, s); mesh.setMatrixAt(i, m); cols.set(col, i * 3); }
      geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(cols, 3));
      mesh.material = new THREE.ShaderMaterial({ vertexShader: BITS_VERT, fragmentShader: BITS_FRAG, uniforms: { ...this.u, uSink: { value: sink } } });
      mesh.frustumCulled = false; scene.add(mesh); this.bits.push(mesh); return mesh;
    };
    const pebbleCols = [[0.32, 0.3, 0.29], [0.45, 0.42, 0.38], [0.22, 0.21, 0.22], [0.58, 0.52, 0.45]];
    make(new THREE.IcosahedronGeometry(1, 1), 520, () => {   // 자갈 — 깊은 물속엔 두지 않는다 (맑은 물 밑에서 흰 점처럼 보인다)
      const x = (r() - 0.5) * SIZE * 0.96, z = -17 + r() * 27; const c = pebbleCols[Math.floor(r() * 4)].map(k => k * (0.85 + r() * 0.3));
      return [x, z, 0.04 + Math.pow(r(), 3) * 0.16, c, 0.55];
    }, 0.01);
    make(new THREE.IcosahedronGeometry(1, 0), 70, () => [(r() - 0.5) * SIZE * 0.9, -6 + r() * 14, 0.09 + r() * 0.06, r() < 0.5 ? [0.95, 0.82, 0.78] : [0.98, 0.93, 0.85], 0.35], 0);   // 조개
    const bush = [[0.33, 0.45, 0.2], [0.27, 0.4, 0.22], [0.42, 0.5, 0.24], [0.55, 0.36, 0.42]];
    make(new THREE.IcosahedronGeometry(1, 2), 240, () => {
      const x = (r() - 0.5) * SIZE * 0.98, z = -19.5 + Math.pow(r(), 1.6) * 7.5; const k = groundH(x, z) > 0.3 ? 1 : 0.6;
      return [x, z, (0.35 + r() * 0.55) * k, bush[Math.floor(r() * (r() < 0.15 ? 4 : 3))].map(c => c * (0.85 + r() * 0.3)), 0.75];
    }, 0.1);
  }
  setSand(p) { this.u.uSandA.value.set(p.a); this.u.uSandB.value.set(p.b); this.u.uWet.value.setRGB(...p.wet); this.u.uSide.value.set(p.side); }
  setWater(p) { this.u.uShallow.value.set(p.shallow); this.u.uDeep.value.set(p.deep); }
  // 시각 → 해 방향 · 해 빛 · 하늘 빛 (6시 해 뜸 · 12시 머리 위 · 18시 해 짐)
  setHour(h) {
    const k = (h - 6) / 12, el = Math.max(0.06, Math.sin(Math.PI * Math.min(1, Math.max(0, k)))) * 0.85,   // 한낮에도 조금 비스듬히 — 모래 결이 산다
      az = Math.PI * (0.15 + 0.7 * k);
    this.u.uSun.value.set(Math.cos(az) * Math.cos(el), Math.sin(el), -0.55 * Math.cos(el) - 0.2).normalize();
    const low = 1 - Math.min(1, el / 0.55);
    this.u.uSunCol.value.setRGB(1.05, 0.93 - 0.28 * low, 0.8 - 0.45 * low).multiplyScalar(1.25 - 0.3 * low);
    this.u.uSky.value.setRGB(0.3 + 0.1 * low, 0.34 - 0.01 * low, 0.42 - 0.1 * low);   // 그늘 빛을 낮춰야 홈·둑이 또렷하다
    this.u.uSkyRef.value.setRGB(0.72 + 0.25 * low, 0.84 - 0.1 * low, 0.95 - 0.3 * low);
    return low;
  }
  update(t) { this.u.uT.value = t; this.u.uS.value = this.sim.state; this.u.uV.value = this.sim.vel; }
}
export const LOOK_SHADERS = { SAND_FRAG, WATER_FRAG, SIDE_FRAG, BITS_VERT };
