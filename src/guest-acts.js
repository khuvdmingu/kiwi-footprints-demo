// guest-acts.js — v28.22 손님 20종 동작 (재고: 모션 작업장 videos/guest-<id>.mp4, Kling 3.0 · 시작·끝 = 손님 격자 칸, 2026-10-22)
//  tools/make-guest-act.sh 가 만든 assets/guest-act-<id>.webp — 가로 한 줄, 칸 256×240(편지 카드 그림 자리 128×120 의 2배), 10fps.
//  손님은 화면을 걷지 않고 발자국·편지로만 다녀가서, 움직이는 그림은 편지 카드에서만 보인다.
//  n = 칸 수 (마지막 칸 = 첫 칸, 크로스페이드로 이음새 없음)
export const GUEST_ACTS = {
  gull: { n: 41, fps: 10 },       // 고개 갸웃 · 부리 벌려 울기 · 날개 한 번
  crab: { n: 44, fps: 10 },       // 집게 흔들기 · 눈 까딱
  weka: { n: 50, fps: 10 },       // SOLO=1 — 발밑 점 지움
  hedgehog: { n: 13, fps: 10 },   // 움직임이 작아 짧다 (SOLO=1 — 발밑 부스러기 지움)
  duck: { n: 41, fps: 10 },
  fox: { n: 41, fps: 10 },
  rabbit: { n: 45, fps: 10 },
  deer: { n: 46, fps: 10 },
  sparrow: { n: 40, fps: 10 },
  cat: { n: 32, fps: 10 },
  squirrel: { n: 32, fps: 10 },
  whiteeye: { n: 43, fps: 10 },
  frog: { n: 46, fps: 10 },
  egret: { n: 46, fps: 10 },
  fennec: { n: 31, fps: 10 },
  hoopoe: { n: 42, fps: 10 },
  gecko: { n: 49, fps: 10, first: 6, last: 35 }, // 얼굴이 온전한 구간만 왕복
  gerbil: { n: 45, fps: 10 },
  camel: { n: 34, fps: 10 },
  raccoon: { n: 44, fps: 10 },
};
export const GUEST_ACT_REST = 2000;   // ms: 한 번 움직인 뒤 가만히 있는 시간

// 정지 그림과 동작 첫 칸의 불투명 영역을 같은 편지 칸(256×240)에서 맞춘 값.
// 몸 크기는 한 배율로, 팔다리가 움직일 여백을 남겨 카드 바깥으로 잘리지 않게 한다.
const PLACEMENT = {
  gull: [0.837, 41.03, 22.76],
  crab: [0.602, 60.20, 61.10],
  weka: [0.968, 11.06, 18.29],
  hedgehog: [0.742, 7.58, 63.65],
  duck: [0.900, 27.98, 10.49],
  fox: [1.013, -20.29, -2.05],
  rabbit: [1.013, 11.51, -2.05],
  deer: [1.013, -27.38, -2.05],
  sparrow: [0.812, 36.79, 3.52],
  cat: [0.896, -1.50, 11.63],
  squirrel: [1.011, -2.04, -10.13],
  whiteeye: [0.778, 33.61, 32.78],
  frog: [0.746, 49.62, 28.73],
  egret: [0.895, 28.95, 23.63],
  fennec: [0.990, -6.91, 2.15],
  hoopoe: [0.879, 26.05, 4.55],
  gecko: [0.743, 52.33, 48.08],
  gerbil: [0.843, 22.12, 19.66],
  camel: [0.880, 26.88, 8.92],
  raccoon: [0.871, 27.57, 5.09],
};

// 동작 그림을 읽기 전이나 움직임 줄이기에서는 정지 그림을 유지한다.
export function animateGuest(el, id, base = 'assets/') {
  const a = GUEST_ACTS[id];
  if (!a || typeof Image === 'undefined' || !el.animate) return;
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const src = base + 'guest-act-' + id + '.webp?v=v30.23.0-cda5927';
  const im = new Image();
  im.onload = () => {
    if (!el.isConnected || el.classList.contains('gact')) return;
    const [scale, x, y] = PLACEMENT[id];
    const layer = document.createElement('span');
    Object.assign(layer.style, {
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: "url('" + src + "')", backgroundSize: a.n * 100 + '% 100%', backgroundRepeat: 'no-repeat',
      transformOrigin: '0 0', transform: 'translate(' + x / 256 * 100 + '%, ' + y / 240 * 100 + '%) scale(' + scale + ')',
    });
    el.classList.add('gact');
    Object.assign(el.style, { position: 'relative', overflow: 'hidden', backgroundImage: 'none' });
    el.append(layer);
    const first = a.first ?? 0, last = a.last ?? a.n - 1, steps = last - first;
    const start = first * 100 / (a.n - 1) + '%', end = last * 100 / (a.n - 1) + '%';
    const move = steps / a.fps * 1000, bounce = a.first != null;
    const total = (bounce ? 2 : 1) * move + GUEST_ACT_REST;
    const easing = 'steps(' + steps + ', end)';
    const frames = [
      { backgroundPositionX: start, easing },
      { backgroundPositionX: end, offset: move / total, ...(bounce ? { easing } : {}) },
    ];
    if (bounce) frames.push({ backgroundPositionX: start, offset: 2 * move / total });
    frames.push({ backgroundPositionX: bounce ? start : end });
    layer.animate(frames, { duration: total, iterations: Infinity });
  };
  im.src = src;
}
