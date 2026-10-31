// voyage-scene.js — 항해 중 바다 장면 (2D 캔버스 한 장, 섬 장면 위에 덮는다)
//
//  그림(Higgsfield, 2026-10-18): assets/sea.webp · sea-tall.webp(바다 판) · sea-night.webp · sea-tall-night.webp(같은 구도의 밤바다), voyage-sprites.webp(3×2: 배·고래 등·고래 꼬리·쉬는 새·등대 섬·야자 섬)
//  배는 화면 가운데 조금 아래에 떠 있고, 물결·잔물결이 아래로 흘러 앞으로 가는 것처럼 보인다.
//  키위는 섬에서 쓰는 그림(kiwi.webp·kiwi-sleep.webp)을 그대로 배에 태운다.
//  사건(voyage.js 의 kind)을 받으면 12초쯤 그 장면을 보여 준다. snapshot() 은 같은 장면을 사진 한 장으로 다시 그린다
//  (화면을 꺼 두었던 사이의 사건도 일기 사진을 남길 수 있게).

import { CREW_ACTS, CREW_MORE } from './acts.js?v=v29.32.0-c49194c';
import { SeaGL, drawSea2D } from './voyage-water.js?v=v29.32.0-c49194c';

export const SPEED = 0.05;   // 배가 가는 빠르기: 1초에 화면 짧은 변의 5% (물·잔물결·지나가는 것이 모두 이 빠르기로 흐른다)
const WATER_SCALE = 0.75;     // 물은 화면보다 성기게 그린다 (배터리·발열 — 물결은 흐려도 티가 안 난다)
const CREW = ['up', 'left', 'right', 'sleep', 'sky', 'wave'];
const CREW_AX = { up: 0.42, left: 0.62, right: 0.4, sleep: 0.5, sky: 0.42, wave: 0.42 };   // 자세마다 몸통 가운데의 가로 위치(부리·날개 빼고)   // voyage-crew.webp 3×2: 앞 보기 · 왼쪽 · 오른쪽 · 잠 · 하늘 보기 · 손 흔들기
// 넓은 배: 돛대 자리(배 높이 비율, 위로) · 돛 꼭지의 가로 위치(돛 그림 폭 비율) · 키위 자리 [x(배 폭 비율), y(배 높이 비율)]
const MAST_Y = 0.41, SAIL_STEM_X = 0.5;
const WIDE_SEATS = [[-0.19, -0.04], [0.19, -0.04], [0, 0.26]];   // 가운데 의자 둘 · 뒷의자 하나
const CELLS = ['boat', 'whale', 'tail', 'seabird', 'lighthouse', 'island'];   // 3×2 순서
// 배 고르기 (2026-10-22): 나무 보트 말고 다섯 + 연잎. 그림은 assets/boat-<id>.webp (같은 위에서 본 구도·뱃머리 끝 돛대)
//  h = 배 길이(기본 배 = 0.78) · seats = 키위 자리 [x(기본 배 폭 비율 — 키위 크기가 배마다 달라지지 않게), y(이 배 길이 비율)]
//  hours = 그동안 바다 위에서 보낸 시간이 이만큼 되면 열린다
export const BOATS = [
  { id: 'dinghy', name: '나무 보트', hours: 0 },
  { id: 'logs', name: '통나무 뗏목', hours: 1, h: 0.74, seats: [[-0.2, -0.02], [0.2, -0.02], [0, 0.27]] },
  { id: 'bamboo', name: '대나무 뗏목', hours: 2, h: 0.76, seats: [[-0.16, 0.02], [0.16, 0.02], [0, 0.27]] },
  { id: 'canoe', name: '통나무 카누', hours: 4, h: 0.84, seats: [[0, -0.21], [0, 0.04], [0, 0.29]] },
  { id: 'coconut', name: '코코넛 배', hours: 6, h: 0.66, seats: [[-0.22, 0.04], [0.22, 0.04], [0, 0.25]] },
  { id: 'walnut', name: '호두 껍질 배', hours: 9, h: 0.74, seats: [[-0.2, 0.0], [0.2, 0.0], [0, 0.26]] },
  { id: 'lily', name: '연잎 배', hours: 12, h: 0.7, seats: [[-0.22, 0.04], [0.2, 0.04], [0, 0.26]] },
  // 큰 배 (2026-10-22, 4~10마리 — 사용자 "맥스 10마리"). 짝수는 둘씩 나란히, 홀수는 맨 앞 한 마리 가운데 + 둘씩
  { id: 'bamboo4', name: '큰 대나무 뗏목', hours: 15, h: 0.95, seats: rows(4, 0.95, 0.22, 0.06) },
  { id: 'canoe5', name: '긴 통나무 카누', hours: 20, h: 1.32, seats: line(5, 1.32, 0.04) },
  { id: 'raft6', name: '큰 통나무 뗏목', hours: 25, h: 1.02, seats: rows(6, 1.02, 0.24, 0.06) },
  { id: 'catamaran7', name: '쌍동선', hours: 30, h: 1.14, mast: 0.28, seats: rows(7, 1.14, 0.3, 0.05) },
  { id: 'longboat8', name: '긴 나무 보트', hours: 40, h: 1.2, seats: rows(8, 1.2, 0.2, 0.06) },
  { id: 'wicker9', name: '엮은 바구니 배', hours: 50, h: 1.22, seats: rows(9, 1.22, 0.24, 0.04) },
  { id: 'barge10', name: '큰 섬 배', hours: 60, h: 1.32, seats: rows(10, 1.32, 0.28, 0.06) },
];
// 돛 고르기 (2026-10-22): 잎 돛 말고 여섯. 그림은 assets/sail-<id>.webp — 꼭지(매는 곳)가 위 가운데, 몸이 아래로 늘어진 같은 구도
export const SAILS = [
  { id: 'none', name: '돛 없음', hours: 0 },   // v29.15 돛 없이 (돛대·줄도 안 그린다)
  { id: 'leaf', name: '잎 돛', hours: 0 },
  { id: 'banana', name: '바나나잎 돛', hours: 3 },
  { id: 'maple', name: '단풍잎 돛', hours: 8 },
  { id: 'patch', name: '조각천 돛', hours: 18 },
  { id: 'fern', name: '고사리 돛', hours: 28 },
  { id: 'feather', name: '깃털 돛', hours: 45 },
  { id: 'monstera', name: '몬스테라 돛', hours: 55 },
];
// 키위 자리 만들기 — 줄 사이는 배 크기와 상관없이 키위 한 마리 키쯤(화면 기준 bh × 0.16)이 되게 배 길이 비율로 바꾼다
function rows(n, h, dx, mid) {
  const R = Math.ceil(n / 2), gap = 0.16 / h, top = mid - gap * (R - 1) / 2, out = [];
  for (let r = 0; r < R; r++) { const y = top + gap * r; if (n % 2 && r === 0) out.push([0, y]); else out.push([-dx, y], [dx, y]); }
  return out;
}
function line(n, h, mid) { const gap = 0.14 / h; return Array.from({ length: n }, (_, i) => [0, mid + gap * (i - (n - 1) / 2)]); }
export const PLAY_SECS = 12;
export function voyageLight(hour = 12) {
  const h = ((hour % 24) + 24) % 24;
  const smooth = (a, b) => { const k = Math.max(0, Math.min(1, (h - a) / (b - a))); return k * k * (3 - 2 * k); };
  const night = h < 6.5 ? 1 - smooth(5, 6.5) : smooth(18.5, 20.5);
  // 새벽(2026-10-22): 밤이 걷히는 5~6:30 에 밤→새벽, 6:30~8:30 에 새벽→낮 (노을과 거울 모양)
  return { night, sunset: smooth(16.5, 18.5) * (1 - night), dawn: h < 12 ? (1 - smooth(6.5, 8.5)) * (1 - night) : 0 };
}

const img = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
// v28.20 항해 중 배 옆을 흘러가는 작은 섬 (위에서 본 그림, 재고 stock/voyage pass-islands → tools/cut-cells.mjs)
const PASS_ISLANDS = ['pass-volcano.webp?v=v29.32.0-c49194c', 'pass-arch.webp?v=v29.32.0-c49194c', 'pass-turtle.webp?v=v29.32.0-c49194c', 'pass-lighthouse.webp?v=v29.32.0-c49194c', 'pass-atoll.webp?v=v29.32.0-c49194c', 'pass-wreck.webp?v=v29.32.0-c49194c'];

export class VoyageScene {
  constructor(canvas) {
    this.cv = canvas; this.cx = canvas.getContext('2d');
    this.ready = false; this.t = 0; this.play = null; this.W = 0; this.H = 0; this.dpr = 1;
    // 물은 자기 캔버스에 화면으로 바로 그린다(배 장면 캔버스 바로 아래). 매 프레임 2D 로 복사하면 일부 브라우저에서
    // 새·옛 프레임이 띠처럼 섞이거나 검은 칸이 보였다 → 복사는 일기 사진을 찍을 때만 (사진용 물은 따로 하나)
    this.water = new SeaGL(); this.travel = 0; this.photoWater = null;
    this.sunsets = new Map(); this.dawns = new Map(); this.auroras = new Map();
    const w = this.water.cv; w.id = 'voyageSea'; w.style.visibility = 'hidden';
    w.setAttribute('aria-hidden', 'true'); canvas.parentNode.insertBefore(w, canvas);
    this.rain = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), v: 0.8 + Math.random() * 0.6 }));
  }
  // 항해 그림을 읽는다. 끝나기 전에 unload() 되면 false (늦게 온 그림이 놓아준 자리를 되살리지 않는다)
  async load(base = 'assets/') {
    this.base = base;
    const gen = this.gen = (this.gen || 0) + 1;
    const [sea, tall, sheet, kiwi, sleep, umb, seaN, tallN, crewSheet, hull, sail] = await Promise.all(['sea.webp?v=v29.32.0-c49194c', 'sea-tall.webp?v=v29.32.0-c49194c', 'voyage-sprites.webp?v=v29.32.0-c49194c', 'kiwi.webp?v=v29.32.0-c49194c', 'kiwi-sleep.webp?v=v29.32.0-c49194c', 'umbrellas.webp?v=v29.32.0-c49194c', 'sea-night.webp?v=v29.32.0-c49194c', 'sea-tall-night.webp?v=v29.32.0-c49194c', 'voyage-crew.webp?v=v29.32.0-c49194c', 'voyage-boat.webp?v=v29.32.0-c49194c', 'voyage-sail.webp?v=v29.32.0-c49194c'].map(f => img(base + f).catch(() => null)));
    if (gen !== this.gen) return false;
    if (!sea || !sheet) throw new Error('voyage art');
    Object.assign(this, { sea, tall: tall || sea, sheet, kiwi, sleep, umb, seaN, tallN: tallN || seaN, crewSheet });
    this.cells = boxesOf(sheet, 'sheet', CELLS);
    this.crewCells = crewSheet ? boxesOf(crewSheet, 'crew', CREW) : null;
    if (this.crewCells) this.crewRef = this.crewCells.right.h;   // 배율 기준: 옆을 보고 앉은 키위의 높이
    // v27.5 자세별 동작 묶음 — 없어도 되는 그림이라 뒤에서 읽고, 못 읽으면 정지 자세 그대로
    this.crewActs = {};
    for (const [pose, a] of Object.entries(CREW_ACTS)) img(base + a.file).then(im => { if (gen === this.gen) this.crewActs[pose] = im; }).catch(() => {});
    this.crewMore = {};   // v28.12 배 위 동작 더 — 파일 이름으로
    for (const list of Object.values(CREW_MORE)) for (const m of list) for (const v of m.alt ? [m, m.alt] : [m]) img(base + v.file).then(im => { if (gen === this.gen) this.crewMore[v.file] = im; }).catch(() => {});
    // 넓은 배 + 따로 흔들리는 잎 돛 (둘 다 있어야 쓴다 — 아니면 예전 한 장짜리 배)
    if (hull && sail) Object.assign(this, { hull, sail, hullBox: boxesOf(hull, 'hull', ['h'], 1, 1).h, sailBox: boxesOf(sail, 'sail', ['s'], 1, 1).s });
    this.alt = null; this.setBoat(this.boatId);
    this.sailAlt = null; this.setSail(this.sailId);
    // v28.20 지나가는 섬 6 (재고 stock/voyage pass-islands) — 뒤에서 읽고, 오기 전엔 안 지나간다
    this.passArt = []; this.passers = []; this.nextPass = 25 + Math.random() * 30;
    PASS_ISLANDS.forEach((f, i) => img(base + f).then(im => { if (gen === this.gen) this.passArt[i] = im; }).catch(() => {}));
    // v28.20 맑은 밤 항해는 셋에 하나꼴로 오로라 바다 (항해마다 정한다)
    this.auroraOn = Math.random() < 0.35;
    this.ready = true;
    return true;
  }
  // 고른 배 (BOATS id). 나무 보트가 아니면 그 그림 한 장만 뒤에서 읽고, 오기 전까지는 나무 보트로 간다
  setBoat(id) {
    this.boatId = id;
    const b = BOATS.find(x => x.id === id);
    if (!b || !b.h || !this.base) { this.alt = null; return; }
    if (this.alt?.id === id) return;
    const gen = this.gen;
    img(this.base + 'boat-' + id + '.webp?v=v29.32.0-c49194c').then(im => {
      if (gen !== this.gen || this.boatId !== id) return;
      this.alt = { ...b, im, box: boxesOf(im, 'boat-' + id, ['b'], 1, 1).b };
    }).catch(() => {});
  }
  // 고른 돛 (SAILS id) — 배와 같은 방식: 그림이 오기 전까지는 잎 돛
  setSail(id) {
    this.sailId = id;
    if (!id || id === 'leaf' || id === 'none' || !this.base) { this.sailAlt = null; return; }
    if (this.sailAlt?.id === id) return;
    const gen = this.gen;
    img(this.base + 'sail-' + id + '.webp?v=v29.32.0-c49194c').then(im => {
      if (gen !== this.gen || this.sailId !== id) return;
      this.sailAlt = { id, im, box: boxesOf(im, 'sail-' + id, ['s'], 1, 1).s };
    }).catch(() => {});
  }
  // 항해가 끝나면 그림·GPU 텍스처·그리기 버퍼를 놓아준다 — 항해하지 않는 동안은 바다 그림을 들고 있지 않는다 (2026-10-19)
  //  다음 항해 때 load() 로 다시 읽는다(기기 캐시에서). 노을 그림의 실패 기록도 이때 지워 다음 항해에 다시 시도한다
  unload() {
    this.gen = (this.gen || 0) + 1; this.ready = false;
    for (const k of ['sea', 'tall', 'sheet', 'kiwi', 'sleep', 'umb', 'seaN', 'tallN', 'crewSheet', 'hull', 'sail', 'cells', 'crewCells', 'crewRef', 'crewActs', 'hullBox', 'sailBox', 'alt', 'sailAlt', 'crewMore']) this[k] = null;
    this.sunsets.clear(); this.dawns?.clear();
    this.water.release(); this.photoWater?.release();
    this.cv.width = 1; this.cv.height = 1; this.W = 0; this.H = 0;
    this.play = null;
  }
  resize(w, h, dpr = 1) {
    this.W = w; this.H = h; this.dpr = dpr;
    this.waterScale = Math.min(1.6, Math.max(1, dpr * 0.75));   // 고해상도 화면은 물도 촘촘히 (CSS 픽셀의 1~1.6배 — 거품 결이 계단처럼 안 보이게)
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
  }
  show(kind) { if (kind && kind !== 'quiet') this.play = { kind, t: 0 }; }

  // 노을 때 필요한 화면 방향만 읽는다. 실패한 요청을 매 프레임 재시도하지 않는다.
  sunsetArt(tall) {
    if (!this.sunsets.has(tall)) {
      const entry = { image: null };
      entry.promise = img((this.base || 'assets/') + (tall ? 'sea-tall-sunset.webp?v=v29.32.0-c49194c' : 'sea-sunset.webp?v=v29.32.0-c49194c')).then(image => (entry.image = image)).catch(() => null);
      this.sunsets.set(tall, entry);
    }
    return this.sunsets.get(tall).promise;
  }
  // 새벽 그림도 같은 방식 (해 뜰 무렵에만)
  dawnArt(tall) {
    if (!this.dawns.has(tall)) {
      const entry = { image: null };
      entry.promise = img((this.base || 'assets/') + (tall ? 'sea-tall-dawn.webp?v=v29.32.0-c49194c' : 'sea-dawn.webp?v=v29.32.0-c49194c')).then(image => (entry.image = image)).catch(() => null);
      this.dawns.set(tall, entry);
    }
    return this.dawns.get(tall).promise;
  }

  // v28.20 오로라 바다 — 맑은 밤, 이 항해가 오로라 항해일 때만 읽는다
  auroraArt(tall) {
    if (!this.auroras.has(tall)) {
      const entry = { image: null };
      entry.promise = img((this.base || 'assets/') + (tall ? 'sea-tall-aurora.webp?v=v29.32.0-c49194c' : 'sea-aurora.webp?v=v29.32.0-c49194c')).then(image => (entry.image = image)).catch(() => null);
      this.auroras.set(tall, entry);
    }
    return this.auroras.get(tall).promise;
  }
  auroraNow(st) { return this.auroraOn && (st.weather || 'clear') === 'clear' && voyageLight(st.hour).night > 0.2; }

  // st = { frac, crew(명), hour, weather }
  frame(dt, st) {
    this.t += dt; this.travel += dt * SPEED;
    if (this.play && (this.play.t += dt) > PLAY_SECS) this.play = null;
    for (const r of this.rain) { r.y += dt * r.v; if (r.y > 1) { r.y = 0; r.x = Math.random(); } }
    if (!this.ready || !this.W) return;
    const h = st.hour ?? 12;
    if (h >= 16 && h < 20.5) this.sunsetArt(this.H > this.W);
    if (h >= 4.5 && h < 8.5) this.dawnArt(this.H > this.W);
    if (this.auroraNow(st)) this.auroraArt(this.H > this.W);
    const c = this.cx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.paint(c, this.W, this.H, this.t, st, this.play, true);
  }
  // 사건 한가운데를 사진 한 장으로 (화면에 안 보였던 사건도)
  async snapshot(kind, st, w = 1600, h = 900) {
    if (!this.ready) return null;
    if (voyageLight(st.hour).sunset > 0) await this.sunsetArt(h > w);
    if (voyageLight(st.hour).dawn > 0) await this.dawnArt(h > w);
    if (this.auroraNow(st)) await this.auroraArt(h > w);
    // 사진은 배 가까이: 더 넓게 그린 뒤 배와 사건이 들어오는 가운데만 잘라 낸다
    const Z = 0.62, BW = Math.round(w / Z), BH = Math.round(h / Z), big = document.createElement('canvas'); big.width = BW; big.height = BH;
    this.paint(big.getContext('2d'), BW, BH, 37, st, kind && kind !== 'quiet' ? { kind, t: PLAY_SECS * 0.42 } : null);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const y0 = Math.max(0, Math.min(BH - h, Math.round(BH * 0.56 - h * 0.5)));
    cv.getContext('2d').drawImage(big, Math.round((BW - w) / 2), y0, w, h, 0, 0, w, h);
    return new Promise(ok => cv.toBlob(b => ok(b), 'image/webp', 0.86));
  }

  // 지나가는 섬: 1~2분에 하나, 배 왼쪽·오른쪽 멀찍이 물과 같은 빠르기로 위에서 아래로 (밤엔 어둡게)
  drawPassers(c, W, H, u, t, n) {
    const art = this.passArt; if (!art?.length) return;
    if (t > this.nextPass) {
      this.nextPass = t + 60 + Math.random() * 70;
      const ready = art.map((im, i) => (im ? i : -1)).filter(i => i >= 0);
      if (ready.length) { const left = Math.random() < 0.5; this.passers.push({ i: ready[Math.floor(Math.random() * ready.length)], x: left ? 0.13 + Math.random() * 0.06 : 0.87 - Math.random() * 0.06, t0: t, s: 0.24 + Math.random() * 0.08 }); }
    }
    for (const p of this.passers) {
      const im = art[p.i]; if (!im) continue;
      const y = -u * 0.35 + (t - p.t0) * SPEED * u, w = u * p.s, h = w * im.height / im.width;
      c.save(); c.globalAlpha = 1 - n * 0.45; c.drawImage(im, W * p.x - w / 2, y - h / 2, w, h); c.restore();
    }
    this.passers = this.passers.filter(p => -u * 0.35 + (t - p.t0) * SPEED * u < H + u * 0.4);
  }

  paint(c, W, H, t, st, play, screen = false) {
    const tallView = H > W, sea = tallView ? this.tall : this.sea, u = Math.min(W, H);
    const aurora = this.auroraNow(st) ? this.auroras.get(tallView)?.image : null, seaN = aurora || (tallView ? this.tallN : this.seaN);   // v28.20 오로라 항해면 밤 판 대신
    const light = voyageLight(st.hour), n = light.night, sunset = this.sunsets.get(tallView)?.image, dawnImg = this.dawns?.get(tallView)?.image;
    const warm = sunset ? light.sunset : 0, pink = dawnImg && light.dawn ? light.dawn : 0;
    const tint = warm > 0 ? sunset : dawnImg, tintMix = warm || pink;   // 노을과 새벽은 겹치지 않는다
    // 세 장을 한꺼번에 읽지 않고 낮↔노을 또는 노을↔밤 두 장씩만 샘플링한다.
    const first = tintMix > 0 && n > 0 ? tint : sea;
    const next = tintMix > 0 && n === 0 ? tint : seaN || first;
    const imageMix = tintMix > 0 && n === 0 ? tintMix : n;
    const bx = W / 2 + Math.sin(t * 0.37) * u * 0.006, by = H * (tallView ? 0.6 : 0.58) + Math.sin(t * 1.3) * u * 0.004, bh = u * (tallView ? 0.42 : 0.4);
    const wide = !!this.hullBox, alt = wide ? this.alt : null;
    const bh0 = wide ? bh * 0.78 : bh, refW = wide ? bh0 * this.hullBox.w / this.hullBox.h : 0;   // 나무 보트 크기 — 키위 크기·돛 크기의 기준
    const bhh = alt ? bh * alt.h : bh0;   // 넓은 배는 조금 짧게 (고른 배는 그 배 길이)
    const bwGuess = alt ? bhh * alt.box.w / alt.box.h : wide ? refW : this.cells.boat ? bh * this.cells.boat.w / this.cells.boat.h : bh * 0.45;
    // 바다: 물 셰이더가 배 뒤로 흘려 보낸다. 그래픽 호환 경로도 같은 시간/거리로 계속 흐른다.
    const q = this.waterScale ?? WATER_SCALE, gw = Math.max(2, Math.round(W * q)), gh = Math.max(2, Math.round(H * q));
    const sea3 = screen ? this.water : (this.photoWater ||= new SeaGL());
    const gl = sea3.ok && sea3.render(first, gw, gh, { time: t, travel: travelOf(this, t), boat: [bx * q, by * q], boatSize: [bwGuess * q, bhh * q], night: n, nightImg: next, imageMix, sunset: warm + pink * 0.45 });   // 새벽 거품·반짝임은 노을보다 옅게 데움
    if (screen) {
      this.water.cv.style.visibility = gl ? 'visible' : 'hidden';
      this.cv.dataset.renderer = gl ? 'webgl2' : '2d';
    }
    if (gl && screen) { gl.style.width = W + 'px'; gl.style.height = H + 'px'; c.clearRect(0, 0, W, H); }   // 화면: 물은 아래 캔버스, 여기는 투명
    else if (gl) { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(gl, 0, 0, W, H); }   // 사진: 한 번 복사
    else {
      drawSea2D(c, first, W, H, { time: t, travel: travelOf(this, t), nightImg: next, imageMix, night: n, boat: [bx, by], boatSize: [bwGuess, bhh] });
    }
    // 떠나온 섬(처음)과 닿을 섬(끝) — 바닷길 양 끝
    //  물과 같은 빠르기로: 떠나온 섬은 배 뒤로 멀어지고, 닿을 섬은 남은 시간만큼 위에서 다가온다
    if (st.sailed != null) {
      const gone = st.sailed / 1000 * SPEED * u, ahead = (st.left ?? 1e9) / 1000 * SPEED * u;
      if (by + bh * 0.55 + gone < H + u * 0.3) this.sprite(c, 'island', bx - u * 0.32, by + bh * 0.55 + gone, u * 0.42, 1);
      if (by - bh * 0.85 - ahead > -u * 0.3) this.sprite(c, 'island', bx + u * 0.2, by - bh * 0.85 - ahead, u * 0.42, 1);
    }
    // 사건 (배 뒤쪽에 지나가는 것들)
    if (play) this.event(c, W, H, u, bx, by, bh, play, st);
    if (screen && this.life) try { this.life.draw(c, W, H, u, t, n, this, play, SPEED); } catch (e) { this.life = null; console.warn('바다 생물을 끕니다:', e); }   // v28.23 바다 생물 (sea-life.js)
    if (screen) this.drawPassers(c, W, H, u, t, n);   // v28.20 지나가는 섬
    this.halloween?.drawSea(c, W, H, u, t, n, SPEED);   // v28.12 할로윈 밤바다 호박 등불
    this.season?.drawSea(c, W, H, u, t, n, SPEED);   // v28.15 계절 행사 (별 등·청사초롱·튜브)
    // 배 + 키위
    this.drawBoat(c, bx, by, bh, st, play, t);
    // v28 덧그림 (낚싯줄 — fishing.js). 밤 덮개보다 먼저라 같이 어두워진다
    if (this.overlay) try { this.overlay(c, { bx, by, bw: bwGuess, bh: bhh, u, t, night: n }); } catch (e) { this.overlay = null; console.warn('항해 덧그림을 끕니다:', e); }
    // 비
    if (st.weather === 'rain' || st.weather === 'drizzle' || play?.kind === 'leaf') {
      c.strokeStyle = 'rgba(220,235,245,0.35)'; c.lineWidth = 1;
      for (const r of this.rain) { const x = r.x * W, y = r.y * H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + u * 0.025); c.stroke(); }
    }
    // 시간 빛 (밤엔 짙은 남색) — 별똥별·등대 불빛은 그 위에
    // 밤 판을 셰이더가 그렸으면 덮개는 아주 엷게(배·키위만 밤빛으로), 아니면 예전처럼 짙게
    if (warm > 0) { c.fillStyle = `rgba(255,181,128,${0.06 * warm})`; c.fillRect(0, 0, W, H); }
    if (pink > 0) { c.fillStyle = `rgba(255,206,222,${0.05 * pink})`; c.fillRect(0, 0, W, H); }
    if (n > 0) { c.fillStyle = `rgba(12,22,52,${(seaN ? 0.22 : 0.55) * n})`; c.fillRect(0, 0, W, H); }
    if (n > 0.05) this.lantern(c, bx, by, bwGuess, bhh, n, t);
    if (play?.kind === 'meteor') this.meteor(c, W, H, play.t);
    if (play?.kind === 'lighthouse' && n > 0.2 && this.lh) this.beam(c, u, play);
  }
  // 그림 한 칸을 (x,y) 가운데에 높이 h 로. 그린 폭을 돌려준다
  sprite(c, name, x, y, h, a = 1, flip = false) {
    const b = this.cells[name]; if (!b || a <= 0) return 0;
    const w = h * b.w / b.h;
    c.save(); c.globalAlpha *= Math.min(1, a); c.translate(x, y); if (flip) c.scale(-1, 1);
    c.drawImage(this.sheet, b.x, b.y, b.w, b.h, -w / 2, -h / 2, w, h); c.restore();
    return w;
  }
  // 잎 돛: 진짜 돛처럼 — 꼭지를 돛대에 매고 잎맥을 붐 삼아 배 뒤쪽 옆으로 펼친다(순풍에 붐을 내민 모양).
  // 항해와 꾸미기 정지 미리보기가 같은 배·돛·키위 합성 순서를 쓴다.
  drawBoat(c, bx, by, bh, st, play = null, t = 0) {
    const wide = !!this.hullBox, alt = wide ? this.alt : null;
    const bh0 = wide ? bh * 0.78 : bh, refW = wide ? bh0 * this.hullBox.w / this.hullBox.h : 0;
    const bhh = alt ? bh * alt.h : bh0;
    const bwGuess = alt ? bhh * alt.box.w / alt.box.h : wide ? refW : this.cells.boat ? bh * this.cells.boat.w / this.cells.boat.h : bh * 0.45;
    const rock = Math.sin(t * 1.1) * 0.035;
    c.save(); c.translate(bx, by); c.rotate(rock);
    if (wide) {
      // 순서: 배 → 돛 → 키위 (돛이 흔들려도 키위 얼굴은 늘 보인다)
      if (alt) { const b = alt.box; c.drawImage(alt.im, b.x, b.y, b.w, b.h, -bwGuess / 2, -bhh / 2, bwGuess, bhh); }
      else { const hb = this.hullBox; c.drawImage(this.hull, hb.x, hb.y, hb.w, hb.h, -bwGuess / 2, -bhh / 2, bwGuess, bhh); }
      // 돛은 늘 나무 보트 크기로, 돛대 자리만 그 배의 뱃머리에
      this.sailSway(c, refW, bh0, st, t, -bhh * (alt?.mast ?? MAST_Y), bwGuess);
      this.crew(c, refW, bhh, st, play, t, alt?.seats);
    } else {
      const bw = this.sprite(c, 'boat', 0, 0, bh, 1);
      this.crew(c, bw, bh, st, play, t);
    }
    c.restore();
  }
  //  위에서 비스듬히 본 천처럼 폭을 좁히고, 바람을 받아 부풀었다 줄었다 한다. 붐 끝에서 고물로 줄 하나.
  sailSway(c, bw, bh, st, t, mastY = -bh * MAST_Y, hullW = bw) {
    if (this.sailId === 'none') return;   // v29.15 돛 없음
    const sa = this.sailAlt, sb = sa ? sa.box : this.sailBox, sailIm = sa ? sa.im : this.sail, wind = st.weather === 'wind' || st.weather === 'blossom' ? 1.8 : st.weather === 'rain' ? 1.4 : 1;
    const mx = 0, my = mastY, sternY = -my * 0.44 / MAST_Y;   // 고른 배는 길이가 달라 돛대·고물 자리가 그 배를 따른다
    const a = -0.62 + wind * (0.05 * Math.sin(t * 0.7) + 0.025 * Math.sin(t * 1.9 + 1.1));   // 0 = 바로 뒤, 음수 = 오른쪽으로
    const lh = bh * 0.95, lw = lh * sb.w / sb.h, belly = 0.5 + wind * 0.08 * (0.6 + 0.4 * Math.sin(t * 1.3)) + 0.03 * Math.sin(t * 4.1);
    // 붐 끝 → 고물로 줄
    const ex = mx - Math.sin(a) * lh * 0.92, ey = my + Math.cos(a) * lh * 0.92;
    c.strokeStyle = 'rgba(70,50,30,0.55)'; c.lineWidth = Math.max(1, bh * 0.006);
    c.beginPath(); c.moveTo(ex, ey); c.quadraticCurveTo((ex + 0) / 2 + bw * 0.05, (ey + sternY * 1.05) / 2 + bh * 0.04, hullW * 0.12, sternY); c.stroke();
    c.save(); c.translate(mx, my); c.rotate(a);
    c.scale(belly, 1);   // 비스듬히 본 천 — 바람에 부푼 만큼 넓어 보인다
    c.translate(lw * 0.18, 0);   // 잎이 붐(잎맥)의 바람 아래쪽으로 불룩하게
    c.drawImage(sailIm, sb.x, sb.y, sb.w, sb.h, -lw * SAIL_STEM_X, -lh * 0.02, lw, lh);
    c.restore();
    // 돛대 (잎 위로 살짝 보이게)
    c.fillStyle = '#6b4a2e'; c.beginPath(); c.arc(mx, my, bw * 0.045, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,230,190,0.5)'; c.beginPath(); c.arc(mx - bw * 0.012, my - bw * 0.012, bw * 0.018, 0, Math.PI * 2); c.fill();
  }
  crew(c, bw, bh, st, play, t, seats = WIDE_SEATS) {
    const n = Math.max(1, Math.min(this.hullBox ? (seats || WIDE_SEATS).length : 3, st.crew || 3));   // 큰 배는 자리 수만큼 (최대 10)
    if (!this.crewCells) return this.crewOld(c, bw, bh, st, play, t, n);
    // 배에 탄 키위 (voyage-crew.webp): 평소엔 앞을 보다가 가끔 두리번, 사건이 오면 그쪽을 본다
    const side = st.side ?? 1, k = play?.kind, kh = this.hullBox ? bw * 0.43 : bh * 0.22;
    for (let i = 0; i < n; i++) {
      let pose = i === 0 ? 'up' : (Math.sin(t * 0.21 + i * 2.3) > 0.55 ? (i % 2 ? 'left' : 'right') : 'up');
      if (k === 'whale') pose = i === 1 ? 'wave' : side > 0 ? 'right' : 'left';
      else if (k === 'seabird' || k === 'lighthouse') pose = (k === 'seabird' ? -side : side) > 0 ? 'right' : 'left';
      else if (k === 'meteor') pose = 'sky';
      else if (k === 'doze' && i === n - 1) pose = 'sleep';
      // 여섯 자세는 원본에서 같은 크기로 그려졌다 → 같은 배율로, 몸 아래 가운데를 앉는 자리에 맞춘다 (부리·날개 때문에 크기가 달라 보이지 않게)
      const b = this.crewCells[pose] || this.crewCells.up, k2 = kh / this.crewRef, w = b.w * k2, h = b.h * k2, ax = CREW_AX[pose] ?? 0.5;
      const [x, y] = this.hullBox ? (seats || WIDE_SEATS)[i].map((v, j) => v * (j ? bh : bw)) : [-bw * 0.13 + (i % 2 ? bw * 0.06 : 0), -bh * 0.25 + i * bh * 0.2];
      // 그 자세의 동작이 있으면 rest 초 쉬었다 한 번 (키위마다 1.7초씩 엇갈려) — 동작 중엔 통통 뛰기를 멈춘다
      //  (v28.12) 사건이 없을 땐 그 자세의 다른 동작(CREW_MORE)과 7초 칸마다 번갈아 — 키위마다 다른 것을 고른다
      const A0 = CREW_ACTS[pose], ai0 = A0 && this.crewActs?.[pose], opts = ai0 ? [[A0, ai0]] : [];
      if (!k) for (const m of CREW_MORE[pose] || []) { const im = this.crewMore?.[m.file]; if (im) opts.push([m, im]); }
      let f = -1, A = A0, ai = ai0;
      if (opts.length === 1) { const len = A.n / A.fps, ph = (t + i * 1.7) % (len + (A.rest ?? 2.5)); if (ph < len) f = Math.min(A.n - 1, Math.floor(ph * A.fps)); }
      else if (opts.length) {
        const tt = t + i * 1.7, slot = Math.floor(tt / 7);
        [A, ai] = opts[(slot * 5 + i * 3) % opts.length];
        if (A.alt && (slot + i) % 2) { const im = this.crewMore?.[A.alt.file]; if (im) [A, ai] = [A.alt, im]; }   // v28.14 같은 동작의 다른 판
        const ph = tt % 7, len = A.n / A.fps; if (ph < len) f = Math.min(A.n - 1, Math.floor(ph * A.fps));
      }
      const hop = pose === 'sleep' || f >= 0 ? 0 : Math.max(0, Math.sin(t * 1.7 + i * 2.1)) * kh * 0.035;
      const dx = x - w * ax, dy = y + kh * 0.42 - h - hop;
      if (f >= 0) c.drawImage(ai, (f % A.cols) * A.fw, Math.floor(f / A.cols) * A.fh, A.fw, A.fh, dx + A.ox * k2, dy + A.oy * k2, A.w * k2, A.h * k2);
      else c.drawImage(this.crewSheet, b.x, b.y, b.w, b.h, dx, dy, w, h);
      if (pose === 'sleep') { c.fillStyle = 'rgba(255,255,255,0.9)'; c.font = `600 ${Math.round(kh * 0.32)}px sans-serif`; const z = (t * 0.6) % 1; c.globalAlpha = 1 - z; c.fillText('z', x + w * 0.35, y - h * 0.5 - z * kh * 0.6); c.globalAlpha = 1; }
    }
    this.leafOver(c, bw, bh, play);
  }
  // 예전 그림(섬의 옆모습 키위) — 새 그림을 못 읽었을 때만
  crewOld(c, bw, bh, st, play, t, n) {
    const kh = bh * 0.26;
    for (let i = 0; i < n; i++) {
      const y = -bh * 0.24 + i * bh * 0.21, x = -bw * 0.2 + (i % 2 ? bw * 0.05 : 0), dozing = play?.kind === 'doze' && i === n - 1;
      const im = dozing && this.sleep ? this.sleep : this.kiwi; if (!im) continue;
      const h = kh * (dozing ? 0.85 : 1), w = h * im.width / im.height;
      c.save(); c.translate(x, y); if (i % 2) c.scale(-1, 1); c.drawImage(im, -w / 2, -h / 2, w, h); c.restore();
    }
    this.leafOver(c, bw, bh, play);
  }
  leafOver(c, bw, bh, play) {
    if (play?.kind === 'leaf' && this.umb) {   // 잎 하나를 같이 쓴다 (umbrellas.webp 2×2 의 첫 칸)
      const s = this.umb.width / 2, w = bw * 0.95, h = w * (this.umb.height / 2) / s, a = Math.min(1, play.t / 1.2, (PLAY_SECS - play.t) / 1.2);
      c.save(); c.globalAlpha = Math.max(0, a); c.drawImage(this.umb, 0, 0, s, this.umb.height / 2, -w / 2 - bw * 0.02, -bh * 0.36, w, h); c.restore();
    }
  }
  event(c, W, H, u, bx, by, bh, play, st) {
    const p = play.t / PLAY_SECS, fade = Math.min(1, play.t / 1.5, (PLAY_SECS - play.t) / 1.5), side = st.side ?? 1;
    const drift = (play.t - PLAY_SECS / 2) * u * SPEED;   // 옆 것들은 물과 같은 빠르기로 아래로 지나간다
    if (play.kind === 'whale') {
      const tall = H > W, x = bx + side * u * (tall ? 0.28 : 0.36), y = by - bh * (tall ? 0.55 : 0.15) + drift, s = tall ? 0.2 : 0.24;   // 세로 화면은 폭이 좁아 배 앞쪽 비스듬히
      if (p < 0.6) this.sprite(c, 'whale', x, y, u * s, fade * Math.min(1, (0.6 - p) / 0.08), side < 0);
      else this.sprite(c, 'tail', x, y + u * 0.02, u * (s + 0.02), fade * Math.min(1, (p - 0.6) / 0.06));
    } else if (play.kind === 'seabird') {
      this.sprite(c, 'seabird', bx - side * u * 0.3, by - bh * 0.25 + drift * 1.2, u * 0.11, fade, side > 0);
    } else if (play.kind === 'lighthouse') {
      const h = u * 0.26; this.lh = { x: bx + side * u * 0.4, y: by - bh * 0.28 + drift, h };
      this.sprite(c, 'lighthouse', this.lh.x, this.lh.y, h, fade);
    }
  }
  // 뱃머리 등불: 작은 불씨와 따뜻한 빛 (밤 덮개 위에 그려서 배·키위가 은은히 밝다)
  lantern(c, bx, by, bw, bh, n, t) {
    const x = bx + (this.hullBox ? 0 : -bw * 0.03), y = by - bh * (this.hullBox ? MAST_Y : 0.45), fl = 0.92 + 0.08 * Math.sin(t * 7.3) * Math.sin(t * 3.1), r = bh * 0.55;
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,190,110,${0.32 * n * fl})`); g.addColorStop(0.35, `rgba(255,160,80,${0.12 * n * fl})`); g.addColorStop(1, 'rgba(255,150,70,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = `rgba(255,230,170,${0.95 * n})`; c.beginPath(); c.arc(x, y, bh * 0.018, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  meteor(c, W, H, t) {
    for (const [at, y0] of [[1.2, 0.12], [6.5, 0.2]]) {
      const p = (t - at) / 1.4; if (p < 0 || p > 1) continue;
      const x = W * (0.85 - p * 0.6), y = H * (y0 + p * 0.12), len = Math.min(W, H) * 0.18;
      const g = c.createLinearGradient(x, y, x + len, y - len * 0.2); g.addColorStop(0, `rgba(255,250,220,${1 - p * 0.6})`); g.addColorStop(1, 'rgba(255,250,220,0)');
      c.strokeStyle = g; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y - len * 0.2); c.stroke();
    }
  }
  beam(c, u, play) {
    if (Math.sin(play.t * 2.4 + 1) <= 0.3) return;   // 깜빡 (사진 찍는 순간엔 켜져 있게)
    const { x, h } = this.lh, y = this.lh.y - h * 0.3;
    const g = c.createRadialGradient(x, y, 0, x, y, u * 0.12); g.addColorStop(0, 'rgba(255,236,170,0.9)'); g.addColorStop(1, 'rgba(255,236,170,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, u * 0.12, 0, Math.PI * 2); c.fill();
  }
}

// 3×2 시트에서 칸마다 실제로 그려진 곳(알파)만 찾는다 — 생성 그림은 칸 안 위치가 제각각이라
// 시트 칸 위치(cellBoxes 가 지금 그림에서 찾은 값 그대로, 2026-10-19). 항해할 때마다 큰 시트를 줄여 그리고 픽셀을 다시 읽느라
//  메인 스레드가 약 0.45초 멈췄다(이 맥) → 그림 크기가 같으면 이 값을 쓰고, 그림을 바꿔 크기가 다르면 예전처럼 직접 찾는다.
//  그림을 크기 그대로 다시 칠했다면 이 표를 지우거나 test/voyage-boxes.test.mjs 안내대로 다시 받아 적는다.
const KNOWN_BOXES = {
  sheet: { size: [3600, 2418], boxes: { boat: { x: 376, y: 176, w: 480, h: 852 }, whale: { x: 1408, y: 280, w: 816, h: 592 }, tail: { x: 2652, y: 272, w: 672, h: 712 }, seabird: { x: 280, y: 1552, w: 628, h: 396 }, lighthouse: { x: 1544, y: 1400, w: 536, h: 680 }, island: { x: 2720, y: 1340, w: 580, h: 712 } } },
  crew: { size: [3000, 2015], boxes: { up: { x: 176, y: 120, w: 632, h: 768 }, left: { x: 1028, y: 224, w: 864, h: 600 }, right: { x: 2096, y: 260, w: 860, h: 548 }, sleep: { x: 144, y: 1224, w: 712, h: 588 }, sky: { x: 1212, y: 1060, w: 544, h: 776 }, wave: { x: 2228, y: 1176, w: 548, h: 636 } } },
  hull: { size: [1600, 1600], boxes: { h: { x: 408, y: 128, w: 784, h: 1340 } } },
  sail: { size: [1400, 1879], boxes: { s: { x: 308, y: 240, w: 736, h: 1372 } } },
};
export function boxesOf(sheet, key, names, cols, rows) {
  const k = KNOWN_BOXES[key], w = sheet.naturalWidth || sheet.width, h = sheet.naturalHeight || sheet.height;
  if (k && k.size[0] === w && k.size[1] === h && names.every(n => k.boxes[n])) return Object.fromEntries(names.map(n => [n, { ...k.boxes[n] }]));
  return cellBoxes(sheet, names, cols, rows);
}
export function cellBoxes(sheet, names, cols = 3, rows = 2) {
  const S = 4, w = Math.floor(sheet.width / S), h = Math.floor(sheet.height / S);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(sheet, 0, 0, w, h);
  const d = c.getImageData(0, 0, w, h).data, out = {};
  names.forEach((name, i) => {
    const cx0 = Math.floor((i % cols) * w / cols), cy0 = Math.floor(Math.floor(i / cols) * h / rows), cw = Math.floor(w / cols), ch = Math.floor(h / rows);
    let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (d[((cy0 + y) * w + cx0 + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return;
    out[name] = { x: (cx0 + x0) * S, y: (cy0 + y0) * S, w: (x1 - x0 + 1) * S, h: (y1 - y0 + 1) * S };
  });
  return out;
}

// 사진(snapshot)은 고정 시각으로 그리므로 흘러간 거리도 그 시각에서 계산한다
function travelOf(scene, t) { return t === scene.t ? scene.travel : t * SPEED; }
