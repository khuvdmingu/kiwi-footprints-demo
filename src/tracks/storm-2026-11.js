// tracks/storm-2026-11.js — v30.10 천둥 소리 (전부 CC0, 2026-11-02 다운로드 승인 후 · 9초로 자르고 끝 2초 줄임 · 크기 맞춤)
//  천둥번개 날씨의 번개(sky/bits.js onThunder)가 친 뒤 0.8~2.4초 뒤에 셋 중 하나가 울린다 (main.js)

const BSB = 'BigSoundBank';
const bsb = (n, slug) => ({ title: `Thunder #${n}`, author: 'Joseph Sardin', source: BSB, url: `https://bigsoundbank.com/${slug}.html`, license: 'CC0' });

export default {
  id: 'storm-2026-11',
  name: 'v30.10 천둥',
  tracks: [
    { id: 'thunder-1', kind: 'fx', file: 'fx-thunder-1.mp3', credit: bsb(2, 'thunder-2-s3113') },
    { id: 'thunder-2', kind: 'fx', file: 'fx-thunder-2.mp3', credit: bsb(3, 'thunder-3-s3114') },
    { id: 'thunder-3', kind: 'fx', file: 'fx-thunder-3.mp3', credit: bsb(6, 'thunder-6-s3179') },
  ],
};
