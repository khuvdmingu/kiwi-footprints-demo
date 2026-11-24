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
// v29.34 성격별 몸짓 — 쉬는 동안 고르는 동작(acts.js pickIdleAct)의 비중을 성격마다 곱한다 (없는 동작은 1). 새 그림 없음.
//  토닥이 = 곁을 살피고 다정하게 · 차분이 = 하늘 보기·앉아 쉬기·꾸벅 · 허당 = 재채기·오뚝이·뒤돌기·숨기 · 박사 = 킁킁·땅 파기·갸웃
export const TEMPER_ACTS = {
  todak: { lookaround: 1.6, nibble: 1.3, tilt: 1.3, wag: 1.3, blink: 1.2, wiggle: 1.2 },
  jan: { rest: 1.8, lookup: 1.8, blink: 1.6, nod: 1.5, yawn: 1.3, wiggle: 0.5, wag: 0.6, wobble: 0.7 },
  hd: { sneeze: 3, wobble: 1.8, back: 1.6, hide: 1.6, shake: 1.5, tilt: 1.3, wiggle: 1.3, rest: 0.7 },
  bs: { sniff: 1.9, probe: 1.9, tilt: 1.6, lookaround: 1.4, nibble: 1.3, wiggle: 0.6, wag: 0.7 },
};
export const randomTemper = (rnd = Math.random) => TEMPERS[Math.floor(rnd() * TEMPERS.length)].id;
