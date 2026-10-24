// seed/focus.js — 집중 기록 달력 (저장 이름: focus)
//
//  보이는 곳: 집중 창 발자국 달력 · 지금까지 걸음 · 끝까지 한 횟수.
//  달력에서 봐야 할 모양을 일부러 다 넣는다:
//   · 오늘 포함 7일 연속 · 2주 비는 구간 · 3번 한 날(180분 하나 포함) · 시작만 하고 못 끝낸 날
//   · 켜 두기 걸음만 있는 날 · 한 달 전·두 달 전 드문드문 · 작년 이맘때 며칠
//  sessions() 는 사진(seed/album.js)도 같이 쓴다 → 사진 날짜와 달력 날짜가 맞는다.

import { at, dayKey, rng, pickOf, DAY } from './util.js?v=v29.4.2';

export const REASONS = ['보고서 마무리', '영어 단어 50개', '포트폴리오 케이스', '책 30쪽', '메일 정리', '그림 연습', '코딩 공부', '방 청소',
  '자기소개서 첫 문단', '운동 계획 짜기', '일기', '피아노 연습', '논문 한 편 읽기', '집중'];
const LETTERS = ['끝나면 산책 가자', '오늘은 여기까지만 해도 충분해', '물 한 잔 마시고 시작', '다 하면 맛있는 거', '', '천천히 해도 돼'];
const LENS = [15, 25, 25, 25, 50, 40];

// 지금 기준 집중 기록 목록 → [{ at, min, done, reason, letter }] (오래된 것부터)
export function sessions(now = Date.now(), variant = 'rich') {
  if (variant === 'none') return [];
  const r = rng(20261018), out = [];
  const add = (ago, h, m, min, done = true) => {
    const t = at(now, ago, h, m);
    if (t > now - min * 60000) return;   // 아직 안 끝났을 시각이면 빼기 (오늘 이른 시간에 열었을 때)
    out.push({ at: t, min, done, reason: pickOf(r, REASONS), letter: pickOf(r, LETTERS) });
  };
  // 최근 7일 연속 (오늘 포함 — 오늘은 지금보다 2시간 전)
  const nowH = new Date(now).getHours();
  if (nowH >= 3) add(0, nowH - 2, 10, 25);
  for (let d = 1; d <= 6; d++) add(d, 9 + (d % 4) * 3, d * 7 % 60, pickOf(r, LENS));
  if (variant === 'week') return out.sort((a, b) => a.at - b.at);
  // 7~13일 전: 이틀에 한 번쯤
  for (let d = 8; d <= 13; d += 2) add(d, 20, 30, pickOf(r, LENS));
  // 14~27일 전: 비워 둔다 (빈 2주)
  // 28일 전: 시작만 하고 못 끝낸 날 (2번 시도, 0번 끝)
  add(28, 10, 0, 25, false); add(28, 15, 0, 25, false);
  // 30~60일 전: 60%
  for (let d = 30; d <= 60; d++) if (r() < 0.6) add(d, 8 + Math.floor(r() * 13), Math.floor(r() * 60), pickOf(r, LENS));
  // 35일 전: 많이 한 날 (3번, 180분 하나)
  add(35, 7, 0, 180); add(35, 14, 0, 50); add(35, 21, 0, 25);
  // 61~100일 전: 드문드문
  for (let d = 61; d <= 100; d += 4 + Math.floor(r() * 5)) add(d, 19, 0, pickOf(r, LENS));
  // 작년 이맘때 (364~372일 전)
  for (const d of [364, 366, 369, 372]) add(d, 22, 0, 25);
  return out.sort((a, b) => a.at - b.at);
}

// 켜 두기 걸음만 있는 날 (집중은 안 함) — 달력에서 옅게 보이는 칸
const IDLE_ONLY = [16, 22, 45];

export function build(now = Date.now(), variant = 'rich') {
  if (variant === 'none') return { focus: null, focusRun: null };
  const log = {};
  let total = 0, done = 0, idle = 0;
  const day = k => (log[k] ??= { s: 0, m: 0, n: 0, d: 0, i: 0 });
  for (const s of sessions(now, variant)) {
    const g = day(dayKey(s.at)), min = s.done ? s.min : Math.round(s.min * 0.4), steps = min * 100;
    g.n++; g.m += min; g.s += steps; total += steps;
    if (s.done) { g.d++; done++; }
  }
  if (variant !== 'week') for (const ago of IDLE_ONLY) { const g = day(dayKey(now - ago * DAY)); g.i += 240; idle += 240; total += 240; }
  const tk = dayKey(now), todaySteps = log[tk] ? log[tk].s + log[tk].i : 0;
  const v = { total, day: tk, todaySteps, done, len: 25, custom: 40, useCustom: false, hush: 'events', idle, log };
  return { focus: JSON.stringify(v), focusRun: null };
}

export default {
  id: 'focus', label: '집중 기록 달력', where: '집중 창 › 발자국 달력 · 걸음 수',
  keys: ['focus', 'focusRun'],
  variants: { rich: '석 달 + 작년 (연속·빈 구간·많이 한 날·못 끝낸 날)', week: '최근 7일만', none: '비우기' },
  build,
};
