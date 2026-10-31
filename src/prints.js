// prints.js — v28.13 발자국 도장: 붓으로 그린 "모래에 눌린 자국" 그림으로 발자국을 찍는다
//
//  그림(Higgsfield, 2026-10-22): 평평한 모래에 찍힌 발자국 격자 3장 → tools/prints-relief.mjs 가 모래보다 어두운 만큼만 남긴
//  그늘 가면(검정 + 알파)으로 만든 assets/prints-{kiwi,guests-a,guests-b}-dark.webp (4×3 칸, 칸 160px, 모두 발끝이 위).
//   kiwi: 0~7 키위 발자국 8가지 · 8~11 부리로 콕 찍은 구멍 / guests-a: 손님 10 + 조약돌 / guests-b: 새 손님 10 + 조약돌
//  · 바닥(모래·눈·자갈)과 밤에 맞춰 가면을 그늘 색·턱 색으로 한 번씩 칠해 두고, 발자국마다 돌려서 얹는다.
//    턱(밝은 가장자리)은 같은 가면을 화면 기준 오른쪽 아래로 조금 비켜 밝은 색으로 먼저 깐다 — 걷는 방향과 상관없이 빛이 한쪽에서 온다.
//  · 휴대폰 부담: 발자국 층을 따로 그려 두고, 발자국이 늘거나 진하기가 바뀔 때만(16단계) 다시 그린다.
//  그림을 아직 못 읽었으면 beach.js 의 예전 선 발자국이 그대로 쓰인다.

const CELL = 160, COLS = 4, FIT = 0.92;   // 칸 크기 · 칸 열 수 · 발자국이 칸에서 차지하는 비율(긴 변)
const SHEETS = { kiwi: 'prints-kiwi-dark.webp?v=v29.26.0-99324d6', a: 'prints-guests-a-dark.webp?v=v29.26.0-99324d6', b: 'prints-guests-b-dark.webp?v=v29.26.0-99324d6' };
// 손님 → [격자, 칸, 크기(f 배), 뒤집기]. 크기는 발자국 묶음 하나의 긴 변 · 뒤집기 1 = 그림의 발끝이 아래(물갈퀴 둘)
export const GUEST_STAMP = {
  gull: ['a', 0, 2.0, 1], crab: ['a', 1, 2.2], weka: ['a', 2, 2.2], hedgehog: ['a', 3, 1.7], duck: ['a', 4, 2.0, 1],
  fox: ['a', 5, 1.9], rabbit: ['a', 6, 2.6], deer: ['a', 7, 1.8], sparrow: ['a', 8, 1.9], cat: ['a', 9, 1.8],
  squirrel: ['b', 0, 2.5], whiteeye: ['b', 1, 1.8], frog: ['b', 2, 2.4], egret: ['b', 3, 2.6], fennec: ['b', 4, 1.8],
  hoopoe: ['b', 5, 2.3], gecko: ['b', 6, 2.0], gerbil: ['b', 7, 2.0], camel: ['b', 8, 1.45], raccoon: ['b', 9, 2.2],
};
// 예전에 저장된 손님 발자국(동물 이름 없이 모양만 있는 것) → 닮은 도장
const SHAPE_STAMP = { web: 'gull', crab: 'crab', bird: 'weka', paw: 'fox', hoof: 'deer', hop: 'rabbit', pair: 'sparrow' };
const GROUND = {
  sand: { dark: [86, 52, 24], lit: [255, 238, 205] },
  snow: { dark: [112, 128, 160], lit: [255, 255, 255] },
  gravel: { dark: [72, 66, 58], lit: [255, 250, 240] },
};
const NIGHT = { dark: [44, 56, 92], lit: [150, 172, 215] };   // 밤 그늘은 검정이 아니라 달빛 아래 푸른 그늘

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const hash = (x, y) => ((Math.imul(Math.round(x * 10) | 0, 73856093) ^ Math.imul(Math.round(y * 10) | 0, 19349663)) >>> 0);

export class Stamps {
  constructor() { this.src = {}; this.ready = false; this.tints = new Map(); this.layer = null; this.sig = ''; }
  load(base = 'assets/') {
    let n = 0;
    for (const [k, f] of Object.entries(SHEETS)) {
      const i = new Image();
      i.onload = () => { this.src[k] = i; if (++n === 3) this.ready = true; };
      i.src = base + f;
    }
  }
  // 그늘·턱 색으로 칠한 격자 (바닥 × 밤 8단계 × 그늘/턱 — 해 질 녘에 몇 번만 새로 칠한다)
  tinted(ground, nq, which) {
    const key = `${ground}|${nq}|${which}`;
    let t = this.tints.get(key);
    if (t) return t;
    if (this.tints.size > 24) this.tints.clear();
    const rgb = mix(GROUND[ground][which], NIGHT[which], nq * (which === 'dark' ? 0.75 : 1));
    t = {};
    for (const [k, im] of Object.entries(this.src)) {
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      const c = cv.getContext('2d'); c.drawImage(im, 0, 0);
      c.globalCompositeOperation = 'source-in'; c.fillStyle = `rgb(${rgb})`; c.fillRect(0, 0, cv.width, cv.height);
      t[k] = cv;
    }
    this.tints.set(key, t);
    return t;
  }
  // 발자국 하나의 도장: { s: 격자, cell, size(화면 길이), fx·fy(발자국 자리에서 도장 가운데까지) } — 찍힌 뒤 바뀌지 않아 p.st 에 한 번만
  stampOf(p) {
    if (p.st) return p.st;
    const h = hash(p.x, p.y), c = Math.cos(p.a), s = Math.sin(p.a);
    if (p.kind === 'hole') p.st = { s: 'kiwi', cell: 8 + (h % 4), size: p.f * 0.78 / FIT, fx: 0, fy: 0 };
    else if (p.kind === 'guest') {
      const g = GUEST_STAMP[p.g] || GUEST_STAMP[SHAPE_STAMP[p.shape]] || GUEST_STAMP.weka;
      p.st = { s: g[0], cell: g[1], size: p.f * g[2] / FIT, fx: 0, fy: 0, flip: g[3] ? Math.PI : 0 };
    } else {   // 키위: (x, y) = 발꿈치 → 발 가운데는 조금 앞. 글씨 발자국은 크고 굵게 (v28.13.1 — 얇아서 글씨가 안 읽혔다)
      const k = p.tag != null ? 2.05 : 1.7;
      p.st = { s: 'kiwi', cell: h % 8, size: p.f * k / FIT, fx: c * p.f * 0.5, fy: s * p.f * 0.5, bold: p.tag != null };
    }
    return p.st;
  }

  // beach.drawPrints 대신. lettersOnly(글씨 사진)는 층 없이 바로 그린다
  draw(ctx, beach, { night = 0, lettersOnly = false } = {}) {
    const sn = beach.snow > 0.35 || beach.snowGround, ground = sn ? 'snow' : beach.gravel ? 'gravel' : 'sand';
    const nq = Math.round(Math.min(1, Math.max(0, night)) * 8) / 8;
    if (lettersOnly) { ctx.save(); this.paint(ctx, ctx.getTransform(), beach, ground, nq, true); ctx.restore(); return; }
    const cv = ctx.canvas, T = ctx.getTransform();
    let h = beach.prints.length | 0;
    for (const p of beach.prints) h = (Math.imul(h, 31) + Math.round(p.alpha * 16) + ((p.x * 3) | 0)) | 0;
    const sig = `${h}|${ground}|${nq}|${cv.width}x${cv.height}|${T.a},${T.b},${T.c},${T.d},${T.e},${T.f}`;
    const L = this.layer ||= document.createElement('canvas');
    if (this.sig !== sig) {
      if (L.width !== cv.width || L.height !== cv.height) { L.width = cv.width; L.height = cv.height; }
      const c = L.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, L.width, L.height);
      this.paint(c, T, beach, ground, nq, false);
      this.sig = sig;
    }
    if (!L.width || !L.height) return;   // v28.14 화면 크기가 0인 순간(항해로 넘어갈 때) — 그릴 것이 없다
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(L, 0, 0); ctx.restore();
  }
  // 층을 놓아준다 (창 크기를 바꾸거나 메모리가 모자랄 때)
  release() { if (this.layer) { this.layer.width = 1; this.layer.height = 1; } this.sig = ''; }

  paint(c, T, beach, ground, nq, lettersOnly) {
    const dark = this.tinted(ground, nq, 'dark'), lit = this.tinted(ground, nq, 'lit');
    const litA = 0.75 * (1 - 0.55 * nq), u = beach.u || 1;
    const list = beach.prints;
    for (const pass of [0, 1]) {   // 0 = 턱(밝게, 오른쪽 아래로 비켜) · 1 = 그늘
      const sheet = pass ? dark : lit;
      for (const p of list) {
        if (!(p.alpha > 0.01)) continue;
        const written = p.tag != null && (p.kind === 'deep' || p.kind === 'hole');
        if (lettersOnly && !written) continue;
        const st = this.stampOf(p), im = sheet[st.s]; if (!im) continue;
        const off = pass ? 0 : Math.max(0.6 * u, p.f * 0.09);
        const cx = p.x + st.fx + off, cy = p.y + st.fy + off * 1.2, r = p.a + Math.PI / 2 + (st.flip || 0), co = Math.cos(r), si = Math.sin(r);
        // T × 평행이동(cx, cy) × 회전(r)
        c.setTransform(T.a * co + T.c * si, T.b * co + T.d * si, -T.a * si + T.c * co, -T.b * si + T.d * co, T.a * cx + T.c * cy + T.e, T.b * cx + T.d * cy + T.f);
        c.globalAlpha = Math.min(1, p.alpha) * (pass ? (written ? 1 : 0.85) * (1 - 0.25 * nq) : litA);
        const sx = (st.cell % COLS) * CELL, sy = Math.floor(st.cell / COLS) * CELL, z = st.size;
        c.drawImage(im, sx, sy, CELL, CELL, -z / 2, -z / 2, z, z);
        if (pass && st.bold) { const d = z * 0.025; c.drawImage(im, sx, sy, CELL, CELL, -z / 2 + d, -z / 2, z, z); c.drawImage(im, sx, sy, CELL, CELL, -z / 2 - d, -z / 2 + d, z, z); }   // 글씨 발자국: 두 번 더 비켜 찍어 발가락 선을 굵고 진하게
      }
    }
    c.globalAlpha = 1;
  }
}
