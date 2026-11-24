// beach3d/water/normals.js — 이음새 없이 반복되는 잔물결 그림 (물결의 기울기를 담은 그림, three.js·DOM 없이 값만)
//  사용자 2026-11-23: "현재 물결은 너무 이상해.. 기름 같아."
//
//  앞 구조(surface.js 의 식으로 그린 물결)는 두 가지 사이를 오갔다:
//   · 잔물결을 넣으면 화면 칸보다 잘아져 빛이 자글거리고 ("반짝임이 너무 작다보니까 자글거린다")
//   · 빼면 매끈한 큰 물결만 남아 굵은 빛 띠가 구불거린다 ("기름 같아")
//  식으로 그린 물결은 그래픽 카드가 걸러 줄 수 없어서다. 그림(텍스처)은 걸러 준다(밉맵) —
//  가까이에서는 잔물결이 살아 있고, 화면 칸보다 잘아지면 그 칸의 평균으로 부드럽게 뭉개진다.
//  게임과 three.js 의 물 예제가 물결을 그림 두 장을 흘려서 그리는 까닭이다. 그 그림을 여기서 만든다 (받아 오는 파일 없음).
//
//  만드는 법: 한 변 n 칸 안에 정수 번 돌아 나가는 물결 수십 개를 겹친다 → 가장자리가 맞물려 이음새가 없다.
//  긴 물결일수록 높고, 짧은 물결은 낮지만 기울기로는 제몫을 한다(바다 물결의 흔한 모양). 방향은 한쪽으로 조금 쏠린다.
//  담는 값은 높이가 아니라 기울기(가로, 세로) — 셰이더가 바로 쓴다. 고르게 맞춰 두어(제곱평균 1) 세기는 셰이더가 정한다.

export const WAVE_TEX = 256;
export const WAVE_RANGE = 3;   // 그림 한 칸의 값 0~255 ↔ 기울기 −3 ~ +3 (제곱평균 1 기준)

export function makeWaveSlopes(n = WAVE_TEX, seed = 7, count = 56) {
  let s = seed >>> 0 || 1;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const waves = [];
  while (waves.length < count) {
    const r = 3 + Math.pow(rnd(), 1.4) * 21;               // 한 변에 몇 번 도는가 (3 ~ 24) — 짧은 물결이 조금 더 많다
    const a = (rnd() - 0.5) * 2.6 + (rnd() < 0.2 ? Math.PI / 2 : 0);   // 대부분 한쪽(±75°), 다섯에 하나는 옆으로
    const kx = Math.round(r * Math.sin(a)), ky = Math.round(r * Math.cos(a));
    if (!kx && !ky) continue;
    const k = Math.hypot(kx, ky);
    waves.push({ kx, ky, amp: Math.pow(k, -1.6), ph: rnd() * Math.PI * 2 });
  }
  const sx = new Float32Array(n * n), sy = new Float32Array(n * n), T = (Math.PI * 2) / n;
  for (const w of waves) {
    const gx = w.amp * w.kx * T, gy = w.amp * w.ky * T;      // 높이 amp·sin(…) 의 기울기 = amp·k·cos(…)
    // 한 줄 안에서는 각도가 kx·T 씩 늘어난다 → 덧셈 정리로 cos·sin 을 이어 구한다 (칸마다 cos 를 다시 부르지 않게)
    const cdx = Math.cos(w.kx * T), sdx = Math.sin(w.kx * T);
    for (let y = 0; y < n; y++) {
      let c = Math.cos(w.ky * T * y + w.ph), sn = Math.sin(w.ky * T * y + w.ph);
      const row = y * n;
      for (let x = 0; x < n; x++) {
        sx[row + x] += gx * c; sy[row + x] += gy * c;
        const c2 = c * cdx - sn * sdx; sn = sn * cdx + c * sdx; c = c2;
      }
    }
  }
  let ss = 0;
  for (let i = 0; i < n * n; i++) ss += sx[i] * sx[i] + sy[i] * sy[i];
  const norm = 1 / Math.sqrt(ss / (n * n) / 2);            // 가로·세로 기울기 각각 제곱평균 1
  const out = new Uint8Array(n * n * 4);
  const enc = v => Math.max(0, Math.min(255, Math.round((v * norm / WAVE_RANGE * 0.5 + 0.5) * 255)));
  for (let i = 0; i < n * n; i++) { out[i * 4] = enc(sx[i]); out[i * 4 + 1] = enc(sy[i]); out[i * 4 + 2] = 128; out[i * 4 + 3] = 255; }
  return out;
}
