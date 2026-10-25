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
  gecko: { n: 49, fps: 10 },
  gerbil: { n: 45, fps: 10 },
  camel: { n: 34, fps: 10 },
  raccoon: { n: 44, fps: 10 },
};
export const GUEST_ACT_REST = 2000;   // ms: 한 번 움직인 뒤 가만히 있는 시간

// 편지 카드의 손님 그림(i.gpic)을 움직이게 한다. 그림을 다 읽은 뒤에야 바꾸고(그 전엔 격자 칸 그대로), 움직임 줄이기면 그대로 둔다
export function animateGuest(el, id, base = 'assets/') {
  const a = GUEST_ACTS[id];
  if (!a || typeof Image === 'undefined') return;
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const src = `${base}guest-act-${id}.webp?v=v29.7.0`, im = new Image();
  im.onload = () => {
    if (!el.isConnected) return;
    el.classList.add('gact');
    el.style.backgroundImage = `url('${src}')`;
    el.style.backgroundSize = `${a.n * 100}% 100%`;
    el.style.backgroundPosition = '0% 0';
    const move = (a.n - 1) / a.fps * 1000, total = move + GUEST_ACT_REST;
    el.animate?.([
      { backgroundPositionX: '0%', easing: `steps(${a.n - 1}, end)` },
      { backgroundPositionX: '100%', offset: move / total },
      { backgroundPositionX: '100%' },
    ], { duration: total, iterations: Infinity });
  };
  im.src = src;
}
