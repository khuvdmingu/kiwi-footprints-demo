// temper.js — v29.25 키위 성격: 무리 키위마다 하나. 초록 병 응원 쪽지의 말투와 서명이 성격을 따른다.
//
//  · 4가지는 원래 응원 쪽지의 결(다정 · 차분 · 피식)에서 나왔다 — 피식을 「실수 보고」와 「아는 척」 둘로 나눴다.
//  · 새 키위는 들어올 때 무작위로 정해진다. 성격이 없던 예전 키위는 id 로 정해져서 켤 때마다 바뀌지 않는다.
//  · 앱 안에서는 MBTI 라는 이름을 쓰지 않는다 (남의 상표) — 키위 세계 이름만.

export const TEMPERS = [
  { id: 'todak', name: '토닥이', hint: '곁에서 다독이는 반말' },
  { id: 'jan', name: '차분이', hint: '바다에 빗대는 차분한 존댓말' },
  { id: 'hd', name: '허당', hint: '오늘 저지른 실수를 보고하는 반말' },
  { id: 'bs', name: '박사', hint: '아는 척하다 위로로 끝나는 반말' },
];
export const TEMPER = Object.fromEntries(TEMPERS.map(t => [t.id, t]));
export const temperName = id => TEMPER[id]?.name || '';

// 성격이 없던 키위: id 글자로 고정 (같은 키위는 늘 같은 성격)
export function temperFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return TEMPERS[h % TEMPERS.length].id;
}
export const randomTemper = (rnd = Math.random) => TEMPERS[Math.floor(rnd() * TEMPERS.length)].id;
