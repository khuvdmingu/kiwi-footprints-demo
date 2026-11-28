// gfx3d — 그래픽 업데이트 모듈 (2026-11-22, feature/gfx-voyage3d)
//  지금 2D 화면은 그대로 두고, "고급" 그래픽으로 켤 수 있는 three.js 장면을 따로 만든다. 처음 둘: 항해(voyage3d) · 섬 짓기 등대(lighthouse3d).
//  three.js 는 이 함수를 부를 때만 읽는다(지연 로드, 약 2MB) — 평소 해변 화면은 한 바이트도 더 받지 않는다.
//  페이지에 import map 이 있어야 한다: { "three": "./vendor/three/build/three.module.js", "three/addons/": "./vendor/three/addons/" }
//  자세한 설명: docs/GFX3D.md · 가져온 오픈소스: vendor/VENDOR.md

export const SCENES = { voyage: '항해', lighthouse: '등대' };

// WebGL2 가 되는 기기인가 (안 되면 2D 화면을 그대로 쓴다)
export function canUse3D() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}

// 장면 하나를 만들어 그림을 읽고 돌린다. 반환값의 setHour(h) · setBloom(on) · resize(w,h,dpr) · dispose() 를 쓴다
export async function mountGfx3D(kind, canvas, opts = {}) {
  if (!canUse3D()) throw new Error('webgl2');
  const mod = kind === 'lighthouse' ? await import('./lighthouse3d.js?v=v30.40.0-bb99cd3') : await import('./voyage3d.js?v=v30.40.0-bb99cd3');
  const Scene = kind === 'lighthouse' ? mod.Lighthouse3D : mod.Voyage3D;
  const s = new Scene(canvas, opts);
  const r = canvas.getBoundingClientRect();
  s.resize(Math.max(1, r.width), Math.max(1, r.height), window.devicePixelRatio || 1);
  await s.load();
  s.resize(Math.max(1, r.width), Math.max(1, r.height), window.devicePixelRatio || 1);
  s.start();
  return s;
}
