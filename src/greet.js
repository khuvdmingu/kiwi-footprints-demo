// greet.js — 이름 인사: 처음 켰을 때 키위들이 "안녕 민구" · "Hello 민구" 처럼 내 이름을 모래에 쓴다
//
//  · 이 파일은 이름 저장과 인사말 고르기만 한다 (화면 없음). 이름 묻는 카드는 memo-ui.js 의 nameCard, 모래에 쓰는 건 main.js.
//  · 이름이 없으면 null → 예전 인사(main.js welcome: 보고 싶었어 · 좋은 아침 · 어서 와)가 그대로 나온다.
//  · 이름은 이 기기에만 (localStorage 'me'). 모래 글씨가 너무 작아지지 않게 8자까지.

export const MAX_NAME = 8;
export function cleanName(s) {
  const t = String(s || '').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
  return [...t].slice(0, MAX_NAME).join('').trim();
}

export class Greeter {
  constructor(load = () => null, save = () => {}) {
    this.save = save;
    let s = {};
    try { s = JSON.parse(load('me') || '{}'); } catch (e) { s = {}; }
    this.name = cleanName(s.name);
    this.asked = !!s.asked;      // 이름을 물어봤나 (건너뛰어도 다시 조르지 않는다)
    this.n = s.n || 0;           // 인사한 횟수 (말을 돌려 가며 고른다)
  }
  store() { this.save('me', JSON.stringify({ name: this.name, asked: this.asked, n: this.n })); }
  setName(s) { this.name = cleanName(s); this.asked = true; this.store(); return this.name; }
  skip() { this.asked = true; this.store(); }
  get needsAsk() { return !this.name && !this.asked; }

  // 새로 열었을 때 첫 글 (이름이 없으면 null)
  //  awayMin: 비운 시간(분) · hour: 지금 시(0~24) · rand: 0~1
  hello({ awayMin = 0, hour = 12, rand = Math.random() } = {}) {
    const n = this.name;
    if (!n) return null;
    let pool;
    if (awayMin >= 2 * 1440) pool = [`보고 싶었어 ${n}`, `오랜만이야 ${n}`];
    else if (hour >= 5 && hour < 11) pool = [`좋은 아침 ${n}`, `안녕 ${n}`, `Good morning ${n}`];
    else if (hour >= 21 || hour < 5) pool = [`안녕 ${n}`, `편히 쉬어 ${n}`, `Hello ${n}`];
    else pool = [`안녕 ${n}`, `Hello ${n}`, `어서 와 ${n}`, `안녕 ${n}`];
    this.n++; this.store();
    return pool[Math.floor(rand * pool.length) % pool.length];
  }
}
