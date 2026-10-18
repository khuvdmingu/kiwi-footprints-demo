// voyage-scene.js — 항해 중 바다 장면 (2D 캔버스 한 장, 섬 장면 위에 덮는다)
//
//  그림(Higgsfield, 2026-10-18): assets/sea.webp · sea-tall.webp(바다 판) · sea-night.webp · sea-tall-night.webp(같은 구도의 밤바다), voyage-sprites.webp(3×2: 배·고래 등·고래 꼬리·쉬는 새·등대 섬·야자 섬)
//  배는 화면 가운데 조금 아래에 떠 있고, 물결·잔물결이 아래로 흘러 앞으로 가는 것처럼 보인다.
//  키위는 섬에서 쓰는 그림(kiwi.webp·kiwi-sleep.webp)을 그대로 배에 태운다.
//  사건(voyage.js 의 kind)을 받으면 12초쯤 그 장면을 보여 준다. snapshot() 은 같은 장면을 사진 한 장으로 다시 그린다
//  (화면을 꺼 두었던 사이의 사건도 일기 사진을 남길 수 있게).

import { SeaGL } from './voyage-water.js?v=v25.5.0';

export const SPEED = 0.05;   // 배가 가는 빠르기: 1초에 화면 짧은 변의 5% (물·잔물결·지나가는 것이 모두 이 빠르기로 흐른다)
const WATER_SCALE = 0.75;     // 물은 화면보다 성기게 그린다 (배터리·발열 — 물결은 흐려도 티가 안 난다)
const CREW = ['up', 'left', 'right', 'sleep', 'sky', 'wave'];
const CREW_AX = { up: 0.42, left: 0.62, right: 0.4, sleep: 0.5, sky: 0.42, wave: 0.42 };   // 자세마다 몸통 가운데의 가로 위치(부리·날개 빼고)   // voyage-crew.webp 3×2: 앞 보기 · 왼쪽 · 오른쪽 · 잠 · 하늘 보기 · 손 흔들기
// 넓은 배: 돛대 자리(배 높이 비율, 위로) · 돛 꼭지의 가로 위치(돛 그림 폭 비율) · 키위 자리 [x(배 폭 비율), y(배 높이 비율)]
const MAST_Y = 0.41, SAIL_STEM_X = 0.5;
const WIDE_SEATS = [[-0.19, -0.04], [0.19, -0.04], [0, 0.26]];   // 가운데 의자 둘 · 뒷의자 하나
const CELLS = ['boat', 'whale', 'tail', 'seabird', 'lighthouse', 'island'];   // 3×2 순서
export const PLAY_SECS = 12;
export function voyageLight(hour = 12) {
  const h = ((hour % 24) + 24) % 24;
  const smooth = (a, b) => { const k = Math.max(0, Math.min(1, (h - a) / (b - a))); return k * k * (3 - 2 * k); };
  const night = h < 6.5 ? 1 - smooth(5, 6.5) : smooth(18.5, 20.5);
  return { night, sunset: smooth(16.5, 18.5) * (1 - night) };
}

const img = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

export class VoyageScene {
  constructor(canvas) {
    this.cv = canvas; this.cx = canvas.getContext('2d');
    this.ready = false; this.t = 0; this.play = null; this.W = 0; this.H = 0; this.dpr = 1;
    // 물은 자기 캔버스에 화면으로 바로 그린다(배 장면 캔버스 바로 아래). 매 프레임 2D 로 복사하면 일부 브라우저에서
    // 새·옛 프레임이 띠처럼 섞이거나 검은 칸이 보였다 → 복사는 일기 사진을 찍을 때만 (사진용 물은 따로 하나)
    this.water = new SeaGL(); this.travel = 0; this.photoWater = null;
    this.sunsets = new Map();
    if (this.water.ok) { const w = this.water.cv; w.id = 'voyageSea'; w.setAttribute('aria-hidden', 'true'); canvas.parentNode.insertBefore(w, canvas); }
    this.rain = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), v: 0.8 + Math.random() * 0.6 }));
  }
  async load(base = 'assets/') {
    this.base = base;
    const [sea, tall, sheet, kiwi, sleep, umb, seaN, tallN, crewSheet, hull, sail] = await Promise.all(['sea.webp?v=v25.5.0', 'sea-tall.webp?v=v25.5.0', 'voyage-sprites.webp?v=v25.5.0', 'kiwi.webp?v=v25.5.0', 'kiwi-sleep.webp?v=v25.5.0', 'umbrellas.webp?v=v25.5.0', 'sea-night.webp?v=v25.5.0', 'sea-tall-night.webp?v=v25.5.0', 'voyage-crew.webp?v=v25.5.0', 'voyage-boat.webp?v=v25.5.0', 'voyage-sail.webp?v=v25.5.0'].map(f => img(base + f).catch(() => null)));
    if (!sea || !sheet) throw new Error('voyage art');
    Object.assign(this, { sea, tall: tall || sea, sheet, kiwi, sleep, umb, seaN, tallN: tallN || seaN, crewSheet });
    this.cells = cellBoxes(sheet, CELLS);
    this.crewCells = crewSheet ? cellBoxes(crewSheet, CREW) : null;
    if (this.crewCells) this.crewRef = this.crewCells.right.h;   // 배율 기준: 옆을 보고 앉은 키위의 높이
    // 넓은 배 + 따로 흔들리는 잎 돛 (둘 다 있어야 쓴다 — 아니면 예전 한 장짜리 배)
    if (hull && sail) Object.assign(this, { hull, sail, hullBox: cellBoxes(hull, ['h'], 1, 1).h, sailBox: cellBoxes(sail, ['s'], 1, 1).s });
    this.ready = true;
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
      entry.promise = img((this.base || 'assets/') + (tall ? 'sea-tall-sunset.webp?v=v25.5.0' : 'sea-sunset.webp?v=v25.5.0')).then(image => (entry.image = image)).catch(() => null);
      this.sunsets.set(tall, entry);
    }
    return this.sunsets.get(tall).promise;
  }

  // st = { frac, crew(명), hour, weather }
  frame(dt, st) {
    this.t += dt; this.travel += dt * SPEED;
    if (this.play && (this.play.t += dt) > PLAY_SECS) this.play = null;
    for (const r of this.rain) { r.y += dt * r.v; if (r.y > 1) { r.y = 0; r.x = Math.random(); } }
    if (!this.ready || !this.W) return;
    const h = st.hour ?? 12;
    if (h >= 16 && h < 20.5) this.sunsetArt(this.H > this.W);
    const c = this.cx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.paint(c, this.W, this.H, this.t, st, this.play, true);
  }
  // 사건 한가운데를 사진 한 장으로 (화면에 안 보였던 사건도)
  async snapshot(kind, st, w = 1600, h = 900) {
    if (!this.ready) return null;
    if (voyageLight(st.hour).sunset > 0) await this.sunsetArt(h > w);
    // 사진은 배 가까이: 더 넓게 그린 뒤 배와 사건이 들어오는 가운데만 잘라 낸다
    const Z = 0.62, BW = Math.round(w / Z), BH = Math.round(h / Z), big = document.createElement('canvas'); big.width = BW; big.height = BH;
    this.paint(big.getContext('2d'), BW, BH, 37, st, kind && kind !== 'quiet' ? { kind, t: PLAY_SECS * 0.42 } : null);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const y0 = Math.max(0, Math.min(BH - h, Math.round(BH * 0.56 - h * 0.5)));
    cv.getContext('2d').drawImage(big, Math.round((BW - w) / 2), y0, w, h, 0, 0, w, h);
    return new Promise(ok => cv.toBlob(b => ok(b), 'image/webp', 0.86));
  }

  paint(c, W, H, t, st, play, screen = false) {
    const tallView = H > W, sea = tallView ? this.tall : this.sea, seaN = tallView ? this.tallN : this.seaN, u = Math.min(W, H);
    const light = voyageLight(st.hour), n = light.night, sunset = this.sunsets.get(tallView)?.image;
    const warm = sunset ? light.sunset : 0;
    // 세 장을 한꺼번에 읽지 않고 낮↔노을 또는 노을↔밤 두 장씩만 샘플링한다.
    const first = warm > 0 && n > 0 ? sunset : sea;
    const next = warm > 0 && n === 0 ? sunset : seaN || first;
    const imageMix = warm > 0 && n === 0 ? warm : n;
    const bx = W / 2 + Math.sin(t * 0.37) * u * 0.006, by = H * (tallView ? 0.6 : 0.58) + Math.sin(t * 1.3) * u * 0.004, bh = u * (tallView ? 0.42 : 0.4);
    const wide = !!this.hullBox, bhh = wide ? bh * 0.78 : bh;   // 넓은 배는 조금 짧게
    const bwGuess = wide ? bhh * this.hullBox.w / this.hullBox.h : this.cells.boat ? bh * this.cells.boat.w / this.cells.boat.h : bh * 0.45;
    // 바다: 물 셰이더가 배 뒤로 흘려 보낸다 (안 되면 정지 그림)
    const q = this.waterScale ?? WATER_SCALE, gw = Math.max(2, Math.round(W * q)), gh = Math.max(2, Math.round(H * q));
    const sea3 = screen ? this.water : (this.photoWater ||= new SeaGL());
    const gl = sea3.ok && sea3.render(first, gw, gh, { time: t, travel: travelOf(this, t), boat: [bx * q, by * q], boatSize: [bwGuess * q, bhh * q], night: n, nightImg: next, imageMix, sunset: warm });
    if (gl && screen) { gl.style.width = W + 'px'; gl.style.height = H + 'px'; c.clearRect(0, 0, W, H); }   // 화면: 물은 아래 캔버스, 여기는 투명
    else if (gl) { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(gl, 0, 0, W, H); }   // 사진: 한 번 복사
    else {
      const k = Math.max(W / first.width, H / first.height) * 1.1, sw = first.width * k, sh = first.height * k;
      c.drawImage(first, (W - sw) / 2, (H - sh) / 2, sw, sh);
      if (next !== first && imageMix > 0) { c.save(); c.globalAlpha = imageMix; c.drawImage(next, (W - sw) / 2, (H - sh) / 2, sw, sh); c.restore(); }
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
    // 배 + 키위
    const rock = Math.sin(t * 1.1) * 0.035;
    c.save(); c.translate(bx, by); c.rotate(rock);
    if (wide) {
      // 순서: 배 → 돛 → 키위 (돛이 흔들려도 키위 얼굴은 늘 보인다)
      const hb = this.hullBox; c.drawImage(this.hull, hb.x, hb.y, hb.w, hb.h, -bwGuess / 2, -bhh / 2, bwGuess, bhh);
      this.sailSway(c, bwGuess, bhh, st, t);
      this.crew(c, bwGuess, bhh, st, play, t);
    } else {
      const bw = this.sprite(c, 'boat', 0, 0, bh, 1);
      this.crew(c, bw, bh, st, play, t);
    }
    c.restore();
    // 비
    if (st.weather === 'rain' || st.weather === 'drizzle' || play?.kind === 'leaf') {
      c.strokeStyle = 'rgba(220,235,245,0.35)'; c.lineWidth = 1;
      for (const r of this.rain) { const x = r.x * W, y = r.y * H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + u * 0.025); c.stroke(); }
    }
    // 시간 빛 (밤엔 짙은 남색) — 별똥별·등대 불빛은 그 위에
    // 밤 판을 셰이더가 그렸으면 덮개는 아주 엷게(배·키위만 밤빛으로), 아니면 예전처럼 짙게
    if (warm > 0) { c.fillStyle = `rgba(255,181,128,${0.06 * warm})`; c.fillRect(0, 0, W, H); }
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
  //  위에서 비스듬히 본 천처럼 폭을 좁히고, 바람을 받아 부풀었다 줄었다 한다. 붐 끝에서 고물로 줄 하나.
  sailSway(c, bw, bh, st, t) {
    const sb = this.sailBox, wind = st.weather === 'wind' || st.weather === 'blossom' ? 1.8 : st.weather === 'rain' ? 1.4 : 1;
    const mx = 0, my = -bh * MAST_Y;
    const a = -0.62 + wind * (0.05 * Math.sin(t * 0.7) + 0.025 * Math.sin(t * 1.9 + 1.1));   // 0 = 바로 뒤, 음수 = 오른쪽으로
    const lh = bh * 0.95, lw = lh * sb.w / sb.h, belly = 0.5 + wind * 0.08 * (0.6 + 0.4 * Math.sin(t * 1.3)) + 0.03 * Math.sin(t * 4.1);
    // 붐 끝 → 고물로 줄
    const ex = mx - Math.sin(a) * lh * 0.92, ey = my + Math.cos(a) * lh * 0.92;
    c.strokeStyle = 'rgba(70,50,30,0.55)'; c.lineWidth = Math.max(1, bh * 0.006);
    c.beginPath(); c.moveTo(ex, ey); c.quadraticCurveTo((ex + 0) / 2 + bw * 0.05, (ey + bh * 0.46) / 2 + bh * 0.04, bw * 0.12, bh * 0.44); c.stroke();
    c.save(); c.translate(mx, my); c.rotate(a);
    c.scale(belly, 1);   // 비스듬히 본 천 — 바람에 부푼 만큼 넓어 보인다
    c.translate(lw * 0.18, 0);   // 잎이 붐(잎맥)의 바람 아래쪽으로 불룩하게
    c.drawImage(this.sail, sb.x, sb.y, sb.w, sb.h, -lw * SAIL_STEM_X, -lh * 0.02, lw, lh);
    c.restore();
    // 돛대 (잎 위로 살짝 보이게)
    c.fillStyle = '#6b4a2e'; c.beginPath(); c.arc(mx, my, bw * 0.045, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,230,190,0.5)'; c.beginPath(); c.arc(mx - bw * 0.012, my - bw * 0.012, bw * 0.018, 0, Math.PI * 2); c.fill();
  }
  crew(c, bw, bh, st, play, t) {
    const n = Math.max(1, Math.min(3, st.crew || 3));
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
      const [x, y] = this.hullBox ? WIDE_SEATS[i].map((v, j) => v * (j ? bh : bw)) : [-bw * 0.13 + (i % 2 ? bw * 0.06 : 0), -bh * 0.25 + i * bh * 0.2];
      const hop = pose === 'sleep' ? 0 : Math.max(0, Math.sin(t * 1.7 + i * 2.1)) * kh * 0.035;
      c.drawImage(this.crewSheet, b.x, b.y, b.w, b.h, x - w * ax, y + kh * 0.42 - h - hop, w, h);
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
function cellBoxes(sheet, names, cols = 3, rows = 2) {
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
