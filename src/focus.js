// focus.js — v12 집중 모드: 이 화면을 떠나지 않고 끝까지 켜 두면 물 위로 선물이 온다
//
//  · 웹 페이지는 다른 앱(릴스 등)을 쓰는지 알 수 없다. 대신 "이 화면을 떠났는지"는 안다
//    (다른 앱으로 가거나 화면을 끄면 페이지가 숨김 상태가 된다 — Page Visibility).
//    그래서 규칙은 "이 화면을 끝까지 떠나지 않기". 떠나도 GRACE 초 안에 돌아오면 이어서 간다.
//  · 집중 중에는 화면이 저절로 꺼지지 않게 한다 (Wake Lock — 지원하는 브라우저만).
//  · 집중한 시간은 키위 걸음으로 센다: 1분 = 100보 (디자인 값). 그만두거나 실패해도 걸은 만큼은 쌓인다.
//  · v13: 집중이 아니어도 화면을 켜 두면 1분 = 10보가 같은 걸음에 쌓인다 (idle). 걸음은 장소 열쇠로도 쓴다.
//  · 시간은 rAF(beach.t)가 아니라 실제 시계(Date.now)로 잰다 — 화면이 숨으면 rAF 는 멈추니까.
//  · 기록은 이 기기에만 저장한다 (localStorage). 진행 중인 집중도 저장해 두어서,
//    탭을 닫거나 새로 고친 뒤 열면 "떠났다"로 처리하고 마지막으로 확인한 때까지 걸음을 쳐 준다.
//  · v19: 날마다 기록(log)을 남긴다 — 집중 걸음·분·횟수·끝까지 한 횟수·켜 두기 걸음. 집중 창의 발자국 달력이 읽는다.

export const STEPS_PER_MIN = 100;
export const IDLE_STEPS_PER_MIN = 10;   // v13 켜 두기만 해도 (집중의 1/10)
export const GRACE = 10;   // 초: 이 안에 돌아오면 이어서
export const LENGTHS = [15, 25, 50];
export const CUSTOM = [5, 180];   // v20.1 직접 정하기: 5분 단위 (5분 아래는 선물 상자를 연달아 받는 걸 막으려고 둔 하한)
export const HUSH = ['events', 'all', 'off'];   // v20.1 집중 중 소리: 배경 소리만(기본) · 조용히 · 그대로
const KEEP_DAYS = 800;   // 날마다 기록은 2년 남짓만 (그보다 오래된 날은 지운다)

export const today = (now = Date.now()) => { const d = new Date(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

export class Focus {
  constructor(load, save) {
    this.load = load; this.save = save;
    let s = {};
    try { s = JSON.parse(load('focus') || '{}'); } catch (e) { s = {}; }
    this.total = s.total || 0;            // 지금까지 걸음
    this.day = s.day || today();
    this.todaySteps = s.day === today() ? s.todaySteps || 0 : 0;
    this.done = s.done || 0;              // 끝까지 한 횟수
    this.idle = s.idle || 0;              // 그중 켜 두기로 쌓은 걸음
    this.idleMs = 0;
    this.log = s.log && typeof s.log === 'object' ? s.log : {};   // v19 { 'Y-M-D': { s 집중 걸음, m 분, n 횟수, d 끝까지, i 켜 두기 걸음 } }
    this.custom = Number.isFinite(s.custom) ? Math.min(CUSTOM[1], Math.max(CUSTOM[0], s.custom)) : 40;   // 직접 정한 길이 (마지막 값)
    this.useCustom = !!s.useCustom;      // 「직접」을 골랐나 (직접 값이 15·25·50 과 같아도 직접으로 남게)
    this.len = this.useCustom ? this.custom : LENGTHS.includes(s.len) ? s.len : 25;   // 마지막에 고른 길이
    this.hush = HUSH.includes(s.hush) ? s.hush : 'events';
    this.run = null;                      // 진행 중: { start, dur(ms), letter, away, beat }
    try { this.stale = JSON.parse(load('focusRun') || 'null'); } catch (e) { this.stale = null; }
  }
  store() {
    this.save('focus', JSON.stringify({ total: this.total, day: this.day, todaySteps: this.todaySteps, done: this.done, len: this.len, custom: this.custom, useCustom: this.useCustom, hush: this.hush, idle: this.idle, log: this.log }));
  }
  // 그날 기록 (없으면 만든다). 오래된 날은 여기서 정리한다
  dayLog(key = today()) {
    if (!this.log[key]) {
      this.log[key] = { s: 0, m: 0, n: 0, d: 0, i: 0 };
      const keys = Object.keys(this.log);
      if (keys.length > KEEP_DAYS) { const cut = Date.now() - KEEP_DAYS * 864e5; for (const k of keys) { const [y, mo, d] = k.split('-').map(Number); if (new Date(y, mo - 1, d).getTime() < cut) delete this.log[k]; } }
    }
    return this.log[key];
  }
  storeRun() { this.save('focusRun', this.run ? JSON.stringify(this.run) : ''); }

  get active() { return !!this.run; }
  stepsOf(ms) { return Math.floor(ms / 60000 * STEPS_PER_MIN); }
  elapsed(now = Date.now()) { return this.run ? Math.min(this.run.dur, now - this.run.start) : 0; }
  left(now = Date.now()) { return this.run ? Math.max(0, this.run.dur - (now - this.run.start)) : 0; }
  steps(now = Date.now()) { return this.stepsOf(this.elapsed(now)); }

  start(min, letter = '', now = Date.now()) {
    this.len = min; this.store();
    this.run = { start: now, dur: min * 60000, letter: letter.trim().slice(0, 80), away: null, beat: now };
    this.storeRun();
  }
  // 걸은 만큼 쌓고 진행을 끝낸다 → { steps, min, letter }
  finish(until) {
    const r = this.run; if (!r) return null;
    const ms = Math.max(0, Math.min(r.dur, until - r.start)), steps = this.stepsOf(ms);
    if (this.day !== today()) { this.day = today(); this.todaySteps = 0; }
    this.total += steps; this.todaySteps += steps;
    // 기록은 시작한 날에 남긴다 (자정을 넘겨 끝나도)
    const L = this.dayLog(today(r.start)); L.s += steps; L.m += Math.round(ms / 60000); L.n++;
    this.run = null; this.storeRun(); this.store();
    return { steps, min: Math.round(ms / 60000), full: ms >= r.dur, letter: r.letter, start: r.start };
  }
  // 켜 두기: 화면이 보이는 동안의 시간(ms)을 받아 6초마다 1보 (10보/분). 걸음이 늘면 true
  ambient(ms) {
    if (this.run || !(ms > 0)) return false;
    this.idleMs += Math.min(ms, 2000);   // 한 번에 2초 넘게 건너뛰면(화면이 숨었다 돌아옴) 그만큼은 치지 않는다
    const per = 60000 / IDLE_STEPS_PER_MIN;
    if (this.idleMs < per) return false;
    const n = Math.floor(this.idleMs / per); this.idleMs -= n * per;
    if (this.day !== today()) { this.day = today(); this.todaySteps = 0; }
    this.total += n; this.todaySteps += n; this.idle += n; this.dayLog().i += n; this.store();
    return true;
  }
  complete(now = Date.now()) { const out = this.finish(now); if (out) { this.done++; this.dayLog(today(out.start)).d++; this.store(); } return out; }

  // 매 프레임: 끝났는가? (가끔 마지막 확인 시각을 저장 — 탭이 닫혀도 여기까지는 걸은 것으로)
  tick(now = Date.now()) {
    if (!this.run) return null;
    if (now - this.run.beat > 5000) { this.run.beat = now; this.storeRun(); }
    return this.left(now) <= 0 ? 'done' : null;
  }
  // 화면이 숨을 때 · 돌아올 때
  hidden(now = Date.now()) { if (this.run && this.run.away == null) { this.run.away = now; this.run.beat = now; this.storeRun(); } }
  visible(now = Date.now()) {
    const r = this.run; if (!r || r.away == null) return null;
    const gone = (now - r.away) / 1000, away = r.away;
    r.away = null; this.storeRun();
    if (r.start + r.dur <= away) return { due: true };              // 떠나기 전에 이미 끝나 있었다 → 끝까지 한 것
    if (gone > GRACE) return { failed: true, ...this.finish(away) };   // 떠난 때까지만 걸은 것으로
    return null;
  }
  // 새로 열었는데 지난 집중이 남아 있으면: 끝났어야 할 시각이 지났어도 "떠났다"로 (마지막 확인 시각까지만 친다)
  resolveStale() {
    const r = this.stale; this.stale = null;
    if (!r || !r.start) return null;
    this.run = r;
    return { failed: true, ...this.finish(Math.min(r.beat || r.start, r.away ?? Infinity)) };
  }
}

// 화면 켜 두기: 지원하면 잡고, 화면이 숨었다 돌아오면 다시 잡는다 (숨으면 브라우저가 자동으로 놓는다)
export class Awake {
  constructor() { this.lock = null; this.want = false; }
  async on() {
    this.want = true;
    try { if ('wakeLock' in navigator && !this.lock) { this.lock = await navigator.wakeLock.request('screen'); this.lock.addEventListener('release', () => { this.lock = null; }); } } catch (e) { this.lock = null; }
  }
  off() { this.want = false; try { this.lock && this.lock.release(); } catch (e) { /* 이미 놓음 */ } this.lock = null; }
  get supported() { return 'wakeLock' in navigator; }
}
