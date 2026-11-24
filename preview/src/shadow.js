// shadow.js — v29.11 그림 모양을 따라 바닥에 눕는 그림자 (동그란 타원 그림자가 어색하다는 사용자 의견)
//
//  그림의 실루엣을 한 번만 작게 떠서(흐리게 구워 둠) 매 프레임엔 기울여 납작하게 그리기만 한다.
//  + 발밑에 아주 작은 접지 그림자(닿은 자리만 진하게). 빛은 키위 그림자(kiwi.js)처럼 오른쪽으로 눕힌다.

const cache = new WeakMap(), PAD = 8;

// 흐린 실루엣 캔버스 (그림 비율 그대로, 사방 PAD 여백 — 흐림이 잘리지 않게)
export function silhouette(im) {
  if (cache.has(im)) return cache.get(im);
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
  if (!w || !h) return null;
  const s = Math.min(1, 120 / Math.max(w, h)), cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
  const flat = document.createElement('canvas'); flat.width = cw; flat.height = ch;
  const f = flat.getContext('2d'); f.drawImage(im, 0, 0, cw, ch);
  // 그림 속 물건의 실제 바닥(투명 여백 아래는 빼고) — 그림자를 그 바닥에 붙인다
  let bot = 1;
  try { const d = f.getImageData(0, 0, cw, ch).data; bot = 0; for (let y = ch - 1; y >= 0 && !bot; y--) for (let x = 0; x < cw; x++) if (d[(y * cw + x) * 4 + 3] > 80) { bot = (y + 1) / ch; break; } bot ||= 1; } catch (e) { bot = 1; }
  f.globalCompositeOperation = 'source-in'; f.fillStyle = 'rgb(46, 32, 18)'; f.fillRect(0, 0, cw, ch);
  const c = document.createElement('canvas'); c.width = cw + PAD * 2; c.height = ch + PAD * 2;
  const g = c.getContext('2d');
  if ('filter' in g) g.filter = 'blur(2.5px)';
  g.drawImage(flat, PAD, PAD);
  const out = { c, pw: PAD / cw, ph: PAD / ch, bot };   // 여백 비율 (그릴 때 그림 크기에 맞춰 늘린다)
  cache.set(im, out); return out;
}

// 그림 상자가 (x - w/2, boxBottom - h) ~ (x + w/2, boxBottom) 일 때, 그 안 물건의 실제 바닥에서 눕는 그림자
//  squash = 세로로 납작한 정도 · lean = 오른쪽으로 눕는 정도 · alpha = 진하기 · lift = 그림 바닥이 땅에서 뜬 높이(뛸 때)
export function dropShadow(ctx, im, x, boxBottom, w, h, { alpha = 0.2, squash = 0.22, lean = 0.9, lift = 0, contact = 0.5 } = {}) {
  const sil = silhouette(im); if (!sil) return;
  const groundY = boxBottom - h * (1 - sil.bot) + lift, fade = 1 / (1 + lift / Math.max(1, h) * 3);
  // 접지 그림자: 발밑 가운데만 짧고 진하게 (닿은 느낌)
  if (contact > 0) {
    const r = w * 0.32 * (1 + lift / h), g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);   // 옮긴 뒤 좌표(발밑 = 0,0)
    g.addColorStop(0, `rgba(46, 32, 18, ${0.22 * contact * fade})`); g.addColorStop(1, 'rgba(46, 32, 18, 0)');
    ctx.save(); ctx.fillStyle = g; ctx.translate(x, groundY); ctx.scale(1, 0.22);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.fill(); ctx.restore();
  }
  ctx.save();
  // 눕힌 실루엣: 바닥선을 축으로 세로를 squash 배, 위로 갈수록 오른쪽으로 lean 만큼
  ctx.globalAlpha *= alpha * fade;
  ctx.translate(x, groundY);
  ctx.transform(1, 0, -lean, squash, 0, 0);
  const pw = w * sil.pw, ph = h * sil.ph;
  ctx.drawImage(sil.c, -w / 2 - pw, -h * sil.bot - ph, w + pw * 2, h + ph * 2);
  ctx.restore();
}
