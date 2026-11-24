// painted/painted.js — 그림 모드: 일러스트가 색을 맡고, 모래 높이·흐르는 물·빛은 시뮬레이션(src/sandsim)이 맡는다
//  사용자 2026-11-25 "2d와 3d를 절묘하게 조합" → 새 모드로. 지금 게임·해변 3D 와 따로 돈다 (painted-lab.html).
//
//  핵심 세 가지
//   ① 빛은 「달라진 만큼만」: 그림엔 빛과 그늘이 이미 칠해져 있다. 처음 땅(그림이 그려진 모양)에서의 밝기와
//      지금 땅에서의 밝기의 비율만 그림에 곱한다 → 아무것도 안 건드린 곳은 그림 그대로, 판 홈·모래성·깎인 자리에만 새 그늘.
//   ② 물은 그림 위를 흐른다: 얕으면 물 뺀 판(모래 바닥)이 비치고, 깊어질수록 그려진 바다 판으로 넘어간다.
//   ③ 거품·젖음은 그림 톤으로: 젖으면 그 자리 그림 색을 짙게, 거품은 그림 속 거품 색(따뜻한 흰색)으로.
import * as THREE from 'three';
import { Sim } from '../sandsim/sim.js?v=lab-40a1952';
import { loadPlate } from '../plate.js?v=lab-40a1952';
import { MAPS } from '../maps.js?v=lab-40a1952';
import { makeWaveSlopes, WAVE_TEX } from '../beach3d/water/normals.js?v=lab-40a1952';
import { layoutText, strokesOf } from '../hangul.js?v=lab-40a1952';
import { PB, gridOf, shoreFn, buildBase, pixelsOf, sandH } from './base.js?v=lab-40a1952';

const VERT = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const FRAG = (g) => /* glsl */`
  const vec2 GRID = vec2(${g.nx}., ${g.nz}.);
  const float CELL = ${g.cell};
  uniform sampler2D uS, uV, uBase, uDry, uSea, uWave;
  uniform float uT, uAmb, uSunK, uShowArt, uRelief;
  uniform vec3 uSun, uFoamCol, uShallow;   // uShallow = 그림 속 물가 바로 아래 얕은 물 색 (평균)
  uniform sampler2D uArt, uRockM;   // 원래 그림 · 바위 가림막
  varying vec2 vUv;
  vec4 at(sampler2D t, ivec2 p) { return texelFetch(t, clamp(p, ivec2(0), ivec2(GRID) - 1), 0); }
  vec4 bilin(sampler2D t, vec2 uv) {
    vec2 q = uv * GRID - .5; ivec2 i = ivec2(floor(q)); vec2 r = q - floor(q);
    return mix(mix(at(t, i), at(t, i + ivec2(1, 0)), r.x), mix(at(t, i + ivec2(0, 1)), at(t, i + ivec2(1, 1)), r.x), r.y);
  }
  float Hs(vec2 s) { return bilin(uS, s).r; }       // 지금 모래 높이
  float H0(vec2 s) { return bilin(uBase, s).r; }    // 그림이 그려진 모양 (처음 땅)
  float Ws(vec2 s) { vec4 v = bilin(uS, s); return v.r + v.g; }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  vec2 wave(vec2 uv, float b) { return (texture(uWave, uv, b).rg - .5) * 6.; }
  // 밝기 = 그늘 빛 + 해 빛 × 기울기 × 가려짐 (높이 그림을 해 쪽으로 걸어 본다)
  float light(vec2 s, bool cur) {
    vec2 e = 1. / GRID;
    float hx = cur ? Hs(s - vec2(e.x, 0.)) - Hs(s + vec2(e.x, 0.)) : H0(s - vec2(e.x, 0.)) - H0(s + vec2(e.x, 0.));
    float hz = cur ? Hs(s - vec2(0., e.y)) - Hs(s + vec2(0., e.y)) : H0(s - vec2(0., e.y)) - H0(s + vec2(0., e.y));
    vec3 n = normalize(vec3(hx * uRelief, 2. * CELL, hz * uRelief));
    float h = cur ? Hs(s) : H0(s), sh = 1.; vec3 q = vec3(0., h + .02, 0.); vec2 qs = s;
    vec2 stepS = uSun.xz / (GRID * CELL) * .22;
    for (int i = 1; i <= 16; i++) { q.y += uSun.y * .22; qs += stepS; float hb = cur ? Hs(qs) : H0(qs); sh = min(sh, clamp((q.y - hb) / (.03 * float(i)) + .15, 0., 1.)); }
    return uAmb + uSunK * max(dot(n, uSun), 0.) * sh;
  }
  void main() {
    vec2 s = vec2(vUv.x, 1. - vUv.y);   // 격자 칸 (첫 줄 = 판 위쪽 = 뭍)
    vec4 st = bilin(uS, s), vv = bilin(uV, s);
    float w = st.g;
    vec3 dry = texture(uDry, vUv).rgb;
    float ratio = clamp(light(s, true) / max(light(s, false), .05), .3, 1.7);
    // 젖음: 그 자리 그림 색을 짙고 조금 차갑게
    float wet = max(smoothstep(.05, 1., min(st.a, 1.)) * .8, smoothstep(0., .02, w));
    vec3 wetTint = mix(vec3(1.), vec3(.72, .69, .67), wet);
    vec3 col = dry * ratio * wetTint;
    if (w > .0015) {
      // 물 면 기울기 (흐르는 물 + 잔물결 그림) → 바닥이 일렁여 보인다
      vec2 e = 1. / GRID;
      vec2 sl = vec2(Ws(s + vec2(e.x, 0.)) - Ws(s - vec2(e.x, 0.)), Ws(s + vec2(0., e.y)) - Ws(s - vec2(0., e.y))) / (2. * CELL);
      vec2 xz = s * GRID * CELL;
      vec2 rp = (wave(xz / 7. + uT * vec2(.012, .03), 1.5) * .6 + wave(mat2(.8, .6, -.6, .8) * xz / 4.3 + uT * vec2(-.02, .025), 1.5) * .45) * .03;
      vec2 off = (sl * .5 + rp) * min(w, .6) * .02;
      vec3 bed = texture(uDry, vUv + vec2(off.x, -off.y)).rgb * ratio * vec3(.72, .69, .67);
      //  깊은 물 = 원래 그림 그대로 (바위 지운 바다 판은 색이 조금 다르다). 바위 자리만 바위 지운 판으로 — 돌은 물 밑 바닥(물 뺀 판)으로 비친다
      vec2 su = vUv + vec2(off.x, -off.y) * .4;
      vec3 sea = mix(texture(uArt, su).rgb, texture(uSea, su).rgb, smoothstep(.15, .6, texture(uRockM, vUv).a));
      //  그려진 물가선 아래(처음 땅이 수면 밑)는 그림 속 물 그대로, 그 위로 밀려 올라온 물은 그림 속 얕은 물 색으로
      sea = mix(uShallow, sea, 1. - smoothstep(-.1, -.01, H0(s)));
      // 물 밑 빛 그물 — 바닥 색에 곱해진다
      vec2 cs = wave(xz / 5. + uT * vec2(.02, .035), 1.) + wave(mat2(.8, .6, -.6, .8) * xz / 3.4 - uT * vec2(.03, .01), 1.);
      bed *= 1. + .35 * pow(max(0., 1. - length(cs) * .4), 3.) * (1. - smoothstep(.1, .8, w));
      //  얕은 물: 모래 바닥 위에 그려진 바다 빛이 깊이만큼 덮인다 (곱하면 주황 모래 × 청록 = 탁한 올리브가 된다)
      vec3 wc = mix(bed, sea, 1. - exp(-w * 7.));   // 아주 얕을 때만 모래가 비친다
      // 거품: 흐름에 실린 거품(레이스) + 물 가장자리 가는 줄
      vec2 fw = xz + vv.rg * .12;
      float pat = vnoise(fw * 2.2 + uT * .12) * .6 + vnoise(fw * 6.2 - uT * .1) * .4;
      float fm = smoothstep(.3, .8, clamp(vv.b, 0., 1.) * (.3 + pat)) * .9;
      fm = max(fm, (1. - smoothstep(.003, .02, w)) * smoothstep(.55, .75, pat) * .5);
      wc = mix(wc, uFoamCol, fm);
      col = mix(col, wc, smoothstep(.0015, .01, w));
    }
    if (uShowArt > .5) col = texture(uArt, vUv).rgb;
    gl_FragColor = vec4(col, 1.);
    #include <colorspace_fragment>
  }`;

export class Painted {
  constructor(canvas, { base = 'assets/', map = 'beach' } = {}) {
    this.base = base; this.mapId = map;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x1d2228);
    this.tool = 'dig'; this.path = []; this.t = 0; this.frameN = 0; this.paused = false;
  }
  async load() {
    const m = MAPS[this.mapId], loadImg = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = this.base + src; });
    const plate = this.plate = await loadPlate(this.base, m.wide, { stones: !!m.stones, shoreFrom: m.shoreFrom, ground: m.ground, tone: !!m.tone, shoreFix: m.shoreFix?.wide, moss: !!m.moss, art: m.art !== false, rockFill: !!m.rockFill, rockArt: m.rockArt !== false, curve: !!m.curve });
    const g = this.g = gridOf(plate.pw, plate.ph);
    this.shoreZ = shoreFn(plate.shoreP, plate.pw, plate.ph, g);
    const rock25 = await loadImg(m.wide + '-rock25.webp?v=lab-40a1952').then(im => pixelsOf(im, g.nx, g.nz)).catch(() => null);
    const rockA = plate.rockArt ? pixelsOf(plate.rockArt, g.nx, g.nz) : null;
    this.baseArr = buildBase(g, this.shoreZ, { rock25, rockA });
    // 그림 속 얕은 물 색: 그려진 물가선 아래 청록 띠의 평균 (바로 아래는 흰 거품 띠라 허옇다)
    const art = pixelsOf(plate.img, g.nx, g.nz), sh = [0, 0, 0]; let n = 0;
    for (let i = 0; i < g.nx; i += 2) { const x = (i + 0.5) * g.cell - g.wx / 2, j0 = Math.round((this.shoreZ(x) + g.wz / 2) / g.cell);
      for (let j = j0 + 14; j < j0 + 24 && j < g.nz; j++) { const k = (j * g.nx + i) * 4; sh[0] += art[k]; sh[1] += art[k + 1]; sh[2] += art[k + 2]; n++; } }
    this.shallow = new THREE.Color().setRGB(sh[0] / n / 255, sh[1] / n / 255, sh[2] / n / 255, THREE.SRGBColorSpace);
    this.sim = new Sim(this.renderer, g, this.baseArr);
    const tex = (im) => { const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };
    const wt = this.waveTex = new THREE.DataTexture(makeWaveSlopes(), WAVE_TEX, WAVE_TEX);
    wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.generateMipmaps = true; wt.minFilter = THREE.LinearMipmapLinearFilter; wt.magFilter = THREE.LinearFilter; wt.needsUpdate = true;
    this.u = {
      uS: { value: this.sim.state }, uV: { value: this.sim.vel }, uBase: { value: this.sim.baseTex }, uDry: { value: tex(plate.dry) }, uSea: { value: tex(plate.sea) }, uArt: { value: tex(plate.img) }, uRockM: { value: plate.rockArt ? tex(plate.rockArt) : new THREE.DataTexture(new Uint8Array(4), 1, 1) },
      uWave: { value: wt }, uT: { value: 0 }, uAmb: { value: 0.55 }, uSunK: { value: 0.75 }, uShowArt: { value: 0 }, uRelief: { value: 1 },
      uSun: { value: new THREE.Vector3(0.45, 0.78, -0.45).normalize() }, uFoamCol: { value: new THREE.Color(0.98, 0.96, 0.92) }, uShallow: { value: this.shallow },
    };
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(g.wx, g.wz).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG(g), uniforms: this.u }));
    this.scene.add(this.ground);
    this.camera = new THREE.OrthographicCamera(-g.wx / 2, g.wx / 2, g.wz / 2, -g.wz / 2, 0.1, 100);
    this.camera.position.set(0, 50, 0); this.camera.up.set(0, 0, -1); this.camera.lookAt(0, 0, 0);
    this.makeKiwi();
    return this;
  }
  makeKiwi() {
    const tex = new THREE.TextureLoader().load(this.base + 'kiwi.webp?v=lab-40a1952', t => { t.colorSpace = THREE.SRGBColorSpace; this.kiwi.scale.set(2.3 * t.image.width / t.image.height, 2.3, 1); });
    this.kiwi = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    this.kiwi.center.set(0.5, 0.12); this.kiwi.scale.set(2.3, 2.3, 1); this.kiwi.renderOrder = 3;
    this.kiwiShadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a2a1a, transparent: true, opacity: 0.25, depthTest: false }));
    this.kiwiShadow.scale.set(1.4, 1, 0.6); this.kiwiShadow.renderOrder = 2;
    this.scene.add(this.kiwi, this.kiwiShadow);
    this.kp = new THREE.Vector2(-this.g.wx * 0.3, this.shoreZ(-this.g.wx * 0.3) - 5); this.kdir = 1; this.kwalk = 0;
  }
  setWave(k) { this.sim.u.uWave.value = 0.75 * k; }
  setErosion(k) { this.sim.setErosion(k); }
  showArt(on) { this.u.uShowArt.value = on ? 1 : 0; }
  reset() { this.sim.reset(); this.path = []; }
  // 키위가 글씨를 판다 — 물가선 조금 위 마른 모래에
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
      if (d <= left) { if (seg.dig && seg.started) this.sim.groove(p.x, p.y, tgt[0], tgt[1], 0.3, 0.16); p.set(tgt[0], tgt[1]); left -= d; seg.started = true; seg.pts.shift(); if (!seg.pts.length) this.path.shift(); }
      else { const nx = p.x + dx / d * left, nz = p.y + dz / d * left; if (seg.dig && seg.started) this.sim.groove(p.x, p.y, nx, nz, 0.3, 0.16); p.set(nx, nz); left = 0; }
    }
    this.kwalk = this.path.length ? this.kwalk + dt : 0;
  }
  bind(cv) {
    const pick = (e) => {
      const b = cv.getBoundingClientRect(), v = this.view; if (!v) return null;
      const x = (e.clientX - b.left - v.ox) / v.w * this.g.wx - this.g.wx / 2, z = (e.clientY - b.top - v.oy) / v.h * this.g.wz - this.g.wz / 2;
      return Math.abs(x) < this.g.wx / 2 && Math.abs(z) < this.g.wz / 2 ? [x, z] : null;
    };
    let drag = null;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); const p = pick(e); if (!p) return; drag = { p };
      if (this.tool === 'tower') this.sim.tower(p[0], p[1], 1.3, 1.2); if (this.tool === 'pour') this.sim.pour(p[0], p[1]); });
    cv.addEventListener('pointermove', e => { if (!drag) return; const p = pick(e); if (!p) return; const d = Math.hypot(p[0] - drag.p[0], p[1] - drag.p[1]); if (d < 0.08) return;
      if (this.tool === 'dig') this.sim.groove(drag.p[0], drag.p[1], p[0], p[1], 0.3, 0.16);
      if (this.tool === 'rake') this.sim.rake(drag.p[0], drag.p[1], p[0], p[1], 0.3);
      if (this.tool === 'pour') { if (d < 0.6) return; this.sim.pour(p[0], p[1], 0.8, 0.2); }
      drag.p = p; });
    const up = () => { drag = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }
  // 판 비율을 지키며 화면 가운데에 (남는 곳은 어둡게)
  resize(w, h, dpr) {
    if (dpr) this.renderer.setPixelRatio(dpr); this.renderer.setSize(w, h, false);
    const a = this.g.wx / this.g.wz, vw = Math.min(w, h * a), vh = vw / a; this.view = { w: vw, h: vh, ox: (w - vw) / 2, oy: (h - vh) / 2 };
    const sx = w / vw, sz = h / vh, c = this.camera; c.left = -this.g.wx / 2 * sx; c.right = this.g.wx / 2 * sx; c.top = this.g.wz / 2 * sz; c.bottom = -this.g.wz / 2 * sz; c.updateProjectionMatrix();
  }
  frame(dt) {
    this.t += dt; this.frameN++;
    if (!this.paused) this.sim.step(dt);
    this.walk(dt);
    const bob = this.kwalk ? Math.abs(Math.sin(this.kwalk * 11)) * 0.12 : 0;
    this.kiwi.position.set(this.kp.x, 2, this.kp.y - bob); this.kiwi.scale.x = Math.abs(this.kiwi.scale.x) * (this.kdir < 0 ? -1 : 1);
    this.kiwiShadow.position.set(this.kp.x + 0.2, 1, this.kp.y + 0.05);
    this.u.uT.value = this.sim.t; this.u.uS.value = this.sim.state; this.u.uV.value = this.sim.vel;
    this.renderer.setRenderTarget(null); this.renderer.render(this.scene, this.camera);
  }
  start() { let last = performance.now(), acc = 0, n = 0; const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; this.frame(dt); acc += dt; n++; if (acc > 1) { this.fps = Math.round(n / acc); acc = 0; n = 0; } this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  stop() { cancelAnimationFrame(this.raf); }
}
export { sandH, PB };
