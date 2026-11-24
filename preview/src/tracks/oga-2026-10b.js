// tracks/oga-2026-10b.js — 두 번째 OpenGameArt 묶음 10곡 (2026-10-18, 사용자 승인 후 받음)
//  사용자: 유플로리아 같은 곡 + 기본곡·「어디까지 했더라」·「기다림」 같은 곡. 작업장 저장소 곡 듣기 페이지(kiwi-sound-lab)의
//  「새로 찾음」 후보 23곡 중 Hermes가 10곡을 골라 제안 → 승인. 고른 기준: 이미 고른 곡과 같은 작가 · 곡 설명이 원하는 결 (직접 들어 본 판단 아님)
//  전부 곡 페이지에서 CC0 확인 (I Do Know 는 CC BY·OGA-BY·CC0 병기 — CC0 으로 쓴다). 원본은 저장소에 넣지 않았다.
//  손질: tools/audio-add.mjs — 앞 126초만 · 무음 자르기 · −20 LUFS · 스테레오 96k · 끝 4초를 처음과 겹친 고리
//        (Underwater Ambient Pad 는 원래 고리라 겹침 0, Happy Lullaby 는 짧아서 2초)
//  id 는 생성 곡(music.js SONGS) 이름과 겹치면 안 된다 (같은 mix.song 자리)

const OGA = 'OpenGameArt', CC0 = 'CC0';
const oga = (title, author, slug) => ({ title, author, source: OGA, url: `https://opengameart.org/content/${slug}`, license: CC0 });

export default {
  id: 'oga-2026-10b',
  name: 'OpenGameArt 두 번째 묶음 10곡 (2026-10-18)',
  tracks: [
    // 유플로리아풍 전자 앰비언트
    { id: 'undersea', kind: 'song', file: 'song-undersea.mp3', tags: ['ambient', 'pad', 'loop'], moods: ['night'],
      item: { id: 'm-undersea', name: '깊은 물속 패드', note: '물속처럼 번지는 짧은 패드 고리' }, credit: oga('Underwater Ambient Pad', 'isaiah658', 'underwater-ambient-pad') },
    { id: 'august', kind: 'song', file: 'song-august.mp3', tags: ['ambient', 'dreamy'], moods: ['sunset', 'night'],
      item: { id: 'm-august', name: '또 한 번의 팔월', note: '잔잔하고 몽환적인 앰비언트' }, credit: oga('Another August', 'cynicmusic', 'another-august') },
    { id: 'somnium', kind: 'song', file: 'song-somnium.mp3', tags: ['ambient'], moods: ['night'],
      item: { id: 'm-somnium', name: '꿈속', note: '분위기로 흐르는 곡' }, credit: oga('Somnium', 'Adiutorium', 'somnium') },
    { id: 'waking', kind: 'song', file: 'song-waking.mp3', tags: ['ambient', 'synth'], moods: ['morning'],
      item: { id: 'm-waking', name: '깨어나는 중', note: '천천히 깨어나는 신스 앰비언트' }, credit: oga('Waking States', 'Tsorthan Grove', 'waking-states') },
    { id: 'spacious', kind: 'song', file: 'song-spacious.mp3', tags: ['ambient', 'space'], moods: ['night'],
      item: { id: 'm-spacious', name: '넓은 하늘', note: '우주처럼 넓게 퍼지는 앰비언트' }, credit: oga('Spacious', 'Indieteur', 'spacious') },
    // 기본곡·「어디까지 했더라」·「기다림」 결
    { id: 'catmint', kind: 'song', file: 'song-catmint.mp3', tags: ['calm', 'melody', 'loop'], moods: ['day'],
      item: { id: 'm-catmint', name: '개박하', note: '「기다림」 작가의 포근한 곡' }, credit: oga('Catmint', 'Kistol', 'catmint') },
    { id: 'bluebonnet', kind: 'song', file: 'song-bluebonnet.mp3', tags: ['calm', 'melody'], moods: ['morning', 'day'],
      item: { id: 'm-bluebonnet', name: '파란 들꽃', note: '「기다림」 작가의 잔잔한 곡' }, credit: oga('Bluebonnet', 'Kistol', 'bluebonnet') },
    { id: 'hotsprings', kind: 'song', file: 'song-hotsprings.mp3', tags: ['calm', 'town'], moods: ['sunset'],
      item: { id: 'm-hotsprings', name: '온천 마을', note: '「기다림」 작가의 작은 마을 곡' }, credit: oga('Hot Springs Town', 'Kistol', 'hot-springs-town') },
    { id: 'idoknow', kind: 'song', file: 'song-idoknow.mp3', tags: ['calm', 'melody'], moods: ['day', 'sunset'],
      item: { id: 'm-idoknow', name: '이제 알아', note: '두근거림이 풀려 가는 곡 — 「하늘 위로」 작가' }, credit: oga('I Do Know', 'Memoraphile', 'i-do-know') },
    { id: 'lullaby', kind: 'song', file: 'song-lullaby.mp3', tags: ['bells', 'loop'], moods: ['night'],
      item: { id: 'm-lullaby', name: '방울 자장가', note: '종소리와 아르페지오 짧은 고리' }, credit: oga('Happy Lullaby (song17)', 'cynicmusic', 'happy-lullaby-song17') },
  ],
};
