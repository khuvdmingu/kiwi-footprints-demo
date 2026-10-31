// main.js — 발자국 한글 v8: 화면 층·입력·카메라 시점·키위 무리 지휘
//
// v8 = 사용자 그림을 거의 그대로: 배경은 그림 판(plate.js), 바다는 그 그림을 움직이는 WebGL(water.js), 키위·갈매기 몸도 같은 그림체 그림.
// 층 (아래 → 위): #plate WebGL(그림 판 + 살아 있는 바다) → #stage Canvas(발자국·키위) → #canopy(그림에서 오린 숲 잎, 키위가 덤불 뒤로 숨는다)
//   → #clouds Canvas(빛안개·긴 그림자) → #tint(시간 빛) → #fx(갈매기·비·눈·반딧불이·♪) → #glow(골든아워) · #grain(그레인)
//   세 층을 #world 하나로 묶어 카메라(시점)를 CSS 변환으로 건다.
// 시점: top 위에서 내려다보기 · diorama 비스듬히 기울인 미니어처(위아래 흐림) · follow 쓰는 키위를 따라 확대
//       · scope 쌍안경(멀리서 키위 한 마리를 몰래 따라봄) · text 글자 보기(쓰는 문장을 화면에 맞춤) · breeze 바람결(천천히 흘러가는 풍경)
// 흐름: 문장 확정 → (앞 글씨가 있으면) 큰 파도 + 키위들 "!" 하고 숲으로 도망 → 물이 빠지면 숲에서 걸어 나와 획을 맡아 쓴다
//       → 다 쓰면 폴짝폴짝 → 잠시 뒤 파도. 비어 있을 땐 한두 마리가 산책한다.
// 주소 옵션: ?text= · ?seed= · ?speed= · ?hold= · ?sound=0 · ?view=top|diorama|follow|scope|text|breeze · ?debug
//           ?mode=free|clock|quote|word · ?weather=clear|cloudy|rain|snow|fog|wind · ?hour=0~24 (시간 빛 미리보기)
// v4.1: 시간 빛(실제 시각)·날씨(atmos.js) — 층 위에 #tint(곱하기) 와 #fx(비·눈·안개·반딧불이) 를 더 얹는다.
//       글 모드: 직접 쓰기 · 시계(매 분 지금 시각) · 명언 · 단어장(content.js). 다 쓰면 뜻·출처 캡션이 드러난다.
// v5: 소리 — 발자국 음악(획 위 발자국마다 지금 화음의 음, 위쪽일수록 높고 키위 쪽에서 들린다, 작은 ♪ 가 떠오른다),
//     시간대·날씨에 따라 바뀌는 배경 음악(music.js), 좌우 위치·잔향, 다 쓰면 키위 합창, 믹서(소리 버튼).
// v6 에서 픽셀 모드는 뺐다 (어떤 해상도에서도 선명한 벡터 원칙과 충돌). v2~v5 브랜치에 남아 있다.

import { SeaLife, LIFE } from './sea-life.js?v=v29.25.1-44a30f8';
import { layoutText, strokesOf, glyph } from './hangul.js?v=v29.25.1-44a30f8';
import { Beach, WAVES } from './beach.js?v=v29.25.1-44a30f8';
import { Kiwi } from './kiwi.js?v=v29.25.1-44a30f8';
import { Sound, SONG_TRACKS } from './sound.js?v=v29.25.1-44a30f8';
import { KiwiWeather } from './sky/kiwi-react.js?v=v29.25.1-44a30f8';   // v23 날씨에 반응하는 키위 (잎 우산·비 피하기 · 바람에 기우뚱·깃털)
import { loadPlate } from './plate.js?v=v29.25.1-44a30f8';
import { MAPS, MAP_IDS } from './maps.js?v=v29.25.1-44a30f8';
import { WaterGL, FlatWater } from './water.js?v=v29.25.1-44a30f8';
import { setKiwiSprite, setKiwiSkins, setKiwiSleep, setKiwiActs, setActRate, setActOnly, setIdleScale, setKiwiHeadwear, stiffSkin, setKiwiOnAct } from './kiwi.js?v=v29.25.1-44a30f8';
import { HEADWEAR } from './headwear.js?v=v29.25.1-44a30f8';
import { ACTS, ACT_NAME, PHOTO_POSES, GAZE, pickIdleAct } from './acts.js?v=v29.25.1-44a30f8';
import { Bottles, CHEERS, MIN_DAYS, mineTitle, mineNote } from './bottles.js?v=v29.25.1-44a30f8';
import { Album, capture, stamp, sandDate, longDate, shortReason, voyageAlbumEntry, albumPhotos } from './album.js?v=v29.25.1-44a30f8';
import { breathAt, ringSpot, ROUNDS, SQUASH } from './breath.js?v=v29.25.1-44a30f8';
import { Doze } from './doze.js?v=v29.25.1-44a30f8';
import { zipStore, zipBlob, shotNames } from './zip.js?v=v29.25.1-44a30f8';
import { Voyage, PLACES, SIGHTS, distanceText, hourOf } from './voyage.js?v=v29.25.1-44a30f8';   // 항해 모드 (docs/VOYAGE.md)
import { VoyageScene, BOATS, SAILS } from './voyage-scene.js?v=v29.25.1-44a30f8';
import { mountExtras } from './voyage-extras.js?v=v29.25.1-44a30f8';
import { BIG } from './chart.js?v=v29.25.1-44a30f8';
import { mountShell } from './ui/shell.js?v=v29.25.1-44a30f8';   // 2026-10-24 UI 개편: 바구니 · 꾸미기 · 해도 창 · 시점 줄 · 창 투명도 (예전 src/ia/ia.js 를 대신)   // v28 해도 · 낚싯줄 · 섬 짓기
import { groupBy, groupNote, ALBUM_BY, shareCard, shareFile } from './album-view.js?v=v29.25.1-44a30f8';
import { mountPhotoViewer } from './photo-viewer.js?v=v29.25.1-44a30f8';
import { mountJourneyBook } from './journey-book.js?v=v29.25.1-44a30f8';
import { Memos } from './memos.js?v=v29.25.1-44a30f8';
import { Greeter } from './greet.js?v=v29.25.1-44a30f8';
import { mountMemoPanel, missedCard, nameCard } from './memo-ui.js?v=v29.25.1-44a30f8';
import { ITEMS, ITEM, Collection, Drifters } from './items.js?v=v29.25.1-44a30f8';
import { Leaves } from './leaves.js?v=v29.25.1-44a30f8';
import { Rake } from './zen.js?v=v29.25.1-44a30f8';
import { Clouds } from './clouds.js?v=v29.25.1-44a30f8';
import { Gulls } from './gulls.js?v=v29.25.1-44a30f8';
import { Halloween, isHalloween } from './halloween.js?v=v29.25.1-44a30f8';
import { Season, pickSeason } from './seasons.js?v=v29.25.1-44a30f8';
import { GUEST_STORY } from './illus.js?v=v29.25.1-44a30f8';   // v28.18 손님 마지막 편지의 이야기 그림
import { Cutscene } from './cutscene.js?v=v29.25.1-44a30f8';   // v28.18 부두 승선·도착 영상
import { Bubbles, ACT_EMOTE } from './bubbles.js?v=v29.25.1-44a30f8';   // v28.21 머리 위 감정 표시 · 꿈 말풍선
import { Moments, MOMENTS, MOMENT } from './moments.js?v=v29.25.1-44a30f8';   // v28.21 드문 순간   // v28.15 크리스마스·설날·봄·여름 축제
import { Stamps } from './prints.js?v=v29.25.1-44a30f8';
import { Atmos, WEATHERS, WEATHER_NAME, timeLight, artAt } from './atmos.js?v=v29.25.1-44a30f8';
import { MODES, MODE_NAME, QUOTES, WORDS, Deck, clockText, isClock, isAuto, CLOCK_FMTS } from './content.js?v=v29.25.1-44a30f8';
import { clamp, dist } from './util.js?v=v29.25.1-44a30f8';
import { Focus, Awake, LENGTHS, customMinutes, today } from './focus.js?v=v29.25.1-44a30f8';
import { Flock } from './flock.js?v=v29.25.1-44a30f8';
import { TEMPERS, temperName } from './temper.js?v=v29.25.1-44a30f8';
import { GUESTS, GUEST_IDS, Guestbook, guestCount, pickGuests, leaveTracks, NOTE_CELL, LETTER_TOTAL } from './guests.js?v=v29.25.1-44a30f8';
import { dropShadow } from './shadow.js?v=v29.25.1-44a30f8';
import { Gifts, invite, thanksText, rewardText, eul as giftEul } from './gifts.js?v=v29.25.1-44a30f8';
import { animateGuest } from './guest-acts.js?v=v29.25.1-44a30f8';
import { UNLOCK_ALL } from './config.js?v=v29.25.1-44a30f8';
import { WardrobeJournal } from './ui/wardrobe-journal.js?v=v29.25.1-44a30f8';
import { wireTabs as bindTabs, rememberOpener, returnFocus } from './ui/a11y.js?v=v29.25.1-44a30f8';
import { Shore, Finds, FINDS, FIND, RARITY, FIND_ROWS } from './shore.js?v=v29.25.1-44a30f8';
import { CATCHES, CATCH, MATERIAL_MIN } from './fishing.js?v=v29.25.1-44a30f8';
import { mountRenderDiagnostics } from './render-diagnostics.js?v=v29.25.1-44a30f8';
import { renderTint } from './tint.js?v=v29.25.1-44a30f8';
import { mountHomeFullscreen } from './home-fullscreen.js?v=v29.25.1-44a30f8';

// Sound·Collection·Flock 이 저장값을 읽기 전에 저장하지 않은 꾸미기만 복원한다.
let wardrobeJournal = null;
try { wardrobeJournal = new WardrobeJournal(localStorage); wardrobeJournal.recover(); } catch { /* 저장 영역 없음 */ }

const q = new URLSearchParams(location.search);
const halloween = new Halloween(isHalloween(new Date(), q));   // v28.12 할로윈 (10-25~11-01, ?halloween=1 미리 보기)
if (q.has('halloween')) globalThis.kiwiHalloween = halloween;   // 미리 보기 주소에서만 콘솔 확인용
const bubbles = new Bubbles();
// 놀람·통통·뿌듯은 늘, 나머지 몸짓은 둘에 하나꼴로만 표시 (너무 자주 뜨지 않게)
setKiwiOnAct((kw, id) => { const c = ACT_EMOTE[id]; if (c != null && (['startle', 'joy', 'proud'].includes(id) || Math.random() < 0.45)) bubbles.emote(kw, c, beach.t); });
const cutscene = new Cutscene(document.getElementById('cutscene'), { enabled: q.get('cut') !== '0' });
const season = new Season(halloween.on ? null : pickSeason(new Date(), q));   // ?season=xmas|seollal|spring|summer 미리 보기
const num = (k, d) => { const v = q.get(k); return v != null && v !== '' && !isNaN(+v) ? +v : d; };
const SEED = num('seed', 7);
let SPEED = clamp(num('speed', 1), 0.25, 6);   // 테스트 탭(v19.2)의 걷는 속도가 덮는다
const HOLD = Math.max(1, num('hold', 9));
const DEBUG = q.has('debug');
const FIRST = q.get('text') || '안녕 키위';
const VIEWS = ['top', 'diorama', 'follow', 'scope', 'text', 'breeze'];
const VIEW_NAME = { top: '위에서', diorama: '디오라마', follow: '따라가기', scope: '쌍안경', text: '글자 보기', breeze: '바람결' };
// 위에 뜨는 카드(편지 등)·고르기 창 안을 누른 것은 아래 창의 "바깥을 누름"이 아니다 (v18.6.2)
const onTop = t => !!(t && t.closest && t.closest('#found, #picker, #photoViewer'));

const worldEl = document.getElementById('world');
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
let plateEl = document.getElementById('plate');
const canopyEl = document.getElementById('canopy'), canopyNEl = document.getElementById('canopyN'), canopyWEl = document.getElementById('canopyW');
let plate = null, water = null;
let shell = null;   // src/ui/shell.js (맨 아래에서 붙인다)
// 판 두 벌: 가로 화면은 plate*, 세로로 긴 화면(휴대폰)은 tall* — 처음 필요할 때 읽어 둔다
// 기기 저장값 읽기·쓰기 — 장소·글 모드·시계 설정이 시작하자마자 쓰므로 맨 먼저 둔다
const saved = k => { try { return localStorage.getItem('kiwi-footprints.' + k); } catch (e) { return null; } };
const save = (k, v) => { try { localStorage.setItem('kiwi-footprints.' + k, v); } catch (e) { /* 저장소 없음 */ } };
// ── v19.2 테스트 탭: 테스트 기간(UNLOCK_ALL)에만 보이는 조절값 — 출시 때 UNLOCK_ALL 을 끄면 탭도 값도 사라진다 (?tune 이면 그래도 보임)
const TEST = UNLOCK_ALL || q.has('tune');
const TUNE_DEF = { awayMin: 15, auto: 0, guestN: 0, drift: 180, find: 180, speed: 1, dim: false, sleep: 90, orbit: 12, acts: [], actLoop: false, noteId: false, noteSpoil: false, noteP: 'any' };
const TUNE = (() => { if (!TEST) return { ...TUNE_DEF }; try { return { ...TUNE_DEF, ...JSON.parse(saved('tune') || '{}') }; } catch (e) { return { ...TUNE_DEF }; } })();
if (TEST && !q.has('speed')) SPEED = clamp(TUNE.speed, 0.25, 6);
// v24 UI 테마: 'modern'(지금) · 'paper'(종이, theme-paper.css) — v24.2 부터 설정 「풍경 › 창 모양」에서 고른다. ?theme=paper 로 미리 보기
//  v29.11 (사용자): 종이 UI 를 다 다듬을 때까지 모던은 막아 둔다 — 종이로 고정, 고르기 칸은 비활성. 다 되면 MODERN_OFF 를 끄고 모던도 맞춘다
const UI_THEMES = ['modern', 'paper'], MODERN_OFF = true;
const setUiTheme = t => {
  t = MODERN_OFF ? 'paper' : UI_THEMES.includes(t) ? t : 'modern'; document.documentElement.dataset.ui = t;
  for (const r of document.querySelectorAll('input[name="uitheme"]')) r.checked = r.value === t;
  return t;
};
let uiTheme = setUiTheme(q.get('theme') || saved('ui'));
if (!TEST) { document.querySelector('#settings [data-tab="test"]')?.remove(); document.getElementById('tunePane')?.remove(); }
const plates = {};
// 장소: ?map= 이 기기에 저장된 값보다 먼저
let mapId = MAP_IDS.includes(q.get('map')) ? q.get('map') : MAP_IDS.includes(saved('map')) ? saved('map') : 'beach';
const plateFor = (w, h) => MAPS[mapId][w / h < 0.8 ? 'tall' : 'wide'];
// O3 (2026-10-19): 판 그림 한 벌(그림 3장 + 시간대 그림)은 풀면 수십 MB라, 최근에 쓴 판 PLATE_KEEP 개(+ 지금 판)만 기억한다.
//  가로↔세로를 돌리거나 바로 전 장소로 돌아가는 건 그대로 빠르고, 더 오래된 장소는 다시 고르면 기기 캐시에서 다시 읽는다.
//  화면이 쓰는 판(plate)은 놓지 않는다 — 렌더러는 판을 바꿀 때 앞 판의 GPU 텍스처를 스스로 지운다(water.setPlate)
const PLATE_KEEP = 2;
let plateOrder = [];
function prunePlates() {
  const keep = new Set(plateOrder.slice(-PLATE_KEEP));
  if (plate) keep.add(plate.name);
  for (const n of Object.keys(plates)) if (!keep.has(n)) delete plates[n];
  plateOrder = plateOrder.filter(n => keep.has(n));
}
function getPlate(name) {
  plateOrder = [...plateOrder.filter(n => n !== name), name];
  prunePlates();
  if (plates[name]) return plates[name];
  const m = Object.values(MAPS).find(v => v.wide === name || v.tall === name) || {};
  const pr = plates[name] = loadPlate('assets/', name, { stones: !!m.stones, shoreFrom: m.shoreFrom, ground: m.ground, tone: !!m.tone, shoreFix: m.shoreFix?.[name === m.tall ? 'tall' : 'wide'], moss: !!m.moss, art: m.art !== false, eraser: m.eraser, rest: m.rest, rockFill: !!m.rockFill });
  pr.catch(() => { if (plates[name] === pr) delete plates[name]; });   // 못 읽었으면(오프라인 v18.3) 기억하지 않는다 — 다시 연결되면 다시 읽는다
  return pr;
}
const cloudCanvas = document.getElementById('clouds'), cctx = cloudCanvas.getContext('2d');
const glowEl = document.getElementById('glow');
const clouds = new Clouds();
const gulls = new Gulls();   // v7: 바다 위 갈매기
const beach = new Beach(SEED);
beach.stamps = new Stamps();   // v28.13 그린 발자국 도장 — ?prints=line 이면 예전 선 발자국
if (q.get('prints') !== 'line') beach.stamps.load();
const sound = new Sound({ enabled: q.get('sound') !== '0' });
const fxCanvas = document.getElementById('fx');
const fctx = fxCanvas.getContext('2d');
const tintEl = document.getElementById('tint');
const scopeEl = document.getElementById('scope');
// 시간 빛은 같은 작은 PNG를 HTML 배경으로 표시한다 (tint.js).
function paintTint() {
  renderTint(tintEl, atmos.tintStops(art.n, art.w), W, H);
}
const captionEl = document.getElementById('caption');
const atmos = new Atmos(q.get('weather') || saved('weather') || 'clear');
atmos.mapId = mapId;   // v23 꽃잎 바람 ↔ 낙엽 바람 이름이 첫 화면부터 맞게
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
// v27.4 키위 몸짓: 멈췄을 때 몸짓(동작)을 할 확률 — 차분은 예전 그대로(16%, 나머지는 콕콕·두리번)
// rate = 멈췄을 때 몸짓할 확률 · idle = 멈춰 있는 시간 배수 · stay = 할 일 없이 서 있을 때 어슬렁 대신 그 자리에서 몸짓할 확률
const LIVELY = { calm: 0.16, normal: 0.45, lively: 0.8, rich: 0.95 };
const LIVELY_IDLE = { calm: 1, normal: 0.85, lively: 0.6, rich: 0.4 }, LIVELY_STAY = { calm: 0, normal: 0.15, lively: 0.35, rich: 0.65 };
let lively = LIVELY[saved('lively')] ? saved('lively') : 'calm';
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
let hourShift = 0;          // 시간 미리보기 (예전 T 키 — v26 에서 키보드 단축키를 없애 지금은 늘 0)
const realHour = (now = new Date()) => ((HOUR_Q ?? now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600) + hourShift) % 24;
// 시간대 (v16.3): 'auto' = 지금 시각을 따라 빛이 바뀐다 · 'manual' = 고른 시각의 빛에 머문다(낮에도 저녁 빛으로 두고 싶을 때)
//  시계 글씨와 물가 줍기(밤·해 질 녘 희귀품)는 언제나 실제 시각을 따른다.
let lightMode = HOUR_Q == null && saved('light') === 'manual' ? 'manual' : 'auto';   // ?hour= 미리보기는 그 시각의 빛을 보여 준다(저장값 무시)
let lightPick = (() => { const v = parseFloat(saved('lightHour')); return v >= 0 && v < 24 ? v : 18.3; })();
let lightShown = null;
// 시간대 그림 (v16.5 밤 · v16.6 노을·새벽): 칸 N = 밤, W = 노을 또는 새벽. 섞인 정도는 천천히 따라간다.
const art = { n: 0, w: 0, shown: '', idle: { N: 0, W: 0 } };
const artPending = { N: null, W: null };
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
    if (water.flat) return;   // 2D 복구 뒤에는 쓰지 않는 시간대 그림을 계속 요청하지 않는다
    if (k < 0.01 || water.has(slot, kind)) return;
    if (slot === 'W' && water.has('W') && art.w > 0.01) return;
    if (artPending[slot]?.plate === plate) return;
    const p0 = plate, renderer = water, pending = artPending[slot] = { plate };
    plate.loadSet(kind).then(set => {
      const desired = artAt(lightShown);
      if (set && plate === p0 && water === renderer && desired[slot === 'N' ? 'n' : 'w'] > 0.01 && (slot === 'N' || desired.kind === kind)) {
        water.setSet(slot, p0, kind); paintArtCanopy(slot);
      }
    }).catch(e => console.warn('시간대 그림을 읽지 못했어요:', e))
      .finally(() => { if (artPending[slot] === pending) artPending[slot] = null; });
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
const cam = { x: 0, y: 0, z: 1, t: 0, peek: null, peekUntil: 0 };
const world = { beach, sound, kiwis, stride: 8, foot: 5, speed: 100, writeSpeed: 60, k: 30 };
let notes = [];   // 발자국 음이 날 때 떠오르는 ♪
let leaves = [];  // 키위가 덤불을 드나들 때 튀는 잎
let sparks = [];  // 유리병·상자를 열 때 튀는 반짝이
const col = new Collection(() => saved('items'), v => save('items', v), UNLOCK_ALL);
const drifters = new Drifters();
drifters.gap = TUNE.drift;
const floaters = new Leaves();   // 가을 호숫가: 물 위에 따로 떠다니는 단풍
const rake = new Rake();         // 모래 정원: 물 대신 쓸어 올리는 갈퀴
const focus = new Focus(saved, save);   // v12 집중 모드
const voyage = new Voyage(saved, save);   // 항해 모드: 섬에서 보기(focus) / 항해하기(voyage)
const awake = new Awake();
// v19 나의 키위 무리 · 기다리는 손님 · 벽시계
const flock = new Flock(() => saved('flock'), v => save('flock', v), today);
const guestbook = new Guestbook(() => saved('guests'), v => save('guests', v));
const gifts = new Gifts(() => saved('gifts'), v => save('gifts', v));   // v29.6 답장 선물
// 이 장소에 올 손님 n 마리 — 답장 선물이 기다리는 동물은 꼭 온다
const guestsFor = n => { const m = MAPS[mapId].like || mapId; return invite(pickGuests(m, n), GUEST_IDS.filter(id => GUESTS[id].maps.includes(m)), gifts); };
let newbie = null;
let guestSheet = null;   // v19.1 손님 그림 격자 (assets/guests.webp, 4×3)   // 오늘 새로 들어온 무리 키위 (처음 나올 때 이름을 오래 띄운다)
const seen0 = q.has('away') ? Date.now() - num('away', 0) * 60000 : +saved('seen') || 0;   // 지난번 마지막으로 본 때 (?away=분 으로 시험)
let seenAt = 0, hiddenAt = 0, autoGuestAt = Date.now();
let wallOn = q.has('wall') ? q.get('wall') !== '0' : saved('wall') === '1';
const wallAwake = new Awake();
let wallJit = { x: 0, y: 0 }, wallHour = -1, wallMove = false;
let walker = null;
// ── v20 상태 ──
const bottles = new Bottles(saved, save);   // 돌아오는 병 (내 글 · 응원 쪽지)
const BOTTLE_FAST = q.has('bottle');        // 시험: ?bottle → 쓴 글도 바로 돌아오고 병이 25초마다
let bottleAt = BOTTLE_FAST ? 8 : 150, focusDoneAt = -1e9;
const openedAt = Date.now();
let memo = null, shotWanted = false;        // 붙잡아 두는 글: 집중 끝 기록(photo — 이유·날짜 + 사진 한 장) · 이름 인사 · 시간 메모 (say)
const memos = new Memos(saved, save), greeter = new Greeter(saved, save);   // v23 시간 메모 · 이름 인사 (docs/MEMOS.md)
let memoQueue = [], memoAt = 0;
let SLEEP_AFTER = q.has('sleep') ? num('sleep', 90) : TUNE.sleep;   // 초: 이만큼 아무것도 안 건드리면 하나둘 잠든다 (v22.1: 버튼·입력창도 같이 숨는다)
let activeAt = Date.now(), dozing = false;
const kiwiWx = new KiwiWeather();
const doze = new Doze({ startAfter: SLEEP_AFTER });   // v22.2 돌아가며 낮잠 (규칙은 doze.js)
let breath = null;                         // v21 쉬는 시간 호흡 { stage: 'wait'|'gather'|'breathe', … }
const BREAK_AFTER = num('rest', 50) * 60000;   // 이만큼 켜 두고 보면(집중 아닐 때) 키위가 기지개 켜며 숨 고르기를 권한다
let useMs = 0, useAt = 0, offerUntil = 0, captionOffAt = 0;
const shore = new Shore();
shore.gap = TUNE.find;   // v13 물가 줍기
const finds = new Finds(() => saved('finds'), v => save('finds', v));
let ambAt = 0;   // 켜 두기 걸음: 마지막으로 잰 실제 시각   // 집중하는 동안 숲 가장자리를 따라 오가는 키위 한 마리
// 새로 나오는 키위는 입히기로 고른 옷 중 하나를 입는다 (가끔은 맨몸)
const skinOf = m => m.wear === 'none' ? null : m.wear !== 'auto' && ITEM[m.wear] && ITEM[m.wear].kind === 'wear' && col.owns(m.wear) ? m.wear : pickSkin();
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
  // 안전장치: 글자 크기가 0 이하가 되면 걸음 계산이 끝나지 않는다 · 숫자가 아니면(크기 없는 창) 앞 크기를 그대로 —
  //  Math.max(20, NaN) 은 NaN 이라 모든 키위의 k 가 NaN 이 되고 그림자(createRadialGradient)가 던졌다 (2026-10-19)
  S = Number.isFinite(s) ? Math.max(20, s) : S || 20;
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
  if (view === 'scope') paintScope();
  sizeFor(clamp(Math.min(W, H) * 0.14, 44, 150));
  kiwis = kiwis.filter(k => Number.isFinite(k.x) && Number.isFinite(k.y));   // 크기 0 인 창에서 먼저 태어난 키위는 위치가 NaN — 버린다 (숲에서 다시 나온다)
  if (current) { kiwis.forEach(k => { k.job = null; if (k.state !== 'flee') k.state = 'free'; }); write(current); }
}

// ── 글 배치: 줄 폭을 여러 가지로 나눠 보고 글자가 가장 크게 나오는 배치 ──
function layout(text) {
  const u = beach.u;
  // 그림에서 읽은 숲 줄·해안선 사이, 가운데 모래밭 (양옆 바위는 피한다)
  // v29.14 세로 화면에서 긴 글의 양끝이 잘리던 것: 세계 폭이 아니라 지금 화면에 보이는 폭(카메라·번인 방지 이동) 안에서,
  //  발자국이 획 밖으로 번지는 몫만큼 양옆 여백을 두고 배치한다
  let v0 = 0, v1 = W;
  try { const a = toWorld(0, H / 2), b = toWorld(innerWidth, H / 2); if (Number.isFinite(a[0]) && Number.isFinite(b[0]) && b[0] > a[0]) { v0 = Math.max(0, a[0]); v1 = Math.min(W, b[0]); } } catch (e) { /* 그대로 */ }
  const pad = W > H ? 0 : Math.max(18 * u, (v1 - v0) * 0.07);
  const areaW = W > H ? Math.min(W * 0.62, v1 - v0) : (v1 - v0) - 2 * pad, xa = (v0 + v1) / 2 - areaW / 2;
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
  let x = (v0 + v1) / 2 - (span(L) * S) / 2, y = (top + bot) / 2 - (L.height * S) / 2 + S * 0.08;
  // 벽시계(v19): 글씨 자리를 한 시간마다 남는 여백 안에서 조금씩 옮긴다 — 같은 자리에 몇 시간씩 같은 글씨가 있으면 화면에 자국이 남을 수 있다
  if (wallOn) { x += wallJit.x * Math.max(0, (areaW - span(L) * S) / 2) * 0.85; y += wallJit.y * Math.max(0, (bot - top - L.height * S) / 2) * 0.85; }
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
  wallMove = false;
  current = text;
  meta = m;
  showCaption(null);
  if (!layout(text)) { phase = 'idle'; return; }
  phase = 'writing';
  // 새 글이 오면 어슬렁·두리번 중인 키위는 바로 일하러 온다 (v18.3.3) — 모래 정원에서는 지우는 동안 키위가 제자리에 남아
  //  어슬렁 → 두리번(최대 3초) → 콕 한 바퀴를 다 마친 뒤에야 일감을 받아, 새 글을 써도 7초쯤 아무도 안 왔다.
  //  누른 자리를 파러 가는 키위(after 'dig')는 그대로 둔다
  for (const k of kiwis) if (!k.focus && !k.gone && !k.job && (k.state === 'idle' || k.state === 'act' || (k.state === 'wander' && k.after !== 'dig'))) k.state = 'free';
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
  washAt = beach.t + rise + (beach.wave === WAVES.gentle ? 3.5 : 1.5);   // v29.24 잔잔한 파도는 다 빠질 때까지 조금 더 기다린다
}

function submit(text, m = null) {
  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return;
  if (memo && text !== memo.text) memo = null;
  if (breath) endBreath(false);
  sound.commit();
  if (phase === 'washing') { pending = [text, m]; return; }
  if (isClock(mode) && (phase === 'hold' || phase === 'writing') && !pending && canPatch(current, text) && !wallMove) { patch(text); return; }
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
function holdFor() { return memo && current === memo.text ? memo.hold ?? 14 : mode === 'quote' ? 16 : mode === 'word' ? 12 : isClock(mode) ? Infinity : HOLD; }

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
  // 무리 키위가 먼저 (화면에 없는 키위 중 먼저 들어온 순), 모자라면 이름 없는 손님 키위
  const m = flock.absent(new Set(kiwis.filter(k => !k.gone && k.member).map(k => k.member)));
  if (m) {
    kw.member = m.id; kw.skin = skinOf(m);
    kw.tagUntil = beach.t + (newbie && m.id === newbie.id ? 7 : 3);
    if (newbie && m.id === newbie.id) { newbie = null; kw.hop(2, 1); }
  } else kw.skin = pickSkin();
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
  // v20: 일감이 남았는데 깨어 있는 키위가 없으면 가장 가까운 잠든 키위 하나가 일어나 마저 쓴다 (시계 숫자 고치기 등)
  if (open.length && !kiwis.some(k => k.state === 'free' && !k.gone && !k.focus)) {
    const [jx, jy] = open[0].pts[0], s = kiwis.filter(k => k.asleep && k.wakeAt == null).sort((a, b) => dist(a.x, a.y, jx, jy) - dist(b.x, b.y, jx, jy))[0];
    if (s) s.wake(0.2);
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
// O6 (2026-10-19): 집중·항해 중 250ms 마다 부르는 tick 은 위 알약(HUD)만 고친다. 집중 창이 열려 있을 때만 창 안 칸·통계·달력까지.
//  창을 열 때는 openFocusPanel 이 전체를 다시 그린다. 글자는 바뀌었을 때만 쓴다(같은 값을 매번 다시 쓰지 않게).
const setText = (el, v) => { if (el.textContent !== v) el.textContent = v; };
const setAttr = (el, k, v) => { if (el.getAttribute(k) !== v) el.setAttribute(k, v); };
function paintFocus({ tick = false } = {}) {
  const on = focus.active || voyage.active, now = Date.now();
  focusBtn.classList.toggle('on', on);
  focusHud.hidden = !on;
  let left = '', to = '', d = '', st = '';
  if (voyage.active) {
    left = fmtTime(voyage.left(now)); d = distanceText(voyage.sailed(now)); to = PLACES[voyage.trip.to].ko;
    setText(focusHud.querySelector('.t'), left); setText(focusHud.querySelector('.s'), d);
    setAttr(focusHud, 'aria-label', `${to}${ro(to)} 항해 중, ${left} 남음, ${d} 왔어요`);
  } else if (on) {
    left = fmtTime(focus.left(now)); st = n0(focus.steps(now));
    setText(focusHud.querySelector('.t'), left); setText(focusHud.querySelector('.s'), st + '보');
    setAttr(focusHud, 'aria-label', `집중 중, ${left} 남음, ${st}보`);
  }
  if (tick && focusPanel.hidden) return;   // 창이 닫혀 있으면 여기까지
  focusPanel.querySelector('.idle').hidden = on;
  focusPanel.querySelector('.busy').hidden = !on;
  document.getElementById('voyQuit').hidden = !voyage.active;
  if (voyage.active) {
    setText(document.getElementById('focusLeft'), left);
    setText(document.getElementById('focusBusyH'), `${to}${ro(to)} 가는 중`);
    setText(document.getElementById('focusSub'), `${d} 왔어요`);
    setText(document.getElementById('focusStop'), '잠깐 멈추기');
    setText(document.getElementById('focusBusyNote'), '잠깐 멈추면 다음에 남은 길부터 이어 가요. 그만두면 이 항해는 끝 — 온 바닷길은 해도에 남아요.');
  } else if (on) {
    setText(document.getElementById('focusBusyH'), '집중 중');
    const sub = document.getElementById('focusSub'), steps = document.getElementById('focusSteps');
    if (steps && sub.contains(steps) && sub.textContent === `${steps.textContent}보 걸었어요`) setText(steps, st);
    else sub.innerHTML = `<span id="focusSteps">${st}</span>보 걸었어요`;
    setText(document.getElementById('focusStop'), '그만하기');
    setText(document.getElementById('focusBusyNote'), '그만둬도 걸은 만큼은 쌓여요. 선물은 끝까지 했을 때만.');
    setText(document.getElementById('focusLeft'), left);
  }
  paintVoyage();
  const isCustom = focus.useCustom;
  for (const r of focusPanel.querySelectorAll('input[name="flen"]')) r.checked = r.value === 'custom' ? isCustom : Number(r.value) === focus.len;
  document.getElementById('focusCustom').hidden = !isCustom || (voyage.mode === 'voyage' && !!voyage.paused);
  const fm = document.getElementById('focusMin'); if (document.activeElement !== fm) fm.value = focus.custom;
  for (const r of focusPanel.querySelectorAll('input[name="fhush"]')) r.checked = r.value === focus.hush;
  setText(document.getElementById('focusHushNote'), { events: '음악·파도·바람은 그대로, 발자국 음·키위 울음 같은 소리만 꺼요', all: '집중하는 동안 모든 소리를 꺼요', off: '평소처럼 다 들려요' }[focus.hush]);
  paintFocusStats();
  paintCal();
}
// v29.7 걸음 기록 칸 셋 — 바구니 › 일지 맨 위로 옮겼다
function paintFocusStats() {
  // 걸음 기록은 칸 세 개로 (v18.6.1) — 한 줄에 이어 쓰면 숫자가 섞여 읽혔다
  const stats = document.getElementById('focusStats'), rows = focus.total || focus.done ? [[n0(focus.todaySteps) + '보', '오늘'], [n0(focus.total) + '보', `지금까지 ${km(focus.total)}km`], [focus.done + '번', '끝까지 한 집중']] : [];
  const statSig = rows.flat().join('|');
  if (stats.dataset.sig !== statSig) {   // 숫자가 바뀌었을 때만 칸을 다시 만든다
    stats.dataset.sig = statSig; stats.textContent = '';
    for (const [v, l] of rows) {
      const c = document.createElement('div'), b = document.createElement('b'), sp = document.createElement('span');
      b.textContent = v; sp.textContent = l; c.append(b, sp); stats.append(c);
    }
  }
}
// ── v19 집중 기록 달력: 날마다 발자국 도장 ──
//  끝까지 한 집중 = 진한 발자국(2번 이상이면 숫자) · 하다 만 집중 = 흐린 발자국 · 켜 두기만 = 작은 점
let calOff = 0, calPick = null;
const FOOT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18L6.3 8.6M12 18V5.8M12 18l5.7-9.4M12 18v3"/></svg>';
function calLevel(L) { return !L ? '' : L.d > 0 ? 'done' : L.m > 0 ? 'try' : L.i > 0 ? 'dot' : ''; }
function calText(y, mo, d, L) {
  const head = `${mo + 1}월 ${d}일`;
  if (!L || !(L.n || L.i)) return `${head} · 기록 없음`;
  const parts = [];
  if (L.n) parts.push(`집중 ${L.n}번${L.d ? ` (끝까지 ${L.d})` : ''} · ${L.m}분 · ${n0(L.s)}보`);
  if (L.i) parts.push(`켜 두기 ${n0(L.i)}보`);
  return `${head} · ${parts.join(' · ')}`;
}
function paintCal() {
  const grid = document.getElementById('calGrid'); if (!grid) return;
  const now = new Date(), base = new Date(now.getFullYear(), now.getMonth() + calOff, 1), y = base.getFullYear(), mo = base.getMonth();
  document.getElementById('calMonth').textContent = `${y}년 ${mo + 1}월`;
  document.getElementById('calNext').disabled = calOff >= 0;
  // 켜 두기 걸음이 늘 때마다 다시 그리면 누르는 중인 칸이 사라진다 — 보이는 것이 바뀔 때만 다시 만든다
  const lvOf = L => calLevel(L) + (L ? L.d + '.' + L.n + '.' + L.m : ''), sig = [y, mo, calPick, now.getDate(), ...Array.from({ length: 31 }, (_, i) => lvOf(focus.log[`${y}-${mo + 1}-${i + 1}`]))].join('|');
  if (grid.dataset.sig === sig) return;
  grid.dataset.sig = sig;
  grid.textContent = '';
  for (let i = 0; i < base.getDay(); i++) grid.append(document.createElement('span'));
  const days = new Date(y, mo + 1, 0).getDate();
  let sum = { n: 0, d: 0, m: 0, s: 0, days: 0 };
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${mo + 1}-${d}`, L = focus.log[key], lv = calLevel(L);
    if (L) { sum.n += L.n; sum.d += L.d; sum.m += L.m; sum.s += L.s; if (L.d) sum.days++; }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'day' + (lv ? ' ' + lv : '');
    if (y === now.getFullYear() && mo === now.getMonth() && d === now.getDate()) b.classList.add('today');
    if (calPick === key) b.classList.add('pick');
    b.innerHTML = `<span class="n">${d}</span>` + (lv === 'done' || lv === 'try' ? FOOT_SVG : lv === 'dot' ? '<i></i>' : '') + (L && L.d > 1 ? `<em>${L.d}</em>` : '');
    const tx = calText(y, mo, d, L);
    b.setAttribute('aria-label', tx); b.title = tx;
    b.addEventListener('click', () => {
      calPick = calPick === key ? null : key; paintCal();
      // v29.7 그날 일지가 있으면 펼쳐서 보여 준다
      const box = calPick && document.querySelector(`#shotGrid .shotGroup[data-key="${key}"]`);
      if (box) { box.open = true; box.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    });
    if (y === now.getFullYear() && mo === now.getMonth() && d > now.getDate()) b.disabled = true;
    grid.append(b);
  }
  const note = document.getElementById('calNote');
  if (calPick && calPick.startsWith(`${y}-${mo + 1}-`)) { const d = +calPick.split('-')[2]; note.textContent = calText(y, mo, d, focus.log[calPick]); }
  else note.textContent = sum.n ? `이 달 · 끝까지 한 날 ${sum.days}일 · 집중 ${sum.n}번 · ${sum.m}분 · ${n0(sum.s)}보` : '이 달은 아직 집중 기록이 없어요. 끝까지 하면 발자국 도장이 찍혀요.';
}
document.getElementById('calPrev').addEventListener('click', () => { calOff--; calPick = null; paintCal(); });
document.getElementById('calNext').addEventListener('click', () => { if (calOff < 0) { calOff++; calPick = null; paintCal(); } });
function startFocus() {
  const ta = document.getElementById('focusLetter');
  focus.start(focus.len, ta.value);
  ta.value = '';
  applyHush();
  awake.on();
  walker = pickWalker();
  walker.startle();
  sound.call(0, walker.x);
  openFocusPanel(false);
  toast(`집중 ${focus.len}분 시작`);
  paintFocus();
}
// ── 항해 모드 (src/voyage.js 규칙 · src/voyage-scene.js 바다 장면) ──
//  섬에서 보기 = 위의 집중 그대로. 항해하기 = 잠가도 계속 가고, 걸음 대신 바닷길, 가는 길의 일은 키위의 일기로.
const voyCv = document.getElementById('voyage'), voyScene = new VoyageScene(voyCv);
voyScene.halloween = halloween;
voyScene.line = saved('line') !== 'off';   // v29.15 낚싯줄 (꾸미기 › 배)
document.getElementById('lineGrid').addEventListener('click', e => { const b = e.target.closest('button[data-line]'); if (!b) return; voyScene.line = b.dataset.line === 'on'; save('line', b.dataset.line); paintCollection(); toast(voyScene.line ? '낚싯줄을 드리웠어요 — 항해 끝에 낚은 것이 하나 걸려 와요' : '낚싯줄을 걷었어요 — 줄을 걷은 채 떠나는 항해엔 아무것도 안 걸려요', 3200); });
voyScene.season = season;
voyScene.life = new SeaLife();   // v28.23 바다 생물 7종 × 두 판 — 하나·둘·셋씩 (?life=turtle-b 미리 보기)
voyScene.life.onSpawn = g => { toast('바다 생물: ' + g.map(x => LIFE[x.id].ko + ' ' + x.v.toUpperCase()).join(' · '), 2600); };   // 테스트 탭·?life= 로 부른 무리는 무엇이 나왔는지 알려 준다
{ const lp = new URLSearchParams(location.search).get('life'); if (lp) voyScene.life.preview(lp); }
voyScene.boatId = BOATS.some(b => b.id === saved('boat')) ? saved('boat') : 'dinghy';   // 고른 배 (v28.9)
voyScene.sailId = SAILS.some(b => b.id === saved('sail')) ? saved('sail') : 'leaf';   // 고른 돛 (v28.11)
let voyReady = false, voyDest = null, voyShownAt = 0;
// 항해 그림(4k 바다 판·배·키위 시트)은 앱을 켤 때가 아니라 항해할 때 읽고, 항해가 끝나면 놓아준다 (2026-10-19)
//  집중 창에서 「항해하기」를 고르면 미리 읽기 시작해 출항할 때 기다리지 않게 한다 · 못 읽으면 다음에 다시 시도
let voyLoading = null;
function voyArt() {
  if (voyReady) return Promise.resolve(true);
  if (!voyLoading) {
    const p = voyLoading = voyScene.load().then(ok => { if (ok && voyLoading === p) voyReady = true; return voyReady; }, () => false)
      .finally(() => { if (voyLoading === p) voyLoading = null; });
  }
  return voyLoading;
}
function voyArtRelease() { voyLoading = null; voyReady = false; voyScene.unload(); voyScene.life?.release(); }
const ro = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 && c % 28 !== 8 ? '으로' : '로'; };   // 받침 따라 「로/으로」
const crewN = () => Math.min(10, Math.max(1, kiwis.filter(k => !k.gone).length));   // 배 자리 수로 다시 줄인다 (voyage-scene crew)
const voyState = (now = Date.now()) => ({ frac: voyage.frac(now), sailed: voyage.sailed(now), left: voyage.left(now), crew: crewN(), hour: lightShown ?? realHour(), weather: atmos.weather });
function enterSea() { voyArt(); sound.onVoyage = true; sound.voyLoad(); sound.voyBed(true); document.body.classList.add('atSea'); voyCv.hidden = false; voyScene.resize(innerWidth, innerHeight, Math.min(2, devicePixelRatio || 1)); }
function leaveSea() { sound.onVoyage = false; sound.voyBed(false); document.body.classList.remove('atSea'); voyCv.hidden = true; }
function paintVoyage() {
  const vm = voyage.mode === 'voyage', p = voyage.paused;
  for (const r of focusPanel.querySelectorAll('input[name="fmode"]')) r.checked = r.value === voyage.mode;
  document.getElementById('voyOpts').hidden = !vm;
  document.getElementById('voyRules').hidden = !vm; document.getElementById('islandRules').hidden = vm;
  document.getElementById('voyPaused').hidden = !p; document.getElementById('voyNew').hidden = !!p;
  const start = document.getElementById('focusStart'), ta = document.getElementById('focusLetter');
  start.hidden = vm && !!p;
  // 멈춘 배가 있으면 길이·한 줄은 이미 정해져 있다 — 고르는 칸을 숨긴다
  for (const el of [focusPanel.querySelector('.seg.four').previousElementSibling, focusPanel.querySelector('.seg.four'), ta.previousElementSibling, ta, ta.nextElementSibling]) el.hidden = vm && !!p;
  if (vm && p) document.getElementById('focusCustom').hidden = true;
  if (p) { const to = PLACES[p.to].ko; document.getElementById('voyPausedText').textContent = `${to}${ro(to)} 가던 배가 바다 위에 멈춰 있어요 · ${distanceText(p.sailed)} 왔고, 남은 길은 ${Math.ceil((p.dur - p.sailed) / 60000)}분이에요.`; }
  const opts = Object.keys(PLACES).filter(id => id !== mapId && mapOpen(id));
  if (!opts.includes(voyDest)) voyDest = opts[0] || null;
  document.getElementById('voyDestName').textContent = voyDest ? PLACES[voyDest].ko : '갈 수 있는 섬이 없어요';
  // v29.11 섬 고르기: 옆으로 넘기는 칩 다섯 → 묶음(가까운 · 안 가 본 · 최근 · 전체) + 두 줄 목록 (이름 · 다녀온 횟수)
  const list = voyList(opts, voyFilt), box = document.getElementById('voyTo'), sig = voyFilt + '|' + list.join() + '|' + voyDest;
  document.querySelectorAll('#voyFilter button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === voyFilt)));
  if (box.dataset.sig !== sig) {
    box.dataset.sig = sig; box.textContent = '';
    for (const id of list) {
      const n = voyage.log.filter(e => e.to === id).length, b = document.createElement('button'); b.type = 'button';
      const nm = document.createElement('b'); nm.textContent = PLACES[id].ko;
      const meta = document.createElement('small'); meta.textContent = n ? `${n}번 다녀옴` : '처음 가는 섬';
      b.append(nm, meta); b.setAttribute('aria-pressed', String(id === voyDest));
      b.addEventListener('click', () => { voyDest = id; paintFocus(); }); box.append(b);
    }
    if (!list.length) { const e = document.createElement('p'); e.className = 'note'; e.textContent = voyFilt === 'recent' ? '아직 다녀온 섬이 없어요' : voyFilt === 'new' ? '열린 섬은 다 가 봤어요' : '갈 수 있는 섬이 없어요'; box.append(e); }
  }
  start.textContent = vm ? (voyDest ? `${PLACES[voyDest].ko}${ro(PLACES[voyDest].ko)} 출항` : '갈 수 있는 섬이 없어요') : '시작';
  start.disabled = vm && !voyDest;
}
// 묶음별 섬 목록: 가까운 = 해도에서 가까운 6 · 안 가 본 = 한 번도 안 간 섬(가까운 순) · 최근 = 최근 간 순 · 전체 = 가까운 순 모두
let voyFilt = ['near', 'new', 'recent', 'all'].includes(saved('voyFilt')) ? saved('voyFilt') : 'near';
function voyList(opts, f) {
  const here = BIG[mapId], d = id => here && BIG[id] ? Math.hypot(BIG[id].x - here.x, BIG[id].y - here.y) : 9;
  const near = [...opts].sort((a, b) => d(a) - d(b)), went = new Set(voyage.log.map(e => e.to));
  if (f === 'new') return near.filter(id => !went.has(id));
  if (f === 'recent') return [...new Set([...voyage.log].reverse().map(e => e.to))].filter(id => opts.includes(id));
  return f === 'all' ? near : near.slice(0, 6);
}
document.getElementById('voyFilter').addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (!b) return; voyFilt = b.dataset.f; save('voyFilt', voyFilt); paintFocus(); });
// 해도·새 장소 카드에서 「항해로 가기」: 떠나기 창을 항해 · 그 섬으로 맞춰 연다
function planVoyage(id) {
  if (!PLACES[id] || id === mapId || !mapOpen(id)) return false;
  shell?.closeAll(); closeFound();
  if (voyage.mode !== 'voyage') voyage.setMode('voyage');
  if (!voyage.paused) voyDest = id;
  openFocusPanel(true);
  return true;
}
function startVoyage() {
  if (!voyDest) return;
  const ta = document.getElementById('focusLetter');
  if (!voyage.start({ from: mapId, to: voyDest, min: focus.len, reason: ta.value, crew: [], weather: atmos.weather })) return;
  ta.value = '';
  enterSea(); applyHush(); awake.on(); openFocusPanel(false);
  sound.call(0, W / 2);
  setTimeout(() => sound.voyFx('sail'), 700);   // v28.14 돛이 바람을 받는 소리 (두 판 중 무작위)
  cutscene.play('board', { caption: `${PLACES[voyDest].ko}${ro(PLACES[voyDest].ko)} 출항` });   // v28.18 키위들이 부두에서 배에 오른다
  toast(`${PLACES[voyDest].ko}${ro(PLACES[voyDest].ko)} 출항 · ${focus.len}분` + (voyScene.line === false ? ' · 낚싯줄을 걷어 두어 이번엔 아무것도 안 걸려요' : ''), voyScene.line === false ? 3600 : undefined);
  paintFocus();
}
function stopVoyage() {
  const s = voyage.stop(Date.now(), { visible: !document.hidden, weather: atmos.weather });
  leaveSea(); if (focusPanel.hidden) voyArtRelease(); applyHush(); awake.off();   // 창이 열려 있으면 「다시 출항」이 바로 되게 닫을 때 놓는다
  if (s) toast(`배를 멈췄어요 · ${distanceText(s.sailed)} 왔어요 — 다음에 이어 가요`, 3200);
  paintFocus();
}
document.getElementById('voyResume').addEventListener('click', () => { unlock(); if (voyage.resume(Date.now(), atmos.weather)) { enterSea(); applyHush(); awake.on(); openFocusPanel(false); toast('다시 출항'); setTimeout(() => sound.voyFx('sail'), 700); paintFocus(); } });
// 항해 그만두기 (2026-10-24 — 예전엔 항해 중엔 「멈추기」뿐이고 멈춘 뒤 「접기」라 취소로 안 읽혔다)
//  두 번 눌러 확인: 첫 번째는 단추 글씨가 바뀌고 3초 안에 한 번 더. 온 바닷길(sailedMs)은 stop() 이 이미 세어 두므로 해도에 남는다
function armQuit(btn, label, go) {
  btn.addEventListener('click', () => {
    if (btn.dataset.armed) { clearTimeout(+btn.dataset.armed); delete btn.dataset.armed; btn.classList.remove('armed'); btn.textContent = label; go(); return; }
    btn.textContent = '한 번 더 누르면 그만둬요'; btn.classList.add('armed');
    btn.dataset.armed = String(setTimeout(() => { delete btn.dataset.armed; btn.classList.remove('armed'); btn.textContent = label; }, 3000));
  });
}
function quitVoyage(why = '항해를 그만뒀어요') {
  const to = voyage.active ? null : voyage.paused?.to;
  if (voyage.active) { voyage.stop(Date.now(), { visible: !document.hidden, weather: atmos.weather }); leaveSea(); applyHush(); awake.off(); }
  const p = voyage.abandon();
  if (focusPanel.hidden) voyArtRelease();   // 창이 열려 있으면 다시 출항할 수 있게 그림을 쥐고 있는다
  toast(`${why} · 온 바닷길은 해도에 남아요`, 2600);
  paintFocus();
  return p || to;
}
armQuit(document.getElementById('voyDrop'), '그만두기', () => quitVoyage());
armQuit(document.getElementById('voyQuit'), '항해 그만두기', () => quitVoyage());
function voyageTick() {
  if (!voyage.active) return;
  const now = Date.now(); if (now - voyShownAt < 250) return; voyShownAt = now;
  const r = voyage.tick(now, { visible: !document.hidden, weather: atmos.weather });
  for (const s of r.sights) if (s.seen && s.kind !== 'quiet') { voyScene.show(s.kind); if (s.kind === 'whale') setTimeout(() => sound.voyFx('whale', 0.7), 1200); showCaption({ main: SIGHTS[s.kind].ko, sub: '가는 길에 만났어요' }); clearTimeout(voyageTick.cap); voyageTick.cap = setTimeout(() => { if (voyage.active) showCaption(null); }, 7000); }
  if (r.arrived) { arriveVoyage(); return; }
  paintFocus({ tick: true });
}
function voyageDraw(dt) {
  if (!voyage.active || !voyReady || voyCv.hidden) return;
  if (voyScene.W !== innerWidth || voyScene.H !== innerHeight) voyScene.resize(innerWidth, innerHeight, Math.min(2, devicePixelRatio || 1));
  voyScene.frame(dt, voyState());
}
// 도착: 모든 사건과 일기를 한 기록으로 저장 → 섬에서 찍은 단체 사진으로 같은 기록의 표지 갱신
async function arriveVoyage() {
  const e = voyage.complete(Date.now(), { visible: !document.hidden, weather: atmos.weather }, extras.extra);
  leaveSea(); applyHush(); awake.off(); paintFocus();
  if (!e) return;
  cutscene.play('arrive', { caption: `${PLACES[e.to]?.ko || '섬'}에 닿았어요` });   // v28.18 배가 부두에 닿고 키위들이 내린다
  const L = focus.dayLog(today(e.at - e.min * 60000)); L.m += e.min; L.n++; L.d++; focus.done++; focus.store();   // 달력엔 집중 한 번으로
  const at = Date.now(), nmv = Math.round(e.min * 0.1 * 10) / 10, reason = shortReason(e.reason) || `항해 ${e.min}분`;
  if (e.reason) bottles.keep(e.reason, 'focus', at);
  const scenes = [];
  if (await voyArt()) for (const s of e.sights) {
    if (!SIGHTS[s.kind]) continue;
    try {
      const blob = await voyScene.snapshot(s.kind, { frac: 0.5, crew: crewN(), hour: hourOf(s.ts), weather: atmos.weather });
      if (blob) scenes.push({ ...s, blob });
    } catch (err) { /* 사건 그림 하나를 못 남겨도 나머지 기록·도착은 계속 */ }
  }
  if (!voyage.active) voyArtRelease();   // 사건 사진을 다 찍었으면 바다 그림을 놓아준다 (바로 다시 출항했으면 그대로)
  const travelRecord = voyageAlbumEntry(e, scenes);
  // 글을 다 쓰기 전 닫더라도 사건 사진과 일기는 먼저 한 기록으로 보관한다.
  if (travelRecord.blob) try { await Album.add(travelRecord); paintAlbum(); } catch (err) { /* 도착 사진에서 다시 저장 */ }
  const go = () => {
    focusDoneAt = beach.t;
    memo = { text: `${reason}/${sandDate(at)}`, photo: true, reason, letter: e.reason, min: e.min, steps: 0, nm: nmv, diary: e.text.ko, travelRecord, at, until: beach.t + 150 };
    nudge(); submit(memo.text);
  };
  toast(`${PLACES[e.to].ko}에 닿았어요 · ${distanceText(e.min * 60000)}${e.kind !== 'quiet' ? ' — 바구니 › 일지에 항해 일기가 있어요' : ''}`, 4200);
  extras.arrived(e);   // v28 낚은 것 · 새로 찾은 곳 · 섬 공사 알림
  if (e.catch) setTimeout(() => sound.voyFx('reel', 0.7), 4400);   // v28.14 낚은 것 알림(4.4초 뒤)과 같이
  kiwis.forEach((k, i) => k.hop(2, i * 0.07));
  if (e.to !== mapId && mapOpen(e.to)) { setMap(e.to); const t0 = Date.now(); const wait = () => (mapId === e.to || Date.now() - t0 > 6000) ? setTimeout(go, 900) : setTimeout(wait, 200); wait(); }
  else go();
}
function releaseWalker(hop) {
  if (walker) { walker.focus = false; if (hop) walker.hop(3); if (walker.state === 'wander') walker.state = 'free'; }
  walker = null;
}
// 끝까지 했다: 걸음을 쌓고, 물 위로 선물 상자(옷·장소, 다 모았으면 편지) + 시작할 때 쓴 내 편지
function completeFocus() {
  const r = focus.complete();
  applyHush();
  awake.off(); releaseWalker(true);
  kiwis.forEach((k, i) => { k.hop(2, i * 0.07); k.later(i % 3 === 1 ? 'proud' : 'joy', 1 + i * 0.07); });   // v28.6 셋 중 하나는 뿌듯
  sound.chorus(kiwis.filter(k => !k.gone).map(k => k.x));
  const gift = col.next(it => it.kind !== 'letter') || col.next();
  if (gift) drifters.send(gift, beach);
  // v20 집중 끝 기록: 키위들이 이유와 날짜를 모래에 쓰고, 다 쓰면 사진 한 장. 적은 한 줄은 바다가 기억했다가 며칠 뒤 돌려준다
  const at = Date.now(), reason = shortReason(r.letter) || `집중 ${r.min}분`;
  if (r.letter) bottles.keep(r.letter, 'focus', r.start);
  focusDoneAt = beach.t;
  memo = { text: `${reason}/${sandDate(at)}`, photo: true, reason, letter: r.letter, min: r.min, steps: r.steps, at, until: beach.t + 150 };
  nudge();
  submit(memo.text);
  toast(`집중 끝 · ${n0(r.steps)}보 — 키위들이 오늘을 적어 둘게요`, 3200);
  extras.focusDone(mapId, r.min);   // v28 이 섬 공사
  paintFocus();
}
function endFocus(r, why) {
  applyHush();
  awake.off(); releaseWalker(false);
  if (r && r.letter) bottles.keep(r.letter, 'focus', r.start);
  if (r) toast(`${why} · 여기까지 ${n0(r.steps)}보`, 3200);
  paintFocus();
}
function focusTick() {
  if (!focus.active) { if (walker) releaseWalker(false); return; }
  if (!walker || walker.gone || !kiwis.includes(walker)) walker = pickWalker();
  if (focus.tick() === 'done') { completeFocus(); return; }
  const now = Date.now();
  if (now - focusShownAt > 250) { focusShownAt = now; paintFocus({ tick: true }); }
}
// v29.7 「기록」 탭은 바구니 › 일지로 옮겼다 (달력 = 일지 「일」 보기 위) — 이 창은 떠나기 한 화면
document.getElementById('focusRecLink').addEventListener('click', () => { openFocusPanel(false); shell.openBasket(true); shell.basketTab('photo'); setAlbumBy('day'); });
const openFocusPanel = open => {
  if (open) { rememberOpener(focusPanel, focusBtn); shell?.closeAll(); }
  focusPanel.hidden = !open; focusBtn.setAttribute('aria-expanded', String(open));
  if (!open) returnFocus(focusPanel, focusBtn);
  if (!open && !voyage.active && (voyReady || voyLoading)) voyArtRelease();   // 창만 열어 보고 출항하지 않았으면 미리 읽은 그림을 놓는다
  if (open) { if (voyage.mode === 'voyage') { voyArt(); sound.voyLoad(); } paintFocus(); (focusPanel.querySelector('.busy:not([hidden]) button') || focusPanel.querySelector('input:checked') || focusPanel.querySelector('input')).focus(); }
};
focusBtn.addEventListener('click', () => { unlock(); openFocusPanel(focusPanel.hidden); });
focusHud.addEventListener('click', () => openFocusPanel(focusPanel.hidden));
focusPanel.addEventListener('change', e => {
  if (e.target.name === 'flen') { focus.useCustom = e.target.value === 'custom'; focus.len = focus.useCustom ? focus.custom : Number(e.target.value); focus.store(); paintFocus(); }
  if (e.target.name === 'fhush') { focus.hush = e.target.value; focus.store(); if (focus.active) applyHush(); paintFocus(); }
  if (e.target.id === 'focusMin') setCustom(+e.target.value);
  if (e.target.name === 'fmode') { voyage.setMode(e.target.value); if (e.target.value === 'voyage') voyArt(); paintFocus(); }
});
// 직접 정하기: 1~180분, 정수 분 단위 (마지막 값을 기억)
function setCustom(v) {
  if (!Number.isFinite(v)) v = focus.custom;
  focus.custom = focus.len = customMinutes(v); focus.useCustom = true; focus.store();
  document.getElementById('focusMin').value = focus.custom; paintFocus();
}
for (const b of focusPanel.querySelectorAll('.fcustom button')) b.addEventListener('click', () => setCustom(focus.custom + +b.dataset.step));
document.getElementById('focusMin').addEventListener('input', e => {
  // 다른 옵션을 누르며 창이 다시 그려져도 방금 입력한 분 수를 잃지 않는다.
  if (e.target.value === '' || !e.target.validity.valid) return;
  focus.custom = focus.len = customMinutes(+e.target.value); focus.useCustom = true; focus.store();
});
document.getElementById('focusMin').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); setCustom(+e.target.value); } });
// v20.1 집중하는 동안 소리: 배경 소리만(기본) · 조용히 · 그대로 — 끝나면 원래대로
const applyHush = () => sound.setHush((focus.active || voyage.active) && focus.hush !== 'off' ? focus.hush : null);
document.getElementById('focusStart').addEventListener('click', () => { unlock(); if (voyage.mode === 'voyage') startVoyage(); else startFocus(); });
document.getElementById('focusStop').addEventListener('click', () => { openFocusPanel(false); if (voyage.active) stopVoyage(); else endFocus(focus.finish(Date.now()), '집중을 멈췄어요'); });
document.addEventListener('pointerdown', e => { if (!focusPanel.hidden && !onTop(e.target) && !focusPanel.contains(e.target) && !focusBtn.contains(e.target) && !focusHud.contains(e.target)) openFocusPanel(false); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && foundEl.hidden && !focusPanel.hidden) { openFocusPanel(false); focusBtn.focus(); } });
// 화면을 떠났다 돌아오면: 10초 안이면 이어서, 넘으면 멈춤 (떠난 때까지 걸은 것만 친다)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { focus.hidden(); hiddenAt = Date.now(); save('seen', String(hiddenAt)); return; }
  if (hiddenAt) { const away = (Date.now() - hiddenAt) / 60000; hiddenAt = 0; welcome(away, false); }
  if (wallOn) wallAwake.on();
  const r = focus.visible();
  if (r && r.due) completeFocus();
  else if (r && r.failed) endFocus(r, '화면을 떠나서 집중이 멈췄어요');
  else if (focus.active || voyage.active) awake.on();
});
window.addEventListener('pagehide', () => { focus.hidden(); save('seen', String(Date.now())); });

// ── 카메라 ──
function updateCamera(dt) {
  let tx = W / 2, ty = H / 2, tz = 1;
  let ease = 2.5, tilt = 0;
  cam.t += dt;
  if (view === 'scope') {
    // 쌍안경: 아무 키위나 한 마리를 몇 초씩 몰래 본다 (덤불 속에서 쉬는 키위도). 다른 키위로 옮길 땐 찾듯이 천천히, 손이 살짝 떨린다.
    const pool = kiwis.filter(k => !k.gone);
    if (pool.length && (!pool.includes(cam.peek) || cam.t > cam.peekUntil)) {
      const others = pool.length > 1 ? pool.filter(k => k !== cam.peek) : pool;
      cam.peek = others[Math.floor(Math.random() * others.length)]; cam.peekUntil = cam.t + 8 + Math.random() * 7;
      cam.noticeAt = cam.t + 2.5 + Math.random() * 2.5; cam.noticed = false;
    }
    // v27.6 오래 보고 있으면 그 키위가 알아채고 이쪽(화면)을 정면으로 쳐다본다 — 쳐다보는 동안은 카메라가 머문다
    const g = cam.peek, ga = ACTS[GAZE.id];
    if (g && ga && !cam.noticed && cam.t >= cam.noticeAt) {
      cam.noticed = true;
      if (Math.random() < 0.6 && ['idle', 'free', 'wander'].includes(g.state) && !g.job && !stiffSkin(g.skin) && !g.focus) {
        const from = GAZE.from / ga.fps, hold = GAZE.hold / ga.fps;
        g.act(GAZE.id, true, { from, hold, holdUntil: g.clock + (hold - from) + 2.2 });
        cam.peekUntil = Math.max(cam.peekUntil, cam.t + 5);
      }
    }
    tz = 2.6; ease = 1.3;
    if (cam.peek && pool.length) { tx = cam.peek.x; ty = cam.peek.y - cam.peek.k * 0.4; }
    else { tx = W * (0.5 + 0.3 * Math.sin(cam.t * 0.05)); ty = (beach.bushY ?? H * 0.3) + ((beach.shoreY ?? H * 0.7) - (beach.bushY ?? H * 0.3)) * 0.35; }   // 아무도 없으면 숲 가장자리를 훑는다
    const sh = 3 / tz;   // 손떨림 (화면에서 몇 px)
    tx += sh * (Math.sin(cam.t * 1.7) + 0.6 * Math.sin(cam.t * 4.3 + 1)); ty += sh * (Math.sin(cam.t * 1.3 + 2) + 0.6 * Math.sin(cam.t * 3.7));
  } else if (view === 'text') {
    // 글자 보기: 쓰는 문장 전체가 화면에 꽉 차게. 문장이 없으면 원래 크기로.
    if (box) {
      const bw = box.x1 - box.x0, bh = box.y1 - box.y0;
      tz = clamp(Math.min(W / (bw * 1.18 + S), H / (bh * 1.35 + S * 1.2)), 1, 2.6);
      tx = (box.x0 + box.x1) / 2; ty = (box.y0 + box.y1) / 2;
    }
    ease = 1.4;
  } else if (view === 'breeze') {
    // 바람결: 살짝 확대한 채로 풍경 위를 아주 천천히 떠다닌다. 확대·기울기도 숨 쉬듯.
    tz = 1.32 + 0.08 * Math.sin(cam.t * 0.041);
    const hw = W / (2 * tz), hh = H / (2 * tz);
    tx = W / 2 + (W / 2 - hw) * Math.sin(cam.t * 0.027);
    ty = H / 2 + (H / 2 - hh) * Math.sin(cam.t * 0.019 + 1.3);
    tilt = 7 + 5 * Math.sin(cam.t * 0.033 + 0.5);   // 2~12도
    ease = 1;
  }
  if (view === 'follow') {
    const busy = kiwis.filter(k => k.state === 'write' || k.state === 'peck');
    const pool = busy.length ? busy : kiwis.filter(k => !k.gone && k.state !== 'flee');
    if (pool.length) {
      if (!cam.target || !pool.includes(cam.target)) cam.target = pool[Math.floor(Math.random() * pool.length)];
      tz = 2.1; tx = cam.target.x; ty = cam.target.y - cam.target.k * 0.4;
    } else if (box) { tz = 1.4; tx = (box.x0 + box.x1) / 2; ty = (box.y0 + box.y1) / 2; }
  }
  const f = Math.min(1, dt * ease);
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) { tx = W / 2; ty = H / 2; }
  if (!Number.isFinite(cam.x) || !Number.isFinite(cam.y)) { cam.x = W / 2; cam.y = H / 2; }
  cam.z += (tz - cam.z) * f;
  const hw = W / (2 * cam.z), hh = H / (2 * cam.z);
  cam.x += (clamp(tx, hw, W - hw) - cam.x) * f;
  cam.y += (clamp(ty, hh, H - hh) - cam.y) * f;
  cam.x = clamp(cam.x, hw, W - hw); cam.y = clamp(cam.y, hh, H - hh);
  const o = orbit();
  if (view === 'diorama') {
    // 뒤로 기울이면 위쪽 가장자리가 작아진다 → 위 모서리까지 화면을 덮는 최소 배율을 계산해서 키운다
    const th = (20 * Math.PI) / 180, piv = H * 0.6, d = Math.max(W, H) * 1.1;
    // 배율 s 를 먼저 곱한 뒤 기울이므로 위 가장자리 깊이도 s 에 비례: 높이·너비가 모두 화면을 덮는 s 의 하한
    const sn = Math.sin(th), cs = Math.cos(th);
    const s = 1.03 * Math.max(d / (d * cs - piv * sn), d / (d - piv * sn));
    worldEl.style.transform = o + `translate(${W / 2}px, ${piv}px) perspective(${d}px) rotateX(20deg) scale(${s}) translate(${-W / 2}px, ${-piv}px)`;
  } else if (view === 'breeze') {
    // 기울인 만큼 위쪽이 작아지므로 디오라마와 같은 식으로 덮는 배율을 더 곱한다. 가운데(cam)를 기울기 축에 둔다.
    const th = (tilt * Math.PI) / 180, d = Math.max(W, H) * 1.1, sn = Math.sin(th), cs = Math.cos(th), piv = H / 2;
    const k = 1.02 * Math.max(d / (d * cs - piv * sn), d / (d - piv * sn));
    worldEl.style.transform = o + `translate(${W / 2}px, ${H / 2}px) perspective(${d}px) rotateX(${tilt}deg) scale(${cam.z * k}) translate(${-cam.x}px, ${-cam.y}px)`;
  } else worldEl.style.transform = o + `translate(${W / 2}px, ${H / 2}px) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)`;
}

// ── v22.1 번인 방지 ①: 그림 전체가 반지름 4px 원을 따라 아주 천천히 돈다 (기본 12분에 한 바퀴, 1px 씩 — 눈에 거의 안 보임).
//    가장자리가 비지 않게 그만큼 살짝 크게 깐다. 시점 변환 맨 앞에 붙이므로 toWorld(누른 자리 계산)도 그대로 맞는다
const ORBIT_R = 4;
function orbit() {
  if (!TUNE.orbit) return '';
  const a = (Date.now() / (TUNE.orbit * 60000)) * 2 * Math.PI, ox = Math.round(ORBIT_R * Math.cos(a)), oy = Math.round(ORBIT_R * Math.sin(a));
  const s = 1 + (2 * ORBIT_R + 2) / Math.max(1, Math.min(W, H));
  return `translate(${W / 2 + ox}px, ${H / 2 + oy}px) scale(${s.toFixed(4)}) translate(${-W / 2}px, ${-H / 2}px) `;
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

// 쌍안경 가림막: 가로 화면은 동그란 렌즈 두 개, 세로 화면은 하나. 부드러운 가장자리라 1/4 해상도 캔버스를 늘려 쓴다
// (CSS 그라데이션은 핀치 확대 때 타일마다 다시 그려져 깜빡인다 — v18.5.4 #tint 와 같은 이유).
function paintScope() {
  const q = 4, w = Math.max(1, Math.round(W / q)), h = Math.max(1, Math.round(H / q));
  scopeEl.width = w; scopeEl.height = h;
  const c = scopeEl.getContext('2d');
  c.fillStyle = 'rgba(6, 10, 14, 0.96)'; c.fillRect(0, 0, w, h);
  const two = W > H * 1.05, r = two ? Math.min(h * 0.46, w * 0.3) : Math.min(w * 0.47, h * 0.36);
  const cs = two ? [[w / 2 - r * 0.66, h / 2], [w / 2 + r * 0.66, h / 2]] : [[w / 2, h / 2]];
  c.globalCompositeOperation = 'destination-out';
  for (const [x, y] of cs) {
    const g = c.createRadialGradient(x, y, r * 0.8, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.7, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(x, y, r * 0.8, 0, Math.PI * 2); c.fillStyle = '#000'; c.fill();
  }
  c.globalCompositeOperation = 'source-over';
}

function setView(v, announce = true) {
  view = v;
  document.body.dataset.view = v;
  if (v === 'scope') paintScope();
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
  atmos.mapId = mapId;
  atmos.update(dt, beach, lightShown);
  if (voyage.active) {
    // 숨겨진 섬은 정지한다. 항해 시간·날씨·배경 소리만 갱신하고 섬 걸음/콕/수집을 발생시키지 않는다.
    sound.update({ high: 0, rain: atmos.v.rain, wind: Math.max(atmos.v.wind, atmos.v.rain * 0.3), night: atmos.night, hour: lightShown, weather: atmos.weather });
    voyageTick(); ambAt = Date.now(); return;
  }
  // 시간대 그림: 해 질 녘·밤·새벽에 그 빛으로 다시 칠한 판을 섞는다. 처음 필요해질 때 읽고, 다 읽기 전엔 시간 빛만.
  if (plate && water) artWarm = artTick(dt);
  clouds.amount = atmos.cloud; clouds.windK = atmos.windK;
  clouds.update(dt);
  halloween.update(dt, beach, atmos.night);
  season.update(dt);
  momentTick(dt);   // v28.21 드문 순간
  if (MAPS[mapId].gulls && (atmos.night < 0.6 || gulls.list.length)) gulls.update(dt, beach, x => sound.gull(x), atmos.night < 0.6); else gulls.list.length = 0;   // 밤엔 갈매기가 새로 오지 않는다 (날던 새는 지나가게)
  sound.update({ high: clamp((beach.shoreY - beach.lvl) / (beach.H * 0.3), 0, 1), rain: atmos.v.rain, wind: Math.max(atmos.v.wind, atmos.v.rain * 0.3), night: atmos.night, hour: lightShown, weather: atmos.weather });
  if (beach.t - tintAt > 0.25) {
    tintAt = beach.t;
    paintTint();
    glowEl.style.opacity = String(Math.max(0.15, 1 - atmos.night * 0.85));   // 골든아워 빛은 밤엔 거의 사라진다
    document.body.classList.toggle('snowy', beach.snow > 0.3);
    if (lightMode === 'auto' && !settings.hidden) paintLight();
    const hh = now.getHours();
    dimEl.style.opacity = (wallOn && (hh >= 22 || hh < 6)) || (TEST && TUNE.dim) ? '0.55' : '0';
    if (TUNE.auto && plate && Date.now() - autoGuestAt > TUNE.auto * 60000) { autoGuestAt = Date.now(); const r = arrive(guestsFor(TUNE.guestN || 1)); if (r.came.length) toast(`${[...new Set(r.came)].join('·')}${r.came.length > 1 ? '' : iGa(r.came[0])} 지나갔어요${r.notes ? ' — 쪽지를 두고 갔어요' : ''}`, 2600); }   // 벽시계: 밤 10시 ~ 아침 6시엔 화면을 어둡게
    if (wallOn && hh !== wallHour) { if (wallHour >= 0) { wallJit = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 }; wallMove = true; lastClock = null; } wallHour = hh; }
    if (!document.hidden && Date.now() - seenAt > 15000) { seenAt = Date.now(); save('seen', String(seenAt)); }
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
      if (memo && memo.photo && current === memo.text) memo.shotAt = beach.t + groupPhoto();   // 글씨 아래로 줄지어 서서 폴짝인 뒤 한 장
      kiwis.forEach((k, i) => k.hop(2, i * 0.07));
      sound.chorus(kiwis.filter(k => !k.gone).map(k => k.x));   // 키위마다 자기 자리에서 한 음씩
    }
  }
  if (memo && memo.shotAt && !memo.shot) for (const k of kiwis) {   // v27.6 기념사진 자세: 셔터 순간에 꼭짓점 프레임에 닿도록 미리 시작해 거기서 멈춰 있기
    const p = k.photoPose, a = p && ACTS[p.id];
    if (!a || k.posed || k.gone || !['idle', 'free'].includes(k.state)) continue;
    const from = (p.from || 0) / a.fps, hold = p.hold / a.fps;
    if (beach.t >= memo.shotAt - (hold - from) - 0.15) { k.posed = true; k.act(p.id, true, { from, hold, holdUntil: k.clock + (hold - from) + 1.4 }); }
  }
  if (memo && memo.shotAt && !memo.shot && beach.t >= memo.shotAt) { memo.shot = true; shotWanted = true; for (const k of kiwis) k.photoPose = null; }
  if (memo && beach.t > memo.until) memo = null;   // 안전장치: 끝내 다 못 썼으면 그만
  if (phase === 'hold' && beach.t >= holdUntil) {
    if (memo && current === memo.text) { const was = memo; memo = null; if (was.photo) offerBreath(); }   // 집중 기록을 다 남긴 뒤: 숨 고르기 권하기
    pending = null;
    const nx = nextAuto(hour);
    if (nx) submit(...nx); else wash();
  }
  // 시계: 분이 바뀌면 다시 쓴다 · 다른 모드: 해변이 비어 있으면 바로 다음 글
  if (isAuto(mode) && !pending && !memo && !breath && (phase === 'idle' || phase === 'hold')) {
    if (isClock(mode) ? clockText(hour, clockOpt.fmt) !== lastClock && beach.t > 1 : phase === 'idle' && beach.t > 1.5) submit(...nextAuto(hour));
  }

  // 키위 수를 줄였을 때: 상한보다 많으면 일감 없는 키위부터 조용히 숲으로 돌아간다 (쓰는 중인 키위는 마저 쓴다)
  let extra = kiwis.filter(k => !k.gone && k.state !== 'flee' && !k.focus).length - crowd().max;
  world.mood = { night: atmos.night, cold: mapId === 'snow' || atmos.weather === 'snow', wet: atmos.v.rain,
    wind: atmos.v.wind, petals: atmos.v.blossom || 0, fog: atmos.v.fog };   // v27 키위가 고르는 동작 · v27.2 바람·꽃잎(낙엽) 바람·안개
  for (const kw of kiwis) {
    if (kw.focus) patrol(kw);
    else if (extra > 0 && !kw.gone && !kw.job && !kw.busy && kw.after !== 'dig' && ['free', 'wander', 'idle', 'act'].includes(kw.state)) {
      kw.flee(beach.grass(kw.x) - 50 * beach.u); kw.alertT = 0; extra--;
    }
    else if (kw.state === 'free' && phase !== 'writing' && !(memo && memo.shotAt && !memo.shot)) {   // 단체 사진 찍기 전엔 줄 선 자리에 그대로
      if (!(Math.random() < LIVELY_STAY[lively] && kw.act(pickIdleAct(world.mood)))) loiter(kw);   // v27.6 풍부할수록 어슬렁 대신 그 자리에서 몸짓
    }
    kw.update(dt, world);
    // 숲 덤불을 드나들 때: 가장자리 근처에서 서서히 보였다 사라지고, 잎이 살짝 흔들려 튄다
    const g = beach.grass(kw.x), u = beach.u;
    kw.vis = clamp((kw.y - (g - 40 * u)) / (46 * u), 0, 1);
    const inside = kw.y < g - 8 * u;
    if (kw.inside !== undefined && inside !== kw.inside) rustle(kw.x, g - 6 * u);
    kw.inside = inside;
  }
  drifters.paused = focus.active || !!breath;
  memoTick();
  bottleTick(hour);
  kiwiWx.mapId = mapId; kiwiWx.update(dt, kiwis, atmos.v, beach);
  dozeTick(); burnTick();
  breathTick(dt);
  restTick();
  drifters.update(dt, beach, col, d => sound.arrive(d.x));
  floaters.update(dt, beach, atmos.v.wind);
  if (beach.eraser === 'rake') rake.update(beach);
  focusTick(); voyageTick();
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

  if (!Number.isFinite(nextAmbient)) nextAmbient = beach.t + 1;   // v29.16.2 숨은 창에서 시간이 NaN 이 되면 다음 등장이 영영 오지 않았다
  if (phase === 'idle' && !beach.surging && beach.t > nextAmbient && W > 0) {
    // v29.16.2 구경 모드: 쓸 글이 없으니 고른 키위 수만큼 나와 돌아다닌다 (평소 쉬는 때는 한두 마리)
    const watch = mode === 'watch';
    nextAmbient = beach.t + (watch ? 1.2 + Math.random() * 1.8 : 4 + Math.random() * 6);
    if (kiwis.length < (watch ? Math.min(crowdN, crowd().max) : crowd().idle[atmos.night > 0.5 ? 1 : 0])) spawn();   // 키위는 야행성 — 밤에 더 많이 나온다
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
  const waterOpts = { snow: beach.snow, night: atmos.night, rain: atmos.v.rain, art: art.n, warm: artWarm, land: beach.eraser !== 'water' };
  try { water.draw(beach, waterOpts); }
  catch (e) {
    if (water.flat) throw e;
    console.warn('풍경 그리기를 복구합니다:', e);
    useFlat(); water.resize(W, H, artDpr()); water.draw(beach, waterOpts);
  }
  const raking = beach.eraser === 'rake';
  if (raking) rake.draw(ctx, beach);   // 다시 긋는 갈퀴 줄은 발자국 아래
  ctx.save();
  beach.clipLand(ctx);
  beach.drawPrints(ctx, { night: atmos.night, photo: !!(memo?.photo && current === memo.text) });
  ctx.restore();
  if (DEBUG) {
    ctx.save();
    ctx.strokeStyle = 'rgba(200,40,40,0.5)'; ctx.lineWidth = 1;
    for (const j of jobs) { ctx.beginPath(); j.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (j.kind === 'peck') ctx.arc(j.pts[0][0], j.pts[0][1], 3, 0, 6.29); ctx.stroke(); }
    ctx.restore();
  }
  const order = kiwis.slice().sort((a, b) => a.y - b.y);
  if (breath && breath.stage === 'breathe') drawBreathRing();
  shore.draw(ctx, beach, atmos.night);
  floaters.draw(ctx, beach);
  drifters.draw(ctx, beach);
  extras?.drawIsland(ctx, beach, mapId, atmos.night);   // v28 섬에서 지은 것 (숲 가장자리 양 끝)
  halloween.drawIsland(ctx, beach, atmos.night);
  season.drawIsland(ctx, beach, atmos.night);
  drawNotes();
  for (const kw of order) kw.drawShadow(ctx);
  // 그늘은 천천히 따라간다 (v18.3.3) — 그늘 가장자리를 지날 때 한 프레임에 확 바뀌지 않게
  for (const kw of order) { const sh = plate.shadeAt(kw.x, kw.y - kw.k * 0.4); kw.shade = kw.shade == null ? sh : kw.shade + (sh - kw.shade) * 0.12; kiwiWx.drawLeaning(ctx, kw, () => kw.draw(ctx)); kiwiWx.drawUmbrella(ctx, kw); }
  kiwiWx.drawFeathers(ctx);
  drawTags(order);
  bubbles.update(beach.t, kiwis); bubbles.draw(ctx, beach.t);   // v28.21 감정 표시 · 꿈 말풍선
  halloween.drawBats(ctx);
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

// v19.1 손님이 두고 간 쪽지: 모래 위 자리(비율로 저장 — 화면 크기가 바뀌어도 그 근처)
const noteAt = p => { const x = clamp(p.rx * W, 30, W - 30), top = beach.grass(x), bot = beach.shoreAt(x); return { x, y: top + (bot - top) * p.ry }; };
const noteSize = () => Math.max(40, 66 * beach.u);
// v29.10 놓아 둔 답장 선물: 손님이 가져가기 전까지 모래 위에 그 물건이 놓여 있다 (동물마다 자리 하나)
//  v29.11 초록 잎 받침·동그란 그림자 → 물건 모양을 따라 모래에 눕는 그림자 (src/shadow.js)
// v29.12 자리 고정: 글씨가 놓이는 모래 가운데를 피해 물가 바로 위 오른쪽부터 한 칸씩 (놓은 순서대로)
const giftSpot = gid => { const i = Math.max(0, Object.keys(gifts.waiting).indexOf(gid)); return { rx: 0.9 - (i % 6) * 0.1, ry: 0.9 - Math.floor(i / 6) * 0.07 }; };
const giftIcons = new Map();
// v29.17 쪽지가 선물 자리에 떨어지면 선물 줄 왼쪽으로 비켜 놓는다 — 쪽지가 선물(배 판자 등) 위에 얹혀 보이던 것. 저장 자리는 그대로, 그릴 때만
const noteSpot = p => {
  const used = Object.keys(gifts.waiting).map(giftSpot), gap = noteSize() * 0.9 / Math.max(1, W);
  let rx = p.rx;
  for (let k = 0; k < 8; k++) { const hit = used.find(g => Math.abs(g.rx - rx) < gap && Math.abs(g.ry - p.ry) < 0.12); if (!hit) break; rx = hit.rx - gap * 1.05; }
  return rx === p.rx ? p : { ...p, rx: Math.max(0.05, rx) };
};
let findSheetIm = null;
function giftIcon(key) {
  if (giftIcons.has(key)) return giftIcons.get(key);
  const [t, id] = key.split(':'), px = 96;
  if (t === 'c') { const cv = extras.catchIcon(id, px); giftIcons.set(key, cv); return cv; }
  if (!findSheetIm) { findSheetIm = new Image(); findSheetIm.onload = () => giftIcons.clear(); findSheetIm.src = 'assets/finds.webp?v=v29.25.1-44a30f8'; }
  if (!findSheetIm.complete || !findSheetIm.naturalWidth) return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = px;
  const c = FIND[id].cell, cw = findSheetIm.naturalWidth / 4, ch = findSheetIm.naturalHeight / FIND_ROWS;
  cv.getContext('2d').drawImage(findSheetIm, (c % 4) * cw, Math.floor(c / 4) * ch, cw, ch, 0, 0, px, px);
  giftIcons.set(key, cv); return cv;
}
function drawGifts() {
  const s = noteSize() * 0.9, t = beach.t;
  for (const [gid, gw] of Object.entries(gifts.waiting)) {
    const im = giftIcon(gw.key); if (!im) continue;
    const { x, y } = noteAt(giftSpot(gid));
    const bob = Math.sin(t * 1.6 + x) * s * 0.012, w = s * 0.84, top = y - s * 0.62;
    dropShadow(ctx, im, x, top + w, w, w, { alpha: 0.24, squash: 0.2, lean: 0.8, lift: Math.max(0, -bob) });
    ctx.drawImage(im, x - w / 2, top + bob, w, w);
  }
}
function drawNotes() {
  if (Object.keys(gifts.waiting).length) drawGifts();
  if (!guestSheet || !guestbook.pending.length) return;
  const cw = guestSheet.naturalWidth / 4, ch = guestSheet.naturalHeight / 3, s = noteSize(), t = beach.t;
  for (const p of guestbook.pending) {
    const { x, y } = noteAt(noteSpot(p)), cell = NOTE_CELL[GUESTS[p.id].note];
    ctx.save();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#3a2a18';
    ctx.beginPath(); ctx.ellipse(x + 3, y + s * 0.18, s * 0.42, s * 0.13, 0, 0, 6.29); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.drawImage(guestSheet, (cell % 4) * cw, Math.floor(cell / 4) * ch, cw, ch, x - s / 2, y - s * 0.62, s, s * ch / cw);
    // 눈길을 끄는 반짝임
    const g = Math.max(0, Math.sin(t * 2.2 + p.rx * 9));
    ctx.globalAlpha = g * 0.9; ctx.fillStyle = '#fffbe6';
    const r = (2 + g * 3) * beach.u, sx = x + s * 0.28, sy = y - s * 0.42;
    ctx.beginPath(); ctx.moveTo(sx, sy - r * 2); ctx.lineTo(sx + r * 0.4, sy); ctx.lineTo(sx, sy + r * 2); ctx.lineTo(sx - r * 0.4, sy); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - r * 2, sy); ctx.lineTo(sx, sy + r * 0.4); ctx.lineTo(sx + r * 2, sy); ctx.lineTo(sx, sy - r * 0.4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
function noteHit(x, y) {
  const s = noteSize(), near = p => { const q = noteAt(p); return Math.hypot(q.x - x, q.y - s * 0.2 - y) < s * 0.6 + 8 * beach.u; };
  const note = guestbook.pending.find(p => near(noteSpot(p))); if (note) return note;
  const gid = Object.keys(gifts.waiting).find(g => near(giftSpot(g)));
  return gid ? { onSand: gid } : null;
}
function openNote(p) {
  if (p.onSand) {   // v29.10 놓아 둔 선물을 누르면: 누구를 기다리는지 · 그 동물이 어디 사는지
    const g = GUESTS[p.onSand], gi = giftItem(gifts.waiting[p.onSand].key), here = g.maps.includes(MAPS[mapId].like || mapId);
    const where = g.maps.filter(k => MAPS[k]).map(k => MAPS[k].name).join('·'), eun = iGa(g.name) === '이' ? '은' : '는';
    toast(`${gi.name} — ${giftEul(g.name)} 기다리는 선물이에요 · ` + (here ? '자리를 비우면 가져가러 와요' : `${g.name}${eun} ${where}에 살아요`), 3200);
    return;
  }
  const { x, y } = noteAt(noteSpot(p));
  guestbook.open(p);
  sound.found(x);
  const u = beach.u, C = ['#fff6c9', '#ffd98a', '#ffffff', '#ffc2a8'];
  for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, sp = (50 + Math.random() * 100) * u; sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50 * u, r: (1.8 + Math.random() * 2) * u, c: C[i % 4], age: 0, life: 0.7 + Math.random() * 0.5 }); }
  setTimeout(() => showFound(p.gift ? { kind: 'guest', id: p.id, gift: p.gift } : { kind: 'guest', id: p.id, n: p.n }, true), 320);
  if (collShown()) paintCollection();
}
const iGa = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '이' : '가'; };
const guestPic = id => { const c = GUESTS[id].cell, i = document.createElement('i'); i.className = 'gpic'; i.style.backgroundPosition = `${(c % 4) * 100 / 3}% ${Math.floor(c / 4) * 50}%`; if (GUESTS[id].pic === 2) i.style.backgroundImage = "url('assets/guests2.webp?v=v29.25.1-44a30f8')"; return i; };

// v19 무리 키위 이름표: 처음 나올 때·누를 때 머리 위에 잠깐
function drawTags(order) {
  for (const kw of order) {
    if (!kw.member || !(kw.tagUntil > beach.t) || (kw.vis ?? 1) < 0.4) continue;
    const m = flock.get(kw.member); if (!m) continue;
    const left = kw.tagUntil - beach.t, a = Math.min(1, left / 0.6) * Math.min(1, (kw.vis ?? 1));
    const fs = clamp(kw.k * 0.4, 11, 20), y = kw.y - kw.k * 1.5;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `600 ${fs}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(m.name).width + fs * 1.1, h = fs * 1.55;
    ctx.fillStyle = 'rgba(255,250,240,0.88)';
    ctx.beginPath(); ctx.roundRect(kw.x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(kw.x - fs * 0.3, y + h / 2 - 1); ctx.lineTo(kw.x, y + h / 2 + fs * 0.35); ctx.lineTo(kw.x + fs * 0.3, y + h / 2 - 1); ctx.fill();
    ctx.fillStyle = '#5b4630'; ctx.fillText(m.name, kw.x, y + 0.5);
    ctx.restore();
  }
}

// (최적화) 느린 기기: 3초 넘게 40fps 아래로 버벅이면 그림 층(물·숲 잎)의 해상도만 한 단계 낮춘다
//  — 셰이더 일이 화면 픽셀 수에 비례해서 가장 크게 준다. 키위·글씨·발자국(stage 캔버스)은 그대로 선명하다.
//  2 → 1.5 → 1.25 → 1. 다시 올리지는 않는다(오르내림 방지). 이 기기·이번 방문에만.
let artScale = 0;   // 0 = 화면 해상도 그대로
const artDpr = () => (artScale ? Math.min(artScale, dpr) : dpr);
const perf = { ema: 1 / 60, slowFor: 0 };
function watchPerf(gap) {
  if (voyage.active) return;   // 숨겨진 섬의 해상도를 항해 부하로 낮추지 않는다
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
  // v29.4.5: 해도 창이 화면을 다 덮는 동안엔 뒤 장면(물·키위·바다)을 그리지 않는다 — 폰에서 해도 끌기와 GPU 를 나눠 써 끊기던 것. 시간 흐름(tick)은 그대로
  const covered = !(frame.chartEl ||= globalThis.document?.getElementById('chartView'))?.hidden && !!frame.chartEl;
  try { tick(dt); if (covered) { /* 해도가 덮음 */ } else if (voyage.active) voyageDraw(dt); else draw(); if (shotWanted) { shotWanted = false; takeShot(); } }
  catch (e) { if (!frame.err) { frame.err = String(e && e.message || e); console.error(e); } }
  if (!ready) { ready = true; document.body.classList.add('ready'); }
  requestAnimationFrame(frame);
}

// ── 입력 ──
const form = document.getElementById('say');
const input = document.getElementById('sayInput');
const soundBtn = document.getElementById('soundBtn'), muteBtn = document.getElementById('muteBtn');   // 2026-10-24 개편: 소리는 ⋯ 메뉴 한 줄(누르면 설정 › 소리) + 바로 켜고 끄기
const viewBtn = document.getElementById('viewBtn');
const infoBtn = document.getElementById('infoBtn'), menuBtn = document.getElementById('menuBtn'), menu = document.getElementById('menu');   // menu 는 여기서 — 벽시계·?ui=0 은 시작하자마자 화면 정리(setClean)를 부르는데 그 안에서 menu 를 쓴다
const info = document.getElementById('info');
// 작품 설명의 버튼 목록에 실제 버튼 그림을 그대로 옮겨 쓴다 (v18.6.1) — 그림이 바뀌어도 설명이 따라간다
for (const i of info.querySelectorAll('[data-icon]')) { const svg = document.getElementById(i.dataset.icon)?.querySelector('svg'); if (!svg) continue; const c = svg.cloneNode(true); c.querySelectorAll(':scope > g[class]').forEach((g, k) => k && g.remove()); const g0 = c.querySelector(':scope > g[class]'); if (g0) c.dataset.ico = g0.getAttribute('class'); i.append(c); }   // 글 모드·날씨는 그림 여러 벌 중 첫 번째만
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
mountHomeFullscreen();   // v29.20 홈 화면 바로가기로 열었으면 첫 누름에 화면 전체 (상태 표시줄 없이)
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
  bottles.keep(input.value, 'write');
  submit(input.value);
  input.value = '';
  if (TOUCH) input.blur();
});

const paintSoundBtn = () => {
  soundBtn.setAttribute('aria-pressed', String(sound.on));
  soundBtn.setAttribute('aria-label', sound.on ? '소리 크기 (켜짐)' : '소리 크기 (꺼짐)');
  soundBtn.dataset.on = sound.on ? '1' : '0';
  muteBtn.setAttribute('aria-checked', String(sound.on)); muteBtn.textContent = sound.on ? '켜짐' : '꺼짐';
};
// 창 안의 탭 (v18.6): 설정은 풍경 · 글씨 · 모은 것, 소리 창은 크기 · 곡 · 발자국·배경 — 한 줄로 길게 섞여 있던 것을 나눴다
function wireTabs(panel, key) { return bindTabs(panel, key, { load: saved, save }); }
soundBtn.addEventListener('click', () => { unlock(); shell.openWard(true, { mode: 'sound' }); });   // v29.12 메뉴 › 소리 = 소리 고르기 창 (크기는 설정 › 소리)
muteBtn.addEventListener('click', e => { e.stopPropagation(); unlock(); mixOn.checked = !mixOn.checked; mixOn.dispatchEvent(new Event('change', { bubbles: true })); });
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
  // v29.12 키위 소리는 위 무대 키위가 걸어 보거나(발자국) 콕 찍어 보며(찾았을 때) 들려준다
  if (group === 'natstep') { sound.setMix({ natStep: pack }); if (preview) { sound.previewStep(pack); shell?.stageAct('walk'); } }
  else if (group === 'find') { sound.setMix({ findPack: pack }); if (preview) { sound.found(sound.stage.W / 2); shell?.stageAct('peck'); } }
  else if (group === 'step') { sound.setMix({ stepPack: pack }); if (preview) { sound.previewStep(pack); shell?.stageAct('walk'); } }
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
    b.addEventListener('click', () => { unlock(); sound.setMix({ voice: v.id }); paintPacks(); sound.previewStep(v.id === 'natural' ? sound.mix.natStep : sound.mix.stepPack); shell?.stageAct('walk'); });
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
      if (group === 'step' && it.id) {   // 악기 소리는 종류별 작은 제목 (v18.8)
        const p = /^s-i-/.test(it.id) ? '악기' : /^s-[pc]-/.test(it.id) ? '톡·뽁' : '바닥 악기';
        if (p !== part) { part = p; const h = document.createElement('p'); h.className = 'part'; h.textContent = p; box.append(h); }
      }
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
  if (!own('natstep', sound.mix.natStep)) sound.setMix({ natStep: 'place' });
  if (!own('find', sound.mix.findPack)) sound.setMix({ findPack: 'base' });
  if (!own('step', sound.mix.stepPack)) sound.setMix({ stepPack: 'music' });
  if (!VOICES.some(v => v.id === sound.mix.voice)) sound.setMix({ voice: 'inst' });
  if (!own('nature', sound.mix.nature)) sound.mix.nature = 'none';
  if (!own('music', sound.mix.song)) sound.setSong('auto'); }
for (const k of ['music', 'amb', 'sfx']) {
  const el = document.getElementById('mix-' + k);
  el.value = Math.round(sound.mix[k] * 100);
  el.addEventListener('input', () => sound.setMix({ [k]: el.value / 100 }));
}
paintSoundBtn();
viewBtn.addEventListener('click', () => openPicker(viewBtn, '시점', VIEWS.map(v => ({ id: v, name: VIEW_NAME[v], g: 'v-' + v })), view, v => setView(v)));
setView(view, false);

const openInfo = open => {
  info.hidden = !open;
  document.body.classList.toggle('info-open', open);
  infoBtn.setAttribute('aria-expanded', String(open));
  if (open) { info.scrollTop = 0; info.querySelector('h1').focus({ preventScroll: true }); }
  else menuBtn.focus();   // 작품 설명은 첫 문장부터 읽고, 닫으면 메뉴 버튼으로
};
infoBtn.addEventListener('click', () => openInfo(info.hidden));
info.addEventListener('click', e => { if (e.target === info || e.target.closest('[data-close]')) openInfo(false); });
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !info.hidden) openInfo(false);
  if (e.target.matches && e.target.matches('input[type="text"], textarea')) return;
});

// 누르기: 구름이면 찢고, 키위면 놀라고, 빈 모래면 근처 키위가 와서 콕
// 화면에 닿아 있는 손가락 — 두 번째 손가락(핀치)은 콕·안개 뚫기를 하지 않는다 (window 캡처라 아래 처리보다 먼저 센다)
const fingers = new Set();
window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') fingers.add(e.pointerId); }, true);
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, e => fingers.delete(e.pointerId), true);
document.getElementById('touch').addEventListener('pointerdown', e => {
  if (!plate) return;   // 그림을 다 읽기 전에는 누를 곳이 없다
  if (fingers.size > 1) { fogWipe = null; return; }
  if (breath) { endBreath(false); return; }   // v21 숨 고르는 중: 누르면 그만
  const [x, y] = toWorld(e.clientX, e.clientY);
  const sh = shore.hit(x, y, beach.u);
  if (sh) { pickUp(sh); return; }
  const nt = noteHit(x, y);
  if (nt) { openNote(nt); return; }
  const dr = drifters.hit(x, y, beach.u);
  if (dr) { openDrift(dr); return; }
  if (atmos.meteors.hit(x, y, beach.u)) { starWish(x); return; }   // v23 별똥별을 누르면
  // v16.2 안개 낀 날: 누른 자리가 뻥 뚫린다 (누른 채 문지르면 지나간 길도 닦인다)
  if (atmos.punchFog(x, y, beach.u, true)) { sound.poof(x); fogWipe = { x, y }; return; }
  const cl = clouds.hit(x, y);
  if (cl) { clouds.scatter(cl, x, y); sound.poof(x); return; }
  const hit = kiwis.find(k => dist(k.x, k.y - k.k * 0.45, x, y) < k.k * 0.55);
  if (hit) {
    // v27.6 방금 놀란 키위를 또 누르면 놀라지 않고 궁금해한다 (갸웃·두리번·통통 · v28.6 쑥스러워 숨기)
    const again = hit.tappedAt != null && beach.t - hit.tappedAt < 2.5 && hit.state !== 'act';
    if (!hit.busy && hit.state !== 'flee') { if (again) hit.later(['tilt', 'lookaround', 'joy', 'hide'][Math.floor(Math.random() * 4)], 0.15); else hit.startle(); }
    hit.tappedAt = beach.t;
    if (hit.member) hit.tagUntil = beach.t + 2.5; sound.call(0, hit.x); return;
  }
  if (y < beach.grass(x) || y > beach.edge(x) - 10) return;
  const idle = kiwis.filter(k => !k.busy && k.state !== 'flee' && !k.focus);
  const kw = idle.length ? idle.reduce((a, b) => (dist(a.x, a.y, x, y) < dist(b.x, b.y, x, y) ? a : b)) : spawn();
  // v27.6 다가온 키위는 대개 콕, 가끔 킁킁·땅 파기 — 근처 다른 키위들은 그쪽을 갸웃·두리번
  const r = Math.random();
  kw.digAt(x, y, r < 0.5 ? null : r < 0.75 ? 'sniff' : 'probe');
  for (const k of idle) if (k !== kw && dist(k.x, k.y, x, y) < k.k * 5 && Math.random() < 0.6) { k.face = x >= k.x ? 1 : -1; k.later(Math.random() < 0.6 ? 'tilt' : 'lookaround', 0.3 + Math.random() * 0.8); }
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
  const [p, kiwiImg, gullImg, bottle, crate] = await Promise.all([first, img('assets/kiwi.webp?v=v29.25.1-44a30f8'), img('assets/gull.webp?v=v29.25.1-44a30f8'), img('assets/bottle.webp?v=v29.25.1-44a30f8'), img('assets/crate.webp?v=v29.25.1-44a30f8')]);
  img('assets/finds.webp?v=v29.25.1-44a30f8').then(im => {
    shore.setSheet(im);
    const c = document.createElement('canvas'), cw = im.naturalWidth / 4; c.width = c.height = cw;
    c.getContext('2d').drawImage(im, cw * 1.15, cw * 0.15, cw * 0.7, cw * 0.7, 0, 0, cw, cw);   // 1번 칸 = 소라 껍데기 (가운데 70% — 칸 안 여백을 덜어 병·상자만큼 보이게)
    drifters.setSprites({ ...drifters.imgs, conch: c });
  }).catch(() => {});
  drifters.setSprites({ ...drifters.imgs, bottle, crate });
  img('assets/bottle-mine.webp?v=v29.25.1-44a30f8').then(im => drifters.setSprites({ ...drifters.imgs, mine: im })).catch(() => {});
  img('assets/bottle-cheer.webp?v=v29.25.1-44a30f8').then(im => drifters.setSprites({ ...drifters.imgs, cheer: im })).catch(() => {});
  // v28.20 물가에 닿은 병·상자는 모래에 반쯤 묻힌 그림으로 (재고 stock/drift-items)
  { const sunk = {}; for (const k of ['bottle', 'mine', 'cheer', 'crate']) img('assets/sunk-' + k + '.webp?v=v29.25.1-44a30f8').then(im => { sunk[k] = im; drifters.setSunk(sunk); }).catch(() => {}); }
  img('assets/kiwi-sleep.webp?v=v29.25.1-44a30f8').then(setKiwiSleep).catch(() => {});
  // v27 동작 그림 (없으면 그냥 안 한다) · ?act=1 이면 멈출 때마다 거의 늘 동작, ?act=nod 처럼 이름이면 그 동작만 (시험용)
  //  묶음이 모두 합쳐 약 4MB 라 첫 화면과 다투지 않게 조금 뒤에 하나씩 읽는다
  setTimeout(async () => {
    for (const id in ACTS) await img('assets/' + ACTS[id].file).then(im => setKiwiActs({ [id]: im })).catch(() => {});
  }, q.has('act') ? 0 : 4000);
  if (q.has('act')) { setActRate(q.get('act') === '0' ? 0 : 0.9); setActOnly(q.get('act')); }
  else applyActs();   // 설정 「키위 몸짓」 + 테스트 탭 「고른 것만 되풀이」 (주소의 ?act= 가 있으면 그쪽)
  img('assets/leaves.webp?v=v29.25.1-44a30f8').then(im => floaters.setSheet(im)).catch(() => {});
  img('assets/guests.webp?v=v29.25.1-44a30f8').then(im => { guestSheet = im; }).catch(() => {});
  // 옷 입은 키위 그림은 뒤에서 천천히 읽는다 (없어도 맨몸으로 그린다)
  for (const it of ITEMS) if (it.kind === 'wear') img('assets/' + it.img).then(im => setKiwiSkins({ [it.id]: im })).catch(() => {});
  halloween.load();
  season.load();
  bubbles.load();
  for (const id in HEADWEAR) img('assets/' + HEADWEAR[id].file).then(im => setKiwiHeadwear({ [id]: im })).catch(() => {});   // v28.7 머리 장식 — 옷 입은 키위도 동작
  plate = p;
  // 3D 그래픽(WebGL2)이 안 되거나 셰이더가 이 기기 GPU 에서 안 만들어지면 그림만 그리는 2D 로 (v18.5.5) — 물결은 없어도 키위·글씨는 그대로
  try { if (q.get('gl') === '0') throw new Error('?gl=0 (2D 시험)'); water = new WaterGL(plateEl); water.setPlate(plate); }
  catch (e) { console.warn('3D 그래픽을 못 써서 2D 로 그립니다:', e); useFlat(); }
  // 메모리가 모자라면(아이패드 등) 브라우저가 3D 그래픽을 도중에 빼앗아 간다 — 그때도 2D 로 넘어간다
  plateEl.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    if (water.flat || e.target !== plateEl) return;   // 복구하며 반환한 옛 캔버스의 뒤늦은 이벤트
    console.warn('3D 그래픽이 끊겨 2D 로 바꿉니다'); useFlat(); water.resize(W, H, artDpr());
  });
  setKiwiSprite(kiwiImg);
  gulls.setSprite(gullImg);
  resize();
  requestAnimationFrame(frame);
  }
// 3D 를 쓰던 캔버스에서는 2D 를 얻을 수 없어서 같은 자리에 새 캔버스를 끼운다
function useFlat() {
  if (water && water.flat) return;
  // 대체 그림을 만들기 전에 이전 GPU 자원을 반환한다 (특히 iPad 메모리 압박).
  const gl = water && water.gl;
  if (gl) {
    water.drop('N'); water.drop('W');
    for (const t of Object.values(water.texs)) gl.deleteTexture(t);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  const c = plateEl.cloneNode(false);
  plateEl.replaceWith(c); plateEl = c;
  c.dataset.renderer = '2d';
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
  if (announce) toast(mode === 'watch' ? '구경 — 글은 쓰지 않고 키위들만 돌아다녀요' : MODE_NAME[mode]);
  document.body.classList.toggle('watching', mode === 'watch');
  if (isAuto(mode)) submit(...nextAuto(nowHour()));
  else { showCaption(null); if (mode === 'watch') washNow(); }
}
// v29.14 파도로 지우기: 지금 모래에 쓴 글을 바로 지운다 (쓰던 중이면 멈추고, 자동 모드는 잠시 뒤 다음 글)
function washNow() {
  pending = null; memo = null; showCaption(null);
  if (phase === 'washing' || (phase === 'idle' && !beach.printCount)) return;
  wash();
}
document.body.classList.toggle('watching', mode === 'watch');
// 글 모드 버튼: 누르면 고르기 창 (v18.6.2 — M 키는 그대로 다음 모드로)
modeBtn.addEventListener('click', () => { unlock(); openPicker(modeBtn, '글 모드', [...MODES.map(m => ({ id: m, name: MODE_NAME[m], g: 'm-' + m })), { id: 'wash', name: '파도로 지우기', g: 'm-wash' }], mode, m => { if (m === 'wash') washNow(); else if (m !== mode) setMode(m); }); });
// 설정 창(톱니바퀴): 시계 초 표시 · 표기
const settings = document.getElementById('settings'), setBtn = document.getElementById('setBtn');
const settingsTab = wireTabs(settings, 'settings');
let noteShown = 30;   // v29.22 받은 쪽지 목록에 처음 보이는 수
let noteFilter = 'all';   // v29.25 받은 쪽지 모아 보기: 'all' · 'p:<성격>' · 'n:<키위 이름>'
const collShown = () => !document.getElementById('basket').hidden || !document.getElementById('wardrobe').hidden;
// 설정을 특정 탭으로 연다 (메뉴 › 소리 → 설정 › 소리)
function openSettingsAt(tab) { paintCollection(); paintModeMenu(); paintLight(); settingsTab(tab); openSettings(true); }
const openSettings = open => { if (open) { rememberOpener(settings, menuBtn); shell?.closeAll(); } settings.hidden = !open; setBtn.setAttribute('aria-expanded', String(open)); if (open) settings.querySelector('[role="tab"][aria-selected="true"]').focus(); else returnFocus(settings, menuBtn); };
const mapOpen = id => { const m = MAPS[id]; return !m.unlock || col.owns(m.unlock) || (m.steps > 0 && focus.total >= m.steps); };
// v28.22 재고 새 장소 24곳: 테스트 탭 「장소 바로 가기」 칸에 붙이되, 열린 곳만 보인다 (테스트 탭이 없으면 칸도 없다 — 2026-10-24 섬은 항해로만)
{ const seg = settings.querySelector('input[name="map"]')?.closest('.seg'), zen = seg?.querySelector('input[value="zen"]').parentElement;
  if (seg) for (const id of MAP_IDS) if (MAPS[id].stock && !seg.querySelector(`input[value="${id}"]`)) {
    const l = document.createElement('label'); l.innerHTML = `<input type="radio" name="map" value="${id}" /><span>${MAPS[id].name}</span>`; seg.insertBefore(l, zen);
  } }
function paintModeMenu() {
  for (const r of settings.querySelectorAll('input[name="map"]')) {
    const open = mapOpen(r.value);
    r.checked = r.value === mapId; r.disabled = !open;
    r.parentElement.classList.toggle('locked', !open);
    r.parentElement.hidden = !!MAPS[r.value].stock && !open;
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
  for (const r of settings.querySelectorAll('input[name="lively"]')) r.checked = r.value === lively;
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
// v29.4.8 (사용자 폰 「한낮인데 어둡다」): 시간대를 「직접 고르기」로 둔 것(기본 18:18 저녁 빛)이나 테스트 「밤 어둡게」가 저장돼 남아 있으면
//  화면만 봐선 왜 어두운지 모른다 — 켤 때 한 번 알려 준다.
setTimeout(() => {
  if (lightMode === 'manual' && Math.abs(((lightPick - realHour() + 36) % 24) - 12) > 1.5) toast(`시간대를 ${hhmm(lightPick)} 빛으로 골라 둔 상태예요 · 설정 › 풍경 › 시간대에서 「지금 시각」`, 5200);
  else if (TEST && TUNE.dim) toast('테스트 「밤 어둡게 미리 보기」가 켜져 있어요 · 설정 › 테스트', 5200);
}, 2600);
lightRange.addEventListener('input', () => setLight('manual', +lightRange.value));
for (const b of lightOpts.querySelectorAll('.chips button')) b.addEventListener('click', () => setLight('manual', +b.dataset.h));

// ── v10 떠내려온 것 열기 · 카드 · 모은 것 ──
const foundEl = document.getElementById('found'), foundWear = document.getElementById('foundWear'), foundShare = document.getElementById('foundShare'), foundGift = document.getElementById('foundGift');
const photoViewer = mountPhotoViewer(document.getElementById('photoViewer'));
let foundItem = null;
function openDrift(d) {
  drifters.open(d, beach.t);
  const mine = d.it.kind === 'mine' || d.it.kind === 'cheer';   // v20 돌아온 내 글 · 응원 쪽지는 모은 것에 넣지 않는다
  const fresh = mine || !col.has(d.it.id);
  if (!mine) col.add(d.it.id);
  else { bottles.receive(d.it); if (collShown()) paintCollection(); }   // v29.22 열어 본 병 쪽지는 바구니 › 편지 「받은 쪽지」에 계속 남는다
  if (d.it.kind === 'map') paintModeMenu();
  sound.found(d.x);
  const u = beach.u, C = ['#fff6c9', '#ffd98a', '#ffffff', '#ffc2a8'];
  for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, sp = (60 + Math.random() * 120) * u; sparks.push({ x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60 * u, r: (2 + Math.random() * 2.5) * u, c: C[i % 4], age: 0, life: 0.8 + Math.random() * 0.5 }); }
  setTimeout(() => showFound(d.it, fresh), 380);
}
let journeyBook = null;
function showFound(it, fresh = false) {
  journeyBook?.destroy(); journeyBook = null; foundEl.querySelector('.btns .shotDel')?.remove();
  foundItem = it; foundEl.classList.remove('bare');
  foundShare.hidden = it.kind !== 'shot';
  foundGift.hidden = true; foundGift.disabled = false; giftPick = null; giftTo = null;
  if (it.kind !== 'shot') dropViewUrl();
  const art = foundEl.querySelector('.art'), title = document.getElementById('foundTitle'), body = foundEl.querySelector('.body');
  art.textContent = '';
  if (it.kind === 'guest' && it.gift) {
    // v29.6 답장 선물을 가져간 손님의 고맙다는 편지
    const g = GUESTS[it.id], gi = giftItem(it.gift.key), pic = guestPic(it.id); art.append(pic); animateGuest(pic, it.id);
    const p = document.createElement('div'); p.className = 'paper'; p.textContent = thanksText(it.id, gi.name, it.gift.liked, it.gift.n) + rewardText(it.gift.reward) + `\n— ${g.name}`; art.append(p);
    title.textContent = `${g.name}${iGa(g.name)} 보낸 답장`;
    body.textContent = (it.gift.liked ? `${g.name}${iGa(g.name)} 좋아하는 걸 맞혔어요` : `${g.name}${iGa(g.name)} 더 좋아하는 게 있는 눈치예요`) + ` · 준 선물 ${gifts.count(it.id)}`;
    foundWear.hidden = true; paintGiftBtn(it.id);
  } else if (it.kind === 'guest') {
    const g = GUESTS[it.id], read = Math.min(guestbook.read[it.id] || 0, g.letters.length);
    // v28.18 갈매기·웨카·고양이·게의 마지막 편지에는 손님 그림 대신 그 손님 이야기 그림
    if (GUEST_STORY[it.id] && it.n === g.letters.length - 1) { const im = document.createElement('img'); im.className = 'story'; im.src = 'assets/' + GUEST_STORY[it.id]; im.alt = `${g.name} 이야기 그림`; art.append(im); }
    else { const pic = guestPic(it.id); art.append(pic); animateGuest(pic, it.id); }   // v28.22 손님 동작 (재고 영상 → 묶음 그림)
    const p = document.createElement('div'); p.className = 'paper'; p.textContent = g.letters[it.n] + `\n— ${g.name}`; art.append(p);
    title.textContent = `${g.name}${iGa(g.name)} 남긴 편지 ${it.n + 1} / ${g.letters.length}`;
    body.textContent = `손님 편지 ${guestbook.lettersRead} / ${LETTER_TOTAL}` + (read < g.letters.length ? ` · ${g.name}${iGa(g.name)} 또 오면 다음 편지` : '');
    foundWear.hidden = read < 2; foundWear.textContent = '다른 편지';
    const likes = gifts.knownLikes(it.id).map(k => giftItem(k).name);
    if (gifts.count(it.id)) body.textContent += ` · 준 선물 ${gifts.count(it.id)}` + (likes.length ? ` · 좋아하는 것: ${likes.join('·')}` : '');
    paintGiftBtn(it.id);
  } else if (it.kind === 'mine') {
    const p = document.createElement('div'); p.className = 'paper mine'; p.textContent = it.text; art.append(p);
    title.textContent = mineTitle(it.at); body.textContent = mineNote(it);
    foundWear.hidden = true;
  } else if (it.kind === 'cheer') {
    const p = document.createElement('div'); p.className = 'paper cheer'; p.textContent = it.text + `\n— ${it.by}` + (it.p && it.by !== '키위 일동' && it.by !== temperName(it.p) ? ` · ${temperName(it.p)}` : '') + (TEST && TUNE.noteId && it.id ? `  [${it.id}]` : ''); art.append(p);
    title.textContent = '초록 병 속 쪽지'; body.textContent = '키위들이 띄워 보낸 쪽지예요';
    foundWear.hidden = true;
  } else if (it.kind === 'shot') {
    // v23.2 크게 보기는 사진마다 주소를 따로 만들고 넘길 때 앞의 것을 버린다 (격자는 표지만 읽어서 수백 장도 가볍게)
    dropViewUrl(); viewUrl = URL.createObjectURL(it.blob); it.url = viewUrl;
    const at = shotSeq.findIndex(s => s.id === it.id);
    if (!it.journey && !it.diary) {
      const fr = document.createElement('div'); fr.className = 'photoFrame';
      const expand = document.createElement('button'); expand.type = 'button'; expand.className = 'photoExpand';
      expand.setAttribute('aria-label', `${it.reason} 일지 전체 화면으로 보기`);
      const im = document.createElement('img'); im.src = it.url; im.alt = `${it.reason} — 집중 일지`; im.className = 'photo';
      const hint = document.createElement('span'); hint.className = 'photoExpandHint'; hint.textContent = '눌러서 크게 보기';
      expand.append(im, hint); expand.addEventListener('click', () => photoViewer.show(it.url, `${it.reason} · ${longDate(it.at)}`)); fr.append(expand);
      if (shotSeq.length > 1 && at >= 0) {
        for (const [dir, label, cls] of [[-1, '이전 쪽', 'prev'], [1, '다음 쪽', 'next']]) {
          const nb = document.createElement('button'); nb.type = 'button'; nb.className = 'shotNav ' + cls; nb.setAttribute('aria-label', label);
          nb.disabled = !shotSeq[at + dir]; nb.addEventListener('click', () => stepShot(dir)); fr.append(nb);
        }
      }
      art.append(fr);
    }
    title.textContent = it.reason; body.textContent = [longDate(it.at), it.min ? `${it.min}분 ${it.nm ? '항해' : '집중'}` : '', it.steps ? `${n0(it.steps)}보` : '', it.nm ? `${it.nm.toFixed(1)}해리` : '', !it.journey && !it.diary && shotSeq.length > 1 && at >= 0 ? `${at + 1} / ${shotSeq.length}` : ''].filter(Boolean).join(' · ');
    if (it.journey || it.diary) {
      body.textContent = longDate(it.at);
      journeyBook = mountJourneyBook(foundEl, art, it, photoViewer);
    }
    foundWear.hidden = false; foundWear.textContent = '일지 저장';
    // v23.1 지우기: 한 번 누르면 "정말?"으로 바뀌고, 3초 안에 한 번 더 누르면 지운다
    const del = document.createElement('button'); del.type = 'button'; del.className = 'shotDel';
    const isJournal = !!(it.journey || it.diary);
    const deleteIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5"/></svg>';
    function resetDelete() { del.classList.remove('armed'); if (isJournal) { del.innerHTML = deleteIcon; del.setAttribute('aria-label', '항해 기록 지우기'); } else del.textContent = '이 일지 지우기'; }
    resetDelete(); let armed = 0;
    del.addEventListener('click', async () => {
      if (!armed) {
        armed = setTimeout(() => { armed = 0; resetDelete(); }, 3000); del.classList.add('armed');
        if (isJournal) { del.setAttribute('aria-label', '한 번 더 누르면 항해 기록을 지워요'); toast('한 번 더 누르면 항해 기록을 지워요', 2600); }
        else del.textContent = '한 번 더 누르면 지워져요';
        return;
      }
      clearTimeout(armed);
      try { await Album.remove(it.id); toast('일지를 지웠어요'); } catch (e) { toast('일지를 지우지 못했어요'); return; }
      shotSeq = shotSeq.filter(s => s.id !== it.id); closeFound(); paintAlbum();
    });
    if (isJournal) foundEl.querySelector('.btns').prepend(del); else art.append(del);
  } else if (it.kind === 'item') {
    // v29.8 모은 것 한 칸: 쓰임 + 바로 가기(만들기 · 손님에게 주기)
    const gi = giftItem(it.key), n = gi.count(), [t, id] = it.key.split(':'), icon = gi.icon(); icon.classList.add('big'); art.append(icon);
    title.textContent = gi.name;
    body.textContent = `${n}개 — ${t === 'f' ? findUse(id) : catchUse(id)}`;
    const recipe = ITEMS.find(x => x.craft?.[id] && !col.owns(x.id));
    foundWear.hidden = !(t === 'f' && recipe); foundWear.textContent = '만들기로';
    // 손님에게 주기: 다녀간 동물 중 선물이 기다리지 않는 동물 (좋아하는 걸 맞혀 둔 동물은 ♥)
    const who = GUEST_IDS.filter(g => guestbook.count[g] && !gifts.waiting[g]);
    if (n > 0 && who.length) {
      const h = document.createElement('p'); h.className = 'giftToH'; h.textContent = '누구에게 줄까요?'; art.append(h);
      const grid = document.createElement('div'); grid.className = 'giftTo'; grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', '선물 받을 손님');
      for (const g of who) {
        const b = document.createElement('button'); b.type = 'button'; b.append(guestPic(g));
        const nm = document.createElement('span'); nm.textContent = GUESTS[g].name + (gifts.knownLikes(g).includes(it.key) ? ' ♥' : ''); b.append(nm);
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => { grid.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', String(o === b))); giftTo = g; foundGift.disabled = false; foundGift.textContent = `${GUESTS[g].name}에게 놓아 두기`; });
        grid.append(b);
      }
      art.append(grid);
      foundGift.hidden = false; foundGift.disabled = true; foundGift.textContent = '손님 고르기';
    } else if (n > 0) { body.textContent += ' · 손님이 다녀가면 답장 선물로 줄 수 있어요'; }
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
    foundWear.hidden = false; foundWear.textContent = mapId === it.map ? '지금 여기' : '항해로 가기';
  } else {
    const im = document.createElement('img'); im.src = 'assets/' + it.img; im.alt = it.name; art.append(im);
    title.textContent = (fresh ? (it.craft ? '새로 만든 ' : '상자 속 ') : '') + it.name; body.textContent = `${it.note} · ${col.count} / ${ITEMS.length} 모음`;
    foundWear.hidden = false; foundWear.textContent = col.wearing(it.id) ? '벗기기' : '입혀 보기';
  }
  foundBack = document.activeElement;
  foundEl.hidden = false; foundEl.querySelector('button:not([hidden])').focus();
}
// ── v29.6 답장 선물 (src/gifts.js): 편지 카드 「답장 선물」 → 주운 것·낚은 것 하나 고르기 → 모래에 놓아 둠 ──
let giftPick = null, giftTo = null;
const showItem = key => showFound({ kind: 'item', key });
function catchUse(id) { const c = CATCH[id]; return c.material ? `걸릴 때마다 섬 짓기에 ${MATERIAL_MIN}분어치 보태져요` : c.bonus ? '해도 안개를 조금 더 걷어요' : `${RARITY[c.r]} · 손님에게 선물할 수 있어요`; }
function giftItem(key) {
  const [t, id] = key.split(':');
  if (t === 'f') return { name: FIND[id]?.name || id, count: () => finds.count(id), icon: () => { const i = document.createElement('i'); i.className = 'find'; const c = FIND[id].cell; i.style.backgroundPosition = `${(c % 4) * 100 / 3}% ${Math.floor(c / 4) * 100 / (FIND_ROWS - 1)}%`; return i; }, give: () => finds.spend({ [id]: 1 }) };
  return { name: CATCH[id]?.ko || id, count: () => extras.catches.count(id), icon: () => extras.catchIcon(id), give: () => extras.catches.give(id) };
}
const giftKeys = () => [...FINDS.map(f => 'f:' + f.id), ...CATCHES.map(c => 'c:' + c.id)].filter(k => giftItem(k).count() > 0);
function paintGiftBtn(gid) {
  const w = gifts.waiting[gid];
  foundGift.hidden = false; foundGift.disabled = !!w;
  foundGift.textContent = w ? `${giftItem(w.key).name} 놓아 둠` : '답장 선물';
  foundGift.setAttribute('aria-label', w ? `${giftItem(w.key).name}${iGa(giftItem(w.key).name)} 모래 위에서 ${GUESTS[gid].name}${giftEul(GUESTS[gid].name).slice(-1)} 기다리는 중` : `${GUESTS[gid].name}에게 답장 선물 고르기`);
}
function openGiftPick(gid) {
  const g = GUESTS[gid], art = foundEl.querySelector('.art'), keys = giftKeys();
  art.textContent = ''; foundWear.hidden = true; giftPick = '';
  document.getElementById('foundTitle').textContent = `${g.name}에게 답장 선물`;
  foundEl.querySelector('.body').textContent = keys.length ? `하나를 모래에 놓아 두면 ${g.name}${iGa(g.name)} 다음에 들러 가져가고 답장을 남겨요. 답례로 섬 가는 길을 알려 줘요 — 좋아하는 걸 맞히면 바로 섬 하나, 아니면 지도 조각(둘이면 섬 하나).` : '아직 줄 것이 없어요 — 물가에서 주운 것이나 항해에서 낚은 것이 생기면 답장할 수 있어요.';
  const grid = document.createElement('div'); grid.className = 'colgrid finds giftGrid'; grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', '줄 것 고르기');
  for (const k of keys) {
    const gi = giftItem(k), b = document.createElement('button'); b.type = 'button'; b.append(gi.icon());
    const n = gi.count(); if (n > 1) { const c = document.createElement('span'); c.className = 'cnt'; c.textContent = n; b.append(c); }
    b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', `${gi.name} ${n}개`); b.title = gi.name;
    b.addEventListener('click', () => {
      grid.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      giftPick = k; foundGift.disabled = false; foundGift.textContent = `${gi.name} 놓아 두기`;
    });
    grid.append(b);
  }
  art.append(grid);
  foundGift.disabled = true; foundGift.textContent = keys.length ? '하나 고르기' : '답장 선물';
}
foundGift.addEventListener('click', () => {
  if (foundItem?.kind === 'item') {   // v29.8 모은 것 카드에서 바로 주기
    const g = giftTo, gi = giftItem(foundItem.key); if (!g || gifts.waiting[g]) return;
    if (!gi.give()) { toast('그건 이제 바구니에 없어요'); return; }
    gifts.put(g, foundItem.key);
    toast(`모래 위에 ${giftEul(gi.name)} 놓아 뒀어요 — ${GUESTS[g].name}${iGa(GUESTS[g].name)} 다음에 오면 가져가요`, 3200);
    sound.found(W / 2); paintCollection(); closeFound(); return;
  }
  const gid = foundItem?.id; if (foundItem?.kind !== 'guest' || !gid) return;
  if (giftPick === null) { openGiftPick(gid); return; }
  if (!giftPick || gifts.waiting[gid]) return;
  const gi = giftItem(giftPick);
  if (!gi.give()) { toast('그건 이제 바구니에 없어요'); return; }
  gifts.put(gid, giftPick);
  const g = GUESTS[gid];
  toast(`모래 위에 ${giftEul(gi.name)} 놓아 뒀어요 — ${g.name}${iGa(g.name)} 다음에 오면 가져가요`, 3200);
  sound.found(W / 2); paintCollection(); closeFound();
});
function setWear(id, on) {
  col.setWear(id, on);
  if (on) { const free = kiwis.filter(k => !k.gone && k.skin !== id); free.slice(0, Math.max(1, Math.ceil(free.length / 3))).forEach(k => { k.skin = id; k.startle(); }); }
  else kiwis.forEach(k => { if (k.skin === id) k.skin = pickSkin(); });
  paintCollection();
}
foundWear.addEventListener('click', () => {
  if (foundItem?.kind === 'item') { closeFound(); shell.openWard(true, { mode: 'dress', tab: 'kiwi' }); setTimeout(() => document.getElementById('craftTitle')?.scrollIntoView({ block: 'start' }), 60); return; }
  if (foundItem?.kind === 'guest') { const read = Math.min(guestbook.read[foundItem.id] || 0, GUESTS[foundItem.id].letters.length); showFound({ ...foundItem, n: (foundItem.n + 1) % Math.max(1, read) }); return; }
  if (foundItem?.kind === 'shot') { const a = document.createElement('a'); a.href = foundItem.url; a.download = 'kiwi-focus_' + shotNames([foundItem])[0]; document.body.append(a); a.click(); a.remove(); return; }
  if (foundItem?.kind === 'map') { if (foundItem.map !== mapId) planVoyage(foundItem.map); }
  else if (foundItem?.kind === 'sound') { const g = foundItem.group, on = curPack(g) === foundItem.pack; unlock(); setPack(g, on ? PACK_BASE[g][0].pack : foundItem.pack); toast(on ? `${foundItem.name} 끔` : `${foundItem.name} — 소리 창에서 바꿀 수 있어요`, 2200); paintCollection(); }
  else if (foundItem) setWear(foundItem.id, !col.wearing(foundItem.id));
  foundEl.hidden = true;
});
let foundBack = null;
function closeFound() { journeyBook?.destroy(); journeyBook = null; foundEl.querySelector('.btns .shotDel')?.remove(); photoViewer.close(); foundEl.hidden = true; dropViewUrl(); if (foundBack && foundBack.isConnected && foundBack.offsetParent) foundBack.focus(); foundBack = null; }
document.getElementById('foundClose').addEventListener('click', closeFound);
foundEl.addEventListener('click', e => { if (e.target === foundEl) closeFound(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !photoViewer.open && !foundEl.hidden) { closeFound(); e.stopImmediatePropagation(); } }, true);
// ── v13 물가 줍기 ──
function pickUp(d) {
  shore.take(d);
  const fresh = finds.add(d.f.id), u = beach.u;
  const C = d.f.r >= 2 ? ['#fff6c9', '#ffd98a', '#ffffff', '#c9f4ff'] : ['#ffffff', '#fff6dc'];
  for (let i = 0; i < (fresh ? 14 : 7); i++) { const a = Math.random() * 6.28, sp = (40 + Math.random() * 80) * u; sparks.push({ x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50 * u, r: (1.5 + Math.random() * 2) * u, c: C[i % C.length], age: 0, life: 0.6 + Math.random() * 0.4 }); }
  sound.pick(d.x, fresh, d.f.r >= 2);   // v18.7 줍기 녹음 (희귀 = 드러남)
  const n = finds.count(d.f.id);
  const ready = ITEMS.find(it => it.craft && !col.has(it.id) && it.craft[d.f.id] === n && finds.enough(it.craft));
  if (ready) toast(`${d.f.name} ×${n} — ${ready.name}${eulReul(ready.name)} 만들 수 있어요 (메뉴 › 꾸미기 › 만들기)`, 3200);
  else toast(fresh ? `새로 주웠어요 · ${d.f.name} (${RARITY[d.f.r]}) · 주운 것 ${finds.kinds} / ${FINDS.length}` : `${d.f.name} ×${n}`, fresh ? 2600 : 1300);
  if (collShown()) paintCollection();
}
// 걸음이 쌓여 장소가 열리면 한 번 알린다
let openMaps = null;
function checkMapSteps() {
  const now = MAP_IDS.filter(id => mapOpen(id));
  if (!openMaps) { openMaps = new Set(now); return; }
  for (const id of now) if (!openMaps.has(id)) { openMaps.add(id); toast(`${MAPS[id].name}까지 걸어왔어요 — 설정에서 갈 수 있어요`, 3200); paintModeMenu(); }
}
// v28.21 드문 순간 — 섬을 오래 보고 있으면 아주 가끔 (src/moments.js), 본 것은 바구니 › 도감에서 다시
const moments = new Moments(() => saved('moments'), v => save('moments', v));
function showMoment(m, fresh = true) {
  cutscene.play('moment', { file: 'moment-' + m.id, caption: `${m.ko} — ${m.sub}`, rate: 1, maxMs: m.maxMs ?? 10600 });
  if (fresh) { moments.mark(m.id); setTimeout(() => toast('드문 순간을 봤어요 · 바구니 › 모은 것에서 다시 볼 수 있어요', 3200), 9000); }
}
function momentTick(dt) {
  if (q.has('moment')) { if (!momentTick.forced && beach.t > 3 && MOMENT[q.get('moment')]) { momentTick.forced = true; showMoment(MOMENT[q.get('moment')]); } return; }
  const busy = document.hidden || voyage.active || !cutscene.root.hidden || [foundEl, settings, menu, focusPanel, document.getElementById('basket'), document.getElementById('wardrobe'), document.getElementById('chartView')].some(el => el && !el.hidden);
  const ctx = { hour: lightShown ?? realHour(), weather: atmos.weather, map: mapId, night: atmos.night, kiwis: kiwis.filter(k => !k.gone).length, rainbow: !!atmos.rainbow?.on, season: season.id };
  const m = moments.tick(dt, ctx, busy); if (m) showMoment(m);
}
function paintMoments() {
  const g = document.getElementById('momentGrid'); if (!g) return;
  g.textContent = '';
  for (const m of MOMENTS) {
    const n = moments.seen[m.id] || 0, open = n || UNLOCK_ALL;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'place';
    if (open) {
      const im = document.createElement('img'); im.src = `assets/moment-${m.id}.webp?v=v29.25.1-44a30f8`; im.alt = '';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = m.ko + (n > 1 ? ` · ${n}번` : '');
      b.append(im, nm); b.setAttribute('aria-label', `${m.ko} 다시 보기`);
      b.addEventListener('click', () => { openSettings(false); showMoment(m, false); });
    } else { b.className = 'place locked'; b.textContent = '?'; b.disabled = true; b.setAttribute('aria-label', '아직 못 본 드문 순간'); }
    g.append(b);
  }
  document.getElementById('momentTitle').textContent = `드문 순간 ${moments.kinds} / ${MOMENTS.length}`;
}
// v29.5 주운 것의 쓰임: 옷 재료면 무엇에 몇 개 드는지, 아니면 드물기
function findUse(id) {
  const uses = ITEMS.filter(it => it.craft?.[id]).map(it => `「${it.name}」 재료 ${it.craft[id]}개${col.owns(it.id) ? '(만듦)' : ''}`);
  return uses.length ? uses.join(' · ') + ' · 꾸미기 › 만들기' : `${RARITY[FIND[id].r]} · 손님에게 선물할 수 있어요`;
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
      sp.style.backgroundPosition = `${(f.cell % 4) * 100 / 3}% ${Math.floor(f.cell / 4) * 100 / (FIND_ROWS - 1)}%`;   // v28.20 4열 × 8줄
      b.append(sp);
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = f.name; b.append(nm);
      b.append(itemChip(n, ITEMS.some(it => it.craft?.[f.id]) ? '옷' : '', n > 0));   // v29.19 칸 아래 칩 (손님 칸과 같은 모양)
      b.classList.toggle('used', n === 0 && !UNLOCK_ALL);
      b.classList.toggle('rare', f.r >= 2);
      b.setAttribute('aria-label', `${f.name} · ${RARITY[f.r]} · ${n}개`); b.title = `${f.name} · ${RARITY[f.r]}`;
      b.addEventListener('click', () => showItem('f:' + f.id));
    }
    grid.append(b);
  }
}
// ── v19 나의 키위 무리 (모은 것 맨 위) ──
function wearOptions(sel, cur) {
  sel.textContent = '';
  const add = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; o.selected = v === cur; sel.append(o); };
  add('auto', '입혀 둔 옷 중 아무거나'); add('none', '맨몸');
  for (const it of ITEMS) if (it.kind === 'wear' && col.owns(it.id)) add(it.id, it.name);
  if (![...sel.options].some(o => o.selected)) sel.value = 'auto';
}
function paintFlock() {
  document.getElementById('flockTitle').textContent = `내 키위 ${flock.size}마리`;
  const list = document.getElementById('flockList'); list.textContent = '';
  for (const m of flock.members.slice().reverse()) {   // 새로 들어온 키위가 위에
    const row = document.createElement('div'); row.className = 'mate';
    const im = document.createElement('img'); im.alt = '';
    im.src = m.wear !== 'auto' && m.wear !== 'none' && ITEM[m.wear] ? 'assets/' + ITEM[m.wear].img : 'assets/kiwi.webp?v=v29.25.1-44a30f8';
    const nm = document.createElement('input'); nm.type = 'text'; nm.value = m.name; nm.maxLength = 8; nm.setAttribute('aria-label', `${m.name} 이름 바꾸기`);
    nm.addEventListener('input', e => { if (!e.isComposing) flock.rename(m.id, nm.value); });
    nm.addEventListener('change', () => { flock.rename(m.id, nm.value); nm.value = m.name; });
    const dd = document.createElement('span'); dd.className = 'days'; dd.textContent = `함께한 지 ${flock.daysWith(m)}일 · ${temperName(m.p)}`;   // v29.12 「N일째」만으론 뜻이 안 보였다
    const sel = document.createElement('select'); sel.setAttribute('aria-label', `${m.name} 옷`); wearOptions(sel, m.wear);
    sel.addEventListener('change', () => {
      flock.setWear(m.id, sel.value);
      for (const k of kiwis) if (k.member === m.id) { k.skin = skinOf(m); k.hop(1); k.tagUntil = beach.t + 2.5; }
      paintFlock();
    });
    row.append(im, nm, dd, sel); list.append(row);
  }
}
// ── v19 다녀간 손님 (방명록) ──
// 손님 칸 귀퉁이 표시: 작은 선 아이콘 + 숫자 (아이콘 = Lucide mail · gift, ISC 라이선스)
const ICON_MAIL = '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>';
const ICON_GIFT = '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>';
// v29.19 모은 것 칸 아래 칩: ×개수 · 쓰임(옷 = 키위 옷 재료 · 섬 = 섬 짓기 · 해도 = 안개 걷기) · 선물 아이콘
//  예전엔 귀퉁이 점·숫자·선물 표시가 무엇인지 알 수 없었다 (사용자) → 손님 칸처럼 아래 칩 하나에 글자로
function itemChip(n, use, gift) {
  const meta = document.createElement('span'); meta.className = 'meta';
  const chip = document.createElement('span'); chip.className = 'chip' + (n ? '' : ' empty');
  const cnt = document.createElement('span'); cnt.className = 'bit'; cnt.textContent = '×' + n; chip.append(cnt);
  if (use) { const u = document.createElement('span'); u.className = 'bit use'; u.textContent = use; chip.append(u); }
  if (gift) { const g = document.createElement('span'); g.className = 'bit'; g.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON_GIFT}</svg>`; chip.append(g); }
  meta.append(chip); return meta;
}
function badgeBit(icon, n) { const c = document.createElement('span'); c.className = 'bit'; c.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>`; c.append(String(n)); return c; }
function paintGuests() {
  const grid = document.getElementById('guestGrid');
  document.getElementById('guestTitle').textContent = `손님 편지 ${guestbook.lettersRead} / ${LETTER_TOTAL} · 다녀간 동물 ${guestbook.kinds} / ${GUEST_IDS.length}`;
  grid.textContent = '';
  for (const id of GUEST_IDS) {
    const g = GUESTS[id], n = guestbook.count[id] || 0, where = g.maps.filter(k => MAPS[k]).map(k => MAPS[k].name).join('·');   // 아직 안 붙인 장소(벚꽃 강변·오아시스)는 건너뛴다
    const b = document.createElement('button'); b.type = 'button';
    if (!(n || UNLOCK_ALL)) { b.className = 'locked'; b.textContent = '?'; b.setAttribute('aria-label', `아직 안 온 손님 · ${where}`); b.title = where; b.addEventListener('click', () => toast(`? · ${where}에 사는 동물`, 2200)); }
    else {
      const read = Math.min(guestbook.read[id] || 0, g.letters.length);
      b.className = 'guest'; b.append(guestPic(id));
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = g.name; b.append(nm);
      // v29.16 그림 / 이름 / 편지·선물 칩 하나 — 귀퉁이 표시가 얼굴을 가리던 것
      const gv = gifts.count(id), meta = document.createElement('span'); meta.className = 'meta';
      // 아직 편지도 선물도 없으면 같은 자리에 흐린 칩(편지 0) — 칸마다 높이·무게가 같게
      const chip = document.createElement('span'); chip.className = 'chip' + (read || gv ? '' : ' empty');
      chip.append(badgeBit(ICON_MAIL, read));
      if (gv) chip.append(badgeBit(ICON_GIFT, gv));
      meta.append(chip);
      b.append(meta);
      b.classList.toggle('waiting', !!gifts.waiting[id]);
      const tx = `${g.name} · ${where} · ${n}번 다녀감 · 편지 ${read} / ${g.letters.length}` + (gifts.count(id) ? ` · 준 선물 ${gifts.count(id)}` : '') + (gifts.waiting[id] ? ' · 선물이 기다리는 중' : '');
      b.setAttribute('aria-label', tx + (read ? ' · 눌러서 읽기' : '')); b.title = tx;
      b.addEventListener('click', () => { if (read) showFound({ kind: 'guest', id, n: read - 1 }); else toast(tx, 2000); });
    }
    grid.append(b);
  }
}
// 돌아왔다: 비운 사이 다녀간 손님 발자국 + 오늘 처음이면 새 무리 키위. boot = 새로 연 것 (첫 글을 인사로 바꾼다)
// 손님이 다녀간다: 발자국 + (안 읽은 편지가 있으면) 지나간 길 물가 쪽 마른 모래에 쪽지
function arrive(ids) {
  const came = [], thanked = [], opened = [];
  let notes = 0;
  for (const id of ids) {
    const pts = leaveTracks(beach, id, world.foot);
    if (pts.length <= 4) continue;
    guestbook.add(id, today()); came.push(GUESTS[id].name);
    const p = pts[Math.floor(pts.length * (0.35 + Math.random() * 0.3))], top = beach.grass(p.x), bot = beach.shoreAt(p.x);
    const rx = p.x / W, ry = clamp((p.y - top) / Math.max(1, bot - top), 0.74, 0.86);
    if (guestbook.leave(id, rx, ry)) notes++;
    // v29.6 놓아 둔 답장 선물을 가져가고 고맙다는 쪽지를 조금 옆에 남긴다
    const got = gifts.collect(id);
    if (got) {
      // v29.9 답례: 좋아하는 것 → 섬 하나 열림 · 보통 → 지도 조각(둘이면 섬 하나)
      const locked = Object.keys(MAPS).filter(k => MAPS[k].unlock && !col.has(MAPS[k].unlock) && !(MAPS[k].steps > 0 && focus.total >= MAPS[k].steps))   // 테스트 기간(모두 열림)에도 실제 진행 기준.sort((a, b) => (MAPS[a].steps || 0) - (MAPS[b].steps || 0));
      const rw = gifts.reward(got.liked, locked, GUESTS[id].maps);
      if (rw.island) { col.add(MAPS[rw.island].unlock); opened.push([GUESTS[id].name, MAPS[rw.island].name]); }
      got.reward = { island: rw.island ? MAPS[rw.island].name : null, scrap: rw.scrap, left: gifts.scraps };
      guestbook.thank(id, got, clamp(rx + (rx > 0.5 ? -0.06 : 0.06), 0.05, 0.95), ry); notes++; thanked.push(GUESTS[id].name);
    }
  }
  if (came.length && collShown()) paintCollection();
  // v27.2 손님이 다녀가면 남은 키위들이 하나둘 두리번거린다
  if (came.length) for (const k of kiwis) if (!k.gone && !k.job) k.later('lookaround', 0.6 + Math.random() * 2);
  if (thanked.length) setTimeout(() => toast(`${[...new Set(thanked)].join('·')}${iGa(thanked.at(-1))} 답장 선물을 가져가고 고맙다는 쪽지를 남겼어요`, 3400), 5200);
  if (opened.length) { paintModeMenu(); opened.forEach(([who, isle], i) => setTimeout(() => toast(`${who}${iGa(who)} 답례로 「${isle}」 가는 길을 알려 줬어요 — 해도에서 열렸어요${UNLOCK_ALL ? ' (테스트 기간엔 원래 다 열려 있어요)' : ''}`, 3800), 9000 + i * 4000)); }
  return { came, notes };
}
function welcome(awayMin, boot) {
  const fresh = flock.visit();
  if (fresh) newbie = fresh;
  const { came, notes } = arrive(plate ? guestsFor(guestCount(awayMin, TUNE)) : []);
  const names = [...new Set(came)];
  const msgs = [];
  if (names.length) msgs.push([`자리를 비운 사이 ${names.join('·')}${came.length > names.length ? ' 무리' : ''}가 다녀갔어요 — ${notes ? '편지를 두고 갔어요' : '모래를 보세요'}`, 3400]);
  if (fresh) msgs.push([flock.size === 1 ? `첫 키위 「${fresh.name}」 · ${temperName(fresh.p)}예요 — 메뉴 › 꾸미기에서 이름을 바꿀 수 있어요` : `새 키위 「${fresh.name}」 · ${temperName(fresh.p)}가 무리에 들어왔어요 · ${flock.size}마리`, 3400]);
  msgs.forEach(([t, ms], i) => setTimeout(() => toast(t, ms), 1200 + i * 3800));
  if (collShown()) paintCollection();
  // 인사: 새로 연 직접 쓰기 화면의 첫 글 (주소 ?text= 가 있으면 그대로)
  if (!boot || q.get('text')) return null;
  if (fresh && flock.size > 1) return `안녕 ${fresh.name}`;
  if (awayMin >= 2 * 1440) return '보고 싶었어';
  if (awayMin >= 180) { const h = Math.floor(realHour()); return h >= 5 && h < 11 ? '좋은 아침' : h >= 21 || h < 5 ? '편히 쉬어요' : '어서 와'; }
  return null;
}
// ── v19.2 테스트 탭 ──
const saveTune = () => save('tune', JSON.stringify(TUNE));
function paintTune() {
  const P = document.getElementById('tunePane'); if (!P) return;
  const $ = id => document.getElementById(id);
  $('tAway').value = TUNE.awayMin; $('tAwayV').textContent = TUNE.awayMin ? `${TUNE.awayMin}분 넘게` : '다시 열 때마다';
  $('tAuto').value = TUNE.auto; $('tGuestN').value = TUNE.guestN; $('tDrift').value = TUNE.drift; $('tFind').value = TUNE.find;
  $('tSpeed').value = SPEED; $('tSpeedV').textContent = `${SPEED}배`; $('tDim').checked = TUNE.dim;
  $('tNoteP').value = TUNE.noteP; $('tNoteId').checked = TUNE.noteId; $('tNoteSpoil').checked = TUNE.noteSpoil;
  paintNoteSpoil($('tNoteAll'));
  for (const c of P.querySelectorAll('input[name="tAct"]')) c.checked = TUNE.acts.includes(c.value);
  $('tActLoop').setAttribute('aria-pressed', TUNE.actLoop);
  $('tSleep').value = SLEEP_AFTER; $('tSleepV').textContent = `${SLEEP_AFTER}초`; $('tOrbit').value = TUNE.orbit;
}
function tuneInput(e) {
  const t = e.target, v = Number(t.value);
  if (t.id === 'tAway') TUNE.awayMin = v;
  else if (t.id === 'tAuto') { TUNE.auto = v; autoGuestAt = Date.now(); }
  else if (t.id === 'tGuestN') TUNE.guestN = v;
  else if (t.id === 'tDrift') { TUNE.drift = drifters.gap = v; drifters.nextAt = Math.min(drifters.nextAt, beach.t + v); }
  else if (t.id === 'tFind') { TUNE.find = shore.gap = v; shore.nextAt = Math.min(shore.nextAt, beach.t + v); }
  else if (t.id === 'tSpeed') { TUNE.speed = SPEED = v; sizeFor(S); }
  else if (t.id === 'tDim') TUNE.dim = t.checked;
  else if (t.id === 'tNoteP') TUNE.noteP = t.value;
  else if (t.id === 'tNoteId') TUNE.noteId = t.checked;
  else if (t.id === 'tNoteSpoil') TUNE.noteSpoil = t.checked;
  else if (t.id === 'tSleep') { TUNE.sleep = SLEEP_AFTER = v; activeAt = Date.now(); }
  else if (t.id === 'tOrbit') TUNE.orbit = v;
  else if (t.name === 'tAct') { if (e.type !== 'change') return; TUNE.acts = [...t.closest('#tActs').querySelectorAll('input:checked')].map(c => c.value); applyActs(); }
  else return;
  saveTune(); paintTune();
}
// v29.25 쪽지 전체 목록 — 기본은 가림 (테스트하는 사람도 실제 사용자처럼 하나씩 받아 보게). 「전체 목록 열기」를 켜야만 보인다
function paintNoteSpoil(box) {
  box.textContent = ''; box.hidden = !TUNE.noteSpoil;
  if (!TUNE.noteSpoil) return;
  for (const t of TEMPERS) {
    const h = document.createElement('h3'); h.className = 'k-label'; h.textContent = `${t.name} — ${t.hint}`; box.append(h);
    for (const c of CHEERS.filter(x => x.p === t.id)) {
      const row = document.createElement('p'); row.className = 'k-hint';
      row.textContent = `[${c.id}]${c.tag ? ` (${c.tag})` : ''}${c.by ? ` 〈${c.by}〉` : ''} ${c.t}${bottles.seen.includes(c.id) ? ' ✓' : ''}`;
      box.append(row);
    }
  }
}
// v27.4 동작 테스트: 고른 동작을 지금 나눠 시키기 · 고른 것만 되풀이 · 빈도
function applyActs() { const loop = TEST && TUNE.actLoop; setActRate(loop ? 0.9 : LIVELY[lively]); setIdleScale(loop ? 0.6 : LIVELY_IDLE[lively]); setActOnly(loop ? TUNE.acts : null); }
function actNow() {
  const ids = TUNE.acts.filter(id => ACTS[id]);
  if (!ids.length) { toast('먼저 볼 동작을 골라요'); return; }
  const free = kiwis.filter(k => !k.gone && !k.job && !k.focus && !stiffSkin(k.skin) && ['idle', 'free', 'wander', 'act'].includes(k.state));
  const dressed = kiwis.filter(k => !k.gone && stiffSkin(k.skin)).length;
  if (!free.length) { toast(dressed ? '쉬는 키위가 옷을 입고 있어요 — 목도리·스웨터처럼 몸을 감싸는 옷을 입으면 아직 동작하지 않아요' : '쉬는 키위가 없어요 — 글씨를 다 쓴 뒤 다시 눌러 보세요', 2600); return; }
  openSettings(false);
  free.forEach((k, i) => { const id = ids[i % ids.length]; k.v = 0; setTimeout(() => { if (!k.job && !k.gone) { if (k.state === 'act') k.state = 'idle'; k.act(id, true); } }, i * 350); });
  toast(`${ids.length > free.length ? `${free.length}마리에게 ${free.length}개` : `${free.length}마리에게 ${ids.length}개`} — ${ids.slice(0, free.length).map(id => ACT_NAME[id] || id).join(' · ')}${dressed ? ` (옷 입은 ${dressed}마리 빼고)` : ''}`, 2600);
}
// v27.5 동작 장면 시험: 진짜 사건을 일으켜 키위 반응을 본다 (섬) · 항해에서 사건을 골라 배 위 키위 동작을 본다
function sceneAct(a) {
  const on = kiwis.filter(k => !k.gone);
  if (a.startsWith('voy:')) {
    if (!voyage.active) { toast('먼저 「항해 시험 시작」으로 바다에 나가요'); return true; }
    openSettings(false); voyScene.show(a.slice(4)); return true;
  }
  if (a.startsWith('life:')) {   // v28.23 바다 생물 시험
    if (!voyage.active) { toast('먼저 「항해 시험 시작」으로 바다에 나가요'); return true; }
    if (!voyScene.life) { toast('바다 생물이 꺼져 있어요 (그리다 오류)'); return true; }
    openSettings(false); voyScene.life.show(a.slice(5)); return true;
  }
  if (a === 'voyClear') { if (!voyage.active && !voyage.paused) { toast('지울 항해가 없어요'); return true; } quitVoyage('테스트: 항해를 지웠어요'); return true; }
  if (a === 'voySail' || a === 'voySail10') {
    if (voyage.active) { toast('이미 항해 중이에요 — 「항해 지우기」 뒤에 다시'); return true; }
    if (voyage.paused) voyage.abandon();   // 테스트 출항은 멈춘 배를 치우고 새로
    if (focus.active) { toast('집중 중이에요 — 「집중 바로 끝내기」 뒤에 다시'); return true; }
    voyage.setMode('voyage'); voyArt(); paintFocus();
    const prev = focus.len; focus.len = a === 'voySail10' ? 10 : 1; openSettings(false); startVoyage(); focus.len = prev; focus.store();
    if (!voyage.active) toast('출항하지 못했어요 — 집중 창에서 멈춘 항해를 확인해 보세요', 2600);
    return true;
  }
  if (!a.startsWith('sc')) return false;
  if (!on.length) { toast('섬에 키위가 없어요 — 글을 써서 불러 보세요'); return true; }
  openSettings(false);
  if (a === 'scMeteor') { const m = atmos.meteors.spawn(beach); starWish(m ? m.x : W / 2); }
  else if (a === 'scTap') on.forEach((k, i) => setTimeout(() => { if (!k.busy && k.state !== 'flee' && !k.gone) k.startle(); }, i * 120));
  else if (a === 'scJoy') on.forEach((k, i) => { k.hop(2, i * 0.07); k.later(i % 3 === 1 ? 'proud' : 'joy', 1 + i * 0.07); });
  else if (a === 'scGuest') { const r = arrive(guestsFor(1)); if (!r.came.length) toast('손님이 지나갈 자리가 없어요 — 다시 눌러 보세요'); }
  else if (a === 'scSleep') on.forEach(k => k.sleep());
  else if (a === 'scWake') on.forEach(k => k.wake(Math.random() * 1.2));
  return true;
}
function tuneAct(a) {
  if (sceneAct(a)) return;
  if (a === 'actAll') { TUNE.acts = Object.keys(ACTS); applyActs(); saveTune(); }
  else if (a === 'actNone') { TUNE.acts = []; applyActs(); saveTune(); }
  else if (a === 'actNow') actNow();
  else if (a === 'actLoop') {
    if (!TUNE.actLoop && !TUNE.acts.length) { toast('먼저 볼 동작을 골라요'); return; }
    TUNE.actLoop = !TUNE.actLoop;
    applyActs(); saveTune(); toast(TUNE.actLoop ? `고른 ${TUNE.acts.length}개만 되풀이해요` : '원래대로 상황 따라 골라요');
  }
  else if (a === 'guestNow') {
    const r = arrive(guestsFor(TUNE.guestN || 1));
    toast(r.came.length ? `${[...new Set(r.came)].join('·')} 다녀감${r.notes ? ` · 쪽지 ${r.notes}개` : ' · 남은 편지 없음'}` : '모래에 자리가 없어 못 왔어요 — 다시 눌러 보세요', 2600);
  } else if (a === 'notesClear') { guestbook.pending = []; guestbook.store(); toast('쪽지를 치웠어요'); }
  else if (a === 'lettersReset') { guestbook.read = {}; guestbook.pending = []; guestbook.store(); toast('손님 편지를 처음부터 다시 받아요'); }
  else if (a === 'mateAdd') { flock.last = ''; const f = flock.visit(); if (f) { newbie = f; spawn(); toast(`새 키위 「${f.name}」 · ${temperName(f.p)} · ${flock.size}마리`); } else toast('무리가 가득 찼어요 (30마리)'); }
  else if (a === 'flockReset') { flock.members = []; flock.seq = 0; flock.store(); for (const k of kiwis) k.member = null; toast('무리를 비웠어요 — 내일 열면 첫 키위가 와요'); }
  else if (a === 'noteNow') {
    if (drifters.list.length) { toast('이미 물 위에 떠 있어요 — 열고 다시 눌러요'); return; }
    noteAsk = TUNE.noteP || 'any'; bottleAt = 0; focusDoneAt = -1e9; openSettings(false);
    const ok0 = () => { if (!drifters.list.length && noteAsk) { bottleAt = 0; setTimeout(ok0, 400); } };
    setTimeout(ok0, 400); toast('곧 초록 병이 떠내려와요');
  }
  else if (a === 'noteShuffle') { bottles.seen = []; bottles.store(); toast('본 쪽지를 다시 섞었어요'); }
  else if (a === 'driftNow') { if (drifters.list.length) toast('이미 물 위에 떠 있어요'); else { drifters.nextAt = beach.t; toast('곧 떠내려와요'); } }
  else if (a === 'findNow') { shore.nextAt = beach.t; toast('곧 물가에 밀려와요'); }
  else if (a === 'focus1') { if (focus.active) toast('이미 집중 중이에요'); else { const prev = focus.len; focus.len = 1; openSettings(false); startFocus(); focus.len = prev; focus.store(); } }
  else if (a === 'focusDone') { if (focus.active) { openSettings(false); completeFocus(); } else toast('집중 중이 아니에요'); }
  else if (a === 'steps') { focus.total += 1000; focus.todaySteps += 1000; focus.store(); toast(`걸음 ${n0(focus.total)}보`); }
  else if (a === 'defaults') { Object.assign(TUNE, TUNE_DEF); drifters.gap = TUNE.drift; shore.gap = TUNE.find; if (!q.has('speed')) { SPEED = 1; sizeFor(S); } saveTune(); toast('조절값을 기본으로 돌렸어요'); }
  else if (a === 'wipe') {
    if (!confirm('무리 · 손님 방명록 · 편지 · 집중 기록을 지울까요? (모은 아이템·설정은 그대로)')) return;
    flock.members = []; flock.seq = 0; flock.last = ''; flock.store(); for (const k of kiwis) k.member = null;
    Object.assign(guestbook, { count: {}, first: {}, read: {}, pending: [] }); guestbook.store();
    Object.assign(focus, { log: {}, total: 0, todaySteps: 0, done: 0, idle: 0 }); focus.store();
    toast('테스트 기록을 지웠어요');
  }
  paintTune(); paintCollection(); paintFocus();
}
{
  const P = document.getElementById('tunePane');
  if (P) {
    document.getElementById('tActs').innerHTML = Object.keys(ACTS).map(id => `<label><input type="checkbox" name="tAct" value="${id}">${ACT_NAME[id] || id}</label>`).join('');
    P.addEventListener('input', tuneInput); P.addEventListener('change', tuneInput);
    P.addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (b) tuneAct(b.dataset.act); });
    paintTune();
  }
}
// ── v19 벽시계: 시계를 쓰며 화면이 꺼지지 않고, 버튼은 숨고, 밤엔 어둡게 ──
const dimEl = document.getElementById('dim');
// 그림을 다 읽기 전(처음 열 때)에는 모드만 바꿔 둔다 — 첫 프레임이 알아서 쓴다
const quietMode = m => { if (plate) setMode(m, false); else { mode = m; save('mode', m); paintMode(); paintModeMenu(); } };
function setWall(on) {
  wallOn = on; save('wall', on ? '1' : '0');
  document.body.classList.toggle('wall', on);
  const sw = document.getElementById('optWall'); if (sw) sw.checked = on;
  if (on) {
    if (mode !== 'clock') { save('wallPrev', mode); quietMode('clock'); }
    wallAwake.on(); setClean(true);
  } else {
    wallAwake.off(); dimEl.style.opacity = '0';
    const prev = saved('wallPrev'); save('wallPrev', '');
    if (prev && MODES.includes(prev) && mode === 'clock') quietMode(prev);
    setClean(false);
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
  paintAlbum();
  paintFocusStats(); if (albumBy === 'day') paintCal();
  paintFinds();
  paintMoments();
  paintFlock();
  paintGuests();
  paintCraft();
  // 종류별로 나눠 그린다 (v18.6) — 편지·옷·장소·곡·발자국 소리가 한 칸 격자에 섞여 있었다. 소리는 소리 창에서만 고른다
  const of = k => ITEMS.filter(it => it.kind === k), owned = list => list.filter(it => col.owns(it.id)).length;
  const letters = of('letter'), wears = of('wear'), places = of('map');   // 소리 묶음은 바구니 › 장소·소리 (v26)
  document.getElementById('colTitle').textContent = `편지 ${guestbook.lettersRead + owned(letters)}통 · 주운 것 ${finds.kinds}종${UNLOCK_ALL ? ' · 테스트: 모두 열림' : ''}`;
  document.getElementById('letterTitle').textContent = `유리병 편지 ${owned(letters)} / ${letters.length}`;
  document.getElementById('wearTitle').textContent = `옷 ${owned(wears)} / ${wears.length}`;
  const pt = document.getElementById('placeTitle'); if (pt) pt.textContent = `장소 ${owned(places)} / ${places.length}`;
  const locked = () => { const b = document.createElement('button'); b.type = 'button'; b.className = 'locked'; b.textContent = '?'; b.disabled = true; b.setAttribute('aria-label', '아직 못 찾음'); return b; };
  // 편지: 유리병 그림 + 제목 + 첫 구절
  const ll = document.getElementById('letterList'); ll.textContent = '';
  for (const it of letters) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'letter';
    const im = document.createElement('img'); im.src = 'assets/bottle.webp?v=v29.25.1-44a30f8'; im.alt = '';
    const tx = document.createElement('span'); tx.className = 'tx';
    const t = document.createElement('b'), q = document.createElement('span');
    if (col.owns(it.id)) {
      t.textContent = it.title; q.textContent = it.text;
      b.setAttribute('aria-label', it.title + ' 다시 읽기'); b.addEventListener('click', () => showFound(it));
    } else { t.textContent = '아직 못 받은 편지'; q.textContent = '물 위로 유리병이 떠내려오면 눌러 보세요'; b.disabled = true; b.classList.add('locked'); }
    tx.append(t, q); b.append(im, tx); ll.append(b);
  }
  // v29.22 받은 쪽지: 열어 본 초록 병(키위 쪽지)·호박색 병(돌아온 내 글)이 계속 쌓인다 — 새것부터, 30개씩 더 보기
  const nl = document.getElementById('noteList'), all = bottles.inbox;
  document.getElementById('noteTitle').textContent = `받은 쪽지 ${all.length}`;
  // v29.25 성격별 · 키위별로 모아 보기 (칩은 받은 쪽지에 있는 것만)
  const nf = document.getElementById('noteFilter'); nf.textContent = '';
  const cheers = all.filter(n => n.kind === 'cheer');
  const chips = [['all', '전체']];
  for (const t of TEMPERS) if (cheers.some(n => n.p === t.id)) chips.push(['p:' + t.id, t.name]);
  const names = [...new Set(cheers.map(n => n.by).filter(b => b && b !== '키위 일동' && !TEMPERS.some(t => t.name === b)))].slice(0, 12);
  for (const nm of names) chips.push(['n:' + nm, nm]);
  if (!chips.some(([v]) => v === noteFilter)) noteFilter = 'all';
  nf.hidden = chips.length < 3;
  for (const [v, label] of chips) {
    const c = document.createElement('button'); c.type = 'button'; c.textContent = label; c.setAttribute('aria-pressed', v === noteFilter);
    c.addEventListener('click', () => { noteFilter = v; noteShown = 30; paintCollection(); });
    nf.append(c);
  }
  const inbox = noteFilter === 'all' ? all : all.filter(n => n.kind === 'cheer' && (noteFilter.startsWith('p:') ? n.p === noteFilter.slice(2) : n.by === noteFilter.slice(2)));
  nl.textContent = '';
  for (const n of inbox.slice(0, noteShown)) {
    const b = document.createElement('button'); b.type = 'button';
    const im = document.createElement('img'); im.src = n.kind === 'mine' ? 'assets/bottle-mine.webp?v=v29.25.1-44a30f8' : 'assets/bottle-cheer.webp?v=v29.25.1-44a30f8'; im.alt = '';
    const tx = document.createElement('span'); tx.className = 'tx';
    const t = document.createElement('b'), q = document.createElement('span');
    const gd = new Date(n.got), when = n.got ? `${gd.getMonth() + 1}월 ${gd.getDate()}일` : '예전에 받은 쪽지';
    t.textContent = n.kind === 'mine' ? mineTitle(n.at) : `${n.by}${n.p && n.by !== '키위 일동' && n.by !== temperName(n.p) ? ` · ${temperName(n.p)}` : ''} · ${when}`;
    q.textContent = n.text;
    b.setAttribute('aria-label', `${t.textContent} — ${n.text} 다시 읽기`);
    b.addEventListener('click', () => showFound(n.kind === 'mine' ? { kind: 'mine', text: n.text, at: n.at, src: n.src } : { kind: 'cheer', id: n.id, text: n.text, by: n.by, p: n.p }));
    tx.append(t, q); b.append(im, tx); nl.append(b);
  }
  if (inbox.length > noteShown) {
    const more = document.createElement('button'); more.type = 'button'; more.className = 'k-btn'; more.textContent = `${Math.min(30, inbox.length - noteShown)}개 더 보기`;
    more.addEventListener('click', () => { noteShown += 30; paintCollection(); });
    nl.append(more);
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
  const pg = document.getElementById('placeGrid');
  if (pg) { pg.textContent = ''; }
  for (const it of pg ? places : []) {
    if (!col.owns(it.id)) { pg.append(locked()); continue; }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'place';
    const im = document.createElement('img'); im.src = 'assets/' + it.img; im.alt = '';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = it.name;
    b.append(im, nm);
    b.classList.toggle('on', mapId === it.map); b.setAttribute('aria-label', it.name + ' 가 보기');
    b.addEventListener('click', () => { setMap(it.map); paintCollection(); });
    pg.append(b);
  }
  // 배 (v28.9): 바다 위에서 보낸 시간만큼 하나씩 열리고, 눌러서 바꿔 탄다
  const bg = document.getElementById('boatGrid'), hrs = voyage.sailedMs / 3600000;
  if (bg) {
    bg.textContent = ''; let opened = 0;
    for (const bt of BOATS) {
      const open = UNLOCK_ALL || hrs >= bt.hours; if (open) opened++;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'place';
      const im = document.createElement('img'); im.src = 'assets/' + (bt.id === 'dinghy' ? 'voyage-boat.webp?v=v29.25.1-44a30f8' : 'boat-' + bt.id + '.webp?v=v29.25.1-44a30f8'); im.alt = '';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = open ? `${bt.name} · ${bt.seats?.length || 3}` : `항해 ${bt.hours}시간`;
      b.append(im, nm);
      const on = voyScene.boatId === bt.id;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      if (!open) { b.disabled = true; b.classList.add('locked'); b.setAttribute('aria-label', `${bt.name} — 바다 위에서 ${bt.hours}시간을 보내면 열려요`); }
      else { b.setAttribute('aria-label', bt.name + ' 타기'); b.addEventListener('click', () => { voyScene.setBoat(bt.id); save('boat', bt.id); paintCollection(); }); }
      bg.append(b);
    }
    document.getElementById('boatTitle').textContent = `배 ${opened} / ${BOATS.length}`;
  }
  // 돛 (v28.11): 배와 같은 규칙 — 바다 위 시간만큼 열리고 눌러서 바꿔 단다
  const sg = document.getElementById('sailGrid');
  if (sg) {
    sg.textContent = ''; let opened = 0;
    for (const sl of SAILS) {
      const open = UNLOCK_ALL || hrs >= sl.hours; if (open) opened++;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'place';
      const im = document.createElement('img'); im.src = 'assets/' + (sl.id === 'leaf' ? 'voyage-sail.webp?v=v29.25.1-44a30f8' : sl.id === 'none' ? 'voyage-boat.webp?v=v29.25.1-44a30f8' : 'sail-' + sl.id + '.webp?v=v29.25.1-44a30f8'); im.alt = ''; if (sl.id === 'none') im.style.opacity = '0.45';   // 돛 없음 = 빈 배
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = open ? sl.name : `항해 ${sl.hours}시간`;
      b.append(im, nm);
      const on = voyScene.sailId === sl.id;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      if (!open) { b.disabled = true; b.classList.add('locked'); b.setAttribute('aria-label', `${sl.name} — 바다 위에서 ${sl.hours}시간을 보내면 열려요`); }
      else { b.setAttribute('aria-label', sl.name + ' 달기'); b.addEventListener('click', () => { voyScene.setSail(sl.id); save('sail', sl.id); paintCollection(); }); }
      sg.append(b);
    }
    document.getElementById('sailTitle').textContent = `돛 ${opened} / ${SAILS.length}`;
    // v29.15 낚싯줄 드리우기 · 걷기
    document.querySelectorAll('#lineGrid button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.line === 'on') === (voyScene.line !== false))));
  }
}
settings.addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'map') { setMap(t.value); return; }   // 테스트 탭의 「장소 바로 가기」
  if (t.closest('#tunePane')) return;   // 테스트 탭은 따로 (아래 tuneInput)
  if (t.name === 'map') { setMap(t.value); return; }
  if (t.name === 'uitheme') { uiTheme = setUiTheme(t.value); save('ui', uiTheme); return; }
  if (t.name === 'kiwis') { setCrowd(t.value); return; }
  if (t.name === 'lively' && LIVELY[t.value]) { lively = t.value; save('lively', lively); applyActs(); paintCrowd(); return; }
  if (t.id === 'kiwiN') return;
  if (t.id === 'optWall') { setWall(t.checked); return; }
  if (t.name === 'fmt') clockOpt.fmt = t.value;
  if (t.id === 'optSec') clockOpt.sec = t.checked;
  save('clock', JSON.stringify(clockOpt));
  paintModeMenu();
  // 시계라면 바뀐 표기·초 자리에 맞춰 다시 쓴다 (같은 폭이면 바뀐 글자만, 아니면 파도로 지우고)
  if (mode === 'clock') { lastClock = null; submit(...nextAuto(nowHour())); }
});
document.addEventListener('pointerdown', e => { if (!settings.hidden && !onTop(e.target) && !settings.contains(e.target) && !setBtn.contains(e.target)) openSettings(false); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && foundEl.hidden && !settings.hidden) { openSettings(false); menuBtn.focus(); } });
paintMode(); paintModeMenu();
document.getElementById('optWall').checked = wallOn;

// ── 화면 정리 (v18.5): 버튼·입력창·창·알림을 숨기고 그림만 ──
//  다시 보이기 버튼은 숨어 있다가 화면을 누르거나 마우스를 움직이면 3초 동안 오른쪽 위에 희미하게 뜬다(v26.2: 정리 직후에도 3초 뒤 사라짐).
//  Esc 로 끈다(v26 부터 H 키 단축키는 없다 — 손가락 앱). 저장하지 않는다(다음에 열면 보통 화면) — 주소 ?ui=0 이면 정리된 채로 시작
const hideBtn = document.getElementById('hideBtn');
let peekTimer = 0;
function peek() {
  if (!document.body.classList.contains('clean')) return;
  document.body.classList.add('peek');
  clearTimeout(peekTimer);
  peekTimer = setTimeout(() => document.body.classList.remove('peek'), 3000);
}
function setClean(on) {
  document.body.classList.toggle('clean', on);
  hideBtn.setAttribute('aria-pressed', String(on));
  hideBtn.setAttribute('aria-label', on ? '버튼·입력창 다시 보이기' : '화면 정리 — 버튼·입력창 숨기기');
  if (on) {
    openSettings(false); shell?.closeAll(); openFocusPanel(false); openInfo(false); if (!menu.hidden) openMenu(false);
    if (document.activeElement && document.activeElement !== hideBtn) document.activeElement.blur();
    peek();
  } else { document.body.classList.remove('peek'); clearTimeout(peekTimer); }
}
hideBtn.addEventListener('click', () => setClean(!document.body.classList.contains('clean')));
window.addEventListener('pointerdown', peek, true);
window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') peek(); });
window.addEventListener('keydown', e => {
  if (e.target.matches && e.target.matches('input[type="text"], textarea')) return;
  if (e.key === 'Escape' && document.body.classList.contains('clean')) setClean(false);
  else peek();
});
if (q.get('ui') === '0') setClean(true);
if (wallOn) setWall(true);
{ const st = focus.resolveStale(); paintFocus(); if (st) setTimeout(() => toast(`지난 집중은 화면을 떠나서 멈췄어요 · ${n0(st.steps)}보`, 3200), 1500); }
// v28 해도 · 낚싯줄 · 섬 짓기 (src/voyage-extras.js) — mapOpen 등이 다 준비된 뒤에
var extras = mountExtras({ showItem: k => showItem(k), itemChip: (n, use, gift) => itemChip(n, use, gift), saved: k => saved(k), save, voyage, voyScene, mapOpen, mapId: () => mapId, places: PLACES, placeName: id => PLACES[id]?.ko || id, toast, unlockAll: UNLOCK_ALL, closeFocus: () => openFocusPanel(false),
  planVoyage: id => planVoyage(id), openChart: () => shell?.openChart(true), here: () => mapId,
  lockText: id => { const m = MAPS[id]; if (!m) return ''; return m.steps ? `걸음 ${n0(m.steps)}보면 열려요 · 지금 ${n0(focus.total)}보` : '떠내려오는 상자를 열면 열려요'; } });
{ const v = voyage.reopen(); if (v === 'sailing') { enterSea(); applyHush(); awake.on(); paintFocus(); } else if (v === 'arrived') setTimeout(arriveVoyage, 2500); }
const paintWeather = () => { weatherBtn.dataset.weather = atmos.weather; weatherBtn.setAttribute('aria-label', `날씨: ${WEATHER_NAME[atmos.weather]} (고르기)`); };
function pickWeather(w) { atmos.setWeather(w); save('weather', atmos.weather); paintWeather(); toast(WEATHER_NAME[atmos.weather]); }
weatherBtn.addEventListener('click', () => openPicker(weatherBtn, '날씨', WEATHERS.map(w => ({ id: w, name: WEATHER_NAME[w], g: 'w-' + w })), atmos.weather, w => { if (w !== atmos.weather) pickWeather(w); }));

// ── 메뉴 (v22): 자주 안 쓰는 것(설정 · 모은 것 · 화면 정리 · 작품 설명)은 ⋯ 안으로 — 위 버튼 줄은 8개 → 6개(풍경 3개 묶음 + 소리 · 집중 · 메뉴) ──
function openMenu(open, back = false) {
  if (open === !menu.hidden) return;
  if (open) { closePicker(); openSettings(false); openFocusPanel(false); shell?.closeAll(); }
  menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open));
  if (open) menu.querySelector('button').focus(); else if (back) menuBtn.focus();
}
menuBtn.addEventListener('click', () => openMenu(menu.hidden));
// 메뉴 항목은 누르면 메뉴를 닫고 제 일을 한다 (설정·작품 설명 버튼의 원래 동작은 그대로 — 닫는 건 먼저, 붙잡는 단계에서)
menu.addEventListener('click', e => { if (e.target.closest('button')) openMenu(false); }, true);
document.getElementById('cleanBtn').addEventListener('click', () => setClean(true));
// v29.24 설정 › 풍경 › 파도: 지금처럼 · 잔잔하게 (기억)
{ const pick = saved('wave') === 'gentle' ? 'gentle' : 'quick'; beach.setWave(pick);
  for (const r of document.querySelectorAll('input[name="wave"]')) { r.checked = r.value === pick; r.addEventListener('change', () => { if (!r.checked) return; beach.setWave(r.value); save('wave', r.value); toast(r.value === 'gentle' ? '파도: 잔잔하게' : '파도: 지금처럼'); }); } }
// v29.23 가만히 두면 화면 정리: 10초 동안 아무것도 안 누르면 버튼·창·입력창을 숨긴다 (사용자 — 설정까지 가서 눌러야 했다). 설정 › 화면에서 끌 수 있다
const AUTO_CLEAN = q.has('autoclean') ? num('autoclean', 10) : 10;
let autoClean = saved('autoCleanOff') !== '1';
{ const cb = document.getElementById('optAutoClean'); cb.checked = autoClean; cb.addEventListener('change', () => { autoClean = cb.checked; save('autoCleanOff', autoClean ? '0' : '1'); activeAt = Date.now(); }); }
// 글 쓰는 중 · 숨 고르기 · 카드/사진 크게 보기/장면 영상을 보는 중엔 하지 않는다
const autoCleanOk = () => autoClean && !breath && !document.body.classList.contains('clean') && !document.body.classList.contains('typing')
  && !document.activeElement?.matches?.('input, textarea, select') && !document.querySelector('#found:not([hidden]), #photoViewer[open], #cutscene:not([hidden])');
document.addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) openMenu(false); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) openMenu(false, true); });
menu.addEventListener('keydown', e => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const bs = [...menu.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
  bs[(i + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus(); e.preventDefault();
});

// ── 고르기 창 (v18.6.2): 버튼 바로 아래에 뜨고, 고르면 닫힌다. 같은 버튼을 다시 누르거나 바깥을 누르면 닫힘 ──
const picker = document.getElementById('picker');
const RAIL = '(orientation: landscape) and (max-height: 520px)';   // v24.3 가로 모드 레일 (style.css 와 같은 조건)
let pickerFor = null;
function closePicker(back = false) {
  if (picker.hidden) return;
  picker.hidden = true;
  if (pickerFor) { pickerFor.setAttribute('aria-expanded', 'false'); if (back) pickerFor.focus(); }
  pickerFor = null;
}
function openPicker(btn, title, opts, cur, onPick) {
  if (pickerFor === btn) { closePicker(); return; }
  closePicker(); openMenu(false);
  openSettings(false); shell?.closeAll(); openFocusPanel(false);
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
      if (o.g) { c.querySelectorAll(':scope > g[class]').forEach(g => { if (!g.classList.contains(o.g)) g.remove(); else g.style.display = 'inline'; }); c.dataset.ico = o.g; }   // v24.4 종이 아이콘이 이 이름으로 그림을 고른다 (:has 없이)
      b.append(c);
    }
    const t = document.createElement('span'); t.textContent = o.name; b.append(t);
    b.addEventListener('click', () => { onPick(o.id); closePicker(true); });
    grid.append(b);
  }
  // 버튼 아래, 화면 안쪽으로 — v24.3 가로로 든 폰(버튼이 오른쪽 세로 레일)이면 버튼 왼쪽 옆으로 (style.css 같은 조건)
  const r = btn.getBoundingClientRect();
  picker.hidden = false;
  const side = matchMedia(RAIL).matches;
  picker.classList.toggle('side', side);
  const w = picker.offsetWidth;
  if (side) {
    const h = picker.offsetHeight, top = clamp(r.top + r.height / 2 - h / 2, 10, innerHeight - h - 10);
    picker.style.left = Math.max(10, r.left - w - 12) + 'px'; picker.style.top = top + 'px';
    picker.style.setProperty('--arrow', (r.top + r.height / 2 - top) + 'px');
  } else {
    const left = clamp(r.left + r.width / 2 - w / 2, 10, innerWidth - w - 10);
    picker.style.left = left + 'px'; picker.style.top = (r.bottom + 10) + 'px';
    picker.style.setProperty('--arrow', (r.left + r.width / 2 - left) + 'px');
  }
  pickerFor = btn; btn.setAttribute('aria-expanded', 'true');
  (grid.querySelector('[aria-pressed="true"]') || grid.querySelector('button')).focus();
}
document.addEventListener('pointerdown', e => { if (!picker.hidden && !picker.contains(e.target) && !(pickerFor && pickerFor.contains(e.target))) closePicker(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !picker.hidden) closePicker(true); });
addEventListener('resize', () => closePicker());
paintWeather();

// 첫 문장: 그림을 다 읽은 뒤에만 (느린 연결에서 그림보다 먼저 쓰려다 오류가 나지 않게)
const firstWrite = () => {
  if (!plate) { setTimeout(firstWrite, 300); return; }
  const awayMin = seen0 ? (Date.now() - seen0) / 60000 : 0;
  const hi = welcome(awayMin, true);
  seenAt = Date.now(); save('seen', String(seenAt));
  // v23 이름 인사: 새 키위가 온 날 인사(「안녕 ○○키위」)가 먼저, 그다음 내 이름 — 시계 모드여도 잠깐 쓴다
  const kiwiHi = !!hi && hi.startsWith('안녕 ');   // 새 키위 인사
  const me = q.get('text') || kiwiHi ? null : greeter.hello({ awayMin, hour: realHour() });
  if (me) say(me, 8);
  else if (phase === 'idle' && !current && mode === 'free') write(hi || FIRST);
  // 처음 쓰는 사람에게 이름 묻기 → 놓친 메모
  setTimeout(() => { if (greeter.needsAsk && !q.get('text')) askName(); else showMissed(); }, me ? 9000 : 4000);
};
setTimeout(firstWrite, 700);

// ── v20 단체 사진: 다 쓴 키위들이 글씨를 가리지 않게 글씨 아래(자리가 없으면 위)로 한 줄로 선다 → 걸리는 시간(초)
function groupPhoto() {
  const u = beach.u, crew = kiwis.filter(k => !k.gone && !k.focus && k.state !== 'flee');
  if (!box || !crew.length) return 1.5;
  const below = box.y1 + S * 0.6, above = box.y0 - S * 0.3;
  const fits = x => below < beach.edge(x) - 30 * u;
  const y0 = fits((box.x0 + box.x1) / 2) ? below : above;
  const w = Math.min(box.x1 - box.x0 + S, crew.length * S * 0.75), x0 = (box.x0 + box.x1) / 2 - w / 2;
  crew.sort((a, b) => a.x - b.x);
  let far = 0;
  crew.forEach((k, i) => {
    if (k.asleep) k.wake(0);
    // v27.6 열에 열 마리쯤은 셔터 순간에 자세를 잡는다 (통통 뜬 채·하늘 보기·갸웃·기지개·정면 보기…)
    const poses = PHOTO_POSES.filter(p => ACTS[p.id]);
    k.photoPose = poses.length && Math.random() < 0.6 ? poses[Math.floor(Math.random() * poses.length)] : null; k.posed = false;
    const x = clamp(x0 + (crew.length === 1 ? w / 2 : (i * w) / (crew.length - 1)), 20, W - 20);
    const y = clamp(y0 + (i % 2 ? S * 0.12 : 0), beach.grass(x) + 20 * u, beach.edge(x) - 30 * u);
    if (k.state === 'free' || k.state === 'idle' || k.state === 'act' || k.state === 'wander') { k.wanderTo(x, y); far = Math.max(far, dist(k.x, k.y, x, y)); }
  });
  return clamp(far / (world.speed * 0.6 * 0.85) + 1.2, 1.5, 6);
}

// ── v20 돌아오는 병 ──
function bottleTick(hour) {
  if (focus.active || memo || breath || phase === 'writing' || drifters.list.length || beach.t < bottleAt) return;
  bottleAt = beach.t + (BOTTLE_FAST ? 25 : 300 + Math.random() * 300);   // 켜 둔 동안 5~10분에 하나 (하루 8개까지)
  const ctx = {
    night: atmos.night > 0.5, morning: hour >= 5 && hour < 10,
    rain: atmos.weather === 'rain' || atmos.weather === 'drizzle', snow: atmos.weather === 'snow' || mapId === 'snow',
    focus: beach.t - focusDoneAt < 900, long: Date.now() - openedAt > 3600e3,
  };
  const asked = !!noteAsk, from = noteSenders();   // 테스트 「쪽지 지금 띄우기」면 돌아온 내 글 말고 응원 쪽지로
  const it = bottles.pick(ctx, Date.now(), { minDays: BOTTLE_FAST ? 0 : MIN_DAYS, cap: BOTTLE_FAST || asked ? 999 : 8, from, mine: !asked });
  if (it) drifters.send(it, beach);
}
// v29.25 쪽지를 쓸 키위: 지금 섬에 나와 있는 무리 키위 (테스트 탭에서 성격을 고르면 그 성격 키위 — 무리에 없으면 이름 없이 성격 이름으로)
let noteAsk = null;
function noteSenders() {
  const ids = new Set(kiwis.filter(k => !k.gone && k.member).map(k => k.member));
  let out = [...ids].map(id => flock.get(id)).filter(Boolean).map(m => ({ name: m.name, p: m.p }));
  if (noteAsk) {
    const p = noteAsk; noteAsk = null;
    const any = p === 'any' ? null : p;
    const mates = flock.members.filter(m => !any || m.p === any).map(m => ({ name: m.name, p: m.p }));
    out = mates.length ? mates : [{ name: any ? temperName(any) : '키위 일동', p: any || TEMPERS[0].id }];
  }
  return out;
}

// ── v22.1 번인 방지 ②③: 키위가 잠들 만큼(기본 90초) 안 건드리면 위 버튼 줄·입력창이 천천히 사라지고 집중 알약은 흐려진다.
//    창이 열려 있거나 글을 쓰는 중엔 그대로. 누르거나 움직이면 바로 돌아온다(nudge). 집중 알약은 10분마다 자리를 조금 옮긴다
const HUD_SPOTS = [[0, 0], [0, 4], [0, 9], [0, 12], [0, 6], [0, 2]];   // v26.3: 버튼 줄 오른쪽 끝에 맞춰 두고 위아래로만
let burnAt = 0, hudSpot = -1, lastNightMix = -1;
function burnTick() {
  if (beach.t < burnAt) return;
  burnAt = beach.t + 0.5;
  const b = document.body;
  document.documentElement.dataset.time = atmos.night > 0.5 ? 'night' : 'day';   // v24 종이 테마: 밤엔 등불 아래 종이 톤
  // v29.19 디자인 시스템: 창 색이 하루 빛을 따라 낮(크림 종이)→밤(남색 종이)으로 천천히 섞인다 (tokens.css --k-night)
  //  새벽·노을처럼 조금이라도 어두우면(하루 빛 밤 값 0.15↑) 밤 색 — 중간 비율에선 종이·글씨 톤이 만나 안 보였다(새벽, 사용자).
  //  0/1 로 정하고 바뀌는 순간만 CSS 가 2.5초에 걸쳐 섞는다(tokens.css @property --k-night)
  const nightMix = atmos.night >= 0.15 ? 1 : 0;
  if (nightMix !== lastNightMix) { lastNightMix = nightMix; document.documentElement.style.setProperty('--k-night', String(nightMix)); }
  const open = document.querySelector('#settings:not([hidden]), #basket:not([hidden]), #wardrobe:not([hidden]), #chartView:not([hidden]), #focusPanel:not([hidden]), #menu:not([hidden]), #picker:not([hidden]), #info:not([hidden]), #found:not([hidden])');
  b.classList.toggle('drowse', !open && !b.classList.contains('typing') && Date.now() - activeAt > SLEEP_AFTER * 1000);
  if (Date.now() - activeAt > AUTO_CLEAN * 1000 && autoCleanOk()) setClean(true);   // v29.23 가만히 두면 화면 정리
  const spot = Math.floor(Date.now() / 600000) % HUD_SPOTS.length;
  if (spot !== hudSpot) { hudSpot = spot; const hud = document.getElementById('focusHud'); hud.style.setProperty('--hx', HUD_SPOTS[spot][0] + 'px'); hud.style.setProperty('--hy', HUD_SPOTS[spot][1] + 'px'); }
}

// ── v23 별똥별: 떨어질 때 아주 작게 반짝 소리, 지나가는 동안 누르면 키위들이 일제히 하늘을 보고 깡총 ──
if (q.has('sky')) { atmos.meteors.gap = [4, 8]; atmos.meteors.next = 2; window.__sky = atmos; }   // 시험: ?sky → 맑은 밤 별똥별이 4~8초마다
atmos.onMeteor = m => sound.pluck(sound.root + 31, 0.035, 0, 2.4, sound.panOf(m.x));
function starWish(x) {
  kiwis.forEach((k, i) => { if (k.gone || k.asleep) return; k.alert(i * 0.04); if (!k.job) { k.hop(1, 0.3 + i * 0.05); k.later('lookup', 0.8 + i * 0.06); } });
  [0, 4, 7, 12, 16].forEach((st, i) => sound.pluck(sound.root + 24 + st, 0.1, i * 0.09, 2, sound.panOf(x)));
  toast('별똥별 — 키위들이 소원을 빌었어요');
}

// ── v20 나를 알아채는 무리: 오래 안 건드리면 하나둘 잠들고, 다시 움직이면 깨어 몇 마리가 그쪽으로 온다 ──
// v22.2 다 같이 자지 않는다 — 멍하니 구경하는 사람도 있다. 몇 마리만 1~3분씩 돌아가며 졸고, 밤엔(야행성) 거의 안 존다
function dozeTick() {
  if (breath) { activeAt = Date.now(); return; }   // 숨 고르는 동안엔 잠들지 않는다
  const idle = (Date.now() - activeAt) / 1000, crew = kiwis.filter(k => !k.gone && !k.focus);
  const r = doze.tick(beach.t, idle, crew, k => !k.job && (k.state === 'idle' || k.state === 'free') && (k.vis ?? 1) > 0.9, atmos.night);
  for (const k of r.wake) k.wake(Math.random() * 0.4);   // 일어나면 폴짝 기지개 → 다시 어슬렁
  if (r.sleep) r.sleep.sleep();
  dozing = kiwis.some(k => k.asleep);
}
function nudge(sx, sy) {
  activeAt = Date.now(); document.body.classList.remove('drowse');
  if (!dozing) return;
  dozing = false; doze.reset(beach.t);
  const sleepers = kiwis.filter(k => k.asleep);
  if (!sleepers.length) return;
  const u = beach.u;
  const [px, py] = sx != null ? toWorld(sx, sy) : [W / 2, (beach.bushY + beach.shoreY) / 2];
  sleepers.sort((a, b) => dist(a.x, a.y, px, py) - dist(b.x, b.y, px, py));
  sleepers.forEach((k, i) => {
    k.wake(0.15 + i * 0.12 + Math.random() * 0.25);
    // 가장 가까운 셋은 누른(움직인) 쪽으로 몇 걸음 — "왔어?"
    if (i < 3 && phase !== 'writing') k.onWake = kw => {
      const x = clamp(px + (Math.random() - 0.5) * 120 * u, 20, W - 20);
      kw.wanderTo(x, clamp(py + (Math.random() - 0.5) * 50 * u, beach.grass(x) + 20 * u, beach.edge(x) - 30 * u));
    };
  });
  sound.call(0.15, px);
}
for (const ev of ['pointerdown', 'pointermove', 'wheel']) window.addEventListener(ev, e => nudge(e.clientX, e.clientY), { passive: true, capture: true });
window.addEventListener('keydown', () => nudge(), true);

// ── v23 시간 메모 · 이름 인사 (규칙 src/memos.js · greet.js, 화면 src/memo-ui.js + memos.css) ──
// 글 하나를 잠깐 붙잡아 쓴다 — 자동 글(시계·명언)이 바로 덮지 않게
function say(text, secs = 14) {
  if (!text) return;
  memo = { text: text.replace(/\s+/g, ' ').trim(), hold: secs, until: beach.t + 120 };
  nudge();
  submit(memo.text);
}
// 2초마다, 화면이 보일 때만: 그 시각이 된 메모를 키위가 쓴다. 집중·숨 고르기·다른 붙잡은 글이 끝난 뒤로 미룬다
function memoTick() {
  if (document.hidden || beach.t < memoAt) return;
  memoAt = beach.t + 2;
  memoQueue.push(...memos.due());
  if (!memoQueue.length || focus.active || breath || memo || phase === 'washing') return;
  const m = memoQueue.shift();
  say(memos.sandText(m), 20);
  sound.call(0.1, W / 2);
  if (memoPanel) memoPanel.paint();
}
const memoPanel = document.getElementById('memoHost') ? mountMemoPanel(document.getElementById('memoHost'), memos) : null;
// 발견 카드 자리에 모듈이 만든 카드를 띄운다
//  bare: 카드가 자기 제목·버튼을 다 가진 경우(이름 묻기) — 발견 카드의 제목·닫기 줄을 숨겨 두 벌로 보이지 않게
function showCard(node, title, body = '', bare = false) {
  foundEl.classList.toggle('bare', bare);
  const art = foundEl.querySelector('.art'); art.textContent = ''; art.append(node);
  document.getElementById('foundTitle').textContent = title; foundEl.querySelector('.body').textContent = body;
  foundItem = null; foundWear.hidden = true; foundShare.hidden = true;
  foundBack = document.activeElement; foundEl.hidden = false;
}
function askName() {
  showCard(nameCard(greeter, { onDone: n => { closeFound(); paintMe(); if (n) say(greeter.hello({ hour: realHour() }), 8); setTimeout(showMissed, n ? 9000 : 600); } }), '뭐라고 불러 줄까요?', '', true);
}
function showMissed() {
  const mm = memos.missed();
  if (mm.length) { showCard(missedCard(mm), '그 사이 지나간 메모', ''); if (memoPanel) memoPanel.paint(); }
}
// 설정 › 글씨 › 이름
const meForm = document.getElementById('meForm');
function paintMe() { if (meForm) meForm.querySelector('input').value = greeter.name; }
if (meForm) {
  paintMe();
  meForm.addEventListener('submit', e => { e.preventDefault(); const n = greeter.setName(meForm.querySelector('input').value); paintMe(); toast(n ? `이제 「${n}」이라고 부를게요` : '이름을 지웠어요'); if (n) say(greeter.hello({ hour: realHour() }), 8); });
}

// ── v21 쉬는 시간 호흡 ──
const breathOffer = document.getElementById('breathOffer');
function offerBreath(why = '') {
  if (focus.active || breath) return;
  breathOffer.querySelector('.why').textContent = why;
  breathOffer.hidden = false; offerUntil = beach.t + 25;
}
breathOffer.addEventListener('click', () => { unlock(); startBreath(); });
document.getElementById('focusBreath').addEventListener('click', () => { unlock(); openFocusPanel(false); startBreath(); });
function startBreath() {
  breathOffer.hidden = true;
  if (focus.active) { toast('집중이 끝난 뒤에 숨 골라요'); return; }
  memo = null; pending = null;
  nudge();
  sound.setHush('events');   // 걷는 발자국 음은 끄고, 숨 소리(낮은 음)만
  if (phase !== 'idle' || beach.printCount > 0) wash();
  breath = { stage: 'wait', at: beach.t };
  showCaption({ main: '잠깐 숨 고르기', sub: '키위들이 모일 때까지 기다려요' });
}
// 다 모이면 시작 · 원 크기는 숲 줄과 물가 사이 모래에 맞춘다
function setupBreath() {
  const u = beach.u, cx = W / 2;
  const top = beach.grass(cx) + 40 * u, bot = beach.shoreAt(cx) - 40 * u, cy = (top + bot) / 2;
  const rMax = clamp(Math.min(W * 0.32, ((bot - top) / 2) / SQUASH), 60 * u, 420 * u), rMin = rMax * 0.55;
  const pool = kiwis.filter(k => !k.gone && !k.focus && k.state !== 'flee');
  const n = clamp(pool.length, 6, 8);
  for (let i = pool.length; i < n; i++) pool.push(spawn());
  pool.slice(n).forEach(k => { k.flee(beach.grass(k.x) - 50 * u); k.alertT = 0; });   // 남는 키위는 숲으로
  const crew = pool.slice(0, n);
  // 지금 선 자리에서 가까운 칸을 고르게 각도 순으로
  crew.sort((a, b) => Math.atan2((a.y - cy) / SQUASH, a.x - cx) - Math.atan2((b.y - cy) / SQUASH, b.x - cx));
  for (const k of crew) { if (k.job) { k.job.taken = null; k.job = null; } k.state = 'breathe'; k.v = 0; }
  Object.assign(breath, { stage: 'gather', at: beach.t, cx, cy, rMin, rMax, crew, cue: '' });
}
function breathTick(dt) {
  if (!breath) { if (!breathOffer.hidden && beach.t > offerUntil) breathOffer.hidden = true; if (captionOffAt && beach.t > captionOffAt) { captionOffAt = 0; showCaption(null); } return; }
  if (breath.stage === 'wait') { if (phase === 'idle' && !beach.surging && beach.t - breath.at > 0.8) setupBreath(); return; }
  const b = breath, crew = b.crew.filter(k => !k.gone && k.state === 'breathe'), n = b.crew.length;
  if (!crew.length) { endBreath(false); return; }
  const e = b.stage === 'breathe' ? beach.t - b.t1 : -1, st = breathAt(e);
  const r = b.rMin + (b.rMax - b.rMin) * st.p;
  let far = 0;
  b.crew.forEach((k, i) => {
    if (k.gone || k.state !== 'breathe') return;
    const [tx, ty] = ringSpot(b, i, n, r, beach.t);
    const d = dist(k.x, k.y, tx, ty); far = Math.max(far, d);
    // 모일 땐 보통 걸음, 숨 쉴 땐 원을 따라 천천히 (멀어진 키위는 조금 서둘러 따라온다)
    const sp = b.stage === 'gather' ? world.speed * 0.8 : world.speed * clamp(d / (S * 0.6), 0.12, 0.6);
    if (d > 1.5) k.step(k.walk(tx, ty, sp, dt, world, false), world, 'faint');
    else k.v *= 0.8;
  });
  if (b.stage === 'gather') {
    if (far < S * 0.35 || beach.t - b.at > 9) { b.stage = 'breathe'; b.t1 = beach.t; }
    return;
  }
  if (st.done) { endBreath(true); return; }
  const cue = st.inhale ? 'in' : 'out', key = cue + st.round;
  if (key !== b.cue) {
    b.cue = key;
    showCaption({ main: st.inhale ? '들이쉬고' : '내쉬고', sub: `${st.round + 1} / ${ROUNDS} · 화면을 누르면 그만해요` });
    // 숨 소리: 들이쉴 땐 위로, 내쉴 땐 아래로 — 음악 묶음이라 발자국 음을 꺼도 들린다
    const root = sound.root;
    if (st.inhale) [0, 7, 12].forEach((s, i) => sound.pluck(root + s, 0.05, i * 0.9, 3.2, 0, 'music', 0.5));
    else [12, 7, 0, -5].forEach((s, i) => sound.pluck(root + s, 0.045, i * 1.3, 3.6, 0, 'music', 0.5));
  }
}
function endBreath(done) {
  const b = breath; breath = null;
  if (b && b.crew) for (const k of b.crew) if (!k.gone && k.state === 'breathe') { k.state = 'free'; if (done) k.hop(2, Math.random() * 0.3); }
  applyHush();
  useMs = 0;
  if (done) { showCaption({ main: '잘 쉬었어요', sub: '어깨 한번 펴고, 다시 천천히' }); captionOffAt = beach.t + 4; sound.chorus(kiwis.filter(k => !k.gone).map(k => k.x)); }
  else { showCaption(null); captionOffAt = 0; }
}
function drawBreathRing() {
  const b = breath, st = breathAt(beach.t - b.t1), r = b.rMin + (b.rMax - b.rMin) * st.p, u = beach.u;
  ctx.save();
  ctx.strokeStyle = atmos.night > 0.5 ? 'rgba(235,240,255,0.28)' : 'rgba(255,250,235,0.42)';
  ctx.lineWidth = 2.4 * u; ctx.setLineDash([2 * u, 9 * u]); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(b.cx, b.cy, r, r * SQUASH, 0, 0, 6.29); ctx.stroke();
  ctx.restore();
}
// 오래 켜 두고 보면(집중 아닐 때) 키위들이 기지개를 켜며 쉬자고 한다
function restTick() {
  const now = Date.now();
  if (!document.hidden && useAt && !focus.active && !breath) useMs += Math.min(2000, now - useAt);
  useAt = now;
  if (useMs < BREAK_AFTER || focus.active || breath || memo) return;
  useMs = 0;
  kiwis.forEach((k, i) => { if (!k.gone && !k.asleep) k.hop(2, i * 0.08); });
  sound.call(0.1, W / 2);
  offerBreath(`${Math.round(BREAK_AFTER / 60000)}분째 보고 있어요`);
}
if (q.has('breath')) setTimeout(() => startBreath(), 4000);   // 시험: ?breath = 열고 4초 뒤 바로

// ── v20 집중 사진 ──
async function takeShot() {
  const m = { ...(memo?.travelRecord || {}), reason: memo?.reason || '집중', letter: memo?.letter || '', min: memo?.min || 0, steps: memo?.steps || 0, at: memo?.at || Date.now(), ...(memo?.diary ? { diary: memo.diary } : {}), ...(memo?.nm ? { nm: memo.nm } : {}) };
  let blob = null;
  try {
    blob = await capture(worldEl, W, H, atmos.night > 0 && !beach.snowGround && beach.snow <= 0.35 && !beach.gravel ? g => {
      beach.clipLand(g); beach.drawPrints(g, { night: atmos.night, photo: true, lettersOnly: true });
    } : null);
  } catch (e) { blob = null; }
  if (!blob) { toast('일지를 남기지 못했어요'); return; }
  document.body.classList.remove('shutter'); void document.body.offsetWidth; document.body.classList.add('shutter');
  sound.found(W / 2);
  try {
    await Album.add({ id: 'shot-' + m.at, ...m, blob }); toast(m.journey ? '항해 일기를 일지 한 쪽으로 남겼어요 — 바구니 › 일지' : '오늘의 집중을 일지 한 쪽으로 남겼어요 — 바구니 › 일지', 3200);
    const n = await Album.count(), step = n >= ALBUM_WARN ? Math.floor((n - ALBUM_WARN) / 50) + 1 : 0;
    if (step > (+saved('albumWarned') || 0)) { save('albumWarned', String(step)); setTimeout(() => toast(`집중 일지가 ${n}쪽이 됐어요 — 아끼는 건 「전부 내려받기」로 챙겨 두고, 지난 쪽은 지워도 돼요`, 5200), 3600); }
  }
  catch (e) { toast('일지를 저장하지 못했어요 (이 브라우저는 저장소를 쓸 수 없어요)', 3200); }
  paintAlbum();
}
let albumUrls = [], shotSeq = [], viewUrl = '';   // 사진 URL은 보기 종료/전환 시 반환한다.
const ALBUM_WARN = num('albumwarn', 200);   // v23.1 이만큼 넘으면 알려 준다 (시험: ?albumwarn=2)
// v23.1 전부 내려받기: 사진을 zip 한 파일로 (브라우저는 여러 파일을 한꺼번에 받으면 막거나 하나씩 묻는다)
document.getElementById('shotAll').addEventListener('click', async e => {
  const b = e.currentTarget; if (b.disabled) return;
  b.disabled = true; const label = b.textContent; b.textContent = '묶는 중…';
  try {
    const list = albumPhotos((await Album.all()).slice().reverse()), names = shotNames(list);
    // O5: 사진을 한 장씩 읽어 CRC 만 계산하고 원본 Blob 을 그대로 담는다 (사진 전체를 한꺼번에 복사하지 않는다)
    const url = URL.createObjectURL(await zipBlob(list.map((s, i) => ({ name: names[i], at: s.at, blob: s.blob }))));
    const d = new Date(), p = x => String(x).padStart(2, '0'), a = document.createElement('a');
    a.href = url; a.download = `kiwi-focus-photos_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.zip`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast(`일지 ${list.length}쪽을 한 파일로 내려받았어요`, 2600);
  } catch (err) { toast('내려받지 못했어요'); }
  b.disabled = false; b.textContent = label;
});
// O4 (2026-10-19): 앨범은 사진이 바뀌었을 때(이 창의 저장·지우기, 다른 창에서 돌아옴, 날짜 바뀜)만 다시 읽고 그린다.
//  모은 것 창을 열거나 줍기·손님이 올 때마다 모든 사진을 다시 읽고 썸네일을 다시 풀던 것을 막는다.
//  겹쳐 부르면 마지막 요청만 화면에 반영한다(늦게 온 결과가 새 화면을 덮거나 썸네일 주소가 새지 않게).
let albumShown = null, albumSeq = 0, albumCount = 0, albumPending = null, albumBy = 'all';
document.addEventListener('visibilitychange', () => { if (!document.hidden) albumShown = null; });   // 다른 창(시험 데이터 채우기 등)이 바꿨을 수 있다
const albumTitle = title => { title.textContent = `집중 일지 ${albumCount}` + (bottles.returned ? ` · 돌아온 글 ${bottles.returned}` : ''); };
async function paintAlbum() {
  const grid = document.getElementById('shotGrid'), title = document.getElementById('shotTitle');
  if (!grid) return;
  const sig = `${Album.version}|${today()}`;   // 달 묶음 이름은 오늘 날짜에 따라 달라진다
  if (albumShown === sig) { albumTitle(title); return; }   // 사진은 그대로 — 돌아온 글 수만 고친다
  if (albumPending?.sig === sig) return albumPending.p;   // 같은 상태를 이미 읽는 중 — 한 번만 읽는다
  const p = drawAlbum(++albumSeq, sig, grid, title);
  albumPending = { sig, p };
  p.finally(() => { if (albumPending?.p === p) albumPending = null; });
  return p;
}
async function drawAlbum(seq, sig, grid, title) {
  let list = [], ok = true;
  try { list = await Album.all(); } catch (e) { list = []; ok = false; }
  if (seq !== albumSeq) return;   // 그사이 더 새 그리기가 시작됐다
  albumShown = ok ? sig : null;   // 못 읽었으면 다음에 다시 읽는다
  albumCount = list.length;
  albumUrls.forEach(u => URL.revokeObjectURL(u)); albumUrls = [];
  grid.textContent = '';
  albumTitle(title);
  document.getElementById('shotTools').hidden = !list.length;
  document.getElementById('shotWarn').textContent = list.length >= ALBUM_WARN ? `${list.length}쪽 — 일지는 이 기기 저장 공간에 있어요. 아끼는 건 내려받아 두고, 지난 쪽은 지워도 돼요.` : '';
  if (!list.length) {
    const e = document.createElement('div'); e.className = 'shotEmpty';
    const im = document.createElement('img'); im.src = 'assets/flower.webp?v=v29.25.1-44a30f8'; im.alt = '';
    const t = document.createElement('span'); t.textContent = '아직 일지가 없어요. 집중을 끝까지 하면 키위들이 이유와 날짜를 모래에 써 주고, 그 순간이 여기 남아요.';
    e.append(im, t); grid.append(e); return;
  }
  // v29.5 전체 = 모든 쪽을 폴라로이드로(예전엔 최근 6장만 펼치고 지난 것은 달별 더미 — 더미는 첫 장만 열려 나머지에 닿을 수 없었다)
  //  연 · 월 · 일 = 접히는 묶음, 맨 위 묶음만 펼쳐 둔다. 썸네일은 묶음을 펼칠 때 만든다.
  shotSeq = list;
  const thumb = sh => { const url = URL.createObjectURL(sh.blob); albumUrls.push(url); const im = document.createElement('img'); im.src = url; im.alt = ''; im.loading = 'lazy'; return im; };
  const card = sh => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'shot';
    const cap = document.createElement('span'); cap.textContent = `${sh.reason} · ${stamp(sh.at)}`;
    b.append(thumb(sh), cap);
    b.setAttribute('aria-label', `${sh.reason}, ${longDate(sh.at)} 집중 일지 크게 보기`);
    b.addEventListener('click', () => showFound({ kind: 'shot', ...sh }));
    return b;
  };
  if (albumBy === 'all') { for (const sh of list) grid.append(card(sh)); return; }
  groupBy(list, albumBy).forEach((g, i) => {
    const box = document.createElement('details'); box.className = 'shotGroup'; box.dataset.key = g.key;
    const sum = document.createElement('summary'), t = document.createElement('b'), c = document.createElement('small');
    t.textContent = g.label; c.textContent = groupNote(g); sum.append(t, c);
    const inner = document.createElement('div'); inner.className = 'k-photos';
    const fill = () => { if (!inner.children.length) for (const sh of g.shots) inner.append(card(sh)); };
    box.append(sum, inner);
    if (i === 0) { box.open = true; fill(); }
    box.addEventListener('toggle', () => { if (box.open) fill(); });
    grid.append(box);
  });
}
// v23.2 크게 보기: 좌우로 넘기기 · 공유
function dropViewUrl() { if (viewUrl) { URL.revokeObjectURL(viewUrl); viewUrl = ''; } }
function stepShot(dir) {
  if (photoViewer.open || foundEl.hidden || foundItem?.kind !== 'shot') return;
  if (journeyBook) { journeyBook.turn(dir); return; }
  const i = shotSeq.findIndex(s => s.id === foundItem.id), nx = shotSeq[i + dir];
  if (i < 0 || !nx) return;
  showFound({ kind: 'shot', ...nx });
  foundEl.querySelector(`.shotNav.${dir < 0 ? 'prev' : 'next'}:not(:disabled)`)?.focus();
}
window.addEventListener('keydown', e => {
  if (photoViewer.open || foundEl.hidden || foundItem?.kind !== 'shot') return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { stepShot(e.key === 'ArrowLeft' ? -1 : 1); e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
{ let sx = 0, sy = 0, on = false;
  const art = foundEl.querySelector('.art');
  art.addEventListener('pointerdown', e => { if (journeyBook || foundItem?.kind !== 'shot' || e.target.closest('button')) return; on = true; sx = e.clientX; sy = e.clientY; });
  art.addEventListener('pointerup', e => { if (!on) return; on = false; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) stepShot(dx < 0 ? 1 : -1); });
  art.addEventListener('pointercancel', () => { on = false; });
}
foundShare.addEventListener('click', async () => {
  const sh = foundItem; if (sh?.kind !== 'shot' || foundShare.disabled) return;
  foundShare.disabled = true;
  try {
    const blob = await shareCard(sh, getComputedStyle(document.body).fontFamily || 'sans-serif');
    const name = 'kiwi-focus_' + shotNames([sh])[0].replace(/\.\w+$/, '') + '.jpg';
    const how = await shareFile(blob, name, sh.reason);
    if (how === 'download') toast('공유 창이 없는 브라우저라 카드를 내려받았어요', 2600);
  } catch (e) { toast('공유하지 못했어요'); }
  foundShare.disabled = false;
});

// 일지 묶어 보기 고르기 (기억해 둔다) · 「일」 보기에서만 달력(v29.7, 예전 떠나기 창 「기록」)
function setAlbumBy(v) { if (!ALBUM_BY.includes(v)) return; if (v !== albumBy) { albumBy = v; save('albumBy', v); albumShown = null; paintAlbum(); } markAlbumBy(); }
function markAlbumBy() { document.querySelectorAll('#shotBy button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.by === albumBy))); document.getElementById('focusCal').hidden = albumBy !== 'day'; if (albumBy === 'day') paintCal(); }
{ const by = document.getElementById('shotBy');
  const mark = markAlbumBy;
  { const v = saved('albumBy'); if (ALBUM_BY.includes(v)) albumBy = v; }
  mark();
  by.addEventListener('click', e => { const b = e.target.closest('button[data-by]'); if (b) setAlbumBy(b.dataset.by); });
}

// 2026-10-24 UI 개편: 바구니 · 꾸미기 · 해도 창 (src/ui/shell.js)
shell = mountShell({
  closeOthers: () => { openSettings(false); openFocusPanel(false); if (!menu.hidden) openMenu(false); closePicker(); },
  paintCollection, paintPacks, unlock, toast, save, sound, col, setWear, voyScene, flock, wardrobeJournal,
  syncFlock: () => { for (const k of kiwis) { const m = flock.get(k.member); if (m) k.skin = skinOf(m); } },
  setView: v => setView(v), previewCrew: crewN,
  closeFound, closeInfo: () => openInfo(false), closePicker: () => closePicker(true),
  closeSettings: () => openSettings(false), closeFocus: () => openFocusPanel(false),
  onChart: () => extras.paintChart(),
});
window.__kiwi = { get nextAmbient() { return nextAmbient; }, showItem, gifts, guestbook, showFound, arrive, guestsFor, voyage, voyScene, shotNames, zipStore, memos, greeter, say, askName, startBreath, endBreath, get breath() { return breath; }, bottles, Album, nudge, get memo() { return memo; }, get dozing() { return dozing; }, bottleNow() { bottleAt = 0; }, setPack, setCrowd, get crowd() { return { id: crowdId, n: crowdN, ...crowd() }; }, paintPacks, focus, completeFocus, shore, finds, pickUp, paintCollection, get phase() { return phase; }, get kiwis() { return kiwis; }, get jobs() { return jobs; }, get current() { return current; }, beach, get water() { return water; }, art, artAt, get light() { return { mode: lightMode, pick: lightPick, shown: lightShown }; }, setLight, get artDpr() { return artDpr(); }, perf, clouds, atmos, sound, get plate() { return plate; }, drifters, col, openDrift, get notes() { return notes; }, submit, setView, toWorld, cam };

mountRenderDiagnostics(q, () => ({
  renderer: water ? (water.flat ? '2D' : 'WebGL2') : '그림 로딩 중',
  ready, error: frame.err || document.querySelector('#boot.failed .why')?.textContent || '',
}));
