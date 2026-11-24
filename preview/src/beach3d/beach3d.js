// beach3d/beach3d.js — 해변을 three.js 로, 구조부터 다시 (물에 집중)
//  사용자 2026-11-23: "해변가에서 물에 집중한 three js 한번 만들어봐 구조부터 아예 다시 세우는 브랜치로"
//
//  한 프레임의 흐름 (그리는 순서 = 구조):
//   ① 바닥 층 → groundRT   모래 그림 + 모래 위에 놓이는 것(발자국 등). 물은 이 그림을 "물 아래로" 굴절시켜 본다
//   ② 젖음·거품 기억 → simRT 물이 닿은 곳·물가 거품이 지나간 곳을 프레임을 넘어 기억한다 (마르고 스러진다)
//   ③ 물 합성 → compRT      바닥 그림에 물을 얹는다: 굴절·빛 그물·색 흡수·그려진 바다·하늘 비침·반사광·거품·젖은 모래
//   ④ 입체 판 → 화면         합성 그림을 입힌 판이 모래·바위·물 높이만큼 솟는다. 카메라를 기울이면 입체가 보인다. 빛 번짐은 여기서
//  모래 높이·물 높이 식은 model.js 한 곳(JS·GLSL 공용) → 물가선 위치를 JS 로도 물을 수 있다(edgeY — 발자국 지우기에 씀).
//  지금 2D 해변(water.js·beach.js·main.js)은 건드리지 않는다. three.js 사용법은 받아 둔 스킬(vendor/threejs-skills) 규칙을 따른다.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { loadPlate } from '../plate.js?v=pv-7441cb8';
import { MAPS } from '../maps.js?v=pv-7441cb8';
import { skyAt } from '../gfx3d/sky.js?v=pv-7441cb8';
import { artAt } from '../atmos.js?v=pv-7441cb8';   // 시간대 그림 가중치 — 2D 게임과 같은 식
import { M, edgeD, terrainH, packEdge } from './model.js?v=pv-7441cb8';
import { KIWI, makeActor, stepActor } from './layers/actors.js?v=pv-7441cb8';
import { WEATHERS, approach } from './layers/weather.js?v=pv-7441cb8';
import { waterFor, mergeWater } from './water-gfx.js?v=pv-7441cb8';
import { makeWaveSlopes, WAVE_TEX } from './water/normals.js?v=pv-7441cb8';
import { ALL_ON, LAYER_INDEX } from './water/layers.js?v=pv-7441cb8';   // 물을 겹으로 나눠 켜고 끈다   // 잔물결 그림 (이음새 없이 반복)
import { terrainFor, mergeTerrain, rockEdgePoints } from './terrain-gfx.js?v=pv-7441cb8';   // 지형 모듈: 맵마다 다른 돌·모래 성질   // 워터 그래픽 모듈: 맵마다 다른 물 성질
import { MAX_PARTICLES, makeParticles, stepParticles, particleAlpha, burst } from './layers/particles.js?v=pv-7441cb8';
import { sandArea, layoutPrints, washed } from './layers/prints.js?v=pv-7441cb8';
import { PARTICLE_VERT, PARTICLE_FRAG, QUAD_VERT, SAND_FRAG, SIM_FRAG, WATER_FRAG, RELIEF_VERT, RELIEF_FRAG } from './shaders.js?v=pv-7441cb8';

const PLANE_W = 32;                    // 입체 판의 폭 (월드 단위)
const FOV = 30;
const ART = { day: '', sunset: '-sunset', night: '-night', dawn: '-dawn' };
const mix = (a, b, k) => a + (b - a) * k;
const mix3 = (a, b, k) => a.map((v, i) => mix(v, b[i], k));

export class Beach3D {
  constructor(canvas, { base = 'assets/', map = 'beach', hour = 12, tilt = 0, bloom = true, waves = 1, quality = 1, plate = null, game = false } = {}) {
    this.givenPlate = plate; this.game = game;   // 게임 연결(game.js): 게임이 읽어 둔 판을 그대로 쓰고, 물가선은 게임이 준다
    Object.assign(this, { base, mapId: map, hour, tilt, bloomOn: bloom, waves, quality: Math.min(1, Math.max(0.25, quality)), ready: false, t: 0, debug: 0 });
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: game });   // 게임에서는 사진 찍기가 이 캔버스를 읽는다
    r.outputColorSpace = THREE.LinearSRGBColorSpace;   // 그림 값을 그대로 낸다 (변환 없음)
    r.toneMapping = THREE.NoToneMapping;
    r.autoClear = true;
    this.timer = new THREE.Timer(); this.timer.connect(document);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
    this.quad = new FullScreenQuad(null);
    this.rips = Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, -99, 0)); this.ripN = 0;
    this.marks = []; this.tex = {}; this.loading = {};
    this.art = { uArtW: { value: 0 }, uArtN: { value: 0 } };
    this.wx = { uRain: { value: 0 }, uFog: { value: 0 }, uFogCol: { value: new THREE.Color(0.86, 0.89, 0.9) } }; this.wxTo = { rain: 0, fog: 0 };   // 날씨 (layers/weather.js)   // 모래·바다 그림이 함께 쓰는 섞는 값
  }

  // 그림을 raw 값 그대로 쓰는 텍스처
  texOf(image) {
    const t = new THREE.Texture(image); t.needsUpdate = true;
    t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;   // 큰 그림(3200px) — 밉맵 없이 (합성은 거의 1:1 로 읽는다)
    return t;
  }
  async loadTex(file) { const t = await new THREE.TextureLoader().loadAsync(this.base + file); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; }

  async load() {
    //  세로 화면이면 세로 그림(tall)을 쓴다 — 2D 게임과 같은 규칙. 열 때의 화면 방향으로 정한다(돌리면 다시 열어야 함)
    const m = MAPS[this.mapId] || MAPS.beach, tall = this.tall = !!m.tall && (this.H || 0) > (this.W || 1), name = tall ? m.tall : m.wide;
    // 그림 분석(물가선·숲 줄)은 2D 와 같은 plate.js 를 쓴다
    const plate = this.plate = this.givenPlate || await loadPlate(this.base, name, { stones: !!m.stones, shoreFrom: m.shoreFrom, ground: m.ground, tone: !!m.tone, shoreFix: m.shoreFix?.[tall ? 'tall' : 'wide'], moss: !!m.moss, art: m.art !== false, rockFill: !!m.rockFill, rockArt: m.rockArt !== false, curve: !!m.curve });
    const pw = this.pw = plate.pw, ph = this.ph = plate.ph;
    this.u = ph / 800;   // u 한 칸 (그림 px)
    this.name = plate.name || name;
    this.tex.day = { dry: this.texOf(plate.dry), sea: this.texOf(plate.sea) };
    // 물가선 → 가로 800칸 데이터 (16비트를 두 바이트에)
    const n = 800, data = new Uint8Array(n * 4), src = plate.shoreP;
    this.shore = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const fi = i / (n - 1) * (src.length - 1), a = Math.floor(fi), b = Math.min(src.length - 1, a + 1);
      const y = src[a] + (src[b] - src[a]) * (fi - a); this.shore[i] = y;
      const v = Math.round(Math.min(1, Math.max(0, y / ph)) * 65535);
      data[i * 4] = v >> 8; data[i * 4 + 1] = v & 255; data[i * 4 + 3] = 255;
    }
    const shoreTex = new THREE.DataTexture(data, n, 1); shoreTex.needsUpdate = true;   // DataTexture 기본: NearestFilter·flipY false
    // 바위 가림막 (작게 줄여 가장자리를 부드럽게 — 바위 안 작은 구멍도 메워진다)
    // 바위 가림막 두 장 (지형 모듈): 또렷한 판(돌 자리·가장자리) + 넓게 번진 판(돌 둘레 — 얕아짐·잔물결·거품 고리·그늘)
    const mkCv = (w) => { const c = document.createElement('canvas'); c.width = w; c.height = Math.max(2, Math.round(w * ph / pw)); return c; };
    const rc = mkCv(1024), rg = rc.getContext('2d'); rg.fillStyle = '#000'; rg.fillRect(0, 0, rc.width, rc.height);
    if (plate.rockArt) rg.drawImage(plate.rockArt, 0, 0, rc.width, rc.height);
    const tiny = mkCv(56), tg = tiny.getContext('2d'); tg.imageSmoothingEnabled = true; tg.drawImage(rc, 0, 0, tiny.width, tiny.height);   // 작게 줄였다 키우면 넓게 번진다
    const soft = mkCv(224), sg = soft.getContext('2d'); sg.imageSmoothingEnabled = true; sg.drawImage(tiny, 0, 0, soft.width, soft.height);
    const rockTex = new THREE.CanvasTexture(rc), rockSoftTex = this.rockSoftTex = new THREE.CanvasTexture(soft);
    // 2.5D 물속 돌 판 (<판>-rock25.webp, 2026-11-24 — tools/rock25.py): 돌 자리를 또렷하게 + 높이. 없으면 예전 가림막만
    const rock25 = this.rock25Tex = plate.rockArt ? await this.loadTex(this.name + '-rock25.webp?v=pv-7441cb8').catch(() => null) : null;
    const none25 = this.none25 = new THREE.DataTexture(new Uint8Array(4), 1, 1); none25.needsUpdate = true;
    // 돌 자리를 JS 로도 묻는다 (누르기 · 물방울이 튀는 자리): 작은 격자의 밝기
    const grid = mkCv(256), gg = grid.getContext('2d', { willReadFrequently: true }); gg.drawImage(rc, 0, 0, grid.width, grid.height);
    const gd = gg.getImageData(0, 0, grid.width, grid.height).data; this.rockGW = grid.width; this.rockGH = grid.height;
    this.rockGrid = new Uint8Array(grid.width * grid.height); for (let k = 0; k < this.rockGrid.length; k++) this.rockGrid[k] = gd[k * 4];
    const gx2p = pw / grid.width, gy2p = ph / grid.height;
    this.rockPts = rockEdgePoints(this.rockGrid, grid.width, grid.height, (x, y) => (y + 0.5) * gy2p > this.shoreAt((x + 0.5) * gx2p) + 6 * this.u).map(([x, y]) => [(x + 0.5) * gx2p, (y + 0.5) * gy2p]);
    // 모든 식이 함께 쓰는 값
    const shared = this.shared = {
      uShore: { value: shoreTex }, uRock: { value: rockTex }, uRockSoft: { value: rockSoftTex }, uTRock: { value: 1 }, uRock25: { value: rock25 || none25 }, uHas25: { value: rock25 ? 1 : 0 }, uPlate: { value: new THREE.Vector2(pw, ph) }, uU: { value: this.u },
      uT: { value: 0 }, uAmp: { value: this.waves }, uSwell: { value: 1 }, uRip: { value: this.rips }, uL: { value: (this.layers || ALL_ON).slice() },
      uEdge: { value: this.edgeTex = new THREE.DataTexture(this.edgeData = new Uint8Array(128 * 4 * 2), 128, 2) }, uExt: { value: 0 }, uEdgeX: { value: new THREE.Vector2(0, pw) },
    };

    // ① 바닥 층: 모래 그림 + 모래 위의 것 (그림 좌표: x 오른쪽, y 는 위가 0 이라 −y 로 놓는다)
    this.ground = new THREE.Scene();
    this.groundCam = new THREE.OrthographicCamera(0, pw, 0, -ph, -10, 10);
    const d0 = this.tex.day;
    this.sandMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: SAND_FRAG, uniforms: { ...this.art, uDryD: { value: d0.dry }, uDryW: { value: d0.dry }, uDryN: { value: d0.dry } } });
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), this.sandMat); sand.position.set(pw / 2, -ph / 2, 0);
    this.ground.add(sand);
    // 발자국 자국 층 (투명 캔버스) — 모래 위에 찍히고 물이 지나가면 지워진다
    const mc = this.markCv = document.createElement('canvas'); mc.width = 1600; mc.height = Math.round(1600 * ph / pw);
    this.markTex = new THREE.CanvasTexture(mc);
    const marks = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: this.markTex, transparent: true }));
    marks.position.set(pw / 2, -ph / 2, 1); this.ground.add(marks);

    // ②③ 식
    this.simMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: SIM_FRAG, uniforms: { ...shared, uPrev: { value: null }, uDt: { value: 0 }, uRain: this.wx.uRain } });
    // 잔물결 그림: 그래픽 카드가 화면 칸에 맞춰 걸러 쓰도록(밉맵) 만든다 — 자글거림을 막는 몫이 여기 있다
    this.waveTex = new THREE.DataTexture(makeWaveSlopes(), WAVE_TEX, WAVE_TEX);
    this.waveTex.wrapS = this.waveTex.wrapT = THREE.RepeatWrapping;
    this.waveTex.generateMipmaps = true; this.waveTex.minFilter = THREE.LinearMipmapLinearFilter; this.waveTex.magFilter = THREE.LinearFilter;
    this.waveTex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy()); this.waveTex.needsUpdate = true;
    this.waterMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: WATER_FRAG,
      uniforms: {
        ...shared, ...this.wx, uGround: { value: null },
        uWFoam: { value: 1 }, uWCrest: { value: 1 }, uWLace: { value: 1 }, uWClarity: { value: 1 }, uWDeep: { value: 1 }, uWTint: { value: new THREE.Vector3(1, 1, 1) },
        uWRefract: { value: 1 }, uWSky: { value: 1 }, uWSparkle: { value: 1 },
        uTSoft: { value: 1 }, uTFoam: { value: 1 }, uTRipple: { value: 1 }, uTWet: { value: 1 }, uTShadow: { value: 1 }, uTSandWet: { value: 1 }, uTSandMirror: { value: 1 }, ...this.art, uSeaD: { value: d0.sea }, uSeaW: { value: d0.sea }, uSeaN: { value: d0.sea }, uSim: { value: null },
        uCam: { value: new THREE.Vector3() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() },
        uSpec: { value: 1 }, uShine: { value: 600 }, uPath: { value: 200 }, uGlow: { value: 0.08 }, uSkyCol: { value: new THREE.Color() }, uWaterCol: { value: new THREE.Color() },
        uFoamCol: { value: new THREE.Color() }, uCaus: { value: 0.5 }, uDebug: { value: 0 }, uWaveN: { value: this.waveTex }, uGlit: { value: 0 },
      },
    });
    // ④ 입체 판
    const pH = this.planeH = PLANE_W * ph / pw;
    this.reliefMat = new THREE.ShaderMaterial({ vertexShader: RELIEF_VERT, fragmentShader: RELIEF_FRAG, uniforms: { ...shared, uComp: { value: null }, uRelief: { value: this.game ? 0 : 0.16 } } });
    const relief = this.relief = new THREE.Mesh(new THREE.PlaneGeometry(PLANE_W, pH, 256, 144), this.reliefMat);
    relief.rotation.x = -Math.PI / 2;   // 판을 눕힌다 (그림 위쪽 = 화면 안쪽 −z)
    relief.frustumCulled = false;
    this.scene.add(relief);
    this.scene.background = new THREE.Color(0x0b1424);
    // 빛 번짐
    const comp = this.composer = new EffectComposer(this.renderer);
    comp.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.35, 1.0);   // 1.0 넘는 값(반사광)만 번진다 — 흰 거품은 그대로
    comp.addPass(this.bloom); comp.addPass(new OutputPass());
    this.makeParticleLayer();
    this.water = waterFor(this.mapId);   // 이 맵의 물 성질 (water-gfx.js)
    this.terrain = terrainFor(this.mapId); this.applyTerrain();   // 이 맵의 돌·모래 성질 (terrain-gfx.js)
    if (this.game) this.actors = []; else await this.makeActors();   // 게임에서는 키위·글씨를 게임이 그린다
    this.ready = true;
    this.makeTargets();
    await this.setHour(this.hour);
    return true;
  }

  // 중간 그림 버퍼. 합성은 화면에 보이는 크기에 맞추고(최대 2048), 기억 버퍼는 작게
  makeTargets() {
    if (!this.ready) return;
    const { pw, ph } = this, s = Math.max((this.W || 800) / pw, (this.H || 600) / ph) * (this.dpr || 1);
    //  quality(0.25~1): 합성 그림 크기 배율 — 폰에서 무거우면 낮춘다(물 합성 셰이더가 픽셀 수만큼 든다). 화면 해상도는 그대로
    const w = Math.max(256, Math.min(2048, Math.round(pw * s * this.quality))), h = Math.round(w * ph / pw);
    if (this.compRT && this.compRT.width === w) return;
    for (const k of ['groundRT', 'compRT', 'simA', 'simB']) this[k]?.dispose();
    const opt = { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.groundRT = new THREE.WebGLRenderTarget(w, h, opt);
    this.compRT = new THREE.WebGLRenderTarget(w, h, { ...opt, type: THREE.HalfFloatType });   // 1 넘는 반사광을 남겨 둔다(빛 번짐용)
    const sw = 768, sh = Math.round(768 * ph / pw);
    this.simA = new THREE.WebGLRenderTarget(sw, sh, { ...opt, type: THREE.HalfFloatType });   // 천천히 마르는 값이라 8비트로는 계단이 진다
    this.simB = new THREE.WebGLRenderTarget(sw, sh, { ...opt, type: THREE.HalfFloatType });
    this.reliefMat.uniforms.uComp.value = this.compRT.texture;
    this.waterMat.uniforms.uGround.value = this.groundRT.texture;
  }

  // 시간대: 그림 판(낮·노을·밤·새벽)과 빛
  async setHour(hour) {
    this.hour = hour; const s = this.sky = skyAt(hour);
    if (!this.ready) return;
    // 시간대 그림: 낮 · 따뜻한 판(새벽 또는 노을) · 밤 세 장을 2D 게임과 같은 가중치(atmos.js artAt)로 섞는다
    const a = artAt(hour);
    this.art.uArtW.value = a.w; this.art.uArtN.value = a.n; this.warmKind = a.kind;
    if (a.w > 0) this.need(a.kind);
    if (a.n > 0) this.need('night');
    this.applyArt();
    await Promise.all(Object.values(this.loading));   // 부른 쪽이 기다리면 그림이 다 온 뒤에 돌아온다 (안 기다려도 된다)
    const u = this.waterMat.uniforms, n = s.night, warm = s.warm;
    u.uSunCol.value.setRGB(...mix3(mix3([1, 0.98, 0.9], [1, 0.8, 0.5], warm), [0.8, 0.88, 1], n));
    u.uSpec.value = mix(mix(0.6, 1.1, warm), 0.6, n);      // 한낮엔 은은하게, 노을·밤엔 또렷한 빛길
    u.uShine.value = mix(mix(700, 600, warm), 500, n);        // 반짝임 하나의 크기 — 클수록 작고 드물다 (water/shade.js 의 thr). 잔물결 그림이 걸러져서 작게 해도 자글거리지 않는다
    u.uPath.value = mix(mix(520, 560, warm), 900, n);     // 달빛 길은 좁고 곧다
    u.uGlow.value = mix(mix(0.04, 0.22, warm), 0.24, n);
    u.uSkyCol.value.setRGB(...mix3(mix3([0.72, 0.86, 0.96], [1, 0.72, 0.5], warm), [0.1, 0.16, 0.3], n));
    u.uWaterCol.value.setRGB(...mix3(mix3([0.3, 0.8, 0.76], [0.75, 0.6, 0.5], warm), [0.06, 0.16, 0.3], n));
    u.uFoamCol.value.setRGB(...mix3(mix3([1, 0.99, 0.96], [1, 0.9, 0.8], warm), [0.55, 0.66, 0.85], n));
    u.uCaus.value = 0.55 * (1 - n) * (1 - 0.5 * warm);
    this.lightBase = { spec: u.uSpec.value, path: u.uPath.value, glow: u.uGlow.value, caus: u.uCaus.value };   // 시간대의 빛 × 맵의 물 성질
    this.applyWater();
    this.wx.uFogCol.value.setRGB(...mix3(mix3([0.86, 0.89, 0.9], [0.9, 0.76, 0.68], warm), [0.2, 0.25, 0.36], n));
    this.bloom.strength = 0.25 + 0.12 * Math.max(n, warm);   // 빛 조각이 커진 만큼 번짐은 줄인다
  }
  // 시간대 그림은 필요해질 때 한 번만 읽는다. 읽는 동안은 낮 그림으로 그린다(가중치가 0 근처일 때 읽기 시작하므로 티가 안 난다)
  need(kind) {
    if (this.tex[kind] || this.loading[kind]) return;
    this.loading[kind] = Promise.all([this.loadTex(`${this.name}-dry${ART[kind]}.webp?v=pv-7441cb8`), this.loadTex(`${this.name}-sea${ART[kind]}.webp?v=pv-7441cb8`)])
      .then(([dry, sea]) => { this.tex[kind] = { dry, sea }; }, () => { this.tex[kind] = this.tex.day; })
      .then(() => { delete this.loading[kind]; if (this.ready) this.applyArt(); });
  }
  applyArt() {
    const w = this.tex[this.warmKind] || this.tex.day, n = this.tex.night || this.tex.day, su = this.sandMat.uniforms, wu = this.waterMat.uniforms;
    su.uDryW.value = w.dry; wu.uSeaW.value = w.sea; su.uDryN.value = n.dry; wu.uSeaN.value = n.sea;
  }
  setTilt(rad) { this.tilt = rad; this.place(); }
  // 겹 스위치: [0~1 × 8] (water/layers.js 의 LAYERS 차례). 모두 0 이면 원래 일러스트 그대로
  setLayers(arr) { this.layers = arr.slice(); if (this.shared) this.shared.uL.value = this.layers; }
  layer(key) { return (this.layers || ALL_ON)[LAYER_INDEX[key]]; }
  setWaves(k) { this.waves = k; if (this.shared) this.shared.uAmp.value = k; }
  setBloom(on) { this.bloomOn = on; }
  // 워터 그래픽: 물 성질 한 벌을 넣는다 (water-gfx.js 의 waterFor · waterOfKind · tuneWater 로 만든 값. 빠진 값은 바다 기본)
  setWater(w) { this.water = mergeWater(w); this.applyWater(); }
  // 지형: 돌·모래 성질 한 벌을 넣는다 (terrain-gfx.js 의 terrainFor · terrainOfKind · tuneTerrain 으로 만든 값)
  setGlitter(on) { if (this.waterMat) this.waterMat.uniforms.uGlit.value = on ? 1 : 0; }   // 게임이 2D 윤슬을 함께 그리는가
  setTerrain(t) { this.terrain = mergeTerrain(t); this.applyTerrain(); }
  applyTerrain() {
    if (!this.waterMat) return;
    const t = this.terrain || mergeTerrain(), u = this.waterMat.uniforms;
    u.uTSoft.value = Math.max(0.15, t.rockSoft); u.uTFoam.value = t.rockFoam; u.uTRipple.value = t.rockRipple; u.uTWet.value = t.rockWet; u.uTShadow.value = t.rockShadow;
    u.uTSandWet.value = t.sandWet; u.uTSandMirror.value = t.sandMirror; this.shared.uTRock.value = t.rockHeight;
  }
  // 그 자리가 돌인가 (그림 좌표)
  isRock(px, py) { const x = Math.floor(px / this.pw * this.rockGW), y = Math.floor(py / this.ph * this.rockGH); return x >= 0 && y >= 0 && x < this.rockGW && y < this.rockGH && this.rockGrid[y * this.rockGW + x] > 128; }
  applyWater() {
    if (!this.ready && !this.waterMat) return;
    const w = this.water || mergeWater(), u = this.waterMat.uniforms, b = this.lightBase;
    u.uWFoam.value = w.foam; u.uWCrest.value = w.crest; u.uWLace.value = w.lace; u.uWClarity.value = Math.max(0.15, w.clarity); u.uWDeep.value = w.deep;
    u.uWTint.value.set(w.tint[0], w.tint[1], w.tint[2]); u.uWRefract.value = w.refract; u.uWSky.value = w.sky; u.uWSparkle.value = w.sparkle;
    this.shared.uSwell.value = w.swell;
    if (b) { u.uSpec.value = b.spec * w.shine; u.uPath.value = b.path / Math.max(0.2, w.path); u.uGlow.value = b.glow * w.glow; u.uCaus.value = b.caus * w.caustics; }
  }
  // 물 파티클 층 (움직임은 layers/particles.js): 점 MAX_PARTICLES 개를 미리 잡아 두고 프레임마다 자리·크기·세기를 채운다
  makeParticleLayer() {
    const g = new THREE.BufferGeometry(), n = MAX_PARTICLES;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
    this.partMat = new THREE.ShaderMaterial({ vertexShader: PARTICLE_VERT, fragmentShader: PARTICLE_FRAG, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uScale: { value: 600 }, uColor: { value: new THREE.Color(1, 1, 1) } } });
    this.partPoints = new THREE.Points(g, this.partMat); this.partPoints.frustumCulled = false; this.partPoints.renderOrder = 3;
    this.scene.add(this.partPoints); this.parts = makeParticles();
  }
  updateParticles(dt) {
    const w = this.water; if (!this.partPoints || !w) return;
    const rain = this.wx.uRain.value, amount = w.particles === 'none' ? 0 : w.particleAmount * this.waves * (1 - 0.6 * rain) * this.layer('particles');
    const tr = this.terrain || mergeTerrain();
    stepParticles(this.parts, dt, { type: w.particles, amount, pw: this.pw, ph: this.ph, u: this.u, edgeY: (x) => this.edgeY(x),
      rocks: this.rockPts, rockSplash: tr.rockSplash * this.waves * (1 - 0.6 * rain) * this.layer('rock') * this.layer('particles') });   // 돌에 부딪혀 튀는 물방울 (지형 모듈)
    const g = this.partPoints.geometry, pos = g.attributes.position.array, sz = g.attributes.aSize.array, al = g.attributes.aAlpha.array;
    const k = PLANE_W / this.pw, relief = this.reliefMat.uniforms.uRelief.value, list = this.parts.list, n = Math.min(list.length, MAX_PARTICLES);
    for (let i = 0; i < n; i++) {
      const p = list[i];
      pos[i * 3] = (p.x / this.pw - 0.5) * PLANE_W; pos[i * 3 + 1] = 0.05 + 0.9 * relief; pos[i * 3 + 2] = (p.y / this.ph - 0.5) * this.planeH;
      sz[i] = p.size * k * 2; al[i] = particleAlpha(p, this.t);
    }
    g.setDrawRange(0, n); g.attributes.position.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.aAlpha.needsUpdate = true;
    this.partMat.uniforms.uColor.value.copy(this.waterMat.uniforms.uFoamCol.value);
    this.partMat.uniforms.uScale.value = (this.H || 600) * this.dpr / (2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2));
  }
  // 날씨: 'clear' | 'rain' | 'fog' 또는 { rain, fog } (0~1). 몇 초에 걸쳐 부드럽게 바뀐다
  setWeather(w) { const v = typeof w === 'string' ? WEATHERS[w] || WEATHERS.clear : w || {}; this.wxTo = { rain: Math.min(1, Math.max(0, v.rain || 0)), fog: Math.min(1, Math.max(0, v.fog || 0)) }; }
  setActors(on) { this.actorsOn = on; if (this.actorGroup) this.actorGroup.visible = on; }
  setQuality(q) { this.quality = Math.min(1, Math.max(0.25, q)); this.makeTargets(); }
  setDebug(i) { this.debug = i; if (this.waterMat) this.waterMat.uniforms.uDebug.value = i; }

  resize(w, h, dpr = 1) {
    this.W = w; this.H = h; this.dpr = Math.min(dpr, 2);
    this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(this.dpr); this.composer?.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.makeTargets(); this.place();
  }
  // 카메라: 그림이 화면을 꽉 채우게(cover) 내려다보고, tilt 만큼 바다 쪽에서 비스듬히
  place() {
    if (!this.planeH) return;
    const a = this.camera.aspect, vfov = THREE.MathUtils.degToRad(FOV);
    const fit = 1 - 0.55 * Math.sin(this.tilt);   // 기울이면 먼 쪽이 좁아지므로 조금 다가간다 (가장자리 틈 방지)
    const visH = Math.min(this.planeH, PLANE_W / a) * fit;
    const dist = visH / 2 / Math.tan(vfov / 2);
    this.camera.position.set(0, Math.cos(this.tilt) * dist, Math.sin(this.tilt) * dist);
    this.camera.lookAt(0, 0, 0); this.camera.updateMatrixWorld();
  }
  // 키위: 모래 위를 돌아다니는 판. 늘 카메라를 본다 — 위에서 보면 바닥에 누운 그림처럼, 기울이면 서 있는 것처럼 (움직임은 layers/actors.js)
  async makeActors(n = 4) {
    this.actorGroup = new THREE.Group(); this.actorGroup.visible = this.actorsOn !== false; this.scene.add(this.actorGroup);
    let tex; try { tex = await this.loadTex('kiwi.webp?v=pv-7441cb8'); } catch (e) { this.actors = []; return; }
    this.kiwiTex = tex;
    const k = PLANE_W / this.pw, h = KIWI.SIZE * this.u * k, w = h * tex.image.naturalWidth / tex.image.naturalHeight;
    const body = new THREE.PlaneGeometry(w, h); body.translate(0, h * 0.3, 0);   // 발밑이 기준점
    const shade = new THREE.CircleGeometry(w * 0.3, 20);
    const bodyMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });   // 조명 없이 그림 값 그대로
    const shadeMat = new THREE.MeshBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.22, depthTest: false, depthWrite: false });
    this.actorArea = sandArea(this.plate.forestP, this.plate.shoreP, this.pw, this.u); this.actorArea.x0 = this.pw * 0.06; this.actorArea.x1 = this.pw * 0.94;
    this.actors = Array.from({ length: n }, () => {
      const a = makeActor(this.actorArea), g = new THREE.Group(), sh = new THREE.Mesh(shade, shadeMat), m = new THREE.Mesh(body, bodyMat);
      sh.rotation.x = -Math.PI / 2; sh.scale.set(1, 0.6, 1); sh.renderOrder = 1; m.renderOrder = 2;
      g.add(sh, m); this.actorGroup.add(g);
      return { a, g, m, sh };
    });
  }
  updateActors(dt) {
    if (!this.actors?.length || this.actorsOn === false) return;
    const env = { area: this.actorArea, edgeY: (x) => this.edgeY(x), u: this.u }, relief = this.reliefMat.uniforms.uRelief.value;
    for (const k of this.actors) {
      const a = stepActor(k.a, dt, env), d = (a.y - this.shoreAt(a.x)) / this.u;
      k.g.position.set((a.x / this.pw - 0.5) * PLANE_W, terrainH(d, 0) * relief + 0.02, (a.y / this.ph - 0.5) * this.planeH);
      k.m.quaternion.copy(this.camera.quaternion);   // 판은 카메라를 본다
      k.m.scale.x = a.dir;
      k.m.position.y = a.moving ? Math.abs(Math.sin(this.t * (a.flee ? 16 : 9) + a.ph)) * 0.035 : 0;   // 걸을 때 통통
    }
  }
  // 월드 ↔ 그림 좌표
  toPlate(x, z) { return [(x / PLANE_W + 0.5) * this.pw, (z / this.planeH + 0.5) * this.ph]; }
  // 화면의 한 점(캔버스 안 비율 0~1) → 그림 좌표
  pick(nx, ny) {
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(nx * 2 - 1, 1 - ny * 2), this.camera);
    const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) return null;
    return this.toPlate(p.x, p.z);
  }
  // 그 가로 자리의 물가선 (그림 y px) — 그려진 물가선 + 지금 물이 올라온 만큼
  shoreAt(px) { const f = Math.min(798.999, Math.max(0, px / this.pw * 799)), i = Math.floor(f); return this.shore[i] + (this.shore[i + 1] - this.shore[i]) * (f - i); }
  edgeY(px, t = this.t) {
    if (this.extD) { const x = this.shared.uEdgeX.value, f = Math.min(126.999, Math.max(0, (px - x.x) / Math.max(x.y - x.x, 1) * 127)), i = Math.floor(f); return this.shoreAt(px) + (this.extD[i] + (this.extD[i + 1] - this.extD[i]) * (f - i)) * this.u; }
    return this.shoreAt(px) + edgeD(px / this.u, t, this.waves * this.layer('shore')) * this.u;
  }
  // 게임 연결: 게임이 정한 물가선을 받는다 (d = 그려진 물가선에서의 거리 u × 128칸, x0~x1 = 그 값이 덮는 그림 px 범위)
  setEdge(d, x0, x1) {
    const had = !!this.extD; this.extD = d;
    if (had) this.edgeData.copyWithin(512, 0, 512);   // 앞 프레임의 물가선을 둘째 줄로 (물가선의 빠르기 — water/flow.js)
    packEdge(d, this.edgeData); if (!had) this.edgeData.copyWithin(512, 0, 512);
    this.edgeTex.needsUpdate = true; this.shared.uExt.value = 1; this.shared.uEdgeX.value.set(x0, x1);
  }
  // 게임 연결: 날씨 값을 바로 넣는다 (게임이 이미 부드럽게 바꾼 값)
  setWeatherNow(rain, fog) { this.wxTo = { rain, fog }; this.wx.uRain.value = rain; this.wx.uFog.value = fog; }
  isWater(px, py) { return py > this.edgeY(px); }
  // 누르기: 물이면 파문, 모래면 발자국
  tap(nx, ny) {
    const p = this.pick(nx, ny); if (!p) return null;
    const [px, py] = p;
    if (this.isRock(px, py)) {   // 돌을 누르면 물이 튀고 둘레로 파문이 번진다
      burst(this.parts, px, py, 16, this.u); this.rips[this.ripN++ % 6].set(px, py, this.t, 1.4); return 'rock';
    }
    if (this.isWater(px, py)) { this.rips[this.ripN++ % 6].set(px, py, this.t, 1); return 'ripple'; }
    this.marks.push({ x: px, y: py, a: 1, rot: Math.random() * 6.28, r: 7 * this.u, at: 0 }); if (this.marks.length > 3000) this.marks.shift();
    return 'mark';
  }
  // 글씨 쓰기: 글을 발자국 자리로 바꿔 모래 구역 가운데에 한 걸음씩 찍는다 (2D 게임과 같은 글자 획 — layers/prints.js)
  write(text) {
    this.clearPrints();
    if (!this.ready || !String(text || '').trim()) return 0;
    const area = sandArea(this.plate.forestP, this.plate.shoreP, this.pw, this.u);
    const { prints } = layoutPrints(text, area, this.u);
    prints.forEach((p, i) => this.marks.push({ ...p, a: 1, at: this.t + 0.3 + i * 0.045, print: true }));
    return prints.length;
  }
  clearPrints() { this.marks = this.marks.filter(m => !m.print); this.markRedraw = true; }
  // 발자국: 때가 되면 찍히고, 물이 지나가면 지워진다 (물가선을 JS 로 묻는다 — 게임의 "파도가 글씨를 지운다"와 같은 원리)
  //  새로 찍히는 것만 있으면 그것만 덧그리고, 지워지는 것이 있을 때만 전부 다시 그린다
  updateMarks(dt) {
    const c = this.markCv, g = c.getContext('2d'), k = c.width / this.pw, t = this.t;
    let redraw = this.markRedraw; this.markRedraw = false;
    for (const m of this.marks) if (m.drawn && m.a > 0 && washed(m, this.edgeY(m.x), this.u)) { m.a = Math.max(0, m.a - dt * 1.6); redraw = true; }
    const stamp = (m) => {
      const r = m.r * k;
      g.save(); g.translate(m.x * k, m.y * k); g.rotate(m.rot); g.globalAlpha = 0.55 * m.a; g.fillStyle = '#5a3d28';
      for (const [dx, dy, rr] of m.dot ? [[0, 0, 0.6]] : [[0, 0, 0.5], [-0.75, -0.95, 0.3], [0, -1.25, 0.32], [0.75, -0.95, 0.3]]) { g.beginPath(); g.ellipse(dx * r, dy * r, rr * r, rr * r * 1.25, 0, 0, 6.29); g.fill(); }
      g.restore(); m.drawn = true;
    };
    let fresh = false;
    if (redraw) { this.marks = this.marks.filter(m => m.a > 0); g.clearRect(0, 0, c.width, c.height); for (const m of this.marks) if (t >= m.at) stamp(m); }
    else for (const m of this.marks) if (!m.drawn && t >= m.at) { stamp(m); fresh = true; }
    if (redraw || fresh) this.markTex.needsUpdate = true;
  }

  start() { this.renderer.setAnimationLoop(() => this.frame()); }
  stop() { this.renderer.setAnimationLoop(null); }
  frame(step) {
    if (!this.ready) return;
    this.timer.update();
    const dt = step ?? Math.min(0.1, this.timer.getDelta());
    const t = this.t += dt, r = this.renderer;
    this.shared.uT.value = t;
    this.wx.uRain.value = approach(this.wx.uRain.value, this.wxTo.rain, dt); this.wx.uFog.value = approach(this.wx.uFog.value, this.wxTo.fog, dt);
    this.updateMarks(dt);
    this.updateActors(dt);
    this.updateParticles(dt);
    // ① 바닥 층
    r.setRenderTarget(this.groundRT); r.render(this.ground, this.groundCam);
    // 게임 연결: 켠 직후 1초의 젖음·거품은 버린다 (게임이 시작할 때 물가선이 잠깐 높이 잡혀 모래 위쪽에 거품 줄이 남던 것)
    if (this.game && !this.simCleared && t > 1) { this.simCleared = true; for (const rt of [this.simA, this.simB]) { r.setRenderTarget(rt); r.clear(); } }
    // ② 젖음·거품 기억 (앞 프레임 → 이번 프레임)
    this.simMat.uniforms.uPrev.value = this.simA.texture; this.simMat.uniforms.uDt.value = dt;
    this.quad.material = this.simMat; r.setRenderTarget(this.simB); this.quad.render(r);
    [this.simA, this.simB] = [this.simB, this.simA];
    // ③ 물 합성
    const u = this.waterMat.uniforms, cam = this.camera.position, pxPer = this.pw / PLANE_W;
    const [cx, cy] = this.toPlate(cam.x, cam.z); u.uCam.value.set(cx, cam.y * pxPer, cy);
    // 빛: 물 한가운데(그려진 물가선 아래 화면의 가운데쯤)에서 카메라로 되비치는 방향 → 빛길이 늘 그 자리에 맺힌다
    const tz = this.planeH * 0.27, v = new THREE.Vector3(cam.x, cam.y, cam.z - tz).normalize();
    u.uSunDir.value.set(-v.x, v.y, -v.z);
    u.uSim.value = this.simA.texture;
    this.quad.material = this.waterMat; r.setRenderTarget(this.compRT); this.quad.render(r);
    // ④ 화면
    r.setRenderTarget(null);
    if (this.bloomOn && !this.debug) this.composer.render(); else r.render(this.scene, this.camera);
  }
  dispose() {
    this.stop();
    for (const k of ['groundRT', 'compRT', 'simA', 'simB']) this[k]?.dispose();
    for (const set of Object.values(this.tex)) { set.dry?.dispose(); set.sea?.dispose(); }
    for (const m of [this.simMat, this.waterMat, this.reliefMat, this.sandMat]) m?.dispose();
    this.partPoints?.geometry.dispose(); this.partMat?.dispose();
    this.edgeTex?.dispose(); this.shared?.uShore.value.dispose(); this.shared?.uRock.value.dispose(); this.rockSoftTex?.dispose(); this.rock25Tex?.dispose(); this.none25?.dispose(); this.markTex?.dispose(); this.waveTex?.dispose();
    for (const k of this.actors || []) { k.m.geometry.dispose(); k.m.material.dispose(); k.sh.geometry.dispose(); k.sh.material.dispose(); }
    this.kiwiTex?.dispose();
    this.relief?.geometry.dispose(); this.quad.dispose(); this.composer?.dispose(); this.renderer.dispose();
  }
}
export { M };
