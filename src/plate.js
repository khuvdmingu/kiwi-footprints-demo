// plate.js — v8: 그림 판(사용자 그림을 Higgsfield 로 다시 그린 배경)을 읽고, 그 위의 "사실"을 뽑는다
//
//  판 세 장이 한 벌 (assets/, 같은 구도·같은 크기). 가로 화면은 plate*, 세로 화면(휴대폰)은 tall*:
//   plate.webp     — 키위·글씨·갈매기를 지운 해변 (숲·모래·바위·바다 전부 그려져 있다)
//   plate-dry.webp — 같은 해변에서 바닷물만 뺀 것 (물이 빠졌을 때 드러나는 젖은 모래 바닥)
//   plate-sea.webp — 같은 해변에서 물속·물가 바위만 지운 것 → 파도가 움직여도 바위는 제자리 (rock 가림막)
//  화면에는 "cover" 로 깐다 (빈틈 없이 채우고 넘치는 쪽을 가운데 기준으로 자른다).
//  그림을 픽셀 단위로 훑어 다음을 만든다 — 코드가 그림과 어긋나지 않게 하는 장치:
//   · shore(x)  그려진 해안선 (모래 → 거품·물이 시작되는 줄). 바다를 움직일 기준선
//   · forest(x) 숲 가장자리 (위에서 내려오다 처음 모래가 나오는 줄). 키위가 들고 나는 곳
//   · canopy    숲 잎만 오려 낸 그림 → 키위 위에 한 번 더 깔면 키위가 덤불 뒤로 숨는다
//   · shadeAt   모래 위 잎 그림자 농도 → 그늘을 지나는 키위를 어둡게

const AW = 800;   // 분석용 축소 폭 (픽셀 판정은 이 해상도에서)

export async function loadPlate(base = 'assets/', name = 'plate', opts = {}) {
  const load = src => new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => rej(new Error('그림을 못 읽었다: ' + src)); im.src = base + src; });
  const [img, dry, sea] = await Promise.all([load(name + '.webp?v=v15.2.0'), load(name + '-dry.webp?v=v15.2.0'), load(name + '-sea.webp?v=v15.2.0')]);
  const p = new Plate(img, dry, sea, opts);
  p.name = name;
  return p;
}

export class Plate {
  constructor(img, dry, sea, opts = {}) {
    this.img = img; this.dry = dry; this.sea = sea; this.opts = opts;
    this.pw = img.naturalWidth; this.ph = img.naturalHeight;
    this.analyze();
  }

  analyze() {
    const aw = AW, ah = Math.round(AW * this.ph / this.pw);
    const c = document.createElement('canvas'); c.width = aw; c.height = ah;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(this.img, 0, 0, aw, ah);
    const px = g.getImageData(0, 0, aw, ah).data;
    const at = (x, y) => { const i = (y * aw + x) * 4; return [px[i], px[i + 1], px[i + 2]]; };
    // 물 뺀 판과 비교: 두 그림이 크게 다른 곳이 물이다 (모래·흙·돌·통나무는 두 그림에서 같다)
    g.drawImage(this.dry, 0, 0, aw, ah);
    const dp = g.getImageData(0, 0, aw, ah).data;
    const wet = (x, y) => { const i = (y * aw + x) * 4; return Math.abs(px[i] - dp[i]) + Math.abs(px[i + 1] - dp[i + 1]) + Math.abs(px[i + 2] - dp[i + 2]) > 60; };
    const runWet = (x, y0, n) => { for (let k = 0; k < n; k++) if (y0 + k >= ah || !wet(x, y0 + k)) return false; return true; };
    const leaf = ([r, gg, b]) => (gg >= r * 0.93 && b < gg * 0.9) || r + gg + b < 210;
    const sand = ([r, gg, b]) => r > 170 && r >= gg && gg >= b && r - b > 26 && !(gg >= r * 0.93);   // 바닷가 모래 · 창백한 강가 흙 둘 다
    // 눈(opts.ground 'snow'): 밝고 색이 옅다 — 볕 받은 따뜻한 흰색도, 푸른 그늘도 (짙은 침엽수는 어두워서 빠진다)
    const snowy = ([r, gg, b]) => { const mx = Math.max(r, gg, b); return r + gg + b > 480 && mx - Math.min(r, gg, b) < mx * 0.3; };
    this.snowGround = this.opts.ground === 'snow';
    const run = (x, y0, test, n) => { for (let k = 0; k < n; k++) if (y0 + k >= ah || !test(at(x, y0 + k))) return false; return true; };

    // 잡음을 걸러 내는 이동 중앙값 · 이동 평균
    const box = (a, r) => { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) { let t = 0, n = 0; for (let k = -r; k <= r; k++) { const j = i + k; if (j >= 0 && j < a.length) { t += a[j]; n++; } } o[i] = t / n; } return o; };
    this.box = box;
    const median = (a, r) => { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) { const w = []; for (let k = -r; k <= r; k++) w.push(a[Math.min(a.length - 1, Math.max(0, i + k))]); w.sort((p, q) => p - q); o[i] = w[r]; } return o; };
    const shore = new Float32Array(aw), forest = new Float32Array(aw);
    const RUN = Math.round(aw * 0.015), R2 = Math.round(RUN * 0.8);   // 연속 판정 길이 (폭 기준)
    // ① 물가선: 맵이 정한 높이(shoreFrom) 아래에서 물 뺀 판과 크게 다른 곳이 처음 이어지는 줄
    const from = Math.round(ah * (this.opts.shoreFrom ?? 0.4));
    for (let x = 0; x < aw; x++) {
      let s = ah * 0.62;
      for (let y = from; y < ah - RUN; y++) if (runWet(x, y, RUN)) { s = y; break; }
      shore[x] = s;
    }
    // 전체 중앙값에서 화면 높이의 10% 넘게 벗어난 칸(가장자리 바위·통나무를 물로 읽은 곳)은 버리고 가까운 정상 칸으로 메운다
    const M = [...shore].sort((p, q) => p - q)[aw >> 1], okS = shore.map(v => Math.abs(v - M) <= ah * 0.1);
    for (let x = 0; x < aw; x++) if (!okS[x]) { let l = x, r = x; while (l >= 0 && !okS[l]) l--; while (r < aw && !okS[r]) r++; shore[x] = l < 0 ? (r < aw ? shore[r] : M) : r >= aw ? shore[l] : shore[l] + (shore[r] - shore[l]) * (x - l) / (r - l); }
    const shoreS = box(box(median(shore, 12), 10), 10);
    // ② 숲 줄: 물가선에서 위로 올라가며 모래·흙이 끝나는 곳 (햇살 받은 잎을 모래로 읽어도 위쪽이라 상관없다)
    for (let x = 0; x < aw; x++) {
      let f = 0, cnt = 0;
      // 물가의 거품·젖은 띠를 건너뛰고(물가선 위 6% 부터), 흰 거품은 모래 쪽으로 친다
      const ground = this.snowGround ? snowy : c => sand(c) || (c[0] > 205 && c[1] > 200 && c[2] > 185);
      for (let y = Math.round(shoreS[x] - ah * 0.06); y >= 0; y--) { if (!ground(at(x, y))) { if (++cnt >= R2) { f = y + cnt; break; } } else cnt = 0; }
      forest[x] = Math.min(f, shoreS[x] - ah * 0.2);   // 글씨 쓸 바닥은 적어도 화면 높이의 20%
    }
    // 판 좌표(픽셀)로 저장
    const k = this.pw / aw;
    this.shoreP = shoreS.map(v => v * k - 2 * k);
    this.forestP = median(forest, 5).map(v => v * k);
    this._dp = dp;

    // 잎 가림막: 숲 줄 근처까지의 잎 픽셀만 남긴 알파 (판 위쪽 절반에서만)
    const m = document.createElement('canvas'); m.width = aw; m.height = ah;
    const mg = m.getContext('2d'); const md = mg.createImageData(aw, ah);
    for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
      const i = (y * aw + x) * 4, lim = forest[x] + RUN * 0.6;
      const on = y < lim && y < ah * 0.45 && leaf(at(x, y));
      md.data[i + 3] = on ? 255 : 0;
    }
    mg.putImageData(md, 0, 0);
    // 잎 가장자리를 부드럽게 (계단·점박이 방지)
    const ms = document.createElement('canvas'); ms.width = aw; ms.height = ah;
    const msg = ms.getContext('2d'); msg.filter = 'blur(0.8px)'; msg.drawImage(m, 0, 0);
    this.leafMask = ms;

    // 모래 밝기 기준 (그늘 판정용): 숲 줄과 해안선 사이 밝기의 상위 10%
    const lums = [];
    this.lum = new Float32Array(aw * ah);
    for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) { const [r, gg, b] = at(x, y); const L = 0.3 * r + 0.59 * gg + 0.11 * b; this.lum[y * aw + x] = L; if (y > forest[x] + RUN && y < shore[x] - RUN && x % 3 === 0 && y % 3 === 0) lums.push(L); }
    lums.sort((p, q) => p - q);
    this.sandLum = lums[Math.floor(lums.length * 0.9)] || 220;
    this.aw = aw; this.ah = ah;
    // 바위 지운 판은 다시 그린 그림이라 물가선이 몇 픽셀 다를 수 있다 → 그 판의 물가선도 따로 읽어 바다를 맞춰 끌어올린다
    this.shoreSeaP = this.shoreOf(this.sea, median, k);
    this._dp = null;
    this.rockMask = this.makeRockMask(Math.round(forest.reduce((a, b) => a + b, 0) / aw / ah * 100) / 100);
  }

  // 바위 지운 판의 물가선: 그 판과 물 뺀 판이 크게 다른 곳을, 원래 물가선 근처에서만 찾는다
  shoreOf(im, median, k) {
    const aw = this.aw, ah = this.ah, dp = this._dp;
    const c = document.createElement('canvas'); c.width = aw; c.height = ah;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, aw, ah);
    const px = g.getImageData(0, 0, aw, ah).data, RUN = Math.round(aw * 0.015);
    const ok = (x, y) => { for (let j = 0; j < RUN; j++) { const i = ((y + j) * aw + x) * 4; if (Math.abs(px[i] - dp[i]) + Math.abs(px[i + 1] - dp[i + 1]) + Math.abs(px[i + 2] - dp[i + 2]) <= 60) return false; } return true; };
    const out = new Float32Array(aw);
    for (let x = 0; x < aw; x++) { const s0 = this.shoreP[x] / k + 2; out[x] = s0; for (let y = Math.round(s0 - ah * 0.06); y < Math.min(ah - RUN, s0 + ah * 0.08); y++) if (ok(x, y)) { out[x] = y; break; } }
    // 두 판의 물가선 차이만 아주 부드럽게 남긴다 (판정 잡음이 바다를 세로로 찢지 않게)
    const m = median(out, 6).map(v => v * k - 2 * k);
    const diff = this.box(m.map((v, i) => v - this.shoreP[i]), 40);
    return this.shoreP.map((v, i) => v + diff[i]);
  }

  // 바위 가림막: 원본과 "바위 지운 판"이 크게 다르고 원본 쪽이 더 어두운 곳 = 물속·물가 바위
  makeRockMask(forestFrac) {
    const mw = 1024, mh = Math.round(mw * this.ph / this.pw);
    const grab = im => { const c = document.createElement('canvas'); c.width = mw; c.height = mh; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, mw, mh); return g.getImageData(0, 0, mw, mh).data; };
    const a = grab(this.img), b = grab(this.sea);
    const m = document.createElement('canvas'); m.width = mw; m.height = mh;
    const g = m.getContext('2d'); const d = g.createImageData(mw, mh);
    const y0 = Math.round(mh * (forestFrac + 0.08));
    const bin = new Uint8Array(mw * mh);
    for (let y = y0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const i = (y * mw + x) * 4;
      const diff = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      const la = 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2], lb = 0.3 * b[i] + 0.59 * b[i + 1] + 0.11 * b[i + 2];
      const red = a[i] - a[i + 1] > 70;   // 불가사리 같은 붉은 것은 바위가 아니다
      // 물가·물속 바위: 바위 지운 판과 크게 다르고 원본이 더 어둡다
      // 모래 위 바위: 해안선보다 위에서, 모래와 달리 파랑이 빨강만큼 있고(회보라) 어두우며 잎처럼 초록이 아니다
      const shoreY = this.shoreP[Math.min(this.shoreP.length - 1, Math.floor(x * this.shoreP.length / mw))] * mh / this.ph;
      // (눈밭은 땅 위 바위를 따로 찾지 않는다 — 푸른 눈 그늘이 회보라 바위처럼 읽혀서)
      const landRock = !this.opts.ground && y < shoreY && a[i + 2] > a[i] * 0.78 && la < 165 && a[i + 1] < a[i] * 1.05;
      // 바위 색인지: 어둡거나, 빨강과 파랑이 비슷한 회보라 (모래·거품 조각을 바위로 잘못 잡지 않게)
      const rocky = la < 120 || (Math.abs(a[i] - a[i + 2]) < 45 && la < 170);
      // 개울 돌(opts.stones): 물보다 밝은 회색 돌도 제자리에 — 빨강·초록·파랑이 고르고 거품만큼 하얗지는 않다
      const grey = this.opts.stones && Math.abs(a[i] - a[i + 1]) < 38 && Math.abs(a[i + 1] - a[i + 2]) < 38 && la > 60 && la < 215;
      bin[y * mw + x] = !red && ((rocky && ((diff > 90 && lb - la > 20) || landRock)) || (grey && diff > 70)) ? 1 : 0;
    }
    // 열기(깎았다 다시 불리기): 물결·거품 윤곽 같은 가는 선은 사라지고 바위 덩어리만 남는다
    const R = 4, pass = (src, keep) => {
      const tmp = new Uint8Array(mw * mh), out = new Uint8Array(mw * mh);
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { let v = keep; for (let k = -R; k <= R; k++) { const xx = Math.min(mw - 1, Math.max(0, x + k)); if (src[y * mw + xx] !== keep) { v = 1 - keep; break; } } tmp[y * mw + x] = v; }
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { let v = keep; for (let k = -R; k <= R; k++) { const yy = Math.min(mh - 1, Math.max(0, y + k)); if (tmp[yy * mw + x] !== keep) { v = 1 - keep; break; } } out[y * mw + x] = v; }
      return out;
    };
    const opened = pass(pass(bin, 1), 0);   // 깎기(1이 모두 1이어야 1) → 불리기(0이 모두 0이어야 0)
    for (let j = 0; j < mw * mh; j++) { d.data[j * 4] = d.data[j * 4 + 1] = d.data[j * 4 + 2] = 255; d.data[j * 4 + 3] = opened[j] * 255; }
    g.putImageData(d, 0, 0);
    // 가장자리를 살짝 부풀리고 부드럽게
    const o = document.createElement('canvas'); o.width = mw; o.height = mh;
    const og = o.getContext('2d'); og.filter = 'blur(1.5px)';
    og.drawImage(m, 0, 0);
    return o;
  }

  // 화면 크기에 맞춘 배치 (cover). 판 좌표 → 화면 좌표: sx = px * s + ox
  fit(W, H) {
    const s = Math.max(W / this.pw, H / this.ph);
    this.map = { s, ox: (W - this.pw * s) / 2, oy: (H - this.ph * s) / 2, W, H };
    return this.map;
  }
  toPlateX(x) { return (x - this.map.ox) / this.map.s; }
  // 화면 x 의 해안선·숲 줄 (화면 y)
  sample(arr, x) {
    const n = arr.length, f = Math.min(n - 1.001, Math.max(0, this.toPlateX(x) / this.pw * (n - 1)));
    const i = Math.floor(f), t = f - i;
    return (arr[i] * (1 - t) + arr[i + 1] * t) * this.map.s + this.map.oy;
  }
  shore(x) { return this.sample(this.shoreP, x); }
  shoreSea(x) { return this.sample(this.shoreSeaP, x); }
  forest(x) { return this.sample(this.forestP, x); }

  // (x, y) 모래의 그늘 정도: 1 = 볕, 0.6 = 짙은 잎 그늘
  shadeAt(x, y) {
    const { s, ox, oy } = this.map;
    const ax = Math.round(((x - ox) / s) * this.aw / this.pw), ay = Math.round(((y - oy) / s) * this.ah / this.ph);
    if (ax < 0 || ay < 0 || ax >= this.aw || ay >= this.ah) return 1;
    return Math.min(1, Math.max(0.6, this.lum[ay * this.aw + ax] / this.sandLum));
  }

  // 키위 위에 덮을 숲 잎 그림 (화면 해상도로 한 번 그린다)
  paintCanopy(cv, dpr) {
    const { s, ox, oy, W, H } = this.map;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.drawImage(this.img, ox, oy, this.pw * s, this.ph * s);
    g.globalCompositeOperation = 'destination-in';
    g.imageSmoothingEnabled = true;
    g.drawImage(this.leafMask, ox, oy, this.pw * s, this.ph * s);
    g.globalCompositeOperation = 'source-over';
  }
}
