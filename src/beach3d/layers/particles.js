// beach3d/layers/particles.js — 물 파티클의 움직임 (three.js·DOM 없이 계산만 — 시험에서 그대로 부른다)
//  워터 그래픽 모듈(water-gfx.js)의 particles 값에 따라 세 가지:
//   · spray  물가 거품 알갱이 — 물가선 바로 안쪽 물 위에 생겨, 물가와 함께 오르내리다 스러진다
//            (앞에는 물가선에서 뭍 쪽으로 튀어 올랐다 — 물이 올라올 때 어색했다, 사용자 2026-11-23. 잔잔한 물가에서는 물방울이 튀지 않는다)
//   · motes  물 위에 떠다니는 빛 알갱이 — 천천히 흐르며 깜박인다 (호수·연못·늪)
//   · steam  김 — 물 위에서 생겨 위로 오르며 커지고 옅어진다 (온천)
//  좌표는 해변 그림의 픽셀. 화면에 찍는 것(THREE.Points)은 beach3d.js 가 한다.

export const MAX_PARTICLES = 360;
const RATE = { spray: 18, motes: 11, steam: 22 };   // 초당 생기는 수 (양 1 기준) — 적고 크고 부드럽게 (작고 많으면 픽셀 점처럼 보였다, 사용자 2026-11-23)
const ROCK_RATE = 5;   // 돌에 부딪혀 튀는 물방울 (지형 모듈 rockSplash 1 기준)

export function makeParticles() { return { list: [], acc: 0 }; }

// 한 걸음. env = { type, amount, pw, ph, u, edgeY(x) 지금 물가선, rnd }
export function stepParticles(P, dt, { type, amount = 1, pw, ph, u, edgeY, rocks = null, rockSplash = 0, rnd = Math.random }) {
  for (const p of P.list) {
    p.age += dt; p.x += p.vx * dt;
    if (p.s != null) { p.s += p.ds * dt; p.y = edgeY(p.x) + p.s; }   // 물에 실린 알갱이: 물가선에서 s 만큼 안쪽 — 물가가 오르내리면 같이 간다
    else p.y += p.vy * dt;
    if (p.grow) p.size += p.grow * dt;
  }
  P.list = P.list.filter(p => p.age < p.life);
  // 돌에 부딪혀 튀는 물방울: 물에 잠긴 돌 가장자리에서 가끔 (물 종류와 상관없이 지형 모듈이 정한다)
  if (rocks && rocks.length && rockSplash > 0) {
    P.accR = (P.accR || 0) + ROCK_RATE * rockSplash * dt;
    while (P.accR >= 1) { P.accR -= 1; const [x, y] = rocks[Math.floor(rnd() * rocks.length) % rocks.length]; burst(P, x, y, 1 + Math.floor(rnd() * 2), u, rnd, 0.4); }
  }
  const rate = RATE[type] || 0;
  if (!rate || amount <= 0) { P.acc = 0; return P; }
  P.acc += rate * amount * dt;
  while (P.acc >= 1 && P.list.length < MAX_PARTICLES) {
    P.acc -= 1;
    const x = rnd() * pw, e = edgeY(x);
    if (type === 'spray') {
      const s = (2 + rnd() * 16) * u;
      P.list.push({ x, y: e + s, s, ds: (1 + rnd() * 4) * u, vx: (rnd() - 0.5) * 6 * u, vy: 0, age: 0, life: 1.4 + rnd() * 1.6, size: (1.6 + rnd() * 2) * u, a: 0.2 + rnd() * 0.24 });
    } else {
      const y = e + 24 * u + rnd() * Math.max(0, ph - e - 24 * u);   // 물 위 아무 데나
      if (y >= ph) continue;
      if (type === 'motes') P.list.push({ x, y, vx: (rnd() - 0.3) * 5 * u, vy: (rnd() - 0.5) * 2.5 * u, age: 0, life: 2.6 + rnd() * 3.2, size: (2.6 + rnd() * 3) * u, a: 0.18 + rnd() * 0.24, tw: rnd() * 6.28 });
      else P.list.push({ x, y, vx: (rnd() - 0.5) * 5 * u, vy: -(5 + rnd() * 9) * u, age: 0, life: 2 + rnd() * 1.8, size: (7 + rnd() * 6) * u, grow: 6 * u, a: 0.1 + rnd() * 0.12 });
    }
  }
  if (P.acc > 4) P.acc = 4;   // 가득 차 있는 동안 쌓인 몫을 한꺼번에 내뿜지 않는다
  return P;
}

// 지금 보이는 세기 0~1: 생겼다 사라지고, 빛 알갱이는 깜박인다
export function particleAlpha(p, t = 0) {
  const k = p.age / p.life, env = Math.sin(Math.PI * Math.min(1, Math.max(0, k)));
  return p.a * env * (p.tw != null ? 0.6 + 0.4 * Math.sin(t * 1.5 + p.tw) : 1);   // 빛 알갱이는 천천히 밝아졌다 어두워진다
}

// 한 자리에서 물방울을 n 개 터뜨린다 (돌을 눌렀을 때 · 돌에 물결이 부딪힐 때). k = 세기
export function burst(P, x, y, n, u, rnd = Math.random, k = 1) {
  for (let i = 0; i < n && P.list.length < MAX_PARTICLES; i++) {
    const a = rnd() * 6.283, sp = (8 + rnd() * 26) * u * k;
    P.list.push({ x: x + Math.cos(a) * 3 * u, y: y + Math.sin(a) * 3 * u, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6 * u * k, age: 0, life: 0.45 + rnd() * 0.7, size: (2.2 + rnd() * 2.8) * u, a: 0.3 + rnd() * 0.3 });
  }
  return P;
}
