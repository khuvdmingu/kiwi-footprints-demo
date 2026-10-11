// tracks/cc0-v16.js — v16에 처음 받은 오픈소스 녹음 묶음 (전부 CC0, 2026-10-10 다운로드 승인 후)
//  원본 출처·손질 내역은 docs/v8-assets.md 「v16 오픈소스 소리·곡」 표.
//  발자국·자연 배경 아이템은 items.js 에 손으로 적혀 있다(합성 소리와 순서가 섞여서) — 여기선 같은 item.id 만 맞춰 둔다.

const BSB = 'BigSoundBank', OGA = 'OpenGameArt';

export default {
  id: 'cc0-v16',
  name: 'v16 오픈소스 첫 묶음',
  tracks: [
    // 발자국: 0.5초 칸 8개짜리 묶음 (tools/audio-steps.cjs)
    { id: 'snow', kind: 'step', file: 'steps-snow.mp3', item: { id: 's-snow' },
      credit: { title: 'Footstep in the Snow #1', author: 'Joseph Sardin', source: BSB, url: 'https://bigsoundbank.com/on-snow-s0208.html', license: 'CC0' } },
    { id: 'leaves', kind: 'step', file: 'steps-leaves.mp3', item: { id: 's-leaves' },
      credit: { title: 'Feet in Leaves #1', author: 'Joseph Sardin', source: BSB, url: 'https://bigsoundbank.com/search?q=leaves', license: 'CC0' } },
    { id: 'gravel', kind: 'step', file: 'steps-gravel.mp3', item: { id: 's-gravel' },
      credit: { title: 'Footsteps on gravels #1', author: 'Joseph Sardin', source: BSB, url: 'https://bigsoundbank.com/sound-0510-steps-on-gravels.html', license: 'CC0' } },
    // 자연 배경: 이음매 없는 고리
    { id: 'birds', kind: 'nature', file: 'amb-forest.mp3', level: 0.9, item: { id: 'n-birds' },   // 숲 녹음은 조용해서 조금 크게
      credit: { title: 'Forest', author: 'Joseph Sardin', source: BSB, url: 'https://bigsoundbank.com/detail-0100-forest.html', license: 'CC0' } },
    { id: 'fire', kind: 'nature', file: 'amb-fire.mp3', level: 0.6, item: { id: 'n-fire' },
      credit: { title: 'Big Branching Fire #1', author: 'Joseph Sardin', source: BSB, url: 'https://bigsoundbank.com/big-branching-fire-1-s0987.html', license: 'CC0' } },
    { id: 'frogs', kind: 'nature', file: 'amb-frogs.mp3', level: 0.6, item: { id: 'n-frogs' },
      credit: { title: 'Frogs #1', author: 'Joseph Sardin', source: BSB, url: 'https://bigsoundbank.com/frogs-1_s0997.html', license: 'CC0' } },
    // 곡: 고르면 생성 음악 대신 이 고리가 흐른다
    { id: 'heavenly', kind: 'song', file: 'song-heavenly.mp3', tags: ['ambient', 'dreamy'], moods: ['morning', 'day'],
      item: { id: 'm-heavenly', name: '하늘빛 루프', note: '꿈결 같은 앰비언트' },
      credit: { title: 'Heavenly Loop', author: 'isaiah658', source: OGA, url: 'https://opengameart.org/content/heavenly-loop', license: 'CC0' } },
    { id: 'snowtrack', kind: 'song', file: 'song-snow.mp3', tags: ['calm', 'winter'], moods: ['night'], weather: ['snow'],
      item: { id: 'm-snowtrack', name: '눈길을 지나', note: '포근한 겨울 고리' },
      credit: { title: 'Through the Snow', author: 'Cleyton Kauffman', source: OGA, url: 'https://opengameart.org/content/snow-theme', license: 'CC0' } },
    { id: 'contemplation', kind: 'song', file: 'song-contemplation.mp3', tags: ['ambient', 'drone'], moods: ['sunset', 'night'], weather: ['fog', 'rain'],
      item: { id: 'm-contemplation', name: '생각에 잠겨', note: '선율 없이 잔잔하게' },
      credit: { title: 'Contemplation', author: 'Joth', source: OGA, url: 'https://opengameart.org/content/contemplation-0', license: 'CC0' } },
  ],
};
