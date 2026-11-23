// beach3d/layers/weather.js — 날씨 값 (three.js·DOM 없이 계산만 — 시험에서 그대로 부른다)
//  비: 물 위 빗방울 파문 · 모래 전체가 젖음 · 회청 톤 · 빛길과 빛 그물이 줄어듦.  안개: 천천히 흐르는 옅은 층 · 반짝임이 줄어듦.
//  그리기는 shaders.js(uRain · uFog), 값 따라가기는 beach3d.js 가 프레임마다 approach() 로 한다.
export const WEATHERS = {
  clear: { rain: 0, fog: 0 },
  rain: { rain: 1, fog: 0.15 },
  fog: { rain: 0, fog: 1 },
};
// 지금 값이 목표로 secs 초쯤에 걸쳐 부드럽게 따라간다 (뚝 바뀌지 않게)
export function approach(v, target, dt, secs = 2.5) {
  const k = Math.min(1, dt / Math.max(secs, 1e-3) * 3);
  const n = v + (target - v) * k;
  return Math.abs(target - n) < 0.002 ? target : n;
}
