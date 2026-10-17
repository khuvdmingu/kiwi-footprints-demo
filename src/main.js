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

import { layoutText, strokesOf, glyph } from './hangul.js?v=v18.8.0';
import { Beach } from './beach.js?v=v18.8.0';
import { Kiwi } from './kiwi.js?v=v18.8.0';
import { Sound, SONG_TRACKS } from './sound.js?v=v18.8.0';
import { loadPlate } from './plate.js?v=v18.8.0';
import { MAPS, MAP_IDS } from './maps.js?v=v18.8.0';
import { WaterGL, FlatWater } from './water.js?v=v18.8.0';
import { setKiwiSprite, setKiwiSkins } from './kiwi.js?v=v18.8.0';
import { ITEMS, ITEM, Collection, Drifters } from './items.js?v=v18.8.0';
import { Leaves } from './leaves.js?v=v18.8.0';
import { Rake } from './zen.js?v=v18.8.0';
import { Clouds } from './clouds.js?v=v18.8.0';
import { Gulls } from './gulls.js?v=v18.8.0';
import { Atmos, WEATHERS, WEATHER_NAME, timeLight, artAt } from './atmos.js?v=v18.8.0';
import { MODES, MODE_NAME, QUOTES, WORDS, Deck, clockText, isClock, CLOCK_FMTS } from './content.js?v=v18.8.0';
import { clamp, dist } from './util.js?v=v18.8.0';
import { Focus, Awake, LENGTHS } from './focus.js?v=v18.8.0';
import { UNLOCK_ALL } from './config.js?v=v18.8.0';
import { Shore, Finds, FINDS, FIND, RARITY } from './shore.js?v=v18.8.0';

const q = new URLSearchParams(location.search);
const num = (k, d) => { const v = q.get(k); return v != null && v !== '' && !isNaN(+v) ? +v : d; };
const SEED = num('seed', 7);
const SPEED = clamp(num('speed', 1), 0.25, 6);
const HOLD = Math.max(1, num('hold', 9));
const DEBUG = q.has('debug');
const FIRST = q.get('text') || '안녕 키위';
const VIEWS = ['top', 'diorama', 'follow'];
const VIEW_NAME = { top: '위에서', diorama: '디오라마', follow: '따라가기' };
// 위에 뜨는 카드(편지 등)·고르기 창 안을 누른 것은 아래 창의 "바깥을 누름"이 아니다 (v18.6.2)
const onTop = t => !!(t && t.closest && t.closest('#found, #picker'));

const worldEl = document.getElementById('world');
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
let plateEl = document.getElementById('plate');
const canopyEl = document.getElementById('canopy'), canopyNEl = document.getElementById('canopyN'), canopyWEl = document.getElementById('canopyW');
let plate = null, water = null;
// 판 두 벌: 가로 화면은 plate*, 세로로 긴 화면(휴대폰)은 tall* — 처음 필요할 때 읽어 둔다
// 기기 저장값 읽기·쓰기 — 장소·글 모드·시계 설정이 시작하자마자 쓰므로 맨 먼저 둔다
const saved = k => { try { return localStorage.getItem('kiwi-footprints.' + k); } catch (e) { return null; } };
const save = (k, v) => { try { localStorage.setItem('kiwi-footprints.' + k, v); } catch (e) { /* 저장소 없음 */ } };
const plates = {};
// 장소: ?map= 이 기기에 저장된 값보다 먼저
let mapId = MAP_IDS.includes(q.get('map')) ? q.get('map') : MAP_IDS.includes(saved('map')) ? saved('map') : 'beach';
const plateFor = (w, h) => MAPS[mapId][w / h < 0.8 ? 'tall' : 'wide'];
function getPlate(name) {
  if (plates[name]) return plates[name];
  const m = Object.values(MAPS).find(v => v.wide === name || v.tall === name) || {};
  const pr = plates[name] = loadPlate('assets/', name, { stones: !!m.stones, shoreFrom: m.shoreFrom, ground: m.ground, moss: !!m.moss, art: m.art !== false, eraser: m.eraser, rest: m.rest });
  pr.catch(() => { if (plates[name] === pr) delete plates[name]; });   // 못 읽었으면(오프라인 v18.3) 기억하지 않는다 — 다시 연결되면 다시 읽는다
  return pr;
}
const cloudCanvas = document.getElementById('clouds'), cctx = cloudCanvas.getContext('2d');
const glowEl = document.getElementById('glow');
const clouds = new Clouds();
const gulls = new Gulls();   // v7: 바다 위 갈매기
const beach = new Beach(SEED);
const sound = new Sound({ enabled: q.get('sound') !== '0' });
const fxCanvas = document.getElementById('fx');
const fctx = fxCanvas.getContext('2d');
const tintEl = document.getElementById('tint');
// 시간 빛(#tint, 곱하기)은 작은 캔버스에 그려 늘린다 (v18.5.4). CSS 그라데이션이던 때는 핀치로 확대하면 브라우저가 새 배율로
//  사각형 타일마다 다시 그렸고, 아직 못 그린 타일 자리만 어둡게 안 덮여 밤에 밝은 사각형이 깜빡였다(낮엔 거의 흰색이라 안 보임).
//  캔버스는 한 장짜리 그림이라 확대해도 다시 그리지 않는다. 부드러운 그라데이션이라 가로 160칸이면 충분
let tintKey = '';
function paintTint() {
  const stops = atmos.tintStops(art.n, art.w), tw = 160, th = Math.max(1, Math.round(160 * H / Math.max(1, W)));
  const key = stops.join('|') + '|' + th;
  if (key === tintKey) return;
  tintKey = key;
  if (tintEl.width !== tw || tintEl.height !== th) { tintEl.width = tw; tintEl.height = th; }
  const c = tintEl.getContext('2d'), cx = tw * 0.55, cy = th * 0.45, rx = tw * 0.75, ry = th * 0.62;
  c.setTransform(rx, 0, 0, ry, cx, cy);   // 원을 가로 rx · 세로 ry 타원으로
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgb(${stops[0]})`); g.addColorStop(0.55, `rgb(${stops[1]})`); g.addColorStop(1, `rgb(${stops[2]})`);
  c.fillStyle = g; c.fillRect(-cx / rx, -cy / ry, tw / rx, th / ry);
}
const captionEl = document.getElementById('caption');
const atmos = new Atmos(q.get('weather') || saved('weather') || 'clear');
// 시계 선택지: 초 표시 · 표기(오전/오후 · AM/PM · 24시간). 주소 ?sec=1 · ?ampm=ko|en|24 가 기기에 저장된 값보다 먼저
const clockOpt = (() => { try { return { sec: false, fmt: 'ko', ...JSON.parse(saved('clock') || '{}') }; } catch (e) { return { sec: false, fmt: 'ko' }; } })();
if (q.get('sec') != null) clockOpt.sec = q.get('sec') !== '0';
if (CLOCK_FMTS.includes(q.get('ampm'))) clockOpt.fmt = q.get('ampm');
if (!CLOCK_FMTS.includes(clockOpt.fmt)) clockOpt.fmt = 'ko';
// 키위 수 (v18.5): 정성 단계(한 마리·조금·보통·많이) + 정량(직접 1~30마리).
//  'normal' = v18.4까지의 규칙 그대로. 단계는 한 마리가 맡는 획 수(per)·상한(max)·시계 고쳐 쓰기 상한(clockMax)·
//  쉬는 동안 머릿수(idle 낮/밤)만 바꾼다. 'custom' = 고른 수가 상한 — 획이 더 적으면 획 수만큼, 쉴 때는 낮 2·밤 4를 넘지 않게.
//  최소 머릿수(새 글 3·시계 2)도 상한을 넘지 않는다. 주소 ?kiwis=one|few|normal|many|숫자 가 저장값보다 먼저
const CROWD = {
  one:    { per: 1e9, max: 1,  clockMax: 1,  idle: [1, 1] },
  few:    { per: 5,   max: 8,  clockMax: 5,  idle: [1, 2] },
  normal: { per: 2.5, max: 22, clockMax: 10, idle: [2, 4] },
  many:   { per: 1.5, max: 30, clockMax: 14, idle: [3, 6] },
};
const CROWD_N = [1, 30];
let crowdId = 'normal', crowdN = 6;
{
  const pick = v => {
    if (CROWD[v] || v === 'custom') return (crowdId = v), true;
    if (v != null && v !== '' && !isNaN(+v)) return (crowdId = 'custom'), (crowdN = clamp(Math.round(+v), ...CROWD_N)), true;
    return false;
  };
  if (!isNaN(+saved('kiwisN')) && saved('kiwisN')) crowdN = clamp(Math.round(+saved('kiwisN')), ...CROWD_N);
  pick(q.get('kiwis')) || pick(saved('kiwis'));
}
const crowd = () => crowdId === 'custom'
  ? { per: 1, max: crowdN, clockMax: crowdN, idle: [Math.min(2, crowdN), Math.min(4, crowdN)] }
  : CROWD[crowdId];
// 예전 '시계 · 초' 모드(clocksec)는 시계 + 초 켜기로 옮긴다
const modeIn = m => (m === 'clocksec' ? ((clockOpt.sec = true), 'clock') : m);
let mode = MODES.includes(modeIn(q.get('mode'))) ? modeIn(q.get('mode')) : MODES.includes(modeIn(saved('mode'))) ? modeIn(saved('mode')) : 'free';
const HOUR_Q = q.get('hour') != null && q.get('hour') !== '' && !isNaN(+q.get('hour')) ? +q.get('hour') : null;
let hourShift = 0;          // T 키로 3시간씩 미리보기
const realHour = (now = new Date()) => ((HOUR_Q ?? now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600) + hourShift) % 24;
// 시간대 (v16.3): 'auto' = 지금 시각을 따라 빛이 바뀐다 · 'manual' = 고른 시각의 빛에 머문다(낮에도 저녁 빛으로 두고 싶을 때)
//  시계 글씨와 물가 줍기(밤·해 질 녘 희귀품)는 언제나 실제 시각을 따른다.
let lightMode = HOUR_Q == null && saved('light') === 'manual' ? 'manual' : 'auto';   // ?hour= 미리보기는 그 시각의 빛을 보여 준다(저장값 무시)
let lightPick = (() => { const v = parseFloat(saved('lightHour')); return v >= 0 && v < 24 ? v : 18.3; })();
let lightShown = null;
// 시간대 그림 (v16.5 밤 · v16.6 노을·새벽): 칸 N = 밤, W = 노을 또는 새벽. 섞인 정도는 천천히 따라간다.
const art = { n: 0, w: 0, shown: '', idle: { N: 0, W: 0 } };
function paintArtCanopy(slot) {
  if (!plate || !water) return;
  const s = water.slots && water.slots[slot], set = s && plate.sets && plate.sets[s.kind];
  if (set) plate.paintCanopy(slot === 'N' ? canopyNEl : canopyWEl, artDpr(), set.img);
}
function paintNightCanopy() { paintArtCanopy('N'); paintArtCanopy('W'); }
function artTick(dt) {
  const want = artAt(lightShown);
  // 필요해지면 읽어 칸에 올린다 (노을 ↔ 새벽은 W 칸이 비었을 때 바꾼다)
  const need = (slot, kind, k) => {
    if (k < 0.01 || water.has(slot, kind)) return;
    if (slot === 'W' && water.has('W') && art.w > 0.01) return;
    const p0 = plate;
    plate.loadSet(kind).then(set => { if (set && plate === p0 && artAt(lightShown)[slot === 'N' ? 'n' : 'w'] > 0.01) { water.setSet(slot, p0, kind); paintArtCanopy(slot); } });
  };
  need('N', 'night', want.n); need('W', want.kind, want.w);
  const toN = water.has('N', 'night') ? want.n : 0, toW = water.has('W', want.kind) ? want.w : 0, f = Math.min(1, dt * 1.6);
  art.n += (toN - art.n) * f; art.w += (toW - art.w) * f;
  if (art.n < 0.003 && !toN) art.n = 0; if (art.w < 0.003 && !toW) art.w = 0;
  // 30초 넘게 안 쓰는 칸은 내린다 (GPU 메모리)
  for (const [slot, k] of [['N', art.n], ['W', art.w]]) { art.idle[slot] = k ? 0 : art.idle[slot] + dt; if (art.idle[slot] > 30 && water.has(slot)) water.drop(slot); }
  const aN = art.n, aW = aN < 0.999 ? Math.min(1, art.w / (1 - aN)) : 0;   // 겹쳐 깔 때의 불투명도 (밤이 맨 위)
  const key = aN.toFixed(3) + aW.toFixed(3);
  if (key !== art.shown) {
    art.shown = key;
    canopyNEl.style.opacity = aN.toFixed(3); canopyWEl.style.opacity = aW.toFixed(3);
    // 키위·발자국·물건(stage)은 낮 빛으로 그려져 있다 — 밤 그림이 섞인 만큼 같이 어둡고 차분하게
    canvas.style.filter = aN || art.w ? `brightness(${(1 - 0.4 * aN - 0.06 * art.w).toFixed(3)}) saturate(${(1 - 0.45 * aN).toFixed(3)})` : '';
  }
  return aW;
}
let artWarm = 0;   // 화면에 보이는 빛의 시각 — 고른 시각까지 1~2초에 걸쳐 시계 방향 짧은 쪽으로 돈다
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
const floaters = new Leaves();   // 가을 호숫가: 물 위에 따로 떠다니는 단풍
const rake = new Rake();         // 모래 정원: 물 대신 쓸어 올리는 갈퀴
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
  // 발 크기 (v18.2: 0.056 → 0.047) — 발자국이 크면 ㅎ·ㅊ·흙 같은 작은 칸의 획이 서로 뭉친다 (tools/glyph-preview.html 로 비교)
  Object.assign(world, { stride: S * 0.085, foot: S * 0.047, speed: S * 0.9 * SPEED, writeSpeed: S * 0.55 * SPEED, k });
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
  water.resize(W, H, artDpr());
  plate.paintCanopy(canopyEl, artDpr());
  paintNightCanopy();
  clouds.amount = atmos.cloud;   // 첫 화면부터 날씨에 맞는 구름 수
  clouds.resize(W, H, beach.u);
  gulls.resize(beach);
  drifters.reset();
  floaters.reset(beach, !!MAPS[mapId].leaves);
  rake.reset();
  if (MAPS[mapId].lineGap) rake.setPlate(plate, MAPS[mapId].lineGap);   // 모래 정원: 그림 속 갈퀴 줄 간격에 맞춘다
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
  // 새 글이 오면 어슬렁·두리번 중인 키위는 바로 일하러 온다 (v18.3.3) — 모래 정원에서는 지우는 동안 키위가 제자리에 남아
  //  어슬렁 → 두리번(최대 3초) → 콕 한 바퀴를 다 마친 뒤에야 일감을 받아, 새 글을 써도 7초쯤 아무도 안 왔다.
  //  누른 자리를 파러 가는 키위(after 'dig')는 그대로 둔다
  for (const k of kiwis) if (!k.focus && !k.gone && !k.job && (k.state === 'idle' || (k.state === 'wander' && k.after !== 'dig'))) k.state = 'free';
  const active = kiwis.filter(k => !k.gone && k.state !== 'flee').length;
  const need = clamp(Math.ceil(jobs.length / crowd().per), Math.min(3, crowd().max), crowd().max) - active;
  for (let i = 0; i < need; i++) spawnQ.push(beach.t + (i * 0.3) / Math.sqrt(SPEED));
  sound.call(0.4, W / 2);
}

function wash() {
  // 모래 정원(v18.1): 파도 대신 갈퀴 줄이 한 줄씩 옆으로 다시 그어지며 천천히 지운다 — 키위는 쫓기지 않고, 다 그은 뒤에 새 글씨를 쓴다
  if (beach.still) {
    // 일감을 내려놓고 그 자리에서 잠깐 두리번 — 'go'·'write' 는 job 을 읽으므로 상태도 같이 바꿔야 한다(v18.1.1: 안 바꿔서 매 프레임 오류 → 멈춤)
    for (const k of kiwis) {
      if (k.focus) continue;
      if (k.job) { k.job.taken = null; k.job = null; }
      if (k.state === 'go' || k.state === 'write') { k.state = 'idle'; k.timer = 0.5 + Math.random() * 1.5; }
    }
    spawnQ = [];
    phase = 'washing';
    washAt = beach.t + rake.start(beach) + 0.6;
    return;
  }
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
  const need = clamp(Math.ceil(todo / crowd().per), Math.min(2, crowd().clockMax), crowd().clockMax) - active;
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
  // 걸음 기록은 칸 세 개로 (v18.6.1) — 한 줄에 이어 쓰면 숫자가 섞여 읽혔다
  const stats = document.getElementById('focusStats'); stats.textContent = '';
  if (focus.total || focus.done) for (const [v, l] of [[n0(focus.todaySteps) + '보', '오늘'], [n0(focus.total) + '보', `지금까지 ${km(focus.total)}km`], [focus.done + '번', '끝까지 한 집중']]) {
    const c = document.createElement('div'), b = document.createElement('b'), sp = document.createElement('span');
    b.textContent = v; sp.textContent = l; c.append(b, sp); stats.append(c);
  }
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
document.addEventListener('pointerdown', e => { if (!focusPanel.hidden && !onTop(e.target) && !focusPanel.contains(e.target) && !focusBtn.contains(e.target) && !focusHud.contains(e.target)) openFocusPanel(false); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && foundEl.hidden && !focusPanel.hidden) { openFocusPanel(false); focusBtn.focus(); } });
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
  viewBtn.setAttribute('aria-label', `시점: ${VIEW_NAME[v]} (고르기)`);
  if (announce) toast(VIEW_NAME[v]);
}

// ── 한 프레임 ──
function tick(dt) {
  const now = new Date();
  const hour = realHour(now);
  const lightTarget = lightMode === 'manual' ? lightPick : hour;
  if (lightShown == null) lightShown = lightTarget;
  else { const d = ((lightTarget - lightShown + 36) % 24) - 12; lightShown = Math.abs(d) < 0.005 ? lightTarget : (lightShown + d * Math.min(1, dt * 2.2) + 24) % 24; }
  atmos.update(dt, beach, lightShown);
  // 시간대 그림: 해 질 녘·밤·새벽에 그 빛으로 다시 칠한 판을 섞는다. 처음 필요해질 때 읽고, 다 읽기 전엔 시간 빛만.
  if (plate && water) artWarm = artTick(dt);
  clouds.amount = atmos.cloud; clouds.windK = atmos.windK;
  clouds.update(dt);
  if (MAPS[mapId].gulls && (atmos.night < 0.6 || gulls.list.length)) gulls.update(dt, beach, x => sound.gull(x), atmos.night < 0.6); else gulls.list.length = 0;   // 밤엔 갈매기가 새로 오지 않는다 (날던 새는 지나가게)
  sound.update({ high: clamp((beach.shoreY - beach.lvl) / (beach.H * 0.3), 0, 1), rain: atmos.v.rain, wind: Math.max(atmos.v.wind, atmos.v.rain * 0.3), night: atmos.night, hour: lightShown, weather: atmos.weather });
  if (beach.t - tintAt > 0.25) {
    tintAt = beach.t;
    paintTint();
    glowEl.style.opacity = String(Math.max(0.15, 1 - atmos.night * 0.85));   // 골든아워 빛은 밤엔 거의 사라진다
    document.body.classList.toggle('snowy', beach.snow > 0.3);
    if (lightMode === 'auto' && !settings.hidden) paintLight();
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

  // 키위 수를 줄였을 때: 상한보다 많으면 일감 없는 키위부터 조용히 숲으로 돌아간다 (쓰는 중인 키위는 마저 쓴다)
  let extra = kiwis.filter(k => !k.gone && k.state !== 'flee' && !k.focus).length - crowd().max;
  for (const kw of kiwis) {
    if (kw.focus) patrol(kw);
    else if (extra > 0 && !kw.gone && !kw.job && !kw.busy && kw.after !== 'dig' && ['free', 'wander', 'idle'].includes(kw.state)) {
      kw.flee(beach.grass(kw.x) - 50 * beach.u); kw.alertT = 0; extra--;
    }
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
  floaters.update(dt, beach, atmos.v.wind);
  if (beach.eraser === 'rake') rake.update(beach);
  focusTick();
  sound.place = mapId;   // v18.7 「장소 따라」 자연 소리
  shore.update(dt, beach, { map: mapId, only: MAPS[mapId].finds, night: timeLight(hour).night, weather: atmos.weather, hour });
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
    if (kiwis.length < crowd().idle[atmos.night > 0.5 ? 1 : 0]) spawn();   // 키위는 야행성 — 밤에 더 많이 나온다
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

const layerBusy = { clouds: true, fx: true };
function draw() {
  ctx.setTransform(stageScale, 0, 0, stageScale, 0, 0);
  ctx.clearRect(0, 0, W, H);
  water.draw(beach, { snow: beach.snow, night: atmos.night, rain: atmos.v.rain, art: art.n, warm: artWarm, land: beach.eraser !== 'water' });
  const raking = beach.eraser === 'rake';
  if (raking) rake.draw(ctx, beach);   // 다시 긋는 갈퀴 줄은 발자국 아래
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
  floaters.draw(ctx, beach);
  drifters.draw(ctx, beach);
  for (const kw of order) kw.drawShadow(ctx);
  // 그늘은 천천히 따라간다 (v18.3.3) — 그늘 가장자리를 지날 때 한 프레임에 확 바뀌지 않게
  for (const kw of order) { const sh = plate.shadeAt(kw.x, kw.y - kw.k * 0.4); kw.shade = kw.shade == null ? sh : kw.shade + (sh - kw.shade) * 0.12; kw.draw(ctx); }
  // 발자국 음: 작은 ♪ 가 흔들리며 떠올라 사라진다.
  //  (v18.3.1) 매 프레임 다시 그리는 이 층(stage)에 그린다 — 효과 층(fx)에 그리면 걸음마다 그 층이 비었다·찼다를 오가고,
  //  그때 브라우저가 층을 다시 묶으면서 위의 금빛 덧칠(#glow, soft-light)이 화면 전체를 순간 밝게 만들었다
  if (notes.length) {
    notes = notes.filter(n => beach.t - n.t < 1.3);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `${Math.round(S * 0.16)}px sans-serif`;
    for (const n of notes) {
      const a = beach.t - n.t, k = a / 1.3;
      ctx.globalAlpha = (1 - k) * 0.75;
      ctx.fillStyle = atmos.night > 0.5 ? '#f3f0c8' : '#7b5b3e';
      ctx.fillText('♪', n.x + Math.sin(a * 5) * S * 0.04 * n.d, n.y - S * 0.12 - a * S * 0.35);
    }
    ctx.restore();
  }
  // (최적화) 구름 층·효과 층은 맑은 날 대부분 비어 있다. 비어 있는 동안은 지우지도 그리지도 않는다
  //  — 손대지 않은 캔버스는 브라우저가 다시 올리지 않아서 GPU 일이 준다. 비워지는 첫 프레임에 한 번만 지운다.
  const cloudBusy = clouds.list.length > 0 || clouds.bits.length > 0;
  if (cloudBusy || layerBusy.clouds) {
    const cs = +cloudCanvas.dataset.scale || 1;
    cctx.setTransform(cs, 0, 0, cs, 0, 0);
    cctx.clearRect(0, 0, W, H);
    if (cloudBusy) clouds.draw(cctx);
  }
  layerBusy.clouds = cloudBusy;
  const fxBusy = gulls.list.length > 0 || sparks.length > 0 || leaves.length > 0 || atmos.busy;
  const fxWas = layerBusy.fx; layerBusy.fx = fxBusy;
  if (!fxBusy && !fxWas) return;
  fctx.setTransform(stageScale, 0, 0, stageScale, 0, 0);
  fctx.clearRect(0, 0, W, H);
  if (!fxBusy) return;
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
}

// (최적화) 느린 기기: 3초 넘게 40fps 아래로 버벅이면 그림 층(물·숲 잎)의 해상도만 한 단계 낮춘다
//  — 셰이더 일이 화면 픽셀 수에 비례해서 가장 크게 준다. 키위·글씨·발자국(stage 캔버스)은 그대로 선명하다.
//  2 → 1.5 → 1.25 → 1. 다시 올리지는 않는다(오르내림 방지). 이 기기·이번 방문에만.
let artScale = 0;   // 0 = 화면 해상도 그대로
const artDpr = () => (artScale ? Math.min(artScale, dpr) : dpr);
const perf = { ema: 1 / 60, slowFor: 0 };
function watchPerf(gap) {
  if (gap > 0.2 || !water || beach.t < 6) return;   // 숨김에서 돌아온 긴 틈 · 그림·소리를 읽는 첫 6초는 세지 않는다
  // 손가락으로 핀치·끌기 하는 동안 느려지는 건 기기 탓이 아니다 — 세지 않는다(해상도를 낮추며 층을 다시 만들면 번쩍인다, v18.5.3)
  if (gesturing()) { perf.slowFor = 0; return; }
  perf.ema += (gap - perf.ema) * 0.05;
  perf.slowFor = perf.ema > 1 / 40 ? perf.slowFor + gap : 0;
  const cur = artDpr();
  if (perf.slowFor > 3 && cur > 1) {
    artScale = cur > 1.5 ? 1.5 : cur > 1.25 ? 1.25 : 1;
    water.resize(W, H, artScale);
    plate.paintCanopy(canopyEl, artScale);
    paintNightCanopy();
    perf.slowFor = 0;
  }
}

let last = performance.now(), ready = false;
function frame(now) {
  watchPerf((now - last) / 1000);
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
// 작품 설명의 버튼 목록에 실제 버튼 그림을 그대로 옮겨 쓴다 (v18.6.1) — 그림이 바뀌어도 설명이 따라간다
for (const i of info.querySelectorAll('[data-icon]')) { const svg = document.getElementById(i.dataset.icon)?.querySelector('svg'); if (!svg) continue; const c = svg.cloneNode(true); c.querySelectorAll(':scope > g[class]').forEach((g, k) => k && g.remove()); i.append(c); }   // 글 모드·날씨는 그림 여러 벌 중 첫 번째만
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
// 창 안의 탭 (v18.6): 설정은 풍경 · 글씨 · 모은 것, 소리 창은 크기 · 곡 · 발자국·배경 — 한 줄로 길게 섞여 있던 것을 나눴다
function wireTabs(panel, key) {
  const tabs = [...panel.querySelectorAll('[role="tab"]')];
  const show = name => {
    if (!tabs.some(t => t.dataset.tab === name)) name = tabs[0].dataset.tab;
    for (const t of tabs) { const on = t.dataset.tab === name; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; }
    for (const p of panel.querySelectorAll('.pane')) p.hidden = p.dataset.pane !== name;
    panel.scrollTop = 0; save('tab.' + key, name);
  };
  for (const t of tabs) t.addEventListener('click', () => show(t.dataset.tab));
  panel.querySelector('[role="tablist"]').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true'), n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    show(n.dataset.tab); n.focus(); e.preventDefault();
  });
  show(saved('tab.' + key) || tabs[0].dataset.tab);
  return show;
}
const mixerTab = wireTabs(mixer, 'mixer');
const openMixer = open => {
  mixer.hidden = !open;
  soundBtn.setAttribute('aria-expanded', String(open));
  if (open) mixer.querySelector('[role="tab"][aria-selected="true"]').focus();
};
soundBtn.addEventListener('click', () => { unlock(); paintPacks(); openMixer(mixer.hidden); });
const mixOn = document.getElementById('mixOn');
mixOn.checked = sound.on;
mixOn.addEventListener('change', () => { sound.setOn(mixOn.checked); paintSoundBtn(); });
// v14 발자국 소리 · 자연 배경: 모은 소리만 고를 수 있다 (못 모은 건 ?)
// 맨 앞 칸 = 기본. 다른 칸을 고르면 기본 대신 그 소리가 나온다 (겹치지 않는다)
const PACK_BASE = { step: [{ pack: 'music', name: '발자국 음악' }, { pack: 'sand', name: '모래' }], nature: [{ pack: 'none', name: '기본' }], music: [{ pack: 'auto', name: '시간 따라 바뀌는 음악' }], find: [{ pack: 'base', name: '기본 종소리' }], natstep: [{ pack: 'place', name: '장소 따라' }] };
const PACK_KEY = { step: 'stepPack', nature: 'nature', music: 'song', find: 'findPack', natstep: 'natStep' }, PACK_BOX = { step: 'stepPacks', nature: 'naturePacks', music: 'songPacks', find: 'findPacks' };
const GROUP_NAME = { step: '발자국 소리', nature: '자연 배경', music: '곡' };
const curPack = g => sound.mix[PACK_KEY[g]];
// v18.7 키위 소리 두 갈래: 악기 소리(지금까지의 발자국 음악·바닥 악기) / 자연스러운 소리(녹음 — 걷기·콕·도망, 장소 따라 기본)
const VOICES = [{ id: 'inst', name: '악기 소리' }, { id: 'natural', name: '자연스러운 소리' }];
const STEP_HINT = { inst: '글씨를 밟을 때마다 화음 안의 음으로 울려요. 모은 악기를 고르면 콕도 그 악기로.', natural: '걷기·콕을 실제 녹음으로, 도망칠 땐 종종걸음. 「장소 따라」는 모은 녹음 중 그 장소 것을 쓰고, 아직 없으면 기본 소리.' };
// v18.8 자연 녹음·반짝 녹음도 소라로 모은다 — 엔진이 「장소 따라」에서 모은 것만 쓰게 알려 준다
const natItem = Object.fromEntries(ITEMS.filter(i => i.group === 'natstep').map(i => [i.pack, i.id]));
sound.ownNat = { has: pack => !natItem[pack] || col.owns(natItem[pack]) };
function setPack(group, pack, preview = true) {
  if (group === 'natstep') { sound.setMix({ natStep: pack }); if (preview) sound.previewStep(pack); }
  else if (group === 'find') { sound.setMix({ findPack: pack }); if (preview) sound.found(sound.stage.W / 2); }
  else if (group === 'step') { sound.setMix({ stepPack: pack }); if (preview) sound.previewStep(pack); }
  else if (group === 'music') sound.setSong(pack);
  else sound.setNature(pack);
  paintPacks();
}
function paintPacks() {
  const vbox = document.getElementById('voicePacks');
  vbox.textContent = '';
  for (const v of VOICES) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = v.name;
    b.setAttribute('aria-pressed', String((sound.mix.voice || 'inst') === v.id));
    b.addEventListener('click', () => { unlock(); sound.setMix({ voice: v.id }); paintPacks(); sound.previewStep(v.id === 'natural' ? sound.mix.natStep : sound.mix.stepPack); });
    vbox.append(b);
  }
  const natural = sound.mix.voice === 'natural';
  document.getElementById('stepHint').textContent = STEP_HINT[natural ? 'natural' : 'inst'];
  for (const g of ['music', 'step', 'nature', 'find']) {
    const group = g === 'step' && natural ? 'natstep' : g;   // 발자국 칸은 고른 갈래의 목록
    const box = document.getElementById(PACK_BOX[g]), cur = curPack(group);
    box.textContent = '';
    let part = null;
    for (const it of [...PACK_BASE[group], ...ITEMS.filter(i => i.kind === 'sound' && i.group === group)]) {
      // 곡은 묶음별로 작은 제목 (v18.6) — 20곡이 한 덩어리로 섞여 있었다
      if (group === 'music') {
        const p = !it.id ? '기본' : SONG_TRACKS[it.pack] ? '가져온 곡' : '직접 만든 곡';
        if (p !== part) { part = p; const h = document.createElement('p'); h.className = 'part'; h.textContent = p; box.append(h); }
      }
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
  if (!VOICES.some(v => v.id === sound.mix.voice)) sound.setMix({ voice: 'inst' });
  if (!own('nature', sound.mix.nature)) sound.mix.nature = 'none';
  if (!own('music', sound.mix.song)) sound.setSong('auto'); }
for (const k of ['music', 'amb', 'sfx']) {
  const el = document.getElementById('mix-' + k);
  el.value = Math.round(sound.mix[k] * 100);
  el.addEventListener('input', () => sound.setMix({ [k]: el.value / 100 }));
}
document.addEventListener('pointerdown', e => { if (!mixer.hidden && !onTop(e.target) && !mixer.contains(e.target) && !soundBtn.contains(e.target)) openMixer(false); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && foundEl.hidden && !mixer.hidden) { openMixer(false); soundBtn.focus(); } });
paintSoundBtn();
viewBtn.addEventListener('click', () => openPicker(viewBtn, '시점', VIEWS.map(v => ({ id: v, name: VIEW_NAME[v] })), view, v => setView(v)));
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
  if (e.key === 'v') setView(VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length]);
  if (e.key === 'm') { unlock(); setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]); }
  if (e.key === 'w') pickWeather(WEATHERS[(WEATHERS.indexOf(atmos.weather) + 1) % WEATHERS.length]);
  if (e.key === 't') { hourShift = (hourShift + 3) % 24; toast(`시간 미리보기 +${hourShift}시간`); }
});

// 누르기: 구름이면 찢고, 키위면 놀라고, 빈 모래면 근처 키위가 와서 콕
// 화면에 닿아 있는 손가락 — 두 번째 손가락(핀치)은 콕·안개 뚫기를 하지 않는다 (window 캡처라 아래 처리보다 먼저 센다)
const fingers = new Set();
window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') fingers.add(e.pointerId); }, true);
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, e => fingers.delete(e.pointerId), true);
document.getElementById('touch').addEventListener('pointerdown', e => {
  if (!plate) return;   // 그림을 다 읽기 전에는 누를 곳이 없다
  if (fingers.size > 1) { fogWipe = null; return; }
  const [x, y] = toWorld(e.clientX, e.clientY);
  const sh = shore.hit(x, y, beach.u);
  if (sh) { pickUp(sh); return; }
  const dr = drifters.hit(x, y, beach.u);
      if (group === 'step' && it.id) {   // 악기 소리는 종류별 작은 제목 (v18.8)
        const p = /^s-i-/.test(it.id) ? '악기' : /^s-[pc]-/.test(it.id) ? '톡·뽁' : '바닥 악기';
        if (p !== part) { part = p; const h = document.createElement('p'); h.className = 'part'; h.textContent = p; box.append(h); }
      }
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
  if (!own('natstep', sound.mix.natStep)) sound.setMix({ natStep: 'place' });
  if (!own('find', sound.mix.findPack)) sound.setMix({ findPack: 'base' });
touchEl.addEventListener('pointermove', e => {
  if (!fogWipe || !e.buttons && e.pointerType === 'mouse') return;
  const [x, y] = toWorld(e.clientX, e.clientY), step = 22 * beach.u;
  const d = dist(x, y, fogWipe.x, fogWipe.y);
  if (d < step) return;
  for (let i = 1; i <= Math.floor(d / step); i++) { const f = i * step / d; atmos.punchFog(fogWipe.x + (x - fogWipe.x) * f, fogWipe.y + (y - fogWipe.y) * f, beach.u, false); }
  fogWipe = { x, y };
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) touchEl.addEventListener(ev, () => { fogWipe = null; });
// v18.5.1 핀치 확대·축소 복구: 확대된 동안은 한 손가락으로 화면을 옮길 수 있게(CSS body.zoomed), 1배로 돌아오면 다시 안개 문지르기
const pinched = () => !!window.visualViewport && window.visualViewport.scale > 1.02;
// v18.5.2~3 핀치 깜빡임: 폰은 핀치하는 동안 resize 를 계속 보내고(확대 중엔 innerWidth 도 바뀐다), resize() 는 캔버스를 비우고
//  발자국까지 지운 뒤 다시 쓴다 → 화면 전체가 깜빡였다. 손가락이 닿아 있거나 확대된 동안(제스처 중)에는 다시 만들지 않고,
//  손을 뗀 뒤 실제 화면 크기(2px 넘게)·픽셀 밀도가 바뀌었을 때만 한 번 다시 만든다.
//  손가락 수는 touch 이벤트로 센다 — 핀치가 시작되면 브라우저가 pointercancel 을 보내 pointer 로는 0 이 된다
let touching = 0;
for (const ev of ['touchstart', 'touchend', 'touchcancel']) window.addEventListener(ev, e => {
  touching = e.touches.length;
  if (!touching) maybeResize();
}, { passive: true, capture: true });
const gesturing = () => touching > 0 || pinched();
let rt = null, resizes = 0;
function maybeResize() {
  clearTimeout(rt);
  rt = setTimeout(() => {
    if (!plate || gesturing()) return;   // 손을 떼거나 1배로 돌아올 때 다시 불린다
    const near = (a, b) => Math.abs(a - b) <= 2;
    if (near(window.innerWidth, W) && near(window.innerHeight, H) && Math.min(window.devicePixelRatio || 1, 2) === dpr) return;
    resizes++;
    resize();
  }, 250);
}
window.addEventListener('resize', maybeResize);
// ?diag — 폰에서 깜빡임 원인 보기: 화면을 다시 만든 횟수 · 그림 층 해상도 · 확대 배율 · 닿은 손가락 · 화면 크기
if (q.has('diag')) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;font:12px/1.35 ui-monospace,monospace;color:#fff;background:#000a;padding:4px 7px;border-radius:6px;pointer-events:none';
  document.body.append(el);
  setInterval(() => { el.textContent = `다시 만듦 ${resizes} · 그림 ${artDpr().toFixed(2)}/${dpr} · 확대 ${(window.visualViewport?.scale || 1).toFixed(2)} · 손가락 ${touching} · ${innerWidth}×${innerHeight}`; }, 200);
}
if (window.visualViewport) {
  const vv = window.visualViewport;
  // 1배로 돌아왔을 때 확대 중에 건너뛴 화면 회전 등이 있었으면 그때 맞춘다 (같은 크기면 아무것도 안 함)
  const onZoom = () => { document.body.classList.toggle('zoomed', pinched()); if (!pinched()) maybeResize(); };
  vv.addEventListener('resize', onZoom); document.body.classList.toggle('zoomed', pinched());
}

// 그림 판·키위·갈매기 그림을 다 읽은 뒤 시작한다
async function boot() {
  const img = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  // 홈 화면 앱(v18.3)을 인터넷 없이 열면 기기에 저장된 그림만 있다 — 고른 장소(화면 방향 → 반대 방향) → 바닷가
  //  (그다음 기기에 남은 다른 장소) 읽히는 판으로 연다. 방향이 다른 판은 잘려 보일 뿐이고, 다시 연결되면 resize 가 맞는 판을 읽는다. 고른 장소는 저장한 그대로
  const first = (async () => {
    const side = innerWidth / innerHeight < 0.8 ? ['tall', 'wide'] : ['wide', 'tall'];
    let err;
    for (const id of new Set([mapId, 'beach', ...MAP_IDS])) for (const k of side) {
      try { const p = await getPlate(MAPS[id][k]); if (mapId !== id) { mapId = id; paintModeMenu(); } return p; } catch (e) { err = e; }
    }
    throw err;
  })();
  const [p, kiwiImg, gullImg, bottle, crate] = await Promise.all([first, img('assets/kiwi.webp?v=v18.8.0'), img('assets/gull.webp?v=v18.8.0'), img('assets/bottle.webp?v=v18.8.0'), img('assets/crate.webp?v=v18.8.0')]);
  img('assets/finds.webp?v=v18.8.0').then(im => {
    shore.setSheet(im);
    const c = document.createElement('canvas'), cw = im.naturalWidth / 4; c.width = c.height = cw;
    c.getContext('2d').drawImage(im, cw * 1.15, cw * 0.15, cw * 0.7, cw * 0.7, 0, 0, cw, cw);   // 1번 칸 = 소라 껍데기 (가운데 70% — 칸 안 여백을 덜어 병·상자만큼 보이게)
    drifters.setSprites({ ...drifters.imgs, conch: c });
  }).catch(() => {});
  drifters.setSprites({ bottle, crate });
  img('assets/leaves.webp?v=v18.8.0').then(im => floaters.setSheet(im)).catch(() => {});
  // 옷 입은 키위 그림은 뒤에서 천천히 읽는다 (없어도 맨몸으로 그린다)
  for (const it of ITEMS) if (it.kind === 'wear') img('assets/' + it.img).then(im => setKiwiSkins({ [it.id]: im })).catch(() => {});
  plate = p;
  // 3D 그래픽(WebGL2)이 안 되거나 셰이더가 이 기기 GPU 에서 안 만들어지면 그림만 그리는 2D 로 (v18.5.5) — 물결은 없어도 키위·글씨는 그대로
  try { if (q.get('gl') === '0') throw new Error('?gl=0 (2D 시험)'); water = new WaterGL(plateEl); water.setPlate(plate); }
  catch (e) { console.warn('3D 그래픽을 못 써서 2D 로 그립니다:', e); useFlat(); }
  // 메모리가 모자라면(아이패드 등) 브라우저가 3D 그래픽을 도중에 빼앗아 간다 — 그때도 2D 로 넘어간다
  plateEl.addEventListener('webglcontextlost', e => { e.preventDefault(); console.warn('3D 그래픽이 끊겨 2D 로 바꿉니다'); useFlat(); resize(); });
  setKiwiSprite(kiwiImg);
  gulls.setSprite(gullImg);
  resize();
  requestAnimationFrame(frame);
  }
// 3D 를 쓰던 캔버스에서는 2D 를 얻을 수 없어서 같은 자리에 새 캔버스를 끼운다
function useFlat() {
  if (water && water.flat) return;
  const c = plateEl.cloneNode(false);
  plateEl.replaceWith(c); plateEl = c;
  water = new FlatWater(c); water.setPlate(plate);
}
// 시작하다 실패하면 짙은 파란 가림막만 남아 "접속이 안 되는" 것처럼 보였다 (v18.5.5) — 이유를 화면에 적는다
boot().catch(e => {
  console.error(e);
  const el = document.getElementById('boot');
  el.classList.add('failed');
  el.innerHTML = '<p>이 기기에서 바닷가를 열지 못했어요.</p><p class="why"></p><p><a href="./?sw=0">저장본 지우고 다시 열기</a></p>';
  el.querySelector('.why').textContent = '이유: ' + (e && e.message || e);
});
const paintMode = () => { modeBtn.dataset.mode = mode; modeBtn.setAttribute('aria-label', `글 모드: ${MODE_NAME[mode]} (고르기)`); };
const nowHour = () => realHour();
// 장소 바꾸기: 그 장소 그림 판을 읽고(처음 한 번) 화면을 다시 짠다 — resize 가 지금 글을 새 바닥에 다시 쓴다
function setMap(id) {
  if (!MAPS[id] || id === mapId || !mapOpen(id)) return;
  // 그림 판을 먼저 읽고 옮긴다 (v18.3) — 인터넷 없이 아직 안 가 본 장소를 고르면 지금 자리에 그대로 둔다
  const prev = mapId, n = setMap.n = (setMap.n || 0) + 1; mapId = id; const want = plateFor(innerWidth, innerHeight); mapId = prev;
  getPlate(want).then(() => {
    if (n !== setMap.n || mapId !== prev) return;   // 그새 다른 장소를 골랐으면 마지막 것만
    mapId = id; save('map', id); paintModeMenu(); paintCollection(); toast(MAPS[id].name);
    if (plate) resize();
  }).catch(() => { if (n === setMap.n) { paintModeMenu(); toast('인터넷이 연결되면 갈 수 있어요', 2200); } });
}
function setMode(m, announce = true) {
  mode = m;
  save('mode', mode); paintMode(); paintModeMenu();
  if (announce) toast(MODE_NAME[mode]);
  if (mode !== 'free') submit(...nextAuto(nowHour()));
  else showCaption(null);
}
// 글 모드 버튼: 누르면 고르기 창 (v18.6.2 — M 키는 그대로 다음 모드로)
modeBtn.addEventListener('click', () => { unlock(); openPicker(modeBtn, '글 모드', MODES.map(m => ({ id: m, name: MODE_NAME[m], g: 'm-' + m })), mode, m => { if (m !== mode) setMode(m); }); });
// 설정 창(톱니바퀴): 시계 초 표시 · 표기
const settings = document.getElementById('settings'), setBtn = document.getElementById('setBtn');
const settingsTab = wireTabs(settings, 'settings');
const openSettings = open => { settings.hidden = !open; setBtn.setAttribute('aria-expanded', String(open)); if (open) settings.querySelector('[role="tab"][aria-selected="true"]').focus(); };
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
  paintCrowd();
}
// 키위 수 — 단계를 고르면 슬라이더가 그 단계의 상한을 보여 주고, 슬라이더를 움직이면 '직접'이 된다
const crowdRange = document.getElementById('kiwiN'), crowdNow = document.getElementById('kiwiNow');
function paintCrowd() {
  for (const r of settings.querySelectorAll('input[name="kiwis"]')) r.checked = r.value === crowdId;
  const n = crowd().max;
  if (document.activeElement !== crowdRange) crowdRange.value = String(n);
  crowdNow.textContent = crowdId === 'custom' ? `${n}마리까지` : crowdId === 'one' ? '한 마리가 다 써요' : `글 길이에 따라 · 최대 ${n}마리`;
}
// 쓰는 중에 늘렸으면 남은 획에 맞춰 더 부른다 (줄였으면 update 가 남는 키위를 숲으로 돌려보낸다)
function setCrowd(id, n) {
  if (!CROWD[id] && id !== 'custom') return;
  crowdId = id; save('kiwis', id);
  if (n != null) { crowdN = clamp(Math.round(n), ...CROWD_N); save('kiwisN', String(crowdN)); }
  paintCrowd();
  if (phase !== 'writing') return;
  const active = kiwis.filter(k => !k.gone && k.state !== 'flee').length, todo = jobs.filter(j => !j.done).length;
  const need = clamp(Math.ceil(todo / crowd().per), Math.min(1, todo), crowd().max) - active;
  for (let i = 0; i < need; i++) spawnQ.push(beach.t + (i * 0.3) / Math.sqrt(SPEED));
}
crowdRange.addEventListener('input', () => setCrowd('custom', +crowdRange.value));
setBtn.addEventListener('click', () => { unlock(); paintCollection(); paintModeMenu(); paintLight(); openSettings(settings.hidden); });

// ── 시간대 ──
const lightOpts = document.getElementById('lightOpts'), lightRange = document.getElementById('lightHour'), lightNowEl = document.getElementById('lightNow');
const DAY_PART = [[0, '한밤'], [3.4, '새벽 전'], [5, '새벽'], [6.5, '아침'], [10, '한낮'], [15, '오후'], [17.4, '노을'], [19, '저녁'], [20.5, '밤'], [22.5, '한밤']];
const partOf = h => DAY_PART.filter(([a]) => a <= h).pop()[1];
const hhmm = h => { const m = Math.round(h * 60) % 1440, H = Math.floor(m / 60), M = m % 60; return `${H < 12 ? '오전' : '오후'} ${(H % 12) || 12}:${String(M).padStart(2, '0')}`; };
function paintLight() {
  for (const r of settings.querySelectorAll('input[name="light"]')) r.checked = r.value === lightMode;
  lightOpts.classList.toggle('auto', lightMode === 'auto');
  const h = lightMode === 'manual' ? lightPick : realHour();
  lightNowEl.textContent = `${lightMode === 'manual' ? '' : '지금 '}${hhmm(h)} · ${partOf(h)}`;
  if (document.activeElement !== lightRange) lightRange.value = String(lightPick);
  for (const b of lightOpts.querySelectorAll('.chips button')) b.classList.toggle('on', lightMode === 'manual' && Math.abs(+b.dataset.h - lightPick) < 0.01);
}
function setLight(mode, h) {
  lightMode = mode; if (h != null) lightPick = ((h % 24) + 24) % 24;
  save('light', lightMode); save('lightHour', String(lightPick));
  paintLight();
}
for (const r of settings.querySelectorAll('input[name="light"]')) r.addEventListener('change', () => { if (r.checked) setLight(r.value); });
lightRange.addEventListener('input', () => setLight('manual', +lightRange.value));
for (const b of lightOpts.querySelectorAll('.chips button')) b.addEventListener('click', () => setLight('manual', +b.dataset.h));

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
    const letters = ITEMS.filter(i => i.kind === 'letter');
    title.textContent = (fresh ? '유리병 속 ' : '') + it.title; body.textContent = `모은 편지 ${letters.filter(i => col.owns(i.id)).length} / ${letters.length}`;
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
  foundBack = document.activeElement;
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
let foundBack = null;
function closeFound() { foundEl.hidden = true; if (foundBack && foundBack.isConnected && foundBack.offsetParent) foundBack.focus(); foundBack = null; }
document.getElementById('foundClose').addEventListener('click', closeFound);
foundEl.addEventListener('click', e => { if (e.target === foundEl) closeFound(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !foundEl.hidden) { closeFound(); e.stopImmediatePropagation(); } }, true);
// ── v13 물가 줍기 ──
function pickUp(d) {
  shore.take(d);
  const fresh = finds.add(d.f.id), u = beach.u;
  const C = d.f.r >= 2 ? ['#fff6c9', '#ffd98a', '#ffffff', '#c9f4ff'] : ['#ffffff', '#fff6dc'];
  for (let i = 0; i < (fresh ? 14 : 7); i++) { const a = Math.random() * 6.28, sp = (40 + Math.random() * 80) * u; sparks.push({ x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50 * u, r: (1.5 + Math.random() * 2) * u, c: C[i % C.length], age: 0, life: 0.6 + Math.random() * 0.4 }); }
  sound.pick(d.x, fresh, d.f.r >= 2);   // v18.7 줍기 녹음 (희귀 = 드러남)
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
  // 종류별로 나눠 그린다 (v18.6) — 편지·옷·장소·곡·발자국 소리가 한 칸 격자에 섞여 있었다. 소리는 소리 창에서만 고른다
  const of = k => ITEMS.filter(it => it.kind === k), owned = list => list.filter(it => col.owns(it.id)).length;
  const letters = of('letter'), wears = of('wear'), places = of('map'), sounds = of('sound');
  document.getElementById('colTitle').textContent = `전체 ${col.count} / ${ITEMS.length}${UNLOCK_ALL ? ' · 테스트: 모두 열림' : ''}`;
  document.getElementById('letterTitle').textContent = `편지 ${owned(letters)} / ${letters.length}`;
  document.getElementById('wearTitle').textContent = `옷 ${owned(wears)} / ${wears.length}`;
  document.getElementById('placeTitle').textContent = `장소 ${owned(places)} / ${places.length}`;
  document.getElementById('soundTitle').textContent = `소리 ${owned(sounds)} / ${sounds.length}`;
  const groups = ['music', 'step', 'nature'].map(g => { const l = sounds.filter(i => i.group === g); return `${GROUP_NAME[g]} ${owned(l)}/${l.length}`; });
  document.getElementById('soundSum').textContent = groups.join(' · ');
  const locked = () => { const b = document.createElement('button'); b.type = 'button'; b.className = 'locked'; b.textContent = '?'; b.disabled = true; b.setAttribute('aria-label', '아직 못 찾음'); return b; };
  // 편지: 유리병 그림 + 제목 + 첫 구절
  const ll = document.getElementById('letterList'); ll.textContent = '';
  for (const it of letters) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'letter';
    const im = document.createElement('img'); im.src = 'assets/bottle.webp?v=v18.8.0'; im.alt = '';
    const tx = document.createElement('span'); tx.className = 'tx';
    const t = document.createElement('b'), q = document.createElement('span');
    if (col.owns(it.id)) {
      t.textContent = it.title; q.textContent = it.text;
      b.setAttribute('aria-label', it.title + ' 다시 읽기'); b.addEventListener('click', () => showFound(it));
    } else { t.textContent = '아직 못 받은 편지'; q.textContent = '물 위로 유리병이 떠내려오면 눌러 보세요'; b.disabled = true; b.classList.add('locked'); }
    tx.append(t, q); b.append(im, tx); ll.append(b);
  }
  // 옷: 누르면 입히기 · 벗기기
  const wg = document.getElementById('wearGrid'); wg.textContent = '';
  for (const it of wears) {
    if (!col.owns(it.id)) { wg.append(locked()); continue; }
    const b = document.createElement('button'); b.type = 'button'; b.title = it.name;
    const im = document.createElement('img'); im.src = 'assets/' + it.img; im.alt = ''; b.append(im);
    b.classList.toggle('on', col.wearing(it.id)); b.setAttribute('aria-pressed', String(col.wearing(it.id))); b.setAttribute('aria-label', it.name + (col.wearing(it.id) ? ' 벗기기' : ' 입히기'));
    b.addEventListener('click', () => setWear(it.id, !col.wearing(it.id)));
    wg.append(b);
  }
  // 장소: 그림 카드 + 이름, 누르면 가 보기
  const pg = document.getElementById('placeGrid'); pg.textContent = '';
  for (const it of places) {
    if (!col.owns(it.id)) { pg.append(locked()); continue; }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'place';
    const im = document.createElement('img'); im.src = 'assets/' + it.img; im.alt = '';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = it.name;
    b.append(im, nm);
    b.classList.toggle('on', mapId === it.map); b.setAttribute('aria-label', it.name + ' 가 보기');
    b.addEventListener('click', () => { setMap(it.map); paintCollection(); });
    pg.append(b);
  }
}
document.getElementById('toMixer').addEventListener('click', () => { openSettings(false); paintPacks(); mixerTab('song'); openMixer(true); });
settings.addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'map') { setMap(t.value); return; }
  if (t.name === 'kiwis') { setCrowd(t.value); return; }
  if (t.id === 'kiwiN') return;
  if (t.name === 'fmt') clockOpt.fmt = t.value;
  if (t.id === 'optSec') clockOpt.sec = t.checked;
  save('clock', JSON.stringify(clockOpt));
  paintModeMenu();
  // 시계라면 바뀐 표기·초 자리에 맞춰 다시 쓴다 (같은 폭이면 바뀐 글자만, 아니면 파도로 지우고)
  if (mode === 'clock') { lastClock = null; submit(...nextAuto(nowHour())); }
});
document.addEventListener('pointerdown', e => { if (!settings.hidden && !onTop(e.target) && !settings.contains(e.target) && !setBtn.contains(e.target)) openSettings(false); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && foundEl.hidden && !settings.hidden) { openSettings(false); setBtn.focus(); } });
paintMode(); paintModeMenu();

// ── 화면 정리 (v18.5): 버튼·입력창·창·알림을 숨기고 그림만 ──
//  다시 보이기 버튼은 숨어 있다가 화면을 누르거나 마우스를 움직이면 2.5초 동안 오른쪽 위에 희미하게 뜬다.
//  H 키로 켜고 끄고, Esc 로 끈다. 저장하지 않는다(다음에 열면 보통 화면) — 주소 ?ui=0 이면 정리된 채로 시작
const hideBtn = document.getElementById('hideBtn');
let peekTimer = 0;
function peek() {
  if (!document.body.classList.contains('clean')) return;
  document.body.classList.add('peek');
  clearTimeout(peekTimer);
  peekTimer = setTimeout(() => document.body.classList.remove('peek'), 2500);
}
function setClean(on) {
  document.body.classList.toggle('clean', on);
  hideBtn.setAttribute('aria-pressed', String(on));
  hideBtn.setAttribute('aria-label', on ? '버튼·입력창 다시 보이기 (H 키)' : '화면 정리 — 버튼·입력창 숨기기 (H 키)');
  if (on) {
    openSettings(false); openMixer(false); openFocusPanel(false); openInfo(false);
    if (document.activeElement && document.activeElement !== hideBtn) document.activeElement.blur();
    peek();
  } else { document.body.classList.remove('peek'); clearTimeout(peekTimer); }
}
hideBtn.addEventListener('click', () => setClean(!document.body.classList.contains('clean')));
window.addEventListener('pointerdown', peek, true);
window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') peek(); });
window.addEventListener('keydown', e => {
  if (e.target.matches && e.target.matches('input[type="text"], textarea')) return;
  if (e.key === 'h' || e.key === 'H' || e.key === 'ㅗ') setClean(!document.body.classList.contains('clean'));
  else if (e.key === 'Escape' && document.body.classList.contains('clean')) setClean(false);
  else peek();
});
if (q.get('ui') === '0') setClean(true);
{ const st = focus.resolveStale(); paintFocus(); if (st) setTimeout(() => toast(`지난 집중은 화면을 떠나서 멈췄어요 · ${n0(st.steps)}보`, 3200), 1500); }
const paintWeather = () => { weatherBtn.dataset.weather = atmos.weather; weatherBtn.setAttribute('aria-label', `날씨: ${WEATHER_NAME[atmos.weather]} (고르기)`); };
function pickWeather(w) { atmos.setWeather(w); save('weather', atmos.weather); paintWeather(); toast(WEATHER_NAME[atmos.weather]); }
weatherBtn.addEventListener('click', () => openPicker(weatherBtn, '날씨', WEATHERS.map(w => ({ id: w, name: WEATHER_NAME[w], g: 'w-' + w })), atmos.weather, w => { if (w !== atmos.weather) pickWeather(w); }));

// ── 고르기 창 (v18.6.2): 버튼 바로 아래에 뜨고, 고르면 닫힌다. 같은 버튼을 다시 누르거나 바깥을 누르면 닫힘 ──
const picker = document.getElementById('picker');
let pickerFor = null;
function closePicker(back = false) {
  if (picker.hidden) return;
  picker.hidden = true;
  if (pickerFor) { pickerFor.setAttribute('aria-expanded', 'false'); if (back) pickerFor.focus(); }
  pickerFor = null;
}
function openPicker(btn, title, opts, cur, onPick) {
  if (pickerFor === btn) { closePicker(); return; }
  closePicker();
  openSettings(false); openMixer(false); openFocusPanel(false);
  picker.textContent = '';
  picker.setAttribute('aria-label', title + ' 고르기');
  const h = document.createElement('p'); h.className = 'ttl'; h.textContent = title; picker.append(h);
  const grid = document.createElement('div'); grid.className = 'opts' + (opts.length > 4 ? ' three' : opts.length === 4 ? ' two' : ' three'); picker.append(grid);
  const svg = btn.querySelector('svg');
  for (const o of opts) {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', String(o.id === cur));
    if (svg) {
      const c = svg.cloneNode(true);
      // 그림 여러 벌을 담은 버튼(글 모드·날씨)은 그 선택지의 그림만 남긴다
      if (o.g) c.querySelectorAll(':scope > g[class]').forEach(g => { if (!g.classList.contains(o.g)) g.remove(); else g.style.display = 'inline'; });
      b.append(c);
    }
    const t = document.createElement('span'); t.textContent = o.name; b.append(t);
    b.addEventListener('click', () => { onPick(o.id); closePicker(true); });
    grid.append(b);
  }
  // 버튼 아래, 화면 안쪽으로
  const r = btn.getBoundingClientRect();
  picker.hidden = false;
  const w = picker.offsetWidth, left = clamp(r.left + r.width / 2 - w / 2, 10, innerWidth - w - 10);
  picker.style.left = left + 'px'; picker.style.top = (r.bottom + 10) + 'px';
  picker.style.setProperty('--arrow', (r.left + r.width / 2 - left) + 'px');
  pickerFor = btn; btn.setAttribute('aria-expanded', 'true');
  (grid.querySelector('[aria-pressed="true"]') || grid.querySelector('button')).focus();
}
document.addEventListener('pointerdown', e => { if (!picker.hidden && !picker.contains(e.target) && !(pickerFor && pickerFor.contains(e.target))) closePicker(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !picker.hidden) closePicker(true); });
addEventListener('resize', () => closePicker());
paintWeather();

// 첫 문장: 그림을 다 읽은 뒤에만 (느린 연결에서 그림보다 먼저 쓰려다 오류가 나지 않게)
const firstWrite = () => { if (!plate) { setTimeout(firstWrite, 300); return; } if (phase === 'idle' && !current && mode === 'free') write(FIRST); };
setTimeout(firstWrite, 700);

window.__kiwi = { setPack, setCrowd, get crowd() { return { id: crowdId, n: crowdN, ...crowd() }; }, paintPacks, focus, completeFocus, shore, finds, pickUp, paintCollection, get phase() { return phase; }, get kiwis() { return kiwis; }, get jobs() { return jobs; }, get current() { return current; }, beach, get water() { return water; }, art, artAt, get light() { return { mode: lightMode, pick: lightPick, shown: lightShown }; }, setLight, get artDpr() { return artDpr(); }, perf, clouds, atmos, sound, get plate() { return plate; }, drifters, col, openDrift, get notes() { return notes; }, submit, setView, toWorld, cam };
