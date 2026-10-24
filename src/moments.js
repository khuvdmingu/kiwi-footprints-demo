// moments.js — v28.21 드문 순간: 섬을 오래 보고 있으면 아주 가끔, 그때 그 자리에 맞는 짧은 장면이 한 번 펼쳐진다
//
//  영상(Higgsfield Kling, 재고 stock/moments 2026-10-22 → 960px 무음): assets/moment-<id>.mp4 + 첫 장면 moment-<id>.webp
//  보여 주기는 부두 장면과 같은 덮개(cutscene.js) — 누르면 건너뛴다. 본 순간은 바구니 › 도감에 모이고 다시 볼 수 있다.
//  빈도(정한 값): 섬을 8분 넘게 보고 있을 때부터, 45초마다 한 번 8% — 한 번 나오면 25분 쉼, 같은 장면은 하루 한 번
//  ctx = { hour, weather, map, night, kiwis(마리), rainbow(무지개 떠 있음), season(행사 id|null) }
//  ?moment=<id> 면 3초 뒤 그 장면을 바로 (미리 보기)

const water = m => m !== 'zen';
export const MOMENTS = [
  { id: 'turtle', ko: '아기 바다거북이 바다로', sub: '새벽 물가에서 알이 깨졌어요', when: c => c.hour >= 5 && c.hour < 9 && (c.map === 'beach' || c.map === 'oasis') && c.weather !== 'rain' },
  { id: 'whale', ko: '무지개 아래 고래', sub: '비 갠 바다에서 뛰어올랐어요', when: c => c.rainbow && water(c.map) },
  { id: 'meteors', ko: '유성우', sub: '맑은 밤하늘에서 별이 쏟아졌어요', when: c => (c.hour >= 21 || c.hour < 4) && c.weather === 'clear' },
  { id: 'fireflies', ko: '반딧불이 무리', sub: '해 질 녘 숲에서 불빛이 피어났어요', when: c => c.hour >= 18.5 && c.hour < 23 && ['nz', 'fall', 'cherry'].includes(c.map) && !['rain', 'snow', 'drizzle'].includes(c.weather) },
  { id: 'castle', ko: '다 같이 모래성', sub: '키위들이 모래성을 쌓았어요', when: c => c.hour >= 10 && c.hour < 17 && (c.map === 'beach' || c.map === 'oasis') && c.kiwis >= 4 && c.weather !== 'rain', maxMs: 8000 },   // 끝 2초는 키위가 다른 새로 변해 앞 8초만
  { id: 'dance', ko: '노을 춤', sub: '노을빛 아래 둥글게 돌았어요', when: c => c.hour >= 16.5 && c.hour < 19.5 && c.kiwis >= 5 && c.weather !== 'rain' },
  { id: 'fireworks', ko: '불꽃놀이', sub: '밤바다 위로 불꽃이 피었어요', when: c => (c.hour >= 20 || c.hour < 1) && c.weather !== 'rain' && (!!c.season || c.roll < 0.3) },
  { id: 'train', ko: '기차놀이', sub: '여덟 마리가 줄지어 돌았어요', when: c => c.hour >= 9 && c.hour < 18 && c.kiwis >= 6 },
];
export const MOMENT = Object.fromEntries(MOMENTS.map(m => [m.id, m]));

const WARMUP = 8 * 60, EVERY = 45, CHANCE = 0.08, REST = 25 * 60;
const today = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export class Moments {
  constructor(load, save, rand = Math.random) {
    this.save = save; this.rand = rand;
    let s = {}; try { s = JSON.parse(load() || '{}'); } catch (e) { s = {}; }
    this.seen = {}; for (const [k, v] of Object.entries(s.seen || {})) if (MOMENT[k] && v > 0) this.seen[k] = v;
    this.day = s.day || {};   // { id: '2026-10-24' } 마지막으로 본 날
    this.watch = 0; this.next = WARMUP; this.restUntil = 0;
  }
  store() { this.save(JSON.stringify({ seen: this.seen, day: this.day })); }
  get kinds() { return Object.keys(this.seen).length; }
  // 지금 펼칠 수 있는 장면들
  eligible(ctx, now = new Date()) {
    const c = { ...ctx, roll: this.rand() };
    return MOMENTS.filter(m => this.day[m.id] !== today(now) && m.when(c));
  }
  // 섬을 보고 있는 동안 매 프레임 (busy = 창이 열렸거나 항해·집중 사진 등으로 지금은 안 됨) → 펼칠 장면 | null
  tick(dt, ctx, busy, now = new Date()) {
    this.watch += dt;
    if (busy || this.watch < this.next || this.watch < this.restUntil) return null;
    this.next = this.watch + EVERY;
    if (this.rand() >= CHANCE) return null;
    const list = this.eligible(ctx, now); if (!list.length) return null;
    return list[Math.floor(this.rand() * list.length)];
  }
  // 실제로 보여 줬을 때
  mark(id, now = new Date()) {
    this.seen[id] = (this.seen[id] || 0) + 1; this.day[id] = today(now);
    this.restUntil = this.watch + REST; this.store();
  }
}
