// toon-gl.js — 위에서 내려다본 툰(셀) 스타일 섬 해변, WebGL2 프래그먼트 셰이더 두 장
//
//  GroundLayer : 풀밭 · 모래(얼룩·물결 자국) · 젖은 모래 · 바다(깊이별 4단 색 띠, 보로노이 물결,
//                깊은 곳 물마루, 반짝임, 해안 거품 고리 + 해안 쪽으로 밀려오는 거품 줄)
//  SkyLayer    : 두 톤 구름 + 오른쪽 아래로 떨어지는 구름 그림자 (키위 위에도 떨어진다).
//                push(x, y) 로 누른 자리 구름을 방사형으로 밀어 찢는다.
//
//  해안선은 CPU(beach.js)와 같은 식(edge)을 쓴다 → 물에 잠긴 발자국을 CPU 가 정확히 지울 수 있다.
//  레퍼런스(Flocking Hangul) 바다의 기법(색 띠·보로노이·거품 줄·송이 구름)을 이 장면에 맞게 다시 쓴 것.
//  심플렉스 노이즈: Ashima Arts / Stefan Gustavson (MIT).

const VS = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

const COMMON = `#version 300 es
precision highp float;
uniform vec2 uSize;   // CSS px
uniform vec2 uRes;    // 캔버스 실제 픽셀
uniform float uTime, uU, uSeed;
uniform float uAA;    // 경계 부드러움 배율 (픽셀 모드에서는 작게 → 또렷한 계단)
out vec4 o;

vec3 perm(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float sn(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod(i, 289.0);
  vec3 p = perm(perm(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0); m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
const mat2 ROT = mat2(0.8, -0.6, 0.6, 0.8);
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * sn(p); p = ROT * p * 2.03 + 17.1; a *= 0.5; } return s; }
vec2 hash2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
// 보로노이: x = 가장 가까운 점, y = 두 번째 점까지 거리
vec2 vor(vec2 x, float t) {
  vec2 n = floor(x), f = fract(x); float d1 = 8.0, d2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)), h = hash2(n + g);
    vec2 r = g + 0.5 + 0.42 * sin(t + 6.2831 * h) - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return sqrt(vec2(d1, d2));
}
vec2 worldPos() { return vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * (uSize / uRes); }
`;

const GROUND_FS = COMMON + `
uniform float uLevel, uBig, uBush;
uniform float uSnow;     // 눈 쌓인 정도 0~1 (모래·풀밭이 하얗게 덮인다)
uniform vec4 uWet[32];   // 젖은 모래 윗선 (화면을 128칸으로 나눈 y)

float edgeAt(float x) {
  float u = uU, t = uTime;
  return uLevel + u * uBig * (7.0 * sin(x * 0.011 / u + t * 0.9) + 4.0 * sin(x * 0.029 / u - t * 1.3) + 2.5 * sin(x * 0.07 / u + t * 0.5));
}
float grassAt(float x) {
  float u = uU;
  return uBush + u * (14.0 * sin(x * 0.012 / u + 1.0) + 9.0 * sin(x * 0.037 / u + 4.0) + 5.0 * sin(x * 0.09 / u));
}
float wetI(int i) { vec4 v = uWet[i / 4]; int j = i - (i / 4) * 4; return j == 0 ? v.x : j == 1 ? v.y : j == 2 ? v.z : v.w; }
float wetAt(float x) {
  float f = clamp(x / uSize.x, 0.0, 1.0) * 127.0; int i = int(floor(f));
  return mix(wetI(i), wetI(min(i + 1, 127)), fract(f));
}

void main() {
  vec2 p = worldPos();
  float u = uU, t = uTime, px = uSize.x / uRes.x, aa = px * uAA;
  float e = edgeAt(p.x), d = p.y - e;   // d > 0 : 물속 깊이

  // ── 바다: 깊이별 색 띠 (경계는 또렷하게, 살짝 일렁인다) ──
  float wob = sn(p / (70.0 * u) + t * 0.05) * 5.0 * u;
  float big = sn(p / (520.0 * u) + uSeed) * 0.5 + 0.5;
  vec3 c0 = vec3(0.70, 0.89, 0.85), c1 = vec3(0.52, 0.79, 0.80), c2 = vec3(0.38, 0.64, 0.73), c3 = vec3(0.30, 0.52, 0.65), c4 = vec3(0.26, 0.45, 0.59);   // v4: 뉴트럴 톤
  vec3 sea = mix(c3, c4, smoothstep(0.35, 0.7, big));
  sea = mix(c2, sea, smoothstep(105.0 * u - aa, 105.0 * u + aa, d + wob * 2.0));
  sea = mix(c1, sea, smoothstep(48.0 * u - aa, 48.0 * u + aa, d + wob));
  sea = mix(c0, sea, smoothstep(17.0 * u - aa, 17.0 * u + aa, d + wob * 0.6));

  // 물결 무늬: 보로노이 경계선, 얕을수록 진하고 촘촘
  float shallowK = 1.0 - smoothstep(14.0 * u, 140.0 * u, d);
  vec2 wp = p + 14.0 * u * vec2(sn(p / (160.0 * u) + t * 0.08), sn(p / (160.0 * u) + 9.0 + t * 0.08));
  float cell = mix(110.0, 46.0, shallowK) * u;
  vec2 v = vor(wp / cell, t * 0.45);
  float dpx = (v.y - v.x) * cell * 0.5, hw = 1.4 * u;
  float rip = 1.0 - smoothstep(max(0.0, hw - px * 0.6), hw + px * 0.6, dpx);
  sea = mix(sea, vec3(0.92, 0.98, 0.97), rip * mix(0.05, 0.28, shallowK));

  // 깊은 곳 물마루 · 반짝임
  float capMask = smoothstep(0.15, 0.35, sn(p / (380.0 * u) - t * 0.015));
  float cap = sn(vec2(p.x / (30.0 * u), p.y / (11.0 * u)) + vec2(t * 0.06, t * 0.35));
  sea = mix(sea, vec3(0.95, 1.0, 1.0), smoothstep(0.80, 0.82, cap) * capMask * (1.0 - shallowK) * 0.8);
  float tw = sn(p / (7.0 * u) + vec2(t * 1.7, -t * 1.3));
  sea = mix(sea, vec3(1.0), step(0.93, tw) * 0.3 * smoothstep(0.2, 0.6, sn(p / (300.0 * u) + t * 0.03)));

  // 해안 거품: 물 끝에 붙은 고리 + 해안 쪽으로 밀려오는 줄
  float fn = sn(p / (38.0 * u) + t * 0.12);
  float rr = (5.0 + fn * 3.0) * u;
  float ring = 1.0 - smoothstep(rr - aa, rr + aa, d);
  float ph = fract(d / (26.0 * u) + t * 0.32 + 0.25 * sn(p / (110.0 * u)));
  float fade = 1.0 - smoothstep(14.0 * u, 90.0 * u, d);
  float th = 0.16 * fade;
  float lines = (1.0 - smoothstep(th - 0.02, th, ph)) * step(-0.25, sn(p / (30.0 * u) + t * 0.15)) * step(8.0 * u, d);
  sea = mix(sea, vec3(0.98, 0.98, 0.95), clamp(max(ring, lines * fade), 0.0, 1.0));

  // ── 모래 ──
  vec3 cSand = vec3(0.94, 0.89, 0.78), cSand2 = vec3(0.91, 0.85, 0.73), cWet = vec3(0.82, 0.76, 0.64);
  vec3 land = mix(cSand, cSand2, step(0.42, sn(p / (52.0 * u) + uSeed * 2.0)) * 0.55);
  float sr = sin((p.y + 6.0 * u * sin(p.x / (44.0 * u)) + 4.0 * u * sn(p / (90.0 * u))) / (8.0 * u));
  land = mix(land, cSand2 * 0.97, smoothstep(0.90, 0.96, sr) * 0.45 * step(0.1, sn(p / (160.0 * u) + 5.0)));
  // 젖은 모래 (물이 빠진 뒤에도 한동안) + 그 윗선의 하얀 물 자국
  float wt = wetAt(p.x) - 2.0 * u;
  land = mix(land, cWet, step(wt, p.y));
  land = mix(land, vec3(1.0), (1.0 - smoothstep(0.8 * u, 0.8 * u + aa * 2.0, abs(p.y - wt))) * step(5.0 * u, e - wt) * 0.7);

  // ── 풀밭 ──
  float gd = grassAt(p.x) + 6.0 * u * sn(p / (40.0 * u)) - p.y;   // > 0 : 풀밭 안
  vec3 g1 = vec3(0.66, 0.78, 0.56), g2 = vec3(0.58, 0.72, 0.50), g3 = vec3(0.50, 0.64, 0.45);
  vec3 grass = mix(g1, g2, smoothstep(24.0 * u, 25.0 * u, gd + 10.0 * u * sn(p / (80.0 * u) + 3.0)));
  grass = mix(grass, g3, smoothstep(60.0 * u, 61.0 * u, gd + 14.0 * u * sn(p / (120.0 * u) + 7.0)));
  vec2 tv = vor(p / (13.0 * u), 0.0);
  float tuft = (1.0 - smoothstep(0.18, 0.24, tv.x)) * step(0.0, sn(p / (70.0 * u) + 2.0));
  grass = mix(grass, grass * 0.9, tuft);
  vec2 fh = hash2(floor(p / (13.0 * u)));
  float flower = (1.0 - smoothstep(0.10, 0.14, tv.x)) * step(0.93, fh.x) * step(8.0 * u, gd);
  grass = mix(grass, fh.y > 0.5 ? vec3(0.99, 0.97, 0.92) : vec3(0.98, 0.88, 0.62), flower);
  land = mix(land, grass, smoothstep(-aa, aa, gd));
  land = mix(land, g3 * 0.95, (1.0 - smoothstep(0.0, 2.2 * u, abs(gd))) * 0.3);   // 풀밭 가장자리 선

  // 눈: 땅만 덮는다. 얼룩지게 쌓이고, 물가(젖은 곳)는 덜 쌓인다
  if (uSnow > 0.001) {
    float drift = sn(p / (60.0 * u) + 3.0) * 0.5 + 0.5;
    float cover = smoothstep(0.0, 1.0, uSnow * 1.6 - drift * 0.6) * (1.0 - step(wt, p.y) * 0.6);
    vec3 snow = mix(vec3(0.95, 0.96, 0.98), vec3(0.86, 0.89, 0.94), step(0.55, sn(p / (24.0 * u))) * 0.5);
    land = mix(land, snow, cover);
  }
  vec3 col = mix(land, sea, smoothstep(-aa, aa, d));
  o = vec4(col, 1.0);
}`;

const SKY_FS = COMMON + `
uniform float uCloud;
uniform float uCloudT;   // 구름이 흘러간 시간 (바람 세기를 곱해 CPU 가 누적한다 — 속도가 바뀌어도 튀지 않게)
uniform vec4 uImp[8];   // 누른 자리 (구름 좌표 x, y, 누른 시각, 반경)
uniform int uImpN;

vec2 wind() { return uCloudT * vec2(12.0, 5.4) * uU; }
vec2 pushAt(vec2 w, out float hole) {
  vec2 d = vec2(0.0); hole = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uImpN) break;
    vec4 im = uImp[i]; float age = uTime - im.z;
    if (age < 0.0 || age > 30.0) continue;
    float burst = 1.0 - exp(-age * 9.0), heal = exp(-age / 5.0);
    vec2 r2 = w - im.xy; float r = length(r2);
    vec2 dir = r > 1e-3 ? r2 / r : vec2(1.0, 0.0);
    float jag = 0.7 + 0.3 * sn(dir * 1.1 + im.z * 3.1);
    float F = im.w * (0.45 + 1.55 * burst) * jag;
    d += dir * F * 0.7 * heal * exp(-r * r / (F * F * 1.4));
    hole += burst * heal * exp(-r * r / (F * F * 0.22));
  }
  return d;
}
float cloudD(vec2 p) {
  float u = uU;
  vec2 w = p + wind();
  float hole; w -= pushAt(w, hole);
  float CELL = 420.0 * u;
  vec2 id = floor(w / CELL);
  float m = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = id + vec2(float(i), float(j));
    vec2 h = hash2(c + uSeed * 7.13);
    if (h.x > uCloud * 1.6) continue;
    vec2 ctr = (c + 0.5 + 0.3 * (hash2(c + 3.7) - 0.5)) * CELL;
    float R = CELL * (0.24 + 0.14 * h.y);
    vec2 e = (w - ctr) / vec2(1.15, 1.0) / R;
    m = max(m, 1.0 - dot(e, e));
  }
  vec2 q = w / (800.0 * u) * 1.15 + uSeed * 1.31;
  q += 0.12 * vec2(fbm(q * 1.3 + 3.1), fbm(q * 1.3 + 7.7));
  vec2 v1 = vor(q * 7.0, uTime * 0.05), v2 = vor(q * 15.0 + 3.3, uTime * 0.07);
  float tex = fbm(q) + 0.16 * (1.0 - v1.x) + 0.07 * (1.0 - v2.x) - 0.15;
  return 0.75 * tex + 0.6 * max(m, 0.0) - 0.29 - 0.45 * hole;
}
void main() {
  vec2 p = worldPos();
  float u = uU, thr = 0.16;
  if (uCloud < 0.001) { o = vec4(0.0); return; }
  float sh = cloudD(p - vec2(55.0, 85.0) * u);           // 해는 왼쪽 위 → 그림자는 오른쪽 아래
  float fs = fwidth(sh) * 0.8 * uAA;
  float sm = smoothstep(thr - fs, thr + fs, sh);
  float c = cloudD(p);
  float fw = fwidth(c) * 0.8 * uAA;
  float cm = smoothstep(thr - fw, thr + fw, c) * 0.9;
  float cb = cloudD(p + vec2(9.0, 14.0) * u);           // 오른쪽 아래 가장자리 그늘
  vec3 cloud = mix(vec3(0.89, 0.90, 0.92), vec3(0.98, 0.98, 0.97), smoothstep(thr + 0.02, thr + 0.05, cb));
  float sa = sm * 0.14;
  vec4 shadow = vec4(vec3(0.16, 0.16, 0.2) * sa, sa);
  vec4 cl = vec4(cloud * cm, cm);
  o = cl + shadow * (1.0 - cl.a);
}`;

class Layer {
  constructor(canvas, fs, alpha) {
    this.canvas = canvas;
    const gl = (this.gl = canvas.getContext('webgl2', { antialias: false, alpha, premultipliedAlpha: true, preserveDrawingBuffer: alpha }));
    if (!gl) { this.ok = false; return; }
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const pr = (this.pr = gl.createProgram());
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.loc = {};
    this.ok = true;
  }
  u(name) { return name in this.loc ? this.loc[name] : (this.loc[name] = this.gl.getUniformLocation(this.pr, name)); }
  // scale: CSS px 하나에 캔버스 픽셀 몇 개. aa: 경계 부드러움 (픽셀 모드는 작게)
  resize(W, H, scale, aa = 1.2) {
    this.W = W; this.H = H; this.aa = aa;
    const w = Math.max(1, Math.round(W * scale)), h = Math.max(1, Math.round(H * scale));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.canvas.style.width = W + 'px'; this.canvas.style.height = H + 'px';
  }
  begin(t, u, seed) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u('uSize'), this.W, this.H);
    gl.uniform2f(this.u('uRes'), this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u('uTime'), t);
    gl.uniform1f(this.u('uU'), u);
    gl.uniform1f(this.u('uSeed'), seed);
    gl.uniform1f(this.u('uAA'), this.aa);
  }
  draw() { this.gl.drawArrays(this.gl.TRIANGLES, 0, 3); }
}

export class GroundLayer extends Layer {
  constructor(canvas) { super(canvas, GROUND_FS, false); this.wet = new Float32Array(128); }
  render(b) {
    if (!this.ok) return;
    const gl = this.gl;
    this.begin(b.t, b.u, b.seed % 97);
    gl.uniform1f(this.u('uLevel'), b.lvl);
    gl.uniform1f(this.u('uBig'), (b.bw ? 2 : 1) * b.amp);
    gl.uniform1f(this.u('uSnow'), b.snow);
    gl.uniform1f(this.u('uBush'), b.bushY);
    gl.uniform4fv(this.u('uWet[0]'), b.wet128());
    this.draw();
  }
}

export class SkyLayer extends Layer {
  constructor(canvas, cloud = 0.3) {
    super(canvas, SKY_FS, true);
    this.cloud = cloud;
    this.imp = new Float32Array(32);
    this.impN = 0; this.impI = 0;
    this.px = new Uint8Array(4);
  }
  render(b) {
    if (!this.ok) return;
    const gl = this.gl;
    this.t = b.t; this.uu = b.u;
    this.ct = (this.ct || 0) + (b.t - (this.lastT ?? b.t)) * (this.windK || 1);
    this.lastT = b.t;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.begin(b.t, b.u, b.seed % 97);
    gl.uniform1f(this.u('uCloud'), this.cloud);
    gl.uniform1f(this.u('uCloudT'), this.ct);
    gl.uniform4fv(this.u('uImp[0]'), this.imp);
    gl.uniform1i(this.u('uImpN'), this.impN);
    this.draw();
  }
  // (x, y) CSS px 에 구름이 있나 — 방금 그린 판에서 한 픽셀 읽는다
  cloudAt(x, y) {
    if (!this.ok) return false;
    const gl = this.gl, s = this.canvas.width / this.W;
    gl.readPixels(Math.round(x * s), Math.round((this.H - y) * s), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.px);
    return this.px[3] > 150;
  }
  push(x, y, R) {
    const wx = x + this.ct * 12 * this.uu, wy = y + this.ct * 5.4 * this.uu;   // 구름 좌표 (바람과 함께 흐른다)
    const i = this.impI++ % 8;
    this.imp.set([wx, wy, this.t, R], i * 4);
    this.impN = Math.min(8, this.impN + 1);
  }
}
