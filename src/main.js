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

import { layoutText, strokesOf, glyph } from './hangul.js?v=v16.2.1';
import { Beach } from './beach.js?v=v16.2.1';
import { Kiwi } from './kiwi.js?v=v16.2.1';
import { Sound } from './sound.js?v=v16.2.1';
import { loadPlate } from './plate.js?v=v16.2.1';
import { MAPS, MAP_IDS } from './maps.js?v=v16.2.1';
import { WaterGL } from './water.js?v=v16.2.1';
import { setKiwiSprite, setKiwiSkins } from './kiwi.js?v=v16.2.1';
import { ITEMS, ITEM, Collection, Drifters } from './items.js?v=v16.2.1';
import { Clouds } from './clouds.js?v=v16.2.1';
import { Gulls } from './gulls.js?v=v16.2.1';
import { Atmos, WEATHERS, WEATHER_NAME } from './atmos.js?v=v16.2.1';
import { MODES, MODE_NAME, QUOTES, WORDS, Deck, clockText, isClock, CLOCK_FMTS } from './content.js?v=v16.2.1';
import { clamp, dist } from './util.js?v=v16.2.1';
import { Focus, Awake, LENGTHS } from './focus.js?v=v16.2.1';
import { UNLOCK_ALL } from './config.js?v=v16.2.1';
import { Shore, Finds, FINDS, FIND, RARITY } from './shore.js?v=v16.2.1';

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
// 기기 저장값 읽기·쓰기 — 장소·글 모드·시계 설정이 시작하자마자 쓰므로 맨 먼저 둔다
const saved = k => { try { return localStorage.getItem('kiwi-footprints.' + k); } catch (e) { return null; } };
const save = (k, v) => { try { localStorage.setItem('kiwi-footprints.' + k, v); } catch (e) { /* 저장소 없음 */ } };
const plates = {};
// 장소: ?map= 이 기기에 저장된 값보다 먼저
let mapId = MAP_IDS.includes(q.get('map')) ? q.get('map') : MAP_IDS.includes(saved('map')) ? saved('map') : 'beach';
const plateFor = (w, h) => MAPS[mapId][w / h < 0.8 ? 'tall' : 'wide'];
function getPlate(name) { const m = Object.values(MAPS).find(v => v.wide === name || v.tall === name) || {}; return (plates[name] ||= loadPlate('assets/', name, { stones: !!m.stones, shoreFrom: m.shoreFrom, ground: m.ground })); }
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
let sparks = [];  // 유리병·상자를 열 때 튀는 반짝이
const col = new Collection(() => saved('items'), v => save('items', v), UNLOCK_ALL);
const drifters = new Drifters();
const focus = new Focus(saved, save);   // v12 집중 모드
const awake = new Awake();
let walker = null;
const shore = new Shore();   // v13 물가 줍기
const finds = new Finds(() => saved('finds'), v => save('finds', v));
let ambAt = 0;   // 켜 두기 걸음: 마지막으로 잰 실제 시각   // 집중하는 동안 숲 가장자리를 따라 오가는 키위 한 마리
// 새로 나오는 키위는 입히기로 고른 옷 중 하나를 입는다 (가끔은 맨몸)
const pickSkin = () => { const w = col.wear; return w.length && Math.random() < 0.75 ? w[Math.floor(Math.random() * w.length)] : null; };
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
  drifters.reset();
  shore.reset();
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
  drifters.wrote(beach.t);
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
    if (k.focus) continue;   // 집중 키위는 파도가 와도 제 길을 간다
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
  kw.skin = pickSkin();
  kiwis.push(kw);
  return kw;
}

function assign() {
  const open = jobs.filter(j => !j.done && !j.taken && !(j.notBefore > beach.t));
  for (const kw of kiwis.filter(k => k.state === 'free' && !k.gone && !k.focus)) {
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

// ── v12 집중 모드 ──
// 집중 키위: 숲 가장자리 바로 아래 길을 따라 왼쪽 끝 ↔ 오른쪽 끝을 천천히 오간다 (진행 막대 대신)
// 길은 숲 줄을 따라 10칸으로 나눠 이어 걷는다 (한 번에 곧게 가면 숲이 낮게 내려온 곳에서 덤불 속으로 들어간다)
function patrol(kw) {
  const u = beach.u, lane = x => Math.min(beach.grass(x) + 36 * u, beach.edge(x) - 40 * u);
  if (kw.state === 'wander' && kw.goal && dist(kw.x, kw.y, kw.goal.x, kw.goal.y) > kw.k * 0.3) return;
  if (kw.state !== 'wander' && kw.state !== 'free' && kw.state !== 'idle') return;   // 콕 하는 중 등은 마저 하게
  kw.lap ??= kw.x < W / 2 ? 1 : -1;
  const x = clamp(kw.x + kw.lap * W * 0.08, W * 0.08, W * 0.92);
  if (x <= W * 0.08 + 1 || x >= W * 0.92 - 1) kw.lap = -kw.lap;
  kw.wanderTo(x, lane(x));
}
function pickWalker() {
  const pool = kiwis.filter(k => !k.gone && k.state !== 'flee' && !k.busy);
  const kw = pool.length ? pool[Math.floor(Math.random() * pool.length)] : spawn();
  if (kw.job) { kw.job.taken = null; kw.job = null; }
  kw.focus = true; kw.lap = null; kw.state = 'free';
  return kw;
}
const focusBtn = document.getElementById('focusBtn'), focusPanel = document.getElementById('focusPanel'), focusHud = document.getElementById('focusHud');
const fmtTime = ms => { const t = Math.ceil(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const n0 = v => v.toLocaleString('ko-KR');
const km = st => (st * 0.5 / 1000).toFixed(1);   // 키위 걸음 0.5m 로 친 거리 (디자인 값)
let focusShownAt = 0;
function paintFocus() {
  const on = focus.active, now = Date.now();
  focusBtn.classList.toggle('on', on);
  focusHud.hidden = !on;
  focusPanel.querySelector('.idle').hidden = on;
  focusPanel.querySelector('.busy').hidden = !on;
  if (on) {
    const left = fmtTime(focus.left(now)), st = n0(focus.steps(now));
    focusHud.querySelector('.t').textContent = left; focusHud.querySelector('.s').textContent = st + '보';
    focusHud.setAttribute('aria-label', `집중 중, ${left} 남음, ${st}보`);
    document.getElementById('focusLeft').textContent = left; document.getElementById('focusSteps').textContent = st;
  }
  for (const r of focusPanel.querySelectorAll('input[name="flen"]')) r.checked = Number(r.value) === focus.len;
  document.getElementById('focusStats').textContent = focus.total || focus.done
    ? `오늘 ${n0(focus.todaySteps)}보 · 지금까지 ${n0(focus.total)}보 (약 ${km(focus.total)}km) · 끝까지 ${focus.done}번` : '';
}
function startFocus() {
  const ta = document.getElementById('focusLetter');
  focus.start(focus.len, ta.value);
  ta.value = '';
  awake.on();
  walker = pickWalker();
  walker.startle();
  sound.call(0, walker.x);
  openFocusPanel(false);
  toast(`집중 ${focus.len}분 시작`);
  paintFocus();
}
function releaseWalker(hop) {
  if (walker) { walker.focus = false; if (hop) walker.hop(3); if (walker.state === 'wander') walker.state = 'free'; }
  walker = null;
}
// 끝까지 했다: 걸음을 쌓고, 물 위로 선물 상자(옷·장소, 다 모았으면 편지) + 시작할 때 쓴 내 편지
function completeFocus() {
  const r = focus.complete();
  awake.off(); releaseWalker(true);
  kiwis.forEach((k, i) => k.hop(2, i * 0.07));
  sound.chorus(kiwis.filter(k => !k.gone).map(k => k.x));
  const gift = col.next(it => it.kind !== 'letter') || col.next();
  if (gift) drifters.send(gift, beach);
  if (r.letter) drifters.send({ id: 'mine', kind: 'mine', box: 'bottle', title: `${r.min}분 전의 나에게서`, text: r.letter }, beach);
  toast(`집중 끝 · ${n0(r.steps)}보 걸었어요${gift || r.letter ? ' — 물 위를 보세요' : ''}`, 3200);
  paintFocus();
}
function endFocus(r, why) {
  awake.off(); releaseWalker(false);
  if (r) toast(`${why} · 여기까지 ${n0(r.steps)}보`, 3200);
  paintFocus();
}
function focusTick() {
  if (!focus.active) { if (walker) releaseWalker(false); return; }
  if (!walker || walker.gone || !kiwis.includes(walker)) walker = pickWalker();
  if (focus.tick() === 'done') { completeFocus(); return; }
  const now = Date.now();
  if (now - focusShownAt > 250) { focusShownAt = now; paintFocus(); }
}
const openFocusPanel = open => {
  focusPanel.hidden = !open; focusBtn.setAttribute('aria-expanded', String(open));
  if (open) { paintFocus(); (focusPanel.querySelector('.busy:not([hidden]) button') || focusPanel.querySelector('input:checked') || focusPanel.querySelector('input')).focus(); }
};
focusBtn.addEventListener('click', () => { unlock(); openFocusPanel(focusPanel.hidden); });
focusHud.addEventListener('click', () => openFocusPanel(focusPanel.hidden));
focusPanel.addEventListener('change', e => { if (e.target.name === 'flen') { focus.len = Number(e.target.value); focus.store(); } });
document.getElementById('focusStart').addEventListener('click', () => { unlock(); startFocus(); });
document.getElementById('focusStop').addEventListener('click', () => { openFocusPanel(false); endFocus(focus.finish(Date.now()), '집중을 멈췄어요'); });
document.addEventListener('pointerdown', e => { if (!focusPanel.hidden && !focusPanel.contains(e.target) && !focusBtn.contains(e.target) && !focusHud.contains(e.target)) openFocusPanel(false); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !focusPanel.hidden) { openFocusPanel(false); focusBtn.focus(); } });
// 화면을 떠났다 돌아오면: 10초 안이면 이어서, 넘으면 멈춤 (떠난 때까지 걸은 것만 친다)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { focus.hidden(); return; }
  const r = focus.visible();
  if (r && r.due) completeFocus();
  else if (r && r.failed) endFocus(r, '화면을 떠나서 집중이 멈췄어요');
  else if (focus.active) awake.on();
});
window.addEventListener('pagehide', () => focus.hidden());

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
    if (kw.focus) patrol(kw);
    else if (kw.state === 'free' && phase !== 'writing') loiter(kw);
    kw.update(dt, world);
    // 숲 덤불을 드나들 때: 가장자리 근처에서 서서히 보였다 사라지고, 잎이 살짝 흔들려 튄다
    const g = beach.grass(kw.x), u = beach.u;
    kw.vis = clamp((kw.y - (g - 40 * u)) / (46 * u), 0, 1);
    const inside = kw.y < g - 8 * u;
    if (kw.inside !== undefined && inside !== kw.inside) rustle(kw.x, g - 6 * u);
    kw.inside = inside;
  }
  drifters.paused = focus.active;
  drifters.update(dt, beach, col, d => sound.arrive(d.x));
  focusTick();
  shore.update(dt, beach, { map: mapId, night: atmos.night, weather: atmos.weather, hour });
  { const nowMs = Date.now(); if (ambAt && !document.hidden && focus.ambient(nowMs - ambAt) && !focusPanel.hidden) paintFocus(); ambAt = nowMs; }
  checkMapSteps();
  sparks = sparks.filter(s => (s.age += dt) < s.life);
  for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 60 * beach.u * dt; s.vx *= 0.96; }
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
  shore.draw(ctx, beach, atmos.night);
  drifters.draw(ctx, beach);
  for (const kw of order) kw.drawShadow(ctx);
  for (const kw of order) { kw.shade = plate.shadeAt(kw.x, kw.y - kw.k * 0.4); kw.draw(ctx); }
  const cs = +cloudCanvas.dataset.scale || 1;
  cctx.setTransform(cs, 0, 0, cs, 0, 0);
  cctx.clearRect(0, 0, W, H);
  clouds.draw(cctx);
  fctx.setTransform(stageScale, 0, 0, stageScale, 0, 0);
  fctx.clearRect(0, 0, W, H);
  gulls.draw(fctx, beach);
  for (const s of sparks) {
    const a = 1 - s.age / s.life, r = s.r * (0.6 + a * 0.6);
    fctx.save(); fctx.globalAlpha = a; fctx.fillStyle = s.c; fctx.translate(s.x, s.y); fctx.rotate(s.age * 3);
    fctx.beginPath(); fctx.moveTo(0, -r * 2); fctx.lineTo(r * 0.45, 0); fctx.lineTo(0, r * 2); fctx.lineTo(-r * 0.45, 0); fctx.closePath(); fctx.fill();
    fctx.beginPath(); fctx.moveTo(-r * 2, 0); fctx.lineTo(0, r * 0.45); fctx.lineTo(r * 2, 0); fctx.lineTo(0, -r * 0.45); fctx.closePath(); fctx.fill();
    fctx.restore();
  }
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
  // 한 프레임에서 오류가 나도 화면이 멈추지 않게 다음 프레임은 꼭 예약한다 (오류는 처음 한 번만 남긴다)
  try { tick(dt); draw(); }
  catch (e) { if (!frame.err) { frame.err = true; console.error(e); } }
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
function toast(text, ms = 1300) {
  toastEl.textContent = text;
  toastEl.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('on'), ms);
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
soundBtn.addEventListener('click', () => { unlock(); paintPacks(); openMixer(mixer.hidden); });
const mixOn = document.getElementById('mixOn');
mixOn.checked = sound.on;
mixOn.addEventListener('change', () => { sound.setOn(mixOn.checked); paintSoundBtn(); });
// v14 발자국 소리 · 자연 배경: 모은 소리만 고를 수 있다 (못 모은 건 ?)
// 맨 앞 칸 = 기본. 다른 칸을 고르면 기본 대신 그 소리가 나온다 (겹치지 않는다)
const PACK_BASE = { step: [{ pack: 'music', name: '발자국 음악' }, { pack: 'sand', name: '모래' }], nature: [{ pack: 'none', name: '기본' }], music: [{ pack: 'auto', name: '기본(시간 따라)' }] };
const PACK_KEY = { step: 'stepPack', nature: 'nature', music: 'song' }, PACK_BOX = { step: 'stepPacks', nature: 'naturePacks', music: 'songPacks' };
const GROUP_NAME = { step: '발자국 소리', nature: '자연 배경', music: '곡' };
const curPack = g => sound.mix[PACK_KEY[g]];
function setPack(group, pack, preview = true) {
  if (group === 'step') { sound.setMix({ stepPack: pack }); if (preview) sound.previewStep(pack); }
  else if (group === 'music') sound.setSong(pack);
  else sound.setNature(pack);
  paintPacks();
}
function paintPacks() {
  for (const group of ['music', 'step', 'nature']) {
    const box = document.getElementById(PACK_BOX[group]), cur = curPack(group);
    box.textContent = '';
    for (const it of [...PACK_BASE[group], ...ITEMS.filter(i => i.kind === 'sound' && i.group === group)]) {
      const b = document.createElement('button'); b.type = 'button';
      const own = !it.id || col.owns(it.id);
      b.textContent = own ? it.name : '?'; b.disabled = !own;
      b.setAttribute('aria-pressed', String(own && cur === it.pack));
      if (!own) b.setAttribute('aria-label', '아직 못 모은 소리');
      b.addEventListener('click', () => { unlock(); setPack(group, it.pack); });
      box.append(b);
    }
  }
}
// 저장된 고름이 이제 없는 소리면 기본으로 (저장값을 지웠을 때 등)
{ const own = (g, p) => PACK_BASE[g].some(b => b.pack === p) || ITEMS.some(i => i.kind === 'sound' && i.group === g && i.pack === p && col.owns(i.id));
  if (!own('step', sound.mix.stepPack)) sound.setMix({ stepPack: 'music' });
  if (!own('nature', sound.mix.nature)) sound.mix.nature = 'none';
  if (!own('music', sound.mix.song)) sound.setSong('auto'); }
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
  if (e.target.matches && e.target.matches('input[type="text"], textarea')) return;
  if (e.key === 'v') viewBtn.click();
  if (e.key === 'm') modeBtn.click();
  if (e.key === 'w') weatherBtn.click();
  if (e.key === 't') { hourShift = (hourShift + 3) % 24; toast(`시간 미리보기 +${hourShift}시간`); }
});

// 누르기: 구름이면 찢고, 키위면 놀라고, 빈 모래면 근처 키위가 와서 콕
document.getElementById('touch').addEventListener('pointerdown', e => {
  if (!plate) return;   // 그림을 다 읽기 전에는 누를 곳이 없다
  const [x, y] = toWorld(e.clientX, e.clientY);
  const sh = shore.hit(x, y, beach.u);
  if (sh) { pickUp(sh); return; }
  const dr = drifters.hit(x, y, beach.u);
  if (dr) { openDrift(dr); return; }
  // v16.2 안개 낀 날: 누른 자리가 뻥 뚫린다 (누른 채 문지르면 지나간 길도 닦인다)
  if (atmos.punchFog(x, y, beach.u, true)) { sound.poof(x); fogWipe = { x, y }; return; }
  const cl = clouds.hit(x, y);
  if (cl) { clouds.scatter(cl, x, y); sound.poof(x); return; }
  const hit = kiwis.find(k => dist(k.x, k.y - k.k * 0.45, x, y) < k.k * 0.55);
  if (hit) { if (!hit.busy && hit.state !== 'flee') hit.startle(); sound.call(0, hit.x); return; }
  if (y < beach.grass(x) || y > beach.edge(x) - 10) return;
  const idle = kiwis.filter(k => !k.busy && k.state !== 'flee' && !k.focus);
  const kw = idle.length ? idle.reduce((a, b) => (dist(a.x, a.y, x, y) < dist(b.x, b.y, x, y) ? a : b)) : spawn();
  kw.digAt(x, y);
});

// 안개 문지르기: 누른 채로 움직이면 지나간 자리를 작은 구멍으로 잇는다
let fogWipe = null;
const touchEl = document.getElementById('touch');
touchEl.addEventListener('pointermove', e => {
  if (!fogWipe || !e.buttons && e.pointerType === 'mouse') return;
  const [x, y] = toWorld(e.clientX, e.clientY), step = 22 * beach.u;
  const d = dist(x, y, fogWipe.x, fogWipe.y);
  if (d < step) return;
  for (let i = 1; i <= Math.floor(d / step); i++) { const f = i * step / d; atmos.punchFog(fogWipe.x + (x - fogWipe.x) * f, fogWipe.y + (y - fogWipe.y) * f, beach.u, false); }
  fogWipe = { x, y };
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) touchEl.addEventListener(ev, () => { fogWipe = null; });

let rt = null;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => plate && resize(), 200); });

// 그림 판·키위·갈매기 그림을 다 읽은 뒤 시작한다
async function boot() {
  const img = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  const [p, kiwiImg, gullImg, bottle, crate] = await Promise.all([getPlate(plateFor(innerWidth, innerHeight)), img('assets/kiwi.webp?v=v16.2.1'), img('assets/gull.webp?v=v16.2.1'), img('assets/bottle.webp?v=v16.2.1'), img('assets/crate.webp?v=v16.2.1')]);
  img('assets/finds.webp?v=v16.2.1').then(im => {
    shore.setSheet(im);
    const c = document.createElement('canvas'), cw = im.naturalWidth / 4; c.width = c.height = cw;
    c.getContext('2d').drawImage(im, cw * 1.15, cw * 0.15, cw * 0.7, cw * 0.7, 0, 0, cw, cw);   // 1번 칸 = 소라 껍데기 (가운데 70% — 칸 안 여백을 덜어 병·상자만큼 보이게)
    drifters.setSprites({ ...drifters.imgs, conch: c });
  }).catch(() => {});
  drifters.setSprites({ bottle, crate });
  // 옷 입은 키위 그림은 뒤에서 천천히 읽는다 (없어도 맨몸으로 그린다)
  for (const it of ITEMS) if (it.kind === 'wear') img('assets/' + it.img).then(im => setKiwiSkins({ [it.id]: im })).catch(() => {});
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
  if (!MAPS[id] || id === mapId || !mapOpen(id)) return;
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
const mapOpen = id => { const m = MAPS[id]; return !m.unlock || col.owns(m.unlock) || (m.steps > 0 && focus.total >= m.steps); };
function paintModeMenu() {
  for (const r of settings.querySelectorAll('input[name="map"]')) {
    const open = mapOpen(r.value);
    r.checked = r.value === mapId; r.disabled = !open;
    r.parentElement.classList.toggle('locked', !open);
    const m = MAPS[r.value];
    r.nextElementSibling.textContent = open ? m.name : m.steps ? `${n0(Math.max(0, m.steps - focus.total))}보 더` : '상자 속';
    r.parentElement.title = open ? '' : `${m.name}: ${m.steps ? `걸음이 ${n0(m.steps)}보 쌓이거나(켜 두기 1분 10보 · 집중 1분 100보) ` : ''}물에서 떠내려오는 상자를 열면 갈 수 있어요`;
  }
  for (const r of settings.querySelectorAll('input[name="fmt"]')) r.checked = r.value === clockOpt.fmt;
  document.getElementById('optSec').checked = clockOpt.sec;
}
setBtn.addEventListener('click', () => { unlock(); paintCollection(); paintModeMenu(); openSettings(settings.hidden); });

// ── v10 떠내려온 것 열기 · 카드 · 모은 것 ──
const foundEl = document.getElementById('found'), foundWear = document.getElementById('foundWear');
let foundItem = null;
function openDrift(d) {
  drifters.open(d, beach.t);
  const mine = d.it.kind === 'mine';
  const fresh = mine || !col.has(d.it.id);
  if (!mine) col.add(d.it.id);
  if (d.it.kind === 'map') paintModeMenu();
  sound.found(d.x);
  const u = beach.u, C = ['#fff6c9', '#ffd98a', '#ffffff', '#ffc2a8'];
  for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, sp = (60 + Math.random() * 120) * u; sparks.push({ x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60 * u, r: (2 + Math.random() * 2.5) * u, c: C[i % 4], age: 0, life: 0.8 + Math.random() * 0.5 }); }
  setTimeout(() => showFound(d.it, fresh), 380);
}
function showFound(it, fresh = false) {
  foundItem = it;
  const art = foundEl.querySelector('.art'), title = document.getElementById('foundTitle'), body = foundEl.querySelector('.body');
  art.textContent = '';
  if (it.kind === 'mine') {
    const p = document.createElement('div'); p.className = 'paper'; p.textContent = it.text; art.append(p);
    title.textContent = it.title; body.textContent = '집중을 끝까지 했어요';
    foundWear.hidden = true;
  } else if (it.kind === 'letter') {
    const p = document.createElement('div'); p.className = 'paper'; p.textContent = it.text; art.append(p);
    title.textContent = (fresh ? '유리병 속 ' : '') + it.title; body.textContent = `${col.count} / ${ITEMS.length} 모음`;
    foundWear.hidden = true;
  } else if (it.kind === 'sound') {
    const sp = document.createElement('i'); sp.className = 'find'; art.append(sp);
    title.textContent = (fresh ? '소라 속 · ' : '') + it.name; body.textContent = `${GROUP_NAME[it.group]} — ${it.note} · ${col.count} / ${ITEMS.length} 모음`;
    const on = curPack(it.group) === it.pack;
    foundWear.hidden = false; foundWear.textContent = on ? '끄기' : '틀어 보기';
  } else if (it.kind === 'map') {
    const im = document.createElement('img'); im.src = 'assets/' + it.img; im.alt = it.name; im.className = 'place'; art.append(im);
    title.textContent = (fresh ? '새 장소 · ' : '') + it.name; body.textContent = `${it.note} · ${col.count} / ${ITEMS.length} 모음`;
    foundWear.hidden = false; foundWear.textContent = mapId === it.map ? '지금 여기' : '가 보기';
  } else {
    const im = document.createElement('img'); im.src = 'assets/' + it.img; im.alt = it.name; art.append(im);
    title.textContent = (fresh ? (it.craft ? '새로 만든 ' : '상자 속 ') : '') + it.name; body.textContent = `${it.note} · ${col.count} / ${ITEMS.length} 모음`;
    foundWear.hidden = false; foundWear.textContent = col.wearing(it.id) ? '벗기기' : '입혀 보기';
  }
  foundEl.hidden = false; foundEl.querySelector('button:not([hidden])').focus();
}
function setWear(id, on) {
  col.setWear(id, on);
  if (on) { const free = kiwis.filter(k => !k.gone && k.skin !== id); free.slice(0, Math.max(1, Math.ceil(free.length / 3))).forEach(k => { k.skin = id; k.startle(); }); }
  else kiwis.forEach(k => { if (k.skin === id) k.skin = pickSkin(); });
  paintCollection();
}
foundWear.addEventListener('click', () => {
  if (foundItem?.kind === 'map') { setMap(foundItem.map); paintCollection(); }
  else if (foundItem?.kind === 'sound') { const g = foundItem.group, on = curPack(g) === foundItem.pack; unlock(); setPack(g, on ? PACK_BASE[g][0].pack : foundItem.pack); toast(on ? `${foundItem.name} 끔` : `${foundItem.name} — 소리 창에서 바꿀 수 있어요`, 2200); paintCollection(); }
  else if (foundItem) setWear(foundItem.id, !col.wearing(foundItem.id));
  foundEl.hidden = true;
});
document.getElementById('foundClose').addEventListener('click', () => { foundEl.hidden = true; });
foundEl.addEventListener('click', e => { if (e.target === foundEl) foundEl.hidden = true; });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !foundEl.hidden) foundEl.hidden = true; });
// ── v13 물가 줍기 ──
function pickUp(d) {
  shore.take(d);
  const fresh = finds.add(d.f.id), u = beach.u;
  const C = d.f.r >= 2 ? ['#fff6c9', '#ffd98a', '#ffffff', '#c9f4ff'] : ['#ffffff', '#fff6dc'];
  for (let i = 0; i < (fresh ? 14 : 7); i++) { const a = Math.random() * 6.28, sp = (40 + Math.random() * 80) * u; sparks.push({ x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50 * u, r: (1.5 + Math.random() * 2) * u, c: C[i % C.length], age: 0, life: 0.6 + Math.random() * 0.4 }); }
  if (fresh) sound.found(d.x); else sound.peck(d.x);
  const n = finds.count(d.f.id);
  const ready = ITEMS.find(it => it.craft && !col.has(it.id) && it.craft[d.f.id] === n && finds.enough(it.craft));
  if (ready) toast(`${d.f.name} ×${n} — ${ready.name}${eulReul(ready.name)} 만들 수 있어요 (설정 → 바꾸기)`, 3200);
  else toast(fresh ? `새로 주웠어요 · ${d.f.name} (${RARITY[d.f.r]}) · 도감 ${finds.kinds} / ${FINDS.length}` : `${d.f.name} ×${n}`, fresh ? 2600 : 1300);
  if (!settings.hidden) paintCollection();
}
// 걸음이 쌓여 장소가 열리면 한 번 알린다
let openMaps = null;
function checkMapSteps() {
  const now = MAP_IDS.filter(id => mapOpen(id));
  if (!openMaps) { openMaps = new Set(now); return; }
  for (const id of now) if (!openMaps.has(id)) { openMaps.add(id); toast(`${MAPS[id].name}까지 걸어왔어요 — 설정에서 갈 수 있어요`, 3200); paintModeMenu(); }
}
function paintFinds() {
  const grid = document.getElementById('findGrid');
  document.getElementById('findTitle').textContent = `주운 것 ${finds.kinds} / ${FINDS.length}`;
  grid.textContent = '';
  for (const f of FINDS) {
    const b = document.createElement('button'); b.type = 'button';
    const n = finds.count(f.id);
    if (!(UNLOCK_ALL || finds.has(f.id))) {
      b.className = 'locked'; b.textContent = '?';
      const hint = f.hint || RARITY[f.r];
      b.setAttribute('aria-label', `아직 못 주움 · ${hint}`); b.title = hint;
      b.addEventListener('click', () => toast(`? · ${hint}`, 2200));
    } else {
      const sp = document.createElement('i'); sp.className = 'find';
      sp.style.backgroundPosition = `${(f.cell % 4) * 100 / 3}% ${Math.floor(f.cell / 4) * 100 / 3}%`;
      b.append(sp);
      if (n !== 1 && !(UNLOCK_ALL && n === 0)) { const c = document.createElement('span'); c.className = 'cnt'; c.textContent = n; b.append(c); }
      b.classList.toggle('used', n === 0 && !UNLOCK_ALL);
      b.classList.toggle('rare', f.r >= 2);
      b.setAttribute('aria-label', `${f.name} · ${RARITY[f.r]} · ${n}개`); b.title = `${f.name} · ${RARITY[f.r]}`;
      b.addEventListener('click', () => toast(`${f.name} · ${RARITY[f.r]} · ${n}개`, 2000));
    }
    grid.append(b);
  }
}
// 받침이 있으면 "을", 없으면 "를"
const eulReul = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '을' : '를'; };
// 바꾸기: 주운 것 → 키위 옷
function paintCraft() {
  const list = document.getElementById('craftList');
  list.textContent = '';
  for (const it of ITEMS.filter(i => i.craft)) {
    const row = document.createElement('div'); row.className = 'craft';
    const im = document.createElement('img'); im.src = 'assets/' + it.img; im.alt = '';
    const tx = document.createElement('div'); tx.className = 'tx';
    const nm = document.createElement('b'); nm.textContent = it.name;
    const req = document.createElement('span');
    req.textContent = Object.entries(it.craft).map(([id, c]) => `${FIND[id].name} ${Math.min(finds.count(id), c)}/${c}`).join(' · ');
    tx.append(nm, req);
    const bt = document.createElement('button'); bt.type = 'button';
    const made = col.owns(it.id), ok = finds.enough(it.craft);
    bt.textContent = made ? '만듦' : '만들기'; bt.disabled = made || !ok;
    bt.className = !made && ok ? 'go' : '';
    bt.addEventListener('click', () => {
      if (col.has(it.id) || !finds.spend(it.craft)) return;
      col.add(it.id); sound.found(W / 2);
      paintCollection(); showFound(it, true);
    });
    row.append(im, tx, bt);
    list.append(row);
  }
}
function paintCollection() {
  paintFinds();
  paintCraft();
  const grid = document.getElementById('colGrid');
  document.getElementById('colTitle').textContent = `모은 것 ${col.count} / ${ITEMS.length}${UNLOCK_ALL ? ' · 테스트: 모두 열림' : ''}`;
  grid.textContent = '';
  for (const it of ITEMS) {
    const b = document.createElement('button'); b.type = 'button';
    if (!col.owns(it.id)) { b.className = 'locked'; b.textContent = '?'; b.setAttribute('aria-label', '아직 못 찾음'); b.disabled = true; }
    else if (it.kind === 'letter') { b.textContent = '✉'; b.setAttribute('aria-label', it.title + ' 다시 읽기'); b.addEventListener('click', () => showFound(it)); }
    else if (it.kind === 'sound') {
      const on = curPack(it.group) === it.pack;
      b.textContent = it.group === 'step' ? '👣' : it.group === 'music' ? '♫' : '♪'; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', `${it.name} ${on ? '끄기' : '틀기'}`); b.title = it.name;
      b.addEventListener('click', () => { unlock(); setPack(it.group, on ? PACK_BASE[it.group][0].pack : it.pack); toast(on ? `${it.name} 끔` : it.name, 1500); paintCollection(); });
    }
    else if (it.kind === 'map') {
      const im = document.createElement('img'); im.src = 'assets/' + it.img; im.alt = ''; b.append(im); b.classList.add('place');
      b.classList.toggle('on', mapId === it.map); b.setAttribute('aria-label', it.name + ' 가 보기');
      b.addEventListener('click', () => { setMap(it.map); paintCollection(); });
    }
    else {
      const im = document.createElement('img'); im.src = 'assets/' + it.img; im.alt = ''; b.append(im);
      b.classList.toggle('on', col.wearing(it.id)); b.setAttribute('aria-pressed', String(col.wearing(it.id))); b.setAttribute('aria-label', it.name + (col.wearing(it.id) ? ' 벗기기' : ' 입히기'));
      b.addEventListener('click', () => setWear(it.id, !col.wearing(it.id)));
    }
    grid.append(b);
  }
}
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
{ const st = focus.resolveStale(); paintFocus(); if (st) setTimeout(() => toast(`지난 집중은 화면을 떠나서 멈췄어요 · ${n0(st.steps)}보`, 3200), 1500); }
const paintWeather = () => { weatherBtn.dataset.weather = atmos.weather; weatherBtn.setAttribute('aria-label', `날씨: ${WEATHER_NAME[atmos.weather]} (바꾸기)`); };
weatherBtn.addEventListener('click', () => {
  atmos.setWeather(WEATHERS[(WEATHERS.indexOf(atmos.weather) + 1) % WEATHERS.length]);
  save('weather', atmos.weather); paintWeather(); toast(WEATHER_NAME[atmos.weather]);
});
paintWeather();

// 첫 문장: 그림을 다 읽은 뒤에만 (느린 연결에서 그림보다 먼저 쓰려다 오류가 나지 않게)
const firstWrite = () => { if (!plate) { setTimeout(firstWrite, 300); return; } if (phase === 'idle' && !current && mode === 'free') write(FIRST); };
setTimeout(firstWrite, 700);

window.__kiwi = { setPack, paintPacks, focus, completeFocus, shore, finds, pickUp, paintCollection, get phase() { return phase; }, get kiwis() { return kiwis; }, get jobs() { return jobs; }, get current() { return current; }, beach, clouds, atmos, sound, get plate() { return plate; }, drifters, col, openDrift, get notes() { return notes; }, submit, setView, toWorld };
