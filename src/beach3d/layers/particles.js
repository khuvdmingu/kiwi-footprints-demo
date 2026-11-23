// beach3d/layers/particles.js — 물 파티클의 움직임 (three.js·DOM 없이 계산만 — 시험에서 그대로 부른다)
//  워터 그래픽 모듈(water-gfx.js)의 particles 값에 따라 세 가지:
//   · spray  물가에서 튀는 물방울 — 물가선에서 생겨 뭍 쪽으로 살짝 튀었다 사라진다
//   · motes  물 위에 떠다니는 빛 알갱이 — 천천히 흐르며 깜박인다 (호수·연못·늪)
//   · steam  김 — 물 위에서 생겨 위로 오르며 커지고 옅어진다 (온천)
//  좌표는 해변 그림의 픽셀. 화면에 찍는 것(THREE.Points)은 beach3d.js 가 한다.

export const MAX_PARTICLES = 360;
const RATE = { spray: 70, motes: 26, steam: 22 };   // 초당 생기는 수 (양 1 기준)

export function makeParticles() { return { list: [], acc: 0 }; }

// 한 걸음. env = { type, amount, pw, ph, u, edgeY(x) 지금 물가선, rnd }
export function stepParticles(P, dt, { type, amount = 1, pw, ph, u, edgeY, rnd = Math.random }) {
  for (const p of P.list) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.grow) p.size += p.grow * dt; }
  P.list = P.list.filter(p => p.age < p.life);
  const rate = RATE[type] || 0;
  if (!rate || amount <= 0) { P.acc = 0; return P; }
  P.acc += rate * amount * dt;
  while (P.acc >= 1 && P.list.length < MAX_PARTICLES) {
    P.acc -= 1;
    const x = rnd() * pw, e = edgeY(x);
    if (type === 'spray') {
      P.list.push({ x, y: e + (rnd() * 6 - 1) * u, vx: (rnd() - 0.5) * 14 * u, vy: -(6 + rnd() * 22) * u, age: 0, life: 0.35 + rnd() * 0.6, size: (1.2 + rnd() * 1.8) * u, a: 0.55 + rnd() * 0.4 });
    } else {
      const y = e + 24 * u + rnd() * Math.max(0, ph - e - 24 * u);   // 물 위 아무 데나
      if (y >= ph) continue;
      if (type === 'motes') P.list.push({ x, y, vx: (rnd() - 0.3) * 7 * u, vy: (rnd() - 0.5) * 3 * u, age: 0, life: 1.8 + rnd() * 2.6, size: (1 + rnd() * 1.4) * u, a: 0.5 + rnd() * 0.5, tw: rnd() * 6.28 });
      else P.list.push({ x, y, vx: (rnd() - 0.5) * 5 * u, vy: -(5 + rnd() * 9) * u, age: 0, life: 2 + rnd() * 1.8, size: (7 + rnd() * 6) * u, grow: 6 * u, a: 0.1 + rnd() * 0.12 });
    }
  }
  if (P.acc > 4) P.acc = 4;   // 가득 차 있는 동안 쌓인 몫을 한꺼번에 내뿜지 않는다
  return P;
}

// 지금 보이는 세기 0~1: 생겼다 사라지고, 빛 알갱이는 깜박인다
export function particleAlpha(p, t = 0) {
  const k = p.age / p.life, env = Math.sin(Math.PI * Math.min(1, Math.max(0, k)));
  return p.a * env * (p.tw != null ? 0.55 + 0.45 * Math.sin(t * 4 + p.tw) : 1);
}
