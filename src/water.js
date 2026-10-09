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

const VS = `#version 300 es
in vec2 aP; void main(){ gl_Position = vec4(aP, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D uPlate, uDry, uLine, uSea, uRock;
uniform vec2 uRes, uPS;
uniform vec3 uMap;
uniform float uDpr, uT, uU, uSnow, uNight, uSurge;
out vec4 o;

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
  vec4 L = texture(uLine, vec2(clamp(p.x / uRes.x, 0., 1.), .5));
  float e = L.r * uRes.y, s = L.g * uRes.y, w = L.b * uRes.y, s2 = L.a * uRes.y, u = uU;
  float d = p.y - e;

  // ── 땅: 그려진 판, 그려진 해안선 아래는 물 뺀 모래 바닥 ──
  vec3 land = texture(uPlate, uvOf(p)).rgb;
  if (p.y > s - 6. * u) land = mix(land, texture(uDry, uvOf(p)).rgb, smoothstep(s - 4. * u, s + 8. * u, p.y));
  if (uSnow > 0.) {
    float k = smoothstep(.38, .7, fbm(p / (55. * u)) + uSnow * .9 - .42) * uSnow;
    land = mix(land, vec3(.97, .96, .94), k * smoothstep(e - 2., e - 30. * u, p.y) * .92);
  }
  // 젖은 모래: 물이 닿았던 줄(w) 아래부터 물가까지 짙고 반들반들
  float wetK = smoothstep(w - 2. * u, w + 16. * u, p.y) * (1. - smoothstep(e - 1., e + 1., p.y));
  land = mix(land, land * vec3(.8, .77, .78) + vec3(.02, .03, .05), wetK * .85);
  land += wetK * .05 * smoothstep(.5, .85, fbm(vec2(p.x / (26. * u), p.y / (12. * u))));
  // 물러난 물이 남긴 레이스 거품 한 줄 (물이 멀어질수록 옅어진다)
  float gap = e - w;
  float laceK = (1. - smoothstep(12. * u, 80. * u, gap)) * smoothstep(1. * u, 6. * u, gap);
  float lace = (1. - smoothstep(0., 2.2 * u, abs(p.y - w - 3. * u))) * smoothstep(.4, .6, vnoise(vec2(p.x / (5. * u), w / (9. * u))));
  land = mix(land, vec3(1., .99, .96), lace * laceK * .85);

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
    vec2 sp = vec2(p.x, depth < D0 ? p.y + shift2 : (p.y < s + D0 ? s2 + D0 : p.y + rest + min(shift, 0.)));
    vec2 q = sp / u;
    float a1 = (1. + 3.5 * smoothstep(0., 260. * u, depth)) * u;
    vec2 dis = vec2(sin(q.y * .045 + uT * .75 + 1.5 * sin(q.x * .012 + uT * .3)),
                    cos(q.x * .03 - uT * .6 + 1.2 * sin(q.y * .02 - uT * .25))) * a1;
    dis += (vec2(fbm(q * .008 + vec2(uT * .05, 0.)), fbm(q * .008 + vec2(5.2, uT * .04))) - .5) * 14. * u * smoothstep(60. * u, 420. * u, depth);
    vec3 sea = texture(uSea, uvOf(sp + dis)).rgb;
    // 얕은 물 막: 그 줄의 물빛을 흐리게 펴고, 비친 모래·되돌아 흐르는 물결을 얹는다
    // 물 막은 물가 띠 안에서 차오르고 원래 바다 안쪽에서 빠진다 → 띠와 바다 사이의 "한 줄을 늘인" 자리는 늘 물 막에 가려진다
    float sheet = smoothstep(e + D0 - 60. * u, e + D0, p.y) * (1. - smoothstep(s + D0, s + D0 + 50. * u, p.y)) * smoothstep(4. * u, 40. * u, up);
    if (sheet > 0.) {
      // 그림 속 얕은 물빛(청록)으로 비친 모래를 덮는다 — 물가 쪽일수록 맑고 밝다
      vec3 under = texture(uDry, uvOf(p + dis * .5)).rgb;
      float k = clamp((p.y - e - D0) / max(1., up), 0., 1.);
      vec3 teal = mix(vec3(.47, .84, .8), vec3(.27, .72, .74), k);
      vec3 film = mix(under * vec3(.6, .92, .94) + vec3(.03, .1, .12), teal, .55 + .2 * k);
      float flow = fbm(vec2(p.x / (46. * u) + sin(p.y / (70. * u)) * .25, (p.y - e) / (11. * u) - uT * 1.1));   // 되돌아 흐르는 가로 물결
      film += (flow - .5) * .14 + smoothstep(.62, .78, flow) * .18;
      sea = mix(sea, film, sheet);
    }
    // 얕은 물의 빛 그물
    float shallow = (1. - smoothstep(10. * u, 150. * u, depth)) * smoothstep(4. * u, 16. * u, depth);
    float cw = web(q * .02 + dis / u * .02, uT * .45) * web(q * .027 + vec2(3.1, 7.7), uT * .55 + 2.);
    sea += cw * .09 * shallow * (1. - uNight * .75) * vec3(.9, 1., .95);
    // 물가 거품 테두리 (끊기며 흐른다)
    float rim = 1. - smoothstep(0., (3.5 + uSurge * 5.) * u, depth);
    float brk = smoothstep(.35, .62, fbm(vec2(p.x / (14. * u) - uT * .12, depth / (5. * u) - uT * .9)));
    sea = mix(sea, vec3(1., .99, .96), rim * (.5 + .5 * brk) * .9);
    // 큰 파도: 밀려오는 물보라 줄무늬
    float streak = smoothstep(.56, .74, fbm(vec2(p.x / (20. * u), depth / (6. * u) - uT * 1.6)));
    sea = mix(sea, vec3(1.), uSurge * (1. - smoothstep(0., 60. * u, depth)) * streak * .75);
    // 반짝이는 햇빛
    float cs = 15. * u;
    vec2 g = floor(p / cs); float hs = h21(g);
    vec2 c0 = (g + .5 + (vec2(h21(g + 3.1), h21(g + 7.7)) - .5) * .6) * cs;
    float tw = pow(max(0., sin(uT * (1.1 + hs * 1.6) + hs * 40.)), 26.);
    // 반짝임은 드문드문, 얕은 물~중간 물에서만 (그림 속 물방울 점과 겹치지 않게)
    float zone = smoothstep(.45, .7, vnoise(p / (90. * u) + vec2(uT * .02, 0.)));
    sea += (1. - smoothstep(0., 1.5 * u, length(p - c0))) * tw * step(.82, hs) * zone * smoothstep(12. * u, 50. * u, depth) * (1. - smoothstep(200. * u, 380. * u, depth)) * .9 * (1. - uNight);
    // 바위는 움직이는 물과 상관없이 원래 자리에 (깊은 바위만 물결 굴절로 살짝 흔들린다)
    vec2 rp = uvOf(p + dis * .5 * smoothstep(60. * u, 260. * u, depth));
    float rk = texture(uRock, rp).a;
    if (rk > .01) {
      vec3 rc = texture(uPlate, rp).rgb;
      sea = mix(sea, rc, rk);
    }
    col = mix(land, sea, smoothstep(-1.2, 1.2, d));
  }
  o = vec4(col, 1.);
}`;

const N = 512;   // 해안선 줄 텍스처 칸 수

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
    for (const n of ['uPlate', 'uDry', 'uLine', 'uSea', 'uRock', 'uRes', 'uPS', 'uMap', 'uDpr', 'uT', 'uU', 'uSnow', 'uNight', 'uSurge']) this.U[n] = gl.getUniformLocation(pr, n);
    this.line = new Float32Array(N * 4);
    this.lineTex = this.tex(2, () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, N, 1, 0, gl.RGBA, gl.FLOAT, this.line), false);
    gl.uniform1i(this.U.uPlate, 0); gl.uniform1i(this.U.uDry, 1); gl.uniform1i(this.U.uLine, 2); gl.uniform1i(this.U.uSea, 3); gl.uniform1i(this.U.uRock, 4);
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
    this.W = W; this.H = H; this.dpr = Math.min(dpr, 1.5);   // 물은 부드러워서 해상도를 조금 낮춰도 된다
    this.cv.width = Math.round(W * this.dpr); this.cv.height = Math.round(H * this.dpr);
    this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
    this.gl.viewport(0, 0, this.cv.width, this.cv.height);
  }

  draw(beach, { snow = 0, night = 0 } = {}) {
    const gl = this.gl, { W, H } = this, P = this.plate, m = P.map;
    const step = W / (N - 1), wet = beach.wet, wc = wet.length;
    for (let i = 0; i < N; i++) {
      const x = i * step, wf = (x / W) * (wc - 1), wi = Math.min(wc - 2, Math.floor(wf)), wt = wf - wi;
      this.line[i * 4] = beach.edge(x) / H;
      this.line[i * 4 + 1] = P.shore(x) / H;
      this.line[i * 4 + 2] = (wet[wi] * (1 - wt) + wet[wi + 1] * wt) / H;
      this.line[i * 4 + 3] = P.shoreSea(x) / H;
    }
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.lineTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, 1, gl.RGBA, gl.FLOAT, this.line);
    gl.uniform2f(this.U.uRes, W, H);
    gl.uniform3f(this.U.uMap, m.s, m.ox, m.oy);
    gl.uniform1f(this.U.uDpr, this.dpr);
    gl.uniform1f(this.U.uT, beach.t);
    gl.uniform1f(this.U.uU, beach.u);
    gl.uniform1f(this.U.uSnow, snow);
    gl.uniform1f(this.U.uNight, night);
    gl.uniform1f(this.U.uSurge, beach.surgeK || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
