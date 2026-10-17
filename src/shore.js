// shore.js — v13 물가 줍기: 켜 두면 물결이 가끔 작은 것들을 물가에 밀어 올린다
//
//  · 2~4분에 하나, 물가 젖은 모래 위에 놓인다 (한 번에 최대 3개). 누르면 주워 도감에 들어간다.
//  · 안 주우면 물이 덮을 때(큰 파도) 쓸려 가고, 4분이 지나도 모래에 묻힌다.
//  · 흔함 · 드묾 · 아주 드묾 · 전설. 아주 드묾 중 몇 개는 그때 그 화면에서만 나온다 (밤 · 비 · 해 질 녘 · 눈밭).
//    조건이 맞을 때는 그 희귀품이 조금 더 자주 나온다 — "밤에 켜 두면 뭐가 나올까"가 켜 둘 이유가 된다.
//  · 그림은 한 장(assets/finds.webp, 4×4 칸)에서 잘라 그린다.
//  · 주운 개수는 이 기기에만 저장한다 (같은 것도 몇 개 주웠는지 센다 — 바꾸기용, items.js 의 craft).
//    바꾸면 개수는 줄지만 도감(본 적 있음 seen)은 그대로다.

export const RARITY = ['흔함', '드묾', '아주 드묾', '전설'];
const WEIGHT = [10, 4, 1.2, 0.3];

export const FINDS = [
  { id: 'scallop', name: '가리비 조개', r: 0, maps: ['beach'] },
  { id: 'snail', name: '소라 껍데기', r: 0, maps: ['beach'] },
  { id: 'pebble', name: '하얀 조약돌', r: 0 },
  { id: 'glassG', name: '초록 바다 유리', r: 0 },
  { id: 'feather', name: '갈매기 깃털', r: 0 },
  { id: 'drift', name: '작은 유목', r: 0 },
  { id: 'glassB', name: '파란 바다 유리', r: 1 },
  { id: 'star', name: '꼬마 불가사리', r: 1, maps: ['beach'] },
  { id: 'heart', name: '하트 돌', r: 1 },
  { id: 'urchin', name: '성게 껍데기', r: 1, maps: ['beach'] },
  { id: 'glow', name: '야광 조개', r: 2, when: 'night', hint: '밤에만 밀려와요' },
  { id: 'rainbow', name: '무지개 유리', r: 2, when: 'rain', hint: '비 오는 날에만 밀려와요' },
  { id: 'ice', name: '얼음 조각', r: 2, maps: ['snow'], hint: '눈밭에서만 밀려와요' },
  { id: 'gold', name: '금빛 깃털', r: 2, when: 'golden', hint: '해 뜰 녘 · 해 질 녘에만 밀려와요' },
  { id: 'nautilus', name: '앵무조개', r: 2, maps: ['beach'], hint: '바닷가에서 아주 가끔' },
  { id: 'pearl', name: '진주', r: 3, hint: '어디서든, 아주아주 가끔' },
].map((f, i) => ({ ...f, cell: i }));
export const FIND = Object.fromEntries(FINDS.map(f => [f.id, f]));

// 지금 나올 수 있는가 (env: { map, night 0~1, weather, hour })
const golden = h => (h >= 5.5 && h < 7.5) || (h >= 16.5 && h < 19);
export function canFind(f, env) {
  if (f.maps && !f.maps.includes(env.map)) return false;
  if (env.only && !env.only.includes(f.id)) return false;   // 장소가 고른 것만 (모래 정원: 조약돌·하트 돌·금빛 깃털·진주)
  if (f.when === 'night' && env.night < 0.5) return false;
  if (f.when === 'rain' && env.weather !== 'rain') return false;
  if (f.when === 'golden' && !golden(env.hour)) return false;
  return true;
}

// 주운 것: n = { id: 지금 가진 개수 }, seen = 한 번이라도 주운 것 (도감)
export class Finds {
  constructor(load, save) {
    this.save = save;
    let s = {};
    try { s = JSON.parse(load() || '{}'); } catch (e) { s = {}; }
    const n = s.n || s;   // v13.0 저장 형식({id: 개수})도 이어받는다
    this.n = {}; this.seen = new Set((s.seen || []).filter(id => FIND[id]));
    for (const f of FINDS) if (n[f.id] > 0) { this.n[f.id] = n[f.id]; this.seen.add(f.id); }
  }
  store() { this.save(JSON.stringify({ n: this.n, seen: [...this.seen] })); }
  add(id) { const fresh = !this.seen.has(id); this.n[id] = (this.n[id] || 0) + 1; this.seen.add(id); this.store(); return fresh; }
  has(id) { return this.seen.has(id); }
  count(id) { return this.n[id] || 0; }
  enough(cost) { return Object.entries(cost).every(([id, c]) => this.count(id) >= c); }
  spend(cost) { if (!this.enough(cost)) return false; for (const [id, c] of Object.entries(cost)) this.n[id] -= c; this.store(); return true; }
  get kinds() { return this.seen.size; }
}

export class Shore {
  constructor() { this.list = []; this.nextAt = 25; this.sheet = null; this.gap = 180; }   // gap = 평균 초 (테스트 탭, v19.2)
  setSheet(img) { this.sheet = img; }
  reset() { this.list = []; }

  pick(env) {
    const pool = FINDS.filter(f => canFind(f, env));
    // 조건이 붙은 희귀품은 조건이 맞을 때 세 배 (그때만 나오니까)
    const w = f => WEIGHT[f.r] * (f.when ? 3 : 1);
    let r = Math.random() * pool.reduce((a, f) => a + w(f), 0);
    for (const f of pool) if ((r -= w(f)) <= 0) return f;
    return pool[0];
  }

  update(dt, beach, env) {
    const { W, u, t } = beach;
    if (t > this.nextAt && this.list.length < 3 && !beach.surging && this.sheet) {
      this.nextAt = t + this.gap * (0.67 + Math.random() * 0.66);
      const f = this.pick(env);
      let x = W * (0.1 + Math.random() * 0.8);
      for (let k = 0; k < 6 && this.list.some(o => Math.abs(o.x - x) < 70 * u); k++) x = W * (0.1 + Math.random() * 0.8);
      // 물가 바로 위 젖은 모래에 — 평소 밀물(화면 높이 2.4%)·잔물결이 닿는 곳보다 조금 위 (큰 파도만 쓸어 간다)
      const y = beach.shoreAt(x) - beach.H * 0.026 - 8 * u * beach.amp - (10 + Math.random() * 24) * u;
      if (y > beach.grass(x) + 40 * u) this.list.push({ f, x, y, a: (Math.random() - 0.5) * 1.2, born: t, gone: 0, ph: Math.random() * 6 });
    }
    for (const d of this.list) {
      if (!d.gone && (d.y > beach.edge(d.x) - 3 * u || t - d.born > 240)) d.gone = t;   // 물이 덮거나 너무 오래되면 사라진다
    }
    this.list = this.list.filter(d => !d.gone || t - d.gone < 0.8);
  }

  draw(ctx, beach, night) {
    if (!this.sheet) return;
    const { u, t } = beach, cw = this.sheet.naturalWidth / 4, ch = this.sheet.naturalHeight / 4;
    for (const d of this.list) {
      const appear = Math.min(1, (t - d.born) / 1.2), fade = d.gone ? Math.max(0, 1 - (t - d.gone) / 0.8) : 1;
      const s = d.f.r >= 2 ? Math.max(50, 72 * u) : Math.max(44, 64 * u);   // 그림 칸 크기 (물건은 칸의 절반 남짓) — 휴대폰에서도 손가락으로 집을 만큼
      ctx.save();
      ctx.globalAlpha = appear * fade;
      ctx.translate(d.x, d.y + (d.gone ? (t - d.gone) * 10 * u : 0));
      // 바닥 그림자
      ctx.fillStyle = 'rgba(60,40,20,0.18)';
      ctx.beginPath(); ctx.ellipse(2 * u, 3 * u, s * 0.24, s * 0.1, 0, 0, 6.29); ctx.fill();
      // 야광 조개는 밤에 빛난다 · 희귀품은 은은한 빛
      if (d.f.id === 'glow' || d.f.r >= 2) {
        const k = (d.f.id === 'glow' ? 0.35 + night * 0.6 : 0.22) * (0.75 + 0.25 * Math.sin(t * 2 + d.ph));
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.7);
        g.addColorStop(0, d.f.id === 'glow' ? `rgba(150,240,255,${k})` : `rgba(255,240,190,${k})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, 6.29); ctx.fill();
      }
      ctx.rotate(d.a);
      const c = d.f.cell;
      ctx.drawImage(this.sheet, (c % 4) * cw, Math.floor(c / 4) * ch, cw, ch, -s / 2, -s / 2, s, s);
      ctx.rotate(-d.a);
      // 반짝 (몇 초에 한 번)
      const gl = Math.max(0, Math.sin(t * 1.3 + d.ph * 3)) ** 12;
      if (gl > 0.02) {
        ctx.globalAlpha = gl * appear * fade; ctx.fillStyle = '#fffbea';
        const r = (1.5 + gl * 2.5) * u, sx = s * 0.1, sy = -s * 0.13;
        ctx.beginPath(); ctx.moveTo(sx, sy - r * 2); ctx.lineTo(sx + r * 0.4, sy); ctx.lineTo(sx, sy + r * 2); ctx.lineTo(sx - r * 0.4, sy); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx - r * 2, sy); ctx.lineTo(sx, sy + r * 0.4); ctx.lineTo(sx + r * 2, sy); ctx.lineTo(sx, sy - r * 0.4); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  hit(x, y, u) { return this.list.find(d => !d.gone && Math.hypot(d.x - x, d.y - y) < Math.max(24, 34 * u)) || null; }
  take(d) { this.list = this.list.filter(o => o !== d); }
}
