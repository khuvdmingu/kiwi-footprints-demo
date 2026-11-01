// note-archive.js — v29.37 받은 쪽지 보관함: 「최근」 몇 장 + 「달력」(받은 날에 점·장수, 누르면 그날 쪽지만)
//  쪽지가 몇백 장 쌓이면 한 줄 목록은 끝없이 내려야 했다(v29.32 기간 고르기·30개씩 더 보기).
//  화면은 main.js 가 그리고, 여기엔 날짜로 나누는 계산만 둔다 — 시험에서 그대로 부른다.

export const RECENT = 12;   // 「최근」에 보이는 장 수 — 나머지는 달력에서

// 받은 시각 → 'YYYY-M-D' (그 기기 시간대). 받은 시각이 없는 옛 쪽지는 'old'
export function dayKeyOf(got) {
  if (!got) return 'old';
  const d = new Date(got);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// 그 달(y, mo 0~11)에 받은 날 → 장 수
export function monthCounts(notes, y, mo) {
  const out = new Map();
  for (const n of notes) {
    if (!n.got) continue;
    const d = new Date(n.got);
    if (d.getFullYear() === y && d.getMonth() === mo) out.set(d.getDate(), (out.get(d.getDate()) || 0) + 1);
  }
  return out;
}

// 그날 쪽지만 (새것부터 — inbox 는 이미 새것부터 쌓인다)
export const notesOn = (notes, key) => notes.filter(n => dayKeyOf(n.got) === key);

// 달력이 갈 수 있는 범위: 가장 오래된 받은 달 ~ 이번 달. 지금 달 기준 몇 달 전까지인가(0 이하)
export function oldestOffset(notes, now = new Date()) {
  let min = 0;
  for (const n of notes) {
    if (!n.got) continue;
    const d = new Date(n.got), off = (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
    if (off < min) min = off;
  }
  return min;
}

// 달력을 처음 열 때: 가장 최근에 받은 날의 달·날 (없으면 이번 달·고른 날 없음)
export function latestPick(notes, now = new Date()) {
  const n = notes.find(x => x.got);
  if (!n) return { off: 0, key: null };
  const d = new Date(n.got);
  return { off: (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth(), key: dayKeyOf(n.got) };
}
