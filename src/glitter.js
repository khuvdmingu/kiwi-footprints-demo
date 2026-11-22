// v30.32.4 윤슬 반짝임 — 노을 금빛 · 밤 달빛 (트인 물가 장소만, maps glitter)
//  사용자 2026-11-22: "레퍼런스 이미지랑 거의 동일하게 만들어줘 · 흩뿌리지 않아도 돼 · 파도와 연동이 되지 않아도 돼 ·
//   더 적절하게 레퍼런스를 구현할 수 있는 방식을 골라" (노을·밤 레퍼런스 그림 2장)
//  레퍼런스에서 읽은 것
//   · 물 가운데 아래쪽에 세로 빛길 하나. 노을은 아래로 갈수록 넓어지는 금빛 길, 밤은 좁고 곧은 은빛 길
//   · 그 안에 또렷한 빛 점이 물결 줄을 따라 촘촘히 켜졌다 꺼지고, 밝은 점은 4갈래 십자 빛 + 둥근 번짐
//   · 밤 달빛 길은 물결 마루마다 끊어진 짧은 가로 빛줄이 쌓여 길 모양을 만든다
//   · 빛길 밖은 아주 드문드문
//  방식: 셰이더로 물 그림 안에 그리면 시간 빛(밤엔 어둡게 덮는 층) 아래라 흐려지고, 칸 배열이 줄무늬로 보였다.
//   → 시간 빛 위 효과 층(fx)에 빛 더하기('lighter')로 미리 구운 별빛 그림을 찍는다(별똥별과 같은 층). 셰이더는 길 둘레 물빛만 맡는다.
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const gauss = () => { let s = 0; for (let i = 0; i < 3; i++) s += Math.random(); return (s - 1.5) / 0.5; };   // 대략 정규분포 (−3~3)

// 별빛 그림 한 장 (가운데 흰 점 + 둥근 번짐 + 가는 십자 빛). 크기 1 = 64px 캔버스
function starSprite(rgb, arms) {
  const n = 64, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), m = n / 2;
  const glow = g.createRadialGradient(m, m, 0, m, m, m * 0.5);
  glow.addColorStop(0, `rgba(${rgb},0.55)`); glow.addColorStop(0.35, `rgba(${rgb},0.18)`); glow.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = glow; g.fillRect(0, 0, n, n);
  if (arms) {
    for (const [w, h] of [[n, 1.6], [1.6, n * 0.8]]) {   // 가로 빛이 조금 더 길다 (물에 비친 빛)
      const lg = w > h ? g.createLinearGradient(0, 0, n, 0) : g.createLinearGradient(0, m - h / 2, 0, m + h / 2);
      lg.addColorStop(0, `rgba(${rgb},0)`); lg.addColorStop(0.5, `rgba(${rgb},0.9)`); lg.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = lg; g.fillRect(m - w / 2, m - h / 2, w, h);
    }
  }
  const core = g.createRadialGradient(m, m, 0, m, m, 4.5);
  core.addColorStop(0, 'rgba(255,255,250,1)'); core.addColorStop(0.5, `rgba(${rgb},0.85)`); core.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = core; g.beginPath(); g.arc(m, m, 4.5, 0, TAU); g.fill();
  return c;
}
// 짧은 가로 빛줄 (가운데 밝고 양 끝이 사라진다)
function streakSprite(rgb) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 8;
  const g = c.getContext('2d');
  const lg = g.createLinearGradient(0, 0, 64, 0);
  lg.addColorStop(0, `rgba(${rgb},0)`); lg.addColorStop(0.3, `rgba(${rgb},0.8)`); lg.addColorStop(0.5, 'rgba(255,255,250,1)'); lg.addColorStop(0.7, `rgba(${rgb},0.8)`); lg.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = lg;
  const vg = g.createLinearGradient(0, 0, 0, 8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.5, 'rgba(0,0,0,1)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillRect(0, 0, 64, 8);
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = vg; g.fillRect(0, 0, 64, 8);
  return c;
}

const SUN = '255,214,150', MOON = '212,228,255';

export class Glitter {
  constructor() { this.bloom = true; this.b1 = null; this.b2 = null; this.list = []; this.on = false; this.t = 0; this.acc = { sun: 0, moon: 0, sunL: 0, moonL: 0 }; this.spr = null; this.path = null; }
  get busy() { return this.on || this.list.length > 0; }
  reset() { this.list.length = 0; this.on = false; }
  sprites() {
    if (!this.spr && typeof document !== 'undefined') this.spr = { sun: [starSprite(SUN, false), starSprite(SUN, true), streakSprite(SUN)], moon: [starSprite(MOON, false), starSprite(MOON, true), streakSprite(MOON)] };
    return this.spr;
  }
  // 빛길: 물가(쉬는 물가선)에서 화면 아래까지의 물 가운데
  pathOf(beach, kind) {
    const W = beach.W, H = beach.H, u = beach.u, cx = W * 0.5, top = beach.shoreAt(cx), wd = Math.max(H - top, 60 * u);
    return kind === 'sun'
      ? { cx, cy: top + wd * 0.56, ry: wd * 0.4, rx: (y) => W * 0.11 + Math.max(y - top, 0) * 0.2, top }   // v30.32.5 조금 더 퍼지게 (사용자)
      : { cx, cy: top + wd * 0.54, ry: wd * 0.38, rx: (y) => W * 0.04 + Math.max(y - top, 0) * 0.04, top };
  }
  // 하나 놓기: 빛길 안(가우스) — 8%만 길 밖으로 조금 넓게. 물결 줄(9u 간격, 천천히 물가로 다가옴)에 맞춰 놓는다
  spot(beach, P, wide) {
    const u = beach.u, k = wide ? 2.4 : 1;
    const y0 = P.cy + gauss() * P.ry * (wide ? 1.3 : 1);
    const x = P.cx + gauss() * P.rx(y0) * k;
    const row = 9 * u, ph = (this.t * 2.2 * u) % row;
    const y = Math.round((y0 - ph) / row) * row + ph + rnd(-0.8, 0.8) * u;
    if (x < 0 || x > beach.W || y > beach.H + 4 * u || y < beach.edge(x) + 16 * u) return null;
    return { x, y };
  }
  update(dt, beach, g) {
    this.t += dt;
    const sun = g ? g.sun || 0 : 0, moon = g ? g.moon || 0 : 0;
    this.on = sun + moon > 0.02;
    for (const s of this.list) s.age += dt;
    this.list = this.list.filter(s => s.age < s.life);
    if (!this.on || !beach.W) return;
    const u = beach.u, area = (beach.W * beach.H) / (1000 * 700);
    // 한 번에 보이는 수 ≈ 비율 × 수명. 노을: 점 위주 · 달: 가로 빛줄이 길의 몸통
    const want = { sun: 820 * sun, moon: 340 * moon, sunL: 80 * sun, moonL: 320 * moon };   // 넓힌 만큼 늘려 길 안 밀도는 그대로
    for (const kind of ['sun', 'moon']) {
      const P = this.pathOf(beach, kind), lk = kind + 'L';
      this.acc[kind] += (want[kind] * area / 0.9) * dt;
      while (this.acc[kind] >= 1) {
        this.acc[kind] -= 1;
        const p = this.spot(beach, P, Math.random() < (kind === 'sun' ? 0.42 : 0.32)); if (!p) continue;
        const inPath = Math.exp(-0.5 * (((p.x - P.cx) / P.rx(p.y)) ** 2 + ((p.y - P.cy) / P.ry) ** 2));
        this.list.push({ kind, line: false, x: p.x, y: p.y, age: 0, life: rnd(0.45, 1.35), s: rnd(0.7, 1.25) * (0.75 + 0.45 * inPath) * u, star: Math.random() < 0.15 + 0.4 * inPath, b: rnd(0.6, 1) * (0.6 + 0.5 * inPath), drift: rnd(-3, 3) * u });
      }
      this.acc[lk] += (want[lk] * area / 1) * dt;
      while (this.acc[lk] >= 1) {
        this.acc[lk] -= 1;
        const p = this.spot(beach, P, false); if (!p) continue;
        this.list.push({ kind, line: true, x: p.x, y: p.y, age: 0, life: rnd(0.6, 1.5), len: rnd(5, kind === 'moon' ? 20 : 12) * u, b: rnd(0.45, 0.9), drift: rnd(-2, 2) * u });
      }
    }
    if (this.list.length > 900) this.list.splice(0, this.list.length - 900);
    this.g = { sun, moon };
  }
  draw(ctx, beach) {
    if (!this.list.length && !this.on) return;
    const spr = this.sprites(); if (!spr) return;
    const u = beach.u, g = this.g || { sun: 0, moon: 0 };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // 길 둘레 은은한 빛 번짐
    for (const [kind, a, rgb] of [['sun', g.sun * 0.16, SUN], ['moon', g.moon * 0.14, MOON]]) {
      if (a < 0.01) continue;
      const P = this.pathOf(beach, kind), rx = P.rx(P.cy) * 1.6, ry = P.ry * 1.3;
      ctx.save(); ctx.translate(P.cx, P.cy); ctx.scale(rx / ry, 1);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
      gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, ry, 0, TAU); ctx.fill(); ctx.restore();
    }
    if (this.bloom) this.drawBloom(ctx, beach, spr);   // v30.32.6 빛 번짐: 반짝임 아래에 넓게 번진 빛을 먼저 깐다
    ctx.globalCompositeOperation = 'lighter';
    this.drawSpots(ctx, beach, spr, 0);
    ctx.restore();
  }
  // 반짝임 찍기. min = 이보다 어두운 것은 건너뜀 (빛 번짐 층은 밝은 것만)
  drawSpots(ctx, beach, spr, min) {
    const u = beach.u;
    for (const s of this.list) {
      const k = s.age / s.life, env = Math.pow(Math.sin(Math.PI * k), 1.6) * s.b;   // 켜졌다 꺼진다
      if (env < 0.02 || env < min) continue;
      if (beach.edge(s.x) > s.y - 12 * u) continue;   // 물이 밀려와 덮은 모래 위엔 안 그린다
      const set = spr[s.kind], x = s.x + s.drift * k;
      ctx.globalAlpha = Math.min(1, env);
      if (s.line) { const h = 3.2 * u; ctx.drawImage(set[2], x - s.len / 2, s.y - h / 2, s.len, h); }
      else { const d = (s.star ? 32 : 21) * s.s * (0.75 + 0.25 * env); ctx.drawImage(set[s.star ? 1 : 0], x - d / 2, s.y - d / 2, d, d); }   // 그림 64px 중 흰 점은 9px — 점 지름 약 2.5u·번짐 8u·십자 빛 30u
    }
  }
  // v30.32.6 빛 번짐 (블룸) — 밝은 반짝임만 작은 캔버스 두 장(1/5, 1/14 크기)에 찍고, 부드럽게 키워 'lighter'로 덮는다.
  //  작게 그렸다 키우면 저절로 흐려진다(ctx.filter blur 는 Safari 에서 안 되는 판이 있어 쓰지 않는다). 반짝임이 모일수록 둘레가 함께 밝아져
  //  레퍼런스처럼 빛길이 한 덩어리로 빛난다. 물 아래쪽(물가선부터 화면 끝)만 쓴다
  drawBloom(ctx, beach, spr) {
    const W = beach.W, H = beach.H, top = Math.max(0, Math.min(beach.shoreAt(W * 0.5), H) - 20 * beach.u), bh = H - top;
    if (bh < 20) return;
    const mk = (f) => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.ceil(W / f)); c.height = Math.max(2, Math.ceil(bh / f)); return c; };
    for (const [key, f] of [['b1', 5], ['b2', 14]]) {
      const c = this[key];
      if (!c || c.width !== Math.max(2, Math.ceil(W / f)) || c.height !== Math.max(2, Math.ceil(bh / f))) this[key] = mk(f);
    }
    const b1 = this.b1, b2 = this.b2, g1 = b1.getContext('2d'), g2 = b2.getContext('2d');
    g1.setTransform(1, 0, 0, 1, 0, 0); g1.clearRect(0, 0, b1.width, b1.height);
    g1.setTransform(1 / 5, 0, 0, 1 / 5, 0, -top / 5); g1.globalCompositeOperation = 'lighter';
    this.drawSpots(g1, beach, spr, 0.35);
    g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, b2.width, b2.height);
    g2.imageSmoothingEnabled = true; g2.drawImage(b1, 0, 0, b2.width, b2.height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
    try { ctx.imageSmoothingQuality = 'high'; } catch (e) { /* 지원 안 하면 기본 */ }
    ctx.globalAlpha = 0.75; ctx.drawImage(b1, 0, top, W, bh);
    ctx.globalAlpha = 0.9; ctx.drawImage(b2, 0, top, W, bh);
    ctx.restore();
  }
}
