// tracks/index.js — 녹음 소리·곡 카탈로그 (곡을 더하는 곳은 여기 하나)
//
//  곡 하나 붙이기:
//   1) node tools/audio-add.mjs <받은 원본> --kind song --id <영문id>   → assets/audio/song-<id>.mp3 + 아래 항목 뼈대가 찍힌다
//   2) 그 항목을 묶음 파일(src/tracks/*.js)의 tracks 에 붙여 넣고 credit 을 채운다
//   3) npm test   → 파일·라이선스·id 검사. 통과하면 소리 창·소라 아이템·작품 설명 크레딧에 저절로 나온다
//  묶음 하나 붙이기: src/tracks/<묶음>.js 를 만들고 아래 PACKS 에 한 줄.
//
//  항목 모양
//   id      소리 창에서 고르는 키 (mix.song · mix.nature · mix.stepPack 에 저장된다 — 바꾸면 저장값이 끊긴다)
//   kind    'song' 곡(고리) · 'nature' 자연 배경(고리) · 'step' 발자국(0.5초 칸 묶음) · 'fx' 한 번 치는 소리(콕·반짝·줍기, v18.7)
//   natural 'step' 에만: 소리 창 「자연스러운 소리」 칸 이름 (있으면 처음부터 고를 수 있다)
//   file    assets/audio/ 안의 파일
//   level   재생 크기 (song 기본 0.36 · nature 0.6)
//   item    { id, name, note } 소라로 받는 아이템. items.js 에 같은 id 가 이미 있으면 그쪽을 쓴다
//   tags    ['ambient', 'drone', 'piano', …]   moods ['morning','day','sunset','night']   weather ['rain','snow','fog',…]
//           — 지금은 기록만. 나중에 "시간·날씨 따라 녹음 곡 돌리기(라디오)"가 이걸로 고른다
//   credit  { title, author, source, url, license }   license 는 LICENSES 중 하나

import cc0v16 from './cc0-v16.js?v=v29.35.0-472a53f';
import oga202610 from './oga-2026-10.js?v=v29.35.0-472a53f';
import fs202610 from './fs-2026-10.js?v=v29.35.0-472a53f';
import kiwiVoices from './kiwi-voices-2026-10.js?v=v29.35.0-472a53f';
import oga202610b from './oga-2026-10b.js?v=v29.35.0-472a53f';
import voyage202610 from './voyage-2026-10.js?v=v29.35.0-472a53f';

// 순서 = 소라로 떠내려오는 순서 (키위 소리를 곡보다 먼저)
export const PACKS = [cc0v16, fs202610, kiwiVoices, oga202610, oga202610b, voyage202610];

// 쓸 수 있는 라이선스. attribution: 작품 설명에 이름을 꼭 적어야 하는가 (크레딧은 카탈로그에서 저절로 만든다)
//  NC(비영리)·ND(변경 금지)·YouTube 전용·"개별 배포 금지" 조건이 붙은 것은 넣지 않는다 — 앱 안에 파일째 들어가고 손질(고리·음량)을 하기 때문
export const LICENSES = {
  CC0: { name: 'CC0 1.0 (퍼블릭 도메인)', attribution: false },
  PD: { name: '퍼블릭 도메인', attribution: false },
  'CC-BY-4.0': { name: 'CC BY 4.0', attribution: true },
  'CC-BY-3.0': { name: 'CC BY 3.0', attribution: true },
  OWN: { name: '직접 만듦', attribution: false },   // 직접 연주·녹음, 또는 상업 이용권이 있는 AI 생성(어느 서비스·플랜인지 credit.source 에)
};

const LEVEL = { song: 0.36, nature: 0.6, step: 1, fx: 1 };

export const TRACKS = PACKS.flatMap(p => p.tracks.map(t => ({ level: LEVEL[t.kind], tags: [], moods: [], weather: [], ...t, pack: p.id })));

const mapOf = kind => Object.fromEntries(TRACKS.filter(t => t.kind === kind).map(t => [t.id, t.file]));
export const SONG_TRACKS = mapOf('song');
export const NATURE_LOOPS = mapOf('nature');
export const STEP_SAMPLES = mapOf('step');
export const FX_SAMPLES = mapOf('fx');
// v18.8 키위 악기 소리 (모으는 것): id → { file, midi, oct, pitched, walk }
export const KIWI_VOICES = Object.fromEntries(TRACKS.filter(t => t.voice).map(t => [t.id, { file: t.file, ...t.voice }]));
// v18.7 「자연스러운 소리」 칸: 녹음 발자국 중 이름이 있는 것
export const NATURAL_STEPS = TRACKS.filter(t => t.kind === 'step' && t.natural).map(t => ({ pack: t.id, name: t.natural }));
export const TRACK = Object.fromEntries(TRACKS.map(t => [`${t.kind}:${t.id}`, t]));

// 소라 아이템으로 바꾸기 (items.js 가 손으로 적은 것 뒤에 붙인다)
const GROUP = { song: 'music', nature: 'nature', step: 'step', fx: 'step' };   // item.group 이 있으면 그쪽 (natstep · find)
export function trackItems() {
  return TRACKS.filter(t => t.item && t.item.name).map(t => ({
    id: t.item.id, kind: 'sound', box: 'conch', group: t.item.group || GROUP[t.kind], pack: t.id, name: t.item.name,
    note: `${t.item.note} — ${t.credit.title}, ${t.credit.author} (${t.credit.license}).`,
  }));
}

// 검사: 문제 목록(빈 배열이면 통과). fileExists 는 테스트(Node)에서만 넘긴다
export function checkTracks(fileExists = null) {
  const bad = [], seen = new Set(), items = new Set();
  for (const t of TRACKS) {
    const at = `${t.pack}/${t.id}`;
    if (!['song', 'nature', 'step', 'fx'].includes(t.kind)) bad.push(`${at}: kind '${t.kind}'`);
    if (!/^[a-z0-9-]+$/.test(t.id)) bad.push(`${at}: id 는 영문 소문자·숫자·-`);
    if (seen.has(`${t.kind}:${t.id}`)) bad.push(`${at}: 같은 kind 에 id 중복`);
    seen.add(`${t.kind}:${t.id}`);
    if (!t.file) bad.push(`${at}: file 없음`);
    else if (fileExists && !fileExists(t.file)) bad.push(`${at}: assets/audio/${t.file} 이 없다`);
    const c = t.credit || {};
    if (!LICENSES[c.license]) bad.push(`${at}: license '${c.license}' 는 허용 목록(LICENSES)에 없다`);
    if (!c.title || !c.source) bad.push(`${at}: credit.title·source 필요`);
    if (LICENSES[c.license]?.attribution && (!c.author || !c.url)) bad.push(`${at}: ${c.license} 는 author·url 필수`);
    if (t.item) {
      if (!t.item.id) bad.push(`${at}: item.id 없음`);
      if (items.has(t.item.id)) bad.push(`${at}: item.id '${t.item.id}' 중복`);
      items.add(t.item.id);
    }
  }
  return bad;
}

// 작품 설명에 넣을 크레딧 (출처별로 묶는다)
export function credits() {
  const by = new Map();
  for (const t of TRACKS) {
    if (t.credit.license === 'OWN') continue;
    const k = `${t.credit.source}|${t.credit.license}`;
    if (!by.has(k)) by.set(k, { source: t.credit.source, license: t.credit.license, list: [] });
    by.get(k).list.push(t);
  }
  return [...by.values()];
}
