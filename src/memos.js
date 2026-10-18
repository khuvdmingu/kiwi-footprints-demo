// memos.js — 시간 메모: "15:00 물 마시기"를 적어 두면 그 시간에 키위들이 모래에 써 준다 (알림음·팝업 대신)
//
//  · 이 파일은 기록·시간 계산만 한다 (화면 없음). 그리는 건 memo-ui.js, 모래에 쓰는 건 main.js 가 due() 결과를 받아 한다.
//  · 한 번(once) · 매일(daily). 앱이 켜져 있고 화면이 보일 때만 쓸 수 있다 — 그 시간에 꺼져 있었으면 "놓친 메모"로 모아 두고
//    다시 열 때 보여 준다(missed). 놓친 메모는 모래에 늦게 쓰지 않는다 (지나간 시간을 지금 쓰면 헷갈린다).
//  · 기록은 이 기기에만 (localStorage 'memos').
//  ⚠ 나중에: 푸시 알림으로도 오게 (앱이 꺼져 있어도) — 계획은 docs/MEMOS.md 「다음 단계: 푸시 알림」.

export const MAX_TEXT = 20;      // 모래에 한 번에 쓰기 좋은 길이 (발자국 글씨가 너무 작아지지 않게)
export const MAX_MEMOS = 12;
export const WINDOW_MIN = 3;     // 정한 시각부터 이만큼(분) 안에 화면이 보이면 그때 쓴다 — 넘으면 놓친 것

const pad = n => String(n).padStart(2, '0');
export const dayKey = (ms = Date.now()) => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
// "15:00" · "9:5" · "0905" → { h, m } | null
export function parseTime(s) {
  const t = String(s || '').trim().match(/^(\d{1,2})\s*[:시.]?\s*(\d{1,2})?\s*분?$/);
  if (!t) return null;
  const h = +t[1], m = t[2] == null ? 0 : +t[2];
  if (t[2] == null && t[1].length > 2) return null;
  return h >= 0 && h < 24 && m >= 0 && m < 60 ? { h, m } : null;
}
export const fmtTime = ({ h, m }) => `${pad(h)}:${pad(m)}`;
// 모래에 쓸 때: "15:00" 은 시계와 헷갈려서 "오후 3시" 처럼 글자로 (점·쌍점은 발자국 한 개라 멀리선 안 보인다)
export function sandTime({ h, m }) {
  const ap = h < 12 ? '오전' : '오후', hh = h % 12 === 0 ? 12 : h % 12;
  return `${ap} ${hh}시${m ? ` ${m}분` : ''}`;
}
export function cleanText(s) {
  return [...String(s || '').replace(/\s+/g, ' ').trim()].slice(0, MAX_TEXT).join('');
}

export class Memos {
  constructor(load = () => null, save = () => {}) {
    this.save = save;
    let s = {};
    try { s = JSON.parse(load('memos') || '{}'); } catch (e) { s = {}; }
    this.list = (Array.isArray(s.list) ? s.list : []).filter(x => x && parseTime(x.time) && cleanText(x.text));
    this.seq = s.seq || this.list.length;
  }
  store() { this.save('memos', JSON.stringify({ list: this.list, seq: this.seq })); }

  // → 만든 메모 | { error }
  add({ time, text, repeat = 'once' }, now = Date.now()) {
    const t = parseTime(time), tx = cleanText(text);
    if (!t) return { error: '시간을 15:00 처럼 적어 주세요' };
    if (!tx) return { error: '쓸 말을 적어 주세요' };
    if (this.list.length >= MAX_MEMOS) return { error: `메모는 ${MAX_MEMOS}개까지예요` };
    // 한 번짜리인데 오늘 그 시각이 이미 지났으면 내일
    const d = new Date(now), at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.h, t.m).getTime();
    const day = repeat === 'daily' ? null : dayKey(at <= now ? at + 864e5 : at);
    const memo = { id: 'm' + (++this.seq), time: fmtTime(t), text: tx, repeat: repeat === 'daily' ? 'daily' : 'once', day, on: true, fired: '', made: now };
    this.list.push(memo); this.sort(); this.store();
    return memo;
  }
  remove(id) { this.list = this.list.filter(m => m.id !== id); this.store(); }
  toggle(id, on) { const m = this.list.find(x => x.id === id); if (m) { m.on = on ?? !m.on; this.store(); } }
  sort() { this.list.sort((a, b) => a.time.localeCompare(b.time)); }

  // 오늘 이 메모가 울릴 시각(ms) — 오늘 울릴 일이 없으면 null
  atToday(m, now = Date.now()) {
    if (!m.on) return null;
    if (m.repeat === 'once' && m.day !== dayKey(now)) return null;
    const t = parseTime(m.time), d = new Date(now);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.h, t.m).getTime();
  }
  // 매 프레임(또는 몇 초마다): 지금 써야 할 메모들 → 쓴 것으로 표시하고 돌려준다. 화면이 숨어 있으면 부르지 말 것
  due(now = Date.now()) {
    const out = [], key = dayKey(now);
    this.tidy(key);
    for (const m of this.list) {
      const at = this.atToday(m, now);
      if (at == null || m.fired === key || now < at) continue;
      if (now - at <= WINDOW_MIN * 60000) { m.fired = key; out.push(m); }
    }
    if (out.length) { this.finishOnce(key); this.store(); }
    return out;
  }
  // 다시 열었을 때: 오늘 시간이 지났는데 쓰지 못한 메모 → 놓친 것으로 표시하고 돌려준다
  missed(now = Date.now()) {
    const out = [], key = dayKey(now);
    this.tidy(key);
    for (const m of this.list) {
      const at = this.atToday(m, now);
      if (at == null || m.fired === key || now - at <= WINDOW_MIN * 60000) continue;
      if (now > at) { m.fired = key; m.missed = key; out.push(m); }
    }
    if (out.length) { this.finishOnce(key); this.store(); }
    return out;
  }
  // 한 번짜리는 울렸으면(또는 놓쳤으면) 꺼 둔다 — 목록엔 하루 남겨 "다 했음"으로 보이고, 다음 날 정리
  finishOnce(key) { for (const m of this.list) if (m.repeat === 'once' && m.fired === key) m.on = false; }
  // 지난날 끝난 한 번짜리는 목록에서 정리
  tidy(key) {
    const n = this.list.length;
    this.list = this.list.filter(m => !(m.repeat === 'once' && !m.on && m.fired && m.fired !== key));
    if (this.list.length !== n) this.store();
  }
  // 다음에 울릴 메모 { memo, at } | null (오늘 남은 것 → 없으면 내일 첫 매일 메모)
  next(now = Date.now()) {
    let best = null;
    for (const m of this.list) {
      let at = this.atToday(m, now);
      if (at != null && (at <= now || m.fired === dayKey(now))) at = null;
      if (at == null && m.on && (m.repeat === 'daily' || m.day === dayKey(now + 864e5))) {
        const t = parseTime(m.time), d = new Date(now + 864e5);
        at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.h, t.m).getTime();
      }
      if (at != null && (!best || at < best.at)) best = { memo: m, at };
    }
    return best;
  }
  // 모래에 쓸 글: 시간 한 줄 + 메모 한 줄 ('/' 는 줄바꿈)
  sandText(m) { return `${sandTime(parseTime(m.time))}/${m.text}`; }
}
