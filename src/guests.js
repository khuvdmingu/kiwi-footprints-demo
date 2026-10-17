// guests.js — v19 기다리는 손님: 자리를 비운 사이 다른 동물이 모래 위를 지나간다
//
//  · 다시 열거나(또는 다른 앱에 갔다가 돌아오면) 비운 시간을 잰다. 15분이 넘었으면 그 장소에 사는 동물이
//    1~3마리 다녀간 발자국이 모래에 남아 있다 (2시간·8시간을 넘길수록 많이). 파도·갈퀴가 지우기 전까지 그대로.
//  · 동물마다 발자국 모양과 걸음새가 다르다 — 갈매기·오리(물갈퀴) · 게(옆걸음 점) · 여우·고양이(한 줄로 곧게) ·
//    토끼(네 점이 묶인 깡충) · 사슴(갈라진 발굽) · 참새(두 발 모아 콩콩) · 웨카(키위를 닮은 새 발). 그림 파일 없이 선으로 그린다.
//  · 다녀간 손님은 「모은 것」 손님 방명록에 쌓인다 (이 기기에만 저장).

export const GUESTS = {
  gull: { name: '갈매기', shape: 'web', maps: ['beach'], size: 1.15, gait: 'bird', from: 'land' },
  crab: { name: '게', shape: 'crab', maps: ['beach'], size: 0.8, gait: 'crab', from: 'water' },
  weka: { name: '웨카', shape: 'bird', maps: ['nz'], size: 1.1, gait: 'bird', from: 'forest' },
  hedgehog: { name: '고슴도치', shape: 'paw', maps: ['nz', 'fall'], size: 0.6, gait: 'trot', from: 'forest' },
  duck: { name: '청둥오리', shape: 'web', maps: ['nz', 'fall'], size: 1.1, gait: 'bird', from: 'water' },
  fox: { name: '여우', shape: 'paw', maps: ['snow'], size: 0.95, gait: 'line', from: 'forest' },
  rabbit: { name: '산토끼', shape: 'hop', maps: ['snow', 'fall'], size: 0.85, gait: 'hop', from: 'forest' },
  deer: { name: '사슴', shape: 'hoof', maps: ['snow', 'fall'], size: 1.2, gait: 'trot', from: 'forest' },
  sparrow: { name: '참새', shape: 'pair', maps: ['zen', 'snow'], size: 0.55, gait: 'hopbird', from: 'land' },
  cat: { name: '고양이', shape: 'paw', maps: ['zen', 'beach'], size: 0.8, gait: 'line', from: 'forest' },
};
export const GUEST_IDS = Object.keys(GUESTS);
export const AWAY_MIN = 15;   // 분: 이보다 짧게 비우면 아무도 안 온다

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

// 비운 시간(분) → 몇 마리
export function guestCount(min) { return min < AWAY_MIN ? 0 : min < 120 ? 1 : min < 480 ? 2 : 3; }

// 발자국 한 개를 path 에 더한다 (x, y = 발자국 가운데, a = 가는 방향, f = 크기). 점은 길이 0 짜리 선(둥근 끝)으로 찍힌다
export function addGuestFoot(path, shape, x, y, a, f) {
  const c = Math.cos(a), s = Math.sin(a);
  const P = (fw, side) => [x + c * fw * f - s * side * f, y + s * fw * f + c * side * f];   // 앞(fw)·옆(side) 좌표
  const dot = (fw, side) => { const [px, py] = P(fw, side); path.moveTo(px, py); path.lineTo(px + 0.01, py); };
  const line = (f0, s0, f1, s1) => { const [ax, ay] = P(f0, s0), [bx, by] = P(f1, s1); path.moveTo(ax, ay); path.lineTo(bx, by); };
  if (shape === 'web') {   // 앞발가락 셋 + 끝을 잇는 물갈퀴
    line(0, 0, 0.85, -0.55); line(0, 0, 1, 0); line(0, 0, 0.85, 0.55);
    const [lx, ly] = P(0.85, -0.55), [mx, my] = P(0.55, 0), [rx, ry] = P(0.85, 0.55);
    path.moveTo(lx, ly); path.quadraticCurveTo(mx, my, rx, ry);
  } else if (shape === 'bird') {   // 키위를 닮은 새 발 (뒷발가락이 조금 길다)
    line(0, 0, 0.9, -0.5); line(0, 0, 1.05, 0); line(0, 0, 0.9, 0.5); line(0, 0, -0.45, 0);
  } else if (shape === 'pair') {   // 참새: 두 발을 모아 콩 — 작은 새 발 둘
    for (const sd of [-0.55, 0.55]) { line(0, sd, 0.55, sd - 0.3); line(0, sd, 0.65, sd); line(0, sd, 0.55, sd + 0.3); line(0, sd, -0.3, sd); }
  } else if (shape === 'paw') {   // 발바닥 + 발가락 넷
    dot(-0.45, 0); dot(-0.25, -0.24); dot(-0.25, 0.24);
    dot(0.3, -0.55); dot(0.55, -0.2); dot(0.55, 0.2); dot(0.3, 0.55);
  } else if (shape === 'hoof') {   // 갈라진 발굽: 앞이 살짝 모이는 두 줄
    line(-0.4, -0.32, 0.4, -0.2); line(-0.4, 0.32, 0.4, 0.2);
  } else if (shape === 'hop') {   // 토끼 한 번 깡충: 뒤에 작은 앞발 둘(앞뒤로), 앞에 긴 뒷발 둘(나란히)
    dot(-0.9, 0.05); dot(-0.4, -0.05);
    line(0.25, -0.38, 0.9, -0.42); line(0.25, 0.38, 0.9, 0.42);
  } else if (shape === 'crab') {   // 게: 옆걸음 — 양쪽에 짧은 점 넷씩
    for (let i = 0; i < 3; i++) { const fw = (i - 1) * 0.55; dot(fw, -0.65 - Math.abs(i - 1) * 0.12); dot(fw, 0.65 + Math.abs(i - 1) * 0.12); }
  }
}

// 모래 위 한 줄 길 → [{x, y, a}] (걸음 위치). 빙빙 돌지 않고 한 번 지나간다:
//  숲에서 나온 동물 = 숲 → 물가로 비스듬히 내려가 물가를 따라 조금 걷다 끝(물 마시고 떠난 자리)
//  물에서 나온 동물 = 물가에서 올라와 옆으로 조금 걷다 다시 물로 · 내려앉은 새 = 모래 위 아무 데서 몇 걸음
function trail(beach, g, stride) {
  const { W, u } = beach;
  const top = x => beach.grass(x) + 24 * u, bot = x => beach.edge(x) - 24 * u;
  const wp = [];   // 지나갈 점들
  const x0 = rnd(W * 0.1, W * 0.9), dir = Math.random() < 0.5 ? -1 : 1;
  if (g.from === 'forest') {
    const x1 = clampX(x0 + dir * rnd(0.08, 0.3) * W, W), x2 = clampX(x1 + dir * rnd(0.1, 0.25) * W, W);
    wp.push([x0, top(x0)], [x1, bot(x1)], [x2, bot(x2) - rnd(0, 30) * u]);
  } else if (g.from === 'water') {
    const x1 = clampX(x0 + dir * rnd(0.05, 0.15) * W, W), x2 = clampX(x1 + dir * rnd(0.05, 0.15) * W, W);
    const up = rnd(0.25, 0.5);
    wp.push([x0, bot(x0) + 18 * u], [x1, bot(x1) - (bot(x1) - top(x1)) * up], [x2, bot(x2) + 18 * u]);
  } else {
    const y0 = top(x0) + (bot(x0) - top(x0)) * rnd(0.45, 0.9), x1 = clampX(x0 + dir * rnd(0.06, 0.16) * W, W);
    wp.push([x0, y0], [x1, Math.min(bot(x1), y0 + rnd(-40, 60) * u)]);
  }
  const out = [];
  let [x, y] = wp[0], a = Math.atan2(wp[1][1] - y, wp[1][0] - x);
  for (let k = 1; k < wp.length; k++) {
    const [tx, ty] = wp[k];
    for (let i = 0; i < 200 && Math.hypot(tx - x, ty - y) > stride; i++) {
      const want = Math.atan2(ty - y, tx - x), d = ((want - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      a += d * 0.35 + rnd(-0.08, 0.08);
      x += Math.cos(a) * stride; y += Math.sin(a) * stride;
      if (y > top(x) && y < beach.edge(x) - 4 * u) out.push({ x, y, a });
    }
  }
  return out;
}
const clampX = (x, W) => Math.max(W * 0.06, Math.min(W * 0.94, x));

// 손님 한 마리의 발자국을 모래에 남긴다
export function leaveTracks(beach, id, foot) {
  const g = GUESTS[id], f = foot * g.size * 1.15;
  const born = beach.t, add = (x, y, a) => {
    if (y > beach.edge(x) - 4 || y < beach.grass(x) + 6 * beach.u) return;
    beach.prints.push({ x, y, a, f, kind: 'guest', shape: g.shape, born, alpha: 0.9, wash: false });
  };
  const pace = { bird: 2.3, crab: 1.1, trot: 2.8, line: 2.6, hop: 4.6, hopbird: 2.2 }[g.gait] || 2.4;
  const pts = trail(beach, g, f * pace);
  pts.forEach((p, i) => {
    const sideA = p.a + Math.PI / 2, side = (o) => [p.x + Math.cos(sideA) * o * f, p.y + Math.sin(sideA) * o * f];
    if (g.gait === 'bird') { const [x, y] = side(i % 2 ? 0.45 : -0.45); add(x, y, p.a + (i % 2 ? 0.12 : -0.12)); }
    else if (g.gait === 'line') { const [x, y] = side(i % 2 ? 0.12 : -0.12); add(x, y, p.a); }   // 여우·고양이: 한 줄로 곧게
    else if (g.gait === 'trot') { const [x, y] = side(i % 2 ? 0.5 : -0.5); add(x, y, p.a); }
    else if (g.gait === 'crab') add(p.x, p.y, p.a + Math.PI / 2);   // 몸은 옆을 보고 옆으로 간다
    else add(p.x, p.y, p.a);   // 토끼·참새: 묶음 하나가 한 번 뜀
  });
  return pts.length;
}

// 손님 방명록 (이 기기에만)
export class Guestbook {
  constructor(load, save) {
    this.save = save;
    let s = {};
    try { s = JSON.parse(load() || '{}'); } catch (e) { s = {}; }
    this.count = s.count && typeof s.count === 'object' ? s.count : {};
    this.first = s.first && typeof s.first === 'object' ? s.first : {};   // 처음 온 날
  }
  store() { this.save(JSON.stringify({ count: this.count, first: this.first })); }
  add(id, day) { this.count[id] = (this.count[id] || 0) + 1; this.first[id] ??= day; this.store(); }
  get kinds() { return GUEST_IDS.filter(id => this.count[id]).length; }
}

// 이 장소에 올 손님 n 마리 (같은 동물이 또 올 수도 있다)
export function pickGuests(map, n) {
  const here = GUEST_IDS.filter(id => GUESTS[id].maps.includes(map));
  // 되도록 서로 다른 동물로 (모자라면 같은 동물이 또 온다)
  const bag = here.slice().sort(() => Math.random() - 0.5);
  return here.length ? Array.from({ length: n }, (_, i) => bag[i] || pick(here)) : [];
}
