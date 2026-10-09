// main.js — 발자국 한글 v8: 화면 층·입력·카메라 시점·키위 무리 지휘
//
// v8 = 사용자 그림을 거의 그대로: 배경은 그림 판(plate.js), 바다는 그 그림을 움직이는 WebGL(water.js), 키위·갈매기 몸도 같은 그림체 그림.
// 층 (아래 → 위): #plate WebGL(그림 판 + 살아 있는 바다) → #stage Canvas(발자국·키위) → #canopy(그림에서 오린 숲 잎, 키위가 덤불 뒤로 숨는다)
//   → #clouds Canvas(빛안개·긴 그림자) → #tint(시간 빛) → #fx(갈매기·비·눈·반딧불이·♪) → #glow(골든아워) · #grain(그레인)
//   세 층을 #world 하나로 묶어 카메라(시점)를 CSS 변환으로 건다.
// 시점: top 위에서 내려다보기 · diorama 비스듬히 기울인 미니어처(위아래 흐림) · follow 쓰는 키위를 따라 확대
// 흐름: 문장 확정 → (앞 글씨가 있으면) 큰 파도 + 키위들 "!" 하고 숲으로 도망 → 물이 빠지면 숲에서 걸어 나와 획을 맡아 쓴다
//       → 다 쓰면 폴짝폴짝 → 잠시 뒤 파도. 비어 있을 땐 한두 마리가 산책한다.
// 주소 옵션: ?text= · ?seed= · ?speed= · ?hold= · ?sound=0 · ?view=top|diorama|follow · ?debug
//           ?mode=free|clock|quote|word · ?weather=clear|cloudy|rain|snow|fog|wind · ?hour=0~24 (시간 빛 미리보기)
// v4.1: 시간 빛(실제 시각)·날씨(atmos.js) — 층 위에 #tint(곱하기) 와 #fx(비·눈·안개·반딧불이) 를 더 얹는다.
//       글 모드: 직접 쓰기 · 시계(매 분 지금 시각) · 명언 · 단어장(content.js). 다 쓰면 뜻·출처 캡션이 드러난다.
// v5: 소리 — 발자국 음악(획 위 발자국마다 지금 화음의 음, 위쪽일수록 높고 키위 쪽에서 들린다, 작은 ♪ 가 떠오른다),
//     시간대·날씨에 따라 바뀌는 배경 음악(music.js), 좌우 위치·잔향, 다 쓰면 키위 합창, 믹서(소리 버튼).
// v6 에서 픽셀 모드는 뺐다 (어떤 해상도에서도 선명한 벡터 원칙과 충돌). v2~v5 브랜치에 남아 있다.

import { layoutText, strokesOf, glyph } from './hangul.js';
import { Beach } from './beach.js';
import { Kiwi } from './kiwi.js';
import { Sound } from './sound.js';
import { loadPlate } from './plate.js';
import { MAPS, MAP_IDS } from './maps.js';
import { WaterGL } from './water.js';
import { setKiwiSprite } from './kiwi.js';
import { Clouds } from './clouds.js';
import { Gulls } from './gulls.js';
import { Atmos, WEATHERS, WEATHER_NAME } from './atmos.js';
import { MODES, MODE_NAME, QUOTES, WORDS, Deck, clockText, isClock, CLOCK_FMTS } from './content.js';
import { clamp, dist } from './util.js';

const q = new URLSearchParams(location.search);
const num = (k, d) => { const v = q.get(k); return v != null && v !== '' && !isNaN(+v) ? +v : d; };
const SEED = num('seed', 7);
const SPEED = clamp(num('speed', 1), 0.25, 6);
const HOLD = Math.max(1, num('hold', 9));
const DEBUG = q.has('debug');
const FIRST = q.get('text') || '안녕 키위';
const VIEWS = ['top', 'diorama', 'follow'];
const VIEW_NAME = { top: '위에서', diorama: '디오라마', follow: '따라가기' };

const worldEl = document.getElementById('world');
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const plateEl = document.getElementById('plate'), canopyEl = document.getElementById('canopy');
let plate = null, water = null;
// 판 두 벌: 가로 화면은 plate*, 세로로 긴 화면(휴대폰)은 tall* — 처음 필요할 때 읽어 둔다
const plates = {};
// 장소: ?map= 이 기기에 저장된 값보다 먼저
let mapId = MAP_IDS.includes(q.get('map')) ? q.get('map') : MAP_IDS.includes(saved('map')) ? saved('map') : 'beach';
const plateFor = (w, h) => MAPS[mapId][w / h < 0.8 ? 'tall' : 'wide'];
function getPlate(name) { const m = Object.values(MAPS).find(v => v.wide === name || v.tall === name) || {}; return (plates[name] ||= loadPlate('assets/', name, { stones: !!m.stones, shoreFrom: m.shoreFrom })); }
const cloudCanvas = document.getElementById('clouds'), cctx = cloudCanvas.getContext('2d');
const glowEl = document.getElementById('glow');
const clouds = new Clouds();
const gulls = new Gulls();   // v7: 바다 위 갈매기
const beach = new Beach(SEED);
const sound = new Sound({ enabled: q.get('sound') !== '0' });
const fxCanvas = document.getElementById('fx');
const fctx = fxCanvas.getContext('2d');
const tintEl = document.getElementById('tint');
const captionEl = document.getElementById('caption');
const saved = k => { try { return localStorage.getItem('kiwi-footprints.' + k); } catch (e) { return null; } };
const save = (k, v) => { try { localStorage.setItem('kiwi-footprints.' + k, v); } catch (e) { /* 저장소 없음 */ } };
const atmos = new Atmos(q.get('weather') || saved('weather') || 'clear');
// 시계 선택지: 초 표시 · 표기(오전/오후 · AM/PM · 24시간). 주소 ?sec=1 · ?ampm=ko|en|24 가 기기에 저장된 값보다 먼저
const clockOpt = (() => { try { return { sec: false, fmt: 'ko', ...JSON.parse(saved('clock') || '{}') }; } catch (e) { return { sec: false, fmt: 'ko' }; } })();
if (q.get('sec') != null) clockOpt.sec = q.get('sec') !== '0';
if (CLOCK_FMTS.includes(q.get('ampm'))) clockOpt.fmt = q.get('ampm');
if (!CLOCK_FMTS.includes(clockOpt.fmt)) clockOpt.fmt = 'ko';
// 예전 '시계 · 초' 모드(clocksec)는 시계 + 초 켜기로 옮긴다
const modeIn = m => (m === 'clocksec' ? ((clockOpt.sec = true), 'clock') : m);
let mode = MODES.includes(modeIn(q.get('mode'))) ? modeIn(q.get('mode')) : MODES.includes(modeIn(saved('mode'))) ? modeIn(saved('mode')) : 'free';
const HOUR_Q = q.get('hour') != null && q.get('hour') !== '' && !isNaN(+q.get('hour')) ? +q.get('hour') : null;
let hourShift = 0;          // T 키로 3시간씩 미리보기
const quotes = new Deck(QUOTES), words = new Deck(WORDS);
let meta = null;            // 지금 쓰는 글의 캡션 (뜻·출처)
let tintAt = -1;
let secAnchor = null, secShown = null;   // 시계 · 초: 초 두 자리를 찍을 자리와 지금 찍힌 값
let lastClock = null;     // 시계 모드: 마지막으로 쓴 시각 (분이 바뀔 때만 다시 쓴다 — 그 사이 직접 쓴 글은 남겨 둔다)

let W = 0, H = 0, dpr = 1;
let kiwis = [], jobs = [], spawnQ = [];
let phase = 'idle';
let holdUntil = 0, washAt = 0, pending = null, current = '';
let S = 100, box = null, nextAmbient = 2;
let stageScale = 1;
let view = VIEWS.includes(q.get('view')) ? q.get('view') : 'top';
const cam = { x: 0, y: 0, z: 1 };
const world = { beach, sound, kiwis, stride: 8, foot: 5, speed: 100, writeSpeed: 60, k: 30 };
let notes = [];   // 발자국 음이 날 때 떠오르는 ♪
let leaves = [];  // 키위가 덤불을 드나들 때 튀는 잎
const LEAF_C = ['#6F9A3B', '#A9C24C', '#3E6B37', '#C8C85A'];
function rustle(x, y) {
  const u = beach.u;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = (40 + Math.random() * 70) * u;
    leaves.push({ x: x + (Math.random() - 0.5) * 18 * u, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 9, s: (3 + Math.random() * 2.5) * u, c: LEAF_C[i % 4], age: 0, life: 0.7 + Math.random() * 0.4 });
  }
}
world.onNote = (x, y) => { notes.push({ x, y, t: beach.t, d: Math.random() < 0.5 ? -1 : 1 }); if (notes.length > 60) notes.shift(); };

function sizeFor(s) {
  S = Math.max(20, s);   // 안전장치: 글자 크기가 0 이하가 되면 걸음 계산이 끝나지 않는다
  const k = clamp(S * 0.36, 18, 74);
  Object.assign(world, { stride: S * 0.085, foot: S * 0.056, speed: S * 0.9 * SPEED, writeSpeed: S * 0.55 * SPEED, k });
  for (const kw of kiwis) kw.k = k;
}

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  // 화면 방향이 바뀌었으면 맞는 판으로 바꾼다 (아직 안 읽었으면 읽은 뒤 다시 resize)
  const want = plateFor(W, H);
  if (plate.name !== want) {
    getPlate(want).then(p => { if (plateFor(window.innerWidth, window.innerHeight) === want && plate !== p) { plate = p; water.setPlate(p); resize(); } }).catch(() => {});
  }
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  stageScale = dpr;
  for (const c of [canvas, fxCanvas]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = W + 'px'; c.style.height = H + 'px'; }
  const cs = Math.min(dpr, 1.25);   // 구름은 부드러워서 해상도를 조금 낮춰도 된다
  cloudCanvas.width = Math.round(W * cs); cloudCanvas.height = Math.round(H * cs);
  cloudCanvas.style.width = W + 'px'; cloudCanvas.style.height = H + 'px';
  cloudCanvas.dataset.scale = cs;
  worldEl.style.width = W + 'px'; worldEl.style.height = H + 'px';
  plate.fit(W, H);
  beach.resize(W, H, dpr, plate);
  water.resize(W, H, dpr);
  plate.paintCanopy(canopyEl, dpr);
  clouds.amount = atmos.cloud;   // 첫 화면부터 날씨에 맞는 구름 수
  clouds.resize(W, H, beach.u);
  gulls.resize(beach);
  beach.prints = [];
  cam.x = W / 2; cam.y = H / 2;
  sizeFor(clamp(Math.min(W, H) * 0.14, 44, 150));
  if (current) { kiwis.forEach(k => { k.job = null; if (k.state !== 'flee') k.state = 'free'; }); write(current); }
}

// ── 글 배치: 줄 폭을 여러 가지로 나눠 보고 글자가 가장 크게 나오는 배치 ──
function layout(text) {
  const u = beach.u;
  // 그림에서 읽은 숲 줄·해안선 사이, 가운데 모래밭 (양옆 바위는 피한다)
  const areaW = W * (W > H ? 0.62 : 0.88), xa = (W - areaW) / 2;
  let top = 0, bot = Infinity;
  for (let x = xa; x <= xa + areaW; x += 6) { top = Math.max(top, beach.grass(x)); bot = Math.min(bot, beach.shoreAt(x)); }
  top += 34 * u; bot -= H * 0.03 + 26 * u;
  if (bot - top < H * 0.12) top = bot - H * 0.12;   // 안전장치: 바닥이 너무 좁게 읽혀도 글씨 칸은 남긴다
  const maxS = clamp(Math.min(W, H) * 0.2, 60, 170);
  // 시계 · 초: 마지막 줄 오른쪽에 반 크기 초 두 자리 자리를 비워 두고 배치한다
  const withSec = mode === 'clock' && clockOpt.sec && text === lastClock, R = 0.6, GAP = 0.25, secU = withSec ? layoutText('00').width * R + GAP : 0;
  const span = c => { const last = c.lines[c.lines.length - 1]; return Math.max(c.width, last ? (c.width + last.width) / 2 + secU : 0); };
  const fit = L => Math.min(areaW / Math.max(span(L), 1), (bot - top) / Math.max(L.height, 1), maxS);
  let L = layoutText(text), best = fit(L);
  for (let m = Math.ceil(L.width); m >= 1; m -= 0.5) {
    const c = layoutText(text, { maxWidth: m }), s = fit(c);
    if (s > best * 1.05) { L = c; best = s; }
  }
  if (!L.lines.length) return false;
  sizeFor(best);
  const x = (W - span(L) * S) / 2, y = (top + bot) / 2 - (L.height * S) / 2 + S * 0.08;
  const last = L.lines[L.lines.length - 1];
  secAnchor = withSec ? { x: x + ((L.width + last.width) / 2 + GAP) * S, y: y + (last.y + 1 - R) * S, size: R * S } : null;
  secShown = null;
  jobs = strokesOf(L, { x, y, size: S }).map((st, i) => ({ i, item: st.item, pts: st.pts, kind: st.pts.length === 1 ? 'peck' : 'line', taken: null, done: false }));
  box = { x0: x, y0: y, x1: x + L.width * S, y1: y + L.height * S };
  sound.setStage(W, box.y0, box.y1);
  return jobs.length > 0;
}

function write(text, m = null) {
  current = text;
  meta = m;
  showCaption(null);
  if (!layout(text)) { phase = 'idle'; return; }
  phase = 'writing';
  const active = kiwis.filter(k => !k.gone && k.state !== 'flee').length;
  const need = clamp(Math.ceil(jobs.length / 2.5), 3, 22) - active;
  for (let i = 0; i < need; i++) spawnQ.push(beach.t + (i * 0.3) / Math.sqrt(SPEED));
  sound.call(0.4, W / 2);
}

function wash() {
  const top = box ? box.y0 - S * 0.5 : beach.shoreY - beach.H * 0.3;
  const rise = beach.surge(Math.max(beach.bushY + 30 * beach.u, top));
  for (const k of kiwis) {
    if (k.job) { k.job.taken = null; k.job = null; }
    k.flee(beach.grass(k.x) - 50 * beach.u);
  }
  spawnQ = [];
  sound.wave();
  sound.alert();
  phase = 'washing';
  washAt = beach.t + rise + 1.5;
}

function submit(text, m = null) {
  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return;
  sound.commit();
  if (phase === 'washing') { pending = [text, m]; return; }
  if (isClock(mode) && (phase === 'hold' || phase === 'writing') && !pending && canPatch(current, text)) { patch(text); return; }
  if (phase === 'idle' && beach.printCount === 0) { write(text, m); return; }
  pending = [text, m];
  wash();
}

// ── 시계: 바뀐 글자만 고쳐 쓰기 ──
// 글자 수가 같고 바뀐 자리의 글자 폭이 같으면(숫자↔숫자, 오전↔오후) 배치가 그대로라 그 글자만 지우고 다시 쓸 수 있다
const inked = t => [...t].filter(ch => !/\s/.test(ch));
function canPatch(a, b) {
  if (!a || !b || a === b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && (/\s/.test(a[i]) || /\s/.test(b[i]) || glyph(a[i]).w !== glyph(b[i]).w)) return false;
  return true;
}
function patch(text) {
  const ca = inked(current), cb = inked(text), changed = new Set();
  cb.forEach((ch, i) => { if (ch !== ca[i]) changed.add(i); });
  const old = jobs;
  if (!layout(text)) return;
  // 그대로인 글자는 쓰던 상태를 이어받고, 바뀐 글자는 발자국을 모래가 덮은 뒤 새로 쓴다
  const keep = new Map();
  for (const j of old) { if (!changed.has(j.item)) { if (!keep.has(j.item)) keep.set(j.item, []); keep.get(j.item).push(j); } else if (j.taken) { j.taken.job = null; if (j.taken.state !== 'flee') j.taken.state = 'free'; } }
  const next = [];
  for (const j of jobs) {
    if (changed.has(j.item)) { j.notBefore = beach.t + 0.9; next.push(j); }
    else { const k = keep.get(j.item); if (k && k.length) next.push(k.shift()); else next.push({ ...j, done: true }); }
  }
  next.forEach((j, i) => { j.i = i; });
  jobs = next;
  beach.erase(changed);
  current = text; meta = null;
  phase = 'writing';
  const active = kiwis.filter(k => !k.gone && k.state !== 'flee').length, todo = jobs.filter(j => !j.done).length;
  const need = clamp(Math.ceil(todo / 2.5), 2, 10) - active;
  for (let i = 0; i < need; i++) spawnQ.push(beach.t + (i * 0.4) / Math.sqrt(SPEED));
  sound.call(0.2, W / 2);
}

// 글 모드가 저절로 쓰는 다음 글
function nextAuto(hour) {
  if (isClock(mode)) { lastClock = clockText(hour, clockOpt.fmt); return [lastClock, null]; }
  if (mode === 'quote') { const it = quotes.next(); return [it.en, { main: it.ko, sub: it.by }]; }
  if (mode === 'word') { const it = words.next(); return [it.en.toUpperCase(), { main: it.ko, sub: `${it.en} · ${it.pos}` }]; }
  return null;
}
function holdFor() { return mode === 'quote' ? 16 : mode === 'word' ? 12 : isClock(mode) ? Infinity : HOLD; }

function showCaption(m) {
  if (!m) { captionEl.classList.remove('on'); return; }
  captionEl.querySelector('.main').textContent = m.main;
  captionEl.querySelector('.sub').textContent = m.sub || '';
  captionEl.classList.add('on');
}

function spawn() {
  const u = beach.u, x0 = box ? box.x0 - 40 : W * 0.2, x1 = box ? box.x1 + 40 : W * 0.8;
  const x = clamp(x0 + Math.random() * (x1 - x0), 24, W - 24);
  // 숲 가장자리 바로 안쪽(덤불 잎 아래)에서 나온다
  const kw = new Kiwi(x, beach.grass(x) - (34 + Math.random() * 16) * u, Math.PI / 2 + (Math.random() - 0.5) * 0.4, world.k);
  kiwis.push(kw);
  return kw;
}

function assign() {
  const open = jobs.filter(j => !j.done && !j.taken && !(j.notBefore > beach.t));
  for (const kw of kiwis.filter(k => k.state === 'free' && !k.gone)) {
    if (!open.length) break;
    const first = open[0].i;
    let best = null, bestScore = Infinity, rev = false;
    for (const j of open.slice(0, 8)) {
      const [sx, sy] = j.pts[0], [ex, ey] = j.pts[j.pts.length - 1];
      if (sy > beach.edge(sx) - S * 0.2 || ey > beach.edge(ex) - S * 0.2) continue;   // 아직 물속
      const ds = dist(kw.x, kw.y, sx, sy), de = j.kind === 'line' ? dist(kw.x, kw.y, ex, ey) : Infinity;
      const score = Math.min(ds, de) + (j.i - first) * S * 0.35;
      if (score < bestScore) { bestScore = score; best = j; rev = de < ds; }
    }
    if (!best) continue;
    if (rev && dist(...best.pts[0], ...best.pts[best.pts.length - 1]) > 1) best.pts = best.pts.slice().reverse();
    best.taken = kw;
    open.splice(open.indexOf(best), 1);
    kw.take(best);
  }
}

function loiter(kw) {
  const u = beach.u;
  if (phase === 'idle' && Math.random() < 0.18) { kw.flee(beach.grass(kw.x) - 50 * u); kw.alertT = 0; return; }
  const b = box && phase !== 'idle' ? box : { x0: W * 0.15, y0: beach.bushY + 60 * u, x1: W * 0.85, y1: beach.shoreY - 60 * u };
  const pad = S * 0.5;
  let x, y, tries = 0;
  do {
    x = clamp(b.x0 - pad + Math.random() * (b.x1 - b.x0 + pad * 2), 20, W - 20);
    y = clamp(b.y0 - pad + Math.random() * (b.y1 - b.y0 + pad * 2), beach.grass(x) + 20 * u, beach.edge(x) - 30 * u);
  } while (++tries < 6 && phase !== 'idle' && x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1);
  kw.wanderTo(x, y);
}

// ── 카메라 ──
function updateCamera(dt) {
  let tx = W / 2, ty = H / 2, tz = 1;
  if (view === 'follow') {
    const busy = kiwis.filter(k => k.state === 'write' || k.state === 'peck');
    const pool = busy.length ? busy : kiwis.filter(k => !k.gone && k.state !== 'flee');
    if (pool.length) {
      if (!cam.target || !pool.includes(cam.target)) cam.target = pool[Math.floor(Math.random() * pool.length)];
      tz = 2.1; tx = cam.target.x; ty = cam.target.y - cam.target.k * 0.4;
    } else if (box) { tz = 1.4; tx = (box.x0 + box.x1) / 2; ty = (box.y0 + box.y1) / 2; }
  }
  const f = Math.min(1, dt * 2.5);
  cam.z += (tz - cam.z) * f;
  const hw = W / (2 * cam.z), hh = H / (2 * cam.z);
  cam.x += (clamp(tx, hw, W - hw) - cam.x) * f;
  cam.y += (clamp(ty, hh, H - hh) - cam.y) * f;
  cam.x = clamp(cam.x, hw, W - hw); cam.y = clamp(cam.y, hh, H - hh);
  if (view === 'diorama') {
    // 뒤로 기울이면 위쪽 가장자리가 작아진다 → 위 모서리까지 화면을 덮는 최소 배율을 계산해서 키운다
    const th = (20 * Math.PI) / 180, piv = H * 0.6, d = Math.max(W, H) * 1.1;
    // 배율 s 를 먼저 곱한 뒤 기울이므로 위 가장자리 깊이도 s 에 비례: 높이·너비가 모두 화면을 덮는 s 의 하한
    const sn = Math.sin(th), cs = Math.cos(th);
    const s = 1.03 * Math.max(d / (d * cs - piv * sn), d / (d - piv * sn));
    worldEl.style.transform = `translate(${W / 2}px, ${piv}px) perspective(${d}px) rotateX(20deg) scale(${s}) translate(${-W / 2}px, ${-piv}px)`;
  } else worldEl.style.transform = `translate(${W / 2}px, ${H / 2}px) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)`;
}

// 화면 좌표 → 세계 좌표 (시점 변환을 거꾸로: z = 0 평면과 만나는 점)
function toWorld(sx, sy) {
  const m = new DOMMatrix(getComputedStyle(worldEl).transform);
  const a1 = m.m11 - sx * m.m14, b1 = m.m21 - sx * m.m24, c1 = sx * m.m44 - m.m41;
  const a2 = m.m12 - sy * m.m14, b2 = m.m22 - sy * m.m24, c2 = sy * m.m44 - m.m42;
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-9) return [sx, sy];
  return [(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det];
}

function setView(v, announce = true) {
  view = v;
  document.body.dataset.view = v;
  viewBtn.setAttribute('aria-label', `시점: ${VIEW_NAME[v]} (바꾸기)`);
  if (announce) toast(VIEW_NAME[v]);
}

// ── 한 프레임 ──
function tick(dt) {
  const now = new Date();
  const hour = ((HOUR_Q ?? now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600) + hourShift) % 24;
  atmos.update(dt, beach, hour);
  clouds.amount = atmos.cloud; clouds.windK = atmos.windK;
  clouds.update(dt);
  if (MAPS[mapId].gulls) gulls.update(dt, beach, x => sound.gull(x)); else gulls.list.length = 0;
  sound.update({ high: clamp((beach.shoreY - beach.lvl) / (beach.H * 0.3), 0, 1), rain: atmos.v.rain, wind: Math.max(atmos.v.wind, atmos.v.rain * 0.3), night: atmos.night, hour, weather: atmos.weather });
  if (beach.t - tintAt > 0.25) {
    tintAt = beach.t;
    tintEl.style.background = atmos.tintCSS();
    glowEl.style.opacity = String(Math.max(0.15, 1 - atmos.night * 0.85));   // 골든아워 빛은 밤엔 거의 사라진다
    document.body.classList.toggle('snowy', beach.snow > 0.3);
  }
  beach.update(dt);
  while (spawnQ.length && spawnQ[0] <= beach.t) { spawnQ.shift(); spawn(); }

  if (phase === 'washing' && beach.t >= washAt) {
    phase = 'idle'; box = null; jobs = [];
    if (pending) { const [p, m] = pending; pending = null; write(p, m); }
  }
  if (phase === 'writing') {
    assign();
    for (const j of jobs) if (j.taken && (j.taken.gone || j.taken.job !== j) && !j.done) j.taken = null;
    if (jobs.every(j => j.done)) {
      phase = 'hold'; holdUntil = beach.t + holdFor();
      if (meta) showCaption(meta);
      kiwis.forEach((k, i) => k.hop(2, i * 0.07));
      sound.chorus(kiwis.filter(k => !k.gone).map(k => k.x));   // 키위마다 자기 자리에서 한 음씩
    }
  }
  if (phase === 'hold' && beach.t >= holdUntil) {
    pending = null;
    const nx = nextAuto(hour);
    if (nx) submit(...nx); else wash();
  }
  // 시계: 분이 바뀌면 다시 쓴다 · 다른 모드: 해변이 비어 있으면 바로 다음 글
  if (mode !== 'free' && !pending && (phase === 'idle' || phase === 'hold')) {
    if (isClock(mode) ? clockText(hour, clockOpt.fmt) !== lastClock && beach.t > 1 : phase === 'idle' && beach.t > 1.5) submit(...nextAuto(hour));
  }

  for (const kw of kiwis) {
    if (kw.state === 'free' && phase !== 'writing') loiter(kw);
    kw.update(dt, world);
    // 숲 덤불을 드나들 때: 가장자리 근처에서 서서히 보였다 사라지고, 잎이 살짝 흔들려 튄다
    const g = beach.grass(kw.x), u = beach.u;
    kw.vis = clamp((kw.y - (g - 40 * u)) / (46 * u), 0, 1);
    const inside = kw.y < g - 8 * u;
    if (kw.inside !== undefined && inside !== kw.inside) rustle(kw.x, g - 6 * u);
    kw.inside = inside;
  }
  leaves = leaves.filter(l => (l.age += dt) < l.life);
  for (const l of leaves) { l.x += l.vx * dt; l.y += l.vy * dt; l.vy += 140 * beach.u * dt; l.vx *= 0.97; l.rot += l.spin * dt; }
  kiwis = kiwis.filter(k => !k.gone);
  world.kiwis = kiwis;

  if (phase === 'idle' && !beach.surging && beach.t > nextAmbient) {
    nextAmbient = beach.t + 4 + Math.random() * 6;
    if (kiwis.length < (atmos.night > 0.5 ? 4 : 2)) spawn();   // 키위는 야행성 — 밤에 더 많이 나온다
  }
  // 시계 · 초: 매초 모래에 초 두 자리가 찍히고 앞 숫자는 스르르 지워진다
  if (secAnchor && (phase === 'writing' || phase === 'hold') && !pending) {
    const ss = String(HOUR_Q != null ? Math.floor(beach.t) % 60 : now.getSeconds()).padStart(2, '0');
    if (ss !== secShown) { secShown = ss; stampSeconds(ss); }
  } else if (secShown) { fadeSeconds(); secShown = null; }
  updateCamera(dt);
}

function fadeSeconds() { for (const p of beach.prints) if (p.kind === 'sec' && !p.die) p.die = beach.t; }
function stampSeconds(ss) {
  fadeSeconds();
  const { x, y, size } = secAnchor, st = size * 0.15, f = size * 0.08, pts = [];
  for (const s of strokesOf(layoutText(ss), { x, y, size })) {
    let acc = st * 0.5, side = 1;
    for (let i = 1; i < s.pts.length; i++) {
      const [ax, ay] = s.pts[i - 1], [bx, by] = s.pts[i], d = Math.hypot(bx - ax, by - ay), a = Math.atan2(by - ay, bx - ax);
      for (; acc <= d; acc += st) { const t = acc / d; side = -side; pts.push([ax + (bx - ax) * t - Math.sin(a) * side * st * 0.22, ay + (by - ay) * t + Math.cos(a) * side * st * 0.22, a]); }
      acc -= d;
    }
  }
  // 앞 숫자가 지워지는 동안(0.28초) 기다렸다가 0.3초에 걸쳐 앞에서부터 톡톡 찍힌다
  pts.forEach(([px, py, a], i) => beach.addSec(px, py, a, f, beach.t + 0.18 + (i / pts.length) * 0.3));
}

function draw() {
  ctx.setTransform(stageScale, 0, 0, stageScale, 0, 0);
  ctx.clearRect(0, 0, W, H);
  water.draw(beach, { snow: beach.snow, night: atmos.night, rain: atmos.v.rain });
  ctx.save();
  beach.clipLand(ctx);
  beach.drawPrints(ctx);
  ctx.restore();
  if (DEBUG) {
    ctx.save();
    ctx.strokeStyle = 'rgba(200,40,40,0.5)'; ctx.lineWidth = 1;
    for (const j of jobs) { ctx.beginPath(); j.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (j.kind === 'peck') ctx.arc(j.pts[0][0], j.pts[0][1], 3, 0, 6.29); ctx.stroke(); }
    ctx.restore();
  }
  const order = kiwis.slice().sort((a, b) => a.y - b.y);
  for (const kw of order) kw.drawShadow(ctx);
  for (const kw of order) { kw.shade = plate.shadeAt(kw.x, kw.y - kw.k * 0.4); kw.draw(ctx); }
  const cs = +cloudCanvas.dataset.scale || 1;
  cctx.setTransform(cs, 0, 0, cs, 0, 0);
  cctx.clearRect(0, 0, W, H);
  clouds.draw(cctx);
  fctx.setTransform(stageScale, 0, 0, stageScale, 0, 0);
  fctx.clearRect(0, 0, W, H);
  gulls.draw(fctx, beach);
  for (const l of leaves) {
    fctx.save(); fctx.globalAlpha = 1 - l.age / l.life; fctx.translate(l.x, l.y); fctx.rotate(l.rot);
    fctx.fillStyle = l.c; fctx.beginPath(); fctx.ellipse(0, 0, l.s, l.s * 0.45, 0, 0, 6.29); fctx.fill(); fctx.restore();
  }
  atmos.draw(fctx, beach);
  // 발자국 음: 작은 ♪ 가 흔들리며 떠올라 사라진다
  if (notes.length) {
    notes = notes.filter(n => beach.t - n.t < 1.3);
    fctx.save();
    fctx.textAlign = 'center';
    fctx.font = `${Math.round(S * 0.16)}px sans-serif`;
    for (const n of notes) {
      const a = beach.t - n.t, k = a / 1.3;
      fctx.globalAlpha = (1 - k) * 0.75;
      fctx.fillStyle = atmos.night > 0.5 ? '#f3f0c8' : '#7b5b3e';
      fctx.fillText('♪', n.x + Math.sin(a * 5) * S * 0.04 * n.d, n.y - S * 0.12 - a * S * 0.35);
    }
    fctx.restore();
  }
}

let last = performance.now(), ready = false;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(dt);
  draw();
  if (!ready) { ready = true; document.body.classList.add('ready'); }
  requestAnimationFrame(frame);
}

// ── 입력 ──
const form = document.getElementById('say');
const input = document.getElementById('sayInput');
const soundBtn = document.getElementById('soundBtn');
const viewBtn = document.getElementById('viewBtn');
const infoBtn = document.getElementById('infoBtn');
const info = document.getElementById('info');
const toastEl = document.getElementById('toast');
const modeBtn = document.getElementById('modeBtn');
const weatherBtn = document.getElementById('weatherBtn');
const TOUCH = matchMedia('(hover: none)').matches;

let toastT = null;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('on'), 1300);
}

const unlock = () => sound.unlock();
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('keydown', unlock);

input.addEventListener('input', e => {
  if (e.inputType === 'deleteContentBackward') sound.del();
  else if (e.data === ' ') sound.space();
  else if (e.data) sound.key();
});
input.addEventListener('focus', () => { document.body.classList.add('typing'); sound.focus(); });
input.addEventListener('blur', () => document.body.classList.remove('typing'));
form.addEventListener('submit', e => {
  e.preventDefault();
  unlock();
  submit(input.value);
  input.value = '';
  if (TOUCH) input.blur();
});

const paintSoundBtn = () => {
  soundBtn.setAttribute('aria-pressed', String(sound.on));
  soundBtn.setAttribute('aria-label', sound.on ? '소리 설정 (켜짐)' : '소리 설정 (꺼짐)');
  soundBtn.dataset.on = sound.on ? '1' : '0';
};
const mixer = document.getElementById('mixer');
const openMixer = open => {
  mixer.hidden = !open;
  soundBtn.setAttribute('aria-expanded', String(open));
  if (open) mixer.querySelector('input').focus();
};
soundBtn.addEventListener('click', () => { unlock(); openMixer(mixer.hidden); });
const mixOn = document.getElementById('mixOn'), mixSteps = document.getElementById('mixSteps');
mixOn.checked = sound.on; mixSteps.checked = sound.mix.steps;
mixOn.addEventListener('change', () => { sound.setOn(mixOn.checked); paintSoundBtn(); });
mixSteps.addEventListener('change', () => sound.setMix({ steps: mixSteps.checked }));
for (const k of ['music', 'amb', 'sfx']) {
  const el = document.getElementById('mix-' + k);
  el.value = Math.round(sound.mix[k] * 100);
  el.addEventListener('input', () => sound.setMix({ [k]: el.value / 100 }));
}
document.addEventListener('pointerdown', e => { if (!mixer.hidden && !mixer.contains(e.target) && !soundBtn.contains(e.target)) openMixer(false); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !mixer.hidden) { openMixer(false); soundBtn.focus(); } });
paintSoundBtn();
viewBtn.addEventListener('click', () => setView(VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length]));
setView(view, false);

const openInfo = open => {
  info.hidden = !open;
  document.body.classList.toggle('info-open', open);
  infoBtn.setAttribute('aria-expanded', String(open));
  if (open) info.querySelector('button').focus(); else infoBtn.focus();
};
infoBtn.addEventListener('click', () => openInfo(info.hidden));
info.addEventListener('click', e => { if (e.target === info || e.target.closest('[data-close]')) openInfo(false); });
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !info.hidden) openInfo(false);
  if (e.key === 'v' && document.activeElement !== input) viewBtn.click();
  if (e.key === 'm' && document.activeElement !== input) modeBtn.click();
  if (e.key === 'w' && document.activeElement !== input) weatherBtn.click();
  if (e.key === 't' && document.activeElement !== input) { hourShift = (hourShift + 3) % 24; toast(`시간 미리보기 +${hourShift}시간`); }
});

// 누르기: 구름이면 찢고, 키위면 놀라고, 빈 모래면 근처 키위가 와서 콕
document.getElementById('touch').addEventListener('pointerdown', e => {
  if (!plate) return;   // 그림을 다 읽기 전에는 누를 곳이 없다
  const [x, y] = toWorld(e.clientX, e.clientY);
  const cl = clouds.hit(x, y);
  if (cl) { clouds.scatter(cl, x, y); sound.poof(x); return; }
  const hit = kiwis.find(k => dist(k.x, k.y - k.k * 0.45, x, y) < k.k * 0.55);
  if (hit) { if (!hit.busy && hit.state !== 'flee') hit.startle(); sound.call(0, hit.x); return; }
  if (y < beach.grass(x) || y > beach.edge(x) - 10) return;
  const idle = kiwis.filter(k => !k.busy && k.state !== 'flee');
  const kw = idle.length ? idle.reduce((a, b) => (dist(a.x, a.y, x, y) < dist(b.x, b.y, x, y) ? a : b)) : spawn();
  kw.digAt(x, y);
});

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => plate && resize(), 200); });

// 그림 판·키위·갈매기 그림을 다 읽은 뒤 시작한다
async function boot() {
  const img = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  const [p, kiwiImg, gullImg] = await Promise.all([getPlate(plateFor(innerWidth, innerHeight)), img('assets/kiwi.webp'), img('assets/gull.webp')]);
  plate = p;
  water = new WaterGL(plateEl);
  water.setPlate(plate);
  setKiwiSprite(kiwiImg);
  gulls.setSprite(gullImg);
  resize();
  requestAnimationFrame(frame);
  }
boot();
const paintMode = () => { modeBtn.dataset.mode = mode; modeBtn.setAttribute('aria-label', `글 모드: ${MODE_NAME[mode]} (바꾸기)`); };
const nowHour = () => ((HOUR_Q ?? new Date().getHours() + new Date().getMinutes() / 60 + new Date().getSeconds() / 3600) + hourShift) % 24;
// 장소 바꾸기: 그 장소 그림 판을 읽고(처음 한 번) 화면을 다시 짠다 — resize 가 지금 글을 새 바닥에 다시 쓴다
function setMap(id) {
  if (!MAPS[id] || id === mapId) return;
  mapId = id; save('map', id); paintModeMenu(); toast(MAPS[id].name);
  if (plate) resize();
}
function setMode(m, announce = true) {
  mode = m;
  save('mode', mode); paintMode(); paintModeMenu();
  if (announce) toast(MODE_NAME[mode]);
  if (mode !== 'free') submit(...nextAuto(nowHour()));
  else showCaption(null);
}
// 글 모드 버튼: 누르면 바로 다음 모드로 (M 키도 같다)
modeBtn.addEventListener('click', () => { unlock(); setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]); });
// 설정 창(톱니바퀴): 시계 초 표시 · 표기
const settings = document.getElementById('settings'), setBtn = document.getElementById('setBtn');
const openSettings = open => { settings.hidden = !open; setBtn.setAttribute('aria-expanded', String(open)); if (open) settings.querySelector('input').focus(); };
function paintModeMenu() {
  for (const r of settings.querySelectorAll('input[name="map"]')) r.checked = r.value === mapId;
  for (const r of settings.querySelectorAll('input[name="fmt"]')) r.checked = r.value === clockOpt.fmt;
  document.getElementById('optSec').checked = clockOpt.sec;
}
setBtn.addEventListener('click', () => { unlock(); openSettings(settings.hidden); });
settings.addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'map') { setMap(t.value); return; }
  if (t.name === 'fmt') clockOpt.fmt = t.value;
  if (t.id === 'optSec') clockOpt.sec = t.checked;
  save('clock', JSON.stringify(clockOpt));
  paintModeMenu();
  // 시계라면 바뀐 표기·초 자리에 맞춰 다시 쓴다 (같은 폭이면 바뀐 글자만, 아니면 파도로 지우고)
  if (mode === 'clock') { lastClock = null; submit(...nextAuto(nowHour())); }
});
document.addEventListener('pointerdown', e => { if (!settings.hidden && !settings.contains(e.target) && !setBtn.contains(e.target)) openSettings(false); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !settings.hidden) { openSettings(false); setBtn.focus(); } });
paintMode(); paintModeMenu();
const paintWeather = () => { weatherBtn.dataset.weather = atmos.weather; weatherBtn.setAttribute('aria-label', `날씨: ${WEATHER_NAME[atmos.weather]} (바꾸기)`); };
weatherBtn.addEventListener('click', () => {
  atmos.setWeather(WEATHERS[(WEATHERS.indexOf(atmos.weather) + 1) % WEATHERS.length]);
  save('weather', atmos.weather); paintWeather(); toast(WEATHER_NAME[atmos.weather]);
});
paintWeather();

setTimeout(() => { if (phase === 'idle' && !current && mode === 'free') write(FIRST); }, 700);

window.__kiwi = { get phase() { return phase; }, get kiwis() { return kiwis; }, get jobs() { return jobs; }, get current() { return current; }, beach, clouds, atmos, sound, get plate() { return plate; }, get notes() { return notes; }, submit, setView, toWorld };
