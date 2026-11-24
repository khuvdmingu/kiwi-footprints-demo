// beach3d — 해변을 three.js 로 구조부터 다시 세운 판 (물에 집중). 2026-11-23, feature/beach3d-water
//  지금 2D 해변은 그대로 두고 따로 켠다. three.js 는 이 함수를 부를 때만 읽는다(지연 로드).
//  페이지에 import map 이 있어야 한다: { "three": "./vendor/three/build/three.module.js", "three/addons/": "./vendor/three/addons/" }
//  구조 설명: docs/BEACH3D.md
//
//  mountBeach3D(canvas, { map, hour, tilt, bloom, waves }) → 장면
//   · setHour(h) · setTilt(라디안) · setWaves(0~2) · setBloom(on) · setDebug(0|1|2)
//   · tap(nx, ny)  화면 비율 좌표를 누른다 — 물이면 파문, 모래면 발자국(물이 지나가면 지워짐)
//   · write(text) 글을 발자국으로 모래에 쓴다(물이 지나가면 지워짐) · clearPrints()
//   · setActors(on) 모래 위를 돌아다니는 키위 켜고 끄기 (물이 오면 피한다)
//   · setWeather('clear' | 'rain' | 'fog' 또는 { rain, fog }) 비(물 위 파문·젖은 모래)·안개
//   · setWater(값) 워터 그래픽: 물 성질(거품·투명도·빛 비침·파티클…)을 바꾼다 — 값은 water-gfx.js 의 waterFor(맵) · waterOfKind(종류) · tuneWater(값, 배율)
//   · edgeY(그림 x) 지금 물가선의 그림 y — 게임 로직(글씨 지우기·게·물고기)이 물을 따라갈 때 쓴다
//   · resize(w, h, dpr) · dispose()

export function canUse3D() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}

export async function mountBeach3D(canvas, opts = {}) {
  if (!canUse3D()) throw new Error('webgl2');
  const { Beach3D } = await import('./beach3d.js?v=pv-b0a0e55');
  const s = new Beach3D(canvas, opts);
  const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  s.resize(Math.max(1, r.width), Math.max(1, r.height), dpr);
  await s.load();
  s.resize(Math.max(1, r.width), Math.max(1, r.height), dpr);
  s.start();
  return s;
}
