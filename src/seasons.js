// seasons.js — v28.15 계절 행사 (크리스마스 · 설날 · 봄 벚꽃 축제 · 여름 축제)
//
//  할로윈(halloween.js)과 같은 틀: 기간이면 숲 가장자리에 소품을 늘어놓고(지은 것과 같은 줄, 키위가 앞을 지나간다),
//  등불·별처럼 빛나는 것은 밤에 따뜻하게 빛나고, 몇몇 행사는 항해 중 바다 위로 하나씩 떠내려온다.
//  그림(Higgsfield, 2026-10-22 재고 stock/events → tools/cut-cells.mjs 로 칸별): assets/xm-* · sl-* · fs-*
//  머리 장식(items.js · headwear.js): 루돌프 뿔 · 귀덮개 니트 모자 · 호랑가시 핀 · 별 머리띠 · 복건 · 수박 핀
//  기간이 아니어도 주소 ?season=xmas|seollal|spring|summer 로 미리 볼 수 있다 (?season=0 이면 기간에도 끔).
//  기간은 정한 값(사실 아님): 크리스마스 12-15~12-26 · 설날 = 음력 1월 1일 앞 3일 ~ 뒤 4일 · 봄 04-01~04-14 · 여름 07-25~08-15

// 설날: 브라우저 음력 달력(Intl 'chinese')으로 그해 음력 1월 1일을 찾는다 — 없으면(옛 브라우저) 설날만 꺼진다
const LUNAR = (() => { try { return new Intl.DateTimeFormat('ko-KR-u-ca-chinese', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' }); } catch (e) { return null; } })();
export function isLunarNewYear(d) {
  if (!LUNAR) return false;
  const p = LUNAR.formatToParts(d), m = p.find(x => x.type === 'month')?.value, day = p.find(x => x.type === 'day')?.value;
  return m === '1' && day === '1';
}
function nearSeollal(now) {
  for (let off = -4; off <= 3; off++) { const d = new Date(now); d.setDate(d.getDate() + off); if (isLunarNewYear(d)) return true; }
  return false;
}

// 소품 자리: x = 화면 폭 비율, h = 짧은 변 비율, glow = 밤에 빛나는 높이(그림 높이 비율), warm = 빛 색
export const SEASONS = {
  xmas: {
    on: (m, d) => m === 11 && d >= 15 && d <= 26,
    props: [
      { k: 'xm-tree', x: 0.13, h: 0.11, glow: 0.55, warm: 'gold' },
      { k: 'xm-gifts', x: 0.27, h: 0.06 },
      { k: 'xm-snowman', x: 0.47, h: 0.08 },
      { k: 'xm-sled', x: 0.66, h: 0.055 },
      { k: 'xm-wreath', x: 0.86, h: 0.06 },
    ],
    sea: { k: 'xm-star', h: 0.06, night: true },   // 밤바다에 별 등이 떠내려온다
  },
  seollal: {
    on: (m, d, now) => nearSeollal(now),
    props: [
      { k: 'sl-lantern', x: 0.13, h: 0.1, glow: 0.45, warm: 'red' },
      { k: 'sl-pouch', x: 0.27, h: 0.06 },
      { k: 'sl-tteokguk', x: 0.47, h: 0.05 },
      { k: 'sl-yut', x: 0.66, h: 0.05 },
      { k: 'sl-top', x: 0.8, h: 0.045 },
      { k: 'sl-kite', x: 0.9, h: 0.075 },
    ],
    sea: { k: 'sl-lantern', h: 0.07, night: true, warm: 'red' },
  },
  spring: {
    on: (m, d) => m === 3 && d <= 14,
    props: [
      { k: 'fs-lanterns', x: 0.16, h: 0.06, glow: 0.4, warm: 'pink' },
      { k: 'fs-picnic', x: 0.42, h: 0.055 },
      { k: 'fs-lanterns', x: 0.8, h: 0.06, glow: 0.4, warm: 'pink' },
    ],
  },
  summer: {
    on: (m, d) => (m === 6 && d >= 25) || (m === 7 && d <= 15),
    props: [
      { k: 'fs-parasol', x: 0.14, h: 0.1 },
      { k: 'fs-watermelon', x: 0.3, h: 0.05 },
      { k: 'fs-tube', x: 0.5, h: 0.05 },
      { k: 'fs-sparkler', x: 0.7, h: 0.07, glow: 0.35, warm: 'gold', nightOnly: true },   // 밤에만 꺼내 든다
      { k: 'fs-picnic', x: 0.86, h: 0.05 },
    ],
    sea: { k: 'fs-tube', h: 0.055 },   // 낮바다에 튜브가 떠내려온다
  },
};

export function pickSeason(now = new Date(), q = null) {
  if (q?.has('season')) { const id = q.get('season'); return SEASONS[id] ? id : null; }
  const m = now.getMonth(), d = now.getDate();
  for (const [id, s] of Object.entries(SEASONS)) if (s.on(m, d, now)) return id;
  return null;
}

const WARM = { gold: [255, 190, 90], red: [255, 110, 70], pink: [255, 150, 190] };

export class Season {
  constructor(id) { this.id = id; this.s = id ? SEASONS[id] : null; this.im = {}; this.t = 0; }
  get on() { return !!this.s; }
  load(base = 'assets/') {
    if (!this.s) return;
    const ks = new Set([...this.s.props.map(p => p.k), ...(this.s.sea ? [this.s.sea.k] : [])]);
    for (const k of ks) { const i = new Image(); i.onload = () => { this.im[k] = i; }; i.src = base + k + '.webp?v=v29.7.1'; }
  }
  update(dt) { if (this.s) this.t += dt; }

  // 숲 가장자리 (할로윈 drawIsland 와 같은 자리 계산)
  drawIsland(ctx, beach, night) {
    if (!this.s) return;
    const { W, H } = beach, S = Math.min(W, H), t = this.t;
    for (const p of this.s.props) {
      if (p.nightOnly && night < 0.3) continue;
      const im = this.im[p.k]; if (!im) continue;
      const x = W * p.x, y = beach.grass(x) + S * 0.05, h = S * p.h, w = h * im.width / im.height;
      if (!isFinite(x) || !isFinite(y)) continue;
      ctx.fillStyle = 'rgba(40,30,20,0.16)'; ctx.beginPath(); ctx.ellipse(x, y, w * 0.42, h * 0.08, 0, 0, 6.29); ctx.fill();
      ctx.drawImage(im, x - w / 2, y - h, w, h);
      if (p.glow && night > 0.15) glow(ctx, x, y - h * p.glow, h * 1.3, night, t + p.x * 7, p.warm);
    }
  }

  // 항해: 바다 위로 하나씩 떠내려온다 (voyage-scene 이 물·섬 다음, 배 앞에 부른다)
  drawSea(c, W, H, u, t, night, speed) {
    const sea = this.s?.sea; if (!sea) return;
    const im = this.im[sea.k]; if (!im) return;
    const vis = sea.night ? night : 1 - night; if (vis < 0.2) return;
    for (let i = 0; i < 3; i++) {
      const cyc = H + u * 0.6, y = ((t * speed * u + i * cyc / 3 + i * 131) % cyc) - u * 0.3;
      const x = W * (i % 2 ? 0.22 + 0.07 * Math.sin(i * 2.7) : 0.78 - 0.07 * Math.cos(i * 1.9)) + Math.sin(t * 0.6 + i) * u * 0.01;
      const h = u * sea.h, w = h * im.width / im.height, bob = Math.sin(t * 1.4 + i * 1.7) * u * 0.004;
      if (sea.night) glow(c, x, y + bob, h * 2, night, t + i, sea.warm || 'gold');
      c.save(); c.globalAlpha = Math.min(1, vis * 1.5); c.drawImage(im, x - w / 2, y - h / 2 + bob, w, h); c.restore();
    }
  }
}

function glow(ctx, x, y, r, n, t, warm = 'gold') {
  const [R, G, B] = WARM[warm] || WARM.gold, fl = 0.88 + 0.12 * Math.sin(t * 6.3) * Math.sin(t * 2.1);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * fl);
  g.addColorStop(0, `rgba(${R},${G},${B},${0.7 * n})`); g.addColorStop(0.45, `rgba(${R},${G},${B},${0.26 * n})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * fl, 0, 6.29); ctx.fill();
  ctx.restore();
}
