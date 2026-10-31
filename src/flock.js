// flock.js — v19 나의 키위 무리: 이름이 있는 내 키위들
//
//  · 처음 연 날 한 마리, 그 뒤로 들른 날마다 한 마리씩 무리에 들어온다 (최대 MAX).
//  · 키위 수 설정은 그대로다. 화면에 나오는 키위 중 무리 키위가 먼저 나오고, 모자라면 이름 없는 손님 키위가 채운다
//    — 무리가 작아도 글씨는 평소처럼 쓴다. 무리 키위는 처음 나올 때·누를 때 머리 위에 이름이 잠깐 뜬다.
//  · 키위마다 옷을 정할 수 있다: 'auto'(입혀 둔 옷 중 아무거나 — 원래 방식) · 'none'(맨몸) · 옷 id
//  · v29.25 키위마다 성격(p, temper.js) — 들어올 때 무작위, 예전 키위는 id 로 고정. 초록 병 쪽지 말투·서명이 따른다.
//  · 기록은 이 기기에만 저장한다 (localStorage).

import { temperFor, randomTemper } from './temper.js?v=v29.27.0-d80d58b';

export const MAX = 30;
const NAMES = ['콩', '보리', '모래', '솔', '도토리', '밤톨', '조약돌', '이슬', '구름', '호두', '쑥', '깨', '율무', '달래', '노을',
  '물결', '소라', '고둥', '미역', '자갈', '잎새', '이끼', '버섯', '땅콩', '완두', '메밀', '토란', '수수', '새싹', '별', '파래', '해초', '감자', '고사리', '방울'];

export class Flock {
  constructor(load, save, today) {
    this.save = save; this.today = today;
    let s = {};
    try { s = JSON.parse(load() || '{}'); } catch (e) { s = {}; }
    this.members = Array.isArray(s.members) ? s.members.filter(m => m && m.id && m.name) : [];
    for (const m of this.members) if (!m.p) m.p = temperFor(m.id);   // v29.25 성격 없던 키위
    this.last = s.last || '';      // 마지막으로 들른 날
    this.seq = s.seq || this.members.length;
  }
  store() { this.save(JSON.stringify({ members: this.members, last: this.last, seq: this.seq })); }
  get size() { return this.members.length; }
  get(id) { return this.members.find(m => m.id === id) || null; }

  // 오늘 처음 들렀으면 한 마리 들어온다 → 새 키위 (없으면 null)
  visit(day = this.today()) {
    if (this.last === day) return null;
    this.last = day;
    let fresh = null;
    if (this.members.length < MAX) {
      const used = new Set(this.members.map(m => m.name));
      const pool = NAMES.filter(n => !used.has(n));
      const name = pool.length ? pool[Math.floor(Math.random() * pool.length)] : `키위${this.seq + 1}`;
      fresh = { id: 'k' + (++this.seq), name, day, wear: 'auto', p: randomTemper() };
      this.members.push(fresh);
    }
    this.store();
    return fresh;
  }
  rename(id, name) { const m = this.get(id); name = (name || '').trim().slice(0, 8); if (m && name) { m.name = name; this.store(); } }
  setWear(id, wear) { const m = this.get(id); if (m) { m.wear = wear; this.store(); } }
  // 지금 화면에 없는 무리 키위 하나 (먼저 들어온 키위부터 — 오래 함께한 키위가 자주 보이게)
  absent(onScreen) { return this.members.find(m => !onScreen.has(m.id)) || null; }
  // 함께한 날 수 (들어온 날 = 1일째)
  daysWith(m, now = new Date()) {
    const [y, mo, d] = m.day.split('-').map(Number);
    return Math.max(1, Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(y, mo - 1, d)) / 864e5) + 1);
  }
}
