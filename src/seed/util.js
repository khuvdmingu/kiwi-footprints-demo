// seed/util.js — 테스트용 더미 데이터 공용 도구
//
//  · 모든 더미는 "지금"을 기준으로 며칠 전·몇 시에 만든다 → 언제 열어도 달력·사진 날짜가 오늘에 맞춰 붙는다.
//  · 난수는 씨앗이 고정된 것만 쓴다 → 같은 날 다시 채우면 같은 모양 (화면 비교·스크린샷이 흔들리지 않게).
//  · 저장 이름은 main.js 의 save()/saved() 와 같은 'kiwi-footprints.' 앞머리.

export const PREFIX = 'kiwi-footprints.';
export const DAY = 864e5;

// focus.js today() 와 같은 형식: 'Y-M-D' (0 안 붙임)
export const dayKey = ms => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

// ago 일 전, h시 m분의 시각 (지역 시간)
export function at(now, ago, h = 12, m = 0) {
  const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ago); d.setHours(h, m, 0, 0);
  return d.getTime();
}

// 씨앗 고정 난수 (mulberry32)
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const pickOf = (r, list) => list[Math.floor(r() * list.length)];
