// diorama/diorama.js — 해변 디오라마 시험판: 모래 높이 · 흐르는 물 · 키위가 판 글씨를 파도가 씻어 간다
//  사용자 2026-11-24: 해변 샌드박스 게임 영상 네 편 → "딱 이느낌을 원해" → "시험적으로 해볼까?"
//  지금 게임(src/main.js · src/beach3d)과 따로 돈다 — 시험 페이지 diorama-lab.html 에서만 쓴다.
import * as THREE from 'three';
import { SIZE, groundH } from './ground.js?v=pv-d6ce35e';
import { Sim } from './sim.js?v=pv-d6ce35e';
import { Look } from './look.js?v=pv-d6ce35e';
import { SANDS, WATERS } from './sands.js?v=pv-d6ce35e';
import { makeWaveSlopes, WAVE_TEX } from '../beach3d/water/normals.js?v=pv-d6ce35e';
import { layoutText, strokesOf } from '../hangul.js?v=pv-d6ce35e';

export class Diorama {
  constructor(canvas, { base = 'assets/' } = {}) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
    this.orbit = { az: 0.18, pol: 0.92, dist: 66, target: new THREE.Vector3(0, -0.4, 0.5) };
    this.sim = new Sim(r);
    const wt = this.waveTex = new THREE.DataTexture(makeWaveSlopes(), WAVE_TEX, WAVE_TEX);
    wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.generateMipmaps = true; wt.minFilter = THREE.LinearMipmapLinearFilter; wt.magFilter = THREE.LinearFilter; wt.needsUpdate = true;
    this.look = new Look(this.scene, this.sim, wt);
    this.makeKiwi(base);
    this.tool = 'dig'; this.path = []; this.t = 0; this.frameN = 0; this.paused = false;
    this.setSand('white'); this.setWater('teal'); this.setHour(9);
    this.bind(canvas);
  }

  makeKiwi(base) {
    const tex = new THREE.TextureLoader().load(base + 'kiwi.webp?v=pv-d6ce35e', t => { t.colorSpace = THREE.SRGBColorSpace; const a = t.image.width / t.image.height; this.kiwiAspect = a; this.kiwi.scale.set(2.3 * a, 2.3, 1); });
    this.kiwi = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    this.kiwi.center.set(0.5, 0.06); this.kiwi.scale.set(2.3, 2.3, 1); this.kiwi.renderOrder = 3;
    this.kiwiShadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
    this.kiwiShadow.scale.set(1.3, 1, 0.75);
    this.scene.add(this.kiwi, this.kiwiShadow);
    this.kp = new THREE.Vector2(8, -9); this.ky = groundH(8, -9); this.kdir = -1; this.kwalk = 0;
  }

  setSand(k) { this.sandKey = k; this.look.setSand(SANDS[k] || SANDS.white); }
  setWater(k) { this.waterKey = k; this.look.setWater(WATERS[k] || WATERS.teal); }
  setHour(h) { this.hour = h; this.low = this.look.setHour(h); this.onSky?.(h, this.low); }
  setWave(k) { this.sim.u.uWave.value = 0.75 * k; }
  setErosion(k) { this.sim.setErosion(k); }
  reset() { this.sim.reset(); this.path = []; }

  // 키위가 글씨를 판다: 글자 획을 차례로 걸으며 홈을 낸다 (획 사이는 그냥 걷는다)
  write(text, { size = 2.6, z = -2.2 } = {}) {
    const lay = layoutText(text, { maxWidth: 30 / size });
    const strokes = strokesOf(lay, { x: -lay.width * size / 2, y: z - lay.height * size / 2, size });
    for (const s of strokes) { this.path.push({ dig: false, pts: [s.pts[0]] }); this.path.push({ dig: true, pts: s.pts }); }
    this.path.push({ dig: false, pts: [[lay.width * size / 2 + 2, z + 2]] });
  }

  walk(dt) {
    let left = (this.path[0]?.dig ? 3.2 : 6) * dt; const p = this.kp;
    while (left > 0 && this.path.length) {
      const seg = this.path[0], tgt = seg.pts[0];
      const dx = tgt[0] - p.x, dz = tgt[1] - p.y, d = Math.hypot(dx, dz);
      if (Math.abs(dx) > 0.02) this.kdir = dx > 0 ? 1 : -1;
      if (d <= left) {
        if (seg.dig && seg.started) this.sim.groove(p.x, p.y, tgt[0], tgt[1]);
        p.set(tgt[0], tgt[1]); left -= d; seg.started = true; seg.pts.shift();
        if (!seg.pts.length) this.path.shift();
      } else {
        const nx = p.x + dx / d * left, nz = p.y + dz / d * left;
        if (seg.dig && seg.started) this.sim.groove(p.x, p.y, nx, nz);
        p.set(nx, nz); left = 0;
      }
    }
    this.kwalk = this.path.length ? this.kwalk + dt : 0;
  }

  bind(cv) {
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const pick = (e) => {   // 화면 점 → 모래 위 점 (처음 땅 높이로 몇 번 맞춘다)
      const b = cv.getBoundingClientRect(); ndc.set((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera); const o = ray.ray.origin, d = ray.ray.direction; let y = 0, x = 0, z = 0;
      for (let i = 0; i < 6; i++) { const t = (y - o.y) / d.y; x = o.x + d.x * t; z = o.z + d.z * t; y = groundH(x, z); }
      return Math.abs(x) < SIZE / 2 && Math.abs(z) < SIZE / 2 ? [x, z] : null;
    };
    let drag = null;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId);
      if (e.button === 2 || this.tool === 'look') { drag = { orbit: true, x: e.clientX, y: e.clientY }; return; }
      const p = pick(e); if (!p) return; drag = { p };
      if (this.tool === 'tower') this.sim.tower(p[0], p[1]);
      if (this.tool === 'pour') this.sim.pour(p[0], p[1]);
    });
    cv.addEventListener('pointermove', e => {
      if (!drag) return;
      if (drag.orbit) { this.orbit.az -= (e.clientX - drag.x) * 0.005; this.orbit.pol = Math.min(1.45, Math.max(0.25, this.orbit.pol - (e.clientY - drag.y) * 0.004)); drag.x = e.clientX; drag.y = e.clientY; return; }
      const p = pick(e); if (!p || !drag.p) return;
      const d = Math.hypot(p[0] - drag.p[0], p[1] - drag.p[1]);
      if (d < 0.08) return;
      if (this.tool === 'dig') this.sim.groove(drag.p[0], drag.p[1], p[0], p[1]);
      if (this.tool === 'rake') this.sim.rake(drag.p[0], drag.p[1], p[0], p[1]);
      if (this.tool === 'pour' && d > 0.6) this.sim.pour(p[0], p[1], 0.8, 0.2); else if (this.tool === 'pour') return;
      drag.p = p;
    });
    const up = () => { drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); this.orbit.dist = Math.min(120, Math.max(18, this.orbit.dist * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });
  }

  resize(w, h, dpr) { if (dpr) this.renderer.setPixelRatio(dpr); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.W = w; this.H = h; }

  frame(dt) {
    this.t += dt; this.frameN++;
    if (!this.paused) this.sim.step(dt);
    this.walk(dt);
    // 키위 발 높이: 가끔만 읽는다 (그래픽 카드에서 값을 가져오는 일은 느리다)
    if (this.frameN % 6 === 0) { const s = this.sim.read(this.kp.x, this.kp.y); this.kyT = s[0] + Math.min(s[1], 0.25); }
    if (this.kyT !== undefined) this.ky += (this.kyT - this.ky) * Math.min(1, dt * 8);
    const bob = this.kwalk ? Math.abs(Math.sin(this.kwalk * 11)) * 0.08 : 0;
    this.kiwi.position.set(this.kp.x, this.ky + bob, this.kp.y);
    this.kiwi.scale.x = Math.abs(this.kiwi.scale.x) * (this.kdir < 0 ? -1 : 1);
    this.kiwiShadow.position.set(this.kp.x + 0.15, this.ky + 0.03, this.kp.y + 0.1);
    const o = this.orbit, c = this.camera;
    c.position.set(o.target.x + o.dist * Math.sin(o.pol) * Math.sin(o.az), o.target.y + o.dist * Math.cos(o.pol), o.target.z + o.dist * Math.sin(o.pol) * Math.cos(o.az));
    c.lookAt(o.target);
    this.look.update(this.sim.t);
    this.renderer.setRenderTarget(null); this.renderer.render(this.scene, c);
  }

  start() {
    let last = performance.now(), acc = 0, n = 0;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; this.frame(dt);
      acc += dt; n++; if (acc > 1) { this.fps = Math.round(n / acc); acc = 0; n = 0; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { cancelAnimationFrame(this.raf); }
}
