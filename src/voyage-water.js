// voyage-water.js — 항해 바다 물 셰이더 (WebGL2, 자기 캔버스 한 장 → voyage-scene 이 2D 로 옮겨 그린다)
//
//  섬의 물(water.js)은 그림 속 해안선에 묶여 있어서, 탁 트인 바다는 따로 그린다.
//  앞으로 가는 느낌 = 바다 판 자체가 배 뒤로 계속 흘러간다(거울 반복으로 이음매 없이) + 그 위를 흐르는 잔물결 빛·반짝임·거품 줄.
//  배에 붙은 것: 뒤로 벌어지는 V 자 물살, 고물 뒤 흰 물보라, 뱃머리 물결. 이건 배를 따라오지만 물살 결은 물과 함께 흐른다.
//  밤(night 0~1)엔 밤바다 판(sea-night)으로 바꾸고, 달빛 물길 · 은빛 반짝임 · 물에 떠 흐르는 야광 점 · 배가 휘저은 물의 야광 플랑크톤 · 뱃머리 등불 빛 웅덩이를 더한다.
//  WebGL2 가 없으면 ok=false — voyage-scene 이 예전처럼 정지 그림으로 그린다.

const VS = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D tex, texN; uniform vec2 res, texSize, boat, boatSize; uniform float time, travel, calm, night;
// 정수 해시 — sin 해시는 오래 항해해 좌표가 커지면 정밀도가 무너져 물결이 네모 덩어리로 깨졌다
float h1(ivec2 c, uint s){ uint h = uint(c.x) * 1597334677u ^ uint(c.y) * 3812015801u ^ s * 2654435761u;
  h ^= h >> 15; h *= 0x2c1b3c6du; h ^= h >> 12; h *= 0x297a2d39u; h ^= h >> 15; return float(h & 0xffffffu) / 16777215.; }
float hash(vec2 p){ return h1(ivec2(floor(p)), 0u); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }
mat2 rot(float a){ float c = cos(a), n = sin(a); return mat2(c, -n, n, c); }
// 흩뿌린 점 — 칸마다 있을 수도 없을 수도 있고, 자리·크기·깜빡이는 박자가 제각각이며 천천히 떠다닌다 (격자로 안 보이게)
float dots(vec2 p, float keep, float r, uint s){
  ivec2 c = ivec2(floor(p)); vec2 f = fract(p);
  if (h1(c, s) > keep) return 0.;
  vec2 o = vec2(h1(c, s + 1u), h1(c, s + 2u)) * .66 + .17;
  o += .07 * vec2(sin(time * .5 + h1(c, s + 3u) * 20.), cos(time * .4 + h1(c, s + 4u) * 20.));
  float rr = r * (.45 + h1(c, s + 5u));
  float tw = .3 + .7 * (.5 + .5 * sin(time * (.7 + 1.6 * h1(c, s + 6u)) + h1(c, s + 7u) * 40.));
  return smoothstep(rr, 0., length(f - o)) * tw;
}
void main(){
  vec2 px = vUv * res; float u = min(res.x, res.y);
  vec2 w = px / u;                       // 짧은 변 = 1
  vec2 wp = vec2(w.x, w.y - travel);     // 물에 붙은 좌표 (물은 화면 아래로 흐른다)
  // 물결 일렁임: 그림 판을 읽는 자리를 천천히 비튼다
  vec2 d = vec2(fbm(wp * 2.6 + vec2(time * .06, 0.)) - .5, fbm(wp * 2.6 + 9.2 - vec2(0., time * .05)) - .5);
  float k = max(res.x / texSize.x, res.y / texSize.y) * 1.08;
  vec2 tuv = (px - .5 * res) / (texSize * k) + .5;
  tuv.y -= travel * u / (texSize.y * k);
  tuv += d * .03;
  vec3 col = mix(texture(tex, tuv).rgb, texture(texN, tuv).rgb, night);   // 밤엔 밤바다 판으로 (같은 구도)
  col = mix(col, col * vec3(.94, 1.0, 1.03), .5);
  vec3 foamC = mix(vec3(.93, .97, .98), vec3(.52, .66, .8), night);       // 밤 거품은 달빛 받은 푸른 회색
  vec3 glow = vec3(.22, .95, 1.);                                          // 야광 플랑크톤
  // 흐르는 잔물결 빛 (두 겹이 엇갈려 지나갈 때만 밝다)
  float r1 = sin(wp.x * 1.7 + wp.y * 11. + fbm(wp * 2.2) * 7. + time * 1.3);
  float r2 = sin(-wp.x * 2.6 + wp.y * 16. + fbm(wp * 3.1 + 3.) * 6. - time * 1.7);
  col += mix(vec3(.85, 1., 1.), vec3(.55, .7, 1.), night) * pow(max(0., r1 * r2), 7.) * mix(.22, .14, night) * calm;
  // 반짝임 (물에 붙어 같이 흐르며 깜빡) — 크기·각도가 다른 두 겹
  float gl = dots(rot(.5) * wp * 26., mix(.07, .025, night), .13, 1u) + dots(rot(-.9) * wp * 15. + 3.7, mix(.04, .015, night), .11, 11u);
  col += mix(vec3(1.), vec3(.8, .88, 1.), night) * gl * .6 * calm;
  // 밤: 달빛 물길 (화면 오른쪽 위에서 비스듬히 — 반짝임이 모여 흐른다)
  float path = smoothstep(.2, .0, abs(w.x - res.x / u * .68 + (w.y - .3) * .18 + .03 * sin(wp.y * 5. + time * .4)));
  float ms = dots(rot(.3) * wp * 44., .14, .18, 21u) + dots(rot(-.6) * wp * 29. + 1.3, .1, .15, 27u);
  col += vec3(.85, .9, 1.) * night * path * (.1 + ms * 1.1);
  // 밤: 물에 떠 흐르는 야광 점 — 무리 지어 몰렸다 비었다 하게
  float clump = smoothstep(.42, .72, fbm(wp * 1.4 + vec2(time * .02, 0.)));
  float pl = (dots(rot(.7) * wp * 13., .22, .13, 31u) + .7 * dots(rot(-.4) * wp * 21. + 5.1, .2, .1, 41u)) * (.2 + clump);
  col += glow * night * pl * .6;
  // 지나가는 물마루 거품 (가로로 짧게 끊긴 흰 결 — 물과 함께 아래로 흐른다)
  float f = fbm(vec2(wp.x * 2.2, wp.y * 7.5));
  float crest = smoothstep(.62, .67, f) * smoothstep(.74, .67, f) * smoothstep(.45, .7, fbm(wp * 9. + 4.));
  col = mix(col, foamC, crest * mix(.35, .22, night));
  // 배에 붙은 물살 — 선이 아니라 부서지는 거품 알갱이로
  vec2 b = (px - boat) / u, bs = boatSize / u;
  vec2 s = vec2(b.x, b.y - bs.y * .44);                 // 고물 기준, s.y > 0 = 배 뒤
  float along = max(s.y, 0.);
  if (s.y > -.02) {
    float grain = fbm(vec2(s.x * 30., (s.y - travel) * 22.));
    float arm = abs(abs(s.x) - bs.x * .28 - along * .3 - .015 * sin(along * 40. - time * 3.));
    float wake = smoothstep(.016 + along * .035, 0., arm) * smoothstep(.5, .0, along) * smoothstep(.38, .62, grain + .2 * (1. - along * 2.));
    float churn = smoothstep(bs.x * .32 + along * .06, 0., abs(s.x)) * smoothstep(.3, .0, along) * smoothstep(.42, .66, grain);
    col = mix(col, mix(vec3(.96, .99, 1.), foamC, night), clamp(wake * .8 + churn * .85, 0., .9) * mix(1., .55, night));
    // 밤: 배가 휘저은 물에 플랑크톤이 깨어나 푸르게 빛난다
    float spark = smoothstep(.55, .8, fbm(vec2(s.x * 40., (s.y - travel) * 30.) + time * .3));
    col += glow * night * clamp(wake * 1.1 + churn * 1.3 + spark * smoothstep(bs.x * .5 + along * .3, 0., abs(s.x)) * smoothstep(.7, 0., along) * .8, 0., 1.) * .55;
    col += vec3(.04, .07, .07) * smoothstep(bs.x * .45 + along * .3, 0., abs(s.x)) * smoothstep(.6, .0, along);   // 휘저은 물은 조금 밝다
  }
  // 뱃머리 · 옆구리 물결 (배 둘레를 감싸는 얇은 거품, 앞쪽일수록 진하게)
  float e = length(b / vec2(bs.x * .5, bs.y * .5));
  float hug = smoothstep(.16, .0, abs(e - 1.08)) * smoothstep(.3, -.5, b.y / (bs.y * .5)) * smoothstep(.4, .65, fbm(b * 34. + vec2(0., -travel * 34.)));
  col = mix(col, mix(vec3(.96, .99, 1.), foamC, night), hug * mix(.7, .4, night));
  col += glow * night * hug * .5;
  // 배 둘레 물 그늘
  col *= 1. - .16 * smoothstep(1.6, .9, e) * (1. - night * .7);
  // 밤: 뱃머리 등불이 물에 따뜻한 빛 웅덩이를 만든다
  float lamp = length((b - vec2(0., -bs.y * .5)) / vec2(1., 1.3));
  col += vec3(1., .72, .38) * night * (smoothstep(bs.x * 1.9, 0., lamp) * .2 + smoothstep(bs.x * .7, 0., lamp) * .12);
  o = vec4(col, 1.);
}`;

export class SeaGL {
  constructor() {
    this.cv = document.createElement('canvas');
    this.gl = this.cv.getContext('webgl2', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    this.ok = false; this.tex = new Map();
    // GPU 가 화면을 잃으면(오래 숨김·메모리 부족) 정지 그림으로 내려갔다가, 돌아오면 다시 만든다 — 투명한 바다가 보이지 않게
    this.cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.ok = false; this.tex = new Map(); });
    this.cv.addEventListener('webglcontextrestored', () => this.init());
    this.init();
  }
  init() {
    const gl = this.gl; if (!gl || gl.isContextLost()) return;
    try {
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const pr = this.pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.U = {}; for (const n of ['tex', 'texN', 'res', 'texSize', 'boat', 'boatSize', 'time', 'travel', 'calm', 'night']) this.U[n] = gl.getUniformLocation(pr, n);
      this.ok = true;
    } catch (e) { console.warn('voyage water', e); this.ok = false; }
  }
  // 바다 판을 거울 반복 텍스처로 (흘려도 이음매가 안 보이게)
  texture(img) {
    if (this.tex.has(img)) return this.tex.get(img);
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    this.tex.set(img, t); return t;
  }
  // w,h = 그릴 픽셀 크기. travel = 지금까지 흘러간 거리(짧은 변 단위). boat·boatSize 는 같은 픽셀 좌표
  render(img, w, h, { time, travel, boat, boatSize, calm = 1, night = 0, nightImg = null }) {
    if (!this.ok || this.gl.isContextLost()) return null;
    const gl = this.gl;
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    gl.viewport(0, 0, w, h); gl.useProgram(this.pr);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texture(img));
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.texture(nightImg || img));
    const U = this.U;
    gl.uniform1i(U.tex, 0); gl.uniform1i(U.texN, 1); gl.uniform1f(U.night, nightImg ? night : 0); gl.uniform2f(U.res, w, h); gl.uniform2f(U.texSize, img.width, img.height);
    gl.uniform2f(U.boat, boat[0], boat[1]); gl.uniform2f(U.boatSize, boatSize[0], boatSize[1]);
    gl.uniform1f(U.time, time); gl.uniform1f(U.travel, travel); gl.uniform1f(U.calm, calm);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return this.cv;
  }
}
