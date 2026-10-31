// bottles.js — v20 돌아오는 병: 내가 쓴 글은 바다가 기억했다가 며칠 뒤 호박색 병에 담아 돌려주고,
//               그 사이사이 초록 병에는 키위들이 쓴 응원 쪽지가 들어 있다.
//               v29.25 무리 키위마다 성격(temper.js)이 있어, 섬에 있는 키위 하나가 제 말투로 쓰고 제 이름으로 서명한다.
//
//  · 내 글 = 집중 전에 적은 한 줄 + 모래에 직접 쓴 문장(4글자 넘게). 이 기기에만 저장한다 (localStorage).
//  · 내 글은 쓴 지 MIN_DAYS 가 지나야 돌아온다. 한 번 돌아온 글은 다시 오지 않는다.
//  · 응원 쪽지는 지금 상황(밤 · 아침 · 비 · 눈 · 방금 집중 · 오래 켜 둠)에 맞는 것을 먼저 고르고, 한 바퀴 다 볼 때까지 겹치지 않는다.
//  · 처음 쓰는 사람은 돌아올 글이 아직 없으니 응원 쪽지만 온다 — 내 글이 쌓이면 섞인다 (내 글 1 : 쪽지 2 정도).

export const MIN_DAYS = 2;
// v29.26 병 쪽지 빈도 (설정 › 풍경) — 켜 둔 동안 다음 병까지 기다리는 초 [최소, 최대] · 하루 최대 병 수.
//  예전엔 5~10분 간격에 하루 8병이라 오래 켜 둔 날은 첫 한 시간에 몰려왔다 → 기본(보통)을 한 시간에 한 병쯤으로 넓혔다
export const PACE = {
  fast: { gap: [60, 120], cap: 999, name: '아주 자주', test: true },   // v29.31 테스트 기간 전용 (1~2분) — 설정에 테스트 기간에만 보인다
  often: { gap: [900, 1500], cap: 12, name: '자주' },     // 15~25분
  normal: { gap: [2700, 4500], cap: 8, name: '보통' },    // 45~75분
  rare: { gap: [7200, 10800], cap: 3, name: '가끔' },     // 2~3시간
  off: null,
};
export const paceOf = v => (v in PACE ? v : 'normal');
const KEEP = 300;
export const INBOX = 500;   // v29.22 받은 쪽지함: 열어 본 병 쪽지를 이만큼 남긴다 (오래된 것부터 지움)

// 응원 쪽지 글·고르는 방식은 편지 시스템(letters/index.js)
import { CHEERS, cheerById, pickPool } from './letters/index.js?v=v29.32.0-c49194c';
export { CHEERS };

const day0 = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const daysBetween = (a, b) => Math.round((day0(b) - day0(a)) / 864e5);

export class Bottles {
  constructor(load, save) {
    this.save = save;
    let s = {};
    try { s = JSON.parse(load('bottles') || '{}'); } catch (e) { s = {}; }
    this.mine = Array.isArray(s.mine) ? s.mine : [];       // [{ t 글, at 쓴 시각, src 'focus'|'write', back 돌아온 시각 }]
    this.seen = Array.isArray(s.seen) ? s.seen : [];       // 읽은 응원 쪽지 id (한 바퀴 돌면 비운다)
    this.day = s.day || ''; this.today = s.today || 0;     // 오늘 떠내려온 병 수
    this.sinceMine = s.sinceMine || 0;                     // 마지막 내 글 뒤로 온 쪽지 수
    this.lastTh = s.lastTh || '';
    // v29.30 땅에 놓인 키위 쪽지 (아직 안 연 것, 들어온 순서) — 쓴 키위가 걸어와 놓고 간다. [{ id, kind:'cheer', by, p, at }]
    this.ground = Array.isArray(s.ground) ? s.ground.filter(g => g && g.id) : [];                          // v29.27 마지막 응원 쪽지 주제 (같은 주제가 연달아 오지 않게)
    // v29.22 받은 쪽지함 (새것이 앞) — 처음엔 기억에 남은 만큼(돌아온 내 글 · 이미 본 응원 쪽지) 채운다
    this.inbox = Array.isArray(s.inbox) ? s.inbox : this.backfill();
  }
  store() { this.save('bottles', JSON.stringify({ mine: this.mine, seen: this.seen, day: this.day, today: this.today, sinceMine: this.sinceMine, lastTh: this.lastTh, ground: this.ground.map(({ shown, ...g }) => g), inbox: this.inbox })); }

  // v29.22 예전에 받은 것: 돌아온 내 글(받은 시각 있음) + 이번 바퀴에 본 응원 쪽지(받은 시각 모름 = 0)
  backfill() {
    const out = this.mine.filter(m => m.back).map(m => ({ kind: 'mine', text: m.t, at: m.at, src: m.src, got: m.back }));
    for (const id of this.seen) { const c = cheerById(id); if (c) out.push({ kind: 'cheer', id: c.id, by: c.by || '키위 일동', got: 0, ...(c.p ? { p: c.p } : {}) }); }
    return out.sort((a, b) => b.got - a.got).slice(0, INBOX);
  }
  // 병을 열었다 → 받은 쪽지함 맨 앞에 (내 글 · 응원 쪽지만)
  receive(it, now = Date.now()) {
    if (it?.kind !== 'mine' && it?.kind !== 'cheer') return false;
    // v29.28 응원 쪽지는 번호만 저장하고 글은 볼 때 찾는다(noteText) — 문장을 고치면 지난 쪽지에도, 나중에 다른 언어로도. 목록에 없는 번호만 글을 남긴다
    this.inbox.unshift(it.kind === 'mine' ? { kind: 'mine', text: it.text, at: it.at, src: it.src, got: now } : { kind: 'cheer', id: it.id, ...(cheerById(it.id) ? {} : { text: it.text }), by: it.by || '키위 일동', got: now, ...(it.p ? { p: it.p } : {}) });
    if (this.inbox.length > INBOX) this.inbox.length = INBOX;
    this.store(); return true;
  }

  // 내 글 남기기 (같은 글은 처음 것만)
  keep(text, src, at = Date.now()) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if ([...t.replace(/\s/g, '')].length < 4 || /^[\d\s.:/-]+$/.test(t)) return false;   // 너무 짧거나 숫자뿐(시계)이면 안 남긴다
    if (this.mine.some(m => m.t === t)) return false;
    this.mine.push({ t, at, src });
    if (this.mine.length > KEEP) { const i = this.mine.findIndex(m => m.back); this.mine.splice(i >= 0 ? i : 0, 1); }
    this.store(); return true;
  }
  due(now = Date.now(), minDays = MIN_DAYS) { return this.mine.filter(m => !m.back && now - m.at >= minDays * 864e5); }
  get returned() { return this.mine.filter(m => m.back).length; }

  // 다음 병 고르기 → { kind:'mine', ... } | { kind:'cheer', ... } | null(오늘 몫 다 옴)
  // from: 지금 섬에 있는 무리 키위 [{ name, p }] — 그중 하나가 자기 성격 말투로 쓰고 자기 이름으로 서명한다 (없으면 '키위 일동')
  //  v29.30 mine = 돌아올 내 글을 보내도 되나(물가 자리가 있나) · cheer = 키위 쪽지를 보내도 되나(땅 자리가 있나). 둘 다 안 되면 null (오늘 몫을 쓰지 않는다)
  pick(ctx, now = Date.now(), { minDays = MIN_DAYS, cap = 8, from = [], mine = true, cheer = true } = {}) {
    const d = new Date(now).toDateString();
    if (this.day !== d) { this.day = d; this.today = 0; }
    if (this.today >= cap) return null;
    const due = this.due(now, minDays);
    let out;
    if (!(mine && due.length) && !cheer) return null;
    if (mine && due.length && (!cheer || this.sinceMine >= 2 || Math.random() < 0.35)) {
      const m = due[Math.floor(Math.random() * Math.min(due.length, 4))];   // 오래된 것부터 (앞쪽 몇 개 중 하나)
      m.back = now; this.sinceMine = 0;
      out = { id: 'mine', kind: 'mine', box: 'mine', text: m.t, at: m.at, src: m.src };
    } else {
      const who = from.length ? from[Math.floor(Math.random() * from.length)] : null;
      const { c, by, p } = this.cheer(ctx, who);
      this.sinceMine++;
      out = { id: c.id, kind: 'cheer', box: 'cheer', text: c.t, by, ...(p ? { p } : {}) };
    }
    this.today++; this.store();
    return out;
  }
  // v29.30 땅 쪽지 놓기 · 열기
  drop(it, at = Date.now()) { if (it?.kind !== 'cheer') return null; const g = { id: it.id, kind: 'cheer', by: it.by, ...(it.p ? { p: it.p } : {}), at }; this.ground.push(g); this.store(); return g; }
  pickUp(g) { this.ground = this.ground.filter(x => x !== g); this.store(); }
  // 응원 쪽지: 보낸 키위(who)가 있으면 그 성격 쪽지 중에서 (가끔 이름 박힌 손님 키위 쪽지가 대신 온다).
  //  지금 상황 태그가 맞는 것을 먼저, 아니면 언제나 쪽지. 한 바퀴(그 성격 안에서) 돌 때까지 겹치지 않게
  cheer(ctx = {}, who = null, rnd = Math.random) {
    const guest = !who || rnd() < 0.12;
    const fits = c => !who ? true : guest ? !!c.by : c.p === who.p && !c.by;   // 손님 차례면 이름 박힌 쪽지만
    const r = pickPool(CHEERS.filter(fits), { seen: this.seen, ctx, lastTh: this.lastTh, rnd });
    const c = r.item;
    this.seen = r.seen; this.lastTh = c.th || '';
    if (c.by || !who) return { c, by: c.by || '키위 일동', p: c.p };
    return { c, by: who.name, p: who.p };
  }
}

// v29.28 받은 쪽지 한 장의 글: 응원 쪽지는 번호로 지금 글을 찾고(예전에 저장된 글은 대신), 내 글은 저장된 그대로
export const noteText = n => (n.kind === 'cheer' && cheerById(n.id)?.t) || n.text || '';

// 카드 제목: "10월 4일의 너에게서" (오늘이면 "오늘의 너에게서")
export function mineTitle(at, now = Date.now()) {
  const n = daysBetween(at, now), d = new Date(at);
  return n <= 0 ? '오늘의 너에게서' : n === 1 ? '어제의 너에게서' : `${d.getMonth() + 1}월 ${d.getDate()}일의 너에게서`;
}
export function mineNote(m, now = Date.now()) {
  const n = daysBetween(m.at, now), when = n <= 0 ? '오늘' : `${n}일 전`;
  return `${when} ${m.src === 'focus' ? '집중하며 쓴 한 줄' : '모래에 쓴 글'} — 파도가 가져갔다가 돌려줬어요`;
}
