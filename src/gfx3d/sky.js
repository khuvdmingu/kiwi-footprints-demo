// gfx3d/sky.js — 3D 장면들이 같이 쓰는 하루의 빛과 물결 (three.js 없이 계산만 — 시험에서 그대로 부른다)
//  시간대 가중치는 2D 항해와 같은 voyageLight(hour) 를 쓴다 → 밤·노을·새벽이 2D 와 같은 시각에 바뀐다.
import { voyageLight } from '../voyage-scene.js?v=v30.36.0-9042bf8';

const mix = (a, b, k) => a + (b - a) * k;
const mix3 = (a, b, k) => a.map((v, i) => mix(v, b[i], k));

// 해·달: 방향(빛이 오는 쪽, 화면 위쪽 = -z 가 뱃머리 쪽), 색, 세기, 하늘·바닥 반사광
//  해는 동(+x)에서 떠 서(-x)로 지고 늘 배 앞쪽(-z)에 있게 둔다 → 해가 낮을 때 배 앞 물 위에 빛길(윤슬)이 생긴다
export function skyAt(hour = 12) {
  const L = voyageLight(hour), h = ((hour % 24) + 24) % 24;
  const day = Math.min(1, Math.max(0, (h - 5.5) / 13));   // 5:30 → 0, 18:30 → 1
  const elev = Math.max(0.06, Math.sin(Math.PI * day)) * (1 - L.night);   // 해 높이
  //  동서로 조금만, 높이는 실제보다 높게 둔다 — 비스듬히 내려다보는 화면에서 노을 빛길이 수평선 너머가 아니라
  //  배 앞 물 위(화면 가운데)에 맺히게 (레퍼런스 그림). 진짜 해 높이를 쓰면 반사 자리가 안개 너머로 간다
  const sun = [Math.cos(Math.PI * day) * 0.08, 0.62 + elev * 1.1, -1.1];
  const moon = [0.12, 0.75, -1.0];
  const n = L.night, warm = Math.max(L.sunset, L.dawn);
  let color = mix3([1, 0.97, 0.9], L.dawn > L.sunset ? [1, 0.72, 0.62] : [1, 0.62, 0.32], warm);
  color = mix3(color, [0.62, 0.72, 1], n);
  const intensity = mix(mix(2.4, 1.7, warm), 0.45, n);
  const dir = n > 0.5 ? moon : sun.map((v, i) => mix(v, moon[i], n));
  const skyC = mix3(mix3([0.78, 0.88, 1], [1, 0.74, 0.55], warm), [0.16, 0.22, 0.42], n);
  const ground = mix3(mix3([0.2, 0.42, 0.5], [0.45, 0.3, 0.3], warm), [0.04, 0.06, 0.14], n);
  const hemi = mix(mix(1.25, 1.05, warm), 0.55, n);
  const art = n > 0.5 ? 'night' : L.sunset > 0.4 ? 'sunset' : L.dawn > 0.4 ? 'dawn' : 'day';
  const fog = mix3(mix3([0.55, 0.72, 0.8], [0.85, 0.55, 0.45], warm), [0.05, 0.08, 0.18], n);
  return { ...L, dir, color, intensity, sky: skyC, ground, hemi, art, fog, warm };
}

// 물결: 방향이 다른 사인파 넷의 합. JS(배 흔들기)와 GLSL(물 면)이 같은 식을 쓴다
//  [x방향, z방향, 파수 k, 높이 a, 속도 s, 위상]
export const WAVES = [
  [0.0, 1.0, 1.25, 0.075, 1.15, 0.0],
  [0.6, 0.8, 2.1, 0.04, 1.7, 1.3],
  [-0.7, 0.7, 2.9, 0.025, 2.2, 2.1],
  [0.95, 0.3, 4.3, 0.012, 2.9, 0.7],
];
// 높이와 기울기 (x, z 는 물에 붙은 좌표 — 배가 가는 만큼 밀린 자리)
export function waveAt(x, z, t) {
  let y = 0, dx = 0, dz = 0;
  for (const [ax, az, k, a, s, p] of WAVES) {
    const ph = k * (ax * x + az * z) - s * t + p, c = Math.cos(ph);
    y += a * Math.sin(ph); dx += a * k * ax * c; dz += a * k * az * c;
  }
  return { y, dx, dz };
}
// 같은 식의 GLSL (재료의 onBeforeCompile 에 넣는다)
export const WAVES_GLSL = /* glsl */ `
  uniform float uT;
  uniform float uTravel;
  vec3 waveAt(vec2 p) {
    vec3 r = vec3(0.0);
    ${WAVES.map(([ax, az, k, a, s, p]) => `{ float ph = ${k.toFixed(3)} * (${ax.toFixed(3)} * p.x + ${az.toFixed(3)} * p.y) - ${s.toFixed(3)} * uT + ${p.toFixed(3)};
      float c = cos(ph); r.x += ${a.toFixed(4)} * sin(ph); r.y += ${(a * k * ax).toFixed(5)} * c; r.z += ${(a * k * az).toFixed(5)} * c; }`).join('\n    ')}
    return r;
  }
`;
