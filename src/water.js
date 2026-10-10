// water.js — v8: 그림 판을 깔고 그 위의 바다를 살아 움직이게 하는 WebGL2 층
//
//  같은 그림을 한 번 더 읽되, 물이 있는 자리에서는 "어디를 읽을지"를 움직인다:
//   · 밀려오기  파도가 해안선(edge)을 올리면 그려진 바다 전체가 그만큼 위로 미끄러져 올라온다
//              (물가는 많이, 먼바다는 거의 안 움직인다) → 그림 속 거품·얕은 물·물속 바위가 통째로 해변을 덮는다
//   · 일렁임    물속을 천천히 비트는 굴절 (얕은 곳은 잔물결, 깊은 곳은 큰 너울) → 물속 바위가 흔들려 보인다
//   · 빠지기    물이 그려진 해안선보다 아래로 내려가면 plate-dry(물 뺀 모래 바닥)가 드러난다
//   · 젖은 모래 물이 지나간 자리는 한동안 짙고 반들반들 · 물러난 물은 레이스 거품 한 줄을 남기고 사라진다
//   · 물가 거품 테두리 · 큰 파도 때 하얀 물보라 줄무늬 · 얕은 물의 빛 그물(커스틱) · 반짝이는 햇빛
//   · 바위는 제자리  물은 바위를 지운 판(plate-sea)에서 읽고, 바위는 가림막 자리에 원본에서 다시 얹는다
//  해안선 값은 beach.edge(x) 를 그대로 받는다(줄 텍스처) → 발자국을 지우는 줄과 그림 속 물가가 정확히 같다.

const N = 128;   // 해안선 줄 칸 수 (셰이더 상수 배열로 넘긴다)

const VS = `#version 300 es
in vec2 aP; void main(){ gl_Position = vec4(aP, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uPlate, uDry, uSea, uRock;
uniform vec4 uL[${N}];   // 칸마다 (해안선, 그린 해안선, 젖은 줄, 바다 판 해안선) ÷ 화면 높이
uniform float uLod;          // 그림을 읽을 해상도 단계 — 직접 정한다 (휴대폰 GPU가 조건문 안에서 단계를 잘못 골라 색이 튀지 않게)
uniform vec2 uRes, uPS;
uniform vec3 uMap;
uniform float uDpr, uT, uU, uSnow, uNight, uSurge, uRain;
out vec4 o;

// 해안선 줄: 텍스처를 거치지 않고 상수 배열에서 바로 읽어 잇는다
// (반정밀도 텍스처·8비트 텍스처 모두 S25 Ultra 에서 물 위에 모래색 세로선이 번쩍였다)
#define NL ${N}
vec4 lineAt(float x) {
  float f = clamp(x / uRes.x, 0., 1.) * float(NL - 1);
  int i = int(floor(f)), j = min(i + 1, NL - 1);
  return mix(uL[i], uL[j], f - float(i));
}
vec2 uvOf(vec2 p) { return ((p - uMap.yz) / uMap.x) / uPS; }
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
// 빛 그물: 움직이는 점들의 보로노이 경계 (가장 가까운 두 점 거리 차가 작은 곳)
float web(vec2 p, float t) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 9., d2 = 9.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y), r = vec2(h21(i + g), h21(i + g + 17.3));
    r = .5 + .42 * sin(t + 6.2831 * r);
    float d = length(g + r - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return 1. - smoothstep(0., .24, d2 - d1);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec4 L = lineAt(p.x);
  float s = L.g * uRes.y, u = uU;
  // 안전장치: 값이 어떻게 들어와도 그린 해안선 근처로 묶는다 (물이 어느 한 칸만 사라지는 일이 없게)
  float e = clamp(L.r * uRes.y, s - uRes.y * .7, s + uRes.y * .06);
  float w = clamp(L.b * uRes.y, e - uRes.y, e);
  float s2 = clamp(L.a * uRes.y, s - uRes.y * .08, s + uRes.y * .08);
  float d = p.y - e;

  // ── 땅: 그려진 판, 그려진 해안선 아래는 물 뺀 모래 바닥 ──
  // (최적화) 깊은 물(d ≥ 1.2)에서는 땅 색이 섞이지 않는다 — 판 읽기·노이즈를 건너뛴다
  vec3 land = vec3(0.);
  if (d < 1.2) {
    land = textureLod(uPlate, uvOf(p), uLod).rgb;
    if (p.y > s - 6. * u) land = mix(land, textureLod(uDry, uvOf(p), uLod).rgb, smoothstep(s - 4. * u, s + 8. * u, p.y));
    if (uSnow > 0.) {
      float k = smoothstep(.38, .7, fbm(p / (55. * u)) + uSnow * .9 - .42) * uSnow;
      land = mix(land, vec3(.97, .96, .94), k * smoothstep(e - 2., e - 30. * u, p.y) * .92);
    }
    // 젖은 모래: 물이 닿았던 줄(w) 아래부터 물가까지 짙고 반들반들
    // 마르는 중인 위쪽은 옅고, 물가로 갈수록 짙게 — 넓은 그라데이션 (각진 경계가 생기지 않게 경계선도 살짝 흔든다)
    // (최적화) 젖은 줄은 ±12u 흔들리므로 그 위 18u 보다 위쪽·물가 아래쪽은 값이 0 — 노이즈를 계산하지 않는다
    if (p.y > w - 19. * u && p.y < e + 1.) {
      float wy = w + (fbm(vec2(p.x / (40. * u), 3.7)) - .5) * 24. * u;
      float wetK = smoothstep(wy - 6. * u, wy + 150. * u, p.y) * (1. - smoothstep(e - 1., e + 1., p.y));
      land = mix(land, land * vec3(.82, .79, .8) + vec3(.02, .03, .05), wetK * .8);
      // 물러난 물이 남긴 레이스 거품 한 줄 (물이 멀어질수록 옅어진다)
      float gap = e - w;
      float laceK = (1. - smoothstep(12. * u, 80. * u, gap)) * smoothstep(1. * u, 6. * u, gap);
      if (laceK > 0. && abs(p.y - w - 3. * u) < 2.2 * u) {
        float lace = (1. - smoothstep(0., 2.2 * u, abs(p.y - w - 3. * u))) * smoothstep(.4, .6, vnoise(vec2(p.x / (5. * u), w / (9. * u))));
        land = mix(land, vec3(1., .99, .96), lace * laceK * .85);
      }
    }

    // 비: 모래는 젖어 짙어지고 색이 조금 바랜다
    if (uRain > 0.) {
      float g = dot(land, vec3(.3, .59, .11));
      land = mix(land, vec3(g), .22 * uRain) * (1. - .1 * uRain);
    }
  }
  vec3 col = land;
  if (d > -2.) {
    // ── 물: 그려진 바다를 해안선만큼 끌어올리고, 깊이에 따라 다르게 비튼다 ──
    float depth = max(d, 0.);
    float shift = s - e;
    // 물가 띠(거품·얕은 물, D0)는 모양 그대로 해안선을 따라 올라오고, 그 뒤로는 모래를 덮은 얕은 물 막이 원래 바다까지 이어진다.
    // 먼바다는 제자리 (큰 파도 = 해변을 타고 오르는 얕은 물 — 바다 전체가 움직이지 않는다)
    float D0 = min(150. * u, uRes.y * .2), up = max(shift, 0.);
    // 바다 판 좌표: 바다 판 자신의 물가선(s2)을 지금 해안선(e)에 맞춘다
    float shift2 = s2 - e, rest = s2 - s;
    // 띠 아래 Z 구간만 부드럽게 늘여 원래 바다로 잇는다 (늘임은 최대 1.5배 — 한 줄을 늘인 세로 줄무늬가 생기지 않게)
    //  잔파도: 띠 아래 Z 구간을 살짝(≤1.5배) 늘여 원래 바다로 잇는다
    //  큰 파도: 먼바다는 제자리, 띠와 먼바다 사이는 물 막이 덮는다 (늘이지 않으니 줄무늬·이음매가 없다)
    float Z = max(3. * up, 220. * u), y1 = p.y - e - D0, big = smoothstep(20. * u, 90. * u, up);
    float yS = depth < D0 ? p.y + shift2 : (y1 < Z ? s2 + D0 + y1 * (Z - up) / Z : p.y + rest + min(shift, 0.));
    float yI = depth < D0 ? p.y + shift2 : p.y + rest + min(shift, 0.);
    float pb = uMap.z + uPS.y * uMap.x - 2.;
    if (yS > pb) yS = 2. * pb - yS;
    vec2 sp = vec2(p.x, mix(yS, yI, step(.5, big)));
    vec2 q = sp / u;
    float a1 = (1. + 3.5 * smoothstep(0., 260. * u, depth)) * u;
    vec2 dis = vec2(sin(q.y * .045 + uT * .75 + 1.5 * sin(q.x * .012 + uT * .3)),
                    cos(q.x * .03 - uT * .6 + 1.2 * sin(q.y * .02 - uT * .25))) * a1;
    if (depth > 60. * u) dis += (vec2(fbm(q * .008 + vec2(uT * .05, 0.)), fbm(q * .008 + vec2(5.2, uT * .04))) - .5) * 14. * u * smoothstep(60. * u, 420. * u, depth);
    vec3 sea = big > 0. && big < 1. ? mix(textureLod(uSea, uvOf(vec2(p.x, yS) + dis), uLod).rgb, textureLod(uSea, uvOf(vec2(p.x, yI) + dis), uLod).rgb, big) : textureLod(uSea, uvOf(sp + dis), uLod).rgb;
    // 얕은 물 막: 그 줄의 물빛을 흐리게 펴고, 비친 모래·되돌아 흐르는 물결을 얹는다
    // 물 막은 물가 띠 안에서 차오르고 원래 바다 안쪽에서 빠진다 → 띠와 바다 사이의 "한 줄을 늘인" 자리는 늘 물 막에 가려진다
    float sheet = smoothstep(e + D0 - 60. * u, e + D0, p.y) * (1. - smoothstep(s + D0, s + D0 + 50. * u, p.y)) * big;   // 물 막은 큰 파도 때만
    if (sheet > 0.) {
      // 그림 속 얕은 물빛(청록)으로 비친 모래를 덮는다 — 물가 쪽일수록 맑고 밝다
      // 얕은 물 아래 모래가 일렁여 비친다: 큰 덩어리 노이즈로 휘게(도메인 워핑) 해서 반복 무늬가 안 보이게
      vec2 wq = q * .012;
      vec2 warp = vec2(fbm(wq + vec2(0., -uT * .18)), fbm(wq + vec2(4.3, -uT * .14))) - .5;
      vec3 under = textureLod(uDry, uvOf(p + warp * 22. * u), uLod).rgb;
      float k = clamp((p.y - e - D0) / max(1., up), 0., 1.);
      vec3 teal = mix(vec3(.5, .85, .8), vec3(.3, .73, .75), k);
      vec3 film = mix(under * vec3(.66, .93, .95) + vec3(.03, .09, .11), teal, .45 + .25 * k);
      float lum = fbm(wq * 2.3 + warp * 1.6 + vec2(0., -uT * .3));
      film += (lum - .5) * .07;                                                        // 물빛 얼룩 (부드럽게)
      film = mix(film, vec3(1.), smoothstep(.66, .8, lum) * .14 * (1. - k));            // 드문드문 흩어지는 거품
      sea = mix(sea, film, sheet);
    }
    // 얕은 물의 빛 그물
    float shallow = (1. - smoothstep(10. * u, 150. * u, depth)) * smoothstep(4. * u, 16. * u, depth);
    if (shallow > 0.) {
      float cw = web(q * .02 + dis / u * .02, uT * .45) * web(q * .027 + vec2(3.1, 7.7), uT * .55 + 2.);
      sea += cw * .09 * shallow * (1. - uNight * .75) * vec3(.9, 1., .95);
    }
    // 물가 거품 테두리 (끊기며 흐른다)
    float rim = 1. - smoothstep(0., (3.5 + uSurge * 5.) * u, depth);
    if (rim > 0.) {
      float brk = smoothstep(.35, .62, fbm(vec2(p.x / (14. * u) - uT * .12, depth / (5. * u) - uT * .9)));
      sea = mix(sea, vec3(1., .99, .96), rim * (.5 + .5 * brk) * .9);
    }
    // 큰 파도: 밀려오는 물보라 줄무늬
    if (uSurge > 0. && depth < 60. * u) {
      float streak = smoothstep(.56, .74, fbm(vec2(p.x / (20. * u), depth / (6. * u) - uT * 1.6)));
      sea = mix(sea, vec3(1.), uSurge * (1. - smoothstep(0., 60. * u, depth)) * streak * .75);
    }
    // 반짝이는 햇빛
    if (depth > 12. * u && depth < 380. * u && uNight < 1. && uRain < 1.) {   // (최적화) 반짝임이 0이 되는 곳은 건너뛴다
      float cs = 15. * u;
      vec2 g = floor(p / cs); float hs = h21(g);
      vec2 c0 = (g + .5 + (vec2(h21(g + 3.1), h21(g + 7.7)) - .5) * .6) * cs;
      float tw = pow(max(0., sin(uT * (1.1 + hs * 1.6) + hs * 40.)), 26.);
      // 반짝임은 드문드문, 얕은 물~중간 물에서만 (그림 속 물방울 점과 겹치지 않게)
      float zone = smoothstep(.45, .7, vnoise(p / (90. * u) + vec2(uT * .02, 0.)));
      sea += (1. - smoothstep(0., 1.5 * u, length(p - c0))) * tw * step(.82, hs) * zone * smoothstep(12. * u, 50. * u, depth) * (1. - smoothstep(200. * u, 380. * u, depth)) * .9 * (1. - uNight) * (1. - uRain);
    }
    // 비: 물 위 곳곳에 빗방울 파문이 번갈아 퍼진다 (칸마다 하나, 저마다 다른 박자)
    if (uRain > 0.) {
      float rs = 30. * u;
      for (int k = 0; k < 2; k++) {
        vec2 gp = p / rs + float(k) * vec2(.5, .37), gi = floor(gp);
        float h1 = h21(gi + float(k) * 7.1), h2 = h21(gi + 3.3 + float(k));
        vec2 c = (gi + .2 + .6 * vec2(h1, h2)) * rs - float(k) * vec2(.5, .37) * rs;
        float ph = fract(uT * (.55 + .4 * h1) + h2), r = ph * 11. * u;
        vec2 dv = (p - c) * vec2(1., 2.);                    // 위에서 비스듬히 본 납작한 원
        float ring = (1. - smoothstep(0., 1.3 * u, abs(length(dv) - r))) * (1. - ph) * step(.25, h1);
        float ring2 = (1. - smoothstep(0., 1. * u, abs(length(dv) - r * .55))) * (1. - ph) * .6 * step(.25, h1) * step(.3, ph);
        sea += (ring + ring2) * .32 * uRain * vec3(.92, .97, 1.);
      }
      sea = mix(sea, vec3(dot(sea, vec3(.3, .59, .11))), .15 * uRain);
    }
    // 바위는 움직이는 물과 상관없이 원래 자리에 (깊은 바위만 물결 굴절로 살짝 흔들린다)
    vec2 rp = uvOf(p + dis * .5 * smoothstep(60. * u, 260. * u, depth));
    float rk = textureLod(uRock, rp, 0.).a;
    if (rk > .01) {
      vec3 rc = textureLod(uPlate, rp, uLod).rgb;
      sea = mix(sea, rc, rk);
    }
    col = mix(land, sea, smoothstep(-1.2, 1.2, d));
  }
  o = vec4(col, 1.);
}`;

export class WaterGL {
  constructor(canvas) {
    this.cv = canvas;
    const gl = (this.gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false }));
    if (!gl) throw new Error('WebGL2 없음');
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = (this.pr = gl.createProgram());
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'aP'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.U = {};
    for (const n of ['uPlate', 'uDry', 'uL', 'uLod', 'uSea', 'uRock', 'uRes', 'uPS', 'uMap', 'uDpr', 'uT', 'uU', 'uSnow', 'uNight', 'uSurge', 'uRain']) this.U[n] = gl.getUniformLocation(pr, n);
    this.line = new Float32Array(N * 4);
    gl.uniform1i(this.U.uPlate, 0); gl.uniform1i(this.U.uDry, 1); gl.uniform1i(this.U.uSea, 3); gl.uniform1i(this.U.uRock, 4);
    this.texs = {};
  }

  tex(unit, upload, mip) {
    const gl = this.gl, t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    upload();
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  setPlate(plate) {
    const gl = this.gl;
    if (this.plate === plate) return;
    for (const t of Object.values(this.texs)) gl.deleteTexture(t);   // 가로 ↔ 세로 판을 바꿀 때 앞 판을 비운다
    this.plate = plate;
    const up = (unit, src) => this.tex(unit, () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src), true);
    this.texs = { img: up(0, plate.img), dry: up(1, plate.dry), sea: up(3, plate.sea), rock: up(4, plate.rockMask) };
    gl.uniform2f(this.U.uPS, plate.pw, plate.ph);
  }

  resize(W, H, dpr) {
    this.W = W; this.H = H; this.dpr = Math.min(dpr, 2);   // 숲 잎 층(키위 위)과 같은 해상도 — 다르면 잎 가장자리가 어긋나 보인다
    this.cv.width = Math.round(W * this.dpr); this.cv.height = Math.round(H * this.dpr);
    this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
    this.gl.viewport(0, 0, this.cv.width, this.cv.height);
  }

  draw(beach, { snow = 0, night = 0, rain = 0 } = {}) {
    const gl = this.gl, { W, H } = this, P = this.plate, m = P.map;
    const step = W / (N - 1), wet = beach.wet, wc = wet.length;
    for (let i = 0; i < N; i++) {
      const x = i * step, wf = (x / W) * (wc - 1), wi = Math.min(wc - 2, Math.floor(wf)), wt = wf - wi;
      const sh = P.shore(x), ok = v => (Number.isFinite(v) ? v / H : sh / H);
      this.line[i * 4] = ok(beach.edge(x));
      this.line[i * 4 + 1] = sh / H;
      this.line[i * 4 + 2] = ok(wet[wi] * (1 - wt) + wet[wi + 1] * wt);
      this.line[i * 4 + 3] = ok(P.shoreSea(x));
    }
    gl.uniform4fv(this.U.uL, this.line);
    // 그림 한 픽셀이 화면 몇 픽셀에 해당하는지로 해상도 단계를 정한다 (화면보다 큰 그림을 줄여 볼 때만 > 0)
    gl.uniform1f(this.U.uLod, Math.max(0, Math.log2(1 / (m.s * this.dpr))));
    gl.uniform2f(this.U.uRes, W, H);
    gl.uniform3f(this.U.uMap, m.s, m.ox, m.oy);
    gl.uniform1f(this.U.uDpr, this.dpr);
    gl.uniform1f(this.U.uT, beach.t);
    gl.uniform1f(this.U.uU, beach.u);
    gl.uniform1f(this.U.uSnow, snow);
    gl.uniform1f(this.U.uNight, night);
    gl.uniform1f(this.U.uRain, rain);
    gl.uniform1f(this.U.uSurge, beach.surgeK || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
