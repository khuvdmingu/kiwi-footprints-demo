// sandsim/sim.js — 모래 높이 위를 흐르는 물 (그래픽 카드에서 도는 격자 시뮬레이션) — 디오라마 시험판(src/diorama)과 그림 모드(src/painted)가 함께 쓴다
//  2026-11-25 디오라마에서 떼어 냄: 처음 땅 높이를 식 대신 그림(uBase)으로 받는다 → 판마다 다른 땅(그림에서 만든 높이)도 같은 시뮬레이션으로 돈다
//  사용자 2026-11-24 "딱 이느낌을 원해" (해변 샌드박스 게임 영상: 갈퀴 무늬를 물이 씻어 가고, 모래성이 물에 깎인다)
//
//  칸마다 들고 있는 값 (그림 세 장을 번갈아 쓴다):
//   S = (모래 높이 b, 물 깊이 w, 물에 실린 모래 s, 젖음 m)
//   F = 이웃 네 칸으로 흘러 나가는 물 (왼 · 오른 · 뭍 쪽 · 바다 쪽) — "가상 파이프" 얕은 물 모형
//   V = (흐름 빠르기 u, v, 거품, -)
//  한 걸음: ① 도구 자국(글씨 홈·갈퀴·모래성) ② 물 흐름 F ③ 빠르기·거품 V ④ 물 깊이·깎기·쌓기·젖음 S ⑤ 실린 모래 나르기 + 물속 모래 무너짐
//  바다 쪽 끝 줄(SEA_Z 앞)은 파도가 물 높이를 정한다 → 물결이 얕은 물을 타고 올라와 모래 위로 밀려온다.
import * as THREE from 'three';

export const SIM = {
  damp: 0.996,     // 흐름이 스스로 줄어드는 정도 (한 걸음)
  kc: 0.025,
  heal: 0.05,      // 물에 잠긴 모래가 처음 해변 모양으로 돌아오는 빠르기 (바다가 모래를 다시 실어 온다) — 해변이 계속 깎여 내려앉지 않고, 글씨 홈은 메워진다        // 물이 실을 수 있는 모래 (빠르기 × 깊이)
  ks: 0.9,         // 깎는 빠르기
  kd: 0.7,         // 내려놓는 빠르기
  dry: 0.012,      // 젖은 모래가 마르는 빠르기 (초당)
  talAir: 9,       // 물 밖 모래가 버티는 기울기 — 크게: 모래성·글씨는 물이 닿기 전엔 무너지지 않는다 (영상 댓글: "물 없이 무너지지 않게")
  talWet: 0.45,    // 물속 모래가 버티는 기울기 — 작게: 물이 덮으면 홈 가장자리부터 허물어진다
  kt: 0.35,        // 무너지는 빠르기
  wave: 0.75,      // 파도 높이
  period: 7.5,     // 파도 사이 (초)
};

//  격자: 가로 NX · 세로 NZ 칸, 한 칸 CELL (세계 단위). 세계 좌표는 가운데가 0 — x 가로, z 앞뒤(+z = 바다 쪽).
const f = v => (Number.isInteger(v) ? v + '.' : String(v));
const head = (g) => /* glsl */`
  precision highp float;
  #define NX ${g.nx}
  #define NZ ${g.nz}
  #define CELL ${f(g.cell)}
  #define SEA_Z ${f(g.seaZ)}
  const vec2 GRID = vec2(${f(g.nx)}, ${f(g.nz)});
  const vec2 WORLD = GRID * CELL;
  uniform sampler2D uBase;   // 처음 땅 높이 (모래가 돌아가려는 모양)
  vec4 at(sampler2D t, ivec2 p) { return texelFetch(t, clamp(p, ivec2(0), ivec2(NX - 1, NZ - 1)), 0); }
  vec4 bilin(sampler2D t, vec2 uv) {   // 실수 그림은 폰에서 부드럽게 읽히지 않을 수 있어 손으로 섞는다
    vec2 q = uv * GRID - .5; ivec2 i = ivec2(floor(q)); vec2 r = q - floor(q);
    return mix(mix(at(t, i), at(t, i + ivec2(1, 0)), r.x), mix(at(t, i + ivec2(0, 1)), at(t, i + ivec2(1, 1)), r.x), r.y);
  }
  vec2 cellXZ(ivec2 p) { return (vec2(p) + .5) * CELL - WORLD * .5; }
  vec2 cellUv(ivec2 p) { return (vec2(p) + .5) / GRID; }
  float baseH(ivec2 p) { return at(uBase, p).r; }
`;
const VERT = /* glsl */`void main() { gl_Position = vec4(position.xy, 0., 1.); }`;

// 바다 쪽 물 높이 — 파도가 일정한 사이로 부풀어 오른다 (가로로 조금 비스듬히)
const SEA_GLSL = /* glsl */`
  uniform float uWave, uPeriod, uT;
  float seaLevel(float x, float t) {
    float ph = 6.2831853 * (t / uPeriod) + x * .045;
    float a = pow(.5 + .5 * sin(ph), 3.), b = pow(.5 + .5 * sin(ph * .5 + 1.7 + x * .02), 6.);
    return uWave * (.62 * a + .35 * b - .2) + .035 * sin(t * 1.9 + x * .4);
  }
`;

const INIT = (H) => H + /* glsl */`
  void main() { float b = baseH(ivec2(gl_FragCoord.xy)); gl_FragColor = vec4(b, max(0., -b), 0., b < 0. ? 1. : 0.); }`;
const ZERO = /* glsl */`void main() { gl_FragColor = vec4(0.); }`;

// ① 도구 자국: 홈(글씨·파기) · 갈퀴 · 모래성 탑 · 모래 붓기
const TOOL = (H) => H + /* glsl */`
  uniform sampler2D uS;
  uniform vec4 uA[24];   // 선분 (x0, z0, x1, z1) 또는 점 (x, z, -, -)
  uniform vec4 uP[24];   // (종류, 반지름, 깊이/높이, 덧값)  종류 1 홈 · 2 갈퀴 · 3 탑 · 4 붓기
  uniform int uCount;
  void main() {
    ivec2 ip = ivec2(gl_FragCoord.xy); vec4 c = at(uS, ip); vec2 p = cellXZ(ip); float b = c.r, m = c.a;
    for (int i = 0; i < 24; i++) {
      if (i >= uCount) break;
      vec4 A = uA[i], P = uP[i]; float k = P.x, r = P.y, dep = P.z;
      if (k < 2.5) {
        vec2 a = A.xy, d = A.zw - A.xy; float L2 = max(dot(d, d), 1e-6), t = dot(p - a, d) / L2;
        if (t < 0. || t >= 1.) continue;   // 선분마다 앞끝만 → 이어진 선분이 겹쳐 두 번 파이지 않는다
        vec2 nrm = normalize(vec2(-d.y, d.x)); float side = dot(p - a, nrm);
        if (k < 1.5) {
          float q = abs(side) / r;
          b += q < 1. ? -dep * (1. - q * q) : (abs(q - 1.35) < .35 ? dep * .85 * (1. - pow((q - 1.35) / .35, 2.)) : 0.);
        } else {
          for (int j = -2; j <= 2; j++) { float q = abs(side - float(j) * P.w) / r; b += q < 1. ? -dep * (1. - q * q) : (abs(q - 1.4) < .4 ? dep * .55 * (1. - pow((q - 1.4) / .4, 2.)) : 0.); }
        }
        if (abs(side) < r * 1.6 + abs(P.w) * 2.) m = max(m, .22);   // 판 자리는 속 모래가 드러나 조금 짙다 (홈 둘레만)
      } else if (k < 3.5) {
        vec2 q = p - A.xy; float d = length(q);
        float body = 1. - smoothstep(r * .86, r, d);                       // 둥근 탑 (위가 평평)
        float ring = smoothstep(r * .58, r * .7, d) * body;                // 꼭대기 가장자리 성가퀴
        float notch = step(.25, sin(atan(q.y, q.x) * 6.));
        b += body * dep - ring * notch * dep * .2 - (1. - smoothstep(0., r * .5, d)) * dep * .06;
        m = max(m, body * 2.5);   // 모래성은 단단히 다진 젖은 모래 — 오래 버틴다 (마르는 데 몇 분)
      } else {
        float d = length(p - A.xy); b += dep * exp(-d * d / (r * r)); m = max(m, .5 * exp(-d * d / (r * r)));
      }
    }
    gl_FragColor = vec4(b, c.g, c.b, m);
  }`;

// ② 물 흐름: 물 면이 높은 칸에서 낮은 이웃으로
const FLUX = (H) => H + /* glsl */`
  uniform sampler2D uS, uF; uniform float uDt, uDamp;
  void main() {
    ivec2 ip = ivec2(gl_FragCoord.xy); vec4 c = at(uS, ip); float H = c.r + c.g;
    vec4 n = vec4(at(uS, ip - ivec2(1, 0)).r + at(uS, ip - ivec2(1, 0)).g, at(uS, ip + ivec2(1, 0)).r + at(uS, ip + ivec2(1, 0)).g,
                  at(uS, ip - ivec2(0, 1)).r + at(uS, ip - ivec2(0, 1)).g, at(uS, ip + ivec2(0, 1)).r + at(uS, ip + ivec2(0, 1)).g);
    vec4 f = max(vec4(0.), at(uF, ip) * uDamp + uDt * 9.81 * CELL * (H - n));
    if (ip.x == 0) f.x = 0.; if (ip.x == NX - 1) f.y = 0.; if (ip.y == 0) f.z = 0.; if (ip.y == NZ - 1) f.w = 0.;
    float out_ = f.x + f.y + f.z + f.w;
    f *= out_ > 0. ? min(1., c.g * CELL * CELL / (out_ * uDt)) : 0.;   // 가진 물보다 많이 내보내지 않는다
    gl_FragColor = f;
  }`;

// ③ 흐름 빠르기와 거품 (거품은 흐름에 실려 다니다 옅어진다)
const VEL = (H) => H + /* glsl */`
  uniform sampler2D uS, uF, uV; uniform float uDt, uFoamK, uFoamDry;
  void main() {
    ivec2 ip = ivec2(gl_FragCoord.xy); vec4 c = at(uS, ip), f = at(uF, ip);
    float ix = at(uF, ip - ivec2(1, 0)).y - f.x + f.y - at(uF, ip + ivec2(1, 0)).x;
    float iz = at(uF, ip - ivec2(0, 1)).w - f.z + f.w - at(uF, ip + ivec2(0, 1)).z;
    vec2 v = vec2(ix, iz) * .5 / (CELL * max(c.g, .03));
    float sp = length(v); if (sp > 7.) v *= 7. / sp;
    float foam = bilin(uV, cellUv(ip) - v * uDt / WORLD).b * exp(-uDt * .7);
    // 물 앞머리(얇고 빠른 물) · 물 면이 가파르게 꺾이는 곳(부서지는 파도) 에서 생긴다
    float Hx = (at(uS, ip + ivec2(1, 0)).r + at(uS, ip + ivec2(1, 0)).g) - (at(uS, ip - ivec2(1, 0)).r + at(uS, ip - ivec2(1, 0)).g);
    float Hz = (at(uS, ip + ivec2(0, 1)).r + at(uS, ip + ivec2(0, 1)).g) - (at(uS, ip - ivec2(0, 1)).r + at(uS, ip - ivec2(0, 1)).g);
    float steep = length(vec2(Hx, Hz)) / (2. * CELL);
    float wet = smoothstep(.001, .01, c.g);
    float gen = wet * (smoothstep(.9, 2.6, sp) * (1. - smoothstep(.015, .1, c.g)) + smoothstep(.2, .45, steep) * smoothstep(.2, .6, c.g) * .7);   // 앞머리 · 부서지는 물마루에서만
    //  바위로 들이치는 세기: 처음 땅이 가파르게 솟는 곳(바위 면)으로 물이 밀고 올라갈 때 — 물보라와 거품이 여기서 생긴다 (V.a)
    vec2 gb = vec2(baseH(ip + ivec2(1, 0)) - baseH(ip - ivec2(1, 0)), baseH(ip + ivec2(0, 1)) - baseH(ip - ivec2(0, 1))) / (2. * CELL);
    float gbl = length(gb), hit = smoothstep(.25, .6, gbl) * max(0., dot(v, gb / max(gbl, 1e-4))) * smoothstep(.004, .05, c.g);
    gen += smoothstep(.3, 1.2, hit) * .9;
    foam = clamp(foam + gen * uDt * 3. * uFoamK, 0., 1.2);
    if (c.g < .002) foam *= exp(-uDt * uFoamDry);   // 모래 위에 남은 거품은 스민다 (빠르기 uFoamDry)
    gl_FragColor = vec4(v, foam, hit);
  }`;

// ④ 물 깊이 · 깎기 · 쌓기 · 젖음 · 바다 쪽 파도
const WATER = (H) => H + SEA_GLSL + /* glsl */`
  uniform sampler2D uS, uF, uV; uniform float uDt, uKc, uKs, uKd, uDry, uHeal;
  void main() {
    ivec2 ip = ivec2(gl_FragCoord.xy); vec4 c = at(uS, ip), f = at(uF, ip);
    float inflow = at(uF, ip - ivec2(1, 0)).y + at(uF, ip + ivec2(1, 0)).x + at(uF, ip - ivec2(0, 1)).w + at(uF, ip + ivec2(0, 1)).z;
    float w = max(0., c.g + uDt * (inflow - (f.x + f.y + f.z + f.w)) / (CELL * CELL));
    vec2 p = cellXZ(ip);
    if (p.y > SEA_Z) w = mix(w, max(0., seaLevel(p.x, uT) - c.r), .3);
    float b = c.r, s = c.b;
    vec2 v = at(uV, ip).rg; float sp = length(v);
    float gx = at(uS, ip + ivec2(1, 0)).r - at(uS, ip - ivec2(1, 0)).r, gz = at(uS, ip + ivec2(0, 1)).r - at(uS, ip - ivec2(0, 1)).r;
    float slope = length(vec2(gx, gz)) / (2. * CELL);
    float cap = uKc * sp * clamp(w / .05, 0., 1.) * (.4 + slope);
    if (cap > s) { float d = min(uKs * (cap - s) * uDt, .01); b -= d; s += d; }
    else { float d = uKd * (s - cap) * uDt; b += d; s -= d; }
    if (w < .0015) { float d = s * min(1., uDt * 6.); b += d; s -= d; }   // 물이 빠지면 실린 모래는 그 자리에 천천히 내려앉는다 (한꺼번에 놓으면 계단이 진다)
    b += (baseH(ip) - b) * uDt * uHeal * smoothstep(.002, .04, w);
    float m = w > .004 ? max(1., c.a) : max(0., c.a - uDt * uDry);
    gl_FragColor = vec4(b, w, s, m);
  }`;

// ⑤ 실린 모래를 흐름 따라 나르기 + 물속 모래가 버티는 기울기를 넘으면 무너지기
const MOVE = (H) => H + /* glsl */`
  uniform sampler2D uS, uV; uniform float uDt, uTalAir, uTalWet, uKt;
  float tal(vec4 c) { return mix(mix(1.6, uTalAir, smoothstep(.1, .5, c.a)), uTalWet, smoothstep(.0, .03, c.g)); }   // 마른 모래 · 젖어 단단한 모래(모래성) · 물속 모래
  void main() {
    ivec2 ip = ivec2(gl_FragCoord.xy); vec4 c = at(uS, ip); vec2 v = at(uV, ip).rg;
    float s = bilin(uS, cellUv(ip) - v * uDt / WORLD).b;
    float b = c.r, t0 = tal(c), d = 0.;
    for (int k = 0; k < 4; k++) {
      ivec2 o = k == 0 ? ivec2(1, 0) : k == 1 ? ivec2(-1, 0) : k == 2 ? ivec2(0, 1) : ivec2(0, -1);
      vec4 n = at(uS, ip + o); float T = min(t0, tal(n)) * CELL;
      d += max(0., n.r - b - T) - max(0., b - n.r - T);
    }
    gl_FragColor = vec4(b + uKt * .25 * d, c.g, s, c.a);
  }`;

export class Sim {
  //  grid = { nx, nz, cell, seaZ } · base = 처음 땅 높이 (Float32Array nx*nz, 줄마다 x 순서, 첫 줄 = 뭍 쪽 z 가장 작은 줄)
  constructor(renderer, grid, base) {
    this.r = renderer; this.g = grid; const { nx, nz } = grid; const H = head(grid);
    this.baseTex = new THREE.DataTexture(base, nx, nz, THREE.RedFormat, THREE.FloatType); this.baseTex.needsUpdate = true;
    const fl = renderer.extensions.has('EXT_color_buffer_float');   // 모래가 아주 조금씩 깎이는 것을 담으려면 실수 그림이 필요하다
    this.type = fl ? THREE.FloatType : THREE.HalfFloatType;
    const rt = () => new THREE.WebGLRenderTarget(nx, nz, { type: this.type, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
    this.S = [rt(), rt()]; this.F = [rt(), rt()]; this.V = [rt(), rt()];
    this.cam = new THREE.Camera(); this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.scene = new THREE.Scene(); this.scene.add(this.quad);
    const mat = (frag, u = {}) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: { uBase: { value: this.baseTex }, ...u }, depthTest: false, depthWrite: false });
    this.u = { uDt: { value: 0.02 }, uT: { value: 0 }, uWave: { value: SIM.wave }, uPeriod: { value: SIM.period } };
    const U = this.u;
    this.m = {
      init: mat(INIT(H)), zero: mat(ZERO),
      tool: mat(TOOL(H), { uS: { value: null }, uA: { value: Array.from({ length: 24 }, () => new THREE.Vector4()) }, uP: { value: Array.from({ length: 24 }, () => new THREE.Vector4()) }, uCount: { value: 0 } }),
      flux: mat(FLUX(H), { uS: { value: null }, uF: { value: null }, uDt: U.uDt, uDamp: { value: SIM.damp } }),
      vel: mat(VEL(H), { uS: { value: null }, uF: { value: null }, uV: { value: null }, uDt: U.uDt, uFoamK: { value: 1 }, uFoamDry: { value: 2.5 } }),
      water: mat(WATER(H), { uS: { value: null }, uF: { value: null }, uV: { value: null }, uDt: U.uDt, uT: U.uT, uWave: U.uWave, uPeriod: U.uPeriod,
        uKc: { value: SIM.kc }, uKs: { value: SIM.ks }, uKd: { value: SIM.kd }, uDry: { value: SIM.dry }, uHeal: { value: SIM.heal } }),
      move: mat(MOVE(H), { uS: { value: null }, uV: { value: null }, uDt: U.uDt, uTalAir: { value: SIM.talAir }, uTalWet: { value: SIM.talWet }, uKt: { value: SIM.kt } }),
    };
    this.ops = []; this.erosion = 1; this.reset();
  }
  get state() { return this.S[0].texture; }
  get vel() { return this.V[0].texture; }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.scene, this.cam); }
  swap(a) { a.reverse(); }
  reset() {
    const prev = this.r.getRenderTarget();
    this.pass(this.m.init, this.S[0]); this.pass(this.m.zero, this.F[0]); this.pass(this.m.zero, this.V[0]);
    this.r.setRenderTarget(prev); this.t = 0;
  }
  // 도구 자국 하나 넣기 — 다음 걸음에 한꺼번에 찍힌다
  groove(x0, z0, x1, z1, r = 0.27, depth = 0.15) { this.ops.push([x0, z0, x1, z1, 1, r, depth, 0]); }
  rake(x0, z0, x1, z1, gap = 0.26) { this.ops.push([x0, z0, x1, z1, 2, 0.075, 0.045, gap]); }
  tower(x, z, r = 1.15, h = 1.25) { this.ops.push([x, z, 0, 0, 3, r, h, 0]); }
  pour(x, z, r = 0.9, h = 0.35) { this.ops.push([x, z, 0, 0, 4, r, h, 0]); }
  applyOps() {
    while (this.ops.length) {
      const batch = this.ops.splice(0, 24), t = this.m.tool.uniforms;
      batch.forEach((o, i) => { t.uA.value[i].set(o[0], o[1], o[2], o[3]); t.uP.value[i].set(o[4], o[5], o[6], o[7]); });
      t.uCount.value = batch.length; t.uS.value = this.S[0].texture; this.pass(this.m.tool, this.S[1]); this.swap(this.S);
    }
  }
  // 모래 고정: 물만 흐르고 모래는 깎이지도 무너지지도 않는다 (그림 모드 — 발자국은 게임처럼 따로 찍는다, 사용자 2026-11-25)
  freezeSand() { this.frozen = true; this.m.water.uniforms.uKc.value = 0; this.m.water.uniforms.uHeal.value = 0; this.m.move.uniforms.uKt.value = 0; }
  setFoam(k = 1, dry = 2.5) { this.m.vel.uniforms.uFoamK.value = k; this.m.vel.uniforms.uFoamDry.value = dry; }
  setErosion(k) { if (this.frozen) return; this.erosion = k; this.m.water.uniforms.uKc.value = SIM.kc * k; this.m.water.uniforms.uHeal.value = SIM.heal * k; this.m.move.uniforms.uKt.value = SIM.kt * Math.min(1, 0.4 + 0.6 * k); this.m.move.uniforms.uTalWet.value = SIM.talWet / Math.max(0.3, k); }
  step(dt, sub = 2) {
    const prev = this.r.getRenderTarget(), m = this.m, h = Math.min(dt, 1 / 30) / sub * 1.6;   // 조금 빨리 감아 파도가 시원하게 온다
    this.applyOps();
    for (let i = 0; i < sub; i++) {
      this.u.uDt.value = h; this.t += h; this.u.uT.value = this.t;
      m.flux.uniforms.uS.value = this.S[0].texture; m.flux.uniforms.uF.value = this.F[0].texture; this.pass(m.flux, this.F[1]); this.swap(this.F);
      m.vel.uniforms.uS.value = this.S[0].texture; m.vel.uniforms.uF.value = this.F[0].texture; m.vel.uniforms.uV.value = this.V[0].texture; this.pass(m.vel, this.V[1]); this.swap(this.V);
      m.water.uniforms.uS.value = this.S[0].texture; m.water.uniforms.uF.value = this.F[0].texture; m.water.uniforms.uV.value = this.V[0].texture; this.pass(m.water, this.S[1]); this.swap(this.S);
      m.move.uniforms.uS.value = this.S[0].texture; m.move.uniforms.uV.value = this.V[0].texture; this.pass(m.move, this.S[1]); this.swap(this.S);
    }
    this.r.setRenderTarget(prev);
  }
  // 한 칸 값 읽기 (키위 발 높이 등 — 가끔만)
  read(x, z) {
    const { nx, nz, cell } = this.g, i = Math.max(0, Math.min(nx - 1, Math.floor(x / cell + nx / 2))), j = Math.max(0, Math.min(nz - 1, Math.floor(z / cell + nz / 2)));
    const buf = this.type === THREE.FloatType ? new Float32Array(4) : new Uint16Array(4);
    this.r.readRenderTargetPixels(this.S[0], i, j, 1, 1, buf);
    return this.type === THREE.FloatType ? Array.from(buf) : Array.from(buf, THREE.DataUtils.fromHalfFloat);
  }
  dispose() { this.baseTex.dispose(); [...this.S, ...this.F, ...this.V].forEach(t => t.dispose()); Object.values(this.m).forEach(m => m.dispose()); this.quad.geometry.dispose(); }
}
export const SIM_SHADERS = (grid) => { const H = head(grid); return { INIT: INIT(H), TOOL: TOOL(H), FLUX: FLUX(H), VEL: VEL(H), WATER: WATER(H), MOVE: MOVE(H) }; };
