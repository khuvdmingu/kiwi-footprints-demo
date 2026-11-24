// painted/rocks3d.js — 물속 바위를 3D 모델로 (사용자 2026-11-25 "현재 바위가 화질이 되게 안좋네" → "아예 새로 만들어봐" · "3d나 2.5d로")
//  그림 속 물속 돌 자리(2.5D 판 <판>-rock25.webp 의 R)를 덩어리로 나눠, 덩어리마다
//   · 자리(가운데) · 크기와 방향(퍼진 모양의 긴 축·짧은 축) · 높이(G 의 가장 높은 값) · 색(물 뺀 판에서 그 자리의 평균)
//  을 재고, 각진 바위(레퍼런스의 로우폴리 바위처럼 면이 보이는)를 세운다. 물 면이 실제 높이를 가지므로 물보다 높은 부분만 보이고,
//  파도가 오면 아랫부분부터 진짜로 잠긴다. 물이 닿는 선에는 젖은 띠와 거품 줄.
import * as THREE from 'three';

const ROCK_VERT = /* glsl */`
  varying vec3 vN; varying vec3 vW;
  void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const ROCK_FRAG = /* glsl */`
  uniform vec3 uCol, uSun, uSunCol, uSky; uniform sampler2D uS; uniform vec2 uWorld;
  varying vec3 vN; varying vec3 vW;
  void main() {
    vec3 n = normalize(vN); float d = dot(n, uSun);
    float t = smoothstep(-.05, .15, d) * .55 + smoothstep(.42, .62, d) * .45;   // 세 단 명암 (그림 같은 면)
    vec3 c = uCol * mix(vec3(.46, .48, .64), vec3(1.25, 1.18, 1.06), t);
    c += uSky * .08 * smoothstep(.2, .9, n.y);
    vec2 s = vW.xz / uWorld + .5; vec4 st = texture(uS, vec2(s.x, s.y));
    float surf = st.r + st.g, above = vW.y - surf;
    c *= mix(1., .7, 1. - smoothstep(.0, .28, above));                          // 물이 막 닿는 아랫부분은 젖어 짙다
    c = mix(c, vec3(.97, .98, 1.) * (uSky * .45 + uSunCol * .7), (1. - smoothstep(.0, .07, abs(above))) * smoothstep(.002, .02, st.g) * .7);   // 물에 닿는 선의 거품
    gl_FragColor = vec4(c, 1.);
    #include <colorspace_fragment>
  }`;

function hash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

// 덩어리 찾기 (R > 128, 네 이웃) — 작은 점은 버린다
export function findRocks(px, w, h, minArea = 6) {
  const seen = new Uint8Array(w * h), out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k0 = y * w + x; if (seen[k0] || px[k0 * 4] < 128) continue;
    const st = [k0]; seen[k0] = 1; let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, top = 0; const cells = [];
    while (st.length) {
      const k = st.pop(), cx = k % w, cy = (k - cx) / w; n++; sx += cx; sy += cy; sxx += cx * cx; syy += cy * cy; sxy += cx * cy; top = Math.max(top, px[k * 4 + 1]); cells.push(k);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const kk = ny * w + nx; if (!seen[kk] && px[kk * 4] >= 128) { seen[kk] = 1; st.push(kk); } }
    }
    if (n < minArea) continue;
    const mx = sx / n, my = sy / n, a = sxx / n - mx * mx, b = syy / n - my * my, c = sxy / n - mx * my;
    const tr = (a + b) / 2, det = Math.sqrt(Math.max(0, ((a - b) / 2) ** 2 + c * c)), l1 = tr + det, l2 = Math.max(0.3, tr - det);
    const ang = 0.5 * Math.atan2(2 * c, a - b);
    out.push({ x: mx + 0.5, y: my + 0.5, r1: 2 * Math.sqrt(l1), r2: 2 * Math.sqrt(l2), ang, top: top / 255, n, cells });
  }
  return out;
}

// 각진 바위 한 개 (반지름 1, 아래는 평평하게 묻힌다)
function rockGeometry(seed) {
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + 0.34 * (hash(seed * 13.1 + Math.round(v.x * 7) * 3.7 + Math.round(v.y * 7) * 11.3 + Math.round(v.z * 7) * 5.9) - 0.5) * 2;   // 울퉁불퉁하게 (둥글면 조약돌처럼 보였다)
    v.multiplyScalar(k); v.y = v.y > 0 ? Math.pow(v.y, 0.85) : v.y;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); g.dispose();   // 면마다 따로 — 각진 면이 보인다
  return ng;
}

// 바위 무리 만들기: r25 = 2.5D 판 그림, dry = 물 뺀 판 그림, g = 격자(세계 크기), uni = 해·하늘·물 상태(공유)
export function buildRocks(r25, dry, g, uni, { RW = 400 } = {}) {
  const RH = Math.round(RW * r25.height / r25.width);
  const cv = document.createElement('canvas'); cv.width = RW; cv.height = RH; const c = cv.getContext('2d', { willReadFrequently: true });
  c.drawImage(r25, 0, 0, RW, RH); const px = c.getImageData(0, 0, RW, RH).data;
  c.drawImage(dry, 0, 0, RW, RH); const col = c.getImageData(0, 0, RW, RH).data;
  const rocks = findRocks(px, RW, RH), group = new THREE.Group(), kx = g.wx / RW, kz = g.wz / RH;
  rocks.forEach((r, i) => {
    let R = 0, G = 0, B = 0; for (const k of r.cells) { R += col[k * 4]; G += col[k * 4 + 1]; B += col[k * 4 + 2]; }
    const n = r.cells.length, color = new THREE.Color().setRGB(R / n / 255, G / n / 255, B / n / 255, THREE.SRGBColorSpace);
    const top = 0.6 * Math.sqrt(r.top) + 0.14, base = -1.2;
    const m = new THREE.Mesh(rockGeometry(i + 1), new THREE.ShaderMaterial({ vertexShader: ROCK_VERT, fragmentShader: ROCK_FRAG,
      uniforms: { uCol: { value: color }, uSun: uni.uSun, uSunCol: uni.uSunCol, uSky: uni.uSky, uS: uni.uS, uWorld: { value: new THREE.Vector2(g.wx, g.wz) } } }));
    m.position.set((r.x / RW - 0.5) * g.wx, (top + base) / 2, (r.y / RH - 0.5) * g.wz);
    m.scale.set(r.r1 * kx * 1.1, (top - base) / 2, r.r2 * kz * 1.1);   // 그림 속 돌을 다 덮을 만큼
    m.rotation.y = -r.ang;
    m.renderOrder = 1; group.add(m);
  });
  group.userData.count = rocks.length;
  return group;
}
