// sheet.js — v28 그림 격자(4×4) 한 장에서 칸을 잘라 그린다 (해도 · 낚은 것 · 섬에 짓는 것 공용)
//
//  생성 그림은 칸 안에서 자리가 조금씩 어긋나 있다 → 읽을 때 칸마다 실제로 그려진 범위(알파 > 0)를 한 번 재 두고,
//  그 범위를 기준으로 맞춰 그린다. 아이콘은 가운데 맞춤(fit), 건물은 바닥 맞춤(stand).

export function loadSheet(url) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res({ img, width: img.width, boxes: measure(img) });
    img.onerror = () => res(null);
    img.src = url;
  });
}
function measure(img) {
  const n = 4, cw = Math.floor(img.width / n), ch = Math.floor(img.height / n), q = 4;   // 4픽셀 간격으로 훑는다
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, img.width, img.height).data, out = [];
  for (let k = 0; k < n * n; k++) {
    const x0 = (k % n) * cw, y0 = Math.floor(k / n) * ch;
    let a = cw, b = ch, e = 0, f = 0;
    for (let y = 0; y < ch; y += q) for (let x = 0; x < cw; x += q) if (d[((y0 + y) * img.width + x0 + x) * 4 + 3] > 24) { if (x < a) a = x; if (y < b) b = y; if (x > e) e = x; if (y > f) f = y; }
    out.push(e > a ? { x: x0 + a, y: y0 + b, w: e - a + q, h: f - b + q } : { x: x0, y: y0, w: cw, h: ch });
  }
  return out;
}
// 가운데 맞춤: size × size 안에 비율 그대로
export function fitCell(ctx, sheet, n, x, y, size) {
  if (!sheet || n == null || !sheet.boxes) return false;
  const b = sheet.boxes[n], s = size / Math.max(b.w, b.h), w = b.w * s, h = b.h * s;
  ctx.drawImage(sheet.img, b.x, b.y, b.w, b.h, x - w / 2, y - h / 2, w, h);
  return true;
}
// 바닥 맞춤: 높이 h, 가운데 아래가 (x, y)
export function standCell(ctx, sheet, n, x, y, h) {
  if (!sheet || n == null || !sheet.boxes) return false;
  const b = sheet.boxes[n], s = h / b.h, w = b.w * s;
  ctx.drawImage(sheet.img, b.x, b.y, b.w, b.h, x - w / 2, y - h, w, h);
  return true;
}
// 둥근 창: 칸을 가운데 원으로 잘라 가장자리를 흐리게 (물로 꽉 찬 네모 타일을 해도 위 동그란 그림으로 — 바다 위의 곳)
const rounds = new WeakMap();
export function roundCell(ctx, sheet, n, x, y, size) {
  if (!sheet || n == null || !sheet.boxes) return false;
  let m = rounds.get(sheet); if (!m) rounds.set(sheet, m = {});
  if (!m[n]) {
    const b = sheet.boxes[n], s = Math.min(b.w, b.h), cv = document.createElement('canvas'); cv.width = cv.height = s;
    const c = cv.getContext('2d'); c.drawImage(sheet.img, b.x + (b.w - s) / 2, b.y + (b.h - s) / 2, s, s, 0, 0, s, s);
    const g = c.createRadialGradient(s / 2, s / 2, s * 0.28, s / 2, s / 2, s * 0.5);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'destination-in'; c.fillStyle = g; c.fillRect(0, 0, s, s);
    m[n] = cv;
  }
  ctx.drawImage(m[n], x - size / 2, y - size / 2, size, size);
  return true;
}
