// voyage.js — 항해 모드 규칙: 집중을 "섬에서 보기" 대신 "다른 섬으로 항해하기"로
//
//  두 모드 (사용자 결정 2026-10-18 — 둘 다 집중이고, 섬에서 보느냐 배를 타고 가느냐의 차이):
//   · island(섬에서 보기) = 지금의 focus.js 그대로. 화면을 지킨다(10초 넘게 떠나면 그만), 걸음으로 센다, 선물 상자.
//   · voyage(항해하기)    = 이 파일. 잠가도·다른 앱으로 가도 계속 간다(실제 시계로 잰다), 걸음 대신 바닷길(해리)로 센다,
//                           가는 길에 고래·별똥별 같은 일이 생기고, 도착하면 키위의 일기 한 장.
//  집중 시간 = 항해 시간 (같은 구조). 25분을 고르면 25분 걸려 도착한다.
//  중단한 항해는 이어 간다 — 「멈추기」를 누르면 배는 바다 위에 멈춰 있고, 다음 항해 때 남은 바닷길부터 간다.
//
//  사건은 출발할 때 미리 정해 둔다(출발 시각이 씨앗). 그래서
//   · 화면을 보고 있으면 그 순간을 직접 보고(seen), 껐다 오면 같은 사건을 일기로 나중에 만난다(seen=false, 장면은 다시 그린다).
//   · 같은 사건이 두 번 생기거나, 도착 기록이 두 번 남지 않는다.
//  이 파일은 "언제 어디까지 갔고 무슨 일이 있었나"만 정한다. 그리기·소리·사진은 main.js 가 결과를 받아 한다.
//  기록은 이 기기에만 (localStorage 'voyage' · 'voyageRun').

import { STOCK_PLACES } from './maps-stock.js?v=v29.14.0';

export const MODES = ['island', 'voyage'];
export const MODE_NAME = { island: { ko: '섬에서 보기', en: 'Stay on the island' }, voyage: { ko: '항해하기', en: 'Set sail' } };
export const NM_PER_MIN = 0.1;      // 1분 = 0.1해리 (6노트, 작은 돛배) — 25분 = 2.5해리
export const MIN_SAIL = 1;          // 분: 직접 입력의 하한과 같게 (집중과 항해 공통)
export const MAX_LOG = 400;         // 일기는 이만큼만 남긴다 (오래된 것부터 지움)
const RECENT = 2;                   // 최근 일기 두 장과 같은 사건은 피한다
const SEEN_WINDOW = 15000;          // ms: 사건 시각에서 이 안에 화면이 보이고 있었으면 직접 본 것

// 장소 (maps.js 의 id) — 항로는 아무 두 곳이나 이을 수 있다
export const PLACES = {
  beach: { ko: '바닷가', en: 'the beach' }, nz: { ko: '뉴질랜드 숲', en: 'the fern forest' }, snow: { ko: '눈밭', en: 'the snowfield' },
  fall: { ko: '가을 호숫가', en: 'the autumn lake' }, zen: { ko: '모래 정원', en: 'the sand garden' },
  cherry: { ko: '벚꽃 강변', en: 'the cherry riverbank' }, oasis: { ko: '사막 오아시스', en: 'the desert oasis' },
};
// v28.22 재고 새 장소
for (const p of STOCK_PLACES) PLACES[p.id] = { ko: p.ko, en: p.en };
export const routeId = (from, to) => `${from}>${to}`;

// 가는 길에 생기는 일 6가지. when(ctx) 가 거짓이면 그 시각엔 안 생긴다 (ctx = { hour, weather })
const night = h => h >= 19.5 || h < 5.5, dusk = h => h >= 17 && h < 21;
export const SIGHTS = {
  whale: { ko: '고래', en: 'a whale', w: 3, when: () => true },
  meteor: { ko: '별똥별', en: 'a shooting star', w: 3, when: c => night(c.hour) && !['rain', 'drizzle', 'fog', 'snow', 'cloudy'].includes(c.weather) },
  lighthouse: { ko: '먼 등대', en: 'a far lighthouse', w: 2, when: c => dusk(c.hour) || night(c.hour) },
  seabird: { ko: '물 위에서 쉬는 새', en: 'a resting seabird', w: 2, when: c => !night(c.hour) },
  doze: { ko: '뱃머리에서 조는 키위', en: 'a kiwi dozing at the bow', w: 2, when: () => true },
  leaf: { ko: '잎으로 비 가리기', en: 'sharing a leaf umbrella', w: 4, when: c => ['rain', 'drizzle'].includes(c.weather) },
};
export const SIGHT_IDS = Object.keys(SIGHTS);

// 키위의 일기 문장 — 사용자가 적은 한 줄(reason)과는 따로 둔다. missed = 그 순간 화면을 안 보고 있었을 때
const DIARY = {
  whale: [
    { ko: '커다란 친구를 만났다. 인사하려다 배가 조금 기울었다.', en: 'We met a very big friend. The boat tipped a little when we waved.' },
    { ko: '바다가 갑자기 숨을 쉬었다. 고래였다.', en: 'The sea took a deep breath. It was a whale.' },
  ],
  meteor: [
    { ko: '별 하나가 떨어졌다. 다들 소원을 빌다가 노 젓는 걸 잊었다.', en: 'A star fell. Everyone made a wish and forgot to row.' },
    { ko: '하늘에 금이 하나 그어졌다가 사라졌다.', en: 'A line was drawn across the sky, then it was gone.' },
  ],
  lighthouse: [
    { ko: '멀리서 등대가 깜빡였다. 우리 쪽을 보고 있는 것 같았다.', en: 'A lighthouse blinked far away. It seemed to be looking our way.' },
    { ko: '등대 불빛을 세다가 몇까지 셌는지 잊어버렸다.', en: 'I counted the lighthouse blinks and lost count.' },
  ],
  seabird: [
    { ko: '물 위에서 쉬던 새가 우리를 보고 한 번 끄덕였다.', en: 'A seabird resting on the water nodded at us once.' },
    { ko: '새 한 마리가 잠깐 돛 위에 앉았다 갔다. 무게가 거의 없었다.', en: 'A bird sat on the sail for a moment. It weighed almost nothing.' },
  ],
  doze: [
    { ko: '누군가 뱃머리에서 졸았다. 아무도 깨우지 않았다.', en: 'Someone dozed off at the bow. Nobody woke them.' },
    { ko: '물결이 너무 일정해서 한 명이 먼저 잠들었다.', en: 'The waves were so steady that one of us fell asleep first.' },
  ],
  leaf: [
    { ko: '비가 와서 잎 하나를 같이 썼다. 어깨가 조금 젖었다.', en: 'It rained, so we shared one leaf. Our shoulders got a little wet.' },
    { ko: '빗방울 소리를 들으며 잎 아래 붙어 앉았다.', en: 'We huddled under a leaf and listened to the rain.' },
  ],
  quiet: [
    { ko: '오늘은 아무 일도 없었다. 물소리가 좋아서 다들 말이 없었다.', en: 'Nothing happened today. The water sounded nice, so nobody talked.' },
    { ko: '바람만 조금 불었다. 그래도 꽤 멀리 왔다.', en: 'Only a little wind. Still, we came a long way.' },
  ],
};
const MISSED = { ko: '네가 일하는 동안이라 사진은 내가 찍어 뒀어.', en: 'You were busy, so I took the picture for you.' };
const ARRIVE = { ko: p => `${p}에 닿았다.`, en: p => `We reached ${p}.` };

// 씨앗 난수 (mulberry32) — 출발 시각이 같으면 사건도 같다
export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const hourOf = ts => { const d = new Date(ts); return d.getHours() + d.getMinutes() / 60; };
export const nm = ms => Math.round(ms / 60000 * NM_PER_MIN * 10) / 10;   // 지나온 바닷길(해리), 소수 한 자리
export function distanceText(ms, lang = 'ko') { const v = nm(ms).toFixed(1); return lang === 'en' ? `${v} nm` : `${v}해리`; }

// 사건 자리: 짧으면 1번, 15분부터 2번, 40분부터 3번. 처음·끝 15%는 비운다(출발·도착 장면이 있으니까)
export function slotsFor(min, rand) {
  const n = min >= 40 ? 3 : min >= 15 ? 2 : 1, out = [];
  for (let i = 0; i < n; i++) { const a = 0.15 + 0.7 * i / n, b = 0.15 + 0.7 * (i + 1) / n; out.push(a + (b - a) * (0.2 + 0.6 * rand())); }
  return out.map(f => Math.round(f * min * 60000));   // 항해 시작부터 몇 ms 째(바다 위에서 보낸 시간 기준)
}

export class Voyage {
  constructor(load, save) {
    this.load = load; this.save = save;
    let s = {};
    try { s = JSON.parse(load('voyage') || '{}'); } catch (e) { s = {}; }
    this.mode = MODES.includes(s.mode) ? s.mode : 'island';
    this.at = PLACES[s.at] ? s.at : null;          // 마지막으로 닿은 섬 (null = 아직 항해 안 함)
    this.paused = s.paused || null;                // 멈춘 항해 (바다 위)
    this.log = Array.isArray(s.log) ? s.log : [];  // 키위의 일기 (도착한 항해만)
    this.sailedMs = s.sailedMs || 0;               // 지금까지 바다 위에서 보낸 시간
    try { this.run = JSON.parse(load('voyageRun') || 'null'); } catch (e) { this.run = null; }
  }
  store() { this.save('voyage', JSON.stringify({ mode: this.mode, at: this.at, paused: this.paused, log: this.log, sailedMs: this.sailedMs })); }
  storeRun() { this.save('voyageRun', this.run ? JSON.stringify(this.run) : ''); }
  setMode(m) { if (MODES.includes(m)) { this.mode = m; this.store(); } }

  get active() { return !!this.run; }
  // 바다 위 (항해 중이거나 멈춰 있음) — 이때 main.js 는 섬 대신 바다 장면을 그린다
  get atSea() { return !!(this.run || this.paused); }
  get trip() { return this.run || this.paused; }

  // 새 항해. 멈춘 항해가 있으면 먼저 resume() 또는 abandon() — 실수로 덮지 않게 false
  start({ from, to, min, reason = '', crew = [], weather = 'clear' }, now = Date.now()) {
    if (this.run || this.paused || !PLACES[to] || from === to) return false;
    const dur = Math.max(MIN_SAIL, Math.round(min)) * 60000, rand = seeded(now);
    this.run = {
      id: 'v-' + now, from: PLACES[from] ? from : null, to, dur, sailed: 0, legStart: now, legs: 1,
      reason: String(reason).trim().slice(0, 80), crew: crew.slice(0, 8), weather, started: now,
      slots: slotsFor(dur / 60000, rand).map(at => ({ at, r: rand(), t: rand(), kind: null, ts: null, seen: false })),
      avoid: this.log.slice(-RECENT).map(e => e.kind),
    };
    this.storeRun();
    return true;
  }
  // 멈춘 항해를 남은 바닷길부터 다시
  resume(now = Date.now(), weather) {
    if (this.run || !this.paused) return false;
    this.run = { ...this.paused, legStart: now, legs: this.paused.legs + 1, weather: weather || this.paused.weather };
    this.paused = null; this.store(); this.storeRun();
    return true;
  }
  // 멈춘 항해를 접는다 (배는 떠나온 섬으로 돌아간 것으로 — 기록은 남기지 않는다)
  abandon() { const p = this.paused; this.paused = null; this.store(); return p; }

  sailed(now = Date.now()) { const r = this.run || this.paused; if (!r) return 0; return Math.min(r.dur, r.sailed + (this.run ? Math.max(0, now - r.legStart) : 0)); }
  left(now = Date.now()) { const r = this.trip; return r ? r.dur - this.sailed(now) : 0; }
  frac(now = Date.now()) { const r = this.trip; return r ? this.sailed(now) / r.dur : 0; }
  // 바다 위 시간 at(ms) 에 닿는 실제 시각 (지금 다리 안에서만 뜻이 있다)
  tsAt(at) { const r = this.run; return r.legStart + (at - r.sailed); }

  // 사건 자리에 닿으면 그때 무엇이 보이는지 정한다 (그 시각의 시간대·날씨로). 같은 항해에서 같은 것은 두 번 안 나온다
  resolve(slot, ctx) {
    const r = this.trip, used = new Set([...r.slots.map(s => s.kind).filter(Boolean), ...r.avoid]);
    const ok = SIGHT_IDS.filter(k => !used.has(k) && SIGHTS[k].when(ctx));
    if (!ok.length) { slot.kind = 'quiet'; return; }
    const sum = ok.reduce((s, k) => s + SIGHTS[k].w, 0); let x = slot.r * sum;
    slot.kind = ok.find(k => (x -= SIGHTS[k].w) < 0) || ok[ok.length - 1];
  }
  // 매 프레임(또는 몇 초마다) · 화면이 다시 보일 때 · 다시 열었을 때 부른다
  //   ctx = { visible, weather } — visible 이면 지금 지나간 사건은 직접 본 것
  //   → { sights: [새로 지나간 사건], arrived }
  tick(now = Date.now(), ctx = {}) {
    const r = this.run; if (!r) return { sights: [], arrived: false };
    const s = this.sailed(now), out = [];
    for (const slot of r.slots) {
      if (slot.kind || slot.at > s) continue;
      slot.ts = this.tsAt(slot.at);
      this.resolve(slot, { hour: hourOf(slot.ts), weather: ctx.visible && ctx.weather ? ctx.weather : r.weather });
      slot.seen = !!ctx.visible && now - slot.ts <= SEEN_WINDOW;
      out.push({ kind: slot.kind, ts: slot.ts, seen: slot.seen, frac: slot.at / r.dur });
    }
    if (out.length) this.storeRun();
    return { sights: out, arrived: s >= r.dur };
  }
  // 「멈추기」: 여기까지 간 것을 남기고 배는 바다 위에 선다 → 다음 항해 때 이어서
  stop(now = Date.now(), ctx = { visible: true }) {
    if (!this.run) return null;
    this.tick(now, ctx);   // 멈추기 전에 지나간 사건은 정해 둔다 (멈추기는 화면에서 누르니 기본은 보고 있던 것)
    const r = this.run; r.sailed = this.sailed(now); delete r.legStart;
    this.sailedMs += r.sailed - (r.counted || 0); r.counted = r.sailed;
    this.paused = r; this.run = null; this.store(); this.storeRun();
    return { sailed: r.sailed, left: r.dur - r.sailed };
  }
  // 도착 → 키위의 일기 한 장 (한 번만). main.js 는 이걸 받아 해변에 글을 쓰고 사진을 찍는다
  //   extra(trip, sailedMs) → { lines: [{ko, en}], ...필드 } (v28 해도·낚싯줄 — 일기에 덧붙일 줄과 기록에 같이 남길 것)
  complete(now = Date.now(), ctx = {}, extra = null) {
    const r = this.run; if (!r) return null;
    this.tick(now, ctx);
    if (this.sailed(now) < r.dur) return null;
    this.sailedMs += r.dur - (r.counted || 0);
    const add = (extra && extra(r, this.sailedMs)) || {}, more = Array.isArray(add.lines) ? add.lines : [];
    delete add.lines;
    // 일기 사진은 한 장: 화면을 안 보던 사이에 지나간 일이 먼저(그건 키위만 봤으니까), 없으면 함께 본 일, 없으면 조용한 날
    const real = r.slots.filter(s => s.kind && s.kind !== 'quiet');
    const pick = real.find(s => !s.seen) || real[0] || { kind: 'quiet', t: r.slots[0]?.t ?? 0, seen: true };
    const kind = pick.kind, lines = DIARY[kind], line = lines[Math.floor((pick.t || 0) * lines.length) % lines.length];
    const place = PLACES[r.to], missed = kind !== 'quiet' && !pick.seen;
    const entry = {
      id: r.id, at: now, from: r.from, to: r.to, min: Math.round(r.dur / 60000), legs: r.legs, reason: r.reason, crew: r.crew,
      kind, seen: !missed, ts: pick.ts || now,
      sights: r.slots.filter(s => s.kind).map(s => ({ kind: s.kind, ts: s.ts, seen: s.seen })),
      text: {
        ko: [line.ko, missed ? MISSED.ko : '', ...more.map(l => l.ko), ARRIVE.ko(place.ko)].filter(Boolean).join(' '),
        en: [line.en, missed ? MISSED.en : '', ...more.map(l => l.en), ARRIVE.en(place.en)].filter(Boolean).join(' '),
      },
      ...add,
    };
    if (!this.log.some(e => e.id === entry.id)) { this.log.push(entry); if (this.log.length > MAX_LOG) this.log.splice(0, this.log.length - MAX_LOG); }
    this.at = r.to; this.run = null; this.store(); this.storeRun();
    return entry;
  }
  // 앱을 다시 열었을 때: 항해는 잠가도·닫아도 계속 간 것으로 본다 (섬에서 보기와 다른 점)
  //   → 'arrived'(그사이 도착 — complete() 로 일기를 받는다) · 'sailing'(아직 가는 중) · null
  reopen(now = Date.now()) {
    if (!this.run) return null;
    return this.sailed(now) >= this.run.dur ? 'arrived' : 'sailing';
  }
  // 일기 (새 것부터)
  diary() { return this.log.slice().reverse(); }
}
