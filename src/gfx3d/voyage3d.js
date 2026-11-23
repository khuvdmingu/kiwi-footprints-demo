// gfx3d/voyage3d.js — 항해 장면을 three.js 로 (2.5D: 비스듬히 내려다본 3D 바다 + 그린 그림 그대로의 배·돛·키위)
//  사용자 2026-11-22: "항해모드 한번 해보자. 브랜치로 그래픽 업데이트 모듈을 만들자" · "three.js 관련 스킬이나 오픈소스가 있으면 받아서 적용해"
//  지금 2D 항해(voyage-scene.js)는 그대로 두고, 이 모듈은 따로 켜는 고급 그래픽 판이다 (시험 페이지 gfx-lab.html).
//
//  · 바다: 항해 바다 그림(sea*.webp)을 물결 치는 3D 면(사인파 넷)에 입히고 빛을 받게 한다(MeshStandardMaterial + onBeforeCompile).
//    해가 낮으면 배 앞 물 위에 반사광 빛길이 저절로 생기고, 물결 기울기마다 반짝인다. 물은 배 쪽(화면 아래)으로 흐른다.
//  · 배·돛·키위: 2D 항해와 같은 그림. 배는 물결을 따라 오르내리고 앞뒤·좌우로 기울며, 해·달 쪽에서 그림자를 물에 드리운다.
//    돛(잎)은 돛대에 서서 바람에 흔들리고 빛을 받는다. 키위는 늘 화면을 보는 판.
//  · 밤: 달빛 + 뱃머리 등불(점 조명)이 돛·키위·물을 따뜻하게 비춘다. 빛 번짐(UnrealBloomPass)은 켜고 끌 수 있다.
//  three.js 사용법은 받아 둔 스킬(.claude/skills/threejs-*)의 r186 규칙을 따른다 (vendor/VENDOR.md).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { skyAt, waveAt, WAVES_GLSL } from './sky.js?v=v30.39.0-0299996';
import { boxesOf, SPEED } from '../voyage-scene.js?v=v30.39.0-0299996';

const SEA = 60;            // 바다 면 크기 (월드 단위)
const TEX_W = 52;          // 바다 그림 한 장이 덮는 폭 — 비스듬히 보이는 깊이(가까운 물~안개)까지 한 장이 덮어야 거울 이음매가 덜 보인다
const BOAT = 2.1;          // 배 그림 판 크기 (나무 보트 길이 ≈ 1.9)
const FLOW = 0.9;          // 물이 흐르는 빠르기 (월드 단위/초 — 2D 의 SPEED 와 비슷하게 보이게)
const ART = { day: 'sea.webp?v=v30.39.0-0299996', sunset: 'sea-sunset.webp?v=v30.39.0-0299996', night: 'sea-night.webp?v=v30.39.0-0299996', dawn: 'sea-dawn.webp?v=v30.39.0-0299996' };
const CREW = ['up', 'left', 'right', 'sleep', 'sky', 'wave'];
const SEATS = [[-0.19, -0.04, 'up'], [0.19, -0.04, 'right'], [0, 0.26, 'left']];   // voyage-scene WIDE_SEATS 와 같은 자리 (배 폭·길이 비율)

const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

// 그림 격자의 한 칸만 쓰는 텍스처 (같은 그림을 나눠 씀)
function cropTex(base, img, box) {
  const t = base.clone(); t.needsUpdate = true;
  const W = img.naturalWidth, H = img.naturalHeight;
  t.repeat.set(box.w / W, box.h / H); t.offset.set(box.x / W, 1 - (box.y + box.h) / H);
  return t;
}
// 잘라 낸 그림 판 (투명한 곳은 그림자도 안 생기게 customDepthMaterial 에 같은 그림)
function cutout(tex, w, h, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0x9a9a9a, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.4, alphaTest: 0.45, roughness: opts.roughness ?? 0.85, side: opts.side ?? THREE.FrontSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.45 });
  mesh.castShadow = true;
  return mesh;
}

export class Voyage3D {
  constructor(canvas, { base = 'assets/', hour = 12, bloom = true } = {}) {
    this.base = base; this.hour = hour; this.bloomOn = bloom; this.travel = 0; this.ready = false;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    r.toneMapping = THREE.NeutralToneMapping;   // 그린 색을 덜 바꾸는 톤 매핑
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
    this.camera.position.set(0, 8.2, 7.4); this.camera.lookAt(0, 0, -1.4);
    this.timer = new THREE.Timer(); this.timer.connect(document);
    // 빛: 해(또는 달) + 하늘·바닥 반사광 + 밤 등불
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 40 });
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.02;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x224455, 1);
    this.lamp = new THREE.PointLight(0xffc27a, 0, 7, 2);
    this.scene.add(this.sun, this.sun.target, this.hemi);
  }

  async load() {
    const b = this.base, tl = new THREE.TextureLoader();
    const tex = async f => { const t = await tl.loadAsync(b + f); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.renderer.capabilities.getMaxAnisotropy(); return t; };
    const [boatT, sailT, crewT] = await Promise.all([tex('voyage-boat.webp?v=v30.39.0-0299996'), tex('voyage-sail.webp?v=v30.39.0-0299996'), tex('voyage-crew.webp?v=v30.39.0-0299996')]);
    this.seaTex = {};
    this.seaTex.day = await tex(ART.day);
    for (const t of Object.values(this.seaTex)) this.prepSea(t);
    // 바다 면
    const geo = new THREE.PlaneGeometry(SEA, SEA, 240, 240);
    // 반사 세기(specularIntensity)를 시간대마다 바꾼다: 한낮엔 약하게(하얀 얼룩 방지), 노을·밤엔 세게(빛길)
    //  그린 색을 바탕으로 깐다(emissiveMap = 같은 그림): 빛이 그림을 어둡게 만들지 않고, 물결 음영·반사만 위에 더해진다
    const mat = this.seaMat = new THREE.MeshPhysicalMaterial({ map: this.seaTex.day, color: 0x666666, emissive: 0xffffff, emissiveMap: this.seaTex.day, emissiveIntensity: 0.62, roughness: 0.36, metalness: 0, specularIntensity: 0.4 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uT = { value: 0 }; sh.uniforms.uTravel = { value: 0 }; sh.uniforms.uRipple = { value: 1 };
      mat.userData.shader = sh;
      // 잔물결: 면의 방향만 촘촘히 흔든다(모양은 그대로) → 해·달 반사가 큰 얼룩이 아니라 작은 반짝임으로 부서진다
      sh.fragmentShader = 'varying vec2 vSp;\nuniform float uT;\nuniform float uRipple;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', `
        #include <normal_fragment_maps>
        {
          vec2 g = vec2(0.0);
          g += 0.55 * cos(dot(vSp, vec2(7.3, 11.9)) - uT * 2.7) * vec2(7.3, 11.9) / 14.0;
          g += 0.45 * cos(dot(vSp, vec2(-12.7, 9.1)) - uT * 3.3 + 1.7) * vec2(-12.7, 9.1) / 15.6;
          g += 0.35 * cos(dot(vSp, vec2(17.9, -5.3)) - uT * 4.1 + 0.6) * vec2(17.9, -5.3) / 18.7;
          g += 0.25 * cos(dot(vSp, vec2(3.1, 23.7)) - uT * 4.9 + 2.9) * vec2(3.1, 23.7) / 23.9;
          normal = normalize(normal + mat3(viewMatrix) * vec3(-g.x, 0.0, -g.y) * 0.22 * uRipple);
        }`);
      sh.vertexShader = 'varying vec2 vSp;\n' + WAVES_GLSL + sh.vertexShader
        .replace('#include <beginnormal_vertex>', `
          vec2 sp = vec2(position.x, -position.y - uTravel);   // 물에 붙은 좌표 (물이 화면 아래로 흐른다)
          vec3 wv = waveAt(sp); vSp = sp;
          vec3 objectNormal = normalize(vec3(-wv.y, wv.z, 1.0));
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3(tangent.xyz);
          #endif`)
        .replace('#include <begin_vertex>', `
          vec3 transformed = vec3(position);
          transformed.z += wv.x;`);
    };
    const sea = this.sea = new THREE.Mesh(geo, mat);
    sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true;
    this.scene.add(sea);
    // 배 · 돛 · 키위 (2D 항해와 같은 그림)
    const boatImg = boatT.image, sailImg = sailT.image, crewImg = crewT.image;
    const hb = boxesOf(boatImg, 'hull', ['h'], 1, 1).h, sb = boxesOf(sailImg, 'sail', ['s'], 1, 1).s;
    const boatGroup = this.boat = new THREE.Group();
    const hullW = BOAT * hb.w / hb.h;
    const hull = cutout(cropTex(boatT, boatImg, hb), hullW, BOAT, { roughness: 0.7 });
    hull.rotation.x = -Math.PI / 2; hull.position.y = 0.06; hull.receiveShadow = true;
    boatGroup.add(hull);
    // 돛대 + 잎 돛 (뱃머리 쪽)
    const mastZ = -BOAT * 0.41, mastH = 1.15;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, mastH, 8), new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.8 }));
    mast.position.set(0, mastH / 2 + 0.06, mastZ); mast.castShadow = true; boatGroup.add(mast);
    const sailH = 1.25, sailW = sailH * sb.w / sb.h;
    const sail = this.sail = cutout(cropTex(sailT, sailImg, sb), sailW, sailH, { side: THREE.DoubleSide, roughness: 0.6 });
    sail.geometry.translate(0, -sailH / 2, 0);   // 꼭지(잎자루)를 돛대 끝에 매단다
    const sailPivot = this.sailPivot = new THREE.Group();
    sailPivot.position.set(0, mastH + 0.08, mastZ + 0.04); sailPivot.add(sail); sail.rotation.x = -0.35;
    boatGroup.add(sailPivot);
    // 키위 셋 (늘 화면을 본다)
    const cells = boxesOf(crewImg, 'crew', CREW, 3, 2);
    this.crew = [];
    for (const [sx, sy, pose] of SEATS) {
      const box = cells[pose]; if (!box) continue;
      const kh = 0.5, kw = kh * box.w / box.h;
      const k = cutout(cropTex(crewT, crewImg, box), kw, kh, { roughness: 0.9 });
      k.geometry.translate(0, kh / 2, 0);
      const holder = new THREE.Group(); holder.position.set(sx * hullW, 0.1, sy * BOAT); holder.add(k);
      boatGroup.add(holder); this.crew.push({ holder, k, ph: Math.random() * 6 });
    }
    // 뱃머리 등불 (밤)
    this.lamp.position.set(0.0, 0.45, -BOAT * 0.36); boatGroup.add(this.lamp);
    this.lampGlow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd08a }));
    this.lampGlow.position.copy(this.lamp.position); boatGroup.add(this.lampGlow);
    this.scene.add(boatGroup);
    // 빛 번짐 (받은 스킬 규칙: RenderPass → UnrealBloomPass → OutputPass)
    const comp = this.composer = new EffectComposer(this.renderer);
    comp.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.4, 0.86);
    comp.addPass(this.bloom); comp.addPass(new OutputPass());
    this.ready = true;
    this.setHour(this.hour);
    return true;
  }
  prepSea(t) {
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
    // 2D 항해처럼 그림 한 장이 보이는 폭을 덮고(가로로는 거울 이음매가 안 보이게) 배 자리에 그림 가운데가 온다.
    //  흐르는 쪽(세로)만 거울 반복 — 2D voyage-water.js 와 같은 방식
    const img = t.image, th = TEX_W * img.naturalHeight / img.naturalWidth;
    t.repeat.set(SEA / TEX_W, SEA / th); t.userData.th = th;
    t.userData.ox = 0.5 - 0.5 * t.repeat.x; t.userData.oy = 0.5 - 0.5 * t.repeat.y;
    t.offset.set(t.userData.ox, t.userData.oy);
  }
  // 시간대: 해·달 방향·색, 하늘, 바다 그림(낮·노을·밤·새벽), 안개, 등불
  async setHour(hour) {
    this.hour = hour; const s = this.sky = skyAt(hour);
    if (!this.ready) return;
    this.sun.color.setRGB(...s.color); this.sun.intensity = s.intensity;
    this.sun.position.set(...s.dir).normalize().multiplyScalar(20);
    this.hemi.color.setRGB(...s.sky); this.hemi.groundColor.setRGB(...s.ground); this.hemi.intensity = s.hemi;
    const fog = new THREE.Color().setRGB(...s.fog);
    this.scene.background = fog; this.scene.fog = new THREE.Fog(fog, 13, 30);
    this.lamp.intensity = s.night * 9; this.lampGlow.visible = s.night > 0.2;
    this.bloom.strength = 0.25 + 0.3 * Math.max(s.night, s.warm) + 0.15 * s.night;   // 노을은 약하게(뿌옇지 않게), 밤 달빛은 조금 더
    const glint = Math.max(s.night, s.warm);
    this.seaMat.specularIntensity = 0.08 + 0.62 * glint; this.seaMat.roughness = 0.3 - 0.2 * glint;   // 노을·밤엔 매끈하게 → 반짝임이 작고 또렷
    this.seaMat.emissiveIntensity = 0.62 - 0.12 * s.night;
    this.ripple = 0.45 + 0.55 * glint;   // 한낮엔 잔물결 반짝임을 줄인다 (규칙 무늬처럼 보임)
    const want = s.art;
    if (!this.seaTex[want]) {
      const tl = new THREE.TextureLoader();
      try { const t = await tl.loadAsync(this.base + ART[want]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.renderer.capabilities.getMaxAnisotropy(); this.prepSea(t); this.seaTex[want] = t; }
      catch (e) { this.seaTex[want] = this.seaTex.day; }
    }
    if (this.sky.art === want) { this.seaMat.map = this.seaMat.emissiveMap = this.seaTex[want]; this.seaMat.needsUpdate = true; }
  }
  setBloom(on) { this.bloomOn = on; }
  resize(w, h, dpr = 1) {
    this.renderer.setPixelRatio(Math.min(dpr, 2)); this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(Math.min(dpr, 2)); this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 52 : 40;   // 세로 화면은 조금 넓게
    this.camera.updateProjectionMatrix();
  }
  start() { this.renderer.setAnimationLoop(() => this.frame()); }
  stop() { this.renderer.setAnimationLoop(null); }
  frame() {
    if (!this.ready) return;
    this.timer.update();
    const dt = Math.min(0.1, this.timer.getDelta()), t = this.timer.getElapsed();
    this.travel += FLOW * dt;
    const sh = this.seaMat.userData.shader;
    if (sh) { sh.uniforms.uT.value = t; sh.uniforms.uTravel.value = this.travel; sh.uniforms.uRipple.value = this.ripple ?? 1; }
    const map = this.seaMat.map;   // 그림도 물과 같이 흐른다
    if (map) map.offset.y = map.userData.oy + (this.travel / map.userData.th) % 2;
    // 배: 물결 높이를 따라 오르내리고, 앞뒤·좌우 기울기를 따라 기운다 (바로 따라가지 않고 부드럽게)
    const at = (x, z) => waveAt(x, z - this.travel, t);   // 셰이더의 sp 와 같은 좌표 (월드 z − 흘러간 거리)
    const c = at(0, 0), f = at(0, -0.8), bk = at(0, 0.8), l = at(-0.45, 0), rr = at(0.45, 0);
    const b = this.boat;
    b.position.y += ((c.y + f.y + bk.y) / 3 - b.position.y) * Math.min(1, dt * 4);
    const pitch = Math.atan2(f.y - bk.y, 1.6), roll = Math.atan2(rr.y - l.y, 0.9);
    b.rotation.x += (pitch * 0.9 - b.rotation.x) * Math.min(1, dt * 3);
    b.rotation.z += (roll * 0.9 - b.rotation.z) * Math.min(1, dt * 3);   // 오른쪽 물이 높으면 오른쪽이 든다
    b.rotation.y = Math.sin(t * 0.23) * 0.05;
    // 돛: 바람에 살랑
    this.sail.rotation.x = -0.35 + Math.sin(t * 1.3) * 0.06;
    this.sailPivot.rotation.y = Math.sin(t * 0.7) * 0.12;
    // 키위는 화면을 본다 (판을 카메라 쪽으로) + 살짝 들썩
    const q = this.camera.quaternion;
    for (const m of this.crew) {
      m.holder.quaternion.copy(b.quaternion).invert().multiply(q);
      m.k.position.y = Math.max(0, Math.sin(t * 2.1 + m.ph)) * 0.015;
    }
    this.lampGlow.material.color.setScalar(1).multiplyScalar(0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 2.1));
    this.sun.target.position.set(0, 0, 0);
    if (this.bloomOn) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.stop();
    this.scene.traverse(o => { o.geometry?.dispose(); for (const m of [o.material ?? []].flat()) { for (const v of Object.values(m)) if (v?.isTexture) v.dispose(); m.dispose(); } });
    for (const t of Object.values(this.seaTex || {})) t.dispose();
    this.composer?.dispose(); this.renderer.dispose();
  }
}
export { SPEED };
