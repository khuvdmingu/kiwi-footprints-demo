// painted/base.js — 그림 한 장(장소 판)에서 땅 높이 만들기: 그려진 물가선 · 바위 가림막 · 물속 돌 2.5D 판
//  사용자 2026-11-24~25: "2d와 3d를 절묘하게 조합하는건 불가능한가" → "브랜치 만들고 아예 새로운 모드처럼" → "한번 만들어보자"
//  그림 모드는 색을 그림에서 가져오고, 높이·물·빛만 시뮬레이션이 맡는다. 그 높이를 여기서 그림으로부터 만든다.
//
//  세계 좌표: 판 가운데가 0, x 가로(오른쪽 +), z 세로(아래 = 바다 쪽 +). 판 폭이 WX 세계 단위.

export const PB = {
  nx: 384,          // 시뮬레이션 격자 가로 칸 (세로는 판 비율대로)
  wx: 64,           // 판 폭 (세계 단위) — 한 칸 ≈ 0.17
  slopeLand: 0.045, // 물가선 위 뭍이 오르는 경사
  slopeSea: 0.06,   // 물가선 아래 바다가 깊어지는 경사
  deep: -1.9,       // 가장 깊은 바닥
  rockTop: 0.6,     // 물속 돌 꼭대기 (잔잔한 수면 0 위로)
  landRock: 1.1,    // 모래 위 큰 바위 높이
  seaBand: 3,       // 판 아래 끝에서 이만큼(세계 단위)은 파도가 물 높이를 정한다
};

export function gridOf(pw, ph, p = PB) {
  const nx = p.nx, nz = Math.round(nx * ph / pw), cell = p.wx / nx;
  return { nx, nz, cell, wx: nx * cell, wz: nz * cell, seaZ: nz * cell / 2 - p.seaBand };
}

// 판의 물가선(px, 분석 칸마다) → 세계 x 에서의 물가선 z
export function shoreFn(shoreP, pw, ph, g) {
  const n = shoreP.length;
  return (x) => {
    const fi = Math.min(n - 1, Math.max(0, (x / g.wx + 0.5) * (n - 1))), a = Math.floor(fi), b = Math.min(n - 1, a + 1);
    const py = shoreP[a] + (shoreP[b] - shoreP[a]) * (fi - a);
    return (py / ph - 0.5) * g.wz;
  };
}

// 모래 높이 (바위 빼고) — 물가선에서 0
export function sandH(d, p = PB) { return d < 0 ? -d * p.slopeLand : Math.max(-d * p.slopeSea, p.deep); }

// 그림 → 격자 칸 크기로 줄여 픽셀 읽기 (브라우저에서만)
export function pixelsOf(img, nx, nz) {
  const c = document.createElement('canvas'); c.width = nx; c.height = nz;
  const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, nx, nz); return g.getImageData(0, 0, nx, nz).data;
}

// 칸마다 처음 땅 높이: 모래 + 바위 (rock25 = 물속 돌 판 픽셀 R 자리·G 높이, rockA = 바위 가림막 알파)
export function buildBase(g, shoreZ, { rock25 = null, rockA = null } = {}, p = PB) {
  const { nx, nz, cell } = g, a = new Float32Array(nx * nz);
  // 모래 위 바위: 가림막을 한 번 부드럽게 (둥근 어깨)
  let soft = null;
  if (rockA) {
    soft = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      let s = 0, n = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < nx && jj < nz) { s += rockA[(jj * nx + ii) * 4 + 3] / 255; n++; } }
      soft[j * nx + i] = s / n;
    }
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * cell - g.wx / 2, z = (j + 0.5) * cell - g.wz / 2, d = z - shoreZ(x), k = j * nx + i;
    let h = sandH(d, p);
    const sea = Math.min(1, Math.max(0, (d - 0.2) / 1.2));   // 물가선 아래: 물속 돌 판 · 위: 바위 가림막
    if (rock25 && sea > 0) { const r = rock25[k * 4] / 255, hg = rock25[k * 4 + 1] / 255; if (r > 0.5) h += (Math.max(h, p.rockTop * Math.sqrt(hg)) - h) * sea * Math.min(1, (r - 0.5) * 4); }
    if (soft && sea < 1) { const m = Math.min(1, Math.max(0, (soft[k] - 0.3) / 0.6)); h += m * m * (3 - 2 * m) * p.landRock * (1 - sea); }
    a[k] = h;
  }
  return a;
}
