// tracks/oga-2026-10.js — 곡 후보 듣기(tools/audition.html)에서 사용자가 고른 OpenGameArt 13곡 (2026-10-11)
//  전부 곡 페이지에서 CC0(또는 CC0 병기 — 우리는 CC0 로 쓴다) 확인 후 받음. 원본은 저장소에 넣지 않았다.
//  손질: tools/audio-add.mjs — 앞뒤 무음 자르기 · −20 LUFS · 스테레오 96k · 끝 4초를 처음과 겹친 고리
//        (sky·whereami·slowstride 는 원래 고리로 만든 곡이라 겹침 0)
//  id 는 생성 곡(music.js SONGS) 이름과 겹치면 안 된다 — 같은 mix.song 자리를 쓴다 (그래서 Forest 는 'woods')

const OGA = 'OpenGameArt', CC0 = 'CC0';
const oga = (title, author, slug) => ({ title, author, source: OGA, url: `https://opengameart.org/content/${slug}`, license: CC0 });
//  author 는 곡을 만든 사람 (올린 사람과 다를 수 있다 — Lost in the meadows 는 HaelDB 가 올린 Augmentality 곡, 2026-10-11 곡 페이지 확인)

export default {
  id: 'oga-2026-10',
  name: 'OpenGameArt 앰비언트 13곡 (2026-10-11 선곡)',
  tracks: [
    { id: 'sky', kind: 'song', file: 'song-sky.mp3', tags: ['ambient', 'dreamy', 'loop'], moods: ['morning', 'day'],
      item: { id: 'm-sky', name: '하늘 위로', note: '꿈결 같은 고리 배경음' }, credit: oga('Up in the Sky', 'Memoraphile', 'up-in-the-sky') },
    { id: 'underwater', kind: 'song', file: 'song-underwater.mp3', tags: ['ambient', 'water'], moods: ['day', 'night'],
      item: { id: 'm-underwater', name: '물속에서', note: '물속처럼 일렁이는 테마' }, credit: oga('Underwater Theme', 'Cleyton Kauffman', 'underwater-theme') },
    { id: 'lifewave', kind: 'song', file: 'song-lifewave.mp3', tags: ['ambient', 'pad'], moods: ['sunset', 'night'],
      item: { id: 'm-lifewave', name: '숨 고르는 물결', note: '길게 쉬어 가는 앰비언트' }, credit: oga('Calm Ambient 3 (Lifewave 2k)', 'cynicmusic', 'calm-ambient-3-lifewave-2k') },
    { id: 'daydream', kind: 'song', file: 'song-daydream.mp3', tags: ['ambient', 'dreamy'], moods: ['day', 'sunset'],
      item: { id: 'm-daydream', name: '낮꿈', note: '멍하니 흘러가는 긴 곡' }, credit: oga('Daydream', 'Adiutorium', 'daydream') },
    { id: 'whereami', kind: 'song', file: 'song-whereami.mp3', tags: ['calm', 'loop'], moods: ['day'],
      item: { id: 'm-whereami', name: '어디까지 했더라', note: '짧고 가벼운 고리' }, credit: oga('Where was I?', 'yd', 'where-was-i') },
    { id: 'meadow', kind: 'song', file: 'song-meadow.mp3', tags: ['calm', 'melody'], moods: ['morning', 'day'],
      item: { id: 'm-meadow', name: '풀밭의 생각', note: '풀밭에 앉아 생각에 잠긴 듯' }, credit: oga('Meadow Thoughts', 'Écrivain', 'meadow-thoughts') },
    { id: 'waiting', kind: 'song', file: 'song-waiting.mp3', tags: ['calm', 'melody'], moods: ['sunset', 'night'],
      item: { id: 'm-waiting', name: '기다림', note: '조용히 기다리는 곡' }, credit: oga('Waiting II', 'Kistol', 'waiting-ii') },
    { id: 'lostmeadow', kind: 'song', file: 'song-lostmeadow.mp3', tags: ['ambient', 'calm'], moods: ['sunset', 'night'], weather: ['fog'],
      item: { id: 'm-lostmeadow', name: '풀밭에서 길을 잃고', note: '방향 없이 흐르는 아주 잔잔한 곡' }, credit: oga('Lost in the meadows', 'Augmentality', 'lost-in-the-meadows') },
    { id: 'calmpiano', kind: 'song', file: 'song-calmpiano.mp3', tags: ['piano', 'calm'], moods: ['night'], weather: ['rain'],
      item: { id: 'm-calmpiano', name: '고요한 피아노', note: '차분한 피아노' }, credit: oga('Calm Piano 1 (Vaporware)', 'cynicmusic', 'calm-piano-1-vaporware') },
    { id: 'slowstride', kind: 'song', file: 'song-slowstride.mp3', tags: ['chill', 'loop', 'beat'], moods: ['day', 'sunset'],
      item: { id: 'm-slowstride', name: '느린 걸음', note: '느리고 부드러운 칠 고리' }, credit: oga('Slow Stride', 'isaiah658', 'slow-stride') },
    { id: 'woods', kind: 'song', file: 'song-woods.mp3', tags: ['calm', 'nature'], moods: ['morning', 'day'],
      item: { id: 'm-woods', name: '숲', note: '숲을 그린 곡' }, credit: oga('Forest', 'Tarush Singhal', 'forest-7') },
    { id: 'synth4k', kind: 'song', file: 'song-synth4k.mp3', tags: ['synth', 'chill', 'beat'], moods: ['night'],
      item: { id: 'm-synth4k', name: '잔잔한 신스 하나', note: '신스웨이브 계열 휴식곡' }, credit: oga('Calm Ambient 1 (Synthwave 4k)', 'cynicmusic', 'calm-ambient-1-synthwave-4k') },
    { id: 'synth15k', kind: 'song', file: 'song-synth15k.mp3', tags: ['synth', 'chill', 'beat'], moods: ['night'],
      item: { id: 'm-synth15k', name: '잔잔한 신스 둘', note: '신스웨이브 계열 휴식곡' }, credit: oga('Calm Ambient 2 (Synthwave 15k)', 'cynicmusic', 'calm-ambient-2-synthwave-15k') },
  ],
};
