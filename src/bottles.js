// bottles.js — v20 돌아오는 병: 내가 쓴 글은 바다가 기억했다가 며칠 뒤 호박색 병에 담아 돌려주고,
//               그 사이사이 초록 병에는 키위들이 쓴 응원 쪽지가 들어 있다.
//               v29.25 무리 키위마다 성격(temper.js)이 있어, 섬에 있는 키위 하나가 제 말투로 쓰고 제 이름으로 서명한다.
//
//  · 내 글 = 집중 전에 적은 한 줄 + 모래에 직접 쓴 문장(4글자 넘게). 이 기기에만 저장한다 (localStorage).
//  · 내 글은 쓴 지 MIN_DAYS 가 지나야 돌아온다. 한 번 돌아온 글은 다시 오지 않는다.
//  · 응원 쪽지는 지금 상황(밤 · 아침 · 비 · 눈 · 방금 집중 · 오래 켜 둠)에 맞는 것을 먼저 고르고, 한 바퀴 다 볼 때까지 겹치지 않는다.
//  · 처음 쓰는 사람은 돌아올 글이 아직 없으니 응원 쪽지만 온다 — 내 글이 쌓이면 섞인다 (내 글 1 : 쪽지 2 정도).

export const MIN_DAYS = 2;
const KEEP = 300;
export const INBOX = 500;   // v29.22 받은 쪽지함: 열어 본 병 쪽지를 이만큼 남긴다 (오래된 것부터 지움)

// 응원 쪽지 목록은 cheers.js (v29.25 성격별 — temper.js)
import { CHEERS } from './cheers.js?v=v29.25.1-44a30f8';
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
    // v29.22 받은 쪽지함 (새것이 앞) — 처음엔 기억에 남은 만큼(돌아온 내 글 · 이미 본 응원 쪽지) 채운다
    this.inbox = Array.isArray(s.inbox) ? s.inbox : this.backfill();
  }
  store() { this.save('bottles', JSON.stringify({ mine: this.mine, seen: this.seen, day: this.day, today: this.today, sinceMine: this.sinceMine, inbox: this.inbox })); }

  // v29.22 예전에 받은 것: 돌아온 내 글(받은 시각 있음) + 이번 바퀴에 본 응원 쪽지(받은 시각 모름 = 0)
  backfill() {
    const out = this.mine.filter(m => m.back).map(m => ({ kind: 'mine', text: m.t, at: m.at, src: m.src, got: m.back }));
    for (const id of this.seen) { const c = CHEERS.find(x => x.id === id); if (c) out.push({ kind: 'cheer', id: c.id, text: c.t, by: c.by || '키위 일동', got: 0, ...(c.p ? { p: c.p } : {}) }); }
    return out.sort((a, b) => b.got - a.got).slice(0, INBOX);
  }
  // 병을 열었다 → 받은 쪽지함 맨 앞에 (내 글 · 응원 쪽지만)
  receive(it, now = Date.now()) {
    if (it?.kind !== 'mine' && it?.kind !== 'cheer') return false;
    this.inbox.unshift(it.kind === 'mine' ? { kind: 'mine', text: it.text, at: it.at, src: it.src, got: now } : { kind: 'cheer', id: it.id, text: it.text, by: it.by || '키위 일동', got: now, ...(it.p ? { p: it.p } : {}) });
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
  pick(ctx, now = Date.now(), { minDays = MIN_DAYS, cap = 8, from = [], mine = true } = {}) {
    const d = new Date(now).toDateString();
    if (this.day !== d) { this.day = d; this.today = 0; }
    if (this.today >= cap) return null;
    const due = this.due(now, minDays);
    let out;
    if (mine && due.length && (this.sinceMine >= 2 || Math.random() < 0.35)) {
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
  // 응원 쪽지: 보낸 키위(who)가 있으면 그 성격 쪽지 중에서 (가끔 이름 박힌 손님 키위 쪽지가 대신 온다).
  //  지금 상황 태그가 맞는 것을 먼저, 아니면 언제나 쪽지. 한 바퀴(그 성격 안에서) 돌 때까지 겹치지 않게
  cheer(ctx = {}, who = null, rnd = Math.random) {
    const guest = !who || rnd() < 0.12;
    const fits = c => !who ? true : guest ? !!c.by : c.p === who.p && !c.by;   // 손님 차례면 이름 박힌 쪽지만
    let pool = CHEERS.filter(c => fits(c) && !this.seen.includes(c.id));
    if (!pool.length) {   // 이 키위가 쓸 쪽지를 다 봤다 → 그 몫만 다시 섞는다
      const mine = new Set(CHEERS.filter(fits).map(c => c.id));
      this.seen = this.seen.filter(id => !mine.has(id));
      pool = CHEERS.filter(fits);
    }
    const tags = Object.keys(ctx).filter(k => ctx[k]);
    const fit = pool.filter(c => c.tag && tags.includes(c.tag));
    const any = pool.filter(c => !c.tag);
    const from = fit.length && rnd() < 0.6 ? fit : any.length ? any : pool;
    const c = from[Math.floor(rnd() * from.length)];
    this.seen.push(c.id);
    if (c.by || !who) return { c, by: c.by || '키위 일동', p: c.p };
    return { c, by: who.name, p: who.p };
  }
}

// 카드 제목: "10월 4일의 너에게서" (오늘이면 "오늘의 너에게서")
export function mineTitle(at, now = Date.now()) {
  const n = daysBetween(at, now), d = new Date(at);
  return n <= 0 ? '오늘의 너에게서' : n === 1 ? '어제의 너에게서' : `${d.getMonth() + 1}월 ${d.getDate()}일의 너에게서`;
}
export function mineNote(m, now = Date.now()) {
  const n = daysBetween(m.at, now), when = n <= 0 ? '오늘' : `${n}일 전`;
  return `${when} ${m.src === 'focus' ? '집중하며 쓴 한 줄' : '모래에 쓴 글'} — 파도가 가져갔다가 돌려줬어요`;
}
