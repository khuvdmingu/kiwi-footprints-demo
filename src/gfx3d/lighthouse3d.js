// gfx3d/lighthouse3d.js — 섬 짓기의 등대를 three.js 로 (2.5D: 해변 그림을 바닥에 깔고, 등대 그림을 세우고, 진짜 빛을 돌린다)
//  사용자 2026-11-22: "항해모드랑 섬 짓기 등대 두개하자"
//  지금 섬 화면의 등대(build.js glow — 2D 삼각형 빛줄기)는 그대로 두고, 이 모듈은 따로 켜는 고급 그래픽 판이다 (시험 페이지 gfx-lab.html).
//
//  · 바닥: 그 시각의 해변 그림(plate*.webp)을 빛을 받는 판(MeshLambertMaterial)에 입힌다. 바탕빛(AmbientLight)을 그림 밝기에 맞춰,
//    조명이 없는 곳은 원래 그림 그대로 보이고 등대 불빛이 닿는 곳만 따뜻하게 밝아진다.
//  · 등대: 섬 짓기 그림(catch-sheet.webp 15칸)을 바닥에 세운 판 — 카메라를 본다.
//  · 불빛: 등대 꼭대기에서 반대쪽 두 줄기가 천천히 돈다. 줄기마다 스포트 조명(모래·물에 떨어지는 빛 웅덩이) + 공기 중 빛줄기
//    (받은 오픈소스 threex.volumetricspotlight 재료, vendor/threex/volumetric-beam.js) + 등불 둘레 점 조명·빛 번짐.
//  · 낮엔 불을 끄고(빛 0), 해 질 녘부터 켠다 (2D 등대와 같은 시각 기준 skyAt/voyageLight).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { volumetricBeamMaterial } from '../../vendor/threex/volumetric-beam.js';
import { skyAt } from './sky.js?v=v30.36.0-9042bf8';
import { boxesOf } from '../voyage-scene.js?v=v30.36.0-9042bf8';

const PLATE_W = 16;
const ART = { day: 'plate.webp?v=v30.36.0-9042bf8', sunset: 'plate-sunset.webp?v=v30.36.0-9042bf8', night: 'plate-night.webp?v=v30.36.0-9042bf8', dawn: 'plate-dawn.webp?v=v30.36.0-9042bf8' };
const CELLS16 = Array.from({ length: 16 }, (_, i) => 'c' + i);
const REACH = 10;           // 빛줄기 길이
const BEAM_ANGLE = 0.13;    // 빛줄기 반각 (라디안)

function glowSprite(color = '255,214,140') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${color},1)`); gr.addColorStop(0.25, `rgba(${color},0.45)`); gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
}

export class Lighthouse3D {
  // at = 등대 자리 [가로, 세로] (해변 그림 비율, 왼쪽 위 0,0) — 섬 짓기의 등대는 숲 가장자리 왼쪽 끝(build.js x 0.07)
  constructor(canvas, { base = 'assets/', hour = 23, bloom = true, at = [0.2, 0.33] } = {}) {
    this.base = base; this.hour = hour; this.bloomOn = bloom; this.at = at; this.ready = false;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    r.toneMapping = THREE.NeutralToneMapping;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.timer = new THREE.Timer(); this.timer.connect(document);
    this.ambient = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(this.ambient);
    this.scene.background = new THREE.Color(0x0b1424);   // 그림 바깥이 비쳐도 밤바다 색
    this.tex = {};
  }

  async loadTex(f) {
    const t = await new THREE.TextureLoader().loadAsync(this.base + f);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  async load() {
    const [plate, sheetT] = await Promise.all([this.loadTex(ART.day), this.loadTex('catch-sheet.webp?v=v30.36.0-9042bf8')]);
    this.tex.day = plate;
    const img = plate.image, ph = PLATE_W * img.naturalHeight / img.naturalWidth;
    this.plateH = ph;
    // 바닥 (해변 그림)
    this.groundMat = new THREE.MeshLambertMaterial({ map: plate });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(PLATE_W, ph), this.groundMat);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    this.scene.add(ground);
    // 등대 (섬 짓기 그림 15칸, 세워서 카메라를 본다)
    const sheet = sheetT.image, box = boxesOf(sheet, 'catch', CELLS16, 4, 4).c15;
    const lt = sheetT.clone(); lt.needsUpdate = true;
    lt.repeat.set(box.w / sheet.naturalWidth, box.h / sheet.naturalHeight); lt.offset.set(box.x / sheet.naturalWidth, 1 - (box.y + box.h) / sheet.naturalHeight);
    const LH = 2.4, LW = LH * box.w / box.h;
    const tower = this.tower = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), new THREE.MeshLambertMaterial({ map: lt, alphaTest: 0.45 }));
    tower.geometry.translate(0, LH / 2 - LH * 0.06, 0);   // 그림 아래 모래 둔덕이 바닥에 묻히게
    const x = (this.at[0] - 0.5) * PLATE_W, z = (this.at[1] - 0.5) * ph;
    tower.position.set(x, 0, z);
    this.scene.add(tower);
    // 등불 자리 (그림에서 유리창: 가로 0.43, 위에서 0.18) — 세운 판이 카메라를 봐도 거의 같은 자리
    this.lampLocal = new THREE.Vector3((0.43 - 0.5) * LW, LH * (1 - 0.18) - LH * 0.06, 0.02);
    this.lamp = new THREE.Vector3();
    // 등불 둘레 빛 + 번짐 스프라이트
    this.bulb = new THREE.PointLight(0xffc77a, 0, 5.5, 1.6);
    this.glow = glowSprite(); this.glow.scale.setScalar(1.3);
    this.scene.add(this.bulb, this.glow);
    // 도는 빛줄기 둘 (스포트 조명 + 공기 중 빛줄기)
    this.beams = [0, Math.PI].map(a0 => {
      const spot = new THREE.SpotLight(0xffe0a6, 0, 0, BEAM_ANGLE, 0.55, 1.1);
      const target = new THREE.Object3D(); spot.target = target;
      const geo = new THREE.CylinderGeometry(0.06, REACH * Math.tan(BEAM_ANGLE), REACH, 40, 1, true);
      geo.translate(0, -REACH / 2, 0); geo.rotateX(-Math.PI / 2);   // 꼭지점이 원점, +z 로 뻗는다 (lookAt 방향)
      const mat = volumetricBeamMaterial({ color: 0xffe2a8, attenuation: REACH, anglePower: 2.2, strength: 0 });
      const cone = new THREE.Mesh(geo, mat);
      this.scene.add(spot, target, cone);
      return { a0, spot, target, cone, mat };
    });
    const comp = this.composer = new EffectComposer(this.renderer);
    comp.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.5, 0.75);
    comp.addPass(this.bloom); comp.addPass(new OutputPass());
    this.ready = true;
    await this.setHour(this.hour);
    return true;
  }
  async setHour(hour) {
    this.hour = hour; const s = this.sky = skyAt(hour);
    if (!this.ready) return;
    const want = s.art;
    if (!this.tex[want]) { try { this.tex[want] = await this.loadTex(ART[want]); } catch (e) { this.tex[want] = this.tex.day; } }
    if (this.sky.art === want) { this.groundMat.map = this.tex[want]; this.groundMat.needsUpdate = true; }
    // 불은 해 질 녘부터 (밤 1, 노을·새벽 절반)
    this.on = Math.max(s.night, 0.5 * Math.max(s.sunset, s.dawn));
  }
  setBloom(on) { this.bloomOn = on; }
  resize(w, h, dpr = 1) {
    this.renderer.setPixelRatio(Math.min(dpr, 2)); this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(Math.min(dpr, 2)); this.composer?.setSize(w, h);
    // 해변 그림이 화면을 꽉 채우게: 비스듬히(약 25°) 내려다보는 카메라 거리를 화면 비율에 맞춘다
    const ph = this.plateH || PLATE_W * 0.56, a = w / h;
    this.camera.aspect = a; this.camera.fov = 40;
    const tilt = 0.36, vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const needH = Math.min(ph * 0.9, (PLATE_W * 0.86) / a);   // 가로·세로 모두 그림 안쪽만 보이게 (가장자리 검은 틈이 없게, 끝은 조금 잘림)
    const dist = needH / 2 / Math.tan(vfov / 2);
    this.camera.position.set(0, Math.cos(tilt) * dist, Math.sin(tilt) * dist + ph * 0.02);
    this.camera.lookAt(0, 0, ph * 0.02);
    this.camera.updateProjectionMatrix();
  }
  start() { this.renderer.setAnimationLoop(() => this.frame()); }
  stop() { this.renderer.setAnimationLoop(null); }
  frame() {
    if (!this.ready) return;
    this.timer.update();
    const t = this.timer.getElapsed(), on = this.on ?? 0;
    // 등대 판은 카메라를 본다 (세로축만 돌리지 않고 통째로 — 그림이 정면으로 보이게)
    this.tower.quaternion.copy(this.camera.quaternion);
    this.tower.updateMatrixWorld();
    this.lamp.copy(this.lampLocal).applyMatrix4(this.tower.matrixWorld);
    const fl = 0.92 + 0.08 * Math.sin(t * 6.1) * Math.sin(t * 2.3);
    this.bulb.position.copy(this.lamp); this.bulb.intensity = 9 * on * fl;
    this.glow.position.copy(this.lamp); this.glow.material.opacity = on * fl; this.glow.visible = on > 0.02;
    this.ambient.intensity = 1;   // 그림 밝기 그대로 (불빛은 그 위에 더해진다)
    for (const b of this.beams) {
      const a = t * 0.45 + b.a0;
      // 빛줄기는 등불 높이에서 거의 수평으로, 조금 아래를 향해 뻗어 멀리서 모래·물에 닿는다
      b.target.position.set(this.lamp.x + Math.cos(a) * REACH, 0, this.lamp.z + Math.sin(a) * REACH * 0.62);
      b.spot.position.copy(this.lamp); b.spot.intensity = 260 * on;
      b.cone.position.copy(this.lamp); b.cone.lookAt(b.target.position);
      b.mat.uniforms.spotPosition.value.copy(this.lamp);
      b.mat.uniforms.strength.value = 0.55 * on;
      b.cone.visible = on > 0.02;
    }
    if (this.bloomOn) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.stop();
    this.scene.traverse(o => { o.geometry?.dispose(); for (const m of [o.material ?? []].flat()) { for (const v of Object.values(m)) if (v?.isTexture) v.dispose(); m.dispose(); } });
    for (const t of Object.values(this.tex)) t.dispose();
    this.composer?.dispose(); this.renderer.dispose();
  }
}
